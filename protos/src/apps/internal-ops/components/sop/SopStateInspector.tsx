// The inspector for the state lens: what one state means, the rule that holds
// while the subject is in it, every way in and out, and which SOP steps govern
// it. Mirrors SopNodeInspector's shape so switching lenses doesn't relocate
// everything the reader just learned to find.

import { ArrowDown, ArrowUp, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { Sop, SopState, SopStateModel } from "../../../../types/domain";

const KIND_LABEL: Record<SopState["kind"], string> = {
  resting: "Resting",
  active: "Active",
  exception: "Exception",
};

const KIND_CHIP: Record<SopState["kind"], string> = {
  resting: "bg-slate-100 text-slate-600",
  active: "bg-emerald-100 text-emerald-700",
  exception: "bg-amber-100 text-amber-800",
};

export function SopStateInspector({
  model,
  state,
  sops,
  onSelectState,
  onClose,
}: {
  model: SopStateModel;
  state: SopState;
  // Every SOP the model's steps can point at, for resolving step titles.
  sops: Sop[];
  onSelectState: (id: string) => void;
  onClose: () => void;
}) {
  const byId = new Map(model.states.map((s) => [s.id, s]));
  const incoming = model.transitions.filter((t) => t.to === state.id);
  const outgoing = model.transitions.filter((t) => t.from === state.id);

  // A step reference resolves through the compiled node id, `<sopId>/<stepId>`.
  const stepTitle = (sopId: string, stepId: string) => {
    const sop = sops.find((s) => s.id === sopId);
    const node = sop?.nodes.find((n) => n.id === `${sopId}/${stepId}`);
    return { sopName: sop?.name ?? sopId, title: node?.title ?? stepId, sopId, nodeId: node?.id };
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="shrink-0 px-5 pb-4 pt-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">Inspect: State</p>
          <button type="button" onClick={onClose} aria-label="Close inspector" className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <h2 className="text-lg font-semibold text-slate-900">{state.label}</h2>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${KIND_CHIP[state.kind]}`}>
            {KIND_LABEL[state.kind]}
          </span>
          {state.id === model.start && (
            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brand-700">Start</span>
          )}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">{state.description}</p>
        {state.rule && (
          <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Rule while here</p>
            <p className="mt-0.5 text-sm text-amber-900">{state.rule}</p>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <Section title="Paths" count={incoming.length + outgoing.length}>
          <div className="space-y-3">
            <div>
              <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <ArrowDown className="h-3 w-3" strokeWidth={2.5} />
                Ways in ({incoming.length})
              </p>
              <div className="mt-1 flex flex-col gap-1">
                {incoming.length === 0 ? (
                  <span className="text-sm text-slate-400">None. Nothing leads here.</span>
                ) : (
                  incoming.map((t) => (
                    <TransitionRow key={t.id} label={t.label} note={t.note} peer={byId.get(t.from)?.label ?? t.from} lead="from" onSelect={() => onSelectState(t.from)} />
                  ))
                )}
              </div>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <ArrowUp className="h-3 w-3" strokeWidth={2.5} />
                Ways out ({outgoing.length})
              </p>
              <div className="mt-1 flex flex-col gap-1">
                {outgoing.length === 0 ? (
                  <span className="text-sm text-slate-400">None. The subject stops here, or the SOP does not say what happens next.</span>
                ) : (
                  outgoing.map((t) => (
                    <TransitionRow key={t.id} label={t.label} note={t.note} peer={byId.get(t.to)?.label ?? t.to} lead="to" onSelect={() => onSelectState(t.to)} />
                  ))
                )}
              </div>
            </div>
          </div>
        </Section>

        <Section title="Governed by" count={state.steps?.length}>
          {state.steps && state.steps.length > 0 ? (
            <ul className="space-y-1.5">
              {state.steps.map((ref, i) => {
                const s = stepTitle(ref.sopId, ref.stepId);
                return (
                  <li key={i} className="rounded-lg border border-slate-200 px-2.5 py-1.5">
                    <p className="text-sm font-medium text-slate-800">{s.title}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">{s.sopName}</p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">No SOP step is tied to this state.</p>
          )}
        </Section>
      </div>
    </div>
  );
}

function TransitionRow({
  label,
  note,
  peer,
  lead,
  onSelect,
}: {
  label: string;
  note?: string;
  peer: string;
  lead: "from" | "to";
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group rounded-lg border border-slate-200 px-2.5 py-1.5 text-left transition-colors hover:border-brand-300 hover:bg-brand-50"
    >
      <p className="text-sm font-medium text-slate-800 group-hover:text-brand-700">
        <span className="text-slate-400">{lead === "from" ? "From" : "To"}</span> {peer}
      </p>
      <p className="mt-0.5 text-[12px] text-slate-600">{label}</p>
      {note && <p className="mt-0.5 text-[11px] text-slate-400">{note}</p>}
    </button>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-t border-slate-100 px-5 py-4">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-left">
        <span className="text-sm text-slate-500">
          {title}
          {count !== undefined && count > 0 && <span className="ml-1.5 text-xs text-slate-400">({count})</span>}
        </span>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}
