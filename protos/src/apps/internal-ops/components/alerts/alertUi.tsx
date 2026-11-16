import { ChevronRight, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import type { Alert, AlertRule, AlertRuleStatus, AlertSeverity } from "../../../../types/domain";

// Shared vocabulary and small building blocks for the Alerts section.

export const SEVERITIES: AlertSeverity[] = ["critical", "high", "medium", "low"];

const SEVERITY_RANK: Record<AlertSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const SEVERITY_STYLE: Record<AlertSeverity, { tag: string; dot: string; text: string }> = {
  critical: { tag: "bg-red-100 text-red-700", dot: "bg-red-500", text: "text-red-700" },
  high: { tag: "bg-orange-100 text-orange-700", dot: "bg-orange-500", text: "text-orange-700" },
  medium: { tag: "bg-amber-100 text-amber-800", dot: "bg-amber-500", text: "text-amber-800" },
  low: { tag: "bg-slate-100 text-slate-600", dot: "bg-slate-400", text: "text-slate-600" },
};

const SEVERITY_BORDER: Record<AlertSeverity, string> = {
  critical: "border-l-red-500",
  high: "border-l-orange-500",
  medium: "border-l-amber-400",
  low: "border-l-slate-300",
};

export function severityBorderClass(s: AlertSeverity) {
  return SEVERITY_BORDER[s];
}

export function severityTextClass(s: AlertSeverity) {
  return SEVERITY_STYLE[s].text;
}

export function SeverityTag({ severity }: { severity: AlertSeverity }) {
  const s = SEVERITY_STYLE[severity];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded px-2 py-0.5 text-xs font-semibold ${s.tag}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

export function ruleSeverityLabel(rule: Pick<AlertRule, "severity">) {
  return rule.severity === "per_alert" ? "Per alert" : SEVERITY_LABEL[rule.severity];
}

export function ruleScheduleLabel(rule: Pick<AlertRule, "schedule">) {
  return rule.schedule ?? "When data changes";
}

// Severity first, then newest first, then id — a stable order so cards never
// shuffle between renders.
export function compareAlerts(a: Alert, b: Alert) {
  return (
    SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
    b.createdAt.localeCompare(a.createdAt) ||
    a.id.localeCompare(b.id)
  );
}

const RULE_STATUS: Record<AlertRuleStatus, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-op-100 text-op-700" },
  draft: { label: "Draft", cls: "border border-dashed border-slate-300 bg-white text-slate-600" },
  inactive: { label: "Inactive", cls: "bg-slate-100 text-slate-500" },
};

// Active-alert count as a small red pill (number only). Renders nothing at 0.
export function ActiveCountPill({ count }: { count: number }) {
  if (count === 0) return null;
  const label = `${count} active alert${count === 1 ? "" : "s"}`;
  return (
    <span
      title={label}
      aria-label={label}
      className="inline-flex min-w-6 shrink-0 items-center justify-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-red-700"
    >
      {count}
    </span>
  );
}

export function RuleStatusPill({ status }: { status: AlertRuleStatus }) {
  const s = RULE_STATUS[status];
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-1 flex items-center gap-1 text-sm text-slate-400">
      {items.map((c, i) => (
        <span key={c.label + i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
          {c.to ? (
            <Link to={c.to} className="hover:text-slate-700">
              {c.label}
            </Link>
          ) : (
            <span className="text-slate-500">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
      />
    </div>
  );
}

export const selectClass =
  "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-300 focus:outline-none";

// Bottom-centre toast with an Undo action; auto-hides after a few seconds.
export function UndoToast({
  message,
  onUndo,
  onClose,
}: {
  message: string;
  onUndo: () => void;
  onClose: () => void;
}) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const t = setTimeout(() => closeRef.current(), 6000);
    return () => clearTimeout(t);
  }, [message]);

  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg"
    >
      <span>{message}</span>
      <button type="button" onClick={onUndo} className="font-semibold text-brand-300 hover:text-brand-200">
        Undo
      </button>
      <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-white">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
