// ENG-1271 shift data.
//
// A shift is not a new entity. It is a `Task` on a `TaskKind` with
// `taskType: "shift"`, hung off one `WorkOrder` per region per day. The old
// `Shift` record in data/shifts.ts flattened all of that into a single row
// (date + start + end + merchant + area + assignee); this module is that
// flattening undone, so the prototype and the real model agree.
//
// Two personas read the same tasks:
//   * Brand — every shift for the brand, across every region it operates in.
//   * NO    — only the regions where it is the live BRNO, i.e. where
//             `Region.liveNetworkOperatorId` points at it.
// See `shiftsForBrand` / `shiftsForNetworkOperator` at the bottom.
//
// The Network Operator's Shifts overview and Shift Calendar read this (through
// ShiftBoardContext). The brand page is still on the old model.

import type {
  Action,
  ActionKind,
  ID,
  InventoryUse,
  MetadataDefinition,
  Task,
  TaskAssignment,
  TaskStatus,
  WorkOrder,
} from "../types/domain";
import { taskKinds } from "./catalog";
import { regions } from "./regions";

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------
// Local to this module rather than imported from data/shifts.ts: that module is
// the pre-ENG-1271 model and is expected to go, and the new one should not have
// to wait for it.

export function toISODate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return toISODate(new Date(y, m - 1, d + days));
}

// Monday of the week containing `d`. Sunday belongs to the week that just ended.
function mondayOf(d: Date): string {
  const offset = (d.getDay() + 6) % 7;
  return toISODate(new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset));
}

export function weekDates(mondayISO: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(mondayISO, i));
}

function weekdayOf(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).getDay(); // 0 = Sunday
}

const TODAY = toISODate(new Date());

/** Monday of the current week — the sample data's anchor. */
export const SHIFT_WEEK_START = mondayOf(new Date());

/** The week being planned — the only one with holes left to fill. */
const PLANNING_WEEK_START = addDays(SHIFT_WEEK_START, 7);

/** Three weeks: the one just worked, the one in progress, and the one being
 *  planned. */
export const SHIFT_WEEK_STARTS = [
  addDays(SHIFT_WEEK_START, -7),
  SHIFT_WEEK_START,
  PLANNING_WEEK_START,
];

export const SHIFT_DATES = SHIFT_WEEK_STARTS.flatMap(weekDates);

// Austin, and the dispatch desk that covers it, both run on Central time. The
// prototype has no tz library, so the offset is written out; September is CDT.
const TIME_ZONE = "America/Chicago";
const UTC_OFFSET = "-05:00";

// ---------------------------------------------------------------------------
// Metadata definitions
// ---------------------------------------------------------------------------
// Brand-defined, Task-scoped, and the only thing that gives the grid its shape:
// displayRank 1 groups the rows, displayRank 2 colours the blocks. A brand that
// defined "Zone" and "Certification" instead would get a zone-by-day grid from
// the same code — nothing about merchants is hard-coded in the UI.

export const MERCHANT_DEF_ID = "mdef-al-merchant";
export const POSITION_DEF_ID = "mdef-al-position";

/** Dispatch covers every merchant at once, so it gets its own row rather than
 *  sitting outside the grid. */
export const ALL_MERCHANTS = "All merchants";

export const shiftMetadataDefinitions: MetadataDefinition[] = [
  {
    id: MERCHANT_DEF_ID,
    brandId: "brand-autolane",
    entityType: "TASK",
    name: "Merchant",
    displayRank: 1,
    values: ["Cherrywood", "Arboretum", "SoCo", "Menchaca", ALL_MERCHANTS],
  },
  {
    id: POSITION_DEF_ID,
    brandId: "brand-autolane",
    entityType: "TASK",
    name: "Position",
    displayRank: 2,
    values: ["AM", "PM", "PM Peak", "Dispatch AM", "Dispatch PM"],
  },
];

// ---------------------------------------------------------------------------
// Action kinds
// ---------------------------------------------------------------------------
// What may be done to a shift after it is posted. A shift's date is immutable
// by design — moving one to another day would move it to another work order —
// so Reschedule allows time and duration but not date. Cancel then re-post is
// the way to change the day.

const SHIFT_KIND_IDS = ["task-kind-al-supervise", "task-kind-al-dispatch"] as const;

export const shiftActionKinds: ActionKind[] = SHIFT_KIND_IDS.flatMap((taskKindId) => {
  const slug = taskKindId.replace("task-kind-al-", "");
  return [
    {
      id: `ak-al-${slug}-reschedule`,
      taskKindId,
      name: "Reschedule",
      allowsTimeUpdate: true,
      allowsDurationUpdate: true,
      allowsDateUpdate: false,
      isFieldOperatorCreatable: false,
    },
    {
      id: `ak-al-${slug}-cancel`,
      taskKindId,
      name: "Cancel",
      allowsTimeUpdate: false,
      allowsDurationUpdate: false,
      allowsDateUpdate: false,
      taskStatusUpdate: "cancelled" as TaskStatus,
      isFieldOperatorCreatable: false,
    },
  ];
});

// ---------------------------------------------------------------------------
// The week's shape
// ---------------------------------------------------------------------------

const POSITION_WINDOW: Record<string, { time: string; durationMinutes: number }> = {
  AM: { time: "9:00 AM", durationMinutes: 360 }, // 9:00 – 3:00
  PM: { time: "4:00 PM", durationMinutes: 360 }, // 4:00 – 10:00
  "PM Peak": { time: "5:00 PM", durationMinutes: 210 }, // 5:00 – 8:30
  "Dispatch AM": { time: "10:00 AM", durationMinutes: 270 }, // 10:00 – 2:30
  "Dispatch PM": { time: "4:00 PM", durationMinutes: 360 }, // 4:00 – 10:00
};

// [merchant, position] pairs per weekday. Fridays and Saturdays are the busy
// days; Sunday is a skeleton. Taken from the real Autolane week the prototype
// was seeded from.
const WEEKDAY = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };

const MIDWEEK: [string, string][] = [
  ["Cherrywood", "AM"],
  ["Cherrywood", "PM"],
  ["SoCo", "PM"],
  ["Arboretum", "PM"],
];

const WEEKEND: [string, string][] = [
  ["Cherrywood", "AM"],
  ["Cherrywood", "PM"],
  ["Cherrywood", "PM Peak"],
  ["SoCo", "AM"],
  ["SoCo", "PM"],
  ["Arboretum", "PM"],
  ["Menchaca", "PM"],
];

const SUNDAY: [string, string][] = [
  ["Cherrywood", "PM"],
  ["SoCo", "PM"],
];

function supervisionPattern(date: string): [string, string][] {
  const day = weekdayOf(date);
  if (day === WEEKDAY.SUN) return SUNDAY;
  if (day === WEEKDAY.FRI || day === WEEKDAY.SAT) return WEEKEND;
  return MIDWEEK;
}

// The dispatch desk runs the same two shifts every day of the week.
const DISPATCH_PATTERN: [string, string][] = [
  [ALL_MERCHANTS, "Dispatch AM"],
  [ALL_MERCHANTS, "Dispatch PM"],
];

// ---------------------------------------------------------------------------
// Rosters
// ---------------------------------------------------------------------------
// Supervision is G&C Roman's crew in Austin; dispatch is Brick Dispatch. Each
// is the live BRNO for its own region, which is what keeps the two apart in the
// NO view without any extra filtering.

const SUPERVISION_ROSTER = [
  "fo-gc-1", "fo-gc-2", "fo-gc-3", "fo-gc-4", "fo-gc-5", "fo-gc-6",
  "fo-gc-7", "fo-gc-8", "fo-gc-9", "fo-gc-10", "fo-gc-11",
];

const DISPATCH_ROSTER = ["fo-bd-1", "fo-bd-2", "fo-bd-3"];

// The nine Model Ys, by plate. These are the brand's inventory items (the NO
// mirrors them as vehicles); a supervision shift holds one for its duration.
const MODEL_Y_ITEM_IDS = [
  "inv-al-606125", "inv-al-606332", "inv-al-606472", "inv-al-606732",
  "inv-al-697036", "inv-al-699757", "inv-al-700581", "inv-al-700910",
  "inv-al-700982",
];

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

/** The work order upsert key. One per region per day: the importer can re-run
 *  over the same week and land on the same work orders. */
export function shiftWorkOrderExternalId(regionId: ID, date: string): string {
  return `shift:${regionId}:${date}`;
}

interface Lane {
  regionId: ID;
  taskKindId: ID;
  networkOperatorId: ID;
  roster: string[];
  pattern: (date: string) => [string, string][];
  /** Supervision attends a vehicle; dispatch sits at a desk. */
  usesVehicle: boolean;
  location: (merchant: string) => string;
}

const LANES: Lane[] = [
  {
    regionId: "region-austin",
    taskKindId: "task-kind-al-supervise",
    networkOperatorId: "no-gcroman",
    roster: SUPERVISION_ROSTER,
    pattern: supervisionPattern,
    usesVehicle: true,
    location: (merchant) => `${merchant}, Austin TX`,
  },
  {
    regionId: "region-autolane-dispatch",
    taskKindId: "task-kind-al-dispatch",
    networkOperatorId: "no-brick-dispatch",
    roster: DISPATCH_ROSTER,
    pattern: () => DISPATCH_PATTERN,
    usesVehicle: false,
    location: () => "Dispatch desk, Austin TX",
  },
];

/** "4:00 PM" -> 960. Minutes from midnight; the grid lays blocks out on this. */
export function parseTimeToMinutes(time: string): number {
  const match = /^(\d+):(\d+)\s*(AM|PM)$/i.exec(time.trim());
  if (!match) return 0;
  const hour = Number(match[1]) % 12;
  return (match[3].toUpperCase() === "PM" ? hour + 12 : hour) * 60 + Number(match[2]);
}

/** 960 -> "4:00 PM". Wraps past midnight so a late shift reads sensibly. */
export function formatMinutesAsTime(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  const hour24 = Math.floor(m / 60);
  const hour = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour}:${String(m % 60).padStart(2, "0")} ${hour24 < 12 ? "AM" : "PM"}`;
}

/** A shift stores a start and a duration, never an end; derive the end here so
 *  every surface agrees on it. */
export function shiftEndTime(task: Task): string {
  return formatMinutesAsTime(
    parseTimeToMinutes(task.time ?? "") + (task.durationMinutes ?? 0),
  );
}

export function shiftTimeRange(task: Task): string {
  return `${task.time ?? "—"} – ${shiftEndTime(task)}`;
}

function scheduledAt(date: string, time: string): string {
  const minutes = parseTimeToMinutes(time);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date}T${p(Math.floor(minutes / 60))}:${p(minutes % 60)}:00${UTC_OFFSET}`;
}

function buildShiftData() {
  const workOrders: WorkOrder[] = [];
  const tasks: Task[] = [];
  const assignments: TaskAssignment[] = [];
  const inventoryUses: InventoryUse[] = [];
  const actions: Action[] = [];

  // A single counter across the whole build, so the roster rotates through the
  // week instead of every Monday drawing the same names.
  let seq = 0;

  for (const lane of LANES) {
    const regionSlug = lane.regionId.replace("region-", "");

    for (const date of SHIFT_DATES) {
      const specs = lane.pattern(date);
      if (specs.length === 0) continue;

      const workOrderId = `wo-shift-${regionSlug}-${date}`;
      const taskIds: ID[] = [];
      const past = date < TODAY;
      const nextWeek = date >= PLANNING_WEEK_START;

      specs.forEach(([merchant, position], i) => {
        const taskId = `task-shift-${regionSlug}-${date}-${i + 1}`;
        const window = POSITION_WINDOW[position];
        seq += 1;

        // The planning week is where the holes are: next week is still being
        // staffed, this week is settled. Two shifts have been called off.
        const unassigned = nextWeek && seq % 9 === 4;
        const cancelled = nextWeek && seq % 23 === 7;
        // A few shifts were pushed an hour later after they were posted. The
        // task carries where it ended up; the Action carries where it started.
        const rescheduledBy = !cancelled && seq % 17 === 3 ? 60 : 0;
        const operatorId = unassigned ? null : lane.roster[seq % lane.roster.length];

        const startTime = formatMinutesAsTime(
          parseTimeToMinutes(window.time) + rescheduledBy,
        );

        const status: TaskStatus = cancelled
          ? "cancelled"
          : past
            ? "completed"
            : "not_started";

        tasks.push({
          id: taskId,
          workOrderId,
          taskKindId: lane.taskKindId,
          networkOperatorId: lane.networkOperatorId,
          // Kept in step with the active assignment below. The assignment is
          // the record of truth; this mirrors it for the pages that still read
          // a single operator off the task.
          fieldOperatorId: operatorId,
          status,
          location: lane.location(merchant),
          scheduledAt: scheduledAt(date, startTime),
          completedAt: status === "completed" ? scheduledAt(date, startTime) : null,
          assignedInventoryIds:
            lane.usesVehicle ? [MODEL_Y_ITEM_IDS[seq % MODEL_Y_ITEM_IDS.length]] : [],
          notes: null,

          // Shift fields.
          name: position,
          metadata: { [MERCHANT_DEF_ID]: merchant, [POSITION_DEF_ID]: position },
          date,
          time: startTime,
          durationMinutes: window.durationMinutes,
          timeZone: TIME_ZONE,
        });
        taskIds.push(taskId);

        if (operatorId) {
          assignments.push({
            id: `asg-${taskId}`,
            taskId,
            fieldOperatorId: operatorId,
            createdAt: `${addDays(date, -5)}T12:00:00${UTC_OFFSET}`,
            active: true,
          });
        }

        if (lane.usesVehicle) {
          inventoryUses.push({
            id: `iuse-${taskId}`,
            taskId,
            inventoryItemId: MODEL_Y_ITEM_IDS[seq % MODEL_Y_ITEM_IDS.length],
            quantity: 1,
          });
        }

        if (rescheduledBy > 0) {
          actions.push({
            id: `act-${taskId}-reschedule`,
            taskId,
            actionKindId: `ak-al-${lane.taskKindId.replace("task-kind-al-", "")}-reschedule`,
            createdAt: `${addDays(date, -3)}T16:40:00${UTC_OFFSET}`,
            createdBy: "Christina Roman",
            changes: { time: `${window.time} → ${startTime}` },
          });
        }

        if (cancelled) {
          actions.push({
            id: `act-${taskId}-cancel`,
            taskId,
            actionKindId: `ak-al-${lane.taskKindId.replace("task-kind-al-", "")}-cancel`,
            createdAt: `${addDays(date, -2)}T09:15:00${UTC_OFFSET}`,
            createdBy: "Christina Roman",
            changes: { status: "cancelled" },
          });
        }
      });

      workOrders.push({
        id: workOrderId,
        brandId: "brand-autolane",
        orderKindId: "order-kind-al-shifts",
        customerId: "cust-al-1",
        // Nobody in the shifts workflow sees a draft work order; a day either
        // has shifts on it or it does not.
        status: past ? "completed" : "active",
        taskIds,
        createdAt: `${addDays(date, -7)}T08:00:00${UTC_OFFSET}`,
        parameters: {},
        title: `Shifts — ${date}`,
        regionId: lane.regionId,
        startDate: date,
        endDate: date,
        externalId: shiftWorkOrderExternalId(lane.regionId, date),
        date,
      });
    }
  }

  return { workOrders, tasks, assignments, inventoryUses, actions };
}

/** What an imported schedule would add to a week: every shift the standing
 *  pattern calls for that is not already on the calendar. Unposted — these are
 *  drafts for a manager to staff, trim and post — and never in the past, since
 *  a shift cannot be posted to a day that is over. Pass `networkOperatorIds` to
 *  keep the proposal to the lanes those operators run. */
export function proposeShiftsForWeek(
  mondayISO: string,
  existing: Task[],
  networkOperatorIds?: ID[],
): Task[] {
  const slot = (kindId: ID, date: string, merchant: string, position: string) =>
    `${kindId}|${date}|${merchant}|${position}`;
  // A called-off shift leaves its slot open again.
  const taken = new Set(
    existing
      .filter((t) => t.status !== "cancelled")
      .map((t) =>
        slot(
          t.taskKindId,
          t.date ?? "",
          t.metadata?.[MERCHANT_DEF_ID] ?? "",
          t.metadata?.[POSITION_DEF_ID] ?? "",
        ),
      ),
  );

  const drafts: Task[] = [];
  for (const lane of LANES) {
    if (networkOperatorIds && !networkOperatorIds.includes(lane.networkOperatorId)) continue;
    const regionSlug = lane.regionId.replace("region-", "");

    weekDates(mondayISO).forEach((date, dayIndex) => {
      if (date < TODAY) return;
      lane.pattern(date).forEach(([merchant, position], i) => {
        if (taken.has(slot(lane.taskKindId, date, merchant, position))) return;
        const window = POSITION_WINDOW[position];
        drafts.push({
          id: `draft-shift-${regionSlug}-${date}-${i + 1}`,
          workOrderId: `wo-shift-${regionSlug}-${date}`,
          taskKindId: lane.taskKindId,
          networkOperatorId: lane.networkOperatorId,
          fieldOperatorId: null,
          status: "not_started",
          location: lane.location(merchant),
          scheduledAt: scheduledAt(date, window.time),
          completedAt: null,
          assignedInventoryIds: lane.usesVehicle
            ? [MODEL_Y_ITEM_IDS[(dayIndex * 3 + i) % MODEL_Y_ITEM_IDS.length]]
            : [],
          notes: null,
          name: position,
          metadata: { [MERCHANT_DEF_ID]: merchant, [POSITION_DEF_ID]: position },
          date,
          time: window.time,
          durationMinutes: window.durationMinutes,
          timeZone: TIME_ZONE,
        });
      });
    });
  }
  return drafts;
}

const built = buildShiftData();

export const shiftWorkOrders: WorkOrder[] = built.workOrders;
export const shiftTasks: Task[] = built.tasks;
export const shiftAssignments: TaskAssignment[] = built.assignments;
export const shiftInventoryUses: InventoryUse[] = built.inventoryUses;
export const shiftActions: Action[] = built.actions;

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export const shiftTaskKinds = taskKinds.filter((k) => k.taskType === "shift");

export function isShiftTaskKind(taskKindId: ID): boolean {
  return shiftTaskKinds.some((k) => k.id === taskKindId);
}

/** The region a shift belongs to, via its kind. Shift kinds are region-scoped:
 *  a Dispatch shift only exists in the dispatch region. */
export function regionIdForShift(task: Task): ID | undefined {
  return shiftTaskKinds.find((k) => k.id === task.taskKindId)?.regionId;
}

/** The regions an NO actually runs — where it is the live BRNO, not merely one
 *  of the operators listed against the region. */
export function liveRegionIdsForNetworkOperator(networkOperatorId: ID): ID[] {
  return regions
    .filter((r) => r.liveNetworkOperatorId === networkOperatorId)
    .map((r) => r.id);
}

export interface ShiftRange {
  /** Inclusive, yyyy-mm-dd. */
  from?: string;
  /** Inclusive, yyyy-mm-dd. */
  to?: string;
}

function inRange(task: Task, range?: ShiftRange): boolean {
  if (!range || !task.date) return true;
  if (range.from && task.date < range.from) return false;
  if (range.to && task.date > range.to) return false;
  return true;
}

function byDateThenTime(a: Task, b: Task): number {
  if (a.date !== b.date) return (a.date ?? "").localeCompare(b.date ?? "");
  return a.scheduledAt.localeCompare(b.scheduledAt);
}

/** Brand view: every shift the brand has, across all of its regions. */
export function shiftsForBrand(brandId: ID, range?: ShiftRange): Task[] {
  // Ownership runs through the work order: the brand owns the day, the day
  // owns the shifts. No region filter — the brand sees every region at once.
  const brandWorkOrderIds = new Set(
    shiftWorkOrders.filter((w) => w.brandId === brandId).map((w) => w.id),
  );
  return shiftTasks
    .filter((t) => brandWorkOrderIds.has(t.workOrderId) && isShiftTaskKind(t.taskKindId))
    .filter((t) => inRange(t, range))
    .sort(byDateThenTime);
}

/** NO view: the same tasks, narrowed to the regions this NO is live in. */
export function shiftsForNetworkOperator(networkOperatorId: ID, range?: ShiftRange): Task[] {
  const regionIds = new Set(liveRegionIdsForNetworkOperator(networkOperatorId));
  return shiftTasks
    .filter((t) => {
      const regionId = regionIdForShift(t);
      return regionId != null && regionIds.has(regionId);
    })
    .filter((t) => inRange(t, range))
    .sort(byDateThenTime);
}

export function shiftsForRegion(regionId: ID, range?: ShiftRange): Task[] {
  return shiftTasks
    .filter((t) => regionIdForShift(t) === regionId)
    .filter((t) => inRange(t, range))
    .sort(byDateThenTime);
}

export function activeAssignmentForTask(taskId: ID): TaskAssignment | undefined {
  return shiftAssignments.find((a) => a.taskId === taskId && a.active);
}

export function metadataValue(task: Task, definitionId: ID): string | undefined {
  return task.metadata?.[definitionId];
}

/** What the grid puts on the block. Falls back to the kind for a task with no
 *  Position, which the importer can produce. */
export function shiftDisplayName(task: Task): string {
  if (task.name) return task.name;
  return shiftTaskKinds.find((k) => k.id === task.taskKindId)?.name ?? "Shift";
}

export interface ShiftCounts {
  total: number;
  assigned: number;
  unassigned: number;
  cancelled: number;
}

/** Cancelled shifts are counted apart rather than folded into `unassigned` —
 *  a called-off shift is not a hole that needs filling. */
export function shiftCounts(tasks: Task[]): ShiftCounts {
  const live = tasks.filter((t) => t.status !== "cancelled");
  const assigned = live.filter((t) => t.fieldOperatorId != null).length;
  return {
    total: live.length,
    assigned,
    unassigned: live.length - assigned,
    cancelled: tasks.length - live.length,
  };
}

export interface ShiftRow {
  /** The rank-1 metadata value, e.g. a merchant name. */
  value: string;
  tasks: Task[];
}

/** The grid's rows. Order comes from the definition's `values`, not from the
 *  data, so an empty merchant still holds its place in the week. */
export function shiftRows(tasks: Task[], definitionId: ID = MERCHANT_DEF_ID): ShiftRow[] {
  const definition = shiftMetadataDefinitions.find((d) => d.id === definitionId);
  const order = definition?.values ?? [];
  const seen = new Set(order);
  const extras = tasks
    .map((t) => metadataValue(t, definitionId))
    .filter((v): v is string => v != null && !seen.has(v));
  return [...order, ...new Set(extras)].map((value) => ({
    value,
    tasks: tasks.filter((t) => metadataValue(t, definitionId) === value),
  }));
}
