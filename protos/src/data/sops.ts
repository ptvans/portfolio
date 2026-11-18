// SOPs (Standard Operating Processes) and their run history.
//
// The first SOP is the Autolane weekly supervision-shift pipeline from
// docs/autolane-weekly-shifts-sop.pdf, compiled into a node graph the way the
// PRD (docs/prd-sop-platform.html) describes: the operator writes the document,
// each block compiles to a node with an owner, rules and a done condition, and
// every run logs what each node saw and did. The second is the Base Power
// delivery example from docs/Executable SOP.pdf, kept as a draft so the Brands
// pages show more than one SOP state.

import type {
  Sop,
  SopDocBlock,
  SopEdge,
  SopLogEntry,
  SopNode,
  SopNodeRun,
  SopRun,
} from "../types/domain";
import { importedSops } from "./sopFiles";

// People who can own an SOP step. Brick operators in v1 (PRD: Brand / NO users
// take the owner role in later phases).
export const SOP_OWNER_OPTIONS = ["Mateo Rivera", "Jordan Eskew", "Kenny Ma", "Priya Natarajan"];

export const SOP_AUTONOMY_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: "Human does everything",
  2: "System proposes, human approves",
  3: "System acts and notifies",
  4: "System acts alone",
};

export const SOP_ACTOR_LABELS: Record<SopNode["actors"][number], string> = {
  sol: "Sol",
  brick_operator: "Build operator",
  sop_owner: "Automation owner",
  verifier_agent: "Verifier agent",
  network_operator: "Network operator",
  brand_user: "Brand user",
  automation: "Automation",
  external: "External party",
};

// ---------------------------------------------------------------------------
// Autolane Weekly Supervision Shifts
// ---------------------------------------------------------------------------

const AL = "sop-al-weekly-shifts";
const OWNER = "Mateo Rivera";

// The two hand-authored SOPs predate per-step action detection, so their nodes
// declare no tool calls. Fill the field in once rather than repeating
// `actions: []` on every node; imported SOPs carry real actions from their file.
const authored = (nodes: Omit<SopNode, "actions">[]): SopNode[] => nodes.map((n) => ({ ...n, actions: [] }));

const alNodes: SopNode[] = authored([
  {
    id: "al-trigger",
    trigger: "Scheduled: Sunday 6:00pm PT, ahead of the Tue–Mon operating week.",
    kind: "trigger",
    title: "Operating week begins",
    summary: "Sunday night, for the Tue–Mon operating week.",
    work: "Start a run for the coming Tue–Mon operating week. The schedule for that week is expected in the shared Autolane Slack channel on Sunday night.",
    ownerName: OWNER,
    actors: ["sol"],
    hardConstraints: [],
    learnedRules: [],
    successCriteria: "A run exists for the coming operating week.",
    verification: "automated",
    where: "Scheduler",
    when: "Sunday 6:00pm PT",
    autonomy: 4,
    provenance: "inferred",
    health: "healthy",
    stats: { runs: 10, objectsCreated: 10, errors: 0, issues: 0 },
  },
  {
    id: "al-1",
    trigger: "The run opens for the week.",
    kind: "step",
    title: "Watch for the schedule",
    summary: "Send one polite reminder if it's late.",
    work: "Watch the shared Slack channel for the week's supervision schedule. If nothing has arrived by 8:00pm PT Sunday, send one short, friendly reminder. Only one. If it is still missing by 9:00am PT Monday, tell the owner.",
    ownerName: OWNER,
    actors: ["sol"],
    hardConstraints: ["Send at most one reminder per week."],
    learnedRules: ["A schedule posted as an image counts as arrived; hand it to the reader step as-is."],
    successCriteria: "The schedule file or message is captured, or the owner has been told it is missing.",
    verification: "automated",
    where: "Slack",
    when: "Reminder 8:00pm PT Sun; escalate 9:00am PT Mon",
    autonomy: 4,
    provenance: "stated",
    health: "healthy",
    stats: { runs: 10, objectsCreated: 3, errors: 0, issues: 0 },
  },
  {
    id: "al-2",
    trigger: "A schedule file or message arrives in the shared Slack channel.",
    kind: "step",
    title: "Read the schedule into a shift list",
    summary: "Every site and day: shifts, supervisor counts, start and end times.",
    work: "For every site and day, capture which shifts run (Lunch, Dinner, Dinner Peak, or anything new), how many supervisors each needs, and start/end times. Read the notes at the bottom, that's where changes from last week are called out. Blank or a dash means no shift. Times are Central unless stated. The grid wins over the notes if they disagree, but flag the conflict.",
    ownerName: OWNER,
    actors: ["sol"],
    hardConstraints: ["The grid wins over the notes when they disagree."],
    learnedRules: ["Blank or a dash means no shift.", "Times are Central unless stated."],
    successCriteria: "A shift list with one row per site, day and shift, each with a supervisor count and start/end time; every grid/notes conflict flagged.",
    verification: "automated",
    where: "Slack",
    when: "Within 1 hr of arrival",
    autonomy: 3,
    provenance: "stated",
    health: "attention",
    stats: { runs: 10, objectsCreated: 214, errors: 0, issues: 1 },
  },
  {
    id: "al-3",
    trigger: "The shift list is complete.",
    kind: "step",
    title: "Check for duplicates",
    summary: "Look for supervision shifts already scheduled in that week.",
    work: "Look for supervision shifts already scheduled in that week's dates. Never create work orders for a week that already has them without a person deciding first. Duplicates reach the network operator as real staffing requests.",
    ownerName: OWNER,
    actors: ["sol"],
    hardConstraints: ["Never create work orders for a week that already has them without a person deciding first."],
    learnedRules: [],
    successCriteria: "The week's dates were searched for existing Daily Supervision Shifts work orders and the result is recorded on the run.",
    verification: "automated",
    where: "BrickOS",
    when: "Minutes",
    autonomy: 3,
    provenance: "stated",
    health: "attention",
    stats: { runs: 10, objectsCreated: 0, errors: 0, issues: 1 },
  },
  {
    id: "al-4",
    trigger: "No existing work orders were found for the week (or a person cleared the duplicates).",
    kind: "step",
    title: "Confirm setup is live",
    summary: "Five Autolane records must exist and be active.",
    work: "Confirm five Autolane records exist and are active: the brand, the \"Daily Supervision Shifts\" work order type, the \"Supervise Vehicle\" task type, the Austin assignment to the network operator, and the Tesla Model Y product. If a saved reference no longer matches, find the record by name. Never touch the sandbox brand or the demo operator.",
    ownerName: OWNER,
    actors: ["sol"],
    hardConstraints: ["Never touch the sandbox brand or the demo operator."],
    learnedRules: ["If a saved reference no longer matches, find the record by name."],
    successCriteria: "All five records resolve to active System-of-Record entities.",
    verification: "automated",
    where: "BrickOS",
    when: "Minutes",
    autonomy: 3,
    provenance: "stated",
    health: "failing",
    stats: { runs: 10, objectsCreated: 0, errors: 2, issues: 1 },
  },
  {
    id: "al-5",
    trigger: "All five setup records resolved as active.",
    kind: "step",
    title: "Draft the week's work orders",
    summary: "One work order per site per day; flag anything odd.",
    work: "Draft one work order per site per day, named like \"Cherrywood - Fri 8/28\". Each supervisor on each shift is one Supervise Vehicle task with that shift's start time and length. Non-standard dinner shifts get a note saying which shift they are. Every work order lists one Tesla Model Y. Use the Austin region timezone. Flag: notes contradicting the grid, a site appearing or disappearing, supervisor counts or times shifting mid-week, anything the notes call out.",
    ownerName: OWNER,
    actors: ["sol"],
    hardConstraints: ["Drafts are proposals; nothing is created in Build at this step."],
    learnedRules: [
      "Name work orders \"<Site> - <Ddd M/D>\".",
      "Non-standard dinner shifts carry a note naming the shift.",
      "Every work order lists exactly one Tesla Model Y.",
    ],
    successCriteria: "A draft plan with totals per site and day, every flag listed, ready for the owner to review.",
    verification: "human",
    where: "Review UI",
    when: "Minutes",
    autonomy: 3,
    provenance: "stated",
    health: "healthy",
    stats: { runs: 9, objectsCreated: 306, errors: 0, issues: 0 },
  },
  {
    id: "al-6",
    trigger: "A draft plan is ready for review.",
    kind: "decision",
    title: "Review and approve the plan",
    summary: "Approval is the gate. The owner approves, changes or rejects.",
    work: "Nothing gets created in Build without an approved plan. The owner reviews the work orders, the totals and every flag, then approves, changes or rejects.",
    ownerName: OWNER,
    actors: ["sop_owner"],
    hardConstraints: ["Nothing is created in Build without an approved plan."],
    learnedRules: [],
    successCriteria: "The plan carries an explicit approve, change or reject decision with the owner's name and time.",
    verification: "human",
    where: "Review UI",
    when: "By end of day Mon",
    autonomy: 1,
    provenance: "stated",
    health: "healthy",
    stats: { runs: 9, objectsCreated: 9, errors: 0, issues: 0 },
  },
  {
    id: "al-7",
    trigger: "The owner approved the plan.",
    kind: "step",
    title: "Create the approved work orders",
    summary: "Exactly what was approved. Nothing more.",
    work: "Create exactly what was approved. Nothing more. If some fail to save, redo only those, never one that already saved.",
    ownerName: OWNER,
    actors: ["sol"],
    hardConstraints: ["Create only what was approved.", "Never re-create a work order that already saved."],
    learnedRules: [],
    successCriteria: "Every approved work order and task exists in Build once, with ids recorded on the run.",
    verification: "automated_plus_spot_check",
    where: "BrickOS",
    when: "Minutes",
    autonomy: 3,
    provenance: "stated",
    health: "healthy",
    stats: { runs: 9, objectsCreated: 288, errors: 1, issues: 0 },
  },
  {
    id: "al-8",
    trigger: "Work orders were created in Build.",
    kind: "step",
    title: "Double check what was created",
    summary: "Someone else checks. Report mismatches, never quietly fix them.",
    work: "The person who created the work orders does not verify them. Compare against the approved plan: number of work orders, tasks per order, times and lengths, shift notes, and the vehicle. Report mismatches, never quietly fix them.",
    ownerName: OWNER,
    actors: ["verifier_agent", "brick_operator"],
    hardConstraints: ["The actor that created the work orders does not verify them.", "Mismatches are reported, never silently fixed."],
    learnedRules: ["Spot-check 20% of work orders by hand while the verifier is still earning trust."],
    successCriteria: "Every created work order matches the approved plan on count, tasks, times, notes and vehicle.",
    verification: "automated_plus_spot_check",
    where: "BrickOS",
    when: "Minutes",
    autonomy: 3,
    provenance: "stated",
    health: "healthy",
    stats: { runs: 9, objectsCreated: 9, errors: 0, issues: 1 },
  },
  {
    id: "al-9",
    trigger: "Verification matched the approved plan.",
    kind: "step",
    title: "Tell the network operator",
    summary: "Three sentences or fewer. Sol drafts, owner sends.",
    work: "Three sentences or fewer, plain and high level, no em dashes. Cover the week's dates and sites, total shift count with peak shifts noted, anything they need to notice (no lunch shifts, a new site, peak times moved), and a prompt to review and assign supervisors in the portal.",
    ownerName: OWNER,
    actors: ["sol", "sop_owner"],
    hardConstraints: ["The owner sends the message; Sol only drafts."],
    learnedRules: ["Three sentences or fewer.", "No em dashes."],
    successCriteria: "The message is posted in the network operator's Slack channel by the owner.",
    verification: "human",
    where: "Slack",
    when: "Same day",
    autonomy: 2,
    provenance: "stated",
    health: "healthy",
    stats: { runs: 9, objectsCreated: 9, errors: 0, issues: 0 },
  },
  {
    id: "al-escalate",
    trigger: "Any step hits something the Automation does not cover.",
    kind: "escalation",
    title: "Escalate to the Automation owner",
    summary: "Anything unusual, with everything known so far.",
    work: "Send the owner everything known so far: an unreadable schedule, a new site, a new kind of shift, missing Autolane records in Build, or work orders that only partly saved. Resolving the escalation offers a one-click Automation change for the owner to approve.",
    ownerName: OWNER,
    actors: ["sol", "sop_owner"],
    hardConstraints: [],
    learnedRules: [],
    successCriteria: "The owner has acknowledged the escalation and the state-decision-outcome record is complete.",
    verification: "human",
    where: "Slack",
    when: "Immediately",
    autonomy: 4,
    provenance: "stated",
    health: "attention",
    stats: { runs: 4, objectsCreated: 4, errors: 0, issues: 4 },
  },
  {
    id: "al-done",
    trigger: "The network operator has been told the week is ready.",
    kind: "completion",
    title: "Week is ready",
    summary: "Every shift exists in Build and the network operator knows.",
    work: "Every shift on the schedule exists in Build as a Daily Supervision Shifts work order with the right tasks, the records have been checked against the schedule, and the network operator has been told the week is ready.",
    ownerName: OWNER,
    actors: ["sol"],
    hardConstraints: [],
    learnedRules: [],
    successCriteria: "All completion conditions hold; the run closes.",
    verification: "automated",
    where: "BrickOS",
    when: "Mon",
    autonomy: 4,
    provenance: "stated",
    health: "healthy",
    stats: { runs: 9, objectsCreated: 0, errors: 0, issues: 0 },
  },
]);

const alEdges: SopEdge[] = [
  { id: "e-t-1", from: "al-trigger", to: "al-1" },
  { id: "e-1-2", from: "al-1", to: "al-2", label: "Schedule arrived" },
  { id: "e-1-esc", from: "al-1", to: "al-escalate", label: "Missing 9am Mon" },
  { id: "e-2-3", from: "al-2", to: "al-3" },
  { id: "e-3-4", from: "al-3", to: "al-4", label: "No duplicates" },
  { id: "e-3-esc", from: "al-3", to: "al-escalate", label: "Week already has shifts" },
  { id: "e-4-5", from: "al-4", to: "al-5", label: "All records live" },
  { id: "e-4-esc", from: "al-4", to: "al-escalate", label: "Record missing" },
  { id: "e-5-6", from: "al-5", to: "al-6" },
  { id: "e-6-7", from: "al-6", to: "al-7", label: "Approved" },
  { id: "e-6-5", from: "al-6", to: "al-5", label: "Changes requested" },
  { id: "e-6-esc", from: "al-6", to: "al-escalate", label: "Rejected" },
  { id: "e-7-8", from: "al-7", to: "al-8" },
  { id: "e-8-9", from: "al-8", to: "al-9", label: "Matches plan" },
  { id: "e-8-esc", from: "al-8", to: "al-escalate", label: "Mismatch" },
  { id: "e-9-done", from: "al-9", to: "al-done" },
];

const alBlocks: SopDocBlock[] = [
  {
    id: "al-b-intro",
    heading: "Why this Automation exists",
    body: "Each week Autolane sends a supervision shift schedule. We turn it into work orders in Build so the network operator can staff them. Sol does the work; a person approves before anything is created.",
    nodeId: null,
  },
  {
    id: "al-b-1",
    heading: "Watch for the schedule",
    body: `${alNodes[1].work}\n\n+ Added by Sol, Jul 27: A schedule posted as an image counts as arrived; hand it to the reader step as-is.`,
    nodeId: "al-1",
  },
  { id: "al-b-2", heading: "Read the schedule into a shift list", body: alNodes[2].work, nodeId: "al-2" },
  { id: "al-b-3", heading: "Check for duplicates", body: alNodes[3].work, nodeId: "al-3" },
  { id: "al-b-4", heading: "Confirm setup is live", body: alNodes[4].work, nodeId: "al-4" },
  { id: "al-b-5", heading: "Draft conventions", body: alNodes[5].work, nodeId: "al-5" },
  { id: "al-b-6", heading: "Approval is the gate", body: alNodes[6].work, nodeId: "al-6" },
  { id: "al-b-7", heading: "Create exactly what was approved", body: alNodes[7].work, nodeId: "al-7" },
  {
    id: "al-b-8",
    heading: "Someone else checks",
    body: `${alNodes[8].work}\n\n+ Added by Sol, Aug 24: Spot-check 20% of work orders by hand while the verifier is still earning trust.`,
    nodeId: "al-8",
  },
  { id: "al-b-9", heading: "The weekly message", body: alNodes[9].work, nodeId: "al-9" },
  { id: "al-b-done", heading: "Done when", body: alNodes[11].work, nodeId: "al-done" },
  {
    id: "al-b-esc",
    heading: "Anything unusual",
    body: "Anything unusual goes to the Automation owner with everything known so far: an unreadable schedule, a new site, a new kind of shift, missing Autolane records in Build, or work orders that only partly saved.",
    nodeId: "al-escalate",
  },
];

// Earlier versions of the Autolane SOP, reconstructed by taking the learned
// rules back out in the order they were codified. v1 is the document as first
// compiled; v2 added the image-schedule rule; v3 (current) added the retry and
// spot-check rules.
function withoutRules(nodes: SopNode[], rulesByNode: Record<string, string[]>): SopNode[] {
  return nodes.map((n) => {
    const drop = rulesByNode[n.id];
    if (!drop) return n;
    return {
      ...n,
      learnedRules: n.learnedRules.filter((r) => !drop.includes(r)),
      hardConstraints: n.hardConstraints.filter((r) => !drop.includes(r)),
    };
  });
}

function withBlockBody(blocks: SopDocBlock[], bodies: Record<string, string>): SopDocBlock[] {
  return blocks.map((b) => (bodies[b.id] !== undefined ? { ...b, body: bodies[b.id] } : b));
}

const alV2 = {
  nodes: withoutRules(alNodes, {
    "al-7": ["Never re-create a work order that already saved."],
    "al-8": ["Spot-check 20% of work orders by hand while the verifier is still earning trust."],
  }),
  blocks: withBlockBody(alBlocks, {
    "al-b-7": "Create exactly what was approved. Nothing more.",
    "al-b-8": alNodes[8].work,
  }),
};

const alV1 = {
  nodes: withoutRules(alV2.nodes, {
    "al-1": ["A schedule posted as an image counts as arrived; hand it to the reader step as-is."],
  }),
  blocks: withBlockBody(alV2.blocks, { "al-b-1": alNodes[1].work }),
};

export const autolaneWeeklyShiftsSop: Sop = {
  id: AL,
  brandId: "brand-autolane",
  name: "Autolane Weekly Supervision Shifts",
  purpose: alBlocks[0].body,
  version: 3,
  status: "active",
  ownerName: OWNER,
  trigger: "Autolane posts the week's schedule in the shared Slack channel (expected Sunday night).",
  completion: alNodes[11].work,
  primitiveTags: [],
  workflowTags: ["Create work orders", "Follow up with operators"],
  updatedAt: "2026-09-02T17:20:00-07:00",
  schedule: {
    summary: "Weekly, Sun 8:00 PM CT",
    rule: "Every Sunday at 8:00 PM Central (6:00 PM Pacific, where the owner sits), ahead of the Tue–Mon operating week",
  },
  versions: [
    { version: 1, publishedAt: "2026-07-02T11:05:00-07:00", publishedBy: "Mateo Rivera", note: "Compiled from the Autolane weekly shifts Automation document.", snapshot: alV1 },
    { version: 2, publishedAt: "2026-07-27T09:40:00-07:00", publishedBy: "Mateo Rivera", note: "Codified from escalation: a schedule posted as an image counts as arrived.", snapshot: alV2 },
    { version: 3, publishedAt: "2026-08-24T16:15:00-07:00", publishedBy: "Priya Natarajan", note: "Codified from escalation: retry only the work orders that failed to save; spot-check 20%." },
  ],
  nodes: alNodes,
  edges: alEdges,
  blocks: alBlocks,
  attachments: [
    { id: "al-att-1", name: "autolane-weekly-shifts-sop.pdf", kind: "pdf" },
    { id: "al-att-2", name: "Autolane Schedule 9-8.xlsx", kind: "xls" },
  ],
};

// ---------------------------------------------------------------------------
// Base Power residential delivery (draft) — the worked example from
// docs/Executable SOP.pdf, so a second brand page has an SOP to show.
// ---------------------------------------------------------------------------

const BP_OWNER = "Jordan Eskew";

const bpNodes: SopNode[] = authored([
  {
    id: "bp-trigger",
    trigger: "An order is marked ready for fulfillment.",
    kind: "trigger",
    title: "Order ready for fulfillment",
    summary: "Base Power marks an order ready.",
    work: "An order is marked ready for fulfillment in the Base Power feed.",
    ownerName: BP_OWNER,
    actors: ["sol"],
    hardConstraints: [],
    learnedRules: [],
    successCriteria: "A run exists for the order.",
    verification: "automated",
    where: "BrickOS",
    when: "On order",
    autonomy: 4,
    provenance: "inferred",
    health: "idle",
    stats: { runs: 0, objectsCreated: 0, errors: 0, issues: 0 },
  },
  {
    id: "bp-1",
    trigger: "A run opens for the order.",
    kind: "step",
    title: "Create the work order",
    summary: "One delivery work order from the order.",
    work: "Create the delivery work order from the order: customer, address, agreed time window, and the kit list.",
    ownerName: BP_OWNER,
    actors: ["sol"],
    hardConstraints: [],
    learnedRules: [],
    successCriteria: "A work order exists with a kit list and a delivery window.",
    verification: "automated",
    where: "BrickOS",
    when: "Minutes",
    autonomy: 3,
    provenance: "inferred",
    health: "idle",
    stats: { runs: 0, objectsCreated: 0, errors: 0, issues: 0 },
  },
  {
    id: "bp-2",
    trigger: "The work order exists with a kit list.",
    kind: "step",
    title: "Kit the crate, night before",
    summary: "The crate must hold every component on the kit list.",
    work: "Assemble the kit and stage the crate for next-day dispatch. Complete before midnight. Every component on the kit list must be present.",
    ownerName: BP_OWNER,
    actors: ["network_operator"],
    hardConstraints: ["Complete before midnight.", "Every component on the kit list must be present."],
    learnedRules: [],
    successCriteria: "Photo of the open crate, timestamped before 00:00. Agent matches the contents against the kit list.",
    verification: "automated_plus_spot_check",
    where: "Warehouse",
    when: "Night before delivery",
    autonomy: 1,
    provenance: "stated",
    health: "idle",
    stats: { runs: 0, objectsCreated: 0, errors: 0, issues: 0 },
  },
  {
    id: "bp-3",
    trigger: "The crate was kitted and staged the night before.",
    kind: "step",
    title: "Deliver inside the window",
    summary: "Next day, inside the agreed time window.",
    work: "Deliver the next day inside the agreed time window.",
    ownerName: BP_OWNER,
    actors: ["network_operator"],
    hardConstraints: ["Arrive inside the agreed window."],
    learnedRules: [],
    successCriteria: "Arrival timestamp inside the window, confirmed by the driver app.",
    verification: "automated",
    where: "Field",
    when: "Delivery day",
    autonomy: 1,
    provenance: "stated",
    health: "idle",
    stats: { runs: 0, objectsCreated: 0, errors: 0, issues: 0 },
  },
  {
    id: "bp-4",
    trigger: "The driver arrives on site.",
    kind: "step",
    title: "Place clear of the driveway",
    summary: "Never block the customer's driveway.",
    work: "Never block the customer's driveway, unless the customer has given explicit instruction to.",
    ownerName: BP_OWNER,
    actors: ["network_operator"],
    hardConstraints: ["Never block the driveway without explicit customer instruction."],
    learnedRules: ["Added by Sol after an escalation: customers may explicitly ask for driveway placement."],
    successCriteria: "Placement photo shows the driveway clear, or the customer's instruction is attached.",
    verification: "automated_plus_spot_check",
    where: "Field",
    when: "Delivery day",
    autonomy: 1,
    provenance: "stated",
    health: "idle",
    stats: { runs: 0, objectsCreated: 0, errors: 0, issues: 0 },
  },
  {
    id: "bp-done",
    trigger: "Placement is verified.",
    kind: "completion",
    title: "Job closed",
    summary: "Placement verified and the job closed.",
    work: "The crate is placed, the placement is verified, and the job is closed.",
    ownerName: BP_OWNER,
    actors: ["sol"],
    hardConstraints: [],
    learnedRules: [],
    successCriteria: "All completion conditions hold.",
    verification: "automated",
    where: "BrickOS",
    when: "Delivery day",
    autonomy: 4,
    provenance: "inferred",
    health: "idle",
    stats: { runs: 0, objectsCreated: 0, errors: 0, issues: 0 },
  },
]);

export const basePowerDeliverySop: Sop = {
  id: "sop-bp-residential-delivery",
  brandId: "brand-basepower",
  name: "Base Power Residential Delivery",
  purpose: "When an order is ready for fulfillment, kit it the night before and deliver the next day inside the agreed window.",
  version: 1,
  status: "draft",
  ownerName: BP_OWNER,
  trigger: "An order is marked ready for fulfillment.",
  completion: bpNodes[5].work,
  primitiveTags: ["Kit & Stage", "Deliver & Deploy"],
  workflowTags: ["Create work orders"],
  updatedAt: "2026-09-08T15:41:00-07:00",
  versions: [{ version: 1, publishedAt: "2026-09-08T15:41:00-07:00", publishedBy: "Jordan Eskew", note: "Draft compiled from the Base Power delivery description." }],
  nodes: bpNodes,
  edges: [
    { id: "bpe-0", from: "bp-trigger", to: "bp-1" },
    { id: "bpe-1", from: "bp-1", to: "bp-2" },
    { id: "bpe-2", from: "bp-2", to: "bp-3" },
    { id: "bpe-3", from: "bp-3", to: "bp-4" },
    { id: "bpe-4", from: "bp-4", to: "bp-done" },
  ],
  blocks: [
    { id: "bp-b-intro", heading: "Base Power residential delivery", body: "When an order is ready for fulfillment, kit it the night before. The crate must hold every component on the kit list.", nodeId: "bp-2" },
    { id: "bp-b-2", heading: "Deliver the next day", body: "Deliver the next day inside the agreed time window.", nodeId: "bp-3" },
    { id: "bp-b-3", heading: "Placement", body: "Never block the customer's driveway.\n\n+ Added by the agent, Mon 3:41 PM: …unless the customer has given explicit instruction to.", nodeId: "bp-4" },
  ],
  attachments: [],
};

// Hand-authored SOPs first, then every file in src/data/sop-files/ (the
// Notion SOP Hub imports; see docs/sop-import-workflow.md).
export const sops: Sop[] = [autolaneWeeklyShiftsSop, basePowerDeliverySop, ...importedSops];

// ---------------------------------------------------------------------------
// Run history
// ---------------------------------------------------------------------------

// Ten weekly runs of the Autolane SOP, oldest first. The latest one is stuck at
// the setup check (see the node runs below); the rest completed.
function weekRun(index: number, mondayISO: string, version: number, status: SopRun["status"], touches: number, escalations: number): SopRun {
  // Runs open Sunday 6pm PT and close Monday 5pm PT (the operators' clock);
  // the operating week itself is labelled in Central, Autolane's timezone.
  const monday = new Date(`${mondayISO}T00:00:00-07:00`);
  const sunday = new Date(monday.getTime() - 24 * 3600 * 1000);
  const tue = new Date(monday.getTime() + 24 * 3600 * 1000);
  const nextMon = new Date(monday.getTime() + 7 * 24 * 3600 * 1000);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Chicago" });
  return {
    id: `run-al-${String(index).padStart(2, "0")}`,
    sopId: AL,
    version,
    label: `Week of ${fmt(tue)} – ${fmt(nextMon)}`,
    status,
    startedAt: new Date(sunday.getTime() + 18 * 3600 * 1000).toISOString(),
    completedAt: status === "succeeded" ? new Date(monday.getTime() + 17 * 3600 * 1000).toISOString() : null,
    humanTouches: touches,
    escalations,
  };
}


// ---------------------------------------------------------------------------
// Work Order Finalization: Project-Based Customers — run history
//
// A finalization sweep runs per brand. The source document leaves the cadence
// TBD, so these are written as a Friday-morning sweep. Each run walks one
// brand's completed work orders; what varies between runs is what the sweep
// found — work orders held up by an open task, margins outside the band, tasks
// sitting at $0 — and how many came out finalized rather than blocked.
// ---------------------------------------------------------------------------

const WOF = "sop-work-order-finalization-project-based";
const wnode = (step: string) => `${WOF}/${step}`;

interface SweepShape {
  brand: string;
  orders: number; // completed work orders in the sweep
  openTasks: number; // held up by an in-progress or overdue task
  flagged: number; // tripped the margin or the $0-charge check
  finalized: number;
  // What the flags were, in the operator's words. One line per flag.
  findings: string[];
  // The step the run stopped on, when it never reached the end.
  stoppedAt?: string;
}

const SWEEPS: Record<string, SweepShape> = {
  "run-wof-01": { brand: "CrateCo", orders: 6, openTasks: 0, flagged: 0, finalized: 6, findings: [] },
  "run-wof-02": { brand: "EngageMD", orders: 9, openTasks: 2, flagged: 0, finalized: 7, findings: [] },
  "run-wof-03": {
    brand: "Sigma Pi Phi Fraternity Inc", orders: 5, openTasks: 0, flagged: 1, finalized: 4,
    findings: ["Teardown work order at 71% margin, above the ~60% ceiling for event ops."],
  },
  "run-wof-04": { brand: "CrateCo", orders: 7, openTasks: 1, flagged: 0, finalized: 6, findings: [] },
  "run-wof-05": {
    brand: "Promobile", orders: 11, openTasks: 1, flagged: 2, finalized: 8,
    findings: [
      "Post-event inspection completed at $0; the operator's tracker shows 621 items at $1.",
      "Load-out at 4% margin, under the ~30% working reference.",
    ],
  },
  "run-wof-06": { brand: "EngageMD", orders: 8, openTasks: 0, flagged: 0, finalized: 8, findings: [] },
  "run-wof-07": {
    brand: "Sigma Pi Phi Fraternity Inc", orders: 6, openTasks: 1, flagged: 1, finalized: 4,
    findings: ["Two setup tasks at $0 with no covering charge anywhere on the work order."],
  },
  "run-wof-08": {
    brand: "Promobile", orders: 10, openTasks: 2, flagged: 3, finalized: 5,
    findings: [
      "Three tasks at $0 across two work orders; nothing in Slack or email explains them.",
      "Rigging work order at -2% margin.",
    ],
    stoppedAt: "ping-am",
  },
};

// Sweeps open Friday 9:00am PT.
function sweepRun(index: number, fridayISO: string, status: SopRun["status"], touches: number, escalations: number): SopRun {
  const id = `run-wof-${String(index).padStart(2, "0")}`;
  const start = new Date(`${fridayISO}T09:00:00-07:00`);
  const shape = SWEEPS[id];
  const fmt = start.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Los_Angeles" });
  return {
    id,
    sopId: WOF,
    version: 1,
    label: `${shape.brand} · ${fmt}`,
    status,
    startedAt: start.toISOString(),
    // A sweep that stopped never completed; the span ends at its last node.
    completedAt: status === "succeeded" ? new Date(start.getTime() + (35 + shape.orders * 4 + shape.flagged * 22) * 60000).toISOString() : null,
    humanTouches: touches,
    escalations,
  };
}

const wofRuns: SopRun[] = [
  sweepRun(1, "2026-07-24", "succeeded", 4, 0),
  sweepRun(2, "2026-07-31", "succeeded", 6, 0),
  sweepRun(3, "2026-08-07", "succeeded", 7, 1),
  sweepRun(4, "2026-08-14", "succeeded", 5, 0),
  sweepRun(5, "2026-08-21", "succeeded", 9, 1),
  sweepRun(6, "2026-08-28", "succeeded", 4, 0),
  sweepRun(7, "2026-09-04", "escalated", 8, 1),
  sweepRun(8, "2026-09-11", "failed", 6, 2),
];

// Builds the node runs for one sweep. Every sweep walks the same spine; the
// branches it takes, and what each step logs, come from the sweep's shape.
function generateSweepRun(run: SopRun): SopNodeRun[] {
  const shape = SWEEPS[run.id];
  if (!shape) return [];
  const t0 = new Date(run.startedAt).getTime();
  const min = (m: number) => new Date(t0 + m * 60000).toISOString();
  const short = run.id.slice(-2);
  const clean = shape.orders - shape.openTasks;

  // Minute offset and duration per step, so the run reads as one morning.
  let cursor = 0;
  const node = (
    step: string,
    minutes: number,
    extra: Partial<SopNodeRun> & Pick<SopNodeRun, "logs">,
  ): SopNodeRun => {
    const startedAt = min(cursor);
    cursor += minutes;
    return {
      id: `nr-wof${short}-${step}`,
      sopRunId: run.id,
      nodeId: wnode(step),
      status: "succeeded",
      startedAt,
      runtimeSeconds: minutes * 60,
      subtasksTriggered: 1,
      objectsCreated: [],
      errors: [],
      issues: [],
      ...extra,
    };
  };

  const runs: SopNodeRun[] = [
    node("trigger", 1, {
      subtasksTriggered: 1,
      logs: [L(min(0), "info", `Finalization sweep opened for ${shape.brand}.`)],
      objectsCreated: [{ kind: "Automation run", label: run.label, ref: run.id }],
    }),
    node("open-brand", 3, {
      logs: [
        L(min(cursor), "info", `Opened ${shape.brand} on the finalization page.`),
        L(min(cursor), "info", "Read the brand's rate setup, work type and account manager before touching any work order."),
      ],
    }),
    node("expand-tasks", 4 + shape.orders, {
      subtasksTriggered: shape.orders,
      logs: [
        L(min(cursor), "info", `Expanded ${shape.orders} completed work orders and read every task underneath.`),
        shape.openTasks > 0
          ? L(min(cursor), "warn", `${shape.openTasks} work order${shape.openTasks === 1 ? " has" : "s have"} a task still in progress or overdue.`)
          : L(min(cursor), "info", "Every task on every work order is complete."),
      ],
      issues: shape.openTasks > 0 ? [`${shape.openTasks} work order${shape.openTasks === 1 ? "" : "s"} held up by an open task.`] : [],
    }),
    node("task-status", 1, {
      logs: [L(min(cursor), "info", `${clean} work order${clean === 1 ? "" : "s"} clear to check, ${shape.openTasks} to chase.`)],
    }),
  ];

  if (shape.openTasks > 0) {
    runs.push(
      node("chase-operator", 6, {
        subtasksTriggered: shape.openTasks,
        logs: [L(min(cursor), "info", `Posted ${shape.openTasks} task link${shape.openTasks === 1 ? "" : "s"} in the brand channel, tagging the assigned operator.`)],
        objectsCreated: Array.from({ length: shape.openTasks }, (_, i) => ({
          kind: "Slack message",
          label: `Chase on open task ${i + 1}`,
          ref: `${shape.brand.toLowerCase().replace(/\W+/g, "-")}-chase-${i + 1}`,
        })),
      }),
    );
  }

  runs.push(
    node("check-rates", 3, {
      logs: [L(min(cursor), "info", "Read the brand's rate setup in Portal.")],
    }),
    node("check-margin", 5 + clean, {
      subtasksTriggered: clean,
      logs: [L(min(cursor), "info", `Read margin on ${clean} completed work order${clean === 1 ? "" : "s"}.`)],
    }),
    node("check-charges", 6 + clean, {
      subtasksTriggered: clean,
      status: shape.flagged > 0 ? "escalated" : "succeeded",
      logs: [
        L(min(cursor), "info", `Walked every completed task on ${clean} work order${clean === 1 ? "" : "s"} looking for $0.`),
        ...shape.findings.map((f) => L(min(cursor), "warn", f)),
      ],
      issues: shape.findings,
    }),
    node("flag-status", 1, {
      logs: [
        L(min(cursor), "info", shape.flagged > 0 ? `${shape.flagged} flag${shape.flagged === 1 ? "" : "s"} to resolve before finalizing.` : "Nothing flagged."),
      ],
    }),
  );

  if (shape.flagged > 0) {
    runs.push(
      node("search-context", 14, {
        subtasksTriggered: shape.flagged * 3,
        logs: [
          L(min(cursor), "info", "Searched the brand's Slack channels and the account manager's email."),
          L(min(cursor), "warn", "Granola notes were not searched: no API, so the call notes went unread."),
        ],
        issues: ["Granola was not searched; the evidence may be incomplete."],
      }),
      node("ping-am", shape.stoppedAt === "ping-am" ? 20 : 8, {
        status: shape.stoppedAt === "ping-am" ? "failed" : "succeeded",
        subtasksTriggered: 1,
        logs: [
          L(min(cursor), "info", "Pinged the account manager with the work order, the task and what the search turned up."),
          ...(shape.stoppedAt === "ping-am"
            ? [L(min(cursor), "error", "No reply by end of day. The sweep cannot finalize these work orders without the rate confirmed.")]
            : [L(min(cursor), "info", "Account manager confirmed the rate; manual charge added.")]),
        ],
        objectsCreated: [{ kind: "Slack message", label: "Finalization question to the account manager" }],
        errors: shape.stoppedAt === "ping-am" ? ["Account manager did not respond; run stopped with work orders unfinalized."] : [],
      }),
    );
  }

  if (shape.stoppedAt === "ping-am") return runs;

  const blocked = shape.orders - shape.finalized;
  runs.push(
    node("finalize-check", 3, {
      subtasksTriggered: clean,
      logs: [L(min(cursor), "info", `Proposed a verdict on ${clean} work order${clean === 1 ? "" : "s"}; the account manager approved.`)],
    }),
    node("finalize", 2 + shape.finalized, {
      subtasksTriggered: shape.finalized,
      logs: [L(min(cursor), "info", `Finalized ${shape.finalized} work order${shape.finalized === 1 ? "" : "s"}. Charges are now locked.`)],
      objectsCreated: Array.from({ length: Math.min(shape.finalized, 4) }, (_, i) => ({
        kind: "Work order",
        label: `${shape.brand} work order finalized`,
        ref: `wo-${short}-${i + 1}`,
      })),
    }),
  );

  if (blocked > 0) {
    runs.push(
      node("leave-blocked", 5, {
        subtasksTriggered: blocked,
        status: "escalated",
        logs: [
          L(min(cursor), "warn", `${blocked} work order${blocked === 1 ? "" : "s"} left blocked, each with a named blocker posted in the brand channel.`),
        ],
        issues: [`${blocked} work order${blocked === 1 ? "" : "s"} carried into the next sweep.`],
      }),
    );
  }

  runs.push(
    node("next-order", 1, {
      logs: [L(min(cursor), "info", `${shape.brand} complete for this sweep.`)],
    }),
    node("done", 1, {
      logs: [L(min(cursor), "info", `${shape.finalized} finalized, ${blocked} left blocked with a named person chasing each one.`)],
    }),
  );

  return runs;
}

export const sopRuns: SopRun[] = [
  weekRun(1, "2026-07-06", 1, "succeeded", 6, 1),
  weekRun(2, "2026-07-13", 1, "succeeded", 5, 0),
  weekRun(3, "2026-07-20", 1, "succeeded", 4, 1),
  weekRun(4, "2026-07-27", 2, "succeeded", 4, 0),
  weekRun(5, "2026-08-03", 2, "succeeded", 3, 0),
  weekRun(6, "2026-08-10", 2, "succeeded", 3, 1),
  weekRun(7, "2026-08-17", 2, "succeeded", 2, 0),
  weekRun(8, "2026-08-24", 3, "succeeded", 2, 0),
  weekRun(9, "2026-08-31", 3, "succeeded", 2, 0),
  weekRun(10, "2026-09-07", 3, "failed", 1, 1),
  ...wofRuns,
];

const L = (at: string, level: SopLogEntry["level"], message: string): SopLogEntry => ({ at, level, message });

// Hand-written node runs for the two most recent weeks: the current run
// (run-al-10) got as far as the setup check and failed there, and the week
// before (run-al-09) is written out in full detail for the later steps. Older
// weeks are generated below so every run instance has logs to inspect.
const handwrittenNodeRuns: SopNodeRun[] = [
  {
    id: "nr-al10-trigger",
    sopRunId: "run-al-10",
    nodeId: "al-trigger",
    status: "succeeded",
    startedAt: "2026-09-06T18:00:00-07:00",
    runtimeSeconds: 2,
    subtasksTriggered: 1,
    logs: [L("2026-09-06T18:00:01-07:00", "info", "Run opened for operating week Tue Sep 8 – Mon Sep 14 (America/Chicago).")],
    objectsCreated: [{ kind: "Automation run", label: "Week of Sep 8 – Sep 14", ref: "run-al-10" }],
    errors: [],
    issues: [],
  },
  {
    id: "nr-al10-1",
    sopRunId: "run-al-10",
    nodeId: "al-1",
    status: "succeeded",
    startedAt: "2026-09-06T18:00:03-07:00",
    runtimeSeconds: 13_320,
    subtasksTriggered: 2,
    logs: [
      L("2026-09-06T18:00:03-07:00", "info", "Watching #autolane-brick for a schedule post."),
      L("2026-09-06T20:00:00-07:00", "info", "No schedule by 8:00pm PT. Sent one reminder to #autolane-brick."),
      L("2026-09-06T21:42:11-07:00", "info", "Schedule received: \"Autolane Schedule 9-8.xlsx\" posted by Dana (Autolane)."),
      L("2026-09-06T21:42:12-07:00", "info", "Handing the file to the reader step."),
    ],
    objectsCreated: [{ kind: "Slack message", label: "Reminder in #autolane-brick", ref: "1757214000.0021" }],
    errors: [],
    issues: [],
  },
  {
    id: "nr-al10-2",
    sopRunId: "run-al-10",
    nodeId: "al-2",
    status: "succeeded",
    startedAt: "2026-09-06T21:42:20-07:00",
    runtimeSeconds: 94,
    subtasksTriggered: 4,
    logs: [
      L("2026-09-06T21:42:20-07:00", "info", "Parsing grid: 3 sites × 7 days."),
      L("2026-09-06T21:42:41-07:00", "info", "Sites: Cherrywood, Mueller, South Congress. Shift kinds: Lunch, Dinner, Dinner Peak."),
      L("2026-09-06T21:43:02-07:00", "warn", "Notes say \"no lunch at Mueller this week\" but the grid shows Lunch at Mueller on Wed 9/9 (1 supervisor). Grid wins; conflict flagged."),
      L("2026-09-06T21:43:54-07:00", "info", "Shift list complete: 27 shifts, 31 supervisor slots. All times Central."),
    ],
    objectsCreated: [{ kind: "Shift list", label: "27 shifts / 31 supervisor slots", ref: "shiftlist-al10" }],
    errors: [],
    issues: ["Notes contradict the grid for Mueller on Wed 9/9 (Lunch). Grid used; owner should confirm."],
  },
  {
    id: "nr-al10-3",
    sopRunId: "run-al-10",
    nodeId: "al-3",
    status: "succeeded",
    startedAt: "2026-09-06T21:44:00-07:00",
    runtimeSeconds: 21,
    subtasksTriggered: 1,
    logs: [
      L("2026-09-06T21:44:00-07:00", "info", "Searching Daily Supervision Shifts work orders dated Sep 8 – Sep 14 for brand Autolane."),
      L("2026-09-06T21:44:18-07:00", "warn", "Found 1 existing work order: \"Cherrywood - Tue 9/8\" (created manually Sep 4 by Mateo). Not a full week; leaving for a person to decide."),
      L("2026-09-06T21:44:21-07:00", "info", "No duplicates for the remaining 20 site-days. Continuing."),
    ],
    objectsCreated: [],
    errors: [],
    issues: ["1 existing work order for Cherrywood on Tue 9/8. Decide: keep and skip, or replace."],
  },
  {
    id: "nr-al10-4",
    sopRunId: "run-al-10",
    nodeId: "al-4",
    status: "failed",
    startedAt: "2026-09-07T10:15:00-07:00",
    runtimeSeconds: 335,
    subtasksTriggered: 5,
    logs: [
      L("2026-09-07T10:15:00-07:00", "info", "Resolving 5 saved references for Autolane."),
      L("2026-09-07T10:15:02-07:00", "info", "Brand brand-autolane: active."),
      L("2026-09-07T10:15:03-07:00", "info", "Work order type \"Daily Supervision Shifts\" (order-kind-al-shifts): active."),
      L("2026-09-07T10:15:03-07:00", "info", "Task type \"Supervise Vehicle\" (task-kind-al-supervise): active."),
      L("2026-09-07T10:16:40-07:00", "error", "Product ref prod_4c1e9a (\"Tesla Model Y\") returned 404. Looked up by name: found prod_7b20d3 \"Tesla Model Y (2026)\". Saved reference updated."),
      L("2026-09-07T10:19:12-07:00", "error", "Austin assignment to network operator returned status \"inactive\" (ended 2026-09-01). No active assignment found by name."),
      L("2026-09-07T10:20:35-07:00", "warn", "Cannot confirm setup. Stopping before drafting; escalating to the owner with the two findings."),
    ],
    objectsCreated: [],
    errors: [
      "Product reference prod_4c1e9a (Tesla Model Y) no longer exists; re-resolved by name to prod_7b20d3.",
      "Austin ↔ network operator assignment is inactive (ended 2026-09-01).",
    ],
    issues: ["Austin assignment inactive. Confirm the network operator for Austin before the week is drafted."],
  },
  {
    id: "nr-al10-esc",
    sopRunId: "run-al-10",
    nodeId: "al-escalate",
    status: "escalated",
    startedAt: "2026-09-07T10:20:36-07:00",
    runtimeSeconds: 4,
    subtasksTriggered: 1,
    logs: [
      L("2026-09-07T10:20:36-07:00", "info", "Escalation sent to Mateo Rivera in Slack with the run summary and the two setup findings."),
      L("2026-09-07T10:20:40-07:00", "info", "Awaiting acknowledgement. Suggested Automation change: re-resolve inactive assignments by region name before failing."),
    ],
    objectsCreated: [{ kind: "Escalation", label: "Setup check failed for week of Sep 8", ref: "esc-al10-01" }],
    errors: [],
    issues: ["Open escalation, unacknowledged since Sep 7 10:20 AM PT."],
  },
  // Week of Sep 1 – Sep 7 (run-al-09), the last complete run of the later steps.
  {
    id: "nr-al09-5",
    sopRunId: "run-al-09",
    nodeId: "al-5",
    status: "succeeded",
    startedAt: "2026-08-30T21:50:00-07:00",
    runtimeSeconds: 48,
    subtasksTriggered: 21,
    logs: [
      L("2026-08-30T21:50:00-07:00", "info", "Drafting 21 work orders (3 sites × 7 days) from 28 shifts."),
      L("2026-08-30T21:50:31-07:00", "info", "34 Supervise Vehicle tasks drafted. 6 Dinner Peak shifts noted."),
      L("2026-08-30T21:50:47-07:00", "info", "Flags: South Congress adds a Dinner Peak on Fri 9/4 (new vs last week)."),
    ],
    objectsCreated: [
      { kind: "Draft plan", label: "21 work orders / 34 tasks", ref: "plan-al09" },
      { kind: "Draft work order", label: "Cherrywood - Tue 9/1", ref: "draft-al09-01" },
      { kind: "Draft work order", label: "Mueller - Tue 9/1", ref: "draft-al09-02" },
      { kind: "Draft work order", label: "South Congress - Tue 9/1", ref: "draft-al09-03" },
    ],
    errors: [],
    issues: [],
  },
  {
    id: "nr-al09-6",
    sopRunId: "run-al-09",
    nodeId: "al-6",
    status: "succeeded",
    startedAt: "2026-08-31T09:12:00-07:00",
    runtimeSeconds: 1_140,
    subtasksTriggered: 0,
    logs: [
      L("2026-08-31T09:12:00-07:00", "info", "Plan opened by Mateo Rivera in the Review UI."),
      L("2026-08-31T09:31:00-07:00", "info", "Approved as drafted. Comment: \"Fri peak at South Congress confirmed with Dana.\""),
    ],
    objectsCreated: [{ kind: "Approval", label: "Approved by Mateo Rivera", ref: "appr-al09" }],
    errors: [],
    issues: [],
  },
  {
    id: "nr-al09-7",
    sopRunId: "run-al-09",
    nodeId: "al-7",
    status: "succeeded",
    startedAt: "2026-08-31T09:31:10-07:00",
    runtimeSeconds: 77,
    subtasksTriggered: 21,
    logs: [
      L("2026-08-31T09:31:10-07:00", "info", "Creating 21 approved work orders in BrickOS."),
      L("2026-08-31T09:31:58-07:00", "error", "Save failed for \"Mueller - Sat 9/5\" (timeout). Retrying only that one."),
      L("2026-08-31T09:32:14-07:00", "info", "Retry saved. 21 of 21 work orders created, 34 tasks, ids recorded on the run."),
    ],
    objectsCreated: [
      { kind: "Work order", label: "Cherrywood - Tue 9/1", ref: "wo-al-0901-chw" },
      { kind: "Work order", label: "Mueller - Tue 9/1", ref: "wo-al-0901-mue" },
      { kind: "Work order", label: "South Congress - Tue 9/1", ref: "wo-al-0901-soc" },
      { kind: "Work order", label: "… 18 more", ref: "plan-al09" },
    ],
    errors: ["Transient save timeout on \"Mueller - Sat 9/5\"; retried once, succeeded."],
    issues: [],
  },
  {
    id: "nr-al09-8",
    sopRunId: "run-al-09",
    nodeId: "al-8",
    status: "succeeded",
    startedAt: "2026-08-31T09:33:00-07:00",
    runtimeSeconds: 160,
    subtasksTriggered: 22,
    logs: [
      L("2026-08-31T09:33:00-07:00", "info", "Verifier agent comparing 21 work orders against the approved plan."),
      L("2026-08-31T09:34:50-07:00", "info", "Counts match: 21 work orders, 34 tasks, 21 vehicles. Times and notes match."),
      L("2026-08-31T09:35:40-07:00", "info", "Human spot check (4 of 21) by Priya Natarajan: no mismatches."),
    ],
    objectsCreated: [{ kind: "Verification report", label: "21/21 match", ref: "verify-al09" }],
    errors: [],
    issues: [],
  },
  {
    id: "nr-al09-9",
    sopRunId: "run-al-09",
    nodeId: "al-9",
    status: "succeeded",
    startedAt: "2026-08-31T09:36:00-07:00",
    runtimeSeconds: 2_700,
    subtasksTriggered: 1,
    logs: [
      L("2026-08-31T09:36:00-07:00", "info", "Drafted: \"Autolane's week of Sep 1 to Sep 7 is ready across Cherrywood, Mueller and South Congress: 28 shifts, 6 of them dinner peaks. South Congress adds a Friday peak this week. Please review and assign supervisors in the portal.\""),
      L("2026-08-31T10:21:00-07:00", "info", "Sent by Mateo Rivera in #golojix-austin."),
    ],
    objectsCreated: [{ kind: "Slack message", label: "Weekly message in #golojix-austin", ref: "1756657260.0007" }],
    errors: [],
    issues: [],
  },
  {
    id: "nr-al09-done",
    sopRunId: "run-al-09",
    nodeId: "al-done",
    status: "succeeded",
    startedAt: "2026-08-31T10:21:05-07:00",
    runtimeSeconds: 1,
    subtasksTriggered: 0,
    logs: [L("2026-08-31T10:21:05-07:00", "info", "All completion conditions hold. Run closed.")],
    objectsCreated: [],
    errors: [],
    issues: [],
  },
];

// ---------------------------------------------------------------------------
// Generated node runs for the completed weeks
// ---------------------------------------------------------------------------

interface WeekShape {
  shifts: number;
  slots: number;
  peaks: number;
  workOrders: number;
  arrival: string; // HH:MM PT Sunday
  reminder: boolean;
  escalation: { at: string; reason: string; resolution: string } | null;
  retry: boolean;
}

// One row per completed run, oldest first. Numbers drift week to week; the
// escalations are the ones that produced the later SOP versions.
const WEEK_SHAPES: Record<string, WeekShape> = {
  "run-al-01": { shifts: 24, slots: 27, peaks: 4, workOrders: 21, arrival: "22:15", reminder: true, retry: false,
    escalation: { at: "21:58", reason: "Schedule arrived as a photo of a whiteboard, not a spreadsheet. Unreadable by the parser.", resolution: "Owner transcribed the grid by hand. Codified in v2: an image counts as arrived and goes to the reader as-is." } },
  "run-al-02": { shifts: 25, slots: 28, peaks: 4, workOrders: 21, arrival: "21:20", reminder: false, retry: false, escalation: null },
  "run-al-03": { shifts: 26, slots: 30, peaks: 5, workOrders: 21, arrival: "21:47", reminder: false, retry: false,
    escalation: { at: "22:06", reason: "A new site, \"South Congress\", appears on the grid for the first time.", resolution: "Owner confirmed the site with Autolane and approved the plan with it included." } },
  "run-al-04": { shifts: 27, slots: 31, peaks: 5, workOrders: 21, arrival: "20:55", reminder: false, retry: false, escalation: null },
  "run-al-05": { shifts: 27, slots: 32, peaks: 6, workOrders: 21, arrival: "21:30", reminder: false, retry: false, escalation: null },
  "run-al-06": { shifts: 28, slots: 33, peaks: 6, workOrders: 21, arrival: "21:12", reminder: false, retry: true,
    escalation: { at: "09:41", reason: "3 of 21 work orders failed to save (BrickOS timeout). The retry re-created 1 that had already saved.", resolution: "Owner deleted the duplicate. Codified in v3: retry only the ones that failed, never one that already saved." } },
  "run-al-07": { shifts: 28, slots: 33, peaks: 6, workOrders: 21, arrival: "21:05", reminder: false, retry: false, escalation: null },
  "run-al-08": { shifts: 28, slots: 34, peaks: 6, workOrders: 21, arrival: "20:48", reminder: false, retry: false, escalation: null },
  "run-al-09": { shifts: 28, slots: 34, peaks: 6, workOrders: 21, arrival: "21:33", reminder: false, retry: true, escalation: null },
};

// Builds an ISO timestamp on a given day (offset in days from the run's Sunday)
// at HH:MM Pacific.
function at(run: SopRun, dayOffset: number, hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  // startedAt is Sunday evening PT. Find that Sunday's midnight in PT (UTC-7),
  // then add the day offset and the requested wall-clock time.
  const ptMidnight = new Date(new Date(run.startedAt).getTime() - 7 * 3600 * 1000);
  ptMidnight.setUTCHours(0, 0, 0, 0);
  return new Date(ptMidnight.getTime() + dayOffset * 24 * 3600 * 1000 + (h + 7) * 3600 * 1000 + m * 60 * 1000).toISOString();
}

function minutesBetween(a: string, b: string): number {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 1000));
}

function generateCompletedRun(run: SopRun): SopNodeRun[] {
  const w = WEEK_SHAPES[run.id];
  if (!w) return [];
  const id = (node: string) => `nr-${run.id.slice(-4)}-${node}`;
  const week = run.label.replace("Week of ", "");
  const arrived = at(run, 0, w.arrival);
  const readStart = at(run, 0, w.arrival.replace(/^(\d+):(\d+)$/, (_, h, m) => `${h}:${String(Number(m) + 1).padStart(2, "0")}`));
  const dupStart = at(run, 0, "23:05");
  const setupStart = at(run, 0, "23:08");
  const draftStart = at(run, 0, "23:12");
  const reviewStart = at(run, 1, "09:05");
  const approvedAt = at(run, 1, "09:26");
  const createStart = at(run, 1, "09:27");
  const verifyStart = at(run, 1, "09:30");
  const messageStart = at(run, 1, "09:34");
  const sentAt = at(run, 1, "10:12");

  const runs: SopNodeRun[] = [
    {
      id: id("trigger"), sopRunId: run.id, nodeId: "al-trigger", status: "succeeded", startedAt: run.startedAt, runtimeSeconds: 2, subtasksTriggered: 1,
      logs: [L(run.startedAt, "info", `Run opened for operating week ${week} (America/Chicago).`)],
      objectsCreated: [{ kind: "Automation run", label: run.label, ref: run.id }], errors: [], issues: [],
    },
    {
      id: id("1"), sopRunId: run.id, nodeId: "al-1", status: "succeeded", startedAt: run.startedAt, runtimeSeconds: minutesBetween(run.startedAt, arrived), subtasksTriggered: w.reminder ? 2 : 1,
      logs: [
        L(run.startedAt, "info", "Watching #autolane-brick for a schedule post."),
        ...(w.reminder ? [L(at(run, 0, "20:00"), "info", "No schedule by 8:00pm PT. Sent one reminder to #autolane-brick.")] : []),
        L(arrived, "info", `Schedule received in #autolane-brick. Handing the file to the reader step.`),
      ],
      objectsCreated: w.reminder ? [{ kind: "Slack message", label: "Reminder in #autolane-brick" }] : [], errors: [], issues: [],
    },
    {
      id: id("2"), sopRunId: run.id, nodeId: "al-2", status: "succeeded", startedAt: readStart, runtimeSeconds: 70 + w.shifts, subtasksTriggered: 4,
      logs: [
        L(readStart, "info", "Parsing grid: sites × 7 days."),
        L(readStart, "info", `Shift list complete: ${w.shifts} shifts, ${w.slots} supervisor slots, ${w.peaks} dinner peaks. All times Central.`),
      ],
      objectsCreated: [{ kind: "Shift list", label: `${w.shifts} shifts / ${w.slots} supervisor slots` }], errors: [], issues: [],
    },
    {
      id: id("3"), sopRunId: run.id, nodeId: "al-3", status: "succeeded", startedAt: dupStart, runtimeSeconds: 19, subtasksTriggered: 1,
      logs: [L(dupStart, "info", `Searching Daily Supervision Shifts work orders for ${week}.`), L(dupStart, "info", "No existing work orders for the week. Continuing.")],
      objectsCreated: [], errors: [], issues: [],
    },
    {
      id: id("4"), sopRunId: run.id, nodeId: "al-4", status: "succeeded", startedAt: setupStart, runtimeSeconds: 12, subtasksTriggered: 5,
      logs: [L(setupStart, "info", "Resolving 5 saved references for Autolane."), L(setupStart, "info", "Brand, work order type, task type, Austin assignment, Tesla Model Y: all active.")],
      objectsCreated: [], errors: [], issues: [],
    },
    {
      id: id("5"), sopRunId: run.id, nodeId: "al-5", status: "succeeded", startedAt: draftStart, runtimeSeconds: 40 + w.workOrders, subtasksTriggered: w.workOrders,
      logs: [
        L(draftStart, "info", `Drafting ${w.workOrders} work orders from ${w.shifts} shifts.`),
        L(draftStart, "info", `${w.slots} Supervise Vehicle tasks drafted. ${w.peaks} Dinner Peak shifts noted.`),
      ],
      objectsCreated: [{ kind: "Draft plan", label: `${w.workOrders} work orders / ${w.slots} tasks` }], errors: [], issues: [],
    },
    {
      id: id("6"), sopRunId: run.id, nodeId: "al-6", status: "succeeded", startedAt: reviewStart, runtimeSeconds: minutesBetween(reviewStart, approvedAt), subtasksTriggered: 0,
      logs: [L(reviewStart, "info", "Plan opened by Mateo Rivera in the Review UI."), L(approvedAt, "info", "Approved as drafted.")],
      objectsCreated: [{ kind: "Approval", label: "Approved by Mateo Rivera" }], errors: [], issues: [],
    },
    {
      id: id("7"), sopRunId: run.id, nodeId: "al-7", status: "succeeded", startedAt: createStart, runtimeSeconds: 60 + w.workOrders, subtasksTriggered: w.workOrders,
      logs: [
        L(createStart, "info", `Creating ${w.workOrders} approved work orders in BrickOS.`),
        ...(w.retry ? [L(createStart, "error", "Save failed for one work order (timeout). Retrying.")] : []),
        L(createStart, "info", `${w.workOrders} of ${w.workOrders} work orders created, ${w.slots} tasks, ids recorded on the run.`),
      ],
      objectsCreated: [{ kind: "Work order", label: `${w.workOrders} work orders for ${week}` }],
      errors: w.retry ? ["Transient save timeout; retried."] : [], issues: [],
    },
    {
      id: id("8"), sopRunId: run.id, nodeId: "al-8", status: "succeeded", startedAt: verifyStart, runtimeSeconds: 150, subtasksTriggered: w.workOrders + 1,
      logs: [
        L(verifyStart, "info", `Verifier agent comparing ${w.workOrders} work orders against the approved plan.`),
        L(verifyStart, "info", `Counts match: ${w.workOrders} work orders, ${w.slots} tasks, ${w.workOrders} vehicles. Human spot check: no mismatches.`),
      ],
      objectsCreated: [{ kind: "Verification report", label: `${w.workOrders}/${w.workOrders} match` }], errors: [], issues: [],
    },
    {
      id: id("9"), sopRunId: run.id, nodeId: "al-9", status: "succeeded", startedAt: messageStart, runtimeSeconds: minutesBetween(messageStart, sentAt), subtasksTriggered: 1,
      logs: [
        L(messageStart, "info", `Drafted the weekly message: ${w.shifts} shifts across the Austin sites, ${w.peaks} dinner peaks.`),
        L(sentAt, "info", "Sent by Mateo Rivera in #golojix-austin."),
      ],
      objectsCreated: [{ kind: "Slack message", label: "Weekly message in #golojix-austin" }], errors: [], issues: [],
    },
    {
      id: id("done"), sopRunId: run.id, nodeId: "al-done", status: "succeeded", startedAt: sentAt, runtimeSeconds: 1, subtasksTriggered: 0,
      logs: [L(sentAt, "info", "All completion conditions hold. Run closed.")],
      objectsCreated: [], errors: [], issues: [],
    },
  ];

  if (w.escalation) {
    // Escalations happen on Sunday night unless the shape says Monday (a
    // creation-time failure), which the 09:xx wall clock signals.
    const day = w.escalation.at.startsWith("09") ? 1 : 0;
    const escAt = at(run, day, w.escalation.at);
    runs.push({
      id: id("esc"), sopRunId: run.id, nodeId: "al-escalate", status: "succeeded", startedAt: escAt, runtimeSeconds: 3, subtasksTriggered: 1,
      logs: [
        L(escAt, "warn", `Escalation sent to Mateo Rivera: ${w.escalation.reason}`),
        L(escAt, "info", `Resolved: ${w.escalation.resolution}`),
      ],
      objectsCreated: [{ kind: "Escalation", label: w.escalation.reason.split(".")[0] }],
      errors: [], issues: [w.escalation.reason],
    });
  }
  return runs;
}

// Every node run: generated history first, then the hand-written detail on
// top (a hand-written entry replaces the generated one for the same node and
// run).
export const sopNodeRuns: SopNodeRun[] = (() => {
  const generated = sopRuns.flatMap((r) => [...generateCompletedRun(r), ...generateSweepRun(r)]);
  const key = (r: SopNodeRun) => `${r.sopRunId}/${r.nodeId}`;
  const handwritten = new Set(handwrittenNodeRuns.map(key));
  return [...generated.filter((r) => !handwritten.has(key(r))), ...handwrittenNodeRuns];
})();
