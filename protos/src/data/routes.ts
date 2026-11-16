// Route planning — prototype data model + seeds.
//
// A Network Operator manager plans one day at a time: the deliveries requested
// for that day, the trucks available to run them, and the drivers available to
// drive. Generation turns those three inputs into a route per truck (see
// data/routePlanning.ts), and the day is then tracked live on a map.
//
//   Routes overview → Route Planning → Route board → Today (live)
//
// Everything here is deterministic. The day's order pool is derived from a hash
// of (account, depot, date), so the same day always reads the same way across
// reloads and across the four surfaces above.

import { ordinalDay } from "../lib/format";
import { brands } from "./brands";
import { inventoryItems } from "./inventory";
import { fieldOperators, vehicles, warehouses } from "./network";
import { tasks, workOrders } from "./work";

export interface GeoPoint {
  lat: number;
  lng: number;
}

// --- Route colors ----------------------------------------------------------
// One color per route, assigned by position. The same hex paints the route's
// swatch in the list and its polyline + pins on the map, so a glance at either
// tells you which truck you're looking at.

export interface RouteColor {
  hex: string;
}

const routeColorPalette: RouteColor[] = [
  { hex: "#2563eb" }, // blue
  { hex: "#16a34a" }, // green
  { hex: "#9333ea" }, // violet
  { hex: "#ea580c" }, // orange
  { hex: "#0d9488" }, // teal
  { hex: "#db2777" }, // pink
  { hex: "#ca8a04" }, // yellow
  { hex: "#4f46e5" }, // indigo
];

export function routeColor(index: number): RouteColor {
  return routeColorPalette[index % routeColorPalette.length];
}

// --- Core entities ---------------------------------------------------------

// A delivery the brand has asked for on a given day. Orders exist independently
// of routes: an order sits in the day's pool until generation puts it on one,
// and orders that arrive after a plan was generated are what the Route board's
// "new orders" banner counts.
export interface DeliveryOrder {
  id: string;
  orderRef: string; // short reference shown to the manager, e.g. "AB923487"
  address: string; // street line, e.g. "1398 Locust St."
  itemDescription: string; // what's being dropped, e.g. "4 × Pallet — cold brew"
  point: GeoPoint;
  volumeCuFt: number; // what it takes up in the truck
  serviceMinutes: number; // how long the stop itself takes
  brandId: string;
  // A window the brand asked for, when they asked for one. Generation tries to
  // honour it and the board flags routes that miss it.
  windowStartMin: number | null; // minutes from midnight
  windowEndMin: number | null;
  // When the order landed, as minutes from midnight on the planning day. Orders
  // that arrive after a day has been generated are the ones the Route board
  // reports as not yet on a route.
  requestedAtMin: number;
}

// A truck offered to the day's plan.
export interface RouteEquipment {
  id: string; // vehicle id
  label: string; // "Truck 01"
  modelLabel: string; // "26' Hino Box Truck"
  capacityCuFt: number;
}

// A driver offered to the day's plan, with the hours they're available.
export interface RouteStaff {
  id: string; // field-operator id
  name: string; // "Xavier Herrera"
  shortName: string; // "Xavier H." — how routes label their driver
  startMin: number;
  endMin: number;
  phone: string;
}

export type RouteStopStatus = "pending" | "delivered" | "failed";

// Stops are either a delivery or the driver's break. Breaks sit in the same
// list so the route reads as one timeline rather than a sequence with a
// separate schedule laid over it.
export type RouteStopKind = "delivery" | "break";

// How long the driver's break lasts. A route long enough to need one gets one
// dropped into its timeline by generation.
export const BREAK_MINUTES = 30;

export interface RouteStop {
  id: string;
  kind: RouteStopKind;
  orderId: string | null; // null on a break
  travelMinFromPrev: number; // drive time from the previous stop (or the depot)
  legMiles: number;
  arriveMin: number;
  departMin: number;
  status: RouteStopStatus;
}

export interface PlannedRoute {
  id: string;
  equipmentId: string;
  staffId: string;
  colorIndex: number;
  startMin: number; // when the truck rolls out of the depot
  stops: RouteStop[];
  // Drive time / distance for the leg back to the depot after the last stop.
  returnMin: number;
  returnMiles: number;
}

// --- Geography -------------------------------------------------------------

const MILES_PER_DEG_LAT = 69.0;

function haversineMiles(a: GeoPoint, b: GeoPoint): number {
  const R = 3958.8; // earth radius, miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// City driving with lights and turns, not highway speed. Straight-line distance
// also under-reads a real street route, so DRIVE_FACTOR pads it to something
// closer to what the truck will actually cover.
const AVG_SPEED_MPH = 21;
const DRIVE_FACTOR = 1.32;

export function drivingMiles(a: GeoPoint, b: GeoPoint): number {
  return haversineMiles(a, b) * DRIVE_FACTOR;
}

// Drive time for a leg, rounded to whole minutes and never zero — two stops on
// the same block still cost the driver a minute of parking and pulling out.
export function driveMinutes(miles: number): number {
  return Math.max(1, Math.round((miles / AVG_SPEED_MPH) * 60));
}

// --- Deterministic randomness ---------------------------------------------
// Seeded so a given (account, depot, day) always produces the same order pool.
// Nothing here may use Math.random(): the four route surfaces each derive the
// pool independently and have to agree.

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// mulberry32 — small, fast, and stable across engines.
function makeRng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(rand: () => number, items: T[]): T => items[Math.floor(rand() * items.length)];
const between = (rand: () => number, lo: number, hi: number) => lo + rand() * (hi - lo);
const intBetween = (rand: () => number, lo: number, hi: number) =>
  Math.floor(between(rand, lo, hi + 1));

// --- Day options -----------------------------------------------------------

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return toISODate(new Date(y, m - 1, d + days));
}

// "July 7th, 2026" — the day heading on Route Planning and the board.
export function formatDayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${dt.toLocaleDateString(undefined, { month: "long" })} ${ordinalDay(d)}, ${y}`;
}

// "Tue, Jul 7" — the compact form used on the overview cards.
export function formatDayShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export interface DayOption {
  dateISO: string;
  label: string;
}

// Days offered in the date picker and listed on the overview: a few days behind
// for the days already run, today, and a week ahead to plan into.
export const PLANNING_DAYS_BEHIND = 3;
export const PLANNING_DAYS_AHEAD = 7;

export function buildDayOptions(): DayOption[] {
  const base = todayISO();
  const out: DayOption[] = [];
  for (let offset = -PLANNING_DAYS_BEHIND; offset <= PLANNING_DAYS_AHEAD; offset++) {
    const dateISO = addDaysISO(base, offset);
    out.push({ dateISO, label: formatDayLabel(dateISO) });
  }
  return out;
}

// --- Depot / equipment / staff --------------------------------------------

export interface Depot {
  warehouseId: string;
  name: string;
  address: string;
  point: GeoPoint;
}

// Warehouses this account can plan out of — the ones with coordinates, since a
// depot with no location can't anchor a route.
export function depotsForNetworkOperator(networkOperatorId: string): Depot[] {
  return warehouses
    .filter((w) => w.networkOperatorId === networkOperatorId && w.lat != null && w.lng != null)
    .map((w) => ({
      warehouseId: w.id,
      name: w.name,
      address: w.address,
      point: { lat: w.lat as number, lng: w.lng as number },
    }));
}

export function equipmentForNetworkOperator(networkOperatorId: string): RouteEquipment[] {
  return vehicles
    .filter((v) => v.networkOperatorId === networkOperatorId)
    .map((v) => ({
      id: v.id,
      label: v.label,
      modelLabel: v.modelLabel ?? "Delivery vehicle",
      capacityCuFt: v.capacityCuFt ?? 400,
    }));
}

// "Xavier Herrera" → "Xavier H." — how a route labels its driver, matching how
// the rest of the NO app abbreviates crew on dense rows.
export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

// Shift windows and phone numbers are seeded per (operator, day) so the
// Availability panel reads the same every time you open that day, and so a
// driver's hours actually constrain what generation can give them.
const SHIFT_WINDOWS: Array<[number, number]> = [
  [8 * 60, 17 * 60], // 8:00 AM – 5:00 PM
  [9 * 60, 18 * 60], // 9:00 AM – 6:00 PM
  [9 * 60, 17 * 60 + 30], // 9:00 AM – 5:30 PM
  [7 * 60, 16 * 60], // 7:00 AM – 4:00 PM
  [10 * 60, 19 * 60], // 10:00 AM – 7:00 PM
];

const AREA_CODES = ["415", "312", "720", "512", "206", "916", "973", "864", "213"];

export function staffForNetworkOperator(networkOperatorId: string, dateISO: string): RouteStaff[] {
  return fieldOperators
    .filter((fo) => fo.networkOperatorId === networkOperatorId)
    .map((fo) => {
      const rand = makeRng(hashSeed(`${fo.id}|${dateISO}`));
      const [startMin, endMin] = pick(rand, SHIFT_WINDOWS);
      const area = pick(rand, AREA_CODES);
      const mid = String(intBetween(rand, 200, 989));
      const last = String(intBetween(rand, 1000, 9999));
      return {
        id: fo.id,
        name: fo.name,
        shortName: shortName(fo.name),
        startMin,
        endMin,
        phone: `${area}-${mid}-${last}`,
      };
    });
}

// --- The day's order pool -------------------------------------------------

// Street names are generic on purpose: the prototype plans against real depot
// coordinates but synthesized delivery addresses (see
// docs/sample-data-generation.md — customer addresses are never real).
const STREET_NAMES = [
  "Locust St.",
  "Alma St.",
  "Grandview Ave.",
  "Delmar Blvd.",
  "Harrison St.",
  "Cedar Ln.",
  "Winslow Ct.",
  "Ridgeway Ave.",
  "Fairmount St.",
  "Bellwood Dr.",
  "Kimball Ave.",
  "Mercer St.",
  "Sherwood Rd.",
  "Ashland Ave.",
  "Prairie St.",
  "Foster Ave.",
  "Linden Pl.",
  "Halstead St.",
  "Devon Ave.",
  "Morse Ave.",
  "Touhy Ave.",
  "Oakton St.",
  "Emerson St.",
  "Lawler Ave.",
];

// Fallback payload descriptions, used when the brand has no inventory seeded.
const GENERIC_ITEMS = [
  "2 × Pallet — dry goods",
  "6 cases · retail restock",
  "1 × Crate — event kit",
  "4 totes · returns",
  "1 × Pallet — display units",
  "12 cartons · fulfilment",
];

const UNITS = ["cases", "cartons", "totes", "boxes"];

// Which brands this operator actually works for, so a day's orders carry brand
// names the account would recognise. Falls back to the full brand list for
// accounts whose sample work orders haven't been filled in yet.
function brandIdsForNetworkOperator(networkOperatorId: string): string[] {
  const woById = new Map(workOrders.map((wo) => [wo.id, wo]));
  const ids = new Set<string>();
  for (const t of tasks) {
    if (t.networkOperatorId !== networkOperatorId) continue;
    const brandId = woById.get(t.workOrderId)?.brandId;
    if (brandId) ids.add(brandId);
  }
  return ids.size > 0 ? [...ids].sort() : brands.map((b) => b.id);
}

function describeItem(rand: () => number, brandId: string): string {
  const stock = inventoryItems.filter((i) => i.brandId === brandId);
  if (stock.length === 0) return pick(rand, GENERIC_ITEMS);
  const item = pick(rand, stock);
  const qty = intBetween(rand, 1, 12);
  return qty === 1 ? `1 × ${item.name}` : `${qty} ${pick(rand, UNITS)} · ${item.name}`;
}

function orderRef(rand: () => number): string {
  const letters = "ABCDEFGHJKLMNPRSTVWXYZ";
  const a = letters[Math.floor(rand() * letters.length)];
  const b = letters[Math.floor(rand() * letters.length)];
  return `${a}${b}${String(intBetween(rand, 100000, 999999))}`;
}

// How many deliveries a full day carries. Enough to need several trucks and to
// make the routing visibly non-trivial, few enough to scan in the list.
export const ORDERS_PER_DAY = 30;

// Delivery territories. Orders cluster into a handful of neighbourhoods rather
// than scattering evenly, because that's what makes routing worth doing — and
// it's what real days look like.
const TERRITORY_COUNT = 4;

function buildTerritories(rand: () => number, depot: GeoPoint): GeoPoint[] {
  const lngScale = MILES_PER_DEG_LAT * Math.cos((depot.lat * Math.PI) / 180);
  return Array.from({ length: TERRITORY_COUNT }, (_, i) => {
    // Spread the centres around the depot, then jitter so they don't read as a
    // perfect compass rose.
    const bearing = (i / TERRITORY_COUNT) * 2 * Math.PI + between(rand, -0.4, 0.4);
    const distance = between(rand, 2.4, 6.8);
    return {
      lat: depot.lat + (Math.cos(bearing) * distance) / MILES_PER_DEG_LAT,
      lng: depot.lng + (Math.sin(bearing) * distance) / lngScale,
    };
  });
}

// Snap to a ~90 m lattice so stops land on plausible block corners instead of
// arbitrary points in the middle of a field.
const BLOCK_DEG = 0.0012;
const snap = (v: number) => Math.round(v / BLOCK_DEG) * BLOCK_DEG;

// The deliveries requested for one day at one depot. `extra` appends further
// orders beyond the seeded pool — the Route board uses it to simulate late
// orders arriving, which is what puts the Regenerate banner on screen.
export function seedOrdersForDay(
  networkOperatorId: string,
  warehouseId: string,
  dateISO: string,
  count: number = ORDERS_PER_DAY,
): DeliveryOrder[] {
  const depot = depotsForNetworkOperator(networkOperatorId).find(
    (d) => d.warehouseId === warehouseId,
  );
  if (!depot) return [];

  const brandIds = brandIdsForNetworkOperator(networkOperatorId);
  const rand = makeRng(hashSeed(`${networkOperatorId}|${warehouseId}|${dateISO}`));
  const territories = buildTerritories(rand, depot.point);
  const lngScale = MILES_PER_DEG_LAT * Math.cos((depot.point.lat * Math.PI) / 180);

  return Array.from({ length: count }, (_, i) => {
    const centre = territories[i % TERRITORY_COUNT];
    const bearing = between(rand, 0, 2 * Math.PI);
    const distance = between(rand, 0.15, 1.7);
    const brandId = pick(rand, brandIds);

    // Roughly one order in five asks for a window, and it's always a couple of
    // hours wide — narrower than that and a day of 30 stops is unplannable.
    const hasWindow = rand() < 0.22;
    const windowStartMin = hasWindow ? intBetween(rand, 9, 14) * 60 : null;

    return {
      id: `order-${dateISO}-${i + 1}`,
      orderRef: orderRef(rand),
      address: `${intBetween(rand, 100, 18999)} ${pick(rand, STREET_NAMES)}`,
      itemDescription: describeItem(rand, brandId),
      point: {
        lat: snap(centre.lat + (Math.cos(bearing) * distance) / MILES_PER_DEG_LAT),
        lng: snap(centre.lng + (Math.sin(bearing) * distance) / lngScale),
      },
      volumeCuFt: intBetween(rand, 18, 210),
      serviceMinutes: intBetween(rand, 6, 18),
      brandId,
      windowStartMin,
      windowEndMin: windowStartMin == null ? null : windowStartMin + 180,
      // Most of the day's work is on the board before dispatch; a couple of
      // orders land mid-morning.
      requestedAtMin: rand() < 0.08 ? intBetween(rand, 10 * 60, 13 * 60) : intBetween(rand, 6 * 60, 9 * 60),
    };
  });
}
