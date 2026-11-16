// The detail pane that opens on the right of a list when a row is picked:
// an icon, title and status up top with a close button; one line of facts
// under it with an action (Resolve, say) on the right; where it came from;
// a scrolling body; and an optional footer pinned to the bottom (a composer,
// usually).
//
// Shell only — what goes in the body is the page's.

import { ChevronRight, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { StellaIcon } from "./stella/StellaIcon";

export function InspectionPane({
  icon,
  title,
  badge,
  meta,
  action,
  from,
  onClose,
  children,
  footer,
}: {
  icon?: ReactNode;
  title: ReactNode;
  badge?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  from?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-slate-200 bg-white">
      <header className="shrink-0 border-b border-slate-200 px-6 pb-4 pt-5">
        <div className="flex items-start gap-3">
          {icon && <span className="shrink-0">{icon}</span>}
          <h2 className="min-w-0 flex-1 text-lg font-semibold leading-snug text-slate-900">{title}</h2>
          {badge && <span className="shrink-0 pt-0.5">{badge}</span>}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        {(meta || action) && (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">{meta}</div>
            {action && <div className="shrink-0">{action}</div>}
          </div>
        )}
        {from && <div className="mt-3 text-sm text-slate-400">{from}</div>}
      </header>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
      {footer && <div className="shrink-0">{footer}</div>}
    </aside>
  );
}

// A small rounded label for a pane's status.
export function PaneBadge({ tone, children }: { tone: "amber" | "emerald" | "slate" | "brand"; children: ReactNode }) {
  const tones = {
    amber: "bg-amber-100 text-amber-800",
    emerald: "bg-emerald-100 text-emerald-800",
    slate: "bg-slate-100 text-slate-600",
    brand: "bg-brand-100 text-brand-700",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

// One part of what Stella says about the item, under her mark: a grey heading
// that folds the body away.
export function PaneSection({ heading, children }: { heading: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="flex items-start gap-3">
      <StellaIcon size={18} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-center gap-1.5 text-md text-slate-400 transition-colors hover:text-slate-600"
        >
          {heading}
          <ChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-90" : ""}`} strokeWidth={2} />
        </button>
        {open && <div className="mt-2 text-base leading-relaxed text-slate-700">{children}</div>}
      </div>
    </section>
  );
}
