import {
  FLEET_CLOCK,
  getAssetType,
  getUsageLocation,
  type Asset,
  type BatteryPolicy,
  type ShiftLog,
  type TonightAssignment,
  type UsageLocation,
} from "../data/assets";
import { parseTimeToMinutes } from "../data/shifts";

// ---------------------------------------------------------------------------
// Battery usage by location — what Stella estimates from the check-out /
// check-in logs. Rates are % of battery per shift hour.

export interface LocationUsage {
  location: UsageLocation;
  samples: number;
  ratePctPerHr: number;
  minRate: number;
  maxRate: number;
  avgPerShiftPct: number;
  avgShiftHours: number;
}

export function estimateUsageByLocation(logs: ShiftLog[], locations: UsageLocation[]): LocationUsage[] {
  return locations
    .map((location) => {
      const rows = logs.filter((l) => l.locationId === location.id);
      if (rows.length === 0) {
        return { location, samples: 0, ratePctPerHr: 0, minRate: 0, maxRate: 0, avgPerShiftPct: 0, avgShiftHours: 0 };
      }
      const used = rows.map((r) => r.checkoutSoc - r.checkinSoc);
      const rates = rows.map((r, i) => used[i] / r.hours);
      const totalUsed = used.reduce((a, b) => a + b, 0);
      const totalHours = rows.reduce((a, r) => a + r.hours, 0);
      return {
        location,
        samples: rows.length,
        ratePctPerHr: round1(totalUsed / totalHours),
        minRate: round1(Math.min(...rates)),
        maxRate: round1(Math.max(...rates)),
        avgPerShiftPct: Math.round(totalUsed / rows.length),
        avgShiftHours: round1(totalHours / rows.length),
      };
    })
    .sort((a, b) => a.location.milesFromBase - b.location.milesFromBase);
}

// ---------------------------------------------------------------------------
// Pre-assignment battery check.
//
// Runs before dispatch posts tonight's vehicle assignments. For each draft
// assignment it projects the battery at shift start (counting any charging
// between now and then) and at shift end (subtracting the location's usage
// rate × shift length), then compares the end figure with the safe buffer.

export type ChargePlan = "plug_in" | "supercharge";

export type Verdict = "ok" | "below_buffer" | "wont_finish";

export interface Projection {
  startSoc: number;
  usagePct: number;
  endSoc: number;
  bufferPct: number;
  verdict: Verdict;
}

export type Remedy =
  | { kind: "swap"; toAssetId: string; projection: Projection }
  | { kind: "plug_in"; projection: Projection }
  | { kind: "supercharge"; minutes: number; projection: Projection };

export interface CheckRow {
  assignment: TonightAssignment;
  asset: Asset; // the car the assignment currently points at (after swaps)
  originalAssetId: string;
  location: UsageLocation;
  plan: ChargePlan | null;
  projection: Projection;
  reason: string | null; // why the car is short, when it is
  remedies: Remedy[]; // offered only when the projection isn't ok
}

const SUPERCHARGE_TO = 85;
const SUPERCHARGE_MINUTES = 30;

export function bufferFor(location: UsageLocation, policy: BatteryPolicy) {
  return location.milesFromBase <= policy.nearBaseMiles ? policy.nearBaseBufferPct : policy.bufferPct;
}

export function projectSoc(
  asset: Asset,
  plan: ChargePlan | null,
  assignment: TonightAssignment,
  location: UsageLocation,
  rateByLocation: Record<string, number>,
  policy: BatteryPolicy,
): Projection {
  const type = getAssetType(asset.assetTypeId);
  const limit = type?.chargeLimitPct ?? 90;
  const start = parseTimeToMinutes(assignment.start);
  const end = parseTimeToMinutes(assignment.end);
  const hoursUntilStart = Math.max(0, (start - FLEET_CLOCK.nowMinutes) / 60);

  let startSoc = asset.soc;
  if (plan === "supercharge") {
    startSoc = Math.max(asset.soc, SUPERCHARGE_TO);
  } else if (plan === "plug_in" || asset.charging.status === "charging") {
    const rate = asset.charging.ratePctPerHr ?? type?.l2RatePctPerHr ?? 15;
    startSoc = Math.max(asset.soc, Math.min(limit, asset.soc + rate * hoursUntilStart));
  }

  const usagePct = (rateByLocation[location.id] ?? 10) * ((end - start) / 60);
  const endSoc = startSoc - usagePct;
  const bufferPct = bufferFor(location, policy);
  const verdict: Verdict = endSoc < 5 ? "wont_finish" : endSoc < bufferPct ? "below_buffer" : "ok";
  return { startSoc: Math.round(startSoc), usagePct: Math.round(usagePct), endSoc: Math.round(endSoc), bufferPct, verdict };
}

// A spare is a car with no assignment tonight that's fit to drive.
function isSpareCandidate(asset: Asset, policy: BatteryPolicy) {
  return (
    (asset.state === "available" || asset.state === "charging") &&
    asset.health.level !== "critical" &&
    asset.health.batteryHealthPct >= policy.degradationFlagPct &&
    asset.charging.status !== "charger_fault"
  );
}

export function runBatteryCheck(opts: {
  assignments: TonightAssignment[];
  fleet: Asset[];
  swaps: Record<string, string>; // assignment id → replacement asset id
  plans: Record<string, ChargePlan>; // asset id → charging plan
  rateByLocation: Record<string, number>;
  policy: BatteryPolicy;
}): CheckRow[] {
  const { assignments, fleet, swaps, plans, rateByLocation, policy } = opts;
  const byId = new Map(fleet.map((a) => [a.id, a]));
  const assignedIds = new Set(assignments.map((a) => swaps[a.id] ?? a.assetId));
  const spares = fleet.filter((a) => !assignedIds.has(a.id) && isSpareCandidate(a, policy));

  return assignments.map((assignment) => {
    const asset = byId.get(swaps[assignment.id] ?? assignment.assetId)!;
    const location = getUsageLocation(assignment.locationId)!;
    const plan = plans[asset.id] ?? null;
    const projection = projectSoc(asset, plan, assignment, location, rateByLocation, policy);

    const remedies: Remedy[] = [];
    if (projection.verdict !== "ok") {
      // Only a unit of the same type, run by the same operator, can stand in.
      const sameKind = spares.filter((s) => s.assetTypeId === asset.assetTypeId && s.networkOperatorId === asset.networkOperatorId);
      for (const spare of sameKind) {
        const p = projectSoc(spare, plans[spare.id] ?? null, assignment, location, rateByLocation, policy);
        if (p.verdict === "ok") remedies.push({ kind: "swap", toAssetId: spare.id, projection: p });
      }
      remedies.sort((a, b) => b.projection.endSoc - a.projection.endSoc);
      if (asset.charging.status === "unplugged" && plan !== "plug_in") {
        const p = projectSoc(asset, "plug_in", assignment, location, rateByLocation, policy);
        if (p.verdict === "ok") remedies.push({ kind: "plug_in", projection: p });
      }
      if (policy.superchargeAllowed && plan !== "supercharge") {
        const p = projectSoc(asset, "supercharge", assignment, location, rateByLocation, policy);
        if (p.verdict === "ok") remedies.push({ kind: "supercharge", minutes: SUPERCHARGE_MINUTES, projection: p });
      }
    }

    return {
      assignment,
      asset,
      originalAssetId: assignment.assetId,
      location,
      plan,
      projection,
      reason: projection.verdict === "ok" ? null : shortReason(asset),
      remedies,
    };
  });
}

function shortReason(asset: Asset): string {
  switch (asset.charging.status) {
    case "charger_fault":
      return `${asset.charging.charger?.split(" · ")[0] ?? "Charger"} faulted overnight — didn't charge`;
    case "unplugged":
      return "Wasn't plugged in after last shift";
    default:
      return "Not enough charge for this location";
  }
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
