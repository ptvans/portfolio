// Task 4 — turn the Work Order Finalization page into SOPs with the SOP builder
//
// Scripted from a real brick-ai session (exported Oct 28, 2026) on the same
// Notion page the composer task reads. Stella hands the link to the SOP
// builder, which reads the page against Brick data and decides it is three
// SOPs, not one: a sweep that checks project work orders, a chase for overdue
// network operator tasks, and the irreversible finalize step, which a person
// confirms. It then asks what the page and the data leave open, one SOP at a
// time, on question cards. The answers go into the SOPs as written, and the
// rail beside the chat shows each one filling in. At the end two SOPs are
// saved and scheduled; the chase is written but not executable, so it is
// skipped, the same as in the recorded session.
//
// The page's step text is read off the compiled SOP in data/sops.ts, so the
// raw prompt on each card is what the page actually says.

import { sops } from "../../../data";
import { formatDateTime, MOCK_NOW_ISO } from "../../../lib/format";
import type { SopDraft, SopProposal, StellaBeat, StellaEntry, StellaQuestion, StellaTask } from "./stellaScript";

export const STELLA_WOF_URL =
  "https://app.notion.com/p/Work-Order-Finalization-Project-Based-Customers-3dc71cfae62e811a9452c418d4132e3a?source=copy_link";
export const STELLA_WOF_PROMPT = `Create an Automation from ${STELLA_WOF_URL}`;

const page = sops.find((s) => s.id === "sop-work-order-finalization-project-based");
// One step of the page, as "Title: what it says".
const pageStep = (id: string) => {
  const node = page?.nodes.find((n) => n.id.endsWith(id));
  return node ? `${node.title}: ${node.work}` : "";
};

// ---------------------------------------------------------------------------
// The three SOPs
// ---------------------------------------------------------------------------

const SWEEP = "Check Project Work Orders for Finalization";
const CHASE = "Chase Overdue NO Tasks";
const FINALIZE = "Finalize Approved Work Order";

const SWEEP_STEPS = [
  "Step 2: Expand every work order and check its tasks",
  "Step 5: Check margin on each completed work order",
  "Step 6: Check every completed task carries a charge",
  "Step 7: Search Slack, email, and Granola for the missing context",
  "Step 8: Take unresolved flags to the account manager",
];

const sweep: SopProposal = {
  name: SWEEP,
  summary:
    "Runs on a schedule over unfinalized work orders whose project is set and whose Brand is not a test Brand; confirm whether readyToFinalize limits this selection; Stella acts.",
  steps: SWEEP_STEPS,
};
const chase: SopProposal = {
  name: CHASE,
  summary:
    "Runs on a schedule and picks up unfinalized work orders with at least one task past its date that is neither completed nor cancelled; exclude tasks already covered by a recorded active chase; Stella acts.",
  steps: ["Step 3: Chase the operator on any open task"],
};
const finalize: SopProposal = {
  name: FINALIZE,
  summary:
    "Runs on a schedule and routes to a person unfinalized work orders with a recorded finalization proposal awaiting a Brick operator's approval and current-gate recheck; a Brick operator acts.",
  note: "Irreversible, so a person confirms each one.",
  steps: ["Step 9: Finalize each work order that is fully complete"],
};

// ---------------------------------------------------------------------------
// The questions, one card at a time
// ---------------------------------------------------------------------------

const NEEDED = "Needed to save";
const AM = "Account owner (AM)";

const q = (question: Omit<StellaQuestion, "tag">): StellaQuestion => ({ tag: NEEDED, ...question });

function card(
  id: string,
  heading: string,
  answersTitle: string,
  questions: StellaQuestion[],
  extra: { sop?: SopProposal; intro?: string; submitLabel?: string } = {},
): Extract<StellaEntry, { kind: "questions" }> {
  return { kind: "questions", id, heading, answersTitle, questions, submitLabel: extra.submitLabel ?? "Send answers", sop: extra.sop, intro: extra.intro, picks: null };
}

const SWEEP_HEADING = `Questions about ${SWEEP} (Automation 1 of 3)`;
const SWEEP_ANSWERS = `Answers for ${SWEEP} (Automation 1 of 3):`;
const CHASE_HEADING = `Questions about ${CHASE} (Automation 2 of 3)`;
const CHASE_ANSWERS = `Answers for ${CHASE} (Automation 2 of 3):`;

const sweepFirst = card("q-sweep-1", SWEEP_HEADING, SWEEP_ANSWERS, [
  q({
    key: "owner.finalization-sweep",
    text: "Which named Brick teammate is accountable for the finalization sweep?",
    quote: "[TBD - no permanent owner assigned yet]",
    consequence: "The sweep cannot have a human owner.",
    options: [
      { label: "Brand account owner", value: "The named account owner (AM) for each Brand" },
      { label: "Brick operator", value: "A named Brick operator" },
    ],
  }),
  q({
    key: "cadence.finalization-sweep",
    text: "How often should the finalization sweep run?",
    quote: "[TBD - exact cadence]",
    consequence: "Stella cannot schedule the sweep.",
    options: [
      { label: "Daily", value: "Daily" },
      { label: "Weekdays", value: "Weekdays" },
    ],
  }),
  q({
    key: "ready-gate.finalization-sweep",
    text: "Should Stella independently require every task to be completed, rather than treating readyToFinalize as proof, including when the work order is cancelled?",
    quote: "Every task is complete. Nothing in progress, nothing overdue.",
    consequence: "Ready work orders include open tasks and cancelled work orders.",
    options: [
      {
        label: "Require completed tasks; send cancelled work orders for attention.",
        value: "Require completed tasks; send cancelled work orders for attention.",
      },
      { label: "Exclude cancelled", value: "Require completed tasks; exclude cancelled work orders." },
    ],
    suggested: 0,
  }),
  q({
    key: "margin-band.finalization-sweep",
    text: "Does an event-operations margin from 0% through 60%, inclusive, pass automatically?",
    quote: "For event ops work, flag it if margin is negative, or above roughly 60%.",
    consequence: "Roughly 60% cannot be applied as a deterministic boundary.",
    options: [
      { label: "0%–60% inclusive passes.", value: "0%–60% inclusive passes." },
      { label: "Below 60% only", value: "0% up to, but not including, 60% passes." },
    ],
    suggested: 0,
  }),
  q({
    key: "other-margin-bands.finalization-sweep",
    text: "What margin ranges pass automatically for storage, kitting, shipping and receiving, will call, and ad hoc work order kinds?",
    quote: "[TBD - bands for other work types on project-based brands]",
    consequence: "Those work orders cannot clear the financial gate.",
    options: [
      { label: "Same event band", value: "0%–60% inclusive passes for these kinds" },
      { label: "None pass automatically", value: "No automatic pass; send these kinds for attention" },
    ],
  }),
], { sop: sweep });

const sweepSecond = card("q-sweep-2", SWEEP_HEADING, SWEEP_ANSWERS, [
  q({
    key: "pricing-record.finalization-sweep",
    text: "Should the charge check use each task kind's charge configs instead of the page's default/custom/brand-rate-sheet classification?",
    quote: "Open the brand's page in portal and check whether they are on Brick's default work order kinds, custom kinds, or a rate sheet.",
    consequence: "That classification is not a Brick field and brand rate sheets have no read tool.",
    options: [
      { label: "Read task-kind charge configs and actual charges.", value: "Read task-kind charge configs and actual charges." },
      { label: "Brand variable", value: "Ask for each Brand's rate setup as a brand variable." },
    ],
    suggested: 0,
  }),
  q({
    key: "zero-charge.finalization-sweep",
    text: "How should Stella decide whether a completed $0 task legitimately needs no charge?",
    quote: "Certain tasks, like Acknowledgement, reasonably carry no charges",
    consequence: "Otherwise legitimate no-charge tasks are treated as missing revenue.",
    options: [
      {
        label: "Read its task kind's charge configs; escalate ambiguous cases.",
        value: "Read its task kind's charge configs; escalate ambiguous cases.",
      },
      { label: "Brand variable", value: "Keep a list of no-charge task kinds for each Brand." },
      { label: "Escalate every case", value: "Escalate every completed $0 task." },
    ],
    suggested: 0,
  }),
  q({
    key: "scope.finalization-sweep",
    text: "Should project-based selection mean work orders with projectId set?",
    quote: "Project-based customers.",
    consequence: "Brick has no separate project-based-customer field.",
    options: [
      { label: "Select work orders whose projectId is not null.", value: "Select work orders whose projectId is not null." },
      { label: "Different record condition", value: "Select project-based work orders by a different record condition." },
    ],
    suggested: 0,
  }),
  q({
    key: "zero-revenue.finalization-sweep",
    text: "Should a work order with $0 Brand-debit revenue require attention rather than pass the margin gate?",
    quote: "Read the margin on every completed work order",
    consequence: "Its margin percentage is undefined.",
    options: [
      { label: "$0 revenue never passes the margin gate automatically.", value: "$0 revenue never passes the margin gate automatically." },
      { label: "Separate zero band", value: "Give $0-revenue work orders a band of their own." },
    ],
    suggested: 0,
  }),
], { sop: sweep });

const chaseFirst = card("q-chase-1", CHASE_HEADING, CHASE_ANSWERS, [
  q({
    key: "cadence.overdue-task-chase",
    text: "How often should the overdue-task chase run?",
    consequence: "An event-selected scheduled sweep needs a run frequency.",
    options: [
      { label: "Hourly", value: "Hourly" },
      { label: "Daily", value: "Daily" },
    ],
    preset: 1,
  }),
  q({
    key: "no-reply-timeout.overdue-task-chase",
    text: "How long after a recorded NO request should Stella wait before escalating no reply to the account owner (AM)?",
    quote: "[TBD - escalation path and how long to wait]",
    consequence: "Stella cannot determine when an unanswered chase needs attention.",
    options: [
      { label: "1 day", value: "1 day" },
      { label: "3 days", value: "3 days" },
      { label: "5 days", value: "5 days" },
    ],
    preset: 1,
  }),
  q({
    key: "channel-visibility.overdue-task-chase",
    text: "Should Stella send an NO chase in a Brand-visible channel or an internal/operator-only channel?",
    quote: "Is it odd that we nag the NO in a channel that's visible to the brand?",
    consequence: "The unresolved comment changes where Stella sends the request.",
    options: [
      {
        label: "Use an internal/operator-only channel when one is available.",
        value: "Use an internal/operator-only channel when one is available.",
      },
      { label: "Brand-visible channel", value: "Use the Brand-visible channel." },
    ],
    suggested: 0,
  }),
], {
  sop: {
    ...chase,
    summary:
      "Runs on a schedule and picks up unfinalized work orders with at least one task whose date has passed and which is neither completed nor cancelled; Stella acts.",
    steps: ["Step 3: Chase an overdue NO task"],
  },
});

const chaseSecond = card("q-chase-2", CHASE_HEADING, CHASE_ANSWERS, [
  q({
    key: "owner.overdue-task-chase",
    text: `Which named Brick teammate is accountable for ${CHASE}?`,
    quote: "[TBD - no permanent owner assigned yet]",
    consequence: "The chase has no accountable human owner.",
    options: [
      { label: AM, value: "The Brand's named account owner (AM)." },
      { label: "Brick operator", value: "A named Brick operator." },
    ],
    suggested: 0,
  }),
  q({
    key: "no-reply-escalation.overdue-task-chase",
    text: "After the no-reply limit you answered, to whom should Stella send the task link and recorded chase?",
    quote: "[TBD - escalation path and how long to wait]",
    consequence: "The no-reply path cannot finish.",
    options: [
      { label: AM, value: "Send it to the Brand's account owner (AM)." },
      { label: "Brick operator", value: "Send it to a named Brick operator." },
    ],
    suggested: 0,
  }),
  q({
    key: "channel-fallback.overdue-task-chase",
    text: "If no internal or operator-only channel is available, how should Stella route the NO chase?",
    quote: "Post in a channel, not a DM.",
    consequence: "The answered visibility rule leaves some tasks without a safe route.",
    options: [
      { label: "Ask the account owner (AM) to route it.", value: "Ask the account owner (AM) to route it." },
      { label: "Message NO users", value: "Message the NO's users directly." },
    ],
    suggested: 0,
  }),
], {
  intro: `A few more questions about ${CHASE} after your answers:`,
  sop: {
    ...chase,
    summary:
      "Runs on a schedule and picks up unfinalized work orders containing a dated task whose date has passed and which is neither completed nor cancelled; Stella acts.",
    steps: ["Step 3: Chase an overdue NO task"],
  },
});

const finalizeQuestions = card(
  "q-finalize",
  `Questions about ${FINALIZE} (Automation 3 of 3)`,
  `Answers for ${FINALIZE} (Automation 3 of 3):`,
  [
    q({
      key: "authority.finalize-approved-work-order",
      text: "Which Brick teammate may approve and click Finalize after re-verifying the work order?",
      quote: "Finalize each one that clears the checklist below.",
      consequence: "The irreversible action has no identified human authority.",
      options: [
        { label: AM, value: "The Brand's named account owner (AM)." },
        { label: "Brick operator", value: "A named Brick operator." },
      ],
      suggested: 0,
    }),
    q({
      key: "recovery.finalize-approved-work-order",
      text: "If Finalize locks an incorrect charge, should the Brick teammate send the work-order link and error to the account owner (AM) for a credit memo?",
      quote: "[TBD - confirm the correction path]",
      consequence: "The irreversible-error path is incomplete.",
      options: [
        { label: "Notify account owner", value: "Notify the account owner (AM) for a credit memo." },
        { label: "Send to finance", value: "Send it to finance for a credit memo." },
      ],
      suggested: 0,
    }),
    q({
      key: "cadence.finalize-approved-work-order",
      text: `How often should “${FINALIZE}” run?`,
      consequence: "Sets how often the engine runs this Automation; Brick sets the run time (16:00 UTC). Nothing on the page states it.",
      options: [
        { label: "Weekdays", value: "weekdays" },
        { label: "Daily", value: "daily" },
        { label: "Weekly", value: "weekly" },
      ],
      preset: 1,
    }),
  ],
  {
    sop: {
      ...finalize,
      summary:
        "Runs on a schedule and routes to a person unfinalized work orders proposed as clean by the project finalization sweep and routed for a Brick teammate's approval; a Brick operator acts.",
      steps: ["Step 9: Re-verify and finalize an approved work order"],
    },
  },
);

// Which SOPs to save. Nothing like them exists yet, so each one is new.
const confirmSave = card(
  "q-save",
  "Confirm what to save",
  "Decisions:",
  [
    { key: "finalization-sweep", name: SWEEP },
    { key: "overdue-task-chase", name: CHASE },
    { key: "finalize-approved-work-order", name: FINALIZE },
  ].map(({ key, name }) => ({
    key,
    text: name,
    tag: "New",
    note: `${key} · No Automation exists yet.`,
    options: [
      { label: "Create", value: "create" },
      { label: "Don't save", value: "skip" },
    ],
    preset: 0,
  })),
  { submitLabel: "Save" },
);

// ---------------------------------------------------------------------------
// Reading the answers back
// ---------------------------------------------------------------------------

// When an SOP runs, from its cadence answer. Brick runs scheduled SOPs at
// 16:00 UTC.
function schedule(cadence: string | undefined) {
  if (!cadence) return undefined;
  const c = cadence.toLowerCase();
  if (c === "hourly") return "Hourly";
  return `${c[0].toUpperCase()}${c.slice(1)} at 16:00 UTC`;
}

// The answer as a sentence, so it reads inside the compiled instructions.
const sentence = (v: string | undefined) => (v ? (/[.!?]$/.test(v) ? v : `${v}.`) : "");

// The ids the recorded session saved the two SOPs under.
const SAVED_IDS: Record<string, string> = {
  "finalization-sweep": "sop_a26cf191-af81-403c-b147-1e24282b37f5",
  "finalize-approved-work-order": "sop_4872888d-d08e-4e9f-84e3-98d3b4b26ae1",
};

const CHASE_BLOCKER =
  "Not executable: the Route check uses a work order market field that the supplied grounding does not establish, and the step is not marked human.";

// The SOPs in save order, with whether each can run.
const SAVE_ORDER = [
  { key: "finalization-sweep", name: SWEEP, executable: true },
  { key: "overdue-task-chase", name: CHASE, executable: false },
  { key: "finalize-approved-work-order", name: FINALIZE, executable: true },
];

// ---------------------------------------------------------------------------
// The task
// ---------------------------------------------------------------------------

// What a questions turn expects: the message its card sends.
const ANSWERS = /^(Answers for|Decisions:)/;
const ANSWER_NUDGE = "Pick an answer for each question in the card above, then send them.";

const checking = (status: string, entry: StellaEntry & { kind: "questions" }, text?: string): StellaBeat[] => [
  { after: 300, status, holds: 1400 },
  ...(text ? [{ after: 1800, entry: { kind: "agent" as const, text } }] : []),
  { after: text ? 2200 : 1800, entry },
];

export const wofTask: StellaTask = {
  id: "wof-sops",
  title: "Create Automations: Work Order Finalization",
  brandId: null,
  chip: "Notion → Automations",
  chipPrompt: STELLA_WOF_PROMPT,
  route: /\bcreate (an? )?sops? from\b/i,
  progress: [
    { label: "Read the page", detail: "Check it against Brick data and split it into Automations" },
    { label: "Automation 1, first questions", detail: SWEEP },
    { label: "Automation 1, more questions", detail: SWEEP },
    { label: "Automation 2, first questions", detail: CHASE },
    { label: "Automation 2, more questions", detail: CHASE },
    { label: "Automation 3 questions", detail: FINALIZE },
    { label: "Save and schedule", detail: "Save the Automations that can run" },
  ],
  doneNote: `Task complete. ${SWEEP} and ${FINALIZE} are saved and scheduled; ${CHASE} was skipped as not executable.`,
  turns: [
    // ---- 1. The link -----------------------------------------------------
    {
      suggestion: STELLA_WOF_PROMPT,
      match: /notion\.(com|so)|3dc71cfae62e81/i,
      nudge: "Paste the Notion link to the Automation page and I'll hand it to the Automation builder.",
      completes: 0,
      beats: [
        { after: 300, status: "Working through 1 step", holds: 1200 },
        {
          after: 1600,
          entry: {
            kind: "agent",
            text: "I’m switching to the Automation builder now; it will read the page, check it against Brick data, and ask a few questions.",
          },
        },
        { after: 2000, status: "Reading the page and checking it against Brick data", holds: 2600 },
        {
          after: 2600,
          entry: {
            kind: "tool",
            tool: "notion.fetch_page",
            args: "page_id=3dc71cfae62e811a9452c418d4132e3a",
            result: `“${page?.name ?? "Work Order Finalization: Project-Based Customers"}” · 9 steps · 9 TBDs · no owner`,
            ok: true,
          },
        },
        {
          after: 3300,
          entry: {
            kind: "tool",
            tool: "brickos.work_orders.sample",
            args: "finalized=false, scope=Brick-wide",
            result: "Kinds: event ops, storage, kitting, shipping and receiving, will call, ad hoc · charge configs per task kind",
            ok: true,
          },
        },
        {
          after: 4100,
          entry: {
            kind: "tool",
            tool: "sop_builder.split",
            args: "source=notion:3dc71cfae62e81…",
            result: "3 Automations · 2 steps not in any Automation · 3 page checks not recorded in the data",
            ok: false,
          },
        },
        {
          after: 4800,
          entry: {
            kind: "agent",
            heading: "What this page becomes: 3 Automations",
            text:
              "The page as written is not an executable Automation yet. It has no owner, 9 TBDs left open (“[TBD - no permanent owner assigned yet]”; “[TBD - exact cadence]”; “[TBD - where to look this up]”; …).\n\nKeep the core checks: finalization has a clear purpose and is not covered by another Automation. As written, the page lacks an assigned human owner, exact cadence, executable margin and $0 rules, an approved finalization actor, and record-backed evidence and failure paths; its clean-work-order completion test is therefore not yet publishable.\n\nThe Automations below are what it should become; the questions fill these gaps. Update the page afterwards so it says the same thing.",
          },
        },
        { after: 5200, entry: { kind: "proposals", sops: [sweep, chase, finalize] } },
        {
          after: 5600,
          entry: {
            kind: "agent",
            text: "Built from the page’s steps as listed; the written Automation after your answers puts checks before actions and the irreversible step last.",
          },
        },
        {
          after: 6000,
          entry: {
            kind: "agent",
            heading: "Not in any Automation",
            text:
              "• Dropped step 1 (Open the brand on the finalization page): portal navigation adds no check; Stella reads work order records directly.\n• Step 4 (Check how the brand's rates are set up) is a brand variable, not a step: the page identifies rate setup as a brand variable; its default/custom/rate-sheet classification is not a reliable Brick field.",
          },
        },
        {
          after: 6500,
          entry: {
            kind: "agent",
            heading: "What the data showed",
            text:
              "• “NEVER finalize a work order that still has an in-progress or overdue task. Finalization cannot be undone, so that task's charge is gone.” (step 2): could not be checked; not recorded in the fixture.\n• “Every task is complete. Nothing in progress, nothing overdue.” (step 9): could not be checked; not recorded in the fixture.\n• “Finalize each one that clears the checklist below.” (step 9): could not be checked; not recorded in the fixture.\n• The proposed default/custom/brand-rate-sheet test cannot determine pricing: Brick pricing uses charge configs per task kind and their versions; the available rate sheets are for NOs.\n• The event-ops band does not cover the work order kinds present in the Brick-wide sample.\n• The reviewer's Acknowledgement example makes an unconditional completed-task charge rule unsafe.\n\nOutside Brick, left out: the network operator's own tracker (steps 6, 7). Stella has no connection to it, so the Automation runs on Brick records and connected apps and says so.",
          },
        },
        {
          after: 7000,
          entry: {
            kind: "agent",
            text: `Next: a few things the page and the data do not settle, one Automation at a time, starting with ${SWEEP}. Where a rule depends on a fact that differs by brand, the question says so and asks how the Automation should get it.`,
          },
        },
        { after: 7400, entry: sweepFirst },
      ],
    },

    // ---- 2–6. The questions, one card per turn ---------------------------
    {
      match: ANSWERS,
      nudge: ANSWER_NUDGE,
      completes: 1,
      beats: checking("Checking your answers against the page", sweepSecond),
    },
    {
      match: ANSWERS,
      nudge: ANSWER_NUDGE,
      completes: 2,
      beats: checking("Writing up Automation 1", chaseFirst, `That settles ${SWEEP}. Next, ${CHASE}.`),
    },
    {
      match: ANSWERS,
      nudge: ANSWER_NUDGE,
      completes: 3,
      beats: checking("Checking your answers against the page", chaseSecond),
    },
    {
      match: ANSWERS,
      nudge: ANSWER_NUDGE,
      completes: 4,
      beats: checking("Writing up Automation 2", finalizeQuestions, `That settles ${CHASE}. Last, ${FINALIZE}.`),
    },

    // ---- 7. Write all three, then confirm what to save -------------------
    {
      match: ANSWERS,
      nudge: ANSWER_NUDGE,
      completes: 5,
      beats: (answers) => [
        { after: 300, status: "Writing the Automations", holds: 2400 },
        {
          after: 2700,
          entry: {
            kind: "tool",
            tool: "sop_builder.write",
            args: "sops=finalization-sweep,overdue-task-chase,finalize-approved-work-order",
            result: "3 written · 2 executable · overdue-task-chase blocked on its Route check",
            ok: false,
          },
        },
        {
          after: 3200,
          entry: {
            kind: "sopList",
            heading: "3 Automations written",
            rows: SAVE_ORDER.map(({ key, name, executable }) => ({
              name,
              status: executable ? "Executable" : "Not executable yet",
              tone: executable ? "ok" : "warn",
              detail: schedule(answers[`cadence.${key}`]) ?? "Daily at 16:00 UTC",
            })),
          },
        },
        {
          after: 3700,
          entry: {
            kind: "agent",
            heading: "Checked against the saved Automations",
            text: `Not executable, so not saved this time: ${CHASE}. Their blockers are listed in the Automations above; fix the page and run again.\n\nNothing like these exists yet. Confirm what to save:`,
          },
        },
        { after: 4100, entry: confirmSave },
      ],
    },

    // ---- 8. Save and schedule --------------------------------------------
    {
      match: ANSWERS,
      nudge: ANSWER_NUDGE,
      completes: 6,
      beats: (answers) => {
        const saved = SAVE_ORDER.filter((s) => s.executable && answers[s.key] === "create");
        const skipped = SAVE_ORDER.filter((s) => !s.executable && answers[s.key] === "create");
        const count = saved.length === 1 ? "1 Automation" : `${saved.length} Automations`;
        const when = (key: string) => schedule(answers[`cadence.${key}`]) ?? "Daily at 16:00 UTC";
        const sameWhen = new Set(saved.map((s) => when(s.key))).size === 1;
        const beats: StellaBeat[] = [
          { after: 300, status: "Saving and scheduling", holds: 1800 },
          ...[...saved, ...skipped].map<StellaBeat>((s, i) => ({
            after: 2100 + i * 400,
            entry: {
              kind: "tool",
              tool: "brick.sops.save",
              args: `key=${s.key}, decision=create`,
              result: s.executable ? `${SAVED_IDS[s.key]} · ${when(s.key)}` : "Refused: not executable",
              ok: s.executable,
            },
          })),
        ];
        let at = 2100 + (saved.length + skipped.length) * 400 + 300;
        if (saved.length) {
          beats.push({
            after: at,
            entry: {
              kind: "sopList",
              heading: `${count} saved and scheduled`,
              rows: saved.map((s) => ({ name: s.name, status: "Created", tone: "ok", detail: `${when(s.key)} · ${SAVED_IDS[s.key]}` })),
            },
          });
          at += 400;
        }
        if (skipped.length) {
          beats.push({
            after: at,
            entry: {
              kind: "agent",
              heading: "Skipped overdue-task-chase",
              text:
                "Not executable: The Route check uses a work order market field that the supplied grounding does not establish, and the step is not marked human.\n\n• Checks: Route: define an evidence-based test for whether a channel is suitable and whether channels are organized by market.\n• Research: Recheck routing evidence or record unavailable reply evidence: tag the action that records missing reply evidence as a reversible write rather than a read.\n• And 5 more.",
            },
          });
          at += 400;
        }
        beats.push({ after: at, status: "This conversation is back with Stella", holds: 600 });
        const names = saved.map((s) => `• ${s.name}`).join("\n");
        beats.push({
          after: at + 900,
          entry: {
            kind: "agent",
            text: [
              saved.length
                ? `${saved.length === 1 ? "One Automation was" : saved.length === 2 ? "Two Automations were" : "Three Automations were"} saved and scheduled${
                    sameWhen ? `, ${saved.length === 1 ? "" : "both "}${when(saved[0].key).replace(/^./, (c) => c.toLowerCase())}` : ""
                  }:\n\n${names}`
                : "Nothing was saved.",
              skipped.length
                ? `${CHASE} was not saved. Its channel-routing check relies on an unverified work order market field, and other steps need clearer evidence and action definitions. Fix those blockers on the page, then submit the link again.`
                : "",
            ]
              .filter(Boolean)
              .join("\n\n"),
          },
        });
        return beats;
      },
    },
  ],

  // The three SOPs as the rail shows them: each appears once the page is read,
  // picks up its owner and schedule as they are answered, compiles once its
  // last card is sent, and ends saved or blocked.
  drafts: (turnsDone, answers) => {
    if (turnsDone < 1) return [];
    const written = turnsDone >= 6;
    const saved = turnsDone >= 7;

    const attributes = (key: string, acts: string) => {
      const kept = saved && answers[key] === "create" && key !== "overdue-task-chase";
      const when = schedule(answers[`cadence.${key}`]);
      const owner = answers[`owner.${key}`] ?? answers[`authority.${key}`];
      return [
        { label: "Subject type", value: "work_order" },
        { label: "Schedule", value: when ?? "TBD", pending: !when },
        { label: "Owner", value: owner ?? "TBD", pending: !owner },
        { label: "Acts", value: acts },
        { label: "Version", value: kept ? "1" : "Unsaved", pending: !kept },
        { label: "Updated", value: formatDateTime(MOCK_NOW_ISO) },
      ];
    };
    const status = (key: string, compiled: boolean): SopDraft["status"] => {
      if (key === "overdue-task-chase" && written) return "not executable";
      if (saved && answers[key] === "create") return "active";
      return written || compiled ? "draft" : "drafting";
    };

    const a = (key: string) => sentence(answers[key]);
    const sweepDone = turnsDone >= 3;
    const chaseDone = turnsDone >= 5;
    const finalizeDone = turnsDone >= 6;

    return [
      {
        id: "draft-finalization-sweep",
        name: SWEEP,
        status: status("finalization-sweep", sweepDone),
        attributes: attributes("finalization-sweep", "Stella"),
        raw: ["expand-tasks", "check-margin", "check-charges", "search-context", "ping-am"].map(pageStep),
        compiled: sweepDone
          ? [
              "Intent: Find project work orders that are safe to finalize and propose each one for approval. Finalization cannot be undone, so anything missed is locked in.",
              `Selection: ${a("scope.finalization-sweep")} Exclude test Brands. Do not treat readyToFinalize as proof: ${a("ready-gate.finalization-sweep")}`,
              "For each work order, read every task. A task in progress or past its date blocks the work order; Chase Overdue NO Tasks handles the operator.",
              `Margin is (Brand debits − operator payouts) ÷ Brand debits. Event operations: ${a("margin-band.finalization-sweep")} Storage, kitting, shipping and receiving, will call and ad hoc: ${a("other-margin-bands.finalization-sweep")} ${a("zero-revenue.finalization-sweep")}`,
              `Charges: ${a("pricing-record.finalization-sweep")} For a completed $0 task: ${a("zero-charge.finalization-sweep")}`,
              "For anything flagged, search the Brand's Slack channels, email and Granola notes for evidence, then send the account owner (AM) the work order, the task, who completed it and the evidence, and ask whether a charge is needed. Never add a charge yourself.",
              "A work order that clears every check gets a finalization proposal for Finalize Approved Work Order. Stella never finalizes.",
            ]
          : null,
      },
      {
        id: "draft-overdue-task-chase",
        name: CHASE,
        status: status("overdue-task-chase", chaseDone),
        attributes: attributes("overdue-task-chase", "Stella"),
        raw: [pageStep("chase-operator")],
        compiled: chaseDone
          ? [
              "Intent: Get overdue network operator tasks completed or updated, so they stop holding up finalization.",
              "Selection: unfinalized work orders containing a dated task whose date has passed and which is neither completed nor cancelled. Skip tasks already covered by a recorded active chase.",
              `Chase: post the task link tagging the assigned operator, in a channel, never a DM. ${a("channel-visibility.overdue-task-chase")} If there is none: ${a("channel-fallback.overdue-task-chase")}`,
              "Route: when the Brand runs a channel per market, use the market channel for the work order.",
              `If there is no reply ${answers["no-reply-timeout.overdue-task-chase"] ?? "TBD"} after the recorded request: ${a("no-reply-escalation.overdue-task-chase")} Record the chase so the next run does not repeat it.`,
            ]
          : null,
        blocker: written ? CHASE_BLOCKER : undefined,
      },
      {
        id: "draft-finalize-approved-work-order",
        name: FINALIZE,
        status: status("finalize-approved-work-order", finalizeDone),
        attributes: attributes("finalize-approved-work-order", "Brick operator, confirms each"),
        raw: [pageStep("finalize")],
        compiled: finalizeDone
          ? [
              "Intent: Finalize a work order only after a person has re-verified it. Finalization is irreversible, so a person confirms each one.",
              `Selection: unfinalized work orders proposed as clean by ${SWEEP} and routed for approval.`,
              "Before finalizing, recheck the current gates: every task completed, margin inside its band, every $0 task explained, and any manual charge the account owner asked for added. If anything changed since the proposal, send it back to the sweep instead.",
              `Who finalizes: ${a("authority.finalize-approved-work-order")} Stella prepares the work order and the evidence; she never clicks Finalize.`,
              `If Finalize locks an incorrect charge: ${a("recovery.finalize-approved-work-order")} Include the work-order link and the error.`,
            ]
          : null,
      },
    ];
  },
};
