// The gutter beside each section of the SOP document.
//
// The document is what a person wrote. The gutter is what the agent read out
// of it: for every section, the actions it will take and the tools it will
// call to take them. This is the first phase of the process — composing the
// SOP accurately — so the gutter is where the two meet. An action Sol
// inferred reads "detected" until a person confirms it, and an action the
// prose asks for that Brick has no tool for reads "missing" and says why.

import { ArrowDownToLine, Check, GitBranch, PencilLine, Send, TriangleAlert } from "lucide-react";
import type { SopAction, SopActionKind } from "../../../../types/domain";

const KIND_ICON: Record<SopActionKind, typeof ArrowDownToLine> = {
  read: ArrowDownToLine,
  write: PencilLine,
  notify: Send,
  decide: GitBranch,
};

const KIND_TINT: Record<SopActionKind, string> = {
  read: "text-sky-600",
  write: "text-emerald-600",
  notify: "text-violet-600",
  decide: "text-amber-600",
};

export const ACTION_KIND_LABEL: Record<SopActionKind, string> = {
  read: "Reads",
  write: "Writes",
  notify: "Notifies",
  decide: "Decides",
};

// How many of a section's actions still need a person, for the collapsed chip
// and the document header. A "missing" action is a gap in Brick's tooling; a
// "detected" one is a reading nobody has checked yet.
export function actionCounts(actions: SopAction[]) {
  return {
    total: actions.length,
    detected: actions.filter((a) => a.status === "detected").length,
    confirmed: actions.filter((a) => a.status === "confirmed").length,
    missing: actions.filter((a) => a.status === "missing").length,
  };
}

export function ActionGutter({
  actions,
  // Collapsed sections show only the count, so a folded document stays folded.
  collapsed = false,
  onConfirm,
}: {
  actions: SopAction[];
  collapsed?: boolean;
  // Absent in read-only views: a run is a record, not something to correct.
  onConfirm?: (actionId: string) => void;
}) {
  if (actions.length === 0) {
    return <p className="text-[11px] leading-snug text-slate-300">No tool calls detected</p>;
  }

  const counts = actionCounts(actions);

  if (collapsed) {
    return (
      <p className="flex flex-wrap items-center gap-1 text-[11px] text-slate-400">
        <span>
          {counts.total} tool call{counts.total === 1 ? "" : "s"}
        </span>
        {counts.missing > 0 && (
          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 font-medium text-amber-700">{counts.missing} missing</span>
        )}
      </p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {actions.map((action) => {
        const Icon = KIND_ICON[action.kind];
        const missing = action.status === "missing";
        return (
          <li
            key={action.id}
            className={`rounded-lg border px-2 py-1.5 ${
              missing ? "border-amber-200 bg-amber-50/60" : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-start gap-1.5">
              <Icon
                className={`mt-0.5 h-3 w-3 shrink-0 ${missing ? "text-amber-600" : KIND_TINT[action.kind]}`}
                strokeWidth={2.25}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p
                  title={`${ACTION_KIND_LABEL[action.kind]} · ${action.tool}${action.args ? `(${action.args})` : "()"}`}
                  className={`break-all font-mono text-[10.5px] leading-tight ${missing ? "text-amber-900" : "text-slate-700"}`}
                >
                  {action.tool}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{action.label}</p>
                {action.args && (
                  <p className="mt-0.5 truncate font-mono text-[10px] leading-tight text-slate-400" title={action.args}>
                    {action.args}
                  </p>
                )}
              </div>
            </div>

            {missing ? (
              <p className="mt-1 flex items-start gap-1 text-[10.5px] leading-snug text-amber-800">
                <TriangleAlert className="mt-px h-3 w-3 shrink-0" strokeWidth={2.25} aria-hidden />
                <span>{action.gap}</span>
              </p>
            ) : action.status === "confirmed" ? (
              <p className="mt-1 flex items-center gap-1 text-[10.5px] font-medium text-emerald-700">
                <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                Confirmed
              </p>
            ) : onConfirm ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onConfirm(action.id);
                }}
                className="mt-1 rounded-md border border-slate-200 px-1.5 py-0.5 text-[10.5px] font-medium text-slate-500 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
              >
                Detected — confirm
              </button>
            ) : (
              <p className="mt-1 text-[10.5px] text-slate-400">Detected</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
