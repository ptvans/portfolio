// State models: a second lens on an SOP.
//
// The workflow graph answers "what does an operator do, in what order". A state
// model answers "what states does the thing move through, and what pushes it
// between them". The two are different readings of the same process, so a state
// model is authored alongside an SOP rather than compiled from it, and lives in
// its own file (src/data/sop-states/*.states.json).
//
// To render, a model is adapted into the `Sop` shape the existing graph already
// lays out and draws: states become nodes, transitions become edges. Every
// state maps to a plain "step" so it takes part in the normal left-to-right
// layering: unlike an SOP's escalations, an exception state is often a link in
// a chain (flagged, dispatched, on site, resolved) rather than a leaf, so
// pinning them to a side lane would flatten the path. The kind still drives the
// card colour, just not the layout.

import type { Sop, SopNode, SopState, SopStateModel } from "../types/domain";

export class SopStateModelError extends Error {}

export function validateStateModel(model: SopStateModel): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const state of model.states) {
    if (ids.has(state.id)) problems.push(`duplicate state id "${state.id}"`);
    ids.add(state.id);
    if (!state.label?.trim()) problems.push(`state "${state.id}" has no label`);
    if (!state.description?.trim()) problems.push(`state "${state.id}" has no description`);
  }
  for (const t of model.transitions) {
    if (!ids.has(t.from)) problems.push(`transition "${t.id}" leaves unknown state "${t.from}"`);
    if (!ids.has(t.to)) problems.push(`transition "${t.id}" enters unknown state "${t.to}"`);
    if (!t.label?.trim()) problems.push(`transition "${t.id}" has no label`);
  }
  if (!ids.has(model.start)) problems.push(`start "${model.start}" is not a state`);
  // A state nothing can reach is either a modelling slip or a missing path.
  const reachable = new Set([model.start]);
  const queue = [model.start];
  while (queue.length) {
    const cur = queue.shift();
    for (const t of model.transitions.filter((x) => x.from === cur)) {
      if (!reachable.has(t.to)) {
        reachable.add(t.to);
        queue.push(t.to);
      }
    }
  }
  for (const id of ids) if (!reachable.has(id)) problems.push(`state "${id}" is unreachable from "${model.start}"`);
  return problems;
}

// Adapts a model into the shape the shared graph lays out and renders. The
// result is not a real SOP; only id, nodes and edges are meaningful.
export function stateModelAsGraph(model: SopStateModel): Sop {
  const problems = validateStateModel(model);
  if (problems.length) throw new SopStateModelError(`${model.id}: ${problems.join("; ")}`);

  // The start state leads, so the layout roots the cycle there.
  const ordered = [...model.states].sort((a, b) =>
    a.id === model.start ? -1 : b.id === model.start ? 1 : 0,
  );

  const nodes: SopNode[] = ordered.map((state) => ({
    id: state.id,
    kind: "step",
    title: state.label,
    summary: state.description,
    work: state.description,
    trigger: "",
    ownerName: "",
    actors: [],
    hardConstraints: state.rule ? [state.rule] : [],
    learnedRules: [],
    successCriteria: "",
    verification: "none",
    where: "",
    when: "",
    autonomy: 1,
    provenance: "stated",
    health: "idle",
    // A state is a place the subject sits, not work the agent does.
    actions: [],
    stats: { runs: 0, objectsCreated: 0, errors: 0, issues: 0 },
  }));

  return {
    id: model.id,
    brandId: null,
    name: model.name,
    purpose: model.description,
    version: 1,
    status: "active",
    ownerName: "",
    trigger: "",
    completion: "",
    primitiveTags: [],
    workflowTags: [],
    updatedAt: new Date(0).toISOString(),
    versions: [],
    nodes,
    edges: model.transitions.map((t) => ({ id: t.id, from: t.from, to: t.to, label: t.label })),
    blocks: [],
    attachments: [],
  };
}

const files = import.meta.glob<{ default: SopStateModel }>("./sop-states/*.states.json", { eager: true });

export const sopStateModels: SopStateModel[] = Object.keys(files)
  .sort()
  .map((key) => files[key].default);

export function stateModelForSop(sopId: string): SopStateModel | undefined {
  return sopStateModels.find((m) => m.sopId === sopId);
}

export function statesById(model: SopStateModel): Record<string, SopState> {
  return Object.fromEntries(model.states.map((s) => [s.id, s]));
}
