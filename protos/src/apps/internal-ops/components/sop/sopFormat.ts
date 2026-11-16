// Formatting helpers for the SOP surfaces. Run timestamps are shown in Pacific
// time, which is where the Brick operators who own the SOPs sit.

import type { SopNode, SopNodeHealth, SopNodeRun, SopRunStatus } from "../../../../types/domain";

function ordinal(day: number): string {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

// "Sep 7th, 10:15 AM PT"
export function formatRunTime(iso: string): string {
  const d = new Date(iso);
  const month = d.toLocaleDateString("en-US", { month: "short", timeZone: "America/Los_Angeles" });
  const day = Number(d.toLocaleDateString("en-US", { day: "numeric", timeZone: "America/Los_Angeles" }));
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" });
  return `${month} ${ordinal(day)}, ${time} PT`;
}

// "Sep 7, 10:15 AM" — tighter, for log lines.
export function formatLogTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "America/Los_Angeles",
  });
}

// 335 → "5m 35s"; 13320 → "3h 42m"; 2 → "2s"
export function formatRuntime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export function formatElapsedMs(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export const RUN_STATUS_LABEL: Record<SopRunStatus, string> = {
  running: "Running",
  succeeded: "Succeeded",
  failed: "Failed",
  awaiting_approval: "Awaiting approval",
  escalated: "Escalated",
};

export const RUN_STATUS_STYLE: Record<SopRunStatus, string> = {
  running: "bg-brand-100 text-brand-700",
  succeeded: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  awaiting_approval: "bg-amber-100 text-amber-700",
  escalated: "bg-amber-100 text-amber-700",
};

export const SOP_STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  draft: "bg-slate-100 text-slate-600",
  paused: "bg-amber-100 text-amber-700",
  archived: "bg-slate-100 text-slate-500",
};

// Who executes a step: Stella when the primary actor is an agent (Stella or the
// verifier), a person otherwise. Mixed steps ("Stella drafts, owner sends")
// follow their first-listed actor.
export type SopExecutor = "stella" | "operator" | "automation" | "external";

export function executorFor(node: SopNode): SopExecutor {
  const primary = node.actors[0];
  if (primary === "stella" || primary === "verifier_agent") return "stella";
  if (primary === "automation") return "automation";
  if (primary === "external") return "external";
  return "operator";
}

export const EXECUTOR_LABEL: Record<SopExecutor, string> = {
  stella: "Stella",
  operator: "Operator",
  automation: "Automation",
  external: "External",
};

// Who runs the step, as a sentence for the version graph card.
export const EXECUTOR_SENTENCE: Record<SopExecutor, string> = {
  stella: "An agent runs this step",
  operator: "A person runs this step",
  automation: "Automation runs this step",
  external: "An outside party runs this step",
};

// "Sun Sep 6, 6:00 PM" in Pacific time.
export function formatDateTimeShort(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
  });
}

// Wall-clock span between two timestamps: "15h 12m", "42m", "3d 2h".
export function formatDuration(startIso: string, endIso: string | null): string {
  if (!endIso) return "—";
  const mins = Math.max(0, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000));
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m`;
}

// How a node fared within one run instance, for the status dot.
export function runHealth(nodeRun: SopNodeRun | undefined): SopNodeHealth {
  if (!nodeRun) return "idle";
  if (nodeRun.status === "failed") return "failing";
  if (nodeRun.status === "escalated" || nodeRun.issues.length > 0 || nodeRun.errors.length > 0) return "attention";
  return "healthy";
}

// Status dot colour per node health, shared by the graph cards and the
// read-only document blocks.
export const HEALTH_DOT: Record<SopNodeHealth, string> = {
  healthy: "bg-emerald-500",
  attention: "bg-amber-400",
  failing: "bg-red-500",
  idle: "bg-slate-300",
};
