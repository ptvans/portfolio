// Mirrors the core entities from brick-core's domain model (see brick-core/domain_model.md).
// This is a prototype: types are simplified/flattened for mock data, not a 1:1 API contract.

export type ID = string;

export interface Region {
  id: ID;
  name: string;
  country: string;
  status: "active" | "launching" | "planned";
  networkOperatorIds: ID[];
  // One live BRNO per region. An NO sees only the regions where it is this.
  liveNetworkOperatorId?: ID;
}

export interface Skill {
  id: ID;
  name: string;
}

export interface NetworkOperator {
  id: ID;
  name: string;
  regionId: ID;
  warehouseIds: ID[];
  fieldOperatorIds: ID[];
  vehicleIds: ID[];
  contactName: string;
  contactEmail: string;
  status: "active" | "onboarding" | "paused";
}

export interface Warehouse {
  id: ID;
  name: string;
  networkOperatorId: ID;
  address: string;
  regionId: ID;
  // Where the building sits, used as the depot every route leaves from and
  // returns to (see data/routes.ts). Optional — a warehouse without coordinates
  // can't anchor a route plan.
  lat?: number;
  lng?: number;
}

export interface FieldOperator {
  id: ID;
  name: string;
  networkOperatorId: ID;
  skillIds: ID[];
  status: "on_shift" | "off_shift" | "on_break";
  avatarColor: string;
}

export interface Vehicle {
  id: ID;
  label: string;
  type: "van" | "box_truck" | "cargo_bike";
  networkOperatorId: ID;
  // Spec line shown when the vehicle is offered as route equipment, e.g.
  // "26' Hino Box Truck" / 1,600 cu. ft. Capacity is what route generation
  // packs against.
  modelLabel?: string;
  capacityCuFt?: number;
}

export type TripStatus = "scheduled" | "in_progress" | "completed" | "delayed";

export interface Trip {
  id: ID;
  warehouseId: ID;
  vehicleId: ID;
  fieldOperatorIds: ID[];
  taskIds: ID[];
  status: TripStatus;
  scheduledAt: string; // ISO
}

export interface Brand {
  id: ID;
  name: string;
  logoInitials: string;
  color: string;
  description: string;
  orderKindIds: ID[];
  taskKindIds: ID[];
  // Markets this brand operates in. Regions live at the brand level and are
  // surfaced as an array on the Brand detail page.
  regionIds: ID[];
  // What this brand calls its inventory ("Inventory", "Assets", "Fleet", ...).
  // Driven by the brand's industry vertical; defaults to "Inventory".
  inventoryTerm?: string;
}

export interface OrderKind {
  id: ID;
  brandId: ID;
  name: string;
  description: string;
  taskKindIds: ID[];
}

// A kind opts into shift behaviour, the same for every brand. A `shift` kind
// must have time and duration required, renders as a shift everywhere, and is
// the only kind the Shifts page shows.
export type TaskKindType = "standard" | "shift";

export type FieldRequirement = "required" | "optional" | "hidden";

export interface TaskKind {
  id: ID;
  name: string;
  description: string;
  requiredSkillIds: ID[];
  // Absent = "standard". Shift kinds carry the three fields below.
  taskType?: TaskKindType;
  timeRequirement?: FieldRequirement;
  durationRequirement?: FieldRequirement;
  // The region a shift kind's work orders land on (supervision vs dispatch).
  regionId?: ID;
}

// --- Metadata (the doc's "tags") -------------------------------------------
// Brand-scoped definitions whose values tag a task. `displayRank` drives the
// Shifts grid: 1 groups the rows, 2 colours them, 1-3 show on the shift and as
// filters, null sits in a dropdown.

export type MetadataEntityType = "TASK" | "INVENTORY_KIND";

export interface MetadataDefinition {
  id: ID;
  brandId: ID;
  entityType: MetadataEntityType;
  name: string;
  displayRank: number | null;
  // Ordered; the Shifts grid takes its row order from this.
  values: string[];
}

// Task lifecycle status. Independent of assignment — whether a field operator
// is assigned is tracked by `fieldOperatorId`, not baked into the status.
export type TaskStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "cancelled";

// A quantity of an inventory item attached to a task (e.g. "24 × Box").
export interface TaskItemRef {
  inventoryItemId: ID;
  quantity: number;
}

// A task item resolved against its inventory kind — what the UIs actually
// render (name + product photo + quantity). See resolveTaskItems().
export interface ResolvedTaskItem {
  id: ID;
  name: string;
  quantity: number | null;
  image?: string;
}

export interface Task {
  id: ID;
  workOrderId: ID;
  taskKindId: ID;
  networkOperatorId: ID | null;
  fieldOperatorId: ID | null;
  status: TaskStatus;
  location: string;
  scheduledAt: string; // ISO
  completedAt: string | null;
  assignedInventoryIds: ID[];
  notes: string | null;

  // Optional presentation fields surfaced in the mobile field-operator detail
  // view. Not all tasks populate these; the UI falls back to "—" / derived
  // values when absent.
  arrivalWindow?: string; // e.g. "2:00 pm – 4:00 pm"
  estDistanceMi?: number; // distance from depot to the stop
  locationType?: string; // e.g. "Residential" / "Commercial"
  entrance?: string | null; // pickup/delivery entrance instructions
  driverNotes?: string | null;
  instructions?: string | null; // pickup/delivery notes for the operator
  contactName?: string; // on-site contact (falls back to the customer name)
  contactPhone?: string;
  // Items handled by this task, with quantities. When absent the UI falls back
  // to `assignedInventoryIds` (quantity unknown).
  items?: TaskItemRef[];

  // --- Shift fields (tasks on a `shift` kind) ---
  // Preferred by displayName. For a shift this is the Position ("PM Peak").
  name?: string | null;
  // Idempotency key for the work order upsert.
  externalId?: string;
  // definitionId -> value. The Shifts grid groups and colours by these.
  metadata?: Record<ID, string>;
  // A shift's window, kept apart from `scheduledAt` so a day is a plain date.
  date?: string; // yyyy-mm-dd
  time?: string; // display time, e.g. "5:00 PM"
  durationMinutes?: number;
  timeZone?: string;
}

// --- Task assignment --------------------------------------------------------
// The person on a shift. One active assignment per task; creating one fires the
// existing assignee email and SMS.

export interface TaskAssignment {
  id: ID;
  taskId: ID;
  fieldOperatorId: ID;
  createdAt: string; // ISO
  active: boolean;
}

// --- Actions ----------------------------------------------------------------
// Changing a shift is an action, so the change lands in the task's history.
// Date is never updatable on a shift kind: moving a day is cancel plus create.

// A vehicle (or other tracked unit) held by a task for its duration. On a
// shift this is the Model Y the supervisor is attending: the same unit can be
// used by many shifts over a week, one InventoryUse per shift.
export interface InventoryUse {
  id: ID;
  taskId: ID;
  inventoryItemId: ID;
  quantity: number;
}

export interface ActionKind {
  id: ID;
  taskKindId: ID;
  name: string;
  allowsTimeUpdate: boolean;
  allowsDurationUpdate: boolean;
  allowsDateUpdate: boolean;
  taskStatusUpdate?: TaskStatus;
  isFieldOperatorCreatable: boolean;
}

export interface Action {
  id: ID;
  taskId: ID;
  actionKindId: ID;
  createdAt: string; // ISO
  createdBy: string;
  // What the action changed, for the history line.
  changes?: Record<string, string>;
}

export interface Customer {
  id: ID;
  name: string;
  brandId: ID;
  email: string;
  address: string;
  phone?: string;
}

export type WorkOrderStatus = "draft" | "active" | "completed" | "cancelled";

export interface WorkOrder {
  id: ID;
  brandId: ID;
  orderKindId: ID;
  customerId: ID;
  status: WorkOrderStatus;
  taskIds: ID[];
  createdAt: string; // ISO
  parameters: Record<string, string | number>;
  // Optional presentation fields (used by the re-imagined Brand UI). Not all
  // brands populate these; pages fall back to customer name / createdAt.
  title?: string;
  regionId?: ID;
  startDate?: string; // ISO
  endDate?: string; // ISO
  // The Project this job belongs to (jobs = work orders). Optional — not every
  // work order is part of a project.
  projectId?: ID;
  // On-site / brand-side contact for the job (shown on the job detail). Not a
  // Network Operator contact — those names are the only ones sanitized.
  contactName?: string;
  contactPhone?: string;

  // --- Shift work orders ---
  // Shift kinds package one work order per region per day. Nobody in the
  // shifts workflow sees it; it exists so every task has a parent.
  externalId?: string; // shift:<regionId>:<date>
  date?: string; // yyyy-mm-dd
}

// A Project is an organizational unit for a Brand that groups one or more jobs
// (work orders), along with the warehouses, resources, and paperwork for a body
// of work. Mirrors brick-core's Project (see docs/sample-data-generation.md).
export type ProjectStatus = "requested" | "accepted" | "started" | "completed" | "cancelled";

export interface ProjectWarehouse {
  regionName: string;
  networkOperator: string; // NO business name
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  shippingAddress: string;
  hours: string;
  loadingDock: string; // "Yes" | "n/a"
}

export interface ProjectLink {
  label: string;
  url: string;
}

export interface Project {
  id: ID;
  brandId: ID;
  // Brand display name + accent, used for the badge when the brand isn't a
  // fully built-out prototype brand (falls back to getBrand(brandId)).
  brandName?: string;
  brandColor?: string;
  name: string;
  referenceCode: string; // e.g. "PROJ-8FBB3347"
  status: ProjectStatus;
  description: string;
  brickContact: string; // Brick's DRI on the account
  brandContactName: string; // the brand's DRI (shown on the list card)
  regionLabel: string; // fallback label shown when the project spans no regions
  regionNames: string[]; // regions the project spans; 1 → shown directly, >1 → "(Multiple)"
  startDate: string | null; // ISO
  endDate: string | null; // ISO
  statementOfWork: string | null;
  warehouses: ProjectWarehouse[];
  links: ProjectLink[];
  slackChannels: string[];
}

export type InventoryStatus =
  | "in_stock"
  | "reserved"
  | "deployed"
  | "low_stock"
  | "stored"
  // Additional lifecycle states for robotics / vehicle fleet customers whose
  // inventory is individually-tracked units rather than fungible SKU quantities.
  | "active"
  | "decommissioned"
  | "battery_failure"
  | "decommission_scheduled";

export interface InventoryItem {
  id: ID;
  brandId: ID;
  warehouseId: ID;
  // Some inventory (e.g. Chewy event supplies) has no SKU in prod; optional here.
  sku?: string;
  name: string;
  quantity: number;
  status: InventoryStatus;
  reorderThreshold: number;
  // Optional fields for individually-tracked assets (e.g. vehicles) rather than
  // fungible SKU quantities.
  unitId?: string; // unit/serial number shown to the brand (e.g. "606125")
  image?: string;
  operator?: string; // who currently holds/operates the unit
}

export type DeploymentStatus = "planned" | "in_transit" | "delivered" | "cancelled";

export interface Deployment {
  id: ID;
  brandId: ID;
  regionId: ID;
  warehouseId: ID;
  inventoryItemId: ID;
  quantity: number;
  status: DeploymentStatus;
  requestedAt: string; // ISO
  eta: string | null; // ISO
}

export type MessageThreadParticipant = "brand" | "network_operator" | "internal_ops";

export interface MessageThread {
  id: ID;
  subject: string;
  participants: MessageThreadParticipant[];
  brandId: ID | null;
  networkOperatorId: ID | null;
  relatedTaskId: ID | null;
  lastMessageAt: string; // ISO
  unread: boolean;
}

export interface Message {
  id: ID;
  threadId: ID;
  author: string;
  authorRole: MessageThreadParticipant;
  body: string;
  sentAt: string; // ISO
}

// Issues surfaced to NO Managers / Assistant Managers for review and action.
export type IssueType =
  | "task_review" // a completed task needs a manager's review/approval
  | "inventory_id" // inventory identification (may also be routed to the Brand)
  | "scope_escalation" // scope-of-work escalation / change order (scope creep)
  | "task_request"; // a field operator status update or question for the manager

export type IssueStatus = "needs_review" | "approved" | "completed" | "routed_to_brand" | "resolved";

export interface Issue {
  id: ID;
  type: IssueType;
  status: IssueStatus;
  networkOperatorId: ID;
  brandId: ID | null;
  relatedTaskId: ID | null;
  // Short order reference shown on the card / panel (e.g. "Order 0293745").
  orderRef: string | null;
  // Display heading, typically the underlying task label (e.g. "Delivery").
  title: string;
  // Parenthetical context line on the card.
  detail: string;
  // Field operator this issue belongs to / was raised by.
  ownerFieldOperatorId: ID | null;
  // Name shown on the card (who marked complete / raised the issue).
  raisedByName: string;
  createdAt: string; // ISO
  scheduledAt: string | null; // ISO
  markedCompleteAt: string | null; // ISO (task_review only)
  location: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  arrivalWindow: string | null;
  estDistanceMi: number | null;
  driverNotes: string | null;
  // Field photos attached by the operator (image URLs / data URIs).
  photos?: string[];
}

export type LiveActivityKind =
  | "task_completed"
  | "task_started"
  | "trip_delayed"
  | "inventory_low"
  | "deployment_delivered";

export interface LiveActivityEvent {
  id: ID;
  kind: LiveActivityKind;
  message: string;
  networkOperatorId: ID | null;
  brandId: ID | null;
  occurredAt: string; // ISO
}

// ---------------------------------------------------------------------------
// SOPs (Standard Operating Processes)
//
// Mirrors the Phase 1 SOP domain from docs/prd-sop-platform.html: an SOP is
// structured data (a versioned graph of steps) and the plain-text document is
// what the operator authors; the graph is a view compiled from it. Each step
// carries the four node fields from docs/Executable SOP.pdf — the work, the
// owner, the rules, and the condition for done — plus run analytics.
// ---------------------------------------------------------------------------

export type SopStatus = "draft" | "active" | "paused" | "archived";

// Who performs a step. Sol is the agent; the rest are humans.
export type SopActor =
  | "sol"
  | "brick_operator"
  | "sop_owner"
  | "verifier_agent"
  | "network_operator"
  | "brand_user"
  // A scheduled job, bot, or third-party agent (e.g. Coco's monitoring agent).
  | "automation"
  // A vendor, carrier, or other outside party the step waits on.
  | "external";

// Earned autonomy per step (PRD P0). Enforced at runtime; a human promotes.
//   1 human does everything · 2 system proposes, human approves ·
//   3 system acts and notifies · 4 system acts alone
export type SopAutonomyLevel = 1 | 2 | 3 | 4;

export type SopNodeKind = "trigger" | "step" | "decision" | "escalation" | "completion";

// Roll-up health of a node across its recent runs, drives the status dot.
export type SopNodeHealth = "healthy" | "attention" | "failing" | "idle";

export type SopRunStatus = "running" | "succeeded" | "failed" | "awaiting_approval" | "escalated";

export type SopLogLevel = "info" | "warn" | "error";

export interface SopLogEntry {
  at: string; // ISO
  level: SopLogLevel;
  message: string;
}

// A System-of-Record object a node run created or touched.
export interface SopRunObject {
  kind: string; // e.g. "Work Order", "Task", "Slack message"
  label: string;
  ref?: string; // id shown to the operator
}

// One execution of one node within an SOP run.
export interface SopNodeRun {
  id: ID; // instance id
  sopRunId: ID;
  nodeId: ID;
  status: SopRunStatus;
  startedAt: string; // ISO
  runtimeSeconds: number;
  subtasksTriggered: number;
  logs: SopLogEntry[];
  objectsCreated: SopRunObject[];
  errors: string[];
  issues: string[]; // things flagged for a human to look at
}

export interface SopEdge {
  id: ID;
  from: ID;
  to: ID;
  // Shown on branch edges leaving a decision ("Approved", "Changes requested").
  label?: string;
}

// What a step actually does when it executes: the action taken and the tool
// called to take it. Sol detects these while reading the SOP document, so
// they hang off the prose they were read out of — the gutter beside each
// section of the document is where they are shown and confirmed.
export type SopActionKind =
  // Pulls data out of a system without changing anything.
  | "read"
  // Creates or changes a record.
  | "write"
  // Sends a message to a person.
  | "notify"
  // A judgment the agent makes from what it just read.
  | "decide";

export type SopActionStatus =
  // Sol read it out of the prose; nobody has checked it.
  | "detected"
  // A person has signed it off as what the step really does.
  | "confirmed"
  // The prose asks for something Brick has no tool for yet.
  | "missing";

export interface SopAction {
  id: ID;
  // Namespaced by the system it belongs to: "portal.work_orders.list".
  tool: string;
  // What calling it accomplishes, in the operator's words.
  label: string;
  kind: SopActionKind;
  status: SopActionStatus;
  // Illustrative argument sketch: "brand_id, status=completed".
  args?: string;
  // Why this is still open, on a "missing" action.
  gap?: string;
}

export interface SopNode {
  id: ID;
  kind: SopNodeKind;
  title: string;
  summary: string; // one-line description shown on the graph card
  // The four fields per node.
  work: string;
  // What causes this step to start: the upstream event, a schedule, or a
  // condition. Distinct from `when`, which is the time expectation.
  trigger: string;
  ownerName: string; // accountable human; receives escalations
  actors: SopActor[];
  hardConstraints: string[]; // learning can never change these
  learnedRules: string[]; // can be updated via the patch loop
  successCriteria: string;
  verification: "automated" | "human" | "automated_plus_spot_check" | "none";
  where: string; // Slack, BrickOS, Review UI, ...
  when: string; // time expectation
  autonomy: SopAutonomyLevel;
  provenance: "stated" | "inferred";
  health: SopNodeHealth;
  // The actions and tool calls this step involves, as read out of its prose.
  actions: SopAction[];
  // Rolled-up analytics across runs.
  stats: { runs: number; objectsCreated: number; errors: number; issues: number };
}

// A block of the authored document. Blocks that compile to a node carry its id;
// prose that doesn't (the intro) leaves it null.
export interface SopDocBlock {
  id: ID;
  heading: string;
  body: string;
  nodeId: ID | null;
}

export interface SopAttachment {
  id: ID;
  name: string;
  kind: "pdf" | "xls" | "doc" | "csv" | "img" | "file";
}

export interface SopRun {
  id: ID;
  sopId: ID;
  version: number; // the SOP version this instance executed
  label: string; // e.g. "Week of Sep 9–15"
  status: SopRunStatus;
  startedAt: string; // ISO
  completedAt: string | null; // null while running or after a failure
  humanTouches: number;
  escalations: number;
}

// One published version of an SOP. Every save appends one; all are retained.
export interface SopVersion {
  version: number;
  publishedAt: string; // ISO
  publishedBy: string;
  note: string; // what changed, in a sentence
  // The document and compiled nodes as they stood at publish time. Absent on
  // the current version, whose content is the SOP itself (see sopAtVersion).
  snapshot?: { blocks: SopDocBlock[]; nodes: SopNode[] };
}

export interface Sop {
  id: ID;
  // null = Brick-wide (operator workflow); otherwise scoped to one brand.
  brandId: ID | null;
  name: string;
  purpose: string; // the one-paragraph "why" at the top of the document
  version: number;
  status: SopStatus;
  ownerName: string;
  trigger: string;
  completion: string; // "Done when …"
  primitiveTags: string[]; // of the 8 ops primitives
  workflowTags: string[]; // of the 9 operator workflows
  updatedAt: string; // ISO
  // Which team runs it day to day, and whether it touches only Brick or a
  // customer / NO (the SOP Hub's Team and SOP type properties).
  team?: string;
  sopType?: "internal" | "external";
  // Who to loop in when the SOP hits a judgment call it does not cover.
  escalationContact?: string;
  // Where the document was imported from, when it is not authored here.
  source?: { system: "notion"; url: string; lastEditedAt: string; importedAt: string };
  // When it runs, when that is a fixed schedule rather than an event: a short
  // reading for the page header and the full rule behind it.
  schedule?: { summary: string; rule: string };
  versions: SopVersion[];
  nodes: SopNode[];
  edges: SopEdge[];
  blocks: SopDocBlock[];
  attachments: SopAttachment[];
}

// ---------------------------------------------------------------------------
// State models
//
// A second lens on an SOP: instead of the steps an operator runs, the states
// the *thing* moves through and what pushes it between them. Authored
// alongside an SOP rather than compiled from it, because a state machine is a
// reading of the process, not a restatement of it. See docs/sop-state-model.md.
// ---------------------------------------------------------------------------

export type SopStateKind =
  // Where the subject sits between cycles (overnight, parked).
  | "resting"
  // Doing the work the SOP exists for.
  | "active"
  // Off the happy path: failed, flagged, grounded, being attended to.
  | "exception";

export interface SopState {
  id: ID;
  label: string;
  kind: SopStateKind;
  description: string;
  // A hard constraint that holds while the subject is in this state.
  rule?: string;
  // The SOP steps that put the subject here or act on it here.
  steps?: { sopId: ID; stepId: string }[];
}

export interface SopTransition {
  id: ID;
  from: ID;
  to: ID;
  // What moves the subject along this path.
  label: string;
  note?: string;
}

export interface SopStateModel {
  id: ID;
  // The SOP this lens belongs to.
  sopId: ID;
  name: string;
  // What is moving through the states ("A Coco bot").
  subject: string;
  description: string;
  // Where a fresh cycle begins.
  start: ID;
  states: SopState[];
  transitions: SopTransition[];
}

// ---------------------------------------------------------------------------
// Alerts (internal ops). A rule is a natural-language prompt, scoped to one
// brand, that an evaluator runs against the brand's operations data. Each hit
// raises an Alert on the entity it concerns.
// ---------------------------------------------------------------------------

export type AlertSeverity = "critical" | "high" | "medium" | "low";

// "active" rules are evaluated; "draft" rules are saved but never run;
// "inactive" rules were active once and have been switched off (reversible).
export type AlertRuleStatus = "active" | "draft" | "inactive";

export interface AlertRule {
  id: ID;
  brandId: ID;
  name: string;
  prompt: string;
  status: AlertRuleStatus;
  // A fixed severity, or "per_alert" when the evaluator picks one per hit.
  severity: AlertSeverity | "per_alert";
  // Human-readable schedule sentence, or null when the rule re-evaluates
  // whenever the data it covers changes.
  schedule: string | null;
  ownerName: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  lastTriggeredAt: string | null; // ISO
}

// "resolved" alerts cleared on their own (the condition stopped being true);
// "dismissed" alerts were closed by a person.
export type AlertStatus = "active" | "dismissed" | "resolved";

export interface AlertEntity {
  // Humanised entity kind ("Work order", "Task", "Parcel", "Shipment").
  kind: string;
  label: string;
  workOrderId?: ID;
  projectId?: ID;
}

export interface Alert {
  id: ID;
  ruleId: ID;
  brandId: ID;
  // Short display name identifying the exact event.
  name: string;
  description: string;
  // The evaluator's reasoning, shown behind "Why?".
  reasoning: string;
  severity: AlertSeverity;
  status: AlertStatus;
  entity: AlertEntity;
  createdAt: string; // ISO — when the alert was first raised
  dismissedAt?: string | null;
  dismissedByName?: string | null;
  resolvedAt?: string | null;
}
