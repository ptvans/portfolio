// SOP authoring page — a focused, full-window workspace in three columns:
//
//   1. Stella chat: authors and modifies the document and its nodes. Version
//      view only; the run view is a read-only record and has no chat.
//   2. The middle pane, which holds one of two things. By default the document
//      editor: the SOP as prose, one block per step, each block's detected
//      tool calls in the gutter beside it. "Open graph" in the header's
//      overflow menu swaps in the graph, which draws either the whole flow or
//      just the selected node and its immediate neighbours (the Whole flow /
//      Focus toggle). Blocks and nodes share a selection either way.
//   3. Node inspector: run status, logs, objects created, definition, lineage.
//
// Reached per run instance (sops/:id/runs/:runId), in which case the graph
// and inspector describe what each node did in that run and the document is
// read-only (three columns); or per published version
// (sops/:id/versions/:version), where the SOP is shown as defined at that
// version with no runtime analytics and can be edited with Stella's help (four
// columns). Either way the document shown is the one that version carried.
// Edits are held here until Save publishes the next version.

import { ChevronDown, Maximize2, MoreHorizontal, PanelLeftOpen, PanelRightClose, PanelRightOpen, X, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { EmptyState } from "../../../components/EmptyState";
import { getBrand, getSopRun, nodeRunsForRun, runsForSop, sopAtVersion, stateModelAsGraph, stateModelForSop, statesById } from "../../../data";
import type { SopAction, SopAttachment, SopDocBlock, SopNodeHealth, SopNodeRun } from "../../../types/domain";
import { attachmentFromFile, SopDocumentEditor } from "../components/sop/SopDocumentEditor";
import { SopGraph } from "../components/sop/SopGraph";
import { SopNodeInspector } from "../components/sop/SopNodeInspector";
import { SopStateInspector } from "../components/sop/SopStateInspector";
import { StellaChat } from "../components/sop/StellaChat";
import { formatDateTimeShort, formatDuration, RUN_STATUS_LABEL, RUN_STATUS_STYLE, runHealth } from "../components/sop/sopFormat";
import { useSops } from "../context/SopContext";
import { Workflow } from "lucide-react";

export function SopAuthor() {
  const { id, runId, version: versionParam } = useParams<{ id: string; runId?: string; version?: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { sops, getSop, saveSop, setNodeOwner, confirmAction, nodePositions, moveNode, resetNodePositions } = useSops();
  const sop = getSop(id);

  // The run instance this view is scoped to, and what each node did in it.
  const sopRun = runId ? getSopRun(runId) : undefined;
  // Which published version the document and graph show: the run's, or the
  // one in the URL. Falls back to the current version.
  const viewVersion = sopRun?.version ?? (versionParam ? Number(versionParam) : undefined) ?? sop?.version ?? 1;
  const sopVersion = sop?.versions.find((v) => v.version === viewVersion);
  const versionMode = !sopRun;
  const atVersion = useMemo(() => (sop ? sopAtVersion(sop, viewVersion) : { blocks: [], nodes: [] }), [sop, viewVersion]);
  // The SOP as it stood at the viewed version, for the graph and inspector.
  const viewSop = useMemo(() => (sop ? { ...sop, nodes: atVersion.nodes, blocks: atVersion.blocks } : sop), [sop, atVersion]);
  const runByNode = useMemo(() => {
    if (!sopRun) return undefined;
    const map: Record<string, SopNodeRun | undefined> = {};
    for (const nr of nodeRunsForRun(sopRun.id)) map[nr.nodeId] = nr;
    return map;
  }, [sopRun]);
  const allRuns = useMemo(() => (id ? runsForSop(id) : []), [id]);

  // ---- Lens: the workflow the operator runs, or the states the subject moves
  // through. Only offered for SOPs that have a state model authored for them.
  const stateModel = id ? stateModelForSop(id) : undefined;
  const lens = stateModel && params.get("lens") === "states" ? "states" : "workflow";
  const setLens = (next: "workflow" | "states") => {
    const p = new URLSearchParams(params);
    if (next === "workflow") p.delete("lens");
    else p.set("lens", next);
    setParams(p, { replace: true });
  };
  const stateGraph = useMemo(() => (stateModel ? stateModelAsGraph(stateModel) : null), [stateModel]);
  const stateLookup = useMemo(() => (stateModel ? statesById(stateModel) : {}), [stateModel]);
  const selectedStateId = params.get("state") ?? stateModel?.start ?? null;
  const selectedState = stateModel && selectedStateId ? stateLookup[selectedStateId] : undefined;
  const selectState = useCallback(
    (stateId: string) => {
      const p = new URLSearchParams(params);
      p.set("state", stateId);
      setParams(p, { replace: true });
      setInspectorOpen(true);
    },
    [params, setParams],
  );
  // Status dot per node for the run view's document blocks.
  const blockHealth = useMemo(() => {
    if (!runByNode || !sop) return undefined;
    const map: Record<string, SopNodeHealth> = {};
    for (const n of sop.nodes) map[n.id] = runHealth(runByNode[n.id]);
    return map;
  }, [runByNode, sop]);

  const actionsByNode = useMemo(() => {
    const map: Record<string, SopAction[]> = {};
    for (const n of viewSop?.nodes ?? []) if (n.actions.length > 0) map[n.id] = n.actions;
    return map;
  }, [viewSop]);

  const fullGraph = params.get("view") === "graph";
  const setView = (view: "graph" | null) => {
    const next = new URLSearchParams(params);
    if (view) next.set("view", view);
    else next.delete("view");
    setParams(next, { replace: true });
  };

  // How much of the flow the graph pane draws: the whole thing, or just the
  // selected node and what it touches. Both live in the one pane.
  const scope = params.get("scope") === "focus" ? "focus" : "whole";
  const setScope = (next: "whole" | "focus") => {
    const p = new URLSearchParams(params);
    if (next === "whole") p.delete("scope");
    else p.set("scope", next);
    setParams(p, { replace: true });
  };

  // ---- Selection: node ⇄ block -------------------------------------------
  // Land on the node that needs attention: in a run, the one that failed or
  // raised an issue; otherwise the SOP's failing node, else the first step.
  const defaultNodeId = useMemo(() => {
    if (!viewSop) return null;
    if (runByNode) {
      const failed = viewSop.nodes.find((n) => runByNode[n.id]?.status === "failed");
      if (failed) return failed.id;
      const flagged = viewSop.nodes.find((n) => {
        const nr = runByNode[n.id];
        return nr && (nr.issues.length > 0 || nr.errors.length > 0);
      });
      if (flagged) return flagged.id;
      return viewSop.nodes.find((n) => n.kind === "step")?.id ?? viewSop.nodes[0]?.id ?? null;
    }
    // A version has no failing node; start at the first step.
    return viewSop.nodes.find((n) => n.kind === "step")?.id ?? viewSop.nodes[0]?.id ?? null;
  }, [viewSop, runByNode]);
  const selectedNodeId = params.get("node") ?? defaultNodeId;
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  // The run view opens on the node that needs attention, inspector and all.
  // The version view is for reading and authoring the document, so the
  // inspector stays closed until a node or block is picked.
  const [inspectorOpen, setInspectorOpen] = useState(!versionMode);
  // The Stella column folds into a narrow tray so the document and graph can
  // take the width. It stays mounted while collapsed, so the conversation
  // survives; Modify w/ prompt reopens it.
  const [chatOpen, setChatOpen] = useState(true);
  // The document's right gutter: the actions and tool calls Stella read out of
  // each section. On by default wherever a SOP has any, because composing the
  // SOP accurately is what the gutter is for.
  const [gutterOpen, setGutterOpen] = useState(true);

  const selectNode = useCallback(
    (nodeId: string) => {
      const next = new URLSearchParams(params);
      next.set("node", nodeId);
      setParams(next, { replace: true });
      const block = sop?.blocks.find((b) => b.nodeId === nodeId);
      setSelectedBlockId(block?.id ?? null);
      setInspectorOpen(true);
    },
    [params, setParams, sop],
  );

  // ---- Working copy of the document ---------------------------------------
  // Seeded from the viewed version's document. Saving publishes it as the next
  // version of the SOP, whichever version it was based on.
  const [blocks, setBlocks] = useState<SopDocBlock[]>(atVersion.blocks);
  const [attachments, setAttachments] = useState<SopAttachment[]>(sop?.attachments ?? []);
  const [justSaved, setJustSaved] = useState(false);

  // Re-seed the working copy when a different SOP or version loads, or a save lands.
  useEffect(() => {
    setBlocks(atVersion.blocks);
    setAttachments(sop?.attachments ?? []);
  }, [sop?.id, sop?.version, atVersion.blocks, sop?.attachments]);

  const dirty = useMemo(
    () => !!sop && (JSON.stringify(blocks) !== JSON.stringify(atVersion.blocks) || JSON.stringify(attachments) !== JSON.stringify(sop.attachments)),
    [sop, atVersion.blocks, blocks, attachments],
  );
  useEffect(() => {
    if (dirty) setJustSaved(false);
  }, [dirty]);

  const changeBlock = (blockId: string, patch: Partial<Pick<SopDocBlock, "heading" | "body">>) =>
    setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, ...patch } : b)));

  const selectBlock = (blockId: string) => {
    setSelectedBlockId(blockId);
    const block = blocks.find((b) => b.id === blockId);
    // Selecting a block moves the graph and inspector to its node but never
    // opens a closed inspector: clicking into the text to edit shouldn't
    // reflow the page. The graph cards and the Inspect button open it.
    if (block?.nodeId && block.nodeId !== selectedNodeId) {
      const next = new URLSearchParams(params);
      next.set("node", block.nodeId);
      setParams(next, { replace: true });
    }
  };

  // ---- Stella ---------------------------------------------------------------
  const [attachedBlockId, setAttachedBlockId] = useState<string | null>(null);
  const [focusSignal, setFocusSignal] = useState(0);
  const attachedBlock = blocks.find((b) => b.id === attachedBlockId) ?? null;

  const modifyWithPrompt = (block: SopDocBlock) => {
    setAttachedBlockId(block.id);
    setChatOpen(true);
    setFocusSignal((n) => n + 1);
  };

  const applyStellaEdit = (blockId: string, prompt: string) => {
    const stamp = new Date().toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" });
    const sentence = prompt.replace(/\s+/g, " ").trim().replace(/[.]*$/, ".");
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, body: `${b.body.trimEnd()}\n\n+ Added by Stella, ${stamp}: ${sentence}` } : b)),
    );
    setSelectedBlockId(blockId);
  };

  if (!sop || !viewSop) {
    return (
      <div className="flex h-full flex-col bg-slate-50">
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
  const selectedNode = viewSop.nodes.find((n) => n.id === selectedNodeId) ?? null;
  const run = selectedNode && runByNode ? runByNode[selectedNode.id] : undefined;
  const closeTo = `/internal-ops/sops/${sop.id}${versionMode ? "?tab=versions" : ""}`;
  const isCurrentVersion = viewVersion === sop.version;
  // Something for the inspector to show under the current lens.
  const inspectorTarget = lens === "states" ? !!selectedState : !!selectedNode;
  const runEnded = sopRun
    ? sopRun.completedAt ??
      (() => {
        const last = nodeRunsForRun(sopRun.id).at(-1);
        return last ? new Date(new Date(last.startedAt).getTime() + last.runtimeSeconds * 1000).toISOString() : null;
      })()
    : null;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-50">

      <div
        className={`grid min-h-0 flex-1 ${
          versionMode
            ? inspectorOpen && inspectorTarget
              ? chatOpen
                ? "grid-cols-[380px_minmax(0,1fr)_420px]"
                : "grid-cols-[48px_minmax(0,1fr)_420px]"
              : chatOpen
                ? "grid-cols-[380px_minmax(0,1fr)]"
                : "grid-cols-[48px_minmax(0,1fr)]"
            : inspectorOpen && inspectorTarget
              ? "grid-cols-[minmax(0,1fr)_420px]"
              : "grid-cols-[minmax(0,1fr)]"
        }`}
      >
        {/* ---------------- 1. Stella (version view only) ---------------- */}
        {versionMode && (
          <aside className="min-h-0 border-r border-slate-200 bg-white">
            {/* Hidden rather than unmounted while collapsed: the chat log and
                any half-typed prompt stay put. */}
            <div className={chatOpen ? "h-full" : "hidden"}>
              <StellaChat
                key={`v${viewVersion}`}
                sop={sop}
                version={sopVersion}
                attachedBlock={attachedBlock}
                onDetachBlock={() => setAttachedBlockId(null)}
                onApplyEdit={applyStellaEdit}
                focusSignal={focusSignal}
                onCollapse={() => setChatOpen(false)}
              />
            </div>
            {!chatOpen && <StellaTray onExpand={() => setChatOpen(true)} attached={attachedBlock !== null} />}
          </aside>
        )}

        {/* ---------------- 2 + 3. Document and graph ---------------- */}
        <section className="flex min-h-0 min-w-0 flex-col px-4 pb-4 pt-3">
          <div className="flex shrink-0 items-start justify-between gap-4 pb-3">
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
                <Link to={`/internal-ops/sops/${sop.id}`} className="hover:text-slate-600">
                  {sop.name}
                </Link>
                <span>/</span>
                <Link to={closeTo} className="hover:text-slate-600">
                  {versionMode ? "Versions" : "Runs"}
                </Link>
                <span>/</span>
              </nav>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <h1 className="text-lg font-semibold text-slate-900">
                  Automation {sop.name}
                  <span className="ml-2 text-sm font-normal text-slate-400">v{viewVersion}</span>
                </h1>
                {sopRun ? (
                  <RunPicker
                    runs={allRuns}
                    current={sopRun}
                    onPick={(rid) => navigate(`/internal-ops/sops/${sop.id}/runs/${rid}`)}
                  />
                ) : (
                  <VersionPicker
                    versions={sop.versions}
                    current={viewVersion}
                    latest={sop.version}
                    onPick={(v) => navigate(`/internal-ops/sops/${sop.id}/versions/${v}`)}
                  />
                )}
              </div>
              {versionMode && sopVersion && (
                <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                  <span className={`rounded-full px-2 py-0.5 font-medium ${isCurrentVersion ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                    {isCurrentVersion ? "Current version" : "Superseded"}
                  </span>
                  <span>Published {formatDateTimeShort(sopVersion.publishedAt)}</span>
                  <span className="text-slate-300">·</span>
                  <span>by {sopVersion.publishedBy}</span>
                  <span className="text-slate-300">·</span>
                  <span>{allRuns.filter((r) => r.version === viewVersion).length} runs on this version</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-600">{sopVersion.note}</span>
                </p>
              )}
              {sopRun && (
                <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                  <span className={`rounded-full px-2 py-0.5 font-medium ${RUN_STATUS_STYLE[sopRun.status]}`}>{RUN_STATUS_LABEL[sopRun.status]}</span>
                  <span>Started {formatDateTimeShort(sopRun.startedAt)}</span>
                  <span className="text-slate-300">·</span>
                  <span>
                    {sopRun.completedAt ? "Ended" : "Stopped"} {formatDateTimeShort(runEnded)}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span>{formatDuration(sopRun.startedAt, runEnded)}</span>
                  <span className="text-slate-300">·</span>
                  <span>{sopRun.humanTouches} human touches</span>
                  <span className="text-slate-300">·</span>
                  <span>{sopRun.escalations} escalations</span>
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ViewMenu
                items={[
                  {
                    label: inspectorOpen
                      ? "Hide inspector"
                      : `Inspect ${lens === "states" ? "state" : "node"}`,
                    icon: inspectorOpen ? PanelRightClose : PanelRightOpen,
                    disabled: !inspectorTarget,
                    onSelect: () => setInspectorOpen((v) => !v),
                  },
                  // The full graph closes from its own pane, where that control
                  // was deliberately placed; no second way to do it here.
                  ...(fullGraph
                    ? []
                    : [
                        {
                          label: "Open graph",
                          icon: Maximize2,
                          disabled: viewSop.nodes.length === 0,
                          onSelect: () => setView("graph"),
                        },
                      ]),
                ]}
              />
              <button
                type="button"
                onClick={() => navigate(closeTo)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Close
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </div>

          {fullGraph ? (
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {viewSop.nodes.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <EmptyState icon={Workflow} title="No nodes yet" description="Stella compiles the graph from the document when you save." />
                </div>
              ) : lens === "states" && stateGraph ? (
                <SopGraph
                  sop={stateGraph}
                  selectedId={selectedStateId}
                  onSelect={selectState}
                  scope={scope}
                  variant="state"
                  states={stateLookup}
                  moved={nodePositions[stateGraph.id]}
                  onMoveNode={(nodeId, pos) => moveNode(stateGraph.id, nodeId, pos)}
                  onResetLayout={() => resetNodePositions(stateGraph.id)}
                  className="h-full w-full"
                />
              ) : (
                <SopGraph
                  sop={viewSop}
                  selectedId={selectedNodeId}
                  onSelect={selectNode}
                  scope={scope}
                  runByNode={runByNode}
                  variant={versionMode ? "version" : "rollup"}
                  moved={nodePositions[sop.id]}
                  onMoveNode={(nodeId, pos) => moveNode(sop.id, nodeId, pos)}
                  onResetLayout={() => resetNodePositions(sop.id)}
                  className="h-full w-full"
                />
              )}
              {/* Controls on the left, Close Graph on the right. Scope first:
                  it decides how much of the flow the other two describe. */}
              <div className="absolute left-4 top-4 flex flex-wrap items-center gap-3">
                <ScopeToggle scope={scope} onPick={setScope} />
                {stateModel && <LensToggle lens={lens} onPick={setLens} />}
                {lens === "states" ? <StateLegend /> : versionMode ? <ExecutorLegend /> : <GraphLegend />}
              </div>
              <button
                type="button"
                onClick={() => setView(null)}
                className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              >
                Close Graph
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          ) : (
            // The document has the pane to itself; the graph lives behind
            // "Open graph". Capped so the prose keeps a readable measure on a
            // wide window rather than running the full width of the workspace.
            <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col">
              <SopDocumentEditor
                blocks={blocks}
                nodes={viewSop.nodes}
                attachments={attachments}
                selectedBlockId={selectedBlockId ?? blocks.find((b) => b.nodeId === selectedNodeId)?.id ?? null}
                onSelectBlock={selectBlock}
                onChangeBlock={changeBlock}
                onModifyWithPrompt={modifyWithPrompt}
                onAddAttachments={(files) => setAttachments((prev) => [...prev, ...Array.from(files).map(attachmentFromFile)])}
                onRemoveAttachment={(attId) => setAttachments((prev) => prev.filter((a) => a.id !== attId))}
                dirty={dirty}
                justSaved={justSaved}
                onSave={() => {
                  saveSop(sop.id, blocks, attachments);
                  setJustSaved(true);
                }}
                onCancel={() => {
                  setBlocks(atVersion.blocks);
                  setAttachments(sop.attachments);
                }}
                readOnly={!versionMode}
                blockHealth={blockHealth}
                actionsByNode={actionsByNode}
                showGutter={gutterOpen}
                onToggleGutter={() => setGutterOpen((v) => !v)}
                onConfirmAction={versionMode ? (nodeId, actionId) => confirmAction(sop.id, nodeId, actionId) : undefined}
              />
            </div>
          )}
        </section>

        {/* ---------------- 4. Inspector ---------------- */}
        {inspectorOpen && lens === "states" && stateModel && selectedState && (
          <aside className="min-h-0 border-l border-slate-200">
            <SopStateInspector
              model={stateModel}
              state={selectedState}
              sops={sops}
              onSelectState={selectState}
              onClose={() => setInspectorOpen(false)}
            />
          </aside>
        )}
        {inspectorOpen && lens === "workflow" && selectedNode && (
          <aside className="min-h-0 border-l border-slate-200">
            <SopNodeInspector
              sop={viewSop}
              node={selectedNode}
              run={run}
              mode={versionMode ? "version" : "run"}
              readOnly={!versionMode}
              onSelectNode={selectNode}
              onChangeOwner={(owner) => setNodeOwner(sop.id, selectedNode.id, owner)}
              onClose={() => setInspectorOpen(false)}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

// The workspace's view controls, folded behind one button so the header shows
// only the way out. Closes on a pick, on Escape, and on a click anywhere else.
function ViewMenu({
  items,
}: {
  items: { label: string; icon: LucideIcon; disabled?: boolean; onSelect: () => void }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="View options"
        title="View options"
        className={`inline-flex items-center rounded-lg border border-slate-300 px-2.5 py-2 text-slate-700 transition-colors hover:bg-slate-50 ${
          open ? "bg-slate-100" : "bg-white"
        }`}
      >
        <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 min-w-[12rem] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                item.onSelect();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
            >
              <item.icon className="h-4 w-4 shrink-0" strokeWidth={2} />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Jump between this SOP's run instances without leaving the workspace.
function RunPicker({
  runs,
  current,
  onPick,
}: {
  runs: { id: string; label: string; version: number; status: keyof typeof RUN_STATUS_LABEL }[];
  current: { id: string };
  onPick: (runId: string) => void;
}) {
  return (
    <div className="relative">
      <select
        aria-label="Run instance"
        value={current.id}
        onChange={(e) => onPick(e.target.value)}
        className="appearance-none rounded-lg border border-slate-300 bg-white py-1 pl-3 pr-8 text-xs font-medium text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
      >
        {runs.map((r) => (
          <option key={r.id} value={r.id}>
            {r.label} · v{r.version} · {RUN_STATUS_LABEL[r.status]}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" strokeWidth={2} />
    </div>
  );
}

// Jump between this SOP's published versions.
function VersionPicker({
  versions,
  current,
  latest,
  onPick,
}: {
  versions: { version: number; publishedAt: string; publishedBy: string }[];
  current: number;
  latest: number;
  onPick: (version: number) => void;
}) {
  return (
    <div className="relative">
      <select
        aria-label="Automation version"
        value={current}
        onChange={(e) => onPick(Number(e.target.value))}
        className="appearance-none rounded-lg border border-slate-300 bg-white py-1 pl-3 pr-8 text-xs font-medium text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
      >
        {[...versions].reverse().map((v) => (
          <option key={v.version} value={v.version}>
            v{v.version}
            {v.version === latest ? " (current)" : ""} · {formatDateTimeShort(v.publishedAt)} · {v.publishedBy}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" strokeWidth={2} />
    </div>
  );
}

// Switches how much of the flow the pane draws: all of it, or the selected
// node with what feeds into it and what it leads to.
function ScopeToggle({ scope, onPick }: { scope: "whole" | "focus"; onPick: (s: "whole" | "focus") => void }) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 bg-white text-xs font-medium shadow-sm">
      {(
        [
          ["whole", "Whole flow", "Every step in the Automation"],
          ["focus", "Focus", "The selected step and its immediate neighbours"],
        ] as const
      ).map(([value, label, title]) => (
        <button
          key={value}
          type="button"
          title={title}
          onClick={() => onPick(value)}
          className={`px-3 py-1.5 transition-colors ${scope === value ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// Switches which graph the pane shows: the steps an operator runs, or the
// states the subject moves through.
function LensToggle({ lens, onPick }: { lens: "workflow" | "states"; onPick: (l: "workflow" | "states") => void }) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 bg-white text-xs font-medium shadow-sm">
      {(["workflow", "states"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onPick(l)}
          className={`px-3 py-1.5 transition-colors ${
            lens === l ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          {l === "workflow" ? "Workflow" : "States"}
        </button>
      ))}
    </div>
  );
}

function StateLegend() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-500 shadow-sm">
      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-400" /> Resting</span>
      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Active</span>
      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Exception</span>
    </div>
  );
}

function ExecutorLegend() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-500 shadow-sm">
      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> Person</span>
      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-400" /> Agent</span>
      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-400" /> Automation</span>
      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-400" /> External</span>
    </div>
  );
}

// The collapsed Stella column: a narrow tray with just the expand control.
// A dot on the control marks a block waiting to be sent.
function StellaTray({ onExpand, attached }: { onExpand: () => void; attached: boolean }) {
  return (
    <button
      type="button"
      onClick={onExpand}
      aria-label="Expand Stella"
      title="Expand Stella"
      className="group flex h-full w-full flex-col items-center gap-3 px-2 py-3 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
    >
      <span className="relative">
        <PanelLeftOpen className="h-4 w-4" strokeWidth={2} />
        {attached && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-white" aria-hidden />}
      </span>
    </button>
  );
}

function GraphLegend() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-500 shadow-sm">
      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Healthy</span>
      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> Needs attention</span>
      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Failing</span>
      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-300" /> Not yet run</span>
    </div>
  );
}
