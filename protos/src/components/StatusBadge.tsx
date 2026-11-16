export const STATUS_STYLES: Record<string, string> = {
  // task / trip / work order progress
  not_started: "bg-slate-100 text-slate-600",
  unassigned: "bg-slate-100 text-slate-600",
  assigned: "bg-brand-100 text-brand-700",
  in_progress: "bg-amber-100 text-amber-700",
  scheduled: "bg-brand-100 text-brand-700",
  completed: "bg-op-100 text-op-700",
  delivered: "bg-op-100 text-op-700",
  delayed: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-500",
  draft: "bg-slate-100 text-slate-600",
  active: "bg-op-100 text-op-700",

  // issues
  needs_review: "bg-amber-100 text-amber-700",
  approved: "bg-op-100 text-op-700",
  routed_to_brand: "bg-brand-100 text-brand-700",
  resolved: "bg-slate-100 text-slate-600",

  // inventory / deployment
  in_stock: "bg-op-100 text-op-700",
  stored: "bg-slate-100 text-slate-700",
  low_stock: "bg-red-100 text-red-700",
  reserved: "bg-amber-100 text-amber-700",
  deployed: "bg-brand-100 text-brand-700",
  planned: "bg-slate-100 text-slate-600",
  in_transit: "bg-amber-100 text-amber-700",

  // fleet / robotics unit lifecycle
  decommissioned: "bg-slate-200 text-slate-600",
  battery_failure: "bg-red-100 text-red-700",
  decommission_scheduled: "bg-amber-100 text-amber-700",

  // people / operators
  on_shift: "bg-op-100 text-op-700",
  on_break: "bg-amber-100 text-amber-700",
  off_shift: "bg-slate-100 text-slate-500",
  onboarding: "bg-brand-100 text-brand-700",
  paused: "bg-slate-100 text-slate-500",
  launching: "bg-amber-100 text-amber-700",
};

export function statusStyle(status: string): string {
  return STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600";
}

export function labelFor(status: string) {
  return status.replaceAll("_", " ");
}

// Task-specific display vocabulary. Scoped via `kind="task"` so shared statuses
// (e.g. `in_progress` on trips) keep their default labels elsewhere. Task status
// is assignment-independent — a task reads "Not Started" whether or not it has an
// owner.
export const TASK_STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "Started",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function StatusBadge({
  status,
  kind,
  className = "",
}: {
  status: string;
  kind?: "task";
  className?: string;
}) {
  const style = STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600";
  const label = kind === "task" ? (TASK_STATUS_LABELS[status] ?? labelFor(status)) : labelFor(status);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${style} ${className}`}
    >
      {label}
    </span>
  );
}
