// Column 4 of the SOP authoring page: the node inspector.
//
// Everything known about the selected node: its latest run (status, logs,
// objects it created, errors), the four definition fields (work, owner, rules,
// done when), autonomy, and its place in the graph (parents / children, which
// are links). The owner is editable; the rest is read-only here and changes
// through the document + Stella.

import { ArrowDown, ArrowUp, Check, ChevronDown, ChevronUp, Copy, UserRound, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { SOP_ACTOR_LABELS, SOP_AUTONOMY_LABELS, SOP_OWNER_OPTIONS } from "../../../../data";
import type { Sop, SopNode, SopNodeRun } from "../../../../types/domain";
import { formatLogTime, formatRunTime, formatRuntime, RUN_STATUS_LABEL, RUN_STATUS_STYLE } from "./sopFormat";

const VERIFICATION_LABEL: Record<SopNode["verification"], string> = {
  automated: "Automated",
  human: "Human review",
  automated_plus_spot_check: "Verifier agent + human spot check",
  none: "None",
};

export function SopNodeInspector({
  sop,
  node,
  run,
  mode = "run",
  readOnly = false,
  onSelectNode,
  onChangeOwner,
  onClose,
}: {
  sop: Sop;
  node: SopNode;
  run: SopNodeRun | undefined;
  // "version" shows the node as defined in a published version: no run
  // status, logs, objects or runtime analytics.
  mode?: "run" | "version";
  // The run view is a record of what happened; its owner is not editable.
  readOnly?: boolean;
  onSelectNode: (id: string) => void;
  onChangeOwner: (ownerName: string) => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const versionMode = mode === "version";
  const parents = sop.edges.filter((e) => e.to === node.id).map((e) => sop.nodes.find((n) => n.id === e.from)).filter((n): n is SopNode => Boolean(n));
  const children = sop.edges.filter((e) => e.from === node.id).map((e) => sop.nodes.find((n) => n.id === e.to)).filter((n): n is SopNode => Boolean(n));
  const instanceId = versionMode ? node.id : (run?.id ?? `${node.id}-no-run`);

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(instanceId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard access can be denied in an embedded preview; nothing to do.
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="shrink-0 px-5 pb-4 pt-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">Inspect: Node</p>
          <button type="button" onClick={onClose} aria-label="Close inspector" className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
          <h2 className="text-lg font-semibold text-slate-900">{node.title}</h2>
          <button type="button" onClick={copyId} className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600" title={instanceId}>
            <span className="font-mono">…{instanceId.slice(-12)}</span>
            <span>·</span>
            {copied ? <Check className="h-3 w-3" strokeWidth={2} /> : <Copy className="h-3 w-3" strokeWidth={2} />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>

        <div className="mt-4 grid grid-cols-[64px_1fr_auto] items-center gap-x-3 gap-y-3 text-sm">
          {!versionMode && (
            <>
              <span className="text-slate-500">Run</span>
              <span className="text-[15px] text-slate-800">{run ? formatRunTime(run.startedAt) : "Not yet run"}</span>
              <span className={`rounded-lg px-3 py-1.5 text-sm font-medium ${run ? RUN_STATUS_STYLE[run.status] : "bg-slate-100 text-slate-500"}`}>
                {run ? RUN_STATUS_LABEL[run.status] : "Idle"}
              </span>
            </>
          )}

          <span className="text-slate-500">Owner</span>
          {readOnly ? (
            <div className="col-span-2 flex items-center gap-2 py-2 text-sm font-medium text-slate-800">
              <UserRound className="h-4 w-4 text-slate-400" strokeWidth={2} />
              {node.ownerName}
            </div>
          ) : (
          <div className="relative col-span-2">
            <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-500" strokeWidth={2} />
            <select
              value={node.ownerName}
              onChange={(e) => onChangeOwner(e.target.value)}
              aria-label="Node owner"
              className="w-full appearance-none rounded-lg border border-brand-200 bg-white py-2 pl-9 pr-8 text-sm font-medium text-slate-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            >
              {[node.ownerName, ...SOP_OWNER_OPTIONS.filter((o) => o !== node.ownerName)].map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={2} />
          </div>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Where this node sits in the graph, first so the reader can move
            through the flow without scrolling past the run detail. */}
        <Section title="Connections" count={parents.length + children.length}>
          <div className="space-y-3">
            <div>
              <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <ArrowUp className="h-3 w-3" strokeWidth={2.5} />
                Parents ({parents.length})
              </p>
              <div className="mt-1">
                <NodeLinks nodes={parents} edges={sop.edges} nodeId={node.id} direction="in" onSelect={onSelectNode} />
              </div>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <ArrowDown className="h-3 w-3" strokeWidth={2.5} />
                Children ({children.length})
              </p>
              <div className="mt-1">
                <NodeLinks nodes={children} edges={sop.edges} nodeId={node.id} direction="out" onSelect={onSelectNode} />
              </div>
            </div>
          </div>
        </Section>

        {!versionMode && (
        <Section title="Logs" count={run?.logs.length}>
          {run && run.logs.length > 0 ? (
            <ol className="space-y-2">
              {run.logs.map((l, i) => (
                <li key={i} className="text-sm leading-relaxed">
                  <span className="mr-2 font-mono text-[11px] text-slate-400">{formatLogTime(l.at)}</span>
                  <span className={l.level === "error" ? "text-red-600" : l.level === "warn" ? "text-amber-700" : "text-slate-700"}>{l.message}</span>
                </li>
              ))}
            </ol>
          ) : (
            <Empty>No logs. This node has not run yet.</Empty>
          )}
          {run && run.errors.length > 0 && (
            <div className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-red-600">Errors</p>
              <ul className="mt-1 space-y-1 text-sm text-red-700">
                {run.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          {run && run.issues.length > 0 && (
            <div className="mt-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Needs investigation</p>
              <ul className="mt-1 space-y-1 text-sm text-amber-800">
                {run.issues.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </Section>

        )}

        {!versionMode && (
        <Section title="Objects Created" count={run?.objectsCreated.length}>
          {run && run.objectsCreated.length > 0 ? (
            <ul className="space-y-1.5">
              {run.objectsCreated.map((o, i) => (
                <li key={i} className="flex items-baseline gap-2 text-sm">
                  <span className="text-slate-800">{o.label}</span>
                  <span className="text-xs text-slate-400">{o.kind}</span>
                  {o.ref && <span className="ml-auto font-mono text-[11px] text-slate-400">{o.ref}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Nothing created on the last run.</Empty>
          )}
        </Section>

        )}

        <Section title="Definition">
          <Field label="Trigger">{node.trigger || <span className="text-slate-400">Not stated</span>}</Field>
          <Field label="Work">{node.work}</Field>
          <Field label="Actors">{node.actors.map((a) => SOP_ACTOR_LABELS[a]).join(", ")}</Field>
          <Field label="Hard constraints">
            {node.hardConstraints.length ? (
              <ul className="list-disc space-y-0.5 pl-4">
                {node.hardConstraints.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            ) : (
              <span className="text-slate-400">None declared</span>
            )}
          </Field>
          <Field label="Learned rules">
            {node.learnedRules.length ? (
              <ul className="list-disc space-y-0.5 pl-4">
                {node.learnedRules.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            ) : (
              <span className="text-slate-400">None yet</span>
            )}
          </Field>
          <Field label="Done when">{node.successCriteria}</Field>
          <Field label="Verification">{VERIFICATION_LABEL[node.verification]}</Field>
          <Field label="Autonomy">
            <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-700">{node.autonomy}</span>
            {SOP_AUTONOMY_LABELS[node.autonomy]}
          </Field>
          <Field label="Provenance">{node.provenance === "stated" ? "Stated by the operator" : "Inferred by Stella"}</Field>
        </Section>

        <Section title="Info">
          {!versionMode && <Field label="Runtime">{run ? formatRuntime(run.runtimeSeconds) : "—"}</Field>}
          {!versionMode && <Field label="Subtasks Triggered">{run ? run.subtasksTriggered : "—"}</Field>}
          <Field label="Where · When">
            {node.where} · {node.when}
          </Field>
          <Field label={versionMode ? "Node ID" : "Instance ID"}>
            <span className="font-mono text-xs">{instanceId}</span>
          </Field>
          <Field label="Kind">
            <span className="capitalize">{node.kind}</span>
          </Field>
          {!versionMode && (
            <Field label="All runs">
              {node.stats.runs} runs · {node.stats.objectsCreated} objects · {node.stats.errors} errors · {node.stats.issues} issues
            </Field>
          )}
        </Section>
      </div>
    </div>
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
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" strokeWidth={2} /> : <ChevronDown className="h-4 w-4 text-slate-400" strokeWidth={2} />}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="text-[11px] text-slate-400">{label}</p>
      <div className="mt-0.5 text-sm leading-relaxed text-slate-800">{children}</div>
    </div>
  );
}

// One row per neighbour. `direction` says which end of the edge this node is
// on, so the row can carry the branch label that leads to or from it.
function NodeLinks({
  nodes,
  edges,
  nodeId,
  direction,
  onSelect,
}: {
  nodes: SopNode[];
  edges: Sop["edges"];
  nodeId: string;
  direction: "in" | "out";
  onSelect: (id: string) => void;
}) {
  if (nodes.length === 0) {
    return <span className="text-sm text-slate-400">{direction === "in" ? "None. This is where the Automation starts." : "None. This is where the Automation ends."}</span>;
  }
  return (
    <div className="flex flex-col items-stretch gap-1">
      {nodes.map((n) => {
        const label = edges.find((e) =>
          direction === "in" ? e.from === n.id && e.to === nodeId : e.from === nodeId && e.to === n.id,
        )?.label;
        return (
          <button
            key={n.id}
            type="button"
            onClick={() => onSelect(n.id)}
            className="group flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-left transition-colors hover:border-brand-300 hover:bg-brand-50"
          >
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 group-hover:text-brand-700">{n.title}</span>
            {label && (
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">{label}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-slate-400">{children}</p>;
}
