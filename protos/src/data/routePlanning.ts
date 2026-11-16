// Route generation and editing — the engine behind the Route Planning stack.
//
// Generation is a small, honest vehicle-routing solver rather than a lookup
// table of pre-baked answers, so the routes actually respond to the inputs the
// manager changes: drop a truck and the day redistributes, add a driver who
// starts late and their route starts late too, add fifteen orders and the shape
// of the day changes.
//
//   sweep by bearing → nearest-neighbour ordering → 2-opt → window repair
//
// Everything here is pure: functions take a plan and return a new one, so the
// context can keep a baseline to cancel back to.

import {
  BREAK_MINUTES,
  type DeliveryOrder,
  type Depot,
  type GeoPoint,
  type PlannedRoute,
  type RouteEquipment,
  type RouteStaff,
  type RouteStop,
  driveMinutes,
  drivingMiles,
} from "./routes";

// Loading the truck at the depot before the first drop. A driver on at 9:00
// rolls out at 9:30.
export const DEPOT_LOAD_MINUTES = 30;

// The driver's unpaid break, dropped into the timeline once they've been out
// long enough to need it.
export const MIN_MINUTES_BEFORE_BREAK = 210;

// 2-opt is O(n²) per pass; a day's route is well under 30 stops, so a handful of
// passes converges without a budget worth tuning.
const MAX_IMPROVEMENT_PASSES = 12;

// --- Derived route figures -------------------------------------------------

export interface RouteSummary {
  deliveryCount: number;
  totalMiles: number;
  startMin: number;
  endMin: number;
  workingMinutes: number;
  volumeCuFt: number;
  deliveredCount: number;
  failedCount: number;
  // Stops whose planned arrival misses the window the brand asked for.
  windowMissCount: number;
  // True when the route runs past the end of the driver's availability.
  overtime: boolean;
}

export function summarizeRoute(
  route: PlannedRoute,
  orderById: Map<string, DeliveryOrder>,
  staff: RouteStaff | undefined,
): RouteSummary {
  const deliveries = route.stops.filter((s) => s.kind === "delivery");
  const last = route.stops[route.stops.length - 1];
  const endMin = last ? last.departMin + route.returnMin : route.startMin;
  const totalMiles =
    route.stops.reduce((sum, s) => sum + s.legMiles, 0) + route.returnMiles;

  let volumeCuFt = 0;
  let windowMissCount = 0;
  for (const stop of deliveries) {
    const order = stop.orderId ? orderById.get(stop.orderId) : undefined;
    if (!order) continue;
    volumeCuFt += order.volumeCuFt;
    if (missesWindow(order, stop.arriveMin)) windowMissCount++;
  }

  return {
    deliveryCount: deliveries.length,
    totalMiles: Math.round(totalMiles * 10) / 10,
    startMin: route.startMin,
    endMin,
    workingMinutes: endMin - route.startMin,
    volumeCuFt,
    deliveredCount: deliveries.filter((s) => s.status === "delivered").length,
    failedCount: deliveries.filter((s) => s.status === "failed").length,
    windowMissCount,
    overtime: staff ? endMin > staff.endMin : false,
  };
}

export function missesWindow(order: DeliveryOrder, arriveMin: number): boolean {
  if (order.windowStartMin == null || order.windowEndMin == null) return false;
  return arriveMin < order.windowStartMin || arriveMin > order.windowEndMin;
}

// The geometry the map draws: depot → each stop in order → back to the depot.
export function routePath(
  route: PlannedRoute,
  orderById: Map<string, DeliveryOrder>,
  depot: Depot,
): GeoPoint[] {
  const points: GeoPoint[] = [depot.point];
  for (const stop of route.stops) {
    if (stop.kind !== "delivery" || !stop.orderId) continue;
    const order = orderById.get(stop.orderId);
    if (order) points.push(order.point);
  }
  points.push(depot.point);
  return points;
}

// --- Timing ----------------------------------------------------------------

// Recomputes every leg, arrival, and departure from the stop sequence. Called
// after anything that changes a route's order — generation, a reorder, a move
// between trucks — so the timeline on screen always matches the sequence.
export function retimeRoute(
  route: PlannedRoute,
  orderById: Map<string, DeliveryOrder>,
  depot: Depot,
): PlannedRoute {
  let cursor = route.startMin;
  let previous = depot.point;
  const stops: RouteStop[] = [];

  for (const stop of route.stops) {
    if (stop.kind === "break") {
      stops.push({
        ...stop,
        travelMinFromPrev: 0,
        legMiles: 0,
        arriveMin: cursor,
        departMin: cursor + BREAK_MINUTES,
      });
      cursor += BREAK_MINUTES;
      continue;
    }

    const order = stop.orderId ? orderById.get(stop.orderId) : undefined;
    if (!order) continue; // the order was withdrawn from the day

    const legMiles = drivingMiles(previous, order.point);
    const travel = driveMinutes(legMiles);
    const arriveMin = cursor + travel;
    const departMin = arriveMin + order.serviceMinutes;
    stops.push({ ...stop, travelMinFromPrev: travel, legMiles, arriveMin, departMin });
    cursor = departMin;
    previous = order.point;
  }

  const returnMiles = drivingMiles(previous, depot.point);
  return { ...route, stops, returnMiles, returnMin: driveMinutes(returnMiles) };
}

// --- Sequencing ------------------------------------------------------------

// Nearest neighbour from the depot: a decent first sequence, and the starting
// point 2-opt improves on.
function nearestNeighbourOrder(orders: DeliveryOrder[], depot: Depot): DeliveryOrder[] {
  const remaining = [...orders];
  const sequence: DeliveryOrder[] = [];
  let from = depot.point;
  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = drivingMiles(from, remaining[i].point);
      if (d < bestDistance) {
        bestDistance = d;
        bestIndex = i;
      }
    }
    const next = remaining.splice(bestIndex, 1)[0];
    sequence.push(next);
    from = next.point;
  }
  return sequence;
}

function sequenceMiles(sequence: DeliveryOrder[], depot: Depot): number {
  if (sequence.length === 0) return 0;
  let total = drivingMiles(depot.point, sequence[0].point);
  for (let i = 1; i < sequence.length; i++) {
    total += drivingMiles(sequence[i - 1].point, sequence[i].point);
  }
  return total + drivingMiles(sequence[sequence.length - 1].point, depot.point);
}

// 2-opt: repeatedly reverse the segment between two stops whenever doing so
// shortens the tour. Removes the crossings nearest-neighbour leaves behind,
// which is exactly what makes a generated route look hand-drawn rather than
// greedy.
function twoOpt(sequence: DeliveryOrder[], depot: Depot): DeliveryOrder[] {
  if (sequence.length < 4) return sequence;
  let best = [...sequence];
  let bestMiles = sequenceMiles(best, depot);

  for (let pass = 0; pass < MAX_IMPROVEMENT_PASSES; pass++) {
    let improved = false;
    for (let i = 0; i < best.length - 1; i++) {
      for (let k = i + 1; k < best.length; k++) {
        const candidate = [
          ...best.slice(0, i),
          ...best.slice(i, k + 1).reverse(),
          ...best.slice(k + 1),
        ];
        const miles = sequenceMiles(candidate, depot);
        // Guard against churn from floating-point noise.
        if (miles < bestMiles - 1e-6) {
          best = candidate;
          bestMiles = miles;
          improved = true;
        }
      }
    }
    if (!improved) break;
  }
  return best;
}

// Predicted arrival at each stop of a bare sequence, used by window repair
// before the sequence becomes a route.
function arrivalTimes(sequence: DeliveryOrder[], depot: Depot, startMin: number): number[] {
  const out: number[] = [];
  let cursor = startMin;
  let previous = depot.point;
  for (const order of sequence) {
    const arrive = cursor + driveMinutes(drivingMiles(previous, order.point));
    out.push(arrive);
    cursor = arrive + order.serviceMinutes;
    previous = order.point;
  }
  return out;
}

// Moves window-constrained stops to a position where their window is actually
// met, as long as the detour is modest. Distance-optimal ordering routinely
// arrives at a 9–12 stop at 4pm; this is the pass that fixes that without
// throwing away the tour 2-opt found.
function repairWindows(
  sequence: DeliveryOrder[],
  depot: Depot,
  startMin: number,
): DeliveryOrder[] {
  const constrained = sequence.filter((o) => o.windowStartMin != null);
  if (constrained.length === 0) return sequence;

  let current = [...sequence];
  for (const order of constrained) {
    const arrivals = arrivalTimes(current, depot, startMin);
    const index = current.indexOf(order);
    if (index < 0) continue;
    if (!missesWindow(order, arrivals[index])) continue;

    const without = current.filter((o) => o.id !== order.id);
    const baseMiles = sequenceMiles(current, depot);
    let best: DeliveryOrder[] | null = null;
    let bestPenalty = Infinity;

    for (let position = 0; position <= without.length; position++) {
      const candidate = [
        ...without.slice(0, position),
        order,
        ...without.slice(position),
      ];
      const candidateArrivals = arrivalTimes(candidate, depot, startMin);
      if (missesWindow(order, candidateArrivals[position])) continue;
      // Count what the move costs: the extra driving, plus any other window it
      // breaks on the way (weighted so breaking one is never worth a shortcut).
      const collateral = candidate.reduce(
        (n, o, i) => n + (missesWindow(o, candidateArrivals[i]) ? 1 : 0),
        0,
      );
      const penalty = sequenceMiles(candidate, depot) - baseMiles + collateral * 25;
      if (penalty < bestPenalty) {
        bestPenalty = penalty;
        best = candidate;
      }
    }
    if (best) current = best;
  }
  return current;
}

// --- Generation ------------------------------------------------------------

// A truck paired with the driver who'll run it.
interface Unit {
  equipment: RouteEquipment;
  staff: RouteStaff;
}

export interface GenerateInput {
  orders: DeliveryOrder[];
  equipment: RouteEquipment[];
  staff: RouteStaff[];
  depot: Depot;
}

export interface GenerateResult {
  routes: PlannedRoute[];
  // Orders generation couldn't place, with the reason, so the planner can say
  // why rather than silently dropping them.
  unassignedOrderIds: string[];
  reason: "none" | "no_equipment" | "no_staff" | "capacity" | "hours";
}

// Biggest trucks to the earliest drivers: the long routes are the ones that
// need both the space and the hours.
function pairUnits(equipment: RouteEquipment[], staff: RouteStaff[]): Unit[] {
  const trucks = [...equipment].sort((a, b) => b.capacityCuFt - a.capacityCuFt);
  const drivers = [...staff].sort(
    (a, b) => a.startMin - b.startMin || b.endMin - a.endMin || a.name.localeCompare(b.name),
  );
  return trucks
    .slice(0, Math.min(trucks.length, drivers.length))
    .map((truck, i) => ({ equipment: truck, staff: drivers[i] }));
}

function bearingFromDepot(depot: Depot, point: GeoPoint): number {
  return Math.atan2(point.lng - depot.point.lng, point.lat - depot.point.lat);
}

// How long a unit can be out: the driver's hours, less loading and the break.
function availableMinutes(unit: Unit): number {
  return Math.max(0, unit.staff.endMin - unit.staff.startMin - DEPOT_LOAD_MINUTES - BREAK_MINUTES);
}

// A cheap estimate of what a set of orders costs a unit in time, used while
// filling territories — before any sequencing has happened. Assumes stops in a
// territory sit about a mile apart.
function estimateMinutes(orders: DeliveryOrder[]): number {
  const service = orders.reduce((sum, o) => sum + o.serviceMinutes, 0);
  return service + orders.length * driveMinutes(1.1);
}

export function generateRoutes({
  orders,
  equipment,
  staff,
  depot,
}: GenerateInput): GenerateResult {
  if (equipment.length === 0) {
    return { routes: [], unassignedOrderIds: orders.map((o) => o.id), reason: "no_equipment" };
  }
  if (staff.length === 0) {
    return { routes: [], unassignedOrderIds: orders.map((o) => o.id), reason: "no_staff" };
  }

  const units = pairUnits(equipment, staff);
  const orderById = new Map(orders.map((o) => [o.id, o]));

  // --- Sweep: walk the orders round the depot by bearing and hand contiguous
  // arcs to each unit. Contiguity is the point — it's what gives each truck a
  // territory rather than a scattering of stops across town.
  //
  // The sweep starts at the farthest order, so the wedge boundaries fall
  // between neighbourhoods instead of slicing one in half.
  const byDistance = [...orders].sort(
    (a, b) => drivingMiles(depot.point, b.point) - drivingMiles(depot.point, a.point),
  );
  const startBearing = byDistance.length > 0 ? bearingFromDepot(depot, byDistance[0].point) : 0;
  const swept = [...orders].sort((a, b) => {
    const norm = (o: DeliveryOrder) => {
      const delta = bearingFromDepot(depot, o.point) - startBearing;
      return (delta + 4 * Math.PI) % (2 * Math.PI);
    };
    return norm(a) - norm(b) || a.id.localeCompare(b.id);
  });

  // Soft cap so a high-capacity truck doesn't swallow the whole day just
  // because it has the room.
  const softCap = Math.ceil(swept.length / units.length);
  const buckets: DeliveryOrder[][] = units.map(() => []);
  const overflow: DeliveryOrder[] = [];

  let unitIndex = 0;
  for (const order of swept) {
    let placed = false;
    // Try the current unit, then the ones after it — never back, so arcs stay
    // contiguous.
    for (let attempt = 0; attempt < units.length; attempt++) {
      const index = unitIndex + attempt;
      if (index >= units.length) break;
      const bucket = buckets[index];
      const unit = units[index];
      const volume = bucket.reduce((sum, o) => sum + o.volumeCuFt, 0);
      const fits =
        volume + order.volumeCuFt <= unit.equipment.capacityCuFt &&
        estimateMinutes([...bucket, order]) <= availableMinutes(unit) &&
        bucket.length < softCap;
      if (fits) {
        bucket.push(order);
        unitIndex = index;
        placed = true;
        break;
      }
    }
    if (!placed) overflow.push(order);
  }

  // --- Sequence each territory, then build the route.
  const routes: PlannedRoute[] = units.map((unit, i) => {
    const startMin = unit.staff.startMin + DEPOT_LOAD_MINUTES;
    let sequence = nearestNeighbourOrder(buckets[i], depot);
    sequence = twoOpt(sequence, depot);
    sequence = repairWindows(sequence, depot, startMin);

    const route: PlannedRoute = {
      id: `route-${unit.equipment.id}`,
      equipmentId: unit.equipment.id,
      staffId: unit.staff.id,
      colorIndex: i,
      startMin,
      stops: sequence.map((order) => blankStop(order.id, `stop-${unit.equipment.id}-${order.id}`)),
      returnMin: 0,
      returnMiles: 0,
    };
    return withBreak(retimeRoute(route, orderById, depot), orderById, depot);
  });

  // --- Anything the sweep couldn't place gets a second chance by cheapest
  // insertion, which can use room the wedge boundaries left behind.
  const inserted = insertOrders(routes, overflow, orderById, depot, staffById(staff));

  const reason: GenerateResult["reason"] =
    inserted.unassignedOrderIds.length === 0
      ? "none"
      : // Distinguish "the trucks are full" from "the day doesn't fit the hours",
        // because they call for different fixes.
        totalCapacity(equipment) < totalVolume(orders)
        ? "capacity"
        : "hours";

  return { routes: inserted.routes, unassignedOrderIds: inserted.unassignedOrderIds, reason };
}

function blankStop(orderId: string, id: string): RouteStop {
  return {
    id,
    kind: "delivery",
    orderId,
    travelMinFromPrev: 0,
    legMiles: 0,
    arriveMin: 0,
    departMin: 0,
    status: "pending",
  };
}

function totalCapacity(equipment: RouteEquipment[]): number {
  return equipment.reduce((sum, e) => sum + e.capacityCuFt, 0);
}

function totalVolume(orders: DeliveryOrder[]): number {
  return orders.reduce((sum, o) => sum + o.volumeCuFt, 0);
}

export function staffById(staff: RouteStaff[]): Map<string, RouteStaff> {
  return new Map(staff.map((s) => [s.id, s]));
}

// Drops the driver's break in once they've been out long enough to have earned
// it — after the last stop that finishes before the threshold, so the break
// falls between stops rather than mid-drive.
function withBreak(
  route: PlannedRoute,
  orderById: Map<string, DeliveryOrder>,
  depot: Depot,
): PlannedRoute {
  if (route.stops.some((s) => s.kind === "break")) return route;
  const threshold = route.startMin + MIN_MINUTES_BEFORE_BREAK;
  const lastBefore = route.stops.findLastIndex(
    (s) => s.kind === "delivery" && s.departMin <= threshold,
  );
  // No break on a route that never runs long enough to need one, or one that's
  // already past the threshold at its first stop.
  if (lastBefore < 0 || lastBefore === route.stops.length - 1) return route;

  const breakStop: RouteStop = {
    id: `break-${route.equipmentId}`,
    kind: "break",
    orderId: null,
    travelMinFromPrev: 0,
    legMiles: 0,
    arriveMin: 0,
    departMin: 0,
    status: "pending",
  };
  const stops = [
    ...route.stops.slice(0, lastBefore + 1),
    breakStop,
    ...route.stops.slice(lastBefore + 1),
  ];
  return retimeRoute({ ...route, stops }, orderById, depot);
}

// --- Editing ---------------------------------------------------------------

export interface InsertResult {
  routes: PlannedRoute[];
  unassignedOrderIds: string[];
}

// Cheapest insertion: for each order, find the position across all routes that
// adds the least driving while still fitting the truck and the driver's day.
// This is what the board's Regenerate does — it slots new orders into the routes
// already on the road instead of tearing up a plan drivers have started.
export function insertOrders(
  routes: PlannedRoute[],
  incoming: DeliveryOrder[],
  orderById: Map<string, DeliveryOrder>,
  depot: Depot,
  staff: Map<string, RouteStaff>,
  equipmentById?: Map<string, RouteEquipment>,
): InsertResult {
  let working = routes.map((r) => retimeRoute(r, orderById, depot));
  const unassignedOrderIds: string[] = [];

  // Largest first: the awkward orders are the ones that need the choice of
  // positions, and placing them last tends to leave them homeless.
  const queue = [...incoming].sort((a, b) => b.volumeCuFt - a.volumeCuFt || a.id.localeCompare(b.id));

  for (const order of queue) {
    let best: { routeIndex: number; position: number; cost: number } | null = null;

    working.forEach((route, routeIndex) => {
      const driver = staff.get(route.staffId);
      const truck = equipmentById?.get(route.equipmentId);
      if (truck) {
        const volume = routeVolume(route, orderById);
        if (volume + order.volumeCuFt > truck.capacityCuFt) return;
      }

      // Never insert ahead of work the driver has already finished — the day is
      // partly run by the time late orders arrive.
      const firstOpen = route.stops.findIndex((s) => s.status === "pending");
      const lowerBound = firstOpen < 0 ? route.stops.length : firstOpen;

      for (let position = lowerBound; position <= route.stops.length; position++) {
        const candidate = retimeRoute(
          {
            ...route,
            stops: [
              ...route.stops.slice(0, position),
              blankStop(order.id, `stop-${route.equipmentId}-${order.id}`),
              ...route.stops.slice(position),
            ],
          },
          orderById,
          depot,
        );
        const summary = summarizeRoute(candidate, orderById, driver);
        if (driver && summary.endMin > driver.endMin) continue;
        const cost =
          summary.totalMiles -
          summarizeRoute(route, orderById, driver).totalMiles +
          summary.windowMissCount * 5;
        if (!best || cost < best.cost) best = { routeIndex, position, cost };
      }
    });

    if (!best) {
      unassignedOrderIds.push(order.id);
      continue;
    }
    const { routeIndex, position } = best;
    const target = working[routeIndex];
    working = working.map((route, i) =>
      i !== routeIndex
        ? route
        : retimeRoute(
            {
              ...route,
              stops: [
                ...target.stops.slice(0, position),
                blankStop(order.id, `stop-${route.equipmentId}-${order.id}`),
                ...target.stops.slice(position),
              ],
            },
            orderById,
            depot,
          ),
    );
  }

  return { routes: working, unassignedOrderIds };
}

function routeVolume(route: PlannedRoute, orderById: Map<string, DeliveryOrder>): number {
  return route.stops.reduce((sum, s) => {
    const order = s.orderId ? orderById.get(s.orderId) : undefined;
    return sum + (order?.volumeCuFt ?? 0);
  }, 0);
}

// Moves a stop within its route by `delta` positions, retiming what follows.
export function reorderStop(
  routes: PlannedRoute[],
  stopId: string,
  delta: number,
  orderById: Map<string, DeliveryOrder>,
  depot: Depot,
): PlannedRoute[] {
  return routes.map((route) => {
    const index = route.stops.findIndex((s) => s.id === stopId);
    if (index < 0) return route;
    const target = index + delta;
    if (target < 0 || target >= route.stops.length) return route;
    const stops = [...route.stops];
    const [moved] = stops.splice(index, 1);
    stops.splice(target, 0, moved);
    return retimeRoute({ ...route, stops }, orderById, depot);
  });
}

// Moves a stop onto another truck, inserted at whichever position on that route
// adds the least driving.
export function moveStopToRoute(
  routes: PlannedRoute[],
  stopId: string,
  targetRouteId: string,
  orderById: Map<string, DeliveryOrder>,
  depot: Depot,
  staff: Map<string, RouteStaff>,
): PlannedRoute[] {
  const source = routes.find((r) => r.stops.some((s) => s.id === stopId));
  const stop = source?.stops.find((s) => s.id === stopId);
  if (!source || !stop || !stop.orderId || source.id === targetRouteId) return routes;
  const order = orderById.get(stop.orderId);
  if (!order) return routes;

  const stripped = routes.map((route) =>
    route.id !== source.id
      ? route
      : retimeRoute({ ...route, stops: route.stops.filter((s) => s.id !== stopId) }, orderById, depot),
  );
  const target = stripped.find((r) => r.id === targetRouteId);
  if (!target) return routes;

  const { routes: placed } = insertOrders([target], [order], orderById, depot, staff);
  return stripped.map((route) => (route.id === targetRouteId ? placed[0] : route));
}

// Takes a stop off its route and back into the unassigned pool.
export function removeStop(
  routes: PlannedRoute[],
  stopId: string,
  orderById: Map<string, DeliveryOrder>,
  depot: Depot,
): PlannedRoute[] {
  return routes.map((route) =>
    route.stops.every((s) => s.id !== stopId)
      ? route
      : retimeRoute({ ...route, stops: route.stops.filter((s) => s.id !== stopId) }, orderById, depot),
  );
}

export function setStopStatus(
  routes: PlannedRoute[],
  stopId: string,
  status: RouteStop["status"],
): PlannedRoute[] {
  return routes.map((route) => ({
    ...route,
    stops: route.stops.map((s) => (s.id === stopId ? { ...s, status } : s)),
  }));
}

// Reassigns the driver on a route, shifting the whole timeline to the hours the
// new driver actually works.
export function setRouteStaff(
  routes: PlannedRoute[],
  routeId: string,
  staffId: string,
  staff: Map<string, RouteStaff>,
  orderById: Map<string, DeliveryOrder>,
  depot: Depot,
): PlannedRoute[] {
  return routes.map((route) => {
    if (route.id !== routeId) return route;
    const driver = staff.get(staffId);
    const startMin = driver ? driver.startMin + DEPOT_LOAD_MINUTES : route.startMin;
    return retimeRoute({ ...route, staffId, startMin }, orderById, depot);
  });
}

// --- Live progress ---------------------------------------------------------

export type RoutePhase = "not_started" | "driving" | "at_stop" | "on_break" | "finished";

export interface RouteProgress {
  phase: RoutePhase;
  // Index into route.stops of the stop being worked, or the one being driven to.
  activeStopIndex: number;
  // Where the truck is right now — interpolated along the leg it's driving.
  point: GeoPoint;
  completedCount: number;
}

// Where a truck is at `nowMin`, derived rather than stored, so scrubbing the
// day's clock backwards and forwards is consistent.
export function routeProgress(
  route: PlannedRoute,
  orderById: Map<string, DeliveryOrder>,
  depot: Depot,
  nowMin: number,
): RouteProgress {
  if (nowMin < route.startMin) {
    return { phase: "not_started", activeStopIndex: -1, point: depot.point, completedCount: 0 };
  }

  let previousPoint = depot.point;
  let previousDepart = route.startMin;

  for (let i = 0; i < route.stops.length; i++) {
    const stop = route.stops[i];
    const stopPoint =
      stop.kind === "delivery" && stop.orderId
        ? (orderById.get(stop.orderId)?.point ?? previousPoint)
        : previousPoint;

    if (nowMin < stop.arriveMin) {
      // Mid-leg: slide along the straight line by how much of the drive is done.
      const span = Math.max(1, stop.arriveMin - previousDepart);
      const t = Math.min(1, Math.max(0, (nowMin - previousDepart) / span));
      return {
        phase: "driving",
        activeStopIndex: i,
        point: {
          lat: previousPoint.lat + (stopPoint.lat - previousPoint.lat) * t,
          lng: previousPoint.lng + (stopPoint.lng - previousPoint.lng) * t,
        },
        completedCount: countCompleted(route, i),
      };
    }
    if (nowMin <= stop.departMin) {
      return {
        phase: stop.kind === "break" ? "on_break" : "at_stop",
        activeStopIndex: i,
        point: stopPoint,
        completedCount: countCompleted(route, i),
      };
    }
    previousPoint = stopPoint;
    previousDepart = stop.departMin;
  }

  const last = route.stops[route.stops.length - 1];
  const endMin = last ? last.departMin + route.returnMin : route.startMin;
  if (nowMin >= endMin) {
    return {
      phase: "finished",
      activeStopIndex: route.stops.length,
      point: depot.point,
      completedCount: route.stops.filter((s) => s.kind === "delivery").length,
    };
  }
  // On the way back to the depot.
  const span = Math.max(1, route.returnMin);
  const t = Math.min(1, (nowMin - previousDepart) / span);
  return {
    phase: "driving",
    activeStopIndex: route.stops.length,
    point: {
      lat: previousPoint.lat + (depot.point.lat - previousPoint.lat) * t,
      lng: previousPoint.lng + (depot.point.lng - previousPoint.lng) * t,
    },
    completedCount: route.stops.filter((s) => s.kind === "delivery").length,
  };
}

function countCompleted(route: PlannedRoute, upToIndex: number): number {
  return route.stops
    .slice(0, upToIndex)
    .filter((s) => s.kind === "delivery").length;
}

// Marks everything the clock has already passed as done, leaving whatever the
// manager set by hand (a failed delivery) alone. This is how the live day walks
// forward on its own.
export function advanceStatuses(
  routes: PlannedRoute[],
  nowMin: number,
  failedStopIds: Set<string>,
): PlannedRoute[] {
  return routes.map((route) => ({
    ...route,
    stops: route.stops.map((stop) => {
      if (stop.kind !== "delivery") return stop;
      if (failedStopIds.has(stop.id)) return { ...stop, status: "failed" as const };
      return { ...stop, status: nowMin >= stop.departMin ? ("delivered" as const) : ("pending" as const) };
    }),
  }));
}
