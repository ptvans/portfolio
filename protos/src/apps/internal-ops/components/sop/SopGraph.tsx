// The SOP workflow graph, drawn with Cytoscape.js.
//
// Cytoscape owns layout space, edges, panning and zooming, and hit-testing. The
// node cards themselves are HTML: every Cytoscape node is an invisible
// rectangle of the card's size, and a pointer-transparent overlay renders a
// React card at each node's rendered position, scaled by the current zoom. That
// gives full-fidelity cards (coloured status lines, wrapped text) while the
// canvas keeps every mouse interaction.
//
// Two scopes share the component, both drawn in the graph pane:
//   whole — the entire workflow, main path running left to right and
//           escalation dropped into a lane below.
//   focus — just the selected node with its direct parents and children, and a
//           stub above / below any neighbour that continues further. The way
//           to read one step's immediate surroundings without the whole flow.

import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import { Maximize2, Minus, Plus, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Sop, SopNode, SopNodeHealth, SopNodeRun, SopState } from "../../../../types/domain";
import { SOP_AUTONOMY_LABELS } from "../../../../data";
import { executorFor, EXECUTOR_SENTENCE, formatRuntime, HEALTH_DOT, runHealth } from "./sopFormat";
import { useTheme, type Theme } from "../../../../lib/theme";

// Card geometry in graph units (== CSS px at zoom 1).
const CARD_W = 300;
const CARD_H = 116;
const PILL_W = 220;
const PILL_H = 52;
const STUB_W = 64;
const STUB_H = 22;
// Full layout: one column per step of the flow, running left to right without
// wrapping, and branches dropping into lanes below. The graph gets as wide as
// it needs to; panning beats a folded reading order.
const COL_GAP = 430; // between depth columns, centre to centre
const ROW_GAP = 205; // between lanes, centre to centre
const ESC_GAP = 250; // main flow to the first escalation lane
// A long left-to-right flow fits the pane only at an illegible scale, so the
// graph opens at this zoom anchored on the start instead. "Fit to view" still
// zooms all the way out for the overview.
const MIN_OPEN_ZOOM = 0.6;
// A forward edge that skips over a column lands exactly on top of the chain of
// edges it passes, hiding a real branch. Those arc into the empty gutter above
// their lane instead. Cytoscape's curve reaches about half its control-point
// distance, so these are twice the clearance we want.
const SKIP_BOW = 210; // one lane gutter of clearance
const SKIP_BOW_STEP = 300; // extra clearance per overlapping skip in a lane
const FOCUS_COL_GAP = 340;
const FOCUS_ROW_GAP = 230;

interface GraphNode {
  id: string;
  node: SopNode | null; // null → continuation stub
  w: number;
  h: number;
  x: number;
  y: number;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  stub?: boolean;
  // Travels right to left: a loop back rather than a step forward.
  back?: boolean;
  // Control-point distance for a forward edge that skips a column, so it arcs
  // clear of the chain it would otherwise be drawn on top of.
  bow?: number;
}

function sizeFor(node: SopNode): { w: number; h: number } {
  return node.kind === "trigger" || node.kind === "completion"
    ? { w: PILL_W, h: PILL_H }
    : { w: CARD_W, h: CARD_H };
}

// Full layout: a left-to-right layered flowchart. Each node sits one column to
// the right of its deepest parent (back edges that close a loop are ignored for
// placement). Within a column, a node takes its parent's lane where that lane
// is free, so a straight run of steps stays on one line and a branch drops to
// the lane below. Escalation nodes go in their own lanes under the whole flow,
// since several steps usually share one.
function fullLayout(sop: Sop, moved?: NodePositions): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const byId = new Map(sop.nodes.map((n) => [n.id, n]));
  const isSide = (id: string) => byId.get(id)?.kind === "escalation";
  const main = sop.nodes.filter((n) => !isSide(n.id));
  const side = sop.nodes.filter((n) => isSide(n.id));
  if (main.length === 0) return { nodes: [], edges: [] };

  const children = new Map<string, string[]>(sop.nodes.map((n) => [n.id, []]));
  for (const e of sop.edges) {
    if (isSide(e.to) || isSide(e.from)) continue; // side nodes don't drive layering
    children.get(e.from)?.push(e.to);
  }

  // Longest-path depth from the trigger (or the first node), DFS with a
  // visiting set so cycles (e.g. "changes requested" loops) don't recurse.
  const depth = new Map<string, number>();
  const visiting = new Set<string>();
  const root = sop.nodes.find((n) => n.kind === "trigger")?.id ?? main[0].id;
  const visit = (id: string, d: number) => {
    if (visiting.has(id)) return;
    if ((depth.get(id) ?? -1) >= d) return;
    depth.set(id, d);
    visiting.add(id);
    for (const c of children.get(id) ?? []) visit(c, d + 1);
    visiting.delete(id);
  };
  visit(root, 0);
  // Anything unreachable from the root (shouldn't happen) trails at the end.
  const maxDepth = Math.max(0, ...depth.values());
  main.filter((n) => !depth.has(n.id)).forEach((n, i) => depth.set(n.id, maxDepth + 1 + i));
  // Completion always sits at the end of the flow.
  const done = sop.nodes.find((n) => n.kind === "completion");
  if (done) depth.set(done.id, Math.max(...main.filter((n) => n.id !== done.id).map((n) => depth.get(n.id) ?? 0)) + 1);

  // Lane assignment, column by column. A node prefers its highest parent's
  // lane so a linear chain keeps one line; when that lane is already used in
  // this column the node drops to the next free lane down.
  const order = new Map(sop.nodes.map((n, i) => [n.id, i]));
  const ordered = [...main].sort(
    (a, b) => (depth.get(a.id) ?? 0) - (depth.get(b.id) ?? 0) || (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
  );
  const lane = new Map<string, number>();
  const usedLanes = new Map<number, Set<number>>();
  for (const n of ordered) {
    const d = depth.get(n.id) ?? 0;
    const parentLanes = sop.edges
      .filter((e) => e.to === n.id && !isSide(e.from) && (depth.get(e.from) ?? -1) < d && lane.has(e.from))
      .map((e) => lane.get(e.from) as number);
    const used = usedLanes.get(d) ?? new Set<number>();
    let l = parentLanes.length ? Math.min(...parentLanes) : 0;
    while (used.has(l)) l++;
    used.add(l);
    usedLanes.set(d, used);
    lane.set(n.id, l);
  }

  const nodes: GraphNode[] = [];
  const pos = new Map<string, { x: number; y: number }>();
  for (const n of main) {
    const x = (depth.get(n.id) ?? 0) * COL_GAP;
    const y = (lane.get(n.id) ?? 0) * ROW_GAP;
    pos.set(n.id, { x, y });
    nodes.push({ id: n.id, node: n, ...sizeFor(n), x, y });
  }

  // Escalations hang under the flow, at the average column of the steps that
  // feed them, stacked when two would land on the same column.
  const escTop = Math.max(0, ...lane.values()) * ROW_GAP + ESC_GAP;
  const escUsed = new Map<number, number>();
  for (const n of side) {
    const cols = sop.edges
      .filter((e) => e.to === n.id && depth.has(e.from))
      .map((e) => depth.get(e.from) as number);
    const col = cols.length ? Math.round(cols.reduce((a, c) => a + c, 0) / cols.length) : 0;
    const l = escUsed.get(col) ?? 0;
    escUsed.set(col, l + 1);
    const x = col * COL_GAP;
    const y = escTop + l * ROW_GAP;
    pos.set(n.id, { x, y });
    nodes.push({ id: n.id, node: n, ...sizeFor(n), x, y });
  }

  // Session drag overrides sit on top of the computed layout, so a node the
  // user moved keeps its spot until the layout is reset.
  const placedNodes = nodes.map((n) => {
    const at = moved?.[n.id];
    if (!at) return n;
    pos.set(n.id, at);
    return { ...n, x: at.x, y: at.y };
  });

  // An edge that travels right to left closes a loop rather than advancing the
  // flow, so it is drawn as a dashed arc that stays clear of the forward path.
  // Derived after the overrides so a dragged node reclassifies its edges.
  const edges: GraphEdge[] = sop.edges.map((e) => {
    const from = pos.get(e.from);
    const to = pos.get(e.to);
    const back = !!from && !!to && to.x < from.x;
    return { id: e.id, source: e.from, target: e.to, label: e.label, back };
  });

  // Forward edges that stay on one lane while skipping a column are collinear
  // with the chain beneath them. Arc each one above its lane, stacking the
  // clearance when two skips on the same lane cover overlapping columns.
  const skips = edges
    .map((e) => {
      const from = pos.get(e.source);
      const to = pos.get(e.target);
      if (!from || !to || e.back) return null;
      const span = Math.round((to.x - from.x) / COL_GAP);
      if (span <= 1 || Math.abs(to.y - from.y) > 1) return null;
      return { edge: e, lane: from.y, x1: Math.min(from.x, to.x), x2: Math.max(from.x, to.x) };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null)
    .sort((a, b) => a.x1 - b.x1 || a.x2 - b.x2);
  const laneLevels = new Map<number, { x2: number }[]>();
  for (const skip of skips) {
    const levels = laneLevels.get(skip.lane) ?? [];
    let level = levels.findIndex((l) => l.x2 <= skip.x1);
    if (level === -1) {
      level = levels.length;
      levels.push({ x2: skip.x2 });
    } else {
      levels[level] = { x2: skip.x2 };
    }
    laneLevels.set(skip.lane, levels);
    skip.edge.bow = -(SKIP_BOW + level * SKIP_BOW_STEP);
  }

  return { nodes: placedNodes, edges };
}

function focusLayout(sop: Sop, selectedId: string): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const byId = new Map(sop.nodes.map((n) => [n.id, n]));
  const selected = byId.get(selectedId);
  if (!selected) return { nodes: [], edges: [] };

  const parents = sop.edges.filter((e) => e.to === selectedId).map((e) => byId.get(e.from)).filter((n): n is SopNode => Boolean(n));
  const children = sop.edges.filter((e) => e.from === selectedId).map((e) => byId.get(e.to)).filter((n): n is SopNode => Boolean(n));

  const spread = (i: number, n: number) => (i - (n - 1) / 2) * FOCUS_COL_GAP;
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const seen = new Set<string>();
  const push = (gn: GraphNode) => {
    if (seen.has(gn.id)) return;
    seen.add(gn.id);
    nodes.push(gn);
  };

  const uniqParents = parents.filter((n, i, arr) => arr.indexOf(n) === i && n.id !== selectedId);
  const uniqChildren = children.filter((n, i, arr) => arr.indexOf(n) === i && n.id !== selectedId);

  uniqParents.forEach((p, i) => {
    const x = spread(i, uniqParents.length);
    push({ id: p.id, node: p, ...sizeFor(p), x, y: 0 });
    if (sop.edges.some((e) => e.to === p.id)) {
      push({ id: `stub-up-${p.id}`, node: null, w: STUB_W, h: STUB_H, x, y: -120 });
      edges.push({ id: `es-up-${p.id}`, source: `stub-up-${p.id}`, target: p.id, stub: true });
    }
  });
  push({ id: selected.id, node: selected, ...sizeFor(selected), x: 0, y: FOCUS_ROW_GAP });
  uniqChildren.forEach((c, i) => {
    const x = spread(i, uniqChildren.length);
    // A child that is also a parent (a loop back) already has a spot above.
    if (!seen.has(c.id)) push({ id: c.id, node: c, ...sizeFor(c), x, y: FOCUS_ROW_GAP * 2 });
    if (sop.edges.some((e) => e.from === c.id && e.to !== selectedId) && !seen.has(`stub-down-${c.id}`)) {
      push({ id: `stub-down-${c.id}`, node: null, w: STUB_W, h: STUB_H, x, y: FOCUS_ROW_GAP * 2 + 120 });
      edges.push({ id: `es-down-${c.id}`, source: c.id, target: `stub-down-${c.id}`, stub: true });
    }
  });

  sop.edges
    .filter((e) => seen.has(e.from) && seen.has(e.to) && (e.from === selectedId || e.to === selectedId))
    .forEach((e) => edges.push({ id: e.id, source: e.from, target: e.to, label: e.label }));

  return { nodes, edges };
}

const CY_STYLE: cytoscape.StylesheetJson = [
  {
    selector: "node",
    style: {
      shape: "round-rectangle",
      width: "data(w)",
      height: "data(h)",
      "background-opacity": 0,
      "border-width": 0,
      label: "",
    },
  },
  {
    selector: "edge",
    style: {
      "curve-style": "bezier",
      width: 2,
      "line-color": "#c7d2fe",
      "target-arrow-shape": "triangle",
      "target-arrow-color": "#a5b4fc",
      "arrow-scale": 1.1,
      label: "data(label)",
      "font-size": 10,
      "font-family": "IBM Plex Sans, system-ui, sans-serif",
      color: "#64748b",
      "text-background-color": "#ffffff",
      "text-background-opacity": 1,
      "text-background-padding": "3px",
      "text-background-shape": "roundrectangle",
      "text-margin-y": -2,
      // Parallel edges between the same pair fan wider so each branch label
      // of a converging decision stays readable.
      "control-point-step-size": 62,
    },
  },
  {
    // Skips arc above their lane so they never lie on the chain below them.
    selector: "edge[bow]",
    style: {
      "curve-style": "unbundled-bezier",
      "control-point-distances": (e: cytoscape.EdgeSingular) => `${e.data("bow")}`,
      "control-point-weights": "0.5",
    },
  },
  {
    // Loop-backs arc clear of the forward path so they read as a return, not
    // as another step in the flow.
    selector: "edge[?back]",
    style: {
      "curve-style": "unbundled-bezier",
      "control-point-distances": "-90",
      "control-point-weights": "0.5",
      "line-color": "#ddd6fe",
      "target-arrow-color": "#c4b5fd",
      "line-style": "dashed",
    },
  },
  {
    selector: "edge[?stub]",
    style: { "line-style": "dashed", "line-color": "#e0e7ff", "target-arrow-color": "#e0e7ff" },
  },
];

// Cytoscape paints on a canvas, so html.dark can't reach it: in dark mode the
// edges and their label chips get their own palette, matched to the graph
// panel (#161d2b) instead of white chips on a dark field.
const CY_STYLE_DARK: cytoscape.StylesheetJson = [
  {
    selector: "edge",
    style: {
      "line-color": "#5b64a8",
      "target-arrow-color": "#8f99e6",
      color: "#a3aec4",
      "text-background-color": "#232c40",
    },
  },
  { selector: "edge[?back]", style: { "line-color": "#6a5aa8", "target-arrow-color": "#9d8be0" } },
  { selector: "edge[?stub]", style: { "line-color": "#343c5c", "target-arrow-color": "#343c5c" } },
];

function cyStyleFor(theme: Theme): cytoscape.StylesheetJson {
  return theme === "dark" ? [...CY_STYLE, ...CY_STYLE_DARK] : CY_STYLE;
}

interface Placed {
  x: number;
  y: number;
}

export type NodePositions = Record<string, { x: number; y: number }>;

export function SopGraph({
  sop,
  selectedId,
  onSelect,
  scope,
  runByNode,
  variant = "rollup",
  states,
  moved,
  onMoveNode,
  onResetLayout,
  className = "",
}: {
  sop: Sop;
  selectedId: string | null;
  onSelect: (nodeId: string) => void;
  scope: "whole" | "focus";
  // When set, cards describe this run instance (what each node did in it)
  // rather than the node's roll-up across every run.
  runByNode?: Record<string, SopNodeRun | undefined>;
  // "version" cards carry the node's definition (who, autonomy, verification)
  // and no run analytics at all.
  variant?: "rollup" | "version" | "state";
  // Keyed by state id when variant is "state": the card reads from these
  // rather than from the synthetic node the layout runs on.
  states?: Record<string, SopState>;
  // Session drag state for the full graph. Passing `onMoveNode` is what makes
  // nodes grabbable; the mini graph leaves it off because it re-lays out on
  // every selection and would wipe a drag immediately.
  moved?: NodePositions;
  onMoveNode?: (nodeId: string, pos: { x: number; y: number }) => void;
  onResetLayout?: () => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [placed, setPlaced] = useState<Record<string, Placed>>({});
  const [zoom, setZoom] = useState(1);
  const [theme] = useTheme();
  const themeRef = useRef(theme);
  themeRef.current = theme;

  const draggable = scope === "whole" && !!onMoveNode;
  const graph = useMemo(
    () => (scope === "whole" ? fullLayout(sop, moved) : selectedId ? focusLayout(sop, selectedId) : { nodes: [], edges: [] }),
    [sop, scope, selectedId, moved],
  );

  // Keep the latest handlers reachable from the one-time listeners.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onMoveNodeRef = useRef(onMoveNode);
  onMoveNodeRef.current = onMoveNode;

  // Opening view: fit when the whole graph stays legible, otherwise pin the
  // zoom at MIN_OPEN_ZOOM and park on the top-left, where the flow begins.
  const openView = useCallback(
    (cy: Core) => {
      const padding = scope === "whole" ? 48 : 64;
      cy.fit(undefined, padding);
      if (scope === "whole" && cy.zoom() < MIN_OPEN_ZOOM) {
        cy.zoom(MIN_OPEN_ZOOM);
        const bb = cy.elements().boundingBox();
        cy.pan({ x: padding - bb.x1 * MIN_OPEN_ZOOM, y: padding - bb.y1 * MIN_OPEN_ZOOM });
      }
      // Focus holds a handful of nodes; fitting them to a full-width pane would
      // blow a three-node neighbourhood up well past life size.
      if (scope === "focus" && cy.zoom() > 1) {
        cy.zoom(1);
        cy.center();
      }
    },
    [scope],
  );

  // Create the Cytoscape instance once per mount.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const cy = cytoscape({
      container,
      elements: [],
      style: cyStyleFor(themeRef.current),
      layout: { name: "preset" },
      autoungrabify: !draggable,
      boxSelectionEnabled: false,
      minZoom: 0.15,
      maxZoom: 2,
      wheelSensitivity: 0.2,
    });
    cyRef.current = cy;

    let frame = 0;
    const sync = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const next: Record<string, Placed> = {};
        cy.nodes().forEach((n) => {
          const p = n.renderedPosition();
          next[n.id()] = { x: p.x, y: p.y };
        });
        setPlaced(next);
        setZoom(cy.zoom());
      });
    };
    cy.on("render", sync);
    cy.on("tap", "node", (evt) => {
      const id = evt.target.id() as string;
      if (!id.startsWith("stub-")) onSelectRef.current(id);
    });
    cy.on("mouseover", "node", (evt) => {
      if (!(evt.target.id() as string).startsWith("stub-")) container.style.cursor = draggable ? "grab" : "pointer";
    });
    cy.on("mouseout", "node", () => {
      container.style.cursor = "";
    });
    if (draggable) {
      cy.on("grab", "node", () => {
        container.style.cursor = "grabbing";
      });
      // `dragfree` fires once the pointer is released, so a drag records one
      // position rather than one per frame.
      cy.on("dragfree", "node", (evt) => {
        container.style.cursor = "grab";
        const id = evt.target.id() as string;
        const p = evt.target.position();
        if (!id.startsWith("stub-")) onMoveNodeRef.current?.(id, { x: p.x, y: p.y });
      });
    }

    // When the container changes size (the inspector or Sol column opening
    // or closing), keep the user's zoom and keep whatever was in the middle of
    // the viewport in the middle: shift the pan by half the size change. Only
    // the first real layout, from zero size, fits the whole graph.
    let lastW = container.clientWidth;
    let lastH = container.clientHeight;
    const ro = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      const hadSize = lastW > 0 && lastH > 0;
      cy.resize();
      if (!hadSize) {
        openView(cy);
      } else if (w !== lastW || h !== lastH) {
        cy.panBy({ x: (w - lastW) / 2, y: (h - lastH) / 2 });
      }
      lastW = w;
      lastH = h;
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      if (frame) cancelAnimationFrame(frame);
      cy.destroy();
      cyRef.current = null;
    };
  }, [scope, draggable, openView]);

  // Structure and position are keyed apart. A selection change, an owner edit
  // or a drag rebuilds `graph` for the cards, but only a genuine change of
  // nodes or edges rebuilds the Cytoscape elements and re-fits, so the user's
  // pan, zoom and dragged positions all survive.
  const structureKey = useMemo(
    () =>
      graph.nodes.map((n) => `${n.id}:${n.w},${n.h}`).join("|") +
      "#" +
      graph.edges.map((e) => `${e.id}:${e.label ?? ""}:${e.stub ? 1 : 0}:${e.back ? 1 : 0}:${e.bow ?? 0}`).join("|"),
    [graph],
  );
  const positionKey = useMemo(() => graph.nodes.map((n) => `${n.id}:${n.x},${n.y}`).join("|"), [graph]);
  const graphRef = useRef(graph);
  graphRef.current = graph;

  // Repaint edges when the theme toggles; the graph itself is untouched.
  useEffect(() => {
    cyRef.current?.style(cyStyleFor(theme));
  }, [theme]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const graph = graphRef.current;
    const elements: ElementDefinition[] = [
      ...graph.nodes.map((n) => ({
        group: "nodes" as const,
        data: { id: n.id, w: n.w, h: n.h },
        position: { x: n.x, y: n.y },
      })),
      ...graph.edges.map((e) => ({
        group: "edges" as const,
        data: { id: e.id, source: e.source, target: e.target, label: e.label ?? "", stub: e.stub ? 1 : 0, back: e.back ? 1 : 0, ...(e.bow ? { bow: e.bow } : {}) },
      })),
    ];
    cy.batch(() => {
      cy.elements().remove();
      cy.add(elements);
    });
    openView(cy);
  }, [structureKey, scope, openView]);

  // Push layout positions onto existing elements without re-fitting. A no-op
  // right after a drag (Cytoscape already moved the node) and the way Reset
  // layout puts everything back.
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.batch(() => {
      for (const n of graphRef.current.nodes) {
        const el = cy.getElementById(n.id);
        if (el.length === 0) continue;
        const p = el.position();
        if (Math.abs(p.x - n.x) > 0.5 || Math.abs(p.y - n.y) > 0.5) el.position({ x: n.x, y: n.y });
      }
    });
  }, [positionKey]);

  const zoomBy = (factor: number) => {
    const cy = cyRef.current;
    if (!cy) return;
    const { width, height } = cy.container()?.getBoundingClientRect() ?? { width: 0, height: 0 };
    cy.zoom({ level: cy.zoom() * factor, renderedPosition: { x: width / 2, y: height / 2 } });
  };
  // The control zooms all the way out: this is the overview of the whole flow.
  const fit = () => cyRef.current?.fit(undefined, scope === "whole" ? 48 : 64);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div ref={containerRef} className="h-full w-full" />
      {/* Cards, positioned over the invisible Cytoscape nodes. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {graph.nodes.map((n) => {
          const p = placed[n.id];
          if (!p) return null;
          return (
            <div
              key={n.id}
              className="absolute"
              style={{
                left: p.x - (n.w * zoom) / 2,
                top: p.y - (n.h * zoom) / 2,
                width: n.w,
                height: n.h,
                transform: `scale(${zoom})`,
                transformOrigin: "0 0",
              }}
            >
              {n.node ? (
                variant === "state" ? (
                  <StateCard state={states?.[n.id]} title={n.node.title} selected={n.id === selectedId} />
                ) : (
                  <NodeCard
                    node={n.node}
                    selected={n.id === selectedId}
                    nodeRun={runByNode?.[n.id]}
                    cardMode={variant === "version" ? "version" : runByNode ? "run" : "rollup"}
                  />
                )
              ) : (
                <Stub />
              )}
            </div>
          );
        })}
      </div>
      <div className="absolute bottom-4 right-4 flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <button type="button" onClick={() => zoomBy(1.25)} className="p-2 text-slate-600 hover:bg-slate-50" aria-label="Zoom in">
          <Plus className="h-4 w-4" strokeWidth={2} />
        </button>
        <button type="button" onClick={() => zoomBy(0.8)} className="border-t border-slate-200 p-2 text-slate-600 hover:bg-slate-50" aria-label="Zoom out">
          <Minus className="h-4 w-4" strokeWidth={2} />
        </button>
        <button type="button" onClick={fit} className="border-t border-slate-200 p-2 text-slate-600 hover:bg-slate-50" aria-label="Fit to view">
          <Maximize2 className="h-4 w-4" strokeWidth={2} />
        </button>
        {/* Only offered once something has actually been moved, and it also
            re-fits so a node dragged off-screen is always recoverable. */}
        {onResetLayout && moved && Object.keys(moved).length > 0 && (
          <button
            type="button"
            onClick={() => {
              onResetLayout();
              // Back to the opening view, not the zoomed-out overview, so a
              // reset lands where the graph started.
              requestAnimationFrame(() => {
                const cy = cyRef.current;
                if (cy) openView(cy);
              });
            }}
            title="Reset layout"
            aria-label="Reset layout"
            className="border-t border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
          >
            <Undo2 className="h-4 w-4" strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
}

function Stub() {
  return <div className="h-full w-full rounded-lg border border-slate-200 bg-white shadow-sm" />;
}

const KIND_TAG: Partial<Record<SopNode["kind"], string>> = {
  decision: "Decision",
  escalation: "Escalation",
};

// Card-sized wording for the autonomy line. The cards are 300px wide with a
// lot competing for the space, so these clip to the distinguishing word; the
// full phrasing stays on the line's tooltip and in the inspector.
const AUTONOMY_SHORT: Record<1 | 2 | 3 | 4, string> = {
  1: "Human",
  2: "Approve",
  3: "Notify",
  4: "Auto",
};

const VERIFICATION_SHORT: Record<SopNode["verification"], string> = {
  automated: "Auto verify",
  human: "Human verify",
  automated_plus_spot_check: "Verify + spot",
  none: "No verify",
};

const VERIFICATION_LONG: Record<SopNode["verification"], string> = {
  automated: "Verified automatically",
  human: "Verified by a person",
  automated_plus_spot_check: "Verifier agent plus human spot check",
  none: "No verification",
};

const STATE_TONE: Record<SopState["kind"], { dot: string; chip: string; label: string; border: string }> = {
  resting: { dot: "bg-slate-400", chip: "bg-slate-100 text-slate-600", label: "Resting", border: "border-slate-200" },
  active: { dot: "bg-emerald-500", chip: "bg-emerald-100 text-emerald-700", label: "Active", border: "border-slate-200" },
  exception: { dot: "bg-amber-500", chip: "bg-amber-100 text-amber-800", label: "Exception", border: "border-amber-200" },
};

// A state in the lifecycle rather than a step in the process: what the subject
// is doing, and the hard constraint that holds while it is here.
function StateCard({ state, title, selected }: { state: SopState | undefined; title: string; selected: boolean }) {
  const tone = STATE_TONE[state?.kind ?? "active"];
  return (
    <div
      className={`flex h-full w-full flex-col rounded-xl border bg-white px-4 py-3 shadow-sm ${
        selected ? "border-brand-400 ring-2 ring-brand-200" : tone.border
      }`}
    >
      <div className="flex items-start gap-2">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${tone.dot}`} />
        <p className="min-w-0 flex-1 truncate text-[15px] font-semibold leading-5 text-slate-900">{state?.label ?? title}</p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${tone.chip}`}>
          {tone.label}
        </span>
      </div>
      <p className="mt-1.5 line-clamp-2 pl-4 text-[12px] leading-4 text-slate-600">{state?.description}</p>
      {state?.rule && (
        <p className="mt-auto truncate pl-4 text-[11px] font-medium text-amber-700" title={state.rule}>
          {state.rule}
        </p>
      )}
    </div>
  );
}

function NodeCard({
  node,
  selected,
  nodeRun,
  cardMode,
}: {
  node: SopNode;
  selected: boolean;
  nodeRun: SopNodeRun | undefined;
  cardMode: "rollup" | "run" | "version";
}) {
  const scoped = cardMode === "run";
  // A version has no runtime health; its dot only marks who runs the step.
  const health: SopNodeHealth = cardMode === "version" ? "idle" : scoped ? runHealth(nodeRun) : node.health;
  const executorDot = { sol: "bg-violet-400", operator: "bg-amber-400", automation: "bg-sky-400", external: "bg-slate-400" }[executorFor(node)];
  const dot = cardMode === "version" ? executorDot : HEALTH_DOT[health];
  if (node.kind === "trigger" || node.kind === "completion") {
    return (
      <div
        className={`flex h-full w-full items-center gap-2 rounded-xl border bg-white px-4 shadow-sm ${
          selected ? "border-brand-400 ring-2 ring-brand-200" : "border-slate-200"
        }`}
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-slate-800">{node.title}</p>
          <p className="truncate text-[11px] text-slate-400">{node.kind === "trigger" ? "Trigger" : "Done when"}</p>
        </div>
      </div>
    );
  }

  const tag = KIND_TAG[node.kind];
  // Per-run figures when scoped to an instance; roll-ups otherwise.
  const objectsCreated = scoped ? (nodeRun?.objectsCreated.length ?? 0) : node.stats.objectsCreated;
  const errors = scoped ? (nodeRun?.errors.length ?? 0) : node.stats.errors;
  const issues = scoped ? (nodeRun?.issues.length ?? 0) : node.stats.issues;
  const headline = scoped
    ? nodeRun
      ? `Ran in ${formatRuntime(nodeRun.runtimeSeconds)}`
      : "Did not run in this instance"
    : `${node.stats.runs} jobs run`;
  return (
    <div
      className={`flex h-full w-full flex-col rounded-xl border bg-white px-4 py-3 shadow-sm ${
        selected
          ? "border-brand-400 ring-2 ring-brand-200"
          : node.kind === "escalation"
            ? "border-amber-200"
            : "border-slate-200"
      }`}
    >
      <div className="flex items-start gap-2">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-5 text-slate-900">{node.title}</p>
        </div>
        {tag && (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
            {tag}
          </span>
        )}
      </div>
      {cardMode === "version" ? (
        <div className="mt-2 space-y-0.5 pl-4 text-[12px] leading-4 text-slate-600">
          <p className="truncate">
            <span className="text-slate-400">Owner</span> {node.ownerName}
          </p>
          <p className="truncate" title={node.trigger}>
            <span className="text-slate-400">Trigger</span> {node.trigger}
          </p>
          <p className="truncate">{EXECUTOR_SENTENCE[executorFor(node)]}</p>
          <p
            className="truncate text-slate-400"
            title={`Autonomy level ${node.autonomy}: ${SOP_AUTONOMY_LABELS[node.autonomy]}. ${VERIFICATION_LONG[node.verification]}.`}
          >
            L{node.autonomy} · {AUTONOMY_SHORT[node.autonomy]} · {VERIFICATION_SHORT[node.verification]}
          </p>
        </div>
      ) : (
        <div className={`mt-2 space-y-0.5 pl-4 text-[12px] leading-4 ${scoped && !nodeRun ? "text-slate-400" : "text-slate-600"}`}>
          <p>{headline}</p>
          <p>{objectsCreated} objects created</p>
          <p className={errors > 0 ? "font-medium text-red-600" : ""}>{errors} error{errors === 1 ? "" : "s"}</p>
          {issues > 0 && (
            <p className="font-medium text-amber-600">
              {issues} issue{issues === 1 ? "" : "s"} need{issues === 1 ? "s" : ""} investigation
            </p>
          )}
        </div>
      )}
    </div>
  );
}
