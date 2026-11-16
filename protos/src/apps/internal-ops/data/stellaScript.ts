// The scripted Stella tasks.
//
// In production these are the agent loop — read the source, decide, call the
// tools, report. Here each one is a script, the same way StellaChat on the SOP
// authoring page is a script: the beats are fixed, the timings are fake, and
// every number in them is read off the real compiled data so the prototype
// never claims something the rest of the app contradicts.
//
// A session starts with no task. The first message routes to one of the tasks
// below by its `route` pattern, and from then on the session walks that task's
// turns. A turn waits for the user; when they send something, `match` decides
// whether it moves the task on, and if it doesn't, Stella says so and stays
// put. Each beat is one entry in the transcript, played after its own delay.

import { runsForSop, sops } from "../../../data";
import { formatDateTime, MOCK_NOW_ISO } from "../../../lib/format";
import { wofTask } from "./stellaWofScript";

// ---------------------------------------------------------------------------
// Transcript entries
// ---------------------------------------------------------------------------

export type StellaEntry =
  // `sopRef` is the part of a SOP the message asks to change, picked in the
  // SOP viewer with Modify.
  | { kind: "user"; text: string; brandId?: string | null; sopRef?: SopRef }
  // `heading` titles the message; `alertId` attaches the alert it came from,
  // drawn under the text as a compact card, and `noteId` the note in Messages
  // it came from, drawn as that message's metadata.
  | { kind: "agent"; text: string; heading?: string; alertId?: string; noteId?: string }
  // A unit of work with a label and an elapsed clock, like the authoring chat.
  | { kind: "status"; id: string; label: string; startedAt: number; endedAt: number | null }
  // One call against a tool, with what came back.
  | { kind: "tool"; tool: string; args: string; result: string; ok: boolean }
  // What the task produced, with the three ways into it.
  | { kind: "artifact"; sopId: string; title: string; summary: string; status: string }
  // The responses Stella offers on an incoming request. `chosen` is null until
  // one is picked; after that the card stays as the record of the decision.
  | { kind: "choice"; options: { label: string; description: string }[]; chosen: number | null }
  // The SOPs a source document should become, each with the steps it keeps.
  | { kind: "proposals"; sops: SopProposal[] }
  // Questions Stella needs answered before she can write a SOP, each with
  // options to pick from. `picks` is null until the answers are sent; after
  // that the card stays as the record of what was picked.
  | {
      kind: "questions";
      id: string;
      heading: string;
      intro?: string;
      sop?: SopProposal;
      questions: StellaQuestion[];
      // The first line of the message the answers are sent as.
      answersTitle: string;
      submitLabel: string;
      picks: Record<string, number> | null;
    }
  // A list of SOPs with where each one stands: written, saved, skipped.
  | { kind: "sopList"; heading: string; rows: { name: string; status: string; tone: "ok" | "warn"; detail?: string }[] }
  // One or more of a My Work group's messages, as cards, at the point in the
  // conversation they were brought in.
  | { kind: "work"; groupId: string; messageIds: string[] }
  // The one response every message of a group takes, offered once for all
  // of them: the button under Stella's summary of such a group.
  | { kind: "workAll"; groupId: string };

// A part of a SOP a message is about: a whole section, or one paragraph of
// it. `label` names it ("Raw prompt ¶2"); `excerpt` is its text.
export interface SopRef {
  draftId: string;
  draftName: string;
  section: "attributes" | "raw" | "compiled";
  paragraph: number | null;
  label: string;
  excerpt: string;
}

export interface SopProposal {
  name: string;
  summary: string;
  steps: string[];
  // Shown after the summary in bold, e.g. that the SOP is irreversible.
  note?: string;
}

export interface StellaQuestion {
  // How the answer is recorded: "owner.finalization-sweep".
  key: string;
  text: string;
  // The tag beside the question: "Needed to save", or "New" on a save.
  tag: string;
  // The words on the page the question is about, if any.
  quote?: string;
  // What stays broken while it is unanswered.
  consequence?: string;
  // A neutral line in place of a consequence.
  note?: string;
  options: { label: string; value: string }[];
  // The option Stella recommends, by index. The card starts on it.
  suggested?: number;
  // What the card starts on when nothing is suggested.
  preset?: number;
}

// The message a questions card sends: its title, then one `key: value` line
// per question.
export function formatAnswers(entry: Extract<StellaEntry, { kind: "questions" }>, picks: Record<string, number>) {
  return [entry.answersTitle, ...entry.questions.map((q) => `${q.key}: ${q.options[picks[q.key]]?.value ?? ""}`)].join("\n");
}

// One entry appended to the transcript after `after` ms. A status is special:
// it opens with a running clock and closes `holds` ms later.
export type StellaBeat =
  | { after: number; entry: Exclude<StellaEntry, { kind: "status" }> }
  | { after: number; status: string; holds: number };

// What the user has answered so far in a session, by question key.
export type StellaAnswers = Record<string, string>;

export interface StellaTurn {
  // Shown as a chip under the composer: one press sends it. None while a
  // card in the conversation is what the user answers.
  suggestion?: string;
  // When set, input that doesn't match leaves the task where it is.
  match?: RegExp;
  nudge?: string;
  // Fixed, or built from what the user has answered so far.
  beats: StellaBeat[] | ((answers: StellaAnswers) => StellaBeat[]);
  // The progress step this turn completes, by index.
  completes: number;
}

// A SOP a task is writing, as the rail beside the chat previews it: its
// attributes, the slice of the user's words it came from, and the
// instructions it compiled to (null until it has). A value still waiting on
// the user is `pending`.
export interface SopDraft {
  id: string;
  name: string;
  status: "drafting" | "draft" | "active" | "not executable";
  attributes: { label: string; value: string; pending?: boolean }[];
  // What the SOP was written from: the user's words, or the page's steps.
  raw: string[];
  compiled: string[] | null;
  // Why it can't run yet, when it can't.
  blocker?: string;
  // Paragraphs changed with Modify, by "raw:1" or "compiled:0", each with the
  // words that changed so the viewer can mark them. Set by withEdits.
  edits?: Record<string, string>;
}

// A paragraph rewritten with Modify, keyed `${draftId}:${section}:${index}`.
// It replaces the scripted text from then on.
export type SopEdits = Record<string, { text: string; changed: string }>;

// A draft with the chat's edits laid over it.
export function withEdits(draft: SopDraft, edits: SopEdits): SopDraft {
  const marks: Record<string, string> = {};
  const apply = (section: "raw" | "compiled", paragraphs: string[]) =>
    paragraphs.map((p, i) => {
      const edit = edits[`${draft.id}:${section}:${i}`];
      if (!edit) return p;
      marks[`${section}:${i}`] = edit.changed;
      return edit.text;
    });
  const raw = apply("raw", draft.raw);
  const compiled = draft.compiled && apply("compiled", draft.compiled);
  return Object.keys(marks).length ? { ...draft, raw, compiled, edits: marks } : draft;
}

export interface StellaTask {
  id: string;
  title: string;
  // The brand the task runs against; null means Brick-wide.
  brandId: string | null;
  // The dashboard chip, and what pressing it sends on the user's behalf.
  chip: string;
  chipPrompt: string;
  // Routes an untasked session's first message to this task.
  route: RegExp;
  progress: { label: string; detail: string }[];
  // Shown in the progress rail once every turn has run.
  doneNote: string;
  turns: StellaTurn[];
  // The SOPs the task writes, as they stand once `turnsDone` turns have run
  // with these answers.
  drafts?: (turnsDone: number, answers: StellaAnswers) => SopDraft[];
}

// ---------------------------------------------------------------------------
// Task 1 — compose an SOP from its Notion page
// ---------------------------------------------------------------------------

const SOP_ID = "sop-work-order-finalization-project-based";

// Read the shape of the SOP out of the compiled data rather than restating it,
// so edits to the file flow into what Stella says about it.
const sop = sops.find((s) => s.id === SOP_ID);
const steps = sop?.nodes.filter((n) => n.kind === "step" || n.kind === "decision") ?? [];
const decisions = steps.filter((n) => n.kind === "decision");
const actions = (sop?.nodes ?? []).flatMap((n) => n.actions);
const missing = actions.filter((a) => a.status === "missing");
const byKind = (kind: string) => actions.filter((a) => a.kind === kind).length;
const systems = [...new Set(actions.map((a) => a.tool.split(".")[0]))];

export const STELLA_SOP_URL = "https://app.notion.com/p/3dc71cfae62e811a9452c418d4132e3a";

const createSopTask: StellaTask = {
  id: "create-sop",
  title: "Create SOP: Finalization for Project-based work orders",
  brandId: null,
  chip: "Create SOP",
  chipPrompt: STELLA_SOP_URL,
  route: /notion\.(com|so)|3dc71cfae62e81|\bsop\b/i,
  progress: [
    { label: "Read the source document", detail: "Fetch the Notion page and its properties" },
    { label: "Draft the steps", detail: "Compile prose into steps, decisions and edges" },
    { label: "Detect actions and tools", detail: "Resolve each section against the tool catalog" },
    { label: "Publish the SOP", detail: "Write it to the SOP library and open the views" },
  ],
  doneNote: "Task complete. The SOP is in the library as a draft; the card in the conversation links to all three views.",
  turns: [
    // ---- 1. The link -----------------------------------------------------
    {
      suggestion: STELLA_SOP_URL,
      match: /notion\.(com|so)|3dc71cfae62e81/i,
      nudge: "I need the Notion link to the SOP page to start. Paste the URL from the SOP Hub and I'll open it.",
      completes: 0,
      beats: [
        { after: 300, status: "Opening the document", holds: 1600 },
        {
          after: 1900,
          entry: {
            kind: "tool",
            tool: "notion.fetch_page",
            args: "page_id=3dc71cfae62e811a9452c418d4132e3a",
            result: `"${sop?.name ?? "Work Order Finalization: Project-Based Customers"}" · Draft · v1 · Team AM · External`,
            ok: true,
          },
        },
        {
          after: 2300,
          entry: {
            kind: "tool",
            tool: "notion.get_page_properties",
            args: "page_id=3dc71cfae62e81…",
            result: "Owner: empty · Escalation contact: empty · Trigger: “Cadence sweep … Exact cadence is TBD.”",
            ok: true,
          },
        },
        {
          after: 2800,
          entry: {
            kind: "agent",
            text:
              "Read it. It's a per-brand sweep of the finalization page, written up from a single Lagora run, and the thing it keeps repeating is that finalization cannot be undone — once a work order is finalized the charges are locked.\n\nThree things the page leaves open before I draft:\n\n1. The cadence. It says “cadence sweep … exact cadence is TBD.”\n2. The owner, and who findings escalate to. Both empty.\n3. Margin bands. Event ops has one (negative to roughly 60%); every other work type is marked TBD.\n\nTell me what you know. Anything you leave, I carry through as TBD in the text rather than inventing it — a guessed cadence reads as fact to whoever runs this next.",
          },
        },
      ],
    },

    // ---- 2. The answers --------------------------------------------------
    {
      suggestion: "Weekly, Friday morning. Owner is the account manager for the brand. Leave the margin bands as TBD.",
      completes: 1,
      beats: [
        { after: 300, status: "Drafting the steps", holds: 2200 },
        {
          after: 2500,
          entry: {
            kind: "tool",
            tool: "stella.compile_steps",
            args: "source=notion:3dc71cfae62e81…",
            result: `${steps.length} steps · ${sop?.edges.length ?? 19} edges · ${decisions.length} decisions · 1 loop back to the finalization check`,
            ok: true,
          },
        },
        {
          after: 3000,
          entry: {
            kind: "agent",
            text:
              `Drafted — ${steps.length} steps, ${decisions.length} of them decisions. The spine reads: open the brand → expand every work order and read its tasks → chase anything open → check the rate setup → check margin → check every completed task carries a charge → finalize or leave it blocked → next work order.\n\nI've written your cadence and owner into the trigger and the step owners. The margin bands stay marked TBD in "Check margin on each completed work order", so the gap is visible to whoever runs it rather than buried.\n\nNext I resolve each section against the tool catalog.`,
          },
        },
      ],
    },

    // ---- 3. Tools --------------------------------------------------------
    {
      suggestion: "Go ahead and detect the tools.",
      completes: 2,
      beats: [
        { after: 300, status: "Detecting actions and tools", holds: 2600 },
        {
          after: 2900,
          entry: {
            kind: "tool",
            tool: "brick.tools.catalog",
            args: `systems=${systems.join(",")}`,
            result: `${systems.length} systems reachable`,
            ok: true,
          },
        },
        {
          after: 3400,
          entry: {
            kind: "tool",
            tool: "stella.detect_actions",
            args: `sop=${SOP_ID}`,
            result: `${actions.length} actions across ${steps.length} steps · ${byKind("read")} read, ${byKind("write")} write, ${byKind("notify")} notify, ${byKind("decide")} decide`,
            ok: true,
          },
        },
        {
          after: 3900,
          entry: {
            kind: "tool",
            tool: "stella.resolve_tools",
            args: `actions=${actions.length}`,
            result: `${actions.length - missing.length} resolved · ${missing.length} with no tool behind them`,
            ok: false,
          },
        },
        {
          after: 4400,
          entry: {
            kind: "agent",
            text:
              `Every section of the document now carries the calls it will make — they sit in the gutter beside the prose they were read out of, so you can check my reading against your words.\n\n${missing.length} of the ${actions.length} have no tool behind them:\n\n${missing
                .map((a) => `• \`${a.tool}\` — ${a.gap}`)
                .join("\n")}\n\nI've left all four in the document marked missing rather than dropping the steps. Each one is a real gap in what Brick can do, and the aggregate analysis view collects them so they can be worked rather than rediscovered every sweep.`,
          },
        },
      ],
    },

    // ---- 4. Publish ------------------------------------------------------
    {
      suggestion: "Publish it as a draft.",
      completes: 3,
      beats: [
        { after: 300, status: "Publishing", holds: 1500 },
        {
          after: 1800,
          entry: {
            kind: "tool",
            tool: "brick.sops.publish",
            args: `id=${SOP_ID}, status=draft`,
            result: `v1 published · ${steps.length} steps · scoped Brick-wide`,
            ok: true,
          },
        },
        {
          after: 2300,
          entry: {
            kind: "agent",
            text:
              "Published as a draft, so it shows in the SOP library but nothing runs off it until someone activates it. The sweeps that have already been done by hand since July are attached to it, which is why the analysis view has history to read on a SOP that was only just written down.\n\nThree ways in:",
          },
        },
        {
          after: 2600,
          entry: {
            kind: "artifact",
            sopId: SOP_ID,
            title: sop?.name ?? "Work Order Finalization: Project-Based Customers",
            summary: `${steps.length} steps · ${decisions.length} decisions · ${actions.length} tool calls · ${missing.length} needing a tool Brick does not have`,
            status: "Draft",
          },
        },
        {
          after: 3000,
          entry: {
            kind: "agent",
            text:
              "Worth knowing before anyone activates it: the SOP still has no permanent owner on the Notion page, and the margin bands for every work type except event ops are undefined. Until those land, the finalization check cannot be fully automated — it stays at L2, where I propose and the account manager approves.",
          },
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Task 2 — schedule next week's supervision shifts
//
// Runs the Autolane Weekly Supervision Shifts SOP. The beats follow its real
// spine (watch for the schedule → read it into a shift list → check duplicates
// → confirm setup → draft → approve → create → verify → tell the operator) and
// hit the same wall the last recorded run hit: the Austin assignment to the
// network operator went inactive on Sep 1, and the SOP says confirm setup is
// live before drafting.
// ---------------------------------------------------------------------------

const AL_ID = "sop-al-weekly-shifts";
const alSop = sops.find((s) => s.id === AL_ID);
const alSteps = alSop?.nodes.filter((n) => n.kind === "step" || n.kind === "decision") ?? [];
const alRuns = runsForSop(AL_ID);

const scheduleShiftsTask: StellaTask = {
  id: "schedule-shifts",
  title: "Schedule shifts: Autolane, week of Sep 15–21",
  brandId: "brand-autolane",
  chip: "Schedule Shifts",
  chipPrompt: "Schedule next week's supervision shifts for Autolane.",
  route: /shift|roster|schedul/i,
  progress: [
    { label: "Read the week's schedule", detail: "Pull the grid from the shared Slack channel" },
    { label: "Check duplicates and setup", detail: "Existing work orders, then the five Autolane records" },
    { label: "Draft the week", detail: "One work order per site-day, a task per supervisor slot" },
    { label: "Approve and create", detail: "The owner approves, then create and verify" },
  ],
  doneNote: "Task complete. 17 work orders are live for Cherrywood and Mueller; Austin's 9 shifts are still with Moises.",
  turns: [
    // ---- 1. Read the schedule -------------------------------------------
    {
      suggestion: "Schedule next week's supervision shifts for Autolane.",
      match: /shift|roster|schedul|autolane|week/i,
      nudge:
        "Tell me which week to schedule and I'll start from the grid in the Autolane channel — “schedule next week's supervision shifts” is enough.",
      completes: 0,
      beats: [
        { after: 300, status: "Reading the week's schedule", holds: 1800 },
        {
          after: 2100,
          entry: {
            kind: "tool",
            tool: "slack.files.latest",
            args: "channel=autolane-brick, match=schedule",
            result: "schedule-wk-sep15.png · posted Sun 6:12pm PT by Dana R.",
            ok: true,
          },
        },
        {
          after: 2600,
          entry: {
            kind: "tool",
            tool: "stella.parse_schedule",
            args: "file=schedule-wk-sep15.png",
            result: "3 sites × 7 days · 27 shifts · 31 supervisor slots · times Central",
            ok: true,
          },
        },
        {
          after: 3100,
          entry: {
            kind: "agent",
            text:
              "The grid arrived on time this week. Cherrywood, Mueller and South Congress; Lunch, Dinner and Dinner Peak; 27 shifts and 31 supervisor slots across the Tue–Mon week.\n\nOne conflict: the notes at the bottom say “no lunch at Mueller this week”, but the grid shows Lunch at Mueller on Wed 9/16 with one supervisor. The SOP makes the grid win — that is a hard constraint, not something I get to weigh — so I have taken the Lunch shift and flagged the contradiction for Moises rather than dropping it quietly.\n\nNext: existing work orders for that week, then the five Autolane records the draft depends on.",
          },
        },
      ],
    },

    // ---- 2. Duplicates and setup ----------------------------------------
    {
      suggestion: "Check duplicates and setup.",
      completes: 1,
      beats: [
        { after: 300, status: "Checking duplicates and setup", holds: 2400 },
        {
          after: 2700,
          entry: {
            kind: "tool",
            tool: "brickos.work_orders.search",
            args: "brand=autolane, kind=daily-supervision-shifts, dates=2026-09-15..21",
            result: "1 existing: “Cherrywood – Tue 9/15”, created manually Sep 11 by Moises",
            ok: true,
          },
        },
        {
          after: 3200,
          entry: {
            kind: "tool",
            tool: "brickos.records.resolve",
            args: "brand, work_order_type, task_type, assignment, product",
            result: "4 of 5 active · Austin ↔ network operator assignment inactive since 2026-09-01",
            ok: false,
          },
        },
        {
          after: 3700,
          entry: {
            kind: "agent",
            text:
              "Same wall the Sep 8 run hit, and it has not been cleared since.\n\n• The product reference moved again — `prod_4c1e9a` is gone, re-resolved by name to `prod_7b20d3` “Tesla Model Y (2026)”. Saved reference updated; that one is self-healing.\n• The Austin assignment to the network operator is **inactive**, ended Sep 1. Nothing active resolves by name either.\n\nThe SOP says confirm setup is live before anything is drafted, so I am not drafting Austin. There is also that one manually created Cherrywood work order for Tue 9/15 — not a full week, so I have left it alone rather than deciding for you.\n\nI can draft Cherrywood and Mueller now and escalate Austin to Moises, or hold the whole week until the assignment is sorted.",
          },
        },
      ],
    },

    // ---- 3. Draft --------------------------------------------------------
    {
      suggestion: "Draft the other two sites and escalate Austin.",
      completes: 2,
      beats: [
        { after: 300, status: "Drafting the week", holds: 2200 },
        {
          after: 2500,
          entry: {
            kind: "tool",
            tool: "stella.draft_work_orders",
            args: "sites=Cherrywood,Mueller · skip=Cherrywood Tue 9/15",
            result: "17 work orders · 21 supervisor tasks · Austin held back (9 shifts)",
            ok: true,
          },
        },
        {
          after: 3000,
          entry: {
            kind: "tool",
            tool: "slack.messages.post",
            args: "to=Moises Reyes, subject=Austin assignment inactive",
            result: "Escalation posted with both findings and the held-back shifts",
            ok: true,
          },
        },
        {
          after: 3500,
          entry: {
            kind: "agent",
            text:
              "Drafted 17 work orders and 21 supervisor tasks for Cherrywood and Mueller, named to the week's convention and skipping the Cherrywood Tue 9/15 one that already exists. Austin's 9 shifts are held back and the escalation is with Moises.\n\nNothing is created yet. Approval is the gate on this SOP — that step is L1, the owner approves and I do not get to skip it. Review the draft and tell me to create it.",
          },
        },
      ],
    },

    // ---- 4. Create -------------------------------------------------------
    {
      suggestion: "Approved — create them.",
      completes: 3,
      beats: [
        { after: 300, status: "Creating the approved work orders", holds: 2000 },
        {
          after: 2300,
          entry: {
            kind: "tool",
            tool: "brickos.work_orders.create",
            args: "draft=wk-sep15, count=17",
            result: "17 created · 21 supervisor tasks attached",
            ok: true,
          },
        },
        {
          after: 2800,
          entry: {
            kind: "tool",
            tool: "brickos.work_orders.verify",
            args: "draft=wk-sep15",
            result: "17 of 17 match the approved draft · 0 extra, 0 missing",
            ok: true,
          },
        },
        {
          after: 3300,
          entry: {
            kind: "tool",
            tool: "slack.messages.post",
            args: "channel=autolane-brick",
            result: "Week posted to the network operator with the Austin caveat",
            ok: true,
          },
        },
        {
          after: 3800,
          entry: {
            kind: "agent",
            text:
              "Week is live for two of three sites. I double-checked what was created against what you approved before posting, which is the step that catches a silent partial create.",
          },
        },
        {
          after: 4100,
          entry: {
            kind: "artifact",
            sopId: AL_ID,
            title: alSop?.name ?? "Autolane Weekly Supervision Shifts",
            summary: `${alSteps.length} steps · ${alRuns.length} runs recorded · this week: 17 work orders created, 9 shifts held back`,
            status: alSop?.status ?? "active",
          },
        },
        {
          after: 4500,
          entry: {
            kind: "agent",
            text:
              "Austin stays blocked until someone reactivates the assignment or names a different network operator. That is the second week running, so it is worth fixing at the source rather than escalating again next Sunday — “Confirm setup is live” is the step carrying the SOP's only failing health flag.",
          },
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Task 3 — write SOPs from a plain-language request
//
// One request, two SOPs. The margin review and the $0 check look at different
// records (work orders, tasks) and end in different decisions, so Stella
// splits them rather than compiling one SOP that does both. Each SOP's raw
// prompt is its slice of the user's description; Stella translates that into
// the compiled instructions the SOP's agent runs on every scheduled run.
// Neither writes anything — they propose and ask.
// ---------------------------------------------------------------------------

const MARGIN_RAW =
  "Review today’s completed, unfinalized work orders for unusual margins, using relevant Slack and Granola context before recommending a next step. Exclude Stack and test brands.";
const ZERO_RAW = "Flag any completed task whose charges net to $0 and get my approval before it goes out on an invoice.";
export const STELLA_FINANCE_PROMPT = `${MARGIN_RAW} Also flag any completed task whose charges net to $0 and get my approval before it goes out on an invoice.`;

const FINANCE_OWNER = "kenny@brickdynamics.com";
const FINANCE_SCHEDULE = "Weekdays at 5:00 PM PT";

const MARGIN_COMPILED = [
  `Intent: ${MARGIN_RAW}`,
  "Excluding Stack and test brands.",
  "For each work order completed today in its local timezone that has not been finalized, calculate margin as (brand charges − operator charges) ÷ brand charges. If brand charges are zero, mark the margin undefined and flag it for review. Check relevant Slack conversations and Granola notes for evidence that charges are missing or incorrect.",
  "If margin is negative, below 10%, above 60%, or the context suggests an error, report the calculation, supporting evidence, and a recommended next step: propose a specific charge for approval, ask me to resolve an uncertainty, or recommend to finalize it. Otherwise, take no action. Do not create charges or finalize anything automatically.",
  "If 3rd party services could not be searched, say “Unverified—not confirmed incorrect” and identify the missing evidence. Avoid repeating the work-order title, completion date, and finalization status in prose when they already appear in the heading.",
];

const ZERO_COMPILED = [
  `Intent: ${ZERO_RAW}`,
  "Excluding Stack and test brands.",
  "For each task completed today in its work order’s local timezone that has not been invoiced, total its debits and credits. If they net to $0.00 and the task has at least one charge, flag it. A task with no charges at all is not a $0 net; leave it out.",
  "For each flagged task, report the debits, the credits that cancel them, and any note on the task that says whether the credit is a deliberate waiver. Ask me to approve the $0.00 charge or remove the credit. Do not change charges or invoice anything automatically.",
  "Skip a task that was already approved at $0.00. Avoid repeating the task name, work order and completion date in prose when they already appear in the heading.",
];

const financeTask: StellaTask = {
  id: "finance-sops",
  title: "Create SOPs: Financial Correctness",
  brandId: null,
  chip: "Write SOPs",
  chipPrompt: STELLA_FINANCE_PROMPT,
  route: /unusual margins?|unfinali[sz]ed|nets? to \$0|financial correctness/i,
  progress: [
    { label: "Read the request", detail: "Split it into SOPs and find what it leaves open" },
    { label: "Compile the instructions", detail: "Translate each description into what its agent runs" },
    { label: "Save as drafts", detail: "Write both SOPs to the library" },
    { label: "Make them live", detail: "Start each on its weekday schedule" },
  ],
  doneNote: "Task complete. Financial Correctness and Zero-Dollar Task Approval are live and run weekdays at 5:00 PM PT, starting today.",
  turns: [
    // ---- 1. The request --------------------------------------------------
    {
      suggestion: STELLA_FINANCE_PROMPT,
      match: /unusual margins?|unfinali[sz]ed|nets? to \$0|financial correctness/i,
      nudge: "Tell me what the SOP should check and I'll draft it — for example, which work orders to review and what counts as a problem.",
      completes: 0,
      beats: [
        { after: 300, status: "Reading the request", holds: 1800 },
        {
          after: 2100,
          entry: {
            kind: "tool",
            tool: "stella.parse_intent",
            args: "prompt=“Review today’s completed, unfinalized…”",
            result: "2 intents · subjects: work_order, task · 1 exclusion (Stack, test brands)",
            ok: true,
          },
        },
        {
          after: 2600,
          entry: {
            kind: "tool",
            tool: "brick.tools.catalog",
            args: "systems=brickos,slack,granola",
            result: "3 systems reachable · slack.search_messages, granola.search_notes",
            ok: true,
          },
        },
        {
          after: 3100,
          entry: {
            kind: "agent",
            text:
              "That's two SOPs, not one. They look at different records and end in different decisions, so I've split them. Each gets its own subject, schedule and owner, and either can run without the other:\n\n1. Financial Correctness: margins on today's completed work orders that haven't been finalized. Subject: work order.\n2. Zero-Dollar Task Approval: completed tasks whose charges net to $0. Subject: task.\n\nBefore I compile them into instructions, three things the request leaves open:\n\n1. What counts as an unusual margin? I'd rather have your bands than invent them.\n2. Does “Exclude Stack and test brands” cover the $0 check too, or only the margins?\n3. How often they run and who owns them. “Today's” suggests once a day, near the end of it, but the request doesn't say.",
          },
        },
      ],
    },

    // ---- 2. The answers --------------------------------------------------
    {
      suggestion:
        "Unusual is negative, under 10%, or over 60%. Exclude Stack and test brands from both. Run them every weekday at 5pm Pacific; Kenny owns both.",
      completes: 1,
      beats: [
        { after: 300, status: "Compiling both SOPs", holds: 2400 },
        {
          after: 2700,
          entry: {
            kind: "tool",
            tool: "stella.compile_sop",
            args: "name=Financial Correctness, subject=work_order",
            result: `Intent + ${MARGIN_COMPILED.length - 1} instructions · sources: Slack, Granola · no automatic writes`,
            ok: true,
          },
        },
        {
          after: 3200,
          entry: {
            kind: "tool",
            tool: "stella.compile_sop",
            args: "name=Zero-Dollar Task Approval, subject=task",
            result: `Intent + ${ZERO_COMPILED.length - 1} instructions · approval before invoicing · no automatic writes`,
            ok: true,
          },
        },
        {
          after: 3700,
          entry: {
            kind: "agent",
            text:
              "Both are compiled. I've translated each description into the instructions its agent will follow every weekday at 5:00 PM PT; the panel on the right shows them beside your words, so you can check my reading against them.\n\nA few choices I made that you should check:\n\n• “Today” means today in each work order's own timezone, so a late finish on the West Coast isn't missed.\n• A work order with no brand charges has no margin to calculate. I mark it undefined and flag it rather than skip it.\n• Neither SOP writes anything. Financial Correctness proposes a charge, asks you, or recommends finalizing; the $0 check asks you to approve the $0 or remove the credit.\n• If Slack or Granola can't be searched, the finding says “Unverified—not confirmed incorrect” instead of guessing.\n\nSay the word and I'll save both as drafts.",
          },
        },
      ],
    },

    // ---- 3. Save ---------------------------------------------------------
    {
      suggestion: "Save both as drafts.",
      completes: 2,
      beats: [
        { after: 300, status: "Saving both SOPs", holds: 1500 },
        {
          after: 1800,
          entry: {
            kind: "tool",
            tool: "brick.sops.save",
            args: "name=Financial Correctness, status=draft",
            result: "v1 saved · subject work_order · weekdays 5:00 PM PT",
            ok: true,
          },
        },
        {
          after: 2200,
          entry: {
            kind: "tool",
            tool: "brick.sops.save",
            args: "name=Zero-Dollar Task Approval, status=draft",
            result: "v1 saved · subject task · weekdays 5:00 PM PT",
            ok: true,
          },
        },
        {
          after: 2700,
          entry: {
            kind: "agent",
            text: `Saved both as drafts owned by ${FINANCE_OWNER}. Nothing runs off a draft yet.\n\nOne overlap to expect: a work order whose only task nets to $0 has no brand charges, so it shows up in both. They ask different questions (is the margin right, and is the $0 intended), so I've kept them separate rather than folding one into the other.\n\nDo you want to make them live? Each would run every weekday at 5:00 PM PT against that day's work, starting today, and send its findings to you in Messages.`,
          },
        },
      ],
    },

    // ---- 4. Go live ------------------------------------------------------
    {
      suggestion: "Let them run live.",
      match: /live|activate|turn (them )?on|go ahead|yes/i,
      nudge: "They'll stay as drafts until you say so. Tell me to make them live when you're ready.",
      completes: 3,
      beats: [
        { after: 300, status: "Making both SOPs live", holds: 1500 },
        {
          after: 1800,
          entry: {
            kind: "tool",
            tool: "brick.sops.activate",
            args: "name=Financial Correctness, version=1",
            result: "active · next run today 5:00 PM PT",
            ok: true,
          },
        },
        {
          after: 2200,
          entry: {
            kind: "tool",
            tool: "brick.sops.activate",
            args: "name=Zero-Dollar Task Approval, version=1",
            result: "active · next run today 5:00 PM PT",
            ok: true,
          },
        },
        {
          after: 2700,
          entry: {
            kind: "agent",
            text: "Both are active. The first runs are today at 5:00 PM PT.\n\nNeither will change a charge or finalize anything on its own. Every finding comes to you in Messages as a recommendation, and nothing happens until you approve it.",
          },
        },
      ],
    },
  ],
  drafts: (turnsDone) => {
    if (turnsDone < 1) return [];
    const answered = turnsDone >= 2;
    const saved = turnsDone >= 3;
    const live = turnsDone >= 4;
    const attributes = (subject: string) => [
      { label: "Subject type", value: subject },
      { label: "Schedule", value: answered ? FINANCE_SCHEDULE : "TBD", pending: !answered },
      { label: "Owner", value: answered ? FINANCE_OWNER : "TBD", pending: !answered },
      { label: "Version", value: saved ? "1" : "Unsaved", pending: !saved },
      { label: "Next run", value: live ? "Today, 5:00 PM PT" : "Not active", pending: !live },
      { label: "Updated", value: formatDateTime(MOCK_NOW_ISO) },
    ];
    const status = live ? "active" : saved ? "draft" : "drafting";
    return [
      {
        id: "draft-financial-correctness",
        name: "Financial Correctness",
        status,
        attributes: attributes("work_order"),
        raw: [MARGIN_RAW],
        compiled: answered ? MARGIN_COMPILED : null,
      },
      {
        id: "draft-zero-dollar-tasks",
        name: "Zero-Dollar Task Approval",
        status,
        attributes: attributes("task"),
        raw: [ZERO_RAW],
        compiled: answered ? ZERO_COMPILED : null,
      },
    ];
  },
};

// ---------------------------------------------------------------------------

// The finance task and the SOP builder (“Create a SOP from <link>”) come
// before the Notion composer, whose pattern also catches the word "SOP" and
// the link: a bare link still goes to the composer.
export const STELLA_TASKS: StellaTask[] = [financeTask, wofTask, createSopTask, scheduleShiftsTask];

export function taskById(id: string | null): StellaTask | undefined {
  return id ? STELLA_TASKS.find((t) => t.id === id) : undefined;
}

// What the first message routes to. Order matters only where two patterns
// could both match; the SOP task is checked first because a Notion link is the
// least ambiguous thing anyone can send.
export function routeToTask(text: string): StellaTask | undefined {
  return STELLA_TASKS.find((t) => t.route.test(text));
}

// A test message for the "thinking" loader: say "thinking" in any chat and
// Stella works for a long stretch, so the animation can be watched through
// more than one cycle. It is not a task — it does not route, advance a turn or
// change the session.
export const STELLA_THINKING_TRIGGER = /^\s*thinking\s*$/i;
export const STELLA_THINKING_BEATS = {
  label: "Thinking it through",
  // How long the loader stays up (ms).
  holds: 15000,
  reply: "That was the long one. The loader stays up for fifteen seconds on this message so you can watch the whole animation through a few cycles. Nothing was run.",
};

// What Stella does with a change asked of one part of a SOP (Modify in the
// SOP viewer). The script understands one kind of change, a figure swapped for
// another ("25% instead of 30%", "from 30% to 25%"), and makes it in the
// paragraph picked, or in every paragraph of a section picked whole. Anything
// else she asks to have spelled out. Either way the task stays on its turn.
const FIGURE_SWAPS: { pattern: RegExp; order: "old-new" | "new-old" }[] = [
  { pattern: /\bfrom\s*(\d+(?:\.\d+)?)\s*%\s*to\s*(\d+(?:\.\d+)?)\s*%/i, order: "old-new" },
  { pattern: /(\d+(?:\.\d+)?)\s*%.*?\binstead of\s*(\d+(?:\.\d+)?)\s*%/i, order: "new-old" },
];

export function rewriteSopPart(text: string, draft: SopDraft | undefined, ref: SopRef): { edits: SopEdits; reply: string } {
  const section = ref.label.replace(/ ¶\d+$/, "").toLowerCase();
  const where = ref.paragraph === null ? `the ${section}` : `paragraph ${ref.paragraph + 1} of the ${section}`;
  const unclear = {
    edits: {},
    reply: `I couldn't tell what ${where} should say instead. Give me the new wording, or the figure to change (say, "25% instead of 30%"), and I'll make the change.`,
  };

  const swap = FIGURE_SWAPS.map(({ pattern, order }) => {
    const m = text.match(pattern);
    return m && (order === "old-new" ? { from: m[1], to: m[2] } : { from: m[2], to: m[1] });
  }).find(Boolean);
  const paragraphs = ref.section === "raw" ? draft?.raw : ref.section === "compiled" ? draft?.compiled : null;
  if (!swap || !draft || !paragraphs) return unclear;

  const old = new RegExp(`(?<![\\d.])${swap.from.replace(".", "\\.")}\\s*%`, "g");
  const changed = `${swap.to}%`;
  const edits: SopEdits = {};
  paragraphs.forEach((p, i) => {
    if (ref.paragraph !== null && ref.paragraph !== i) return;
    if (!p.match(old)) return;
    edits[`${draft.id}:${ref.section}:${i}`] = { text: p.replace(old, changed), changed };
  });

  if (Object.keys(edits).length === 0) {
    return {
      edits,
      reply: `${where.charAt(0).toUpperCase()}${where.slice(1)} doesn't mention ${swap.from}%. Pick the paragraph that does, or give me the new wording.`,
    };
  }
  return {
    edits,
    reply: `Done. In ${where} of ${draft.name}, ${swap.from}% is now ${swap.to}%; it's marked in the viewer. Nothing else in the SOP changed.`,
  };
}

export const STELLA_NEW_TITLE = "New task";

// What an empty chat offers. The first four are the scripted tasks; the rest are
// the questions people ask most, which Stella answers honestly with what she
// can actually run (STELLA_NO_ROUTE) rather than pretending to.
export const STELLA_STARTERS: { label: string; prompt: string }[] = [
  { label: "Write SOPs from a plain-language description.", prompt: financeTask.chipPrompt },
  { label: "Create SOPs from the Work Order Finalization page.", prompt: wofTask.chipPrompt },
  { label: "Compose an SOP from its Notion page.", prompt: createSopTask.chipPrompt },
  { label: scheduleShiftsTask.chipPrompt, prompt: scheduleShiftsTask.chipPrompt },
  ...[
    "I want to make an alert.",
    "Which tasks are overdue right now, and who are they assigned to?",
    "Summarize the status of work orders created this week.",
    "Which warehouses are running low on inventory?",
    "Explain how a task gets routed to a network operator.",
  ].map((q) => ({ label: q, prompt: q })),
];

export const STELLA_NO_ROUTE =
  "I can't run that one yet. The four I can run end to end are writing SOPs from a description of what you want checked, creating SOPs from the Work Order Finalization page, composing an SOP from its Notion page, and scheduling a week of supervision shifts. Start a new chat and pick one from the suggestions.";

// ---------------------------------------------------------------------------
// Incoming — requests Stella raises herself
// ---------------------------------------------------------------------------
//
// The other direction: an alert fired or an SOP stopped for a decision,
// Stella read it, and she needs a person to decide before she acts. Each
// request is anchored to a real alert in data/alerts.ts or a note in
// data/inboxNotes.ts, and what she says about it is what that record says.
// Picking a response settles the request and the message it came from;
// nothing is written anywhere, the same as the rest of the prototype.

export interface StellaRequest {
  id: string;
  // The sidebar row and the chat header.
  title: string;
  // The record it came from: an alert, or a note in Messages.
  alertId?: string;
  noteId?: string;
  // The opening line, above the alert card.
  ask: string;
  sections: { heading: string; body: string }[];
  options: {
    label: string;
    description: string;
    // The unit of work shown while Stella acts on it, and what she reports.
    status: string;
    reply: string;
    // For a note that asks for a yes or no: what picking this records on it.
    decision?: "approved" | "declined";
  }[];
  // What she says to typed input while the request is still open.
  nudge: string;
}

export const STELLA_INCOMING: StellaRequest[] = [
  {
    id: "req-npn-closeout",
    title: "Approve North Riverside finance closeout follow-up for Jasmine",
    noteId: "note-sop-npn360-closeout",
    ask: "I need your approval to assign Jasmine a follow-up on North Riverside's financial closeout.",
    sections: [
      {
        heading: "Worked through 29 steps",
        body: "As of October 28, 14 of 18 completed npn360 project work orders are finalized. The other four are in the North Riverside project, with $713 in brand charges and $373.50 in operator credits not yet on statements. I found no documented closeout blocker or assigned follow-up.",
      },
      {
        heading: "Choose an action",
        body: "Before finance finalizes them, the storage order’s quantities need validation, and a separate freight order remains pending. I’ve asked for approval to assign Jasmine a dated project follow-up documenting those issues. No records have been changed.",
      },
    ],
    options: [
      {
        label: "Decline",
        description: "Don't assign the follow-up; leave North Riverside as it is",
        status: "Recording the decision",
        reply: "Declined. I haven't assigned anything, and North Riverside's four work orders stay as they are. If they are still open at the next run, this message updates rather than a new one being raised; snooze it until fixed if you don't want to hear about it until then.",
        decision: "declined",
      },
      {
        label: "Approve",
        description: "Assign Jasmine a dated follow-up on the storage and freight orders",
        status: "Assigning the follow-up",
        reply: "Approved. Jasmine has a dated follow-up on North Riverside covering the storage order's quantities and the pending freight order. No work orders or charges were changed.",
        decision: "approved",
      },
    ],
    nudge: "I can act on one of the two responses above. Pick one, or open the message to handle it yourself.",
  },
  {
    id: "req-cw-tent-kit",
    title: "I need you to review the DEN-A tent kit timing",
    alertId: "alert-cw-1",
    ask: "I need your help with a Chewy event that's about to be short its tent kit.",
    sections: [
      {
        heading: "Shipment Timing Conflict",
        body: "The tent kit for DEN-A Hound Hill Dog Park is on UPS parcel 1Z84A0, in transit with an ETA of Nov 22. The event drop-off is Nov 21 at 10:00 AM in Highlands Ranch, so as it stands the kit lands the day after the event needs it. There's no network operator assigned yet, so nobody local is holding a spare.",
      },
      {
        heading: "Choose a Response",
        body: "Either the kit gets there sooner, or the drop-off goes out without it and the on-site contact, Christina LaFon, hears about it before the team arrives rather than at the curb.",
      },
    ],
    options: [
      {
        label: "Request reship",
        description: "Ask Chewy to reship the tent kit to arrive by Nov 20",
        status: "Drafting the reship request",
        reply: "Sent to the Chewy account contact: reship the tent kit to Highlands Ranch for arrival by Nov 20, referencing parcel 1Z84A0. I've noted it on the DEN-A receiving task. When the new tracking number comes in I'll check its ETA against the Nov 21 drop-off and come back to you if it still misses.",
      },
      {
        label: "Drop without kit",
        description: "Run the drop-off without the tent kit and tell Christina LaFon",
        status: "Updating the drop-off task",
        reply: "Added a note to the DEN-A drop-off task that the tent kit won't be on the truck, and queued a text to Christina LaFon (720-561-1984) for Nov 20, so she hears it before the team arrives. Parcel 1Z84A0 stays on the receiving task and lands Nov 22 as scheduled.",
      },
    ],
    nudge: "I can act on one of the two responses above. Pick one, or open the alert to handle it yourself.",
  },
  {
    id: "req-pm-storage",
    title: "I need you to confirm a storage WO for PHX Energy",
    alertId: "alert-pm-1",
    ask: "I need you to confirm whether PHX Energy's inventory should start billing for storage.",
    sections: [
      {
        heading: "Storage Not Set Up",
        body: "Every task on the project's receiving work order completed on Oct 21. It has been 7 days, and PHX Energy | Phoenix, AZ still has no storage work order, so whatever was received is sitting in the warehouse without being charged for.",
      },
      {
        heading: "Choose a Response",
        body: "I can draft the storage work order from the Oct 21 receiving for you to check before it's created. If this inventory is going straight back out, say so and I'll stop flagging it.",
      },
    ],
    options: [
      {
        label: "Draft storage WO",
        description: "Draft a monthly storage work order from the Oct 21 receiving",
        status: "Drafting the storage work order",
        reply: "Drafted a monthly storage work order on PHX Energy | Phoenix, AZ, starting Oct 21 to match receiving. It's saved as a draft, not created — open the project to check the quantities before it goes to the brand.",
      },
      {
        label: "No storage needed",
        description: "Mark the project as not needing storage and close the alert",
        status: "Closing the alert",
        reply: "Marked PHX Energy | Phoenix, AZ as not needing storage and dismissed the alert. If a new receiving lands on the project, the rule will look at it again.",
      },
    ],
    nudge: "I can act on one of the two responses above. Pick one, or open the alert to handle it yourself.",
  },
  {
    id: "req-pm-zero-dollar",
    title: "I need approval on a $0 Terra Verde outbound task",
    alertId: "alert-pm-3",
    ask: "I need approval before a completed Promobile task goes out on an invoice at $0.",
    sections: [
      {
        heading: "Charges Net to $0",
        body: "Pallets Outbound on Outbound Pallets — Terra Verde is complete with $180.00 in debits and $180.00 in credits. A credit that cancels the whole charge is sometimes a deliberate waiver and sometimes a duplicate entry, and nothing on the task says which.",
      },
      {
        heading: "Choose a Response",
        body: "Approve it as it stands and the task bills at $0.00. Remove the credit and it bills $180.00.",
      },
    ],
    options: [
      {
        label: "Approve $0",
        description: "Approve the $0.00 net charge as an intentional credit",
        status: "Recording the approval",
        reply: "Approved. The task bills at $0.00 and the approval is on the task with your name, so the next $0 sweep skips it.",
      },
      {
        label: "Remove credit",
        description: "Remove the $180.00 credit so the task bills $180.00",
        status: "Removing the credit",
        reply: "Removed the $180.00 credit. Pallets Outbound on Terra Verde now bills $180.00 net, and I've left a note on the task saying why the credit came off.",
      },
    ],
    nudge: "I can act on one of the two responses above. Pick one, or open the alert to handle it yourself.",
  },
];

export function requestById(id: string | null): StellaRequest | undefined {
  return id ? STELLA_INCOMING.find((r) => r.id === id) : undefined;
}

// A request's conversation as it opens: the ask with its alert, each section,
// then the responses to pick from.
export function requestEntries(req: StellaRequest): StellaEntry[] {
  return [
    { kind: "agent", text: req.ask, alertId: req.alertId, noteId: req.noteId },
    ...req.sections.map<StellaEntry>((s) => ({ kind: "agent", heading: s.heading, text: s.body })),
    { kind: "choice", options: req.options.map(({ label, description }) => ({ label, description })), chosen: null },
  ];
}

// Sessions seeded into the history list so the page doesn't open empty. These
// are past work, shown as titles only. Pinned ones sit above the rest.
export interface SeedSession {
  id: string;
  title: string;
  status: "done" | "waiting" | "idle";
  when: string;
  brandId: string | null;
  pinned?: boolean;
  // Stella has written in it since you last opened it.
  unread?: boolean;
}

export const STELLA_HISTORY: SeedSession[] = [
  { id: "ses-hub-drift", title: "Which SOPs drifted from the Notion Hub?", status: "idle", when: "Last week", brandId: null, pinned: true },
  { id: "ses-coco-dispatch", title: "Coco Dispatch: reconcile v3 against the Hub", status: "done", when: "Yesterday", brandId: "brand-coco", unread: true },
  { id: "ses-margin-sweep", title: "Why did Promobile Sep 11 stop at the AM ping?", status: "waiting", when: "Yesterday", brandId: "brand-promobile" },
  { id: "ses-autolane", title: "Autolane pre-shift dispatch: draft the escalation ladder", status: "done", when: "2 days ago", brandId: "brand-autolane" },
  { id: "ses-zero-charge", title: "Find every $0 task across project-based brands", status: "done", when: "3 days ago", brandId: null, unread: true },
  { id: "ses-alert-rule", title: "Write an alert rule for overdue work orders", status: "done", when: "Last week", brandId: null },
  { id: "ses-no-sales", title: "NO Sales qualification gates: what is still TBD?", status: "idle", when: "Last week", brandId: null },
];
