// SOP files → SOP objects.
//
// Every SOP that is not hand-authored in sops.ts lives as one JSON file in
// src/data/sop-files/, in the format described by docs/sop-file.schema.json.
// The file is the authoring format: steps with an owner, a trigger, the work,
// and `next` edges. This module compiles a file into the richer `Sop` graph
// model the UI renders (trigger and completion nodes added, edges resolved,
// document blocks derived), and loads every file in the folder at build time.
//
// See docs/sop-import-workflow.md for how files get here from the Notion SOP Hub.

import type { Sop, SopAction, SopActor, SopDocBlock, SopEdge, SopNode, SopNodeKind } from "../types/domain";

// ---------------------------------------------------------------------------
// File format
// ---------------------------------------------------------------------------

export type SopFileActor = "person" | "agent" | "automation" | "external";

// An action the step takes, as recorded in the file. The id is derived from the
// step it hangs off, so the file never spells one out.
export type SopFileAction = Omit<SopAction, "id">;

export interface SopFileStep {
  id: string;
  kind?: Exclude<SopNodeKind, "trigger" | "completion">;
  title: string;
  summary?: string;
  owner: string;
  trigger: string;
  work: string;
  actor?: SopFileActor;
  actors?: SopActor[];
  where?: string;
  when?: string;
  rules?: string[];
  doneWhen?: string;
  verification?: SopNode["verification"];
  autonomy?: 1 | 2 | 3 | 4;
  // The tool calls this step involves, shown in the document's gutter.
  actions?: SopFileAction[];
  next?: { to: string; label?: string }[];
}

export interface SopFile {
  $schema?: string;
  id: string;
  name: string;
  status: Sop["status"];
  version: number;
  scope: { brandId: string | null; customer?: string };
  team?: string;
  sopType?: "internal" | "external";
  owner: string;
  backupOwner?: string;
  escalationContact?: string;
  trigger: string;
  purpose: string;
  doneWhen: string;
  timeToRun?: string;
  tags?: string[];
  source?: Sop["source"];
  schedule?: Sop["schedule"];
  // Last edit, for SOPs authored in Brick rather than imported from Notion.
  updatedAt?: string;
  start?: string;
  steps: SopFileStep[];
}

// ---------------------------------------------------------------------------
// Compiler
// ---------------------------------------------------------------------------

const ACTORS_FOR: Record<SopFileActor, SopActor[]> = {
  person: ["brick_operator"],
  agent: ["stella"],
  automation: ["automation"],
  external: ["external"],
};

function firstSentence(text: string): string {
  const m = text.match(/^(.+?[.!?])(\s|$)/);
  return (m ? m[1] : text).trim();
}

export class SopFileError extends Error {}

// Checks referential integrity so a bad file fails loudly at build time
// rather than rendering a graph with dangling edges.
export function validateSopFile(file: SopFile): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const step of file.steps) {
    if (ids.has(step.id)) problems.push(`duplicate step id "${step.id}"`);
    ids.add(step.id);
    if (!step.owner?.trim()) problems.push(`step "${step.id}" has no owner`);
    if (!step.trigger?.trim()) problems.push(`step "${step.id}" has no trigger`);
    if (!step.work?.trim()) problems.push(`step "${step.id}" has no work`);
    for (const edge of step.next ?? []) {
      if (edge.to !== "done" && !file.steps.some((s) => s.id === edge.to)) {
        problems.push(`step "${step.id}" points to unknown step "${edge.to}"`);
      }
    }
  }
  if (file.start && !ids.has(file.start)) problems.push(`start "${file.start}" is not a step`);
  if (!file.owner?.trim()) problems.push("SOP has no owner");
  if (!file.trigger?.trim()) problems.push("SOP has no trigger");
  if (!file.doneWhen?.trim()) problems.push("SOP has no doneWhen");
  if (!/^sop-[a-z0-9-]+$/.test(file.id)) problems.push(`id "${file.id}" must look like sop-kebab-case`);
  return problems;
}

export function compileSopFile(file: SopFile): Sop {
  const problems = validateSopFile(file);
  if (problems.length) throw new SopFileError(`${file.id}: ${problems.join("; ")}`);

  const nid = (stepId: string) => `${file.id}/${stepId}`;
  const TRIGGER_ID = nid("trigger");
  const DONE_ID = nid("done");
  const startId = file.start ?? file.steps[0].id;

  const nodes: SopNode[] = [
    {
      id: TRIGGER_ID,
      kind: "trigger",
      title: "Process starts",
      summary: firstSentence(file.trigger),
      work: file.trigger,
      trigger: file.trigger,
      ownerName: file.owner,
      actors: ["automation"],
      hardConstraints: [],
      learnedRules: [],
      successCriteria: "A run of this SOP begins.",
      verification: "none",
      where: "—",
      when: "On trigger",
      autonomy: 4,
      provenance: "stated",
      health: "idle",
      actions: [],
      stats: { runs: 0, objectsCreated: 0, errors: 0, issues: 0 },
    },
    ...file.steps.map<SopNode>((step) => ({
      id: nid(step.id),
      kind: step.kind ?? "step",
      title: step.title,
      summary: step.summary ?? firstSentence(step.work),
      work: step.work,
      trigger: step.trigger,
      ownerName: step.owner,
      actors: step.actors ?? ACTORS_FOR[step.actor ?? "person"],
      hardConstraints: step.rules ?? [],
      learnedRules: [],
      successCriteria: step.doneWhen ?? "",
      verification: step.verification ?? "none",
      where: step.where ?? "—",
      when: step.when ?? "—",
      autonomy: step.autonomy ?? 1,
      provenance: "stated",
      health: "idle",
      actions: (step.actions ?? []).map((a, i) => ({ ...a, id: `${nid(step.id)}/a${i + 1}` })),
      stats: { runs: 0, objectsCreated: 0, errors: 0, issues: 0 },
    })),
    {
      id: DONE_ID,
      kind: "completion",
      title: "Done",
      summary: firstSentence(file.doneWhen),
      work: file.doneWhen,
      trigger: "Every path reaches its end.",
      ownerName: file.owner,
      actors: ["automation"],
      hardConstraints: [],
      learnedRules: [],
      successCriteria: file.doneWhen,
      verification: "none",
      where: "—",
      when: "—",
      autonomy: 4,
      provenance: "stated",
      health: "idle",
      actions: [],
      stats: { runs: 0, objectsCreated: 0, errors: 0, issues: 0 },
    },
  ];

  const edges: SopEdge[] = [{ id: `${file.id}/e-trigger`, from: TRIGGER_ID, to: nid(startId) }];
  for (const step of file.steps) {
    const outgoing = step.next && step.next.length > 0 ? step.next : [{ to: "done" as const }];
    outgoing.forEach((edge, i) => {
      edges.push({
        id: `${file.id}/e-${step.id}-${i}`,
        from: nid(step.id),
        to: edge.to === "done" ? DONE_ID : nid(edge.to),
        label: edge.label,
      });
    });
  }

  const blocks: SopDocBlock[] = [
    { id: `${file.id}/b-intro`, heading: "Why this SOP exists", body: file.purpose, nodeId: null },
    { id: `${file.id}/b-trigger`, heading: "Starts when", body: file.trigger, nodeId: TRIGGER_ID },
    ...file.steps.map<SopDocBlock>((step) => ({
      id: `${file.id}/b-${step.id}`,
      heading: step.title,
      body: step.work,
      nodeId: nid(step.id),
    })),
    { id: `${file.id}/b-done`, heading: "Done when", body: file.doneWhen, nodeId: DONE_ID },
  ];

  const publishedAt = file.source?.importedAt ?? file.updatedAt ?? new Date().toISOString();
  return {
    id: file.id,
    brandId: file.scope.brandId,
    name: file.name,
    purpose: file.purpose,
    version: file.version,
    status: file.status,
    ownerName: file.owner,
    trigger: file.trigger,
    completion: file.doneWhen,
    primitiveTags: [],
    workflowTags: file.tags ?? [],
    updatedAt: file.source?.lastEditedAt ?? publishedAt,
    team: file.team,
    sopType: file.sopType,
    escalationContact: file.escalationContact,
    source: file.source,
    schedule: file.schedule,
    versions: [
      {
        version: file.version,
        publishedAt,
        publishedBy: file.owner,
        note: file.source ? `Imported from the Notion SOP Hub (v${file.version}).` : "Authored in the repo.",
      },
    ],
    nodes,
    edges,
    blocks,
    attachments: [],
  };
}

// ---------------------------------------------------------------------------
// Loader: every *.sop.json in src/data/sop-files/, compiled at module load.
// ---------------------------------------------------------------------------

const files = import.meta.glob<{ default: SopFile }>("./sop-files/*.sop.json", { eager: true });

export const sopFiles: SopFile[] = Object.keys(files)
  .sort()
  .map((key) => files[key].default);

export const importedSops: Sop[] = sopFiles.map(compileSopFile);
