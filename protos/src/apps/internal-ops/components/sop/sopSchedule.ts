// What an SOP operates on and when it runs, read off the record.
//
// The SOP file carries a trigger sentence, not a schedule, so the cadence is
// read out of that sentence (and the name) for the index's Last / Next columns
// and the SOP page's schedule row. An Alert has a schedule string already.
// Everything here is a reading of prose, so it is a best guess, not a fact.

import { mockNow } from "../../../../lib/format";
import type { AlertRule, Sop } from "../../../../types/domain";

export type Cadence = "day" | "week" | "month" | "event";

export const CADENCES: Cadence[] = ["day", "week", "month", "event"];

export const CADENCE_LABEL: Record<Cadence, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
  event: "Event",
};

export interface SopSchedule {
  cadence: Cadence;
  // "9:00 AM"
  time: string;
  // When it next runs on that cadence; null for an event-driven SOP.
  next: Date | null;
}

const DEFAULT_TIME = "9:00 AM";

// "6:00pm" / "9:00 AM" / "8 AM" → "6:00 PM"
function timeIn(text: string): string {
  const m = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (!m) return DEFAULT_TIME;
  return `${Number(m[1])}:${m[2] ?? "00"} ${m[3].toUpperCase()}`;
}

function hourMinute(time: string): [number, number] {
  const m = time.match(/(\d{1,2}):(\d{2}) (AM|PM)/);
  if (!m) return [9, 0];
  const h = (Number(m[1]) % 12) + (m[3] === "PM" ? 12 : 0);
  return [h, Number(m[2])];
}

// The next run on the prototype's clock.
export function nextRun(cadence: Cadence, time: string): Date | null {
  if (cadence === "event") return null;
  const now = mockNow();
  const [h, min] = hourMinute(time);
  const d = new Date(now);
  d.setHours(h, min, 0, 0);
  if (cadence === "day") {
    if (d <= now) d.setDate(d.getDate() + 1);
  } else if (cadence === "week") {
    // Next Monday.
    const ahead = (8 - d.getDay()) % 7 || 7;
    d.setDate(d.getDate() + ahead);
  } else {
    d.setMonth(d.getMonth() + 1, 1);
  }
  return d;
}

function cadenceIn(text: string): Cadence {
  const t = text.toLowerCase();
  if (/\b(daily|every day|each day|every morning|every evening|end of (the )?day|each morning)\b/.test(t)) return "day";
  if (/\b(weekly|every week|each week|week's|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/.test(t)) return "week";
  if (/\b(monthly|every month|each month|month-end|end of (the )?month)\b/.test(t)) return "month";
  return "event";
}

export function scheduleForSop(sop: Pick<Sop, "trigger" | "name">): SopSchedule {
  const text = `${sop.trigger} ${sop.name}`;
  const cadence = cadenceIn(text);
  const time = timeIn(sop.trigger);
  return { cadence, time, next: nextRun(cadence, time) };
}

export function scheduleForRule(rule: Pick<AlertRule, "schedule">): SopSchedule {
  if (!rule.schedule) return { cadence: "event", time: DEFAULT_TIME, next: null };
  const cadence = cadenceIn(rule.schedule) === "event" ? "day" : cadenceIn(rule.schedule);
  const time = timeIn(rule.schedule);
  return { cadence, time, next: nextRun(cadence, time) };
}

// The record type the SOP works over, read off its name and trigger.
export function operatesOn(sop: Pick<Sop, "name" | "trigger"> | Pick<AlertRule, "name">): string {
  const t = `${sop.name} ${"trigger" in sop ? sop.trigger : ""}`.toLowerCase();
  if (/work order|finaliz/.test(t)) return "Work Orders";
  if (/invoice|bill|payable|cost logging/.test(t)) return "Invoices";
  if (/shipment|freight|parcel|tracking|inbound|outbound|receiving/.test(t)) return "Shipments";
  if (/shift|staffing|supervision|dispatch|deploy/.test(t)) return "Shifts";
  if (/network operator|\bno\b|operator/.test(t)) return "Network Operators";
  if (/brand|playbook|engagement/.test(t)) return "Brands";
  if (/project|post mortem/.test(t)) return "Projects";
  if (/task|audit|margin|rate/.test(t)) return "Tasks";
  return "Records";
}

// "9:15 PM PT, 10/26" — the index's Last / Next stamp.
export function formatStamp(date: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" });
  const day = d.toLocaleDateString("en-US", { month: "numeric", day: "numeric", timeZone: "America/Los_Angeles" });
  return `${time} PT, ${day}`;
}
