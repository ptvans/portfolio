import teslaModelY from "../assets/tesla-model-y.webp";

// Assets: the live side of individually-tracked inventory.
//
// Inventory says what a brand owns and where it's stored. Assets says what
// each unit is doing right now — battery, charging, health, the supplies it is
// carrying, and the shift it's booked for tonight. An asset always points back
// to its inventory item, so the two pages describe the same Tesla or robot.
//
// The fleet clock is the prototype's "now" (Oct 28, 2026, 12:00 PT) read in
// Austin time: 2:00 PM CT, ninety minutes before dispatch posts tonight's
// vehicle assignments at 3:30 PM.

export type AssetKind = "vehicle" | "robot";

// What the unit is doing right now.
export type AssetState = "on_shift" | "charging" | "available" | "service" | "offline";

export type HealthLevel = "good" | "attention" | "critical";

// The charger side of the story: "unplugged" and "charger_fault" are the two
// overnight failures that leave a car short for its shift.
export type ChargeStatus = "charging" | "full" | "unplugged" | "charger_fault" | "swappable";

export interface SupplyDef {
  id: string;
  label: string;
  par: number; // how many a unit should carry
}

export interface AssetType {
  id: string;
  brandId: string;
  name: string;
  kind: AssetKind;
  image?: string;
  ratedRangeMi?: number; // at 100% on a new battery
  chargeLimitPct: number; // daily charge limit the fleet charges to
  l2RatePctPerHr?: number; // garage charger speed
  supplyKit: SupplyDef[];
}

export interface HealthWarning {
  label: string;
  level: Exclude<HealthLevel, "good">;
  since?: string; // ISO
}

export interface AssetHealth {
  level: HealthLevel;
  batteryHealthPct: number; // capacity vs. new — the degradation number
  odometerMi?: number;
  tirePsi?: [number, number, number, number]; // FL, FR, RL, RR
  lastServiceISO?: string;
  software?: string;
  warnings: HealthWarning[];
}

export interface AssetCharging {
  status: ChargeStatus;
  charger?: string; // "Bay 2 · Wall Connector"
  ratePctPerHr?: number;
}

export interface Asset {
  id: string;
  brandId: string;
  assetTypeId: string;
  inventoryItemId: string;
  unitId: string; // last six of the VIN for Teslas
  networkOperatorId: string;
  state: AssetState;
  soc: number; // battery state of charge, %
  charging: AssetCharging;
  locationLabel: string;
  lastSeenISO: string;
  health: AssetHealth;
  supplies: Record<string, number>; // supply id → count on board
  // Battery % every two hours over the last 24h, oldest first, ending now.
  socHistory: number[];
}

// A merchant location a vehicle is sent to. Usage differs by location — the two
// far-out stores burn noticeably more battery per hour.
export interface UsageLocation {
  id: string;
  brandId: string;
  label: string;
  milesFromBase: number;
}

// Tonight's draft vehicle assignment (before dispatch posts it).
export interface TonightAssignment {
  id: string;
  assetId: string;
  driver: string;
  locationId: string;
  start: string; // "5:00 PM"
  end: string;
}

// One check-out / check-in pair: the battery tracking that started two weeks ago.
export interface ShiftLog {
  id: string;
  assetId: string;
  date: string; // YYYY-MM-DD
  driver: string;
  locationId: string;
  checkoutSoc: number;
  checkinSoc: number;
  hours: number;
}

export interface Stakeholder {
  id: string;
  name: string;
  org: string;
  role: string;
  notifyWhen: string;
  channel: string;
}

export interface BatteryPolicy {
  bufferPct: number; // safe end-of-shift floor
  nearBaseBufferPct: number; // the lower floor for stores close to the garage
  nearBaseMiles: number; // what counts as "near the garage"
  degradationFlagPct: number; // flag a battery whose health is below this
  superchargeAllowed: boolean; // the 20–80% rule is treated as a non-issue
  runCheckAt: string; // the check runs before assignments post…
  postAssignmentsAt: string; // …which happens here
}

// ---------------------------------------------------------------------------
// Fleet clock

export const FLEET_CLOCK = {
  nowMinutes: 14 * 60, // 2:00 PM CT
  nowLabel: "2:00 PM CT",
  dateLabel: "Wed, Oct 28",
  nowISO: "2026-10-28T14:00:00-05:00",
};

// ---------------------------------------------------------------------------
// Asset types

const TESLA_KIT: SupplyDef[] = [
  { id: "bags", label: "Insulated delivery bags", par: 3 },
  { id: "carriers", label: "Drink carriers", par: 6 },
  { id: "phone-cable", label: "Phone charging cable", par: 1 },
  { id: "phone-mount", label: "Phone mount", par: 1 },
  { id: "wipes", label: "Cleaning wipes", par: 1 },
  { id: "trash", label: "Trash bags", par: 4 },
  { id: "first-aid", label: "First-aid kit", par: 1 },
  { id: "mobile-connector", label: "Tesla mobile connector", par: 1 },
];

const COCO_KIT: SupplyDef[] = [
  { id: "liner", label: "Insulated cargo liner", par: 1 },
  { id: "rain-cover", label: "Rain cover", par: 1 },
  { id: "flag", label: "Safety flag", par: 1 },
];

export const assetTypes: AssetType[] = [
  {
    id: "at-tesla-my",
    brandId: "brand-autolane",
    name: "Tesla Model Y",
    kind: "vehicle",
    image: teslaModelY,
    ratedRangeMi: 310,
    chargeLimitPct: 90,
    l2RatePctPerHr: 15,
    supplyKit: TESLA_KIT,
  },
  {
    id: "at-coco-bot",
    brandId: "brand-coco",
    name: "Robot Delivery Bot",
    kind: "robot",
    chargeLimitPct: 100,
    supplyKit: COCO_KIT,
  },
];

// ---------------------------------------------------------------------------
// Locations

export const BASE_LABEL: Record<string, string> = {
  "brand-autolane": "G&C Roman garage · East Austin",
  "brand-coco": "QuickSilver depot · West Loop",
};

export const usageLocations: UsageLocation[] = [
  { id: "loc-cherrywood", brandId: "brand-autolane", label: "Tso · Cherrywood", milesFromBase: 2.1 },
  { id: "loc-soco", brandId: "brand-autolane", label: "Tso · SoCo", milesFromBase: 4.8 },
  { id: "loc-research", brandId: "brand-autolane", label: "Tso · Research Blvd", milesFromBase: 11.6 },
  { id: "loc-roundrock", brandId: "brand-autolane", label: "Tso · Round Rock", milesFromBase: 19.2 },
];

// ---------------------------------------------------------------------------
// Assets

const full = (kit: SupplyDef[]) => Object.fromEntries(kit.map((s) => [s.id, s.par]));
const kit = (overrides: Record<string, number>) => ({ ...full(TESLA_KIT), ...overrides });
const AUS = "no-gcroman";

export const assets: Asset[] = [
  {
    id: "asset-606125",
    brandId: "brand-autolane",
    assetTypeId: "at-tesla-my",
    inventoryItemId: "inv-al-606125",
    unitId: "606125",
    networkOperatorId: AUS,
    state: "available",
    soc: 88,
    charging: { status: "full", charger: "Bay 1 · Wall Connector" },
    locationLabel: "G&C Roman garage · Bay 1",
    lastSeenISO: "2026-10-28T13:58:00-05:00",
    health: { level: "good", batteryHealthPct: 95, odometerMi: 18240, tirePsi: [42, 42, 41, 42], lastServiceISO: "2026-09-30", software: "2026.38.4", warnings: [] },
    supplies: kit({}),
    socHistory: [90, 90, 82, 71, 64, 74, 88, 88, 88, 88, 88, 88, 88],
  },
  {
    id: "asset-606332",
    brandId: "brand-autolane",
    assetTypeId: "at-tesla-my",
    inventoryItemId: "inv-al-606332",
    unitId: "606332",
    networkOperatorId: AUS,
    state: "charging",
    soc: 71,
    charging: { status: "charging", charger: "Bay 2 · Wall Connector", ratePctPerHr: 15 },
    locationLabel: "G&C Roman garage · Bay 2",
    lastSeenISO: "2026-10-28T13:59:00-05:00",
    health: { level: "good", batteryHealthPct: 94, odometerMi: 21615, tirePsi: [41, 41, 41, 40], lastServiceISO: "2026-10-06", software: "2026.38.4", warnings: [] },
    supplies: kit({ wipes: 0 }),
    socHistory: [88, 90, 80, 66, 54, 52, 51, 51, 51, 51, 51, 56, 71],
  },
  {
    id: "asset-606472",
    brandId: "brand-autolane",
    assetTypeId: "at-tesla-my",
    inventoryItemId: "inv-al-606472",
    unitId: "606472",
    networkOperatorId: AUS,
    state: "available",
    soc: 41,
    charging: { status: "charger_fault", charger: "Bay 3 · Wall Connector" },
    locationLabel: "G&C Roman garage · Bay 3",
    lastSeenISO: "2026-10-28T13:57:00-05:00",
    health: {
      level: "attention",
      batteryHealthPct: 93,
      odometerMi: 24980,
      tirePsi: [42, 42, 42, 41],
      lastServiceISO: "2026-09-18",
      software: "2026.38.4",
      warnings: [{ label: "Bay 3 charger faulted at 11:42 PM — no charge overnight", level: "attention", since: "2026-10-27T23:42:00-05:00" }],
    },
    supplies: kit({ "mobile-connector": 0 }),
    socHistory: [92, 95, 78, 61, 44, 41, 41, 41, 41, 41, 41, 41, 41],
  },
  {
    id: "asset-606732",
    brandId: "brand-autolane",
    assetTypeId: "at-tesla-my",
    inventoryItemId: "inv-al-606732",
    unitId: "606732",
    networkOperatorId: AUS,
    state: "available",
    soc: 58,
    charging: { status: "unplugged" },
    locationLabel: "G&C Roman garage · lot",
    lastSeenISO: "2026-10-28T13:55:00-05:00",
    health: {
      level: "attention",
      batteryHealthPct: 92,
      odometerMi: 26412,
      tirePsi: [40, 41, 40, 40],
      lastServiceISO: "2026-09-12",
      software: "2026.38.4",
      warnings: [{ label: "Not plugged in after last night's shift", level: "attention", since: "2026-10-27T22:20:00-05:00" }],
    },
    supplies: kit({}),
    socHistory: [84, 90, 83, 71, 62, 60, 59, 59, 58, 58, 58, 58, 58],
  },
  {
    id: "asset-697036",
    brandId: "brand-autolane",
    assetTypeId: "at-tesla-my",
    inventoryItemId: "inv-al-697036",
    unitId: "697036",
    networkOperatorId: AUS,
    state: "available",
    soc: 92,
    charging: { status: "full", charger: "Bay 4 · Wall Connector" },
    locationLabel: "G&C Roman garage · Bay 4",
    lastSeenISO: "2026-10-28T13:58:00-05:00",
    health: { level: "good", batteryHealthPct: 96, odometerMi: 12204, tirePsi: [42, 42, 42, 42], lastServiceISO: "2026-10-14", software: "2026.38.4", warnings: [] },
    supplies: kit({}),
    socHistory: [90, 90, 84, 75, 67, 79, 90, 92, 92, 92, 92, 92, 92],
  },
  {
    id: "asset-699757",
    brandId: "brand-autolane",
    assetTypeId: "at-tesla-my",
    inventoryItemId: "inv-al-699757",
    unitId: "699757",
    networkOperatorId: AUS,
    state: "charging",
    soc: 52,
    charging: { status: "charging", charger: "Bay 5 · Wall Connector", ratePctPerHr: 15 },
    locationLabel: "G&C Roman garage · Bay 5",
    lastSeenISO: "2026-10-28T13:59:00-05:00",
    health: {
      level: "attention",
      batteryHealthPct: 94,
      odometerMi: 15830,
      tirePsi: [41, 41, 41, 41],
      lastServiceISO: "2026-10-02",
      software: "2026.38.4",
      warnings: [{ label: "Windshield chip reported by driver", level: "attention", since: "2026-10-26T21:05:00-05:00" }],
    },
    supplies: kit({ carriers: 2, trash: 1 }),
    socHistory: [86, 90, 81, 68, 57, 47, 46, 46, 46, 46, 46, 47, 52],
  },
  {
    id: "asset-700581",
    brandId: "brand-autolane",
    assetTypeId: "at-tesla-my",
    inventoryItemId: "inv-al-700581",
    unitId: "700581",
    networkOperatorId: AUS,
    state: "available",
    soc: 94,
    charging: { status: "full", charger: "Bay 6 · Wall Connector" },
    locationLabel: "G&C Roman garage · Bay 6",
    lastSeenISO: "2026-10-28T13:58:00-05:00",
    health: { level: "good", batteryHealthPct: 96, odometerMi: 9420, tirePsi: [42, 42, 42, 42], lastServiceISO: "2026-10-20", software: "2026.38.4", warnings: [] },
    supplies: kit({}),
    socHistory: [94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94],
  },
  {
    id: "asset-700910",
    brandId: "brand-autolane",
    assetTypeId: "at-tesla-my",
    inventoryItemId: "inv-al-700910",
    unitId: "700910",
    networkOperatorId: AUS,
    state: "service",
    soc: 77,
    charging: { status: "unplugged" },
    locationLabel: "Discount Tire · E 7th St",
    lastSeenISO: "2026-10-28T11:20:00-05:00",
    health: {
      level: "attention",
      batteryHealthPct: 93,
      odometerMi: 23377,
      tirePsi: [41, 40, 40, 31],
      lastServiceISO: "2026-08-29",
      software: "2026.32.7",
      warnings: [
        { label: "Low tire pressure — rear right 31 psi", level: "attention", since: "2026-10-27T19:10:00-05:00" },
        { label: "Software update pending (2026.38.4)", level: "attention" },
      ],
    },
    supplies: kit({ bags: 1, wipes: 0 }),
    socHistory: [90, 88, 85, 82, 82, 82, 82, 82, 81, 81, 79, 78, 77],
  },
  {
    id: "asset-700982",
    brandId: "brand-autolane",
    assetTypeId: "at-tesla-my",
    inventoryItemId: "inv-al-700982",
    unitId: "700982",
    networkOperatorId: AUS,
    state: "offline",
    soc: 12,
    charging: { status: "unplugged" },
    locationLabel: "G&C Roman garage · lot",
    lastSeenISO: "2026-10-27T16:02:00-05:00",
    health: {
      level: "critical",
      batteryHealthPct: 78,
      odometerMi: 61208,
      tirePsi: [39, 39, 38, 39],
      lastServiceISO: "2026-07-22",
      software: "2026.26.1",
      warnings: [
        { label: "Battery health 78% — below the degradation floor", level: "critical" },
        { label: "Decommission scheduled Nov 6", level: "attention" },
      ],
    },
    supplies: { bags: 0, carriers: 0, "phone-cable": 0, "phone-mount": 1, wipes: 0, trash: 0, "first-aid": 1, "mobile-connector": 1 },
    socHistory: [14, 14, 13, 13, 13, 13, 13, 12, 12, 12, 12, 12, 12],
  },

  // Coco — sidewalk robots on QuickSilver's Chicago daily cycle. Batteries are
  // swapped at the depot rather than charged in place.
  ...cocoBots(),
];

function cocoBots(): Asset[] {
  const QS = "no-quicksilver";
  const base = { brandId: "brand-coco", assetTypeId: "at-coco-bot", networkOperatorId: QS };
  const ok = (soc: number) => ({ level: "good" as const, batteryHealthPct: soc, software: "coco-os 4.12", warnings: [] });
  const fullKit = full(COCO_KIT);
  return [
    { ...base, id: "asset-cb-2041", inventoryItemId: "inv-coco-bot-1", unitId: "CB-2041", state: "on_shift", soc: 64, charging: { status: "swappable" }, locationLabel: "Fulton Market zone", lastSeenISO: "2026-10-28T13:59:00-05:00", health: ok(91), supplies: fullKit, socHistory: [100, 100, 100, 100, 100, 100, 100, 100, 96, 88, 80, 71, 64] },
    { ...base, id: "asset-cb-2077", inventoryItemId: "inv-coco-bot-2", unitId: "CB-2077", state: "service", soc: 6, charging: { status: "swappable" }, locationLabel: "QuickSilver depot · West Loop", lastSeenISO: "2026-10-28T09:12:00-05:00", health: { level: "critical", batteryHealthPct: 0, software: "coco-os 4.12", warnings: [{ label: "Battery pack fault — won't hold charge", level: "critical", since: "2026-10-28T08:40:00-05:00" }] }, supplies: { ...fullKit, "rain-cover": 0 }, socHistory: [100, 100, 100, 100, 100, 100, 100, 88, 40, 9, 6, 6, 6] },
    { ...base, id: "asset-cb-2103", inventoryItemId: "inv-coco-bot-4", unitId: "CB-2103", state: "on_shift", soc: 38, charging: { status: "swappable" }, locationLabel: "West Loop zone", lastSeenISO: "2026-10-28T13:58:00-05:00", health: ok(89), supplies: fullKit, socHistory: [100, 100, 100, 100, 100, 100, 100, 92, 81, 70, 58, 47, 38] },
    { ...base, id: "asset-cb-2110", inventoryItemId: "inv-coco-bot-5", unitId: "CB-2110", state: "available", soc: 100, charging: { status: "full", charger: "Swap rack A" }, locationLabel: "QuickSilver depot · West Loop", lastSeenISO: "2026-10-28T13:59:00-05:00", health: ok(94), supplies: fullKit, socHistory: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100] },
    { ...base, id: "asset-cb-2115", inventoryItemId: "inv-coco-bot-6", unitId: "CB-2115", state: "on_shift", soc: 81, charging: { status: "swappable" }, locationLabel: "River North zone", lastSeenISO: "2026-10-28T13:57:00-05:00", health: { level: "attention", batteryHealthPct: 90, software: "coco-os 4.12", warnings: [{ label: "Left wheel motor running warm", level: "attention", since: "2026-10-28T12:30:00-05:00" }] }, supplies: { ...fullKit, flag: 0 }, socHistory: [100, 100, 100, 100, 100, 100, 100, 100, 100, 97, 93, 86, 81] },
    { ...base, id: "asset-cb-2098", inventoryItemId: "inv-coco-bot-3", unitId: "CB-2098", state: "offline", soc: 0, charging: { status: "swappable" }, locationLabel: "QuickSilver depot · West Loop", lastSeenISO: "2026-10-12T17:40:00-05:00", health: { level: "critical", batteryHealthPct: 0, software: "coco-os 4.09", warnings: [{ label: "Decommissioned", level: "critical" }] }, supplies: { liner: 0, "rain-cover": 0, flag: 0 }, socHistory: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  ];
}

// ---------------------------------------------------------------------------
// Tonight's draft assignments (Autolane, G&C Roman supervisors)

export const tonightAssignments: TonightAssignment[] = [
  { id: "ta-1", assetId: "asset-606125", driver: "Colin Murray", locationId: "loc-cherrywood", start: "5:00 PM", end: "9:00 PM" },
  { id: "ta-2", assetId: "asset-606332", driver: "Gordon Ronan III", locationId: "loc-soco", start: "5:00 PM", end: "10:00 PM" },
  { id: "ta-3", assetId: "asset-606472", driver: "Walter Ringfield", locationId: "loc-research", start: "5:00 PM", end: "10:00 PM" },
  { id: "ta-4", assetId: "asset-606732", driver: "Peter Ronan", locationId: "loc-roundrock", start: "5:00 PM", end: "9:00 PM" },
  { id: "ta-5", assetId: "asset-697036", driver: "Xavier Herrera", locationId: "loc-soco", start: "5:00 PM", end: "9:00 PM" },
  { id: "ta-6", assetId: "asset-699757", driver: "Caleb Pendleton", locationId: "loc-cherrywood", start: "5:00 PM", end: "10:00 PM" },
];

// ---------------------------------------------------------------------------
// People to notify

export const stakeholders: Stakeholder[] = [
  {
    id: "christina",
    name: "Carla Ronan",
    org: "G&C Roman",
    role: "Vehicle assignment",
    notifyWhen: "Any vehicle is flagged — a swap or a charging plan changes tonight's assignments",
    channel: "SMS + #autolane-austin-brick",
  },
  {
    id: "george",
    name: "George Roman",
    org: "G&C Roman",
    role: "Fleet & overnight charging",
    notifyWhen: "A vehicle needs a supercharge session, or a garage charger faults",
    channel: "SMS",
  },
];

export const DEFAULT_BATTERY_POLICY: BatteryPolicy = {
  bufferPct: 20,
  nearBaseBufferPct: 10,
  nearBaseMiles: 3,
  degradationFlagPct: 85,
  superchargeAllowed: true,
  runCheckAt: "2:00 PM",
  postAssignmentsAt: "3:30 PM",
};

// ---------------------------------------------------------------------------
// Two weeks of check-out / check-in logs (Oct 14 – Oct 27).
//
// Battery tracking started on Oct 14. Each night every working car is checked
// out at the garage and checked back in after the shift; the difference is the
// battery the shift used. Generated from a fixed seed so it never changes.

// The "true" burn rates the logs are drawn from, % per shift hour. The usage
// estimate never reads these — it recovers them from the logs.
const TRUE_RATE: Record<string, number> = {
  "loc-cherrywood": 6.4,
  "loc-soco": 7.9,
  "loc-research": 10.8,
  "loc-roundrock": 12.6,
};

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildShiftLogs(): ShiftLog[] {
  const rand = mulberry32(1014);
  const cars = ["asset-606125", "asset-606332", "asset-606472", "asset-606732", "asset-697036", "asset-699757", "asset-700581"];
  const drivers = ["Colin Murray", "Gordon Ronan III", "Walter Ringfield", "Peter Ronan", "Xavier Herrera", "Caleb Pendleton", "Jon Jorgensen"];
  const locs = ["loc-cherrywood", "loc-soco", "loc-research", "loc-roundrock", "loc-soco", "loc-cherrywood"];
  const out: ShiftLog[] = [];
  for (let d = 14; d <= 27; d++) {
    const date = `2026-10-${String(d).padStart(2, "0")}`;
    // Six cars work a night; the seventh rests. Rotate who rests.
    const resting = d % cars.length;
    let slot = 0;
    cars.forEach((assetId, i) => {
      if (i === resting) return;
      const locationId = locs[(slot + d) % locs.length];
      const hours = rand() < 0.5 ? 4 : 5;
      const checkoutSoc = Math.round(84 + rand() * 8);
      const used = TRUE_RATE[locationId] * hours * (0.88 + rand() * 0.24);
      out.push({
        id: `log-${date}-${assetId}`,
        assetId,
        date,
        driver: drivers[(i + d) % drivers.length],
        locationId,
        checkoutSoc,
        checkinSoc: Math.max(0, Math.round(checkoutSoc - used)),
        hours,
      });
      slot++;
    });
  }
  return out;
}

export const shiftLogs: ShiftLog[] = buildShiftLogs();
export const TRACKING_STARTED = "Oct 14";

// ---------------------------------------------------------------------------
// Lookups

export const getAssetType = (id: string) => assetTypes.find((t) => t.id === id);
export const getUsageLocation = (id: string) => usageLocations.find((l) => l.id === id);
export const assetsForBrand = (brandId: string) => assets.filter((a) => a.brandId === brandId);
export const assetsForOperator = (networkOperatorId: string) => assets.filter((a) => a.networkOperatorId === networkOperatorId);
export const brandHasAssets = (brandId: string) => assets.some((a) => a.brandId === brandId);
export const operatorHasAssets = (networkOperatorId: string) => assets.some((a) => a.networkOperatorId === networkOperatorId);
export const assetForInventoryItem = (inventoryItemId: string) => assets.find((a) => a.inventoryItemId === inventoryItemId);
