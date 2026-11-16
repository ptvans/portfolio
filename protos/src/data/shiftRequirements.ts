// Plain-text driven shift generation.
//
// A Network Operator manager writes the week's staffing requirements as a plain
// document (merchants + neighborhoods, the windows each needs staffed, and the
// employee roster), optionally attaching source files. Pressing Generate parses
// that document and lays out the week's shifts.
//
// In production the parse is an LLM call over the document + attachments; this
// prototype implements the same contract deterministically, so the demo behaves
// predictably and the document stays the single source of truth.

import { fieldOperators } from "./network";
import {
  areaOptions,
  buildSeedMerchantSchedules,
  buildSeedShifts,
  currentMondayISO,
  DISPATCH_AREA_ID,
  DISPATCHER_JOB_ID,
  formatMinutes,
  merchants,
  parseTimeToMinutes,
  SUPERVISOR_JOB_ID,
  TIME_OFF_JOB_ID,
  weekDates,
  type MerchantSchedule,
  type Shift,
} from "./shifts";

// --- Attachments -----------------------------------------------------------
// Files the manager attaches for the parse to draw on. The prototype records
// the file's identity only — it never reads the bytes.

export type AttachmentKind = "pdf" | "xls" | "doc" | "csv" | "img" | "file";

export interface RequirementsAttachment {
  id: string;
  name: string;
  kind: AttachmentKind;
}

export function attachmentKindFor(fileName: string): AttachmentKind {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (["xls", "xlsx", "numbers"].includes(ext)) return "xls";
  if (["csv", "tsv"].includes(ext)) return "csv";
  if (["doc", "docx", "pages", "txt", "md", "rtf"].includes(ext)) return "doc";
  if (["png", "jpg", "jpeg", "gif", "webp", "heic"].includes(ext)) return "img";
  return "file";
}

// --- The per-week document -------------------------------------------------

export interface RequirementsDoc {
  text: string;
  attachments: RequirementsAttachment[];
}

// The document's section headings, in one place so the editor's scaffold, the
// seeded document and the parser can't drift apart.
export const DOC_HEADINGS = {
  title: "Shift Requirements",
  merchants: "Merchants & Areas",
  employees: "Employees",
  supervisors: "Supervisors",
  dispatchers: "Dispatchers",
} as const;

// Typing into an empty document lays these headings out around the cursor, so a
// manager fills in a structure instead of facing a blank page. Split either side
// of where the typing goes — the first merchant/area block.
export const BLANK_DOC_BEFORE_CURSOR = `${DOC_HEADINGS.title}\n\n${DOC_HEADINGS.merchants}\n\n`;
export const BLANK_DOC_AFTER_CURSOR = `\n\n${DOC_HEADINGS.employees}\n\n${DOC_HEADINGS.supervisors}\n\n${DOC_HEADINGS.dispatchers}\n`;

// The seeded document is written out from the prototype's own seeded data — the
// merchant coverage windows plus the dispatch and all-merchant field blocks —
// so the document a manager opens always describes the schedule they are
// looking at, and pressing Generate reproduces it rather than replacing it with
// something different.

const SHORT_DAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Display times read as prose in the document: "5:00 PM" → "5:00 pm".
const lowerMeridiem = (t: string) => t.replace(/\s?(AM|PM)$/i, (m) => m.toLowerCase());

const areaLabelFor = (id: string) => areaOptions.find((a) => a.id === id)?.label ?? id;

// The most people on at once inside [from, to] — how many staff the window
// actually needs, which is what an "xN" suffix records.
function peakConcurrency(spans: [number, number][], from: number, to: number): number {
  const ticks: [number, number][] = [];
  for (const [s, e] of spans) {
    const a = Math.max(s, from);
    const b = Math.min(e, to);
    if (b > a) ticks.push([a, 1], [b, -1]);
  }
  // At an identical tick, count departures before arrivals.
  ticks.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  let open = 0;
  let peak = 0;
  for (const [, delta] of ticks) {
    open += delta;
    peak = Math.max(peak, open);
  }
  return peak;
}

// Merge spans into contiguous ranges (same rule the coverage windows use).
function mergeSpans(spans: [number, number][]): [number, number][] {
  const sorted = spans.filter(([s, e]) => e > s).sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [s, e] of sorted) {
    const last = merged[merged.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  }
  return merged;
}

// One "Mon: 11:00 am to 2:00 pm; 5:00 pm to 9:00 pm" line.
function dayLine(
  dayIndex: number,
  windows: [number, number][],
  staffing: [number, number][],
): string | null {
  if (windows.length === 0) return null;
  const segments = windows.map(([start, end]) => {
    const count = peakConcurrency(staffing, start, end);
    const suffix = count > 1 ? `, x${count}` : "";
    return `${lowerMeridiem(formatMinutes(start))} to ${lowerMeridiem(formatMinutes(end))}${suffix}`;
  });
  return `${SHORT_DAY[dayIndex]}: ${segments.join("; ")}`;
}

export function buildSeedRequirementsText(): string {
  const shifts = buildSeedShifts();
  const schedules = buildSeedMerchantSchedules();
  // The seeded schedule is anchored to the current week.
  const days = weekDates(currentMondayISO());
  const span = (s: { start: string; end: string }): [number, number] => [
    parseTimeToMinutes(s.start),
    parseTimeToMinutes(s.end),
  ];

  const sections: string[] = [DOC_HEADINGS.title, "", DOC_HEADINGS.merchants, ""];

  // --- Merchant coverage windows, one block per merchant + area -------------
  const merchantKeys = Array.from(
    new Set(schedules.filter((s) => s.merchantId && s.areaId).map((s) => `${s.merchantId}|${s.areaId}`)),
  );
  for (const key of merchantKeys) {
    const [merchantId, areaId] = key.split("|");
    const lines: string[] = [];
    days.forEach((dayISO, dayIndex) => {
      const windows = schedules
        .filter((s) => s.date === dayISO && s.merchantId === merchantId && s.areaId === areaId)
        .map(span);
      const staffing = shifts
        .filter((s) => s.date === dayISO && s.merchantId === merchantId && s.areaId === areaId)
        .map(span);
      const line = dayLine(dayIndex, mergeSpans(windows), staffing);
      if (line) lines.push(line);
    });
    if (lines.length === 0) continue;
    const name = merchants.find((m) => m.id === merchantId)?.name ?? merchantId;
    sections.push(`${name}, ${areaLabelFor(areaId)}`, ...lines, "");
  }

  // --- Merchant-less blocks: the dispatch hub and all-merchant field areas ---
  const plainAreaIds = Array.from(
    new Set(
      shifts
        .filter((s) => !s.merchantId && s.areaId && s.jobId !== TIME_OFF_JOB_ID)
        .map((s) => s.areaId),
    ),
  );
  // Field areas first, dispatch last, matching how the blocks read.
  plainAreaIds.sort((a, b) => Number(a === DISPATCH_AREA_ID) - Number(b === DISPATCH_AREA_ID));
  for (const areaId of plainAreaIds) {
    const lines: string[] = [];
    days.forEach((dayISO, dayIndex) => {
      const staffing = shifts
        .filter((s) => s.date === dayISO && !s.merchantId && s.areaId === areaId)
        .map(span);
      const line = dayLine(dayIndex, mergeSpans(staffing), staffing);
      if (line) lines.push(line);
    });
    if (lines.length === 0) continue;
    const header =
      areaId === DISPATCH_AREA_ID
        ? `Dispatch (${areaLabelFor(areaId)})`
        : `${areaLabelFor(areaId)} (All merchants)`;
    sections.push(header, ...lines, "");
  }

  // --- Employees, split by the role they work in the seeded week ------------
  const namesFor = (jobId: string) =>
    fieldOperators
      .filter((fo) => shifts.some((s) => s.jobId === jobId && s.assigneeId === fo.id))
      .map((fo) => fo.name);

  sections.push(DOC_HEADINGS.employees, "", DOC_HEADINGS.supervisors, ...namesFor(SUPERVISOR_JOB_ID), "");
  sections.push(DOC_HEADINGS.dispatchers, ...namesFor(DISPATCHER_JOB_ID));

  return sections.join("\n").trimEnd();
}

export function buildSeedRequirementsDoc(): RequirementsDoc {
  return {
    text: buildSeedRequirementsText(),
    attachments: [
      { id: "att-seed-1", name: "tso-coverage-targets.pdf", kind: "pdf" },
      { id: "att-seed-2", name: "availability-week.xlsx", kind: "xls" },
    ],
  };
}

// --- Parsing ---------------------------------------------------------------

// One staffed window drawn from a requirement line: "5:00 pm to 10:00 pm, x2".
interface Window {
  label: string; // "Morning" / "Afternoon" / "Peak", or a weekday
  start: string; // display time, e.g. "5:00 PM"
  end: string;
  count: number; // how many people on it (the "xN" suffix)
  // Weekday indexes (0 = Monday) this window applies to, or null for every day.
  // Set when the line is written day-scoped, e.g. "Mon: 5:00 pm to 9:00 pm".
  dayIndexes: number[] | null;
}

// A location block: its header plus the windows it needs staffed.
interface Block {
  merchantId: string; // "" for all-merchant / dispatch blocks
  areaId: string;
  isDispatch: boolean;
  windows: Window[];
  headerText: string; // as written, for error reporting
}

export interface ParsedRequirements {
  blocks: Block[];
  supervisors: string[]; // names, as written
  dispatchers: string[];
  // Header/roster lines the parse could not resolve, surfaced to the user so a
  // silent mis-parse never looks like a clean run.
  unresolved: string[];
}

const norm = (s: string) => s.trim().toLowerCase().replace(/[.,]+$/, "");

// "9:00 am" / "9 am" / "9:00" → "9:00 AM". Returns "" when unparseable.
function normalizeTime(raw: string): string {
  const m = raw.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!m) return "";
  const hour = parseInt(m[1], 10);
  if (hour < 1 || hour > 23) return "";
  const mins = m[2] ?? "00";
  const period = m[3] ? m[3].toUpperCase() : hour < 8 || hour === 12 ? "PM" : "AM";
  const h12 = hour > 12 ? hour - 12 : hour;
  return `${h12}:${mins} ${period}`;
}

// Match a written name against the roster, tolerating suffix/spacing drift.
function resolveName(name: string, roster: { id: string; label: string }[]): string {
  const n = norm(name);
  const exact = roster.find((r) => norm(r.label) === n);
  if (exact) return exact.id;
  const loose = roster.find((r) => {
    const l = norm(r.label).replace(/\./g, "");
    return l === n.replace(/\./g, "");
  });
  return loose?.id ?? "";
}

function resolveArea(name: string): string {
  const n = norm(name);
  const hit = areaOptions.find((a) => norm(a.label) === n);
  return hit?.id ?? "";
}

// "Tsos" should still find the merchant "Tso", so allow a prefix match either
// way once an exact match fails.
function resolveMerchant(name: string): string {
  const n = norm(name);
  const exact = merchants.find((m) => norm(m.name) === n);
  if (exact) return exact.id;
  const loose = merchants.find((m) => n.startsWith(norm(m.name)) || norm(m.name).startsWith(n));
  return loose?.id ?? "";
}

// Weekday names the day-scope prefix accepts, indexed Monday-first.
const DAY_TOKENS: Record<string, number> = {
  mon: 0, monday: 0,
  tue: 1, tues: 1, tuesday: 1,
  wed: 2, weds: 2, wednesday: 2,
  thu: 3, thur: 3, thurs: 3, thursday: 3,
  fri: 4, friday: 4,
  sat: 5, saturday: 5,
  sun: 6, sunday: 6,
};

// The text before a requirement line's colon, when it names days rather than a
// time-of-day label: "Mon", "Mon-Fri", "Sat & Sun", "Weekdays", "Daily".
// Returns null when it isn't a day scope, so labels fall through unchanged.
function parseDayScope(raw: string): number[] | null {
  const text = raw.trim().toLowerCase();
  if (!text) return null;
  if (text === "daily" || text === "every day") return [0, 1, 2, 3, 4, 5, 6];
  if (text === "weekdays") return [0, 1, 2, 3, 4];
  if (text === "weekends") return [5, 6];

  const out = new Set<number>();
  for (const part of text.split(/[,&]|\band\b/)) {
    const token = part.trim();
    if (!token) continue;
    const range = token.split(/\s*(?:-|–|—|through|to)\s*/);
    if (range.length === 2) {
      const from = DAY_TOKENS[range[0]];
      const to = DAY_TOKENS[range[1]];
      if (from === undefined || to === undefined) return null;
      // Walk forward, wrapping, so "Sat-Sun" and "Fri-Mon" both work.
      for (let i = from; ; i = (i + 1) % 7) {
        out.add(i);
        if (i === to) break;
      }
      continue;
    }
    const day = DAY_TOKENS[token];
    if (day === undefined) return null; // any unknown token disqualifies the whole prefix
    out.add(day);
  }
  return out.size > 0 ? Array.from(out).sort((a, b) => a - b) : null;
}

// A requirement line, either label-scoped and applying to every day —
//   "Afternoon: 4:00 pm to 10:00 pm, x2; Peak 5:00 pm to 8:30 pm"
// — or scoped to particular days:
//   "Mon: 11:00 am to 2:00 pm; 5:00 pm to 9:00 pm"
function parseWindows(line: string): Window[] {
  const out: Window[] = [];

  // A leading day scope applies to every segment on the line. Times contain
  // digits, so a digit-free prefix is the only thing worth testing.
  let dayIndexes: number[] | null = null;
  let body = line;
  const colon = line.indexOf(":");
  if (colon > 0 && !/\d/.test(line.slice(0, colon))) {
    const scope = parseDayScope(line.slice(0, colon));
    if (scope) {
      dayIndexes = scope;
      body = line.slice(colon + 1);
    }
  }

  for (const rawSegment of body.split(";")) {
    const segment = rawSegment.trim();
    if (!segment) continue;
    // Pull the times first; whatever precedes them is the label.
    const times = segment.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:to|–|-|—)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
    if (!times) continue;
    const start = normalizeTime(times[1]);
    const end = normalizeTime(times[2]);
    if (!start || !end) continue;
    const label = segment.slice(0, times.index ?? 0).replace(/[:,-]\s*$/, "").trim();
    const countMatch = segment.match(/\bx\s*(\d+)\b/i);
    out.push({
      label: label || "Shift",
      start,
      end,
      count: countMatch ? Math.max(1, parseInt(countMatch[1], 10)) : 1,
      dayIndexes,
    });
  }
  return out;
}

// "Merchants & Areas" is the heading the editor writes; the older
// "Merchants and Neighborhoods" wording still parses so existing documents keep
// working.
const SECTION_MERCHANTS = /^merchants?\b.*\b(?:areas?|neighbou?rhoods?)\s*$/i;
const SECTION_EMPLOYEES = /^employees?$/i;
const ROLE_SUPERVISORS = /^supervisors?:?$/i;
const ROLE_DISPATCHERS = /^dispatchers?:?$/i;
const DOC_TITLE = /^shift requirements$/i;

// Whether a line is one of the document's structural headings. The editor bolds
// these, so it uses the parser's own rules: a heading that renders plain is one
// the parse won't recognise either, which makes a typo visible as you write it.
export function isDocHeading(line: string): boolean {
  const text = line.trim();
  if (!text) return false;
  return (
    DOC_TITLE.test(text) ||
    SECTION_MERCHANTS.test(text) ||
    SECTION_EMPLOYEES.test(text) ||
    ROLE_SUPERVISORS.test(text) ||
    ROLE_DISPATCHERS.test(text)
  );
}

// A block header names a place, e.g. "Tsos, Cherrywood", "Research Blvd (All
// merchants)", "Dispatch (Autolane)". Returns null when it can't be resolved.
function parseBlockHeader(line: string): Block | null {
  const isDispatch = /^dispatch\b/i.test(line);
  // Text inside parentheses is a qualifier: the dispatch area, or "All merchants".
  const paren = line.match(/\(([^)]*)\)/);
  const qualifier = paren?.[1] ?? "";
  const head = line.replace(/\([^)]*\)/, "").trim();

  if (isDispatch) {
    const areaId = resolveArea(qualifier) || DISPATCH_AREA_ID;
    return { merchantId: "", areaId, isDispatch: true, windows: [], headerText: line };
  }

  // "Merchant, Area" — otherwise the whole head is an area (all merchants).
  const parts = head.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const merchantId = resolveMerchant(parts[0]);
    const areaId = resolveArea(parts.slice(1).join(", "));
    if (merchantId && areaId) {
      return { merchantId, areaId, isDispatch: false, windows: [], headerText: line };
    }
    return null;
  }
  const areaId = resolveArea(head);
  if (!areaId) return null;
  return { merchantId: "", areaId, isDispatch: false, windows: [], headerText: line };
}

export function parseRequirements(text: string): ParsedRequirements {
  const blocks: Block[] = [];
  const supervisors: string[] = [];
  const dispatchers: string[] = [];
  const unresolved: string[] = [];

  let section: "merchants" | "employees" = "merchants";
  let role: "supervisor" | "dispatcher" | null = null;
  let current: Block | null = null;

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || DOC_TITLE.test(line)) continue;

    if (SECTION_MERCHANTS.test(line)) {
      section = "merchants";
      current = null;
      continue;
    }
    if (SECTION_EMPLOYEES.test(line)) {
      section = "employees";
      current = null;
      continue;
    }

    if (section === "employees") {
      if (ROLE_SUPERVISORS.test(line)) {
        role = "supervisor";
      } else if (ROLE_DISPATCHERS.test(line)) {
        role = "dispatcher";
      } else if (role === "supervisor") {
        supervisors.push(line);
      } else if (role === "dispatcher") {
        dispatchers.push(line);
      } else {
        unresolved.push(line);
      }
      continue;
    }

    // Merchants section: a line carrying a time range extends the open block,
    // anything else starts a new one.
    const windows = parseWindows(line);
    if (windows.length > 0) {
      if (current) current.windows.push(...windows);
      else unresolved.push(line);
      continue;
    }

    const block = parseBlockHeader(line);
    if (block) {
      blocks.push(block);
      current = block;
    } else {
      unresolved.push(line);
      current = null;
    }
  }

  return { blocks: blocks.filter((b) => b.windows.length > 0), supervisors, dispatchers, unresolved };
}

// --- Generation ------------------------------------------------------------

export interface GenerateResult {
  shifts: Shift[];
  // The merchant coverage windows the document asks for. The document is the
  // requirement, so a Generate run restates the windows alongside the shifts
  // that staff them — otherwise a fresh schedule would read as full of gaps
  // against the previous week's windows.
  merchantSchedules: MerchantSchedule[];
  parsed: ParsedRequirements;
  // Roster names in the document that don't match a field operator.
  unknownNames: string[];
}

// Merge a block's windows into contiguous coverage ranges, so "5:00–10:00 pm x2
// plus a 6:30–9:30 pm peak" becomes one 5:00–10:00 pm requirement rather than
// three overlapping ones.
function mergeWindows(windows: Window[]): [number, number][] {
  const spans = windows
    .map((w) => [parseTimeToMinutes(w.start), parseTimeToMinutes(w.end)] as [number, number])
    .filter(([s, e]) => e > s)
    .sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [s, e] of spans) {
    const last = merged[merged.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  }
  return merged;
}

// Lay out one week of shifts from the document. Every day of `days` gets the
// full set of requirement windows; people are dealt round-robin from the
// document's roster so the load spreads instead of stacking on one person.
export function generateShiftsFromText(
  text: string,
  days: string[],
  roster: { id: string; label: string }[],
  idPrefix = "shift-gen",
): GenerateResult {
  const parsed = parseRequirements(text);
  const unknownNames: string[] = [];

  const toIds = (names: string[]) =>
    names
      .map((name) => {
        const id = resolveName(name, roster);
        if (!id) unknownNames.push(name);
        return id;
      })
      .filter(Boolean);

  const supervisorIds = toIds(parsed.supervisors);
  const dispatcherIds = toIds(parsed.dispatchers);

  // Independent rotation per role, advanced on every shift dealt.
  let supCursor = 0;
  let disCursor = 0;
  const nextAssignee = (isDispatch: boolean) => {
    const pool = isDispatch ? dispatcherIds : supervisorIds;
    if (pool.length === 0) return "";
    return isDispatch ? pool[disCursor++ % pool.length] : pool[supCursor++ % pool.length];
  };

  const shifts: Shift[] = [];
  const merchantSchedules: MerchantSchedule[] = [];
  let n = 0;
  let m = 0;
  for (const [dayIndex, date] of days.entries()) {
    for (const block of parsed.blocks) {
      // Day-scoped lines only apply to the days they name.
      const dayWindows = block.windows.filter(
        (w) => w.dayIndexes === null || w.dayIndexes.includes(dayIndex),
      );
      for (const win of dayWindows) {
        for (let i = 0; i < win.count; i++) {
          shifts.push({
            id: `${idPrefix}-${n++}`,
            date,
            start: win.start,
            end: win.end,
            merchantId: block.merchantId,
            areaId: block.areaId,
            assetId: "",
            jobId: block.isDispatch ? DISPATCHER_JOB_ID : SUPERVISOR_JOB_ID,
            assigneeId: nextAssignee(block.isDispatch),
          });
        }
      }

      // Only merchant-bearing blocks are coverage needs; dispatch and
      // all-merchant field blocks aren't tracked against a merchant window.
      if (!block.merchantId) continue;
      for (const [start, end] of mergeWindows(dayWindows)) {
        merchantSchedules.push({
          id: `${idPrefix}-sched-${m++}`,
          date,
          merchantId: block.merchantId,
          areaId: block.areaId,
          start: formatMinutes(start),
          end: formatMinutes(end),
        });
      }
    }
  }

  return { shifts, merchantSchedules, parsed, unknownNames };
}
