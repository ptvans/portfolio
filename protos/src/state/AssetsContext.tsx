import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  DEFAULT_BATTERY_POLICY,
  assets as seedAssets,
  shiftLogs,
  tonightAssignments,
  usageLocations,
  type Asset,
  type BatteryPolicy,
} from "../data/assets";
import { estimateUsageByLocation, runBatteryCheck, type ChargePlan, type CheckRow, type LocationUsage, type Remedy } from "../lib/batteryCheck";

// Shared, session-only state for Assets. It sits above both the Brand and the
// Network Operator apps so they read one story: the brand sets the battery
// policy, the operator runs tonight's check against it, and the brand sees the
// result.

export interface FleetNotice {
  id: string;
  to: string[]; // stakeholder ids
  title: string;
  body: string;
  at: string; // display time
}

interface AssetsState {
  fleet: Asset[]; // seed assets with session edits applied
  getAsset: (id: string) => Asset | undefined;

  policy: BatteryPolicy;
  setPolicy: (patch: Partial<BatteryPolicy>) => void;

  // Stella's usage estimate
  usage: LocationUsage[];
  rateByLocation: Record<string, number>;
  estimateRanAt: string;
  estimating: boolean;
  rerunEstimate: () => void;

  // Tonight's pre-assignment check
  checkRows: CheckRow[];
  swaps: Record<string, string>;
  plans: Record<string, ChargePlan>;
  notices: FleetNotice[];
  postedAt: string | null;
  applyRemedy: (row: CheckRow, remedy: Remedy) => void;
  undoRemedy: (row: CheckRow) => void;
  postAssignments: (overrideFlags: boolean) => void;

  // Supplies
  setSupply: (assetId: string, supplyId: string, count: number) => void;
  restock: (assetId: string, kit: { id: string; par: number }[]) => void;
}

const AssetsContext = createContext<AssetsState | null>(null);

let noticeSeq = 0;
// The fleet clock sits at 2:00 PM CT; actions taken in the session stamp a few
// minutes after it so the log reads in order.
let minuteTick = 0;
const nextStamp = () => {
  minuteTick = Math.min(minuteTick + 2, 58);
  return `2:${String(minuteTick).padStart(2, "0")} PM`;
};

export function AssetsProvider({ children }: { children: ReactNode }) {
  const [policy, setPolicyState] = useState<BatteryPolicy>(DEFAULT_BATTERY_POLICY);
  const [estimating, setEstimating] = useState(false);
  const [estimateRanAt, setEstimateRanAt] = useState("Today, 6:00 AM");
  const [swaps, setSwaps] = useState<Record<string, string>>({});
  const [plans, setPlans] = useState<Record<string, ChargePlan>>({});
  const [notices, setNotices] = useState<FleetNotice[]>([]);
  const [postedAt, setPostedAt] = useState<string | null>(null);
  const [supplyEdits, setSupplyEdits] = useState<Record<string, Record<string, number>>>({});

  const fleet = useMemo(
    () =>
      seedAssets.map((a) => {
        let next = a;
        if (supplyEdits[a.id]) next = { ...next, supplies: { ...next.supplies, ...supplyEdits[a.id] } };
        const plan = plans[a.id];
        if (plan === "plug_in") {
          next = { ...next, state: "charging", charging: { status: "charging", charger: "Bay 7 · Wall Connector", ratePctPerHr: 15 } };
        } else if (plan === "supercharge") {
          next = { ...next, state: "charging", charging: { status: "charging", charger: "Supercharger · Mueller (booked 3:45 PM)", ratePctPerHr: 90 } };
        }
        return next;
      }),
    [supplyEdits, plans],
  );

  const usage = useMemo(() => estimateUsageByLocation(shiftLogs, usageLocations), []);
  const rateByLocation = useMemo(() => Object.fromEntries(usage.map((u) => [u.location.id, u.ratePctPerHr])), [usage]);

  const checkRows = useMemo(
    () =>
      runBatteryCheck({
        assignments: tonightAssignments,
        // Project from the seed fleet: the plan itself carries the charging change.
        fleet: seedAssets.map((a) => (supplyEdits[a.id] ? { ...a, supplies: { ...a.supplies, ...supplyEdits[a.id] } } : a)),
        swaps,
        plans,
        rateByLocation,
        policy,
      }),
    [swaps, plans, rateByLocation, policy, supplyEdits],
  );

  const getAsset = useCallback((id: string) => fleet.find((a) => a.id === id), [fleet]);

  const pushNotice = (n: Omit<FleetNotice, "id" | "at">) => {
    // Stamp outside the updater: StrictMode runs updaters twice.
    const notice = { ...n, id: `notice-${++noticeSeq}`, at: nextStamp() };
    setNotices((prev) => [...prev, notice]);
  };

  const applyRemedy = (row: CheckRow, remedy: Remedy) => {
    const unit = row.asset.unitId;
    const where = `${row.location.label}, ${row.assignment.start}–${row.assignment.end}`;
    if (remedy.kind === "swap") {
      const to = seedAssets.find((a) => a.id === remedy.toAssetId)!;
      setSwaps((prev) => ({ ...prev, [row.assignment.id]: remedy.toAssetId }));
      pushNotice({
        to: ["christina"],
        title: `Swap ${unit} → ${to.unitId} for ${row.assignment.driver}`,
        body: `${unit} is at ${row.asset.soc}% and would end tonight's shift (${where}) at ${row.projection.endSoc}%. ${row.reason ?? ""}. ${to.unitId} is at ${to.soc}% and projects ${remedy.projection.endSoc}% at end of shift.`,
      });
    } else if (remedy.kind === "plug_in") {
      setPlans((prev) => ({ ...prev, [row.asset.id]: "plug_in" }));
      pushNotice({
        to: ["christina"],
        title: `Keep ${unit} — charging before the shift`,
        body: `${unit} wasn't plugged in after last night's shift (${row.asset.soc}%). Plugged in at Bay 7 now; projected ${remedy.projection.startSoc}% at ${row.assignment.start} and ${remedy.projection.endSoc}% at end of shift (${where}). Assignment unchanged.`,
      });
    } else {
      setPlans((prev) => ({ ...prev, [row.asset.id]: "supercharge" }));
      pushNotice({
        to: ["george", "christina"],
        title: `Supercharge ${unit} before ${row.assignment.start}`,
        body: `${unit} is at ${row.asset.soc}% — ${row.reason ?? "short on charge"}. Needs a ~${remedy.minutes} min supercharge session (Mueller, 3:45 PM) to reach ${remedy.projection.startSoc}%, ending tonight's shift (${where}) at ${remedy.projection.endSoc}%.`,
      });
    }
  };

  const undoRemedy = (row: CheckRow) => {
    setSwaps((prev) => {
      const next = { ...prev };
      delete next[row.assignment.id];
      return next;
    });
    setPlans((prev) => {
      const next = { ...prev };
      delete next[row.asset.id];
      delete next[row.originalAssetId];
      return next;
    });
  };

  const postAssignments = (overrideFlags: boolean) => {
    const stamp = nextStamp();
    setPostedAt(stamp);
    const flagged = checkRows.filter((r) => r.projection.verdict !== "ok");
    if (overrideFlags && flagged.length > 0) {
      pushNotice({
        to: ["christina", "george"],
        title: `Posted with ${flagged.length} vehicle${flagged.length === 1 ? "" : "s"} below the buffer`,
        body: flagged
          .map((r) => `${r.asset.unitId} (${r.assignment.driver}, ${r.location.label}) projects ${r.projection.endSoc}% at end of shift.`)
          .join(" "),
      });
    }
  };

  const value: AssetsState = {
    fleet,
    getAsset,
    policy,
    setPolicy: (patch) => setPolicyState((prev) => ({ ...prev, ...patch })),
    usage,
    rateByLocation,
    estimateRanAt,
    estimating,
    rerunEstimate: () => {
      setEstimating(true);
      window.setTimeout(() => {
        setEstimating(false);
        setEstimateRanAt(`Today, ${nextStamp()}`);
      }, 1400);
    },
    checkRows,
    swaps,
    plans,
    notices,
    postedAt,
    applyRemedy,
    undoRemedy,
    postAssignments,
    setSupply: (assetId, supplyId, count) =>
      setSupplyEdits((prev) => ({ ...prev, [assetId]: { ...prev[assetId], [supplyId]: Math.max(0, count) } })),
    restock: (assetId, kitDefs) =>
      setSupplyEdits((prev) => ({ ...prev, [assetId]: Object.fromEntries(kitDefs.map((s) => [s.id, s.par])) })),
  };

  return <AssetsContext.Provider value={value}>{children}</AssetsContext.Provider>;
}

export function useAssets() {
  const ctx = useContext(AssetsContext);
  if (!ctx) throw new Error("useAssets must be used inside AssetsProvider");
  return ctx;
}
