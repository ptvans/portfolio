// SOP aggregate analysis — the third view of an SOP.
//
// The definition view is the SOP as written. A run view is one execution of
// it. This is every execution at once: which steps cost the time, which ones
// keep raising issues, which way each decision actually goes, and where the
// SOP asks for a tool Brick does not have. It is the view that tells you
// whether the document is any good, as opposed to what it says.
//
// Everything here is derived from the run history; nothing is stored.

import { ArrowLeft, GitBranch, Timer, TriangleAlert, Wrench, X } from "lucide-react";
import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { StatCard } from "../../../components/Card";
import { EmptyState } from "../../../components/EmptyState";
import { getBrand, nodeRunsForRun, runsForSop } from "../../../data";
import type { SopNode, SopNodeRun, SopRun } from "../../../types/domain";
import { ACTION_KIND_LABEL } from "../components/sop/SopActionGutter";
import { SopTopBar } from "../components/sop/SopTopBar";
import {
  EXECUTOR_LABEL,
  executorFor,
  formatDateTimeShort,
  formatDuration,
  formatRuntime,
  RUN_STATUS_LABEL,
  RUN_STATUS_STYLE,
} from "../components/sop/sopFormat";
import { useSops } from "../context/SopContext";
import { Workflow } from "lucide-react";

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

// A run that failed has no completedAt; its span ends at the last node that ran.
function runEndedAt(run: SopRun): string | null {
  if (run.completedAt) return run.completedAt;
  const last = nodeRunsForRun(run.id).at(-1);
  return last ? new Date(new Date(last.startedAt).getTime() + last.runtimeSeconds * 1000).toISOString() : null;
}

interface NodeRollup {
  node: SopNode;
  ran: number; // runs in which this step executed at all
  medianSeconds: number | null;
  totalSeconds: number;
  failures: number;
  issues: number;
  objects: number;
  subtasks: number;
}

export function SopAnalysis() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getSop } = useSops();
  const sop = getSop(id);
  const runs = useMemo(() => (id ? runsForSop(id) : []), [id]);

  // One pass over the history: every node run, grouped by the node it belongs
  // to and by the run it came from.
  const { byNode, byRun } = useMemo(() => {
    const byNode = new Map<string, SopNodeRun[]>();
    const byRun = new Map<string, SopNodeRun[]>();
    for (const run of runs) {
      const nodeRuns = nodeRunsForRun(run.id);
      byRun.set(run.id, nodeRuns);
      for (const nr of nodeRuns) {
        const list = byNode.get(nr.nodeId);
        if (list) list.push(nr);
        else byNode.set(nr.nodeId, [nr]);
      }
    }
    return { byNode, byRun };
  }, [runs]);

  const rollups = useMemo<NodeRollup[]>(() => {
    if (!sop) return [];
    return sop.nodes
      .map((node) => {
        const nodeRuns = byNode.get(node.id) ?? [];
        const seconds = nodeRuns.map((r) => r.runtimeSeconds);
        return {
          node,
          ran: nodeRuns.length,
          medianSeconds: median(seconds),
          totalSeconds: seconds.reduce((a, b) => a + b, 0),
          failures: nodeRuns.filter((r) => r.status === "failed").length,
          issues: nodeRuns.reduce((a, r) => a + r.issues.length + r.errors.length, 0),
          objects: nodeRuns.reduce((a, r) => a + r.objectsCreated.length, 0),
          subtasks: nodeRuns.reduce((a, r) => a + r.subtasksTriggered, 0),
        };
      })
      .filter((r) => r.ran > 0);
  }, [sop, byNode]);

  // Which way each decision actually went. A branch "taken" means the step it
  // leads to also ran in that run; a looping SOP can take both in one run, so
  // these are counts of runs, not a split that adds to 100%.
  const decisions = useMemo(() => {
    if (!sop) return [];
    return sop.nodes
      .filter((n) => n.kind === "decision" && (byNode.get(n.id)?.length ?? 0) > 0)
      .map((node) => {
        const branches = sop.edges
          .filter((e) => e.from === node.id)
          .map((edge) => {
            const target = sop.nodes.find((n) => n.id === edge.to);
            let taken = 0;
            for (const run of runs) {
              const nodeRuns = byRun.get(run.id) ?? [];
              if (!nodeRuns.some((r) => r.nodeId === node.id)) continue;
              if (nodeRuns.some((r) => r.nodeId === edge.to)) taken += 1;
            }
            return { label: edge.label ?? "Continue", target: target?.title ?? edge.to, taken };
          });
        return { node, branches, ran: byNode.get(node.id)?.length ?? 0 };
      });
  }, [sop, byNode, byRun, runs]);

  // Where runs stopped short, and on which step.
  const stops = useMemo(
    () =>
      runs
        .filter((r) => r.status === "failed" || r.status === "escalated")
        .map((run) => {
          const nodeRuns = byRun.get(run.id) ?? [];
          const broke = nodeRuns.find((r) => r.status === "failed") ?? nodeRuns.find((r) => r.errors.length > 0);
          const node = sop?.nodes.find((n) => n.id === broke?.nodeId);
          return { run, node, reason: broke?.errors[0] ?? broke?.issues[0] ?? "Escalated for a person to decide." };
        }),
    [runs, byRun, sop],
  );

  // The tooling the document asks for and Brick does not have. These come from
  // the same detection that fills the document's gutter.
  const gaps = useMemo(() => {
    if (!sop) return [];
    return sop.nodes.flatMap((node) =>
      node.actions.filter((a) => a.status === "missing").map((action) => ({ node, action })),
    );
  }, [sop]);

  const actionTotals = useMemo(() => {
    const all = (sop?.nodes ?? []).flatMap((n) => n.actions);
    return {
      total: all.length,
      confirmed: all.filter((a) => a.status === "confirmed").length,
      detected: all.filter((a) => a.status === "detected").length,
    };
  }, [sop]);

  if (!sop) {
    return (
      <div className="flex h-screen flex-col bg-slate-50">
        <SopTopBar />
        <div className="p-8">
          <EmptyState icon={Workflow} title="Automation not found" description={`No Automation with id "${id}".`} />
          <Link to="/internal-ops/sops/list" className="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline">
            Back to Automations
          </Link>
        </div>
      </div>
    );
  }

  const brand = sop.brandId ? getBrand(sop.brandId) : undefined;
  const detailTo = `/internal-ops/sops/${sop.id}`;
  const succeeded = runs.filter((r) => r.status === "succeeded").length;
  const durations = runs
    .map((r) => {
      const end = runEndedAt(r);
      return end ? Math.round((new Date(end).getTime() - new Date(r.startedAt).getTime()) / 1000) : null;
    })
    .filter((d): d is number => d !== null);
  const medianRun = median(durations);
  const medianTouches = median(runs.map((r) => r.humanTouches));
  const escalations = runs.reduce((a, r) => a + r.escalations, 0);
  const slowest = [...rollups].sort((a, b) => (b.medianSeconds ?? 0) - (a.medianSeconds ?? 0))[0];
  const noisiest = [...rollups].sort((a, b) => b.issues - a.issues)[0];
  const maxTouches = Math.max(1, ...runs.map((r) => r.humanTouches));

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
      <SopTopBar />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 pb-12 pt-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <nav className="flex items-center gap-1.5 text-sm text-slate-400">
                <Link to="/internal-ops/sops/list" className="hover:text-slate-600">
                  Automations
                </Link>
                <span>/</span>
                {brand && (
                  <>
                    <Link to={`/internal-ops/brands/${brand.id}`} className="hover:text-slate-600">
                      {brand.name}
                    </Link>
                    <span>/</span>
                  </>
                )}
                <Link to={detailTo} className="hover:text-slate-600">
                  {sop.name}
                </Link>
                <span>/</span>
              </nav>
              <h1 className="mt-0.5 text-lg font-semibold text-slate-900">Aggregate analysis</h1>
              <p className="mt-1 text-sm text-slate-500">
                {runs.length === 0
                  ? "No runs yet, so there is nothing to aggregate."
                  : `Every run of this Automation, ${formatDateTimeShort(runs.at(-1)?.startedAt ?? null)} to ${formatDateTimeShort(runs[0]?.startedAt ?? null)}.`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(detailTo)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Close
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          {runs.length === 0 ? (
            <div className="mt-8">
              <EmptyState
                icon={Workflow}
                title="Nothing to analyse yet"
                description="This Automation has never run. The definition view is where to keep authoring it."
                action={
                  <Link
                    to={`/internal-ops/sops/${sop.id}/versions/${sop.version}`}
                    className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
                  >
                    Open the definition
                  </Link>
                }
              />
            </div>
          ) : (
            <>
              <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-5">
                <StatCard label="Runs" value={runs.length} hint={runs.at(-1)?.version === runs[0]?.version ? `All on v${runs[0]?.version}` : `Across v${runs.at(-1)?.version}–v${runs[0]?.version}`} accent="brand" />
                <StatCard label="Succeeded" value={`${Math.round((succeeded / runs.length) * 100)}%`} hint={`${succeeded} of ${runs.length}`} accent="brand" />
                <StatCard label="Median run" value={medianRun !== null ? formatRuntime(medianRun) : "—"} hint="Trigger to completion" accent="brand" />
                <StatCard label="Median human touches" value={medianTouches ?? "—"} hint="Per run" accent="brand" />
                <StatCard label="Escalations" value={escalations} hint="Across every run" accent="brand" />
              </div>

              {(slowest || noisiest) && (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {slowest && (
                    <Callout
                      icon={Timer}
                      tone="slate"
                      title="Costs the most time"
                      body={`"${slowest.node.title}" runs a median ${formatRuntime(slowest.medianSeconds ?? 0)}, ${Math.round(((slowest.totalSeconds / Math.max(1, durations.reduce((a, b) => a + b, 0))) * 100))}% of all time spent in this Automation.`}
                    />
                  )}
                  {noisiest && noisiest.issues > 0 && (
                    <Callout
                      icon={TriangleAlert}
                      tone="amber"
                      title="Raises the most issues"
                      body={`"${noisiest.node.title}" flagged ${noisiest.issues} thing${noisiest.issues === 1 ? "" : "s"} across ${noisiest.ran} run${noisiest.ran === 1 ? "" : "s"}.`}
                    />
                  )}
                </div>
              )}

              {/* ---------------- Step roll-up ---------------- */}
              <Section title="Every step, across every run" count={rollups.length}>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">Step</th>
                        <th className="px-4 py-3 font-medium">Runs by</th>
                        <th className="px-4 py-3 font-medium">Ran in</th>
                        <th className="px-4 py-3 font-medium">Median time</th>
                        <th className="px-4 py-3 font-medium">Share of time</th>
                        <th className="px-4 py-3 font-medium">Subtasks</th>
                        <th className="px-4 py-3 font-medium">Objects</th>
                        <th className="px-4 py-3 font-medium">Issues</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rollups.map((r) => {
                        const totalAll = rollups.reduce((a, x) => a + x.totalSeconds, 0);
                        const share = totalAll > 0 ? (r.totalSeconds / totalAll) * 100 : 0;
                        return (
                          <tr key={r.node.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <p className="font-medium text-slate-900">{r.node.title}</p>
                              {r.node.kind !== "step" && (
                                <span className="mt-0.5 inline-block rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                                  {r.node.kind}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-600">{EXECUTOR_LABEL[executorFor(r.node)]}</td>
                            <td className="px-4 py-3 text-slate-600">
                              {r.ran} of {runs.length}
                            </td>
                            <td className="px-4 py-3 text-slate-600">{r.medianSeconds !== null ? formatRuntime(r.medianSeconds) : "—"}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                                  <span className="block h-full rounded-full bg-brand-400" style={{ width: `${Math.max(2, share)}%` }} />
                                </span>
                                <span className="text-xs text-slate-500">{share.toFixed(0)}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{r.subtasks}</td>
                            <td className="px-4 py-3 text-slate-600">{r.objects}</td>
                            <td className="px-4 py-3">
                              {r.failures > 0 && (
                                <span className="mr-1.5 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">{r.failures} failed</span>
                              )}
                              {r.issues > 0 ? (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">{r.issues} flagged</span>
                              ) : (
                                r.failures === 0 && <span className="text-slate-400">0</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Section>

              {/* ---------------- Decisions ---------------- */}
              {decisions.length > 0 && (
                <Section title="Which way the decisions go" count={decisions.length}>
                  <p className="-mt-2 mb-3 text-xs text-slate-500">
                    A path counts as taken when the step it leads to also ran. This Automation loops per work order, so a single run can
                    take both paths out of the same decision — these are run counts, not a split.
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {decisions.map(({ node, branches, ran }) => (
                      <div key={node.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="flex items-start gap-1.5 text-sm font-medium text-slate-900">
                          <GitBranch className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" strokeWidth={2.25} />
                          {node.title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400">Reached in {ran} of {runs.length} runs</p>
                        <ul className="mt-3 space-y-2">
                          {branches.map((b) => (
                            <li key={b.label + b.target}>
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="truncate text-xs font-medium text-slate-700" title={`${b.label} → ${b.target}`}>
                                  {b.label}
                                </span>
                                <span className="shrink-0 text-xs text-slate-500">
                                  {b.taken} of {ran}
                                </span>
                              </div>
                              <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-100">
                                <span
                                  className="block h-full rounded-full bg-brand-400"
                                  style={{ width: `${ran > 0 ? (b.taken / ran) * 100 : 0}%` }}
                                />
                              </span>
                              <p className="mt-0.5 truncate text-[11px] text-slate-400">→ {b.target}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* ---------------- Where runs stop ---------------- */}
              <Section title="Runs that did not finish clean" count={stops.length}>
                {stops.length === 0 ? (
                  <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                    Every run completed without failing or escalating.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {stops.map(({ run, node, reason }) => (
                      <li key={run.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${RUN_STATUS_STYLE[run.status]}`}>
                            {RUN_STATUS_LABEL[run.status]}
                          </span>
                          <Link to={`/internal-ops/sops/${sop.id}/runs/${run.id}`} className="text-sm font-medium text-slate-900 hover:text-brand-600">
                            {run.label}
                          </Link>
                          <span className="text-xs text-slate-400">
                            {formatDuration(run.startedAt, runEndedAt(run))} · {run.humanTouches} human touches
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          {node && <span className="font-medium text-slate-800">{node.title}: </span>}
                          {reason}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              {/* ---------------- Human touches over time ---------------- */}
              <Section title="Human touches per run" count={runs.length}>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                  <ul className="space-y-1.5">
                    {[...runs].reverse().map((run) => (
                      <li key={run.id} className="flex items-center gap-3">
                        <Link
                          to={`/internal-ops/sops/${sop.id}/runs/${run.id}`}
                          className="w-52 shrink-0 truncate text-xs text-slate-600 hover:text-brand-600"
                          title={run.label}
                        >
                          {run.label}
                        </Link>
                        <span className="h-3 min-w-0 flex-1 overflow-hidden rounded bg-slate-100">
                          <span
                            className={`block h-full rounded ${run.status === "succeeded" ? "bg-brand-400" : "bg-amber-400"}`}
                            style={{ width: `${(run.humanTouches / maxTouches) * 100}%` }}
                          />
                        </span>
                        <span className="w-6 shrink-0 text-right text-xs tabular-nums text-slate-500">{run.humanTouches}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Section>

              {/* ---------------- Tooling gaps ---------------- */}
              <Section title="Tooling the document asks for" count={actionTotals.total}>
                <p className="-mt-2 mb-3 text-xs text-slate-500">
                  {actionTotals.total} tool calls detected across the document — {actionTotals.confirmed} confirmed,{" "}
                  {actionTotals.detected} still unchecked, {gaps.length} with no tool behind them.
                </p>
                {gaps.length === 0 ? (
                  <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                    Every action in this Automation maps to a tool that exists.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {gaps.map(({ node, action }) => (
                      <li key={action.id} className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <Wrench className="h-3.5 w-3.5 shrink-0 translate-y-0.5 text-amber-600" strokeWidth={2.25} />
                          <code className="font-mono text-xs text-amber-900">{action.tool}</code>
                          <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700">
                            {ACTION_KIND_LABEL[action.kind]}
                          </span>
                          <span className="text-xs text-slate-500">in “{node.title}”</span>
                        </div>
                        <p className="mt-1 text-sm text-amber-900">{action.label}</p>
                        <p className="mt-0.5 text-xs text-amber-800">{action.gap}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <div className="mt-8 flex flex-wrap gap-2">
                <Link
                  to={`/internal-ops/sops/${sop.id}/versions/${sop.version}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" strokeWidth={2} />
                  Open the definition
                </Link>
                {runs[0] && (
                  <Link
                    to={`/internal-ops/sops/${sop.id}/runs/${runs[0].id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Open the latest run
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
        {title}
        {count !== undefined && <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">{count}</span>}
      </h2>
      {children}
    </section>
  );
}

function Callout({
  icon: Icon,
  tone,
  title,
  body,
}: {
  icon: typeof Timer;
  tone: "slate" | "amber";
  title: string;
  body: string;
}) {
  const tint = tone === "amber" ? "border-amber-200 bg-amber-50/60 text-amber-900" : "border-slate-200 bg-white text-slate-700";
  const iconTint = tone === "amber" ? "text-amber-600" : "text-slate-400";
  return (
    <div className={`flex items-start gap-2 rounded-xl border px-4 py-3 shadow-sm ${tint}`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconTint}`} strokeWidth={2} />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{title}</p>
        <p className="mt-0.5 text-sm">{body}</p>
      </div>
    </div>
  );
}
