import { CircleHelp } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { BrandChip } from "../../../../components/BrandChip";
import { getBrand, getProject, getTask, getTaskKind, getWorkOrder } from "../../../../data";
import { formatDateTime, formatRelative } from "../../../../lib/format";
import type { Alert } from "../../../../types/domain";
import { useAlerts } from "../../context/AlertsContext";
import { SEVERITY_LABEL, severityBorderClass } from "./alertUi";

const linkClass = "font-medium text-brand-600 hover:text-brand-700 hover:underline";

// One triggered alert. Severity is carried by the 4px left border alone; the
// first line is brand + what happened, the second is the description with the
// affected work order / task / project linked inline. The card is a plain
// container (not a link), so text stays selectable and each click target does
// one obvious thing.
export function AlertCard({
  alert,
  showBrand = true,
  showRule = true,
  onDismiss,
  selected,
  onSelectedChange,
}: {
  alert: Alert;
  showBrand?: boolean;
  showRule?: boolean;
  onDismiss?: (alert: Alert) => void;
  // Pass onSelectedChange to show a selection checkbox (bulk actions).
  selected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
}) {
  const { getRule, dismiss, undoDismiss } = useAlerts();
  const brand = getBrand(alert.brandId);
  const rule = getRule(alert.ruleId);
  const closed = alert.status !== "active";
  const linked = linkAlertText(alert);

  return (
    <article
      className={`rounded-md border border-l-4 bg-white pb-2 pt-3 pl-4 pr-3 shadow-sm ${severityBorderClass(alert.severity)} ${
        selected ? "border-y-brand-300 border-r-brand-300 ring-1 ring-brand-200" : "border-y-slate-200 border-r-slate-200"
      }`}
    >
      <span className="sr-only">{SEVERITY_LABEL[alert.severity]} severity.</span>
      <div className="flex items-start gap-3">
        {onSelectedChange && (
          <input
            type="checkbox"
            checked={Boolean(selected)}
            onChange={(e) => onSelectedChange(e.target.checked)}
            aria-label={`Select "${alert.name}"`}
            className="mt-1.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-brand-600"
          />
        )}
        <div className={`min-w-0 flex-1 ${closed ? "opacity-70" : ""}`}>
          <div className="flex items-start gap-2">
            {showBrand && brand && <BrandChip name={brand.name} color={brand.color} />}
            <h3 className="min-w-0 flex-1 pt-0.5 text-[15px] font-semibold leading-snug text-slate-900">{linked.title}</h3>
            {showRule && rule && (
              <Link
                to={`/internal-ops/alerts/${rule.id}`}
                title={rule.name}
                className="shrink-0 pt-1 text-xs font-medium text-slate-500 hover:text-brand-600 hover:underline"
              >
                View Rule
              </Link>
            )}
            <ExplainPopover reasoning={alert.reasoning} />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {linked.description}
          </p>

          {alert.status === "dismissed" && (
            <p className="mt-1.5 text-xs text-slate-500">
              Dismissed by <span className="font-medium text-slate-700">{alert.dismissedByName}</span> ·{" "}
              {formatDateTime(alert.dismissedAt ?? null)}
            </p>
          )}
          {alert.status === "resolved" && (
            <p className="mt-1.5 text-xs text-slate-500">Cleared on its own · {formatDateTime(alert.resolvedAt ?? null)}</p>
          )}
        </div>
      </div>

      <div className={`mt-1 flex items-center gap-2 text-xs text-slate-400 ${onSelectedChange ? "pl-7" : ""}`}>
        <span title={formatDateTime(alert.createdAt)}>{formatRelative(alert.createdAt)}</span>
        <span className="flex-1" />
        {alert.status === "active" && (
          <button
            type="button"
            onClick={() => {
              dismiss(alert.id);
              onDismiss?.(alert);
            }}
            className="shrink-0 text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline"
          >
            Dismiss
          </button>
        )}
        {alert.status === "dismissed" && (
          <button
            type="button"
            onClick={() => undoDismiss(alert.id)}
            className="shrink-0 text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline"
          >
            Restore
          </button>
        )}
      </div>
    </article>
  );
}

// Words that refer to each kind of alerted entity. Only an entity's own kind
// word is linked ("task" links a task, never a work order).
const KIND_WORDS: Record<string, string[]> = {
  Task: ["task"],
  "Work order": ["work order"],
  Project: ["project"],
  Shipment: ["shipment"],
  Parcel: ["parcel"],
};

interface LinkTarget {
  to: string;
  // Shown in the hover popover: what the link opens.
  kind: string;
  title: string;
  // Names of the entity, full name first, then short forms.
  names: string[];
  words: string[];
  fallbackLabel?: string;
}

interface Match {
  start: number;
  end: number;
  target: LinkTarget;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Short forms an alert title tends to use for a work order: the market code
// ("DEN-A Hound Hill Dog Park" → "DEN-A") and the part after an em dash
// ("Will Call & Staging — Terra Verde" → "Terra Verde").
function shortNames(title: string): string[] {
  const out: string[] = [];
  const code = title.match(/^[A-Z]{2,}-[A-Z0-9]+(?=\s)/);
  if (code) out.push(code[0]);
  const dash = title.split(" — ");
  if (dash.length > 1) out.push(dash[dash.length - 1]);
  return out;
}

const EDGE_STOPWORDS = new Set(["on", "the", "a", "an", "of", "to", "for", "at", "in", "and", "&", "—", "-", "|", "·"]);

// Every run of 2+ consecutive words from a name, longest first, that doesn't
// start or end on a filler word — so a title that says "Daily Supervision
// Shifts" still matches the work order "Daily Supervision Shifts 2026-07-01".
function nameFragments(name: string): string[] {
  const words = name.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (let len = words.length - 1; len >= 2; len--) {
    for (let i = 0; i + len <= words.length; i++) {
      const frag = words.slice(i, i + len);
      if (EDGE_STOPWORDS.has(frag[0].toLowerCase()) || EDGE_STOPWORDS.has(frag[len - 1].toLowerCase())) continue;
      out.push(frag.join(" "));
    }
  }
  return out;
}

// The task kind(s) a task label starts with, looked up from the work order's
// tasks ("Warehouse service at Bayview…" → "Warehouse Service"), falling back
// to the label's leading "<kind> on/at" segment.
function taskKindNames(label: string, taskIds: string[]): string[] {
  const lower = label.toLowerCase();
  const kinds = [
    ...new Set(
      taskIds
        .map((id) => getTaskKind(getTask(id)?.taskKindId)?.name)
        .filter((n): n is string => Boolean(n) && lower.startsWith(n!.toLowerCase())),
    ),
  ].sort((a, b) => b.length - a.length);
  const lead = label.split(/ (?:on|at) /)[0];
  return kinds.length ? kinds : lead !== label ? [lead] : [];
}

// Where the alerted entity (and its project) open. Projects have a page; work
// orders and tasks (no page of their own in Internal Ops) open All Tasks
// filtered to the work order.
function linkTargets(alert: Alert): LinkTarget[] {
  const { entity } = alert;
  const project = getProject(entity.projectId);
  const wo = getWorkOrder(entity.workOrderId);
  const projectTarget = project && {
    to: `/internal-ops/projects/${project.id}`,
    kind: "Project",
    title: project.name,
    names: [project.name, ...nameFragments(project.name)],
    words: ["project"],
    fallbackLabel: "project",
  };
  if (entity.kind === "Project") return projectTarget ? [projectTarget] : [];
  const targets: LinkTarget[] = [];
  if (wo) {
    targets.push({
      to: `/internal-ops/tasks?workOrder=${wo.id}`,
      kind: entity.kind,
      title: entity.label,
      // A task label reads "<task kind> on/at <work order or place>". The task
      // kind is preferred ("Pick and Stage", "Warehouse service"), then the
      // work order part
      // ("Delivery on Order 0293745" → "Order 0293745").
      names: [
        entity.label,
        ...(entity.kind === "Task" ? taskKindNames(entity.label, wo.taskIds) : []),
        ...(entity.label.includes(" on ") ? [entity.label.split(" on ").slice(1).join(" on ")] : []),
        ...(wo.title ? [wo.title, ...shortNames(wo.title)] : []),
        ...nameFragments(entity.label),
        ...(wo.title && wo.title !== entity.label ? nameFragments(wo.title) : []),
      ],
      words: KIND_WORDS[entity.kind] ?? [],
      fallbackLabel: entity.kind.toLowerCase(),
    });
  }
  if (projectTarget) targets.push({ ...projectTarget, fallbackLabel: undefined });
  return targets;
}

// First non-overlapping occurrence of any phrase in `text`.
function findMatch(text: string, phrases: string[], taken: Match[]): { start: number; end: number } | null {
  for (const phrase of phrases) {
    const re = new RegExp(`(?<!\\w)${escapeRe(phrase)}(?!\\w)`, "gi");
    for (const m of text.matchAll(re)) {
      const start = m.index ?? 0;
      const end = start + m[0].length;
      if (!taken.some((t) => start < t.end && end > t.start)) return { start, end };
    }
  }
  return null;
}

function renderLinked(text: string, matches: Match[]): ReactNode[] {
  const parts: ReactNode[] = [];
  let cursor = 0;
  [...matches]
    .sort((a, b) => a.start - b.start)
    .forEach((m, i) => {
      if (m.start > cursor) parts.push(text.slice(cursor, m.start));
      parts.push(
        <EntityLink key={i} target={m.target}>
          {text.slice(m.start, m.end)}
        </EntityLink>,
      );
      cursor = m.end;
    });
  parts.push(text.slice(cursor));
  return parts;
}

// Links the alerted entity where the alert already mentions it, each entity
// once: its name in the title, else its name in the description, else its own
// kind word ("task", "project") in the description. Only if none of those
// appear is the kind word itself ("work order") appended as the link; the
// hover popover names the exact record.
export function linkAlertText(alert: Alert) {
  const targets = linkTargets(alert);
  const titleMatches: Match[] = [];
  const descMatches: Match[] = [];
  const unmatched: LinkTarget[] = [];
  for (const t of targets) {
    const inTitle = findMatch(alert.name, t.names, titleMatches);
    if (inTitle) {
      titleMatches.push({ ...inTitle, target: t });
      continue;
    }
    const inDesc = findMatch(alert.description, [...t.names, ...t.words], descMatches);
    if (inDesc) descMatches.push({ ...inDesc, target: t });
    else unmatched.push(t);
  }
  const primary = targets[0];
  const fallback = primary && unmatched.includes(primary) && primary.fallbackLabel ? primary : null;
  return {
    title: renderLinked(alert.name, titleMatches),
    description: [
      ...renderLinked(alert.description, descMatches),
      ...(fallback
        ? [
            " ",
            <EntityLink key="fallback" target={fallback}>
              {fallback.fallbackLabel}
            </EntityLink>,
          ]
        : []),
    ],
  };
}

// The (?) button in the card's top-right corner. Click toggles a popover with
// the evaluator's reasoning; clicking outside or pressing Escape closes it.
function ExplainPopover({ reasoning }: { reasoning: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative -mr-1 -mt-0.5 shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={popoverId}
        aria-label="Explain"
        title={open ? undefined : "Explain why this fired"}
        className={`rounded-md p-1 ${
          open ? "bg-brand-50 text-brand-600" : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        }`}
      >
        <CircleHelp className="h-4.5 w-4.5" />
      </button>
      {open && (
        <div
          id={popoverId}
          role="dialog"
          aria-label="Why this fired"
          className="absolute right-0 top-full z-40 mt-1.5 w-80 rounded-lg border border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-600 shadow-lg"
        >
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Why this fired</p>
          {reasoning}
        </div>
      )}
    </div>
  );
}

// Inline link with a hover/focus popover naming the record it opens, so a
// link on a generic word like "task" still says which task.
function EntityLink({ target, children }: { target: LinkTarget; children: ReactNode }) {
  return (
    <span className="group/entity relative inline">
      <Link to={target.to} className={linkClass} aria-label={`${target.kind}: ${target.title}`}>
        {children}
      </Link>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-0 z-30 mb-1.5 hidden w-max max-w-xs rounded-md bg-slate-900 px-2.5 py-1.5 text-xs leading-snug text-white shadow-lg group-focus-within/entity:block group-hover/entity:block"
      >
        <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">{target.kind}</span>
        <span className="font-medium">{target.title}</span>
      </span>
    </span>
  );
}

// Card list with the shared dismiss → undo toast wiring. Takes one alert or a
// batch (bulk "Dismiss selected"); Undo restores the whole batch.
export function useDismissToast() {
  const { undoDismiss } = useAlerts();
  const [last, setLast] = useState<Alert[]>([]);
  const one = last.length === 1 ? last[0] : null;
  return {
    onDismiss: (dismissed: Alert | Alert[]) => setLast(Array.isArray(dismissed) ? dismissed : [dismissed]),
    toast:
      last.length > 0
        ? {
            message: one
              ? `Dismissed "${one.name.length > 48 ? one.name.slice(0, 46) + "…" : one.name}"`
              : `Dismissed ${last.length} alerts`,
            onUndo: () => {
              undoDismiss(last.map((a) => a.id));
              setLast([]);
            },
            onClose: () => setLast([]),
          }
        : null,
  };
}
