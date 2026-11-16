// Shift scheduling — prototype data model + helpers.
//
// A Network Operator manager lays out a week of field shifts (time window + area
// + asset + job + assignee) on the NO "Manage Shifts" page. Brand users view the
// same schedule read-only. Shared data/logic lives here; each app supplies its
// own UI.

export interface Shift {
  id: string;
  date: string; // ISO yyyy-mm-dd (the day the shift falls on)
  start: string; // display time, e.g. "9:00 AM"
  end: string; // display time, e.g. "12:00 PM"
  // A shift covers a specific merchant coverage need for the day: a
  // (merchant, area) pair drawn from that day's merchant schedules.
  merchantId: string;
  areaId: string;
  assetId: string;
  jobId: string;
  assigneeId: string; // field-operator id, or "" when unassigned
}

export interface Option {
  id: string;
  label: string;
}

// --- Shift colors ----------------------------------------------------------
// Every distinct (area + assignee) combination gets its own color, so a glance
// at the week tells you which crew/area a shift belongs to (e.g. Cherrytown
// shifts read differently from Briarwood shifts).

export interface ShiftColor {
  bg: string; // chip / row-tint background
  text: string; // primary label
  sub: string; // accent (dot, ring, secondary text)
}

export const shiftColorPalette: ShiftColor[] = [
  { bg: "#dbeafe", text: "#1d4ed8", sub: "#3b82f6" }, // blue
  { bg: "#fce7f3", text: "#be185d", sub: "#ec4899" }, // pink
  { bg: "#fef3c7", text: "#b45309", sub: "#f59e0b" }, // amber
  { bg: "#ede9fe", text: "#6d28d9", sub: "#8b5cf6" }, // violet
  { bg: "#ccfbf1", text: "#0f766e", sub: "#14b8a6" }, // teal
  { bg: "#ffe4e6", text: "#be123c", sub: "#f43f5e" }, // rose
  { bg: "#e0e7ff", text: "#4338ca", sub: "#6366f1" }, // indigo
  { bg: "#d1fae5", text: "#047857", sub: "#10b981" }, // emerald
  { bg: "#ffedd5", text: "#c2410c", sub: "#f97316" }, // orange
  { bg: "#cffafe", text: "#0e7490", sub: "#06b6d4" }, // cyan
  { bg: "#ecfccb", text: "#4d7c0f", sub: "#84cc16" }, // lime
  { bg: "#fae8ff", text: "#a21caf", sub: "#d946ef" }, // fuchsia
];

// Neutral color for shifts with no area chosen yet.
export const neutralShiftColor: ShiftColor = { bg: "#f1f5f9", text: "#475569", sub: "#94a3b8" };

// A stable key for an (area, assignee) combination.
export function shiftComboKey(areaId: string, assigneeId: string): string {
  return `${areaId}|${assigneeId}`;
}

// Assign each distinct combination a palette color, in a stable order, so the
// mapping is deterministic for a given set of shifts.
export function buildShiftColorMap(shifts: Shift[]): Map<string, ShiftColor> {
  const keys = Array.from(
    new Set(shifts.filter((s) => s.areaId).map((s) => shiftComboKey(s.areaId, s.assigneeId))),
  ).sort();
  const map = new Map<string, ShiftColor>();
  keys.forEach((k, i) => map.set(k, shiftColorPalette[i % shiftColorPalette.length]));
  return map;
}

// --- Dropdown option seeds -------------------------------------------------
// Areas / assets / jobs are prototype seeds. Assignees are derived from the
// active operator's real field-operator roster in the page.

// Locations served by the operation. Cherrywood / SoCo are merchant (Tso)
// coverage areas; Autolane is the dispatch hub and Research Blvd a field site.
export const areaOptions: Option[] = [
  { id: "area-autolane", label: "Autolane" },
  { id: "area-cherrywood", label: "Cherrywood" },
  { id: "area-soco", label: "SoCo" },
  { id: "area-research-blvd", label: "Research Blvd" },
];

export const assetOptions: Option[] = [
  { id: "asset-my-606125", label: "Tesla Model Y — 606125" },
  { id: "asset-my-606332", label: "Tesla Model Y — 606332" },
  { id: "asset-my-606472", label: "Tesla Model Y — 606472" },
  { id: "asset-my-606732", label: "Tesla Model Y — 606732" },
  { id: "asset-my-697036", label: "Tesla Model Y — 697036" },
  { id: "asset-my-699757", label: "Tesla Model Y — 699757" },
  { id: "asset-my-700581", label: "Tesla Model Y — 700581" },
  { id: "asset-my-700910", label: "Tesla Model Y — 700910" },
  { id: "asset-my-700982", label: "Tesla Model Y — 700982" },
];

// The job (role) a shift is worked in. Ids are referenced by the constants
// below — see SUPERVISOR_JOB_ID and friends.
export const jobOptions: Option[] = [
  { id: "job-supervisor", label: "Supervisor" },
  { id: "job-dispatcher", label: "Dispatcher" },
  { id: "job-trainee", label: "Trainee" },
  { id: "job-timeoff", label: "Time off" },
];

// Quarter-hour time options from 6:00 AM to 11:45 PM (shifts run late and some
// blocks end on the quarter hour, e.g. 11:45 PM).
export const timeOptions: string[] = (() => {
  const out: string[] = [];
  for (let mins = 6 * 60; mins <= 23 * 60 + 45; mins += 15) {
    const h24 = Math.floor(mins / 60);
    const m = mins % 60;
    const period = h24 < 12 ? "AM" : "PM";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    out.push(`${h12}:${m.toString().padStart(2, "0")} ${period}`);
  }
  return out;
})();

// --- Overlap layout --------------------------------------------------------
// Lays a day's shifts out like a calendar: shifts that overlap in time are
// split into side-by-side columns, while a shift that overlaps nothing spans
// the full width.

export function parseTimeToMinutes(label: string): number {
  const m = label.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return 0;
  let h = parseInt(m[1], 10) % 12;
  if (/pm/i.test(m[3])) h += 12;
  return h * 60 + parseInt(m[2], 10);
}

// Inverse of parseTimeToMinutes: minutes-from-midnight → "9:00 AM".
export function formatMinutes(min: number): string {
  const h24 = Math.floor(min / 60);
  const m = min % 60;
  const period = h24 < 12 ? "AM" : "PM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

// A cluster is a group of transitively-overlapping shifts, split into the
// minimum number of columns needed so no two shifts in a column overlap.
export interface ShiftCluster {
  columns: Shift[][]; // columns[c] = shifts in column c, in time order
}

// How wide a cluster may spread in the roomier "standard" calendar view. Past
// this, concurrent blocks stack vertically rather than slicing thinner, so each
// one keeps enough width to read.
export const STANDARD_VIEW_MAX_COLUMNS = 2;

// `maxColumns` caps how wide a cluster may spread. Once the cap is reached,
// further overlapping shifts stack vertically inside an existing column instead
// of splitting it narrower — which is what a roomier calendar wants, since a
// full-width block can show its times and assignee where a sliver can't.
// Unset, the layout splits as far as it needs to (the tightest view).
export function layoutDayShifts(
  dayShifts: Shift[],
  maxColumns: number = Number.POSITIVE_INFINITY,
): ShiftCluster[] {
  const items = dayShifts
    .map((s) => ({ s, start: parseTimeToMinutes(s.start), end: parseTimeToMinutes(s.end) }))
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const clusters: ShiftCluster[] = [];
  let current: typeof items = [];
  let clusterEnd = Number.NEGATIVE_INFINITY;

  const flush = () => {
    if (current.length === 0) return;
    // Greedy first-fit column packing within the cluster.
    const cols: { end: number; shifts: Shift[] }[] = [];
    for (const it of current) {
      const col = cols.find((c) => it.start >= c.end); // no overlap with column's last shift
      if (col) {
        col.shifts.push(it.s);
        col.end = it.end;
      } else if (cols.length < maxColumns) {
        cols.push({ end: it.end, shifts: [it.s] });
      } else {
        // At the cap: stack into the column that frees up soonest. Items are
        // walked in start order, so each column stays in time order.
        const target = cols.reduce((a, b) => (b.end < a.end ? b : a));
        target.shifts.push(it.s);
        target.end = Math.max(target.end, it.end);
      }
    }
    clusters.push({ columns: cols.map((c) => c.shifts) });
    current = [];
  };

  for (const it of items) {
    if (current.length > 0 && it.start >= clusterEnd) {
      flush();
      clusterEnd = Number.NEGATIVE_INFINITY;
    }
    current.push(it);
    clusterEnd = Math.max(clusterEnd, it.end);
  }
  flush();
  return clusters;
}

// --- Week helpers ----------------------------------------------------------

export const WEEKDAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Index (within a Mon-start week) of the first weekend day.
export const SATURDAY_INDEX = 5;

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d
    .getDate()
    .toString()
    .padStart(2, "0")}`;
}

// Monday (local) of the week containing `d`.
function mondayOf(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = copy.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return toISODate(dt);
}

// The seven ISO dates (Mon–Sun) of the week starting `mondayISO`.
export function weekDates(mondayISO: string): string[] {
  return [0, 1, 2, 3, 4, 5, 6].map((n) => addDays(mondayISO, n));
}

export function formatDayNumber(iso: string): string {
  return String(Number(iso.split("-")[2]));
}

export function formatShortDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatRange(mondayISO: string): string {
  const [y, m, d] = mondayISO.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(y, m - 1, d + 6);
  const fmt = (dt: Date) => dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

// Period options: previous week + current + next three, anchored to today.
export interface WeekOption {
  mondayISO: string;
  label: string;
}

// The Monday of the week containing today — the week the seeded schedule is
// anchored to. Derived rather than hardcoded so nothing drifts when the period
// range changes.
export function currentMondayISO(): string {
  return toISODate(mondayOf(new Date()));
}

// Weeks offered in the period selector and listed on the Shifts overview:
// finished weeks behind, the current week, and a couple ahead to plan into.
export function buildWeekOptions(): WeekOption[] {
  const baseISO = currentMondayISO();
  return [-3, -2, -1, 0, 1, 2].map((offset) => {
    const mondayISO = addDays(baseISO, offset * 7);
    return { mondayISO, label: formatRange(mondayISO) };
  });
}

// --- Job ids ---------------------------------------------------------------
// Referenced by the summary + generator, so keep them in one place.

export const SUPERVISOR_JOB_ID = "job-supervisor";
export const DISPATCHER_JOB_ID = "job-dispatcher";
export const TRAINEE_JOB_ID = "job-trainee";
export const TIME_OFF_JOB_ID = "job-timeoff";

// Autolane is the dispatch hub: dispatch shifts are staffed there, with no
// merchant attached.
export const DISPATCH_AREA_ID = "area-autolane";

// --- Time-off conflicts ----------------------------------------------------
// Someone booked to work during their own time off. The time-off block and the
// shift have to be the same person, on the same day, overlapping in time.

export interface TimeOffConflict {
  timeOffId: string;
  shiftId: string;
  assigneeId: string;
  date: string;
  start: string; // the overlapping window, in display time
  end: string;
}

export function findTimeOffConflicts(days: string[], shifts: Shift[]): TimeOffConflict[] {
  const inWeek = shifts.filter((s) => days.includes(s.date));
  // Unassigned time off can't clash with anyone.
  const timeOff = inWeek.filter((s) => s.jobId === TIME_OFF_JOB_ID && s.assigneeId);
  const worked = inWeek.filter((s) => s.jobId !== TIME_OFF_JOB_ID && s.assigneeId);

  const conflicts: TimeOffConflict[] = [];
  for (const off of timeOff) {
    const offStart = parseTimeToMinutes(off.start);
    const offEnd = parseTimeToMinutes(off.end);
    for (const shift of worked) {
      if (shift.date !== off.date || shift.assigneeId !== off.assigneeId) continue;
      const start = Math.max(offStart, parseTimeToMinutes(shift.start));
      const end = Math.min(offEnd, parseTimeToMinutes(shift.end));
      if (end <= start) continue; // touching end-to-end is not an overlap
      conflicts.push({
        timeOffId: off.id,
        shiftId: shift.id,
        assigneeId: off.assigneeId,
        date: off.date,
        start: formatMinutes(start),
        end: formatMinutes(end),
      });
    }
  }
  return conflicts;
}

// --- Week summary ----------------------------------------------------------
// Headline numbers for a week, shown on the shift planner's right panel. Each
// count is a link target into the table editor's filtered views.

// Assumed blended labour rate, in dollars per hour.
export const LABOR_RATE_PER_HOUR = 45;

export function shiftHours(s: Shift): number {
  const mins = parseTimeToMinutes(s.end) - parseTimeToMinutes(s.start);
  return mins > 0 ? mins / 60 : 0;
}

export interface WeekSummary {
  totalShifts: number; // staffed shifts (time off excluded)
  supervisorShifts: number;
  dispatchShifts: number;
  merchantAreas: number; // distinct merchant + area pairs covered
  totalHours: number;
  totalCost: number;
  coverageGaps: number;
  unassignedShifts: number; // staffed shifts with nobody on them yet
  timeOffConflicts: number; // people booked to work during their own time off
}

export function summarizeWeek(
  days: string[],
  shifts: Shift[],
  schedules: MerchantSchedule[],
): WeekSummary {
  const inWeek = shifts.filter((s) => days.includes(s.date));
  const staffed = inWeek.filter((s) => s.jobId !== TIME_OFF_JOB_ID);
  const totalHours = staffed.reduce((sum, s) => sum + shiftHours(s), 0);
  const areas = new Set(
    staffed.filter((s) => s.merchantId && s.areaId).map((s) => coverageNeedKey(s.merchantId, s.areaId)),
  );
  return {
    totalShifts: staffed.length,
    supervisorShifts: staffed.filter((s) => s.jobId === SUPERVISOR_JOB_ID).length,
    dispatchShifts: staffed.filter((s) => s.jobId === DISPATCHER_JOB_ID).length,
    merchantAreas: areas.size,
    totalHours,
    totalCost: totalHours * LABOR_RATE_PER_HOUR,
    coverageGaps: days.reduce((n, d) => n + coverageGapsForDay(d, shifts, schedules).length, 0),
    // Time off is excluded: a time-off block with no name isn't unstaffed work.
    unassignedShifts: staffed.filter((s) => !s.assigneeId).length,
    timeOffConflicts: findTimeOffConflicts(days, shifts).length,
  };
}

// --- Seed shifts -----------------------------------------------------------
// A real week of shifts (Mon–Sun of the current week). Every shift belongs to
// the single operating merchant, Tso, across four locations; "Sup" (AM/PM/Peak)
// roles map to Supervisor and "Dispatch" to Dispatcher. Two gray blocks are
// time off (no merchant/area).

// A couple of seed shifts are held back from the working shift list (but still
// counted when deriving the merchant coverage windows below), so the week opens
// with a couple of uncovered coverage gaps that demonstrate the warning rows:
//   shift-seed-1  — Mon, Tso · Cherrywood, 11:00 AM–2:00 PM
//   shift-seed-17 — Wed, Tso · SoCo, 11:00 AM–2:00 PM
const SEED_GAP_SHIFT_IDS = new Set(["shift-seed-1", "shift-seed-17"]);

export function buildSeedShifts(): Shift[] {
  return buildAllSeedShifts().filter((s) => !SEED_GAP_SHIFT_IDS.has(s.id));
}

// The complete seeded week, before any records are held back. Used to derive
// the merchant coverage windows, so those windows keep requiring the held-back
// shifts' coverage — which is what surfaces the seeded gaps.
function buildAllSeedShifts(): Shift[] {
  const mon = toISODate(mondayOf(new Date()));
  const day = (n: number) => addDays(mon, n);

  const TSO = "merch-tso";
  const AUTO = "area-autolane";
  const CHER = "area-cherrywood";
  const SOCO = "area-soco";
  const RES = "area-research-blvd";
  const SUP = "job-supervisor"; // Sup AM / Sup PM / Sup Peak
  const DIS = "job-dispatcher"; // Dispatch AM / Dispatch PM
  const OFF = "job-timeoff";

  // Assignees — see fieldOperators for network operator "no-brickcity".
  const PAT = "fo-tso-1", BRY = "fo-tso-2", MIC = "fo-tso-3", MUR = "fo-tso-4";
  const GR3 = "fo-tso-5", PES = "fo-tso-6", PAU = "fo-tso-7", CHR = "fo-tso-8";
  const JOS = "fo-tso-9", RIN = "fo-tso-10", XAV = "fo-tso-11", GRJ = "fo-tso-12";

  // [dayIndex, start, end, jobId, merchantId, areaId, assigneeId]
  const rows: [number, string, string, string, string, string, string][] = [
    // Monday
    [0, "10:00 AM", "2:30 PM", DIS, "", AUTO, PAT],
    [0, "11:00 AM", "2:00 PM", SUP, TSO, CHER, MUR],
    [0, "11:00 AM", "2:00 PM", SUP, TSO, SOCO, GR3],
    [0, "4:00 PM", "9:30 PM", DIS, "", AUTO, BRY],
    [0, "5:00 PM", "9:00 PM", SUP, TSO, CHER, MUR],
    [0, "5:00 PM", "9:00 PM", SUP, TSO, SOCO, GR3],
    // Tuesday
    [1, "10:00 AM", "2:30 PM", DIS, "", AUTO, BRY],
    [1, "11:00 AM", "2:00 PM", SUP, TSO, CHER, PES],
    [1, "11:00 AM", "2:00 PM", SUP, TSO, SOCO, PAU],
    [1, "4:00 PM", "9:30 PM", DIS, TSO, CHER, MIC],
    [1, "5:00 PM", "9:00 PM", SUP, TSO, CHER, CHR],
    [1, "5:00 PM", "9:00 PM", SUP, TSO, CHER, JOS],
    [1, "5:00 PM", "9:00 PM", SUP, TSO, SOCO, RIN],
    [1, "5:00 PM", "11:45 PM", OFF, "", "", MUR],
    [1, "5:30 PM", "8:30 PM", SUP, TSO, CHER, PES],
    // Wednesday
    [2, "10:00 AM", "2:30 PM", DIS, "", AUTO, MIC],
    [2, "11:00 AM", "2:00 PM", SUP, TSO, CHER, MUR],
    [2, "11:00 AM", "2:00 PM", SUP, TSO, SOCO, GR3],
    [2, "4:00 PM", "9:30 PM", DIS, "", AUTO, PAT],
    [2, "5:00 PM", "10:00 PM", SUP, TSO, CHER, CHR],
    [2, "5:00 PM", "10:00 PM", SUP, "", RES, MUR],
    [2, "5:00 PM", "10:00 PM", SUP, TSO, SOCO, GR3],
    [2, "5:00 PM", "10:00 PM", SUP, TSO, SOCO, RIN],
    [2, "6:30 PM", "9:30 PM", SUP, TSO, SOCO, PAU],
    // Thursday
    [3, "10:00 AM", "2:30 PM", DIS, "", AUTO, PAT],
    [3, "11:00 AM", "2:00 PM", SUP, TSO, CHER, MUR],
    [3, "11:00 AM", "2:00 PM", SUP, TSO, SOCO, GR3],
    [3, "4:00 PM", "10:30 PM", DIS, TSO, CHER, MIC],
    [3, "5:00 PM", "10:00 PM", SUP, TSO, CHER, CHR],
    [3, "5:00 PM", "10:00 PM", SUP, "", RES, MUR],
    [3, "5:00 PM", "10:00 PM", SUP, TSO, SOCO, GR3],
    [3, "6:30 PM", "9:30 PM", SUP, TSO, SOCO, PAU],
    [3, "6:30 PM", "9:30 PM", SUP, TSO, CHER, RIN],
    // Friday
    [4, "10:00 AM", "2:30 PM", DIS, "", AUTO, MIC],
    [4, "11:00 AM", "2:00 PM", SUP, TSO, CHER, MUR],
    [4, "11:00 AM", "2:00 PM", SUP, TSO, SOCO, GR3],
    [4, "4:00 PM", "10:30 PM", DIS, "", AUTO, PAT],
    [4, "5:00 PM", "10:00 PM", SUP, TSO, CHER, PES],
    [4, "5:00 PM", "10:00 PM", SUP, "", RES, GR3],
    [4, "5:00 PM", "10:00 PM", SUP, TSO, SOCO, PAU],
    [4, "5:00 PM", "10:00 PM", SUP, TSO, CHER, RIN],
    [4, "5:30 PM", "10:30 PM", SUP, TSO, SOCO, JOS],
    [4, "6:30 PM", "9:30 PM", SUP, TSO, SOCO, CHR],
    [4, "6:30 PM", "9:30 PM", SUP, TSO, CHER, MUR],
    [4, "6:30 PM", "9:30 PM", SUP, TSO, SOCO, XAV],
    // Saturday
    [5, "4:00 PM", "10:30 PM", DIS, "", AUTO, PAT],
    [5, "5:00 PM", "9:00 PM", SUP, TSO, CHER, MUR],
    [5, "5:00 PM", "10:00 PM", SUP, TSO, CHER, PES],
    [5, "5:00 PM", "10:00 PM", SUP, "", RES, GR3],
    [5, "5:30 PM", "10:30 PM", SUP, TSO, SOCO, PAU],
    [5, "6:30 PM", "9:30 PM", SUP, TSO, SOCO, JOS],
    [5, "6:30 PM", "9:30 PM", SUP, TSO, CHER, XAV],
    // Sunday
    [6, "11:00 AM", "2:00 PM", SUP, TSO, CHER, PES],
    [6, "3:00 PM", "11:45 PM", OFF, "", "", MUR],
    [6, "4:00 PM", "10:30 PM", DIS, TSO, CHER, MIC],
    [6, "5:00 PM", "10:00 PM", SUP, TSO, CHER, PES],
    [6, "5:00 PM", "10:00 PM", SUP, "", RES, GR3],
    [6, "5:00 PM", "10:00 PM", SUP, TSO, SOCO, PAU],
    [6, "5:00 PM", "10:00 PM", SUP, TSO, CHER, RIN],
    [6, "5:00 PM", "10:00 PM", SUP, TSO, SOCO, XAV],
    [6, "5:30 PM", "8:30 PM", SUP, TSO, SOCO, GRJ],
    [6, "5:30 PM", "8:30 PM", SUP, TSO, CHER, JOS],
  ];

  let n = 0;
  return rows.map(([d, start, end, jobId, merchantId, areaId, assigneeId]) => ({
    id: `shift-seed-${n++}`,
    date: day(d),
    start,
    end,
    merchantId,
    areaId,
    assetId: "",
    jobId,
    assigneeId,
  }));
}

// --- Merchant schedules ----------------------------------------------------
// A merchant needs a presence at an area for a time window each day. Shifts in
// that area are expected to cover the window; uncovered sub-ranges surface as
// coverage gaps in the schedule.

export interface Merchant {
  id: string;
  name: string;
}

export const merchants: Merchant[] = [
  { id: "merch-tso", name: "Tso" },
];

export function getMerchant(id: string): Merchant | undefined {
  return merchants.find((m) => m.id === id);
}

export interface MerchantSchedule {
  id: string;
  merchantId: string;
  areaId: string;
  date: string; // ISO yyyy-mm-dd
  start: string; // display time, e.g. "9:00 AM"
  end: string; // display time, e.g. "6:00 PM"
}

// A merchant coverage need is a (merchant, area) pair. A shift's Area field
// picks one of the day's needs, so these two helpers encode/parse the combined
// value used by that dropdown.
export function coverageNeedKey(merchantId: string, areaId: string): string {
  return `${merchantId}__${areaId}`;
}

export function parseCoverageNeedKey(key: string): { merchantId: string; areaId: string } {
  const [merchantId = "", areaId = ""] = key.split("__");
  return { merchantId, areaId };
}

// The distinct merchant coverage needs (merchant + area) scheduled for a day,
// as dropdown options — this is what a shift's Area field offers.
export function coverageNeedOptionsForDay(dayISO: string, schedules: MerchantSchedule[]): Option[] {
  const seen = new Map<string, Option>();
  for (const s of schedules) {
    if (s.date !== dayISO || !s.merchantId || !s.areaId) continue;
    const key = coverageNeedKey(s.merchantId, s.areaId);
    if (seen.has(key)) continue;
    const merchant = getMerchant(s.merchantId)?.name ?? s.merchantId;
    const area = areaOptions.find((a) => a.id === s.areaId)?.label ?? s.areaId;
    seen.set(key, { id: key, label: `${merchant} — ${area}` });
  }
  return Array.from(seen.values());
}

// Coverage needs are derived from the seed shifts: for each day + merchant +
// area, the staffed windows are merged into contiguous blocks. Each block is a
// coverage need the shifts fully cover, so the seed week starts gap-free (gaps
// surface live if a manager removes or shortens a shift).
export function buildSeedMerchantSchedules(): MerchantSchedule[] {
  const byKey = new Map<string, Shift[]>();
  for (const s of buildAllSeedShifts()) {
    if (!s.merchantId || !s.areaId) continue; // skip time off
    const key = `${s.date}|${s.merchantId}|${s.areaId}`;
    let group = byKey.get(key);
    if (!group) {
      group = [];
      byKey.set(key, group);
    }
    group.push(s);
  }

  const out: MerchantSchedule[] = [];
  let n = 0;
  for (const [key, group] of byKey) {
    const [date, merchantId, areaId] = key.split("|");
    const intervals = group
      .map((s) => [parseTimeToMinutes(s.start), parseTimeToMinutes(s.end)] as [number, number])
      .sort((a, b) => a[0] - b[0]);
    let [curStart, curEnd] = intervals[0];
    const flush = () => {
      out.push({ id: `msched-seed-${n++}`, merchantId, areaId, date, start: formatMinutes(curStart), end: formatMinutes(curEnd) });
    };
    for (let i = 1; i < intervals.length; i++) {
      const [s, e] = intervals[i];
      if (s <= curEnd) {
        curEnd = Math.max(curEnd, e); // overlapping / adjacent → extend
      } else {
        flush();
        curStart = s;
        curEnd = e;
      }
    }
    flush();
  }
  return out;
}

// --- Coverage gaps ---------------------------------------------------------
// A gap is a sub-range of a merchant's window (in its area) that no shift covers.

export interface CoverageGap {
  id: string;
  merchantId: string;
  areaId: string;
  startMin: number;
  endMin: number;
  start: string; // display time
  end: string; // display time
}

export function coverageGapsForDay(
  dayISO: string,
  allShifts: Shift[],
  schedules: MerchantSchedule[],
): CoverageGap[] {
  const gaps: CoverageGap[] = [];

  for (const sched of schedules.filter((m) => m.date === dayISO)) {
    const windowStart = parseTimeToMinutes(sched.start);
    const windowEnd = parseTimeToMinutes(sched.end);
    if (windowEnd <= windowStart) continue;

    // Shift intervals covering this exact need (same merchant + area), clamped
    // to the merchant window.
    const intervals = allShifts
      .filter((s) => s.date === dayISO && s.merchantId === sched.merchantId && s.areaId === sched.areaId)
      .map((s) => [parseTimeToMinutes(s.start), parseTimeToMinutes(s.end)] as const)
      .filter(([s, e]) => e > windowStart && s < windowEnd)
      .map(([s, e]) => [Math.max(s, windowStart), Math.min(e, windowEnd)] as const)
      .sort((a, b) => a[0] - b[0]);

    const pushGap = (startMin: number, endMin: number) => {
      gaps.push({
        id: `${sched.id}-${startMin}-${endMin}`,
        merchantId: sched.merchantId,
        areaId: sched.areaId,
        startMin,
        endMin,
        start: formatMinutes(startMin),
        end: formatMinutes(endMin),
      });
    };

    let cursor = windowStart;
    for (const [s, e] of intervals) {
      if (s > cursor) pushGap(cursor, s);
      cursor = Math.max(cursor, e);
      if (cursor >= windowEnd) break;
    }
    if (cursor < windowEnd) pushGap(cursor, windowEnd);
  }

  return gaps.sort((a, b) => a.startMin - b.startMin);
}

// --- Seeded history --------------------------------------------------------
// The Shifts overview lists a week per card, so the prototype opens with
// finished weeks behind the current one. Those earlier weeks reuse the same
// pattern of work, dated back and fully staffed — so they read as settled,
// gap-free schedules, while the current week keeps its two uncovered windows.

export const SEEDED_PAST_WEEKS = 2;

// Past weeks ran a lighter schedule: no Monday or Tuesday. Their coverage
// windows drop with them, so those weeks stay gap-free rather than reading as
// two days of missed coverage.
const HISTORY_SKIPPED_WEEKDAYS = [0, 1]; // 0 = Monday

// The week after the current one is seeded as an upcoming draft: the same
// pattern of work as the week before it, with the midday block dropped, so it
// reads as a lighter week still being planned.
export const SEEDED_AHEAD_WEEK = 1;

// Midday work is what finishes before the evening block starts: the
// 10:00 AM–2:30 PM Autolane dispatch run and the 11:00 AM–2:00 PM merchant
// cover. Everything from 4:00 PM on is evening work and stays.
const MIDDAY_ENDS_BY = "3:00 PM";
const isMidday = (record: { end: string }) =>
  parseTimeToMinutes(record.end) <= parseTimeToMinutes(MIDDAY_ENDS_BY);

export interface SeededSchedule {
  shifts: Shift[];
  schedules: MerchantSchedule[];
}

export function buildSeededSchedule(): SeededSchedule {
  const shifts: Shift[] = [...buildSeedShifts()];
  const schedules: MerchantSchedule[] = [...buildSeedMerchantSchedules()];

  const thisMonday = currentMondayISO();
  const skippedDates = new Set(
    HISTORY_SKIPPED_WEEKDAYS.flatMap((weekday) =>
      Array.from({ length: SEEDED_PAST_WEEKS }, (_, i) =>
        addDays(thisMonday, weekday - 7 * (i + 1)),
      ),
    ),
  );
  const kept = <T extends { date: string }>(record: T) => !skippedDates.has(record.date);

  for (let week = 1; week <= SEEDED_PAST_WEEKS; week++) {
    const back = -7 * week;
    // Past weeks use the complete seed, so nothing is left uncovered.
    for (const s of buildAllSeedShifts()) {
      const dated = { ...s, id: `${s.id}-w${week}`, date: addDays(s.date, back) };
      if (kept(dated)) shifts.push(dated);
    }
    for (const m of buildSeedMerchantSchedules()) {
      const dated = { ...m, id: `${m.id}-w${week}`, date: addDays(m.date, back) };
      if (kept(dated)) schedules.push(dated);
    }
  }

  // The upcoming week copies the same pattern with midday dropped. Its coverage
  // windows go too, so the week reads as a lighter plan rather than one with a
  // hole through the middle of every day.
  const ahead = 7 * SEEDED_AHEAD_WEEK;
  for (const s of buildAllSeedShifts()) {
    if (isMidday(s)) continue;
    shifts.push({ ...s, id: `${s.id}-ahead`, date: addDays(s.date, ahead) });
  }
  for (const m of buildSeedMerchantSchedules()) {
    if (isMidday(m)) continue;
    schedules.push({ ...m, id: `${m.id}-ahead`, date: addDays(m.date, ahead) });
  }

  return { shifts, schedules };
}

// The Mondays the prototype opens with a schedule for: the current week and the
// finished weeks behind it.
export function seededWeekMondays(): string[] {
  const current = currentMondayISO();
  const offsets = [
    0,
    ...Array.from({ length: SEEDED_PAST_WEEKS }, (_, i) => -(i + 1)),
    SEEDED_AHEAD_WEEK,
  ];
  return offsets.map((w) => addDays(current, w * 7));
}
