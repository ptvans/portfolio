// What an SOP did, grouped by run, for the Activity panel on the SOP page.
//
// Each entry is one thing a run did to one subject, typed the way the panel
// filters them: an alert raised, an action that changed a record or sent a
// message, a proposal held for a person, or a check that changed nothing.
//
// Most SOPs get their feed from their run history (the node-run logs in
// sops.ts). The Autolane shift-hours SOP runs four times a day and touches
// every open shift each time, so its feed is generated here from a table of
// shifts and what happened to each one, run by run.

import type { Sop, SopLogEntry, SopNode, SopRun } from "../types/domain";
import { sopNodeRuns, sopRuns } from "./sops";

export type SopActivityType = "alert" | "action" | "proposal" | "check";

export interface SopActivityEntry {
  id: string;
  at: string; // ISO
  type: SopActivityType;
  // What the entry is about: the task, step or record it acted on.
  subject: { label: string; to?: string };
  // What happened, in a sentence or three. May carry prefixed ids and Slack
  // tokens, which the page renders as chips.
  summary: string;
}

export interface SopActivityRun {
  id: string;
  label: string; // "Fallback run", "Week of Sep 8 – Sep 14"
  startedAt: string;
  endedAt: string;
  // The run's own page, when it has one.
  to?: string;
  // Still going (a run just started by hand).
  running?: boolean;
  // Newest first.
  entries: SopActivityEntry[];
}

// ---------------------------------------------------------------------------
// From run history
// ---------------------------------------------------------------------------

const ACTION_VERB = /\b(sent|posted|pinged|created|finalized|saved|added|updated|wrote|drafted the weekly)\b/i;
const PROPOSAL_VERB = /^(proposed|approved|plan opened|drafted)|suggested sop change|awaiting/i;

function typeFor(node: SopNode | undefined, log: SopLogEntry): SopActivityType {
  if (log.level === "error" || log.level === "warn") return "alert";
  if (node?.kind === "escalation") return "alert";
  if (node?.kind === "decision" || PROPOSAL_VERB.test(log.message)) return "proposal";
  if (ACTION_VERB.test(log.message)) return "action";
  return "check";
}

function fromRun(sop: Sop, run: SopRun): SopActivityRun {
  const to = `/internal-ops/sops/${sop.id}/runs/${run.id}`;
  const entries = sopNodeRuns
    .filter((nr) => nr.sopRunId === run.id)
    .flatMap((nr) => {
      const node = sop.nodes.find((n) => n.id === nr.nodeId);
      return nr.logs.map<SopActivityEntry>((log, i) => ({
        id: `${nr.id}-${i}`,
        at: log.at,
        type: typeFor(node, log),
        subject: { label: node?.title ?? "Run", to },
        summary: log.message,
      }));
    })
    .sort((a, b) => b.at.localeCompare(a.at));
  return {
    id: run.id,
    label: run.label,
    startedAt: entries.at(-1)?.at ?? run.startedAt,
    endedAt: entries[0]?.at ?? run.completedAt ?? run.startedAt,
    to,
    entries,
  };
}

// ---------------------------------------------------------------------------
// Autolane shift hours
// ---------------------------------------------------------------------------

const SHIFT_HOURS = "sop-autolane-shift-hours";

const UPDATE_HOURS = {
  sv: "actionkind_aa3bc192-cf3a-44af-8f21-ddb66cad8c27",
  dispatch: "actionkind_25cc658c-6a59-4bd2-8e1f-0cb1e29ca261",
};
const RANGE = { sv: "2.5–7.5", dispatch: "4–9.5" };
const KIND_LABEL = { sv: "Supervise Vehicle", dispatch: "Dispatch" };

// Runs, oldest first, at the UTC hours on the schedule. The Chicago hour
// (CDT, UTC−5 until Nov 1) decides the run type.
const RUNS = [
  { key: "r6", at: "2026-10-27T05:01:04Z" },
  { key: "r5", at: "2026-10-27T16:02:10Z" },
  { key: "r4", at: "2026-10-27T20:01:31Z" },
  { key: "r3", at: "2026-10-28T04:01:12Z" },
  { key: "r2", at: "2026-10-28T05:01:08Z" },
  { key: "r1", at: "2026-10-28T16:02:03Z" },
] as const;
type RunKey = (typeof RUNS)[number]["key"];

// What happened to a shift's hours: already final before the window, written
// by a run, missing a Clock Out (reported by a 16:00 UTC run), or held over an
// unclear note.
type Outcome =
  | { kind: "final"; hours: number }
  | { kind: "written"; run: RunKey; clockIn: string; clockOut: string }
  | { kind: "missing"; clockIn: string; alertRun: RunKey }
  | { kind: "unclear"; clockIn: string; note: string; suggestedEnd: string; proposalRun: RunKey; alertRun: RunKey }
  | { kind: "open"; clockIn?: string };

interface Shift {
  key: string;
  kind: "sv" | "dispatch";
  date: string; // Chicago calendar date
  start: string; // "16:00" Chicago
  person: string;
  outcome: Outcome;
}

const SHIFTS: Shift[] = [
  { key: "w", kind: "sv", date: "2026-10-24", start: "16:30", person: "Devon Pike", outcome: { kind: "final", hours: 4.2 } },
  { key: "a", kind: "sv", date: "2026-10-24", start: "16:00", person: "Lena Ortiz", outcome: { kind: "final", hours: 5.5 } },
  { key: "c", kind: "dispatch", date: "2026-10-24", start: "14:15", person: "Tess Albright", outcome: { kind: "final", hours: 7.9 } },
  { key: "b", kind: "dispatch", date: "2026-10-24", start: "09:30", person: "Marco Diaz", outcome: { kind: "final", hours: 8.1 } },
  { key: "u", kind: "sv", date: "2026-10-25", start: "17:00", person: "Kai Moreno", outcome: { kind: "final", hours: 4.7 } },
  { key: "e", kind: "sv", date: "2026-10-25", start: "16:30", person: "Devon Pike", outcome: { kind: "final", hours: 4.4 } },
  { key: "d", kind: "sv", date: "2026-10-25", start: "16:00", person: "Lena Ortiz", outcome: { kind: "final", hours: 5.6 } },
  { key: "g", kind: "dispatch", date: "2026-10-25", start: "14:15", person: "Rina Shah", outcome: { kind: "final", hours: 8.2 } },
  { key: "f", kind: "dispatch", date: "2026-10-25", start: "09:30", person: "Marco Diaz", outcome: { kind: "final", hours: 8.4 } },
  { key: "v", kind: "sv", date: "2026-10-26", start: "17:00", person: "Kai Moreno", outcome: { kind: "written", run: "r6", clockIn: "16:58", clockOut: "21:12" } },
  { key: "i", kind: "sv", date: "2026-10-26", start: "16:00", person: "Lena Ortiz", outcome: { kind: "written", run: "r6", clockIn: "15:58", clockOut: "21:27" } },
  { key: "h", kind: "sv", date: "2026-10-26", start: "15:45", person: "Jay Ruiz", outcome: { kind: "written", run: "r6", clockIn: "15:41", clockOut: "21:33" } },
  { key: "k", kind: "dispatch", date: "2026-10-26", start: "14:15", person: "Tess Albright", outcome: { kind: "written", run: "r6", clockIn: "14:09", clockOut: "22:31" } },
  {
    key: "l",
    kind: "dispatch",
    date: "2026-10-26",
    start: "13:45",
    person: "Owen Hale",
    outcome: {
      kind: "unclear",
      clockIn: "13:41",
      note: "forgot to clock out, left after the last handoff, around 9 or so?",
      suggestedEnd: "21:00",
      proposalRun: "r6",
      alertRun: "r5",
    },
  },
  { key: "j", kind: "dispatch", date: "2026-10-26", start: "09:30", person: "Marco Diaz", outcome: { kind: "missing", clockIn: "09:18", alertRun: "r5" } },
  { key: "q", kind: "sv", date: "2026-10-27", start: "17:00", person: "Kai Moreno", outcome: { kind: "written", run: "r3", clockIn: "16:55", clockOut: "21:40" } },
  { key: "n", kind: "sv", date: "2026-10-27", start: "16:30", person: "Devon Pike", outcome: { kind: "written", run: "r3", clockIn: "16:26", clockOut: "21:02" } },
  { key: "m", kind: "sv", date: "2026-10-27", start: "16:00", person: "Lena Ortiz", outcome: { kind: "written", run: "r3", clockIn: "15:57", clockOut: "21:24" } },
  { key: "p", kind: "dispatch", date: "2026-10-27", start: "14:15", person: "Rina Shah", outcome: { kind: "written", run: "r2", clockIn: "14:11", clockOut: "23:20" } },
  { key: "o", kind: "dispatch", date: "2026-10-27", start: "09:30", person: "Marco Diaz", outcome: { kind: "written", run: "r3", clockIn: "09:24", clockOut: "17:52" } },
  { key: "t", kind: "sv", date: "2026-10-28", start: "16:00", person: "Lena Ortiz", outcome: { kind: "open" } },
  { key: "s", kind: "dispatch", date: "2026-10-28", start: "13:45", person: "Owen Hale", outcome: { kind: "open" } },
  { key: "r", kind: "dispatch", date: "2026-10-28", start: "09:30", person: "Marco Diaz", outcome: { kind: "open", clockIn: "09:21" } },
];

const CHICAGO_OFFSET_H = -5;

// The Chicago wall clock of a UTC instant: { date: "2026-10-27", minutes }.
function chicago(iso: string) {
  const d = new Date(new Date(iso).getTime() + CHICAGO_OFFSET_H * 3600_000);
  return { date: d.toISOString().slice(0, 10), minutes: d.getUTCHours() * 60 + d.getUTCMinutes(), hour: d.getUTCHours() };
}

const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

// "16:05" → "4:05 p.m."
function clock(hhmm: string): string {
  const m = toMinutes(hhmm);
  const h = Math.floor(m / 60);
  return `${h % 12 || 12}:${String(m % 60).padStart(2, "0")} ${h < 12 ? "a.m." : "p.m."}`;
}

// "2026-10-26" → "Oct 26"
function day(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function addDaysTo(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Elapsed whole minutes, rounded up to the next tenth of an hour.
function hoursBetween(start: string, end: string): { minutes: number; hours: number } {
  let minutes = toMinutes(end) - toMinutes(start);
  if (minutes < 0) minutes += 24 * 60;
  return { minutes, hours: Math.ceil((minutes / 60) * 10 - 1e-9) / 10 };
}

const runIndex = (key: RunKey) => RUNS.findIndex((r) => r.key === key);

function runType(hour: number): "Main run" | "Fallback run" | "Early run" {
  if (hour < 6) return "Main run";
  if (hour < 12) return "Fallback run";
  return "Early run";
}

// One shift, as one run saw it. Null when the shift is outside the run's
// window.
function shiftEntry(shift: Shift, run: (typeof RUNS)[number], fallback: boolean): Omit<SopActivityEntry, "id" | "at"> | null {
  const now = chicago(run.at);
  const today = now.date;
  if (shift.date > today || shift.date < addDaysTo(today, -3)) return null;

  const kindLabel = KIND_LABEL[shift.kind];
  const where = shift.kind === "sv" ? "Austin" : "Chicago";
  const subject = { label: `${kindLabel} · ${day(shift.date)}, ${clock(shift.start)}, ${where}` };
  const who = `${shift.person}'s ${day(shift.date)} ${kindLabel} shift`;
  const isToday = shift.date === today;
  const started = !isToday || now.minutes >= toMinutes(shift.start);
  const ri = runIndex(run.key);
  const o = shift.outcome;

  const notStarted = () => ({
    type: "check" as const,
    subject,
    summary: `${shift.person}'s ${kindLabel} shift starts at ${clock(shift.start)} today and has no clock actions yet. Hours cannot be calculated yet, and the prior-day Slack exception rule does not apply.`,
  });
  const inProgress = (clockIn: string) => ({
    type: "check" as const,
    subject,
    summary: `${who} has Clock In at ${clock(clockIn)} and no Clock Out yet, so hours were left unset. No Slack exception applies to a shift still in progress.`,
  });
  const finalCheck = (hours: number) => ({
    type: "check" as const,
    subject,
    summary: fallback
      ? `Fallback range check: ${who} has final hours of ${hours}, within the ${RANGE[shift.kind]} hour ${kindLabel} range. Left unchanged; no actions fetched.`
      : `${who} already has final hours of ${hours}. Left unchanged and no clock actions were fetched for it.`,
  });

  switch (o.kind) {
    case "final":
      return finalCheck(o.hours);
    case "open":
      if (!started) return notStarted();
      return inProgress(o.clockIn ?? shift.start);
    case "written": {
      const at = runIndex(o.run);
      const { minutes, hours } = hoursBetween(o.clockIn, o.clockOut);
      if (ri < at) return started ? inProgress(o.clockIn) : notStarted();
      if (ri === at) {
        return {
          type: "action",
          subject,
          summary: `Calculated ${hours} hours for ${who} from Clock In ${clock(o.clockIn)} and Clock Out ${clock(o.clockOut)} Chicago: ${minutes} minutes, rounded up to the next tenth. Wrote hours_worked with ${UPDATE_HOURS[shift.kind]}.`,
        };
      }
      return finalCheck(hours);
    }
    case "missing": {
      const at = runIndex(o.alertRun);
      if (ri < at) {
        return {
          type: "check",
          subject,
          summary: `${who} has Clock In at ${clock(o.clockIn)} and no Clock Out or reported end time, so hours cannot be calculated. The Slack exception waits for the review at or after 16:00 UTC.`,
        };
      }
      if (ri === at) {
        return {
          type: "alert",
          subject,
          summary: `Sent the Dispatch timekeeping exception to <#C0C7R1G0B43|autolane-coc-dispatch-notifications>, tagging <@U0B9UFQC1U7>: ${who} is missing Clock Out, so hours cannot be calculated automatically. ${shift.person}'s first Slack reply that day, 9:12 a.m., is given as a suggested start only.`,
        };
      }
      return {
        type: "check",
        subject,
        summary: `${who} still has no Clock Out and no hours. The exception was already posted to <#C0C7R1G0B43|autolane-coc-dispatch-notifications>, so no duplicate or correction was sent.`,
      };
    }
    case "unclear": {
      const p = runIndex(o.proposalRun);
      const a = runIndex(o.alertRun);
      const { hours } = hoursBetween(o.clockIn, o.suggestedEnd);
      if (ri === p) {
        return {
          type: "proposal",
          subject,
          summary: `${who} has Clock In at ${clock(o.clockIn)} and no Clock Out. A Clock In note says "${o.note}", which concerns the end time but does not give one. No hours were written; a suggested end of ${clock(o.suggestedEnd)} (${hours} hours) is held for review.`,
        };
      }
      if (ri === a) {
        return {
          type: "alert",
          subject,
          summary: `Listed ${who} in the same Dispatch exception message as an unclear-clock exception: the note does not give a usable end time, so hours cannot be calculated automatically.`,
        };
      }
      return {
        type: "check",
        subject,
        summary: `${who} is still held for review over its unclear end-time note, so hours stay unset. Already listed in the exception message; nothing new was sent.`,
      };
    }
  }
}

function shiftHoursRuns(sop: Sop): SopActivityRun[] {
  return RUNS.map((run) => {
    const { hour } = chicago(run.at);
    const label = runType(hour);
    const fallback = label === "Fallback run";
    const start = new Date(run.at).getTime();
    // The agent walks the shifts oldest first, then sends the Slack review
    // last, so a run's alerts are its newest entries.
    const ordered = [...SHIFTS].sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
    const seen = ordered
      .map((shift) => ({ shift, e: shiftEntry(shift, run, fallback) }))
      .filter((x): x is { shift: Shift; e: NonNullable<ReturnType<typeof shiftEntry>> } => x.e !== null);
    const walked = [...seen.filter((x) => x.e.type !== "alert"), ...seen.filter((x) => x.e.type === "alert")];
    const entries: SopActivityEntry[] = [];
    let offset = 0;
    walked.forEach(({ shift, e }, i) => {
      // A few seconds per shift; longer when it wrote or sent something.
      offset += 6 + ((i * 7) % 5) + (e.type === "check" ? 0 : 14);
      entries.push({ ...e, id: `${sop.id}-${run.key}-${shift.key}`, at: new Date(start + offset * 1000).toISOString() });
    });
    entries.reverse();
    return {
      id: `${sop.id}-${run.key}`,
      label,
      startedAt: run.at,
      endedAt: entries[0]?.at ?? run.at,
      entries,
    };
  }).reverse();
}

// ---------------------------------------------------------------------------

// Every run of an SOP with what it did, newest run first.
export function activityForSop(sop: Sop): SopActivityRun[] {
  if (sop.id === SHIFT_HOURS) return shiftHoursRuns(sop);
  return sopRuns
    .filter((r) => r.sopId === sop.id)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .map((run) => fromRun(sop, run))
    .filter((r) => r.entries.length > 0);
}
