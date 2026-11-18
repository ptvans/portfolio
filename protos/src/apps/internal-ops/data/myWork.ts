// My Work: the messages Sol has grouped for you, as the Sol home shows
// them.
//
// Each group is Sol's own clustering of open messages from Messages —
// alerts, SOP runs and notes — under a short name, with the one or two
// responses she can act on for each message and a scripted result for each.
// A message with no responses asks for an answer in the group's chat. Every
// item is anchored to a real message, so acting on it here settles it in
// Messages, and a message settled there leaves the group.
//
// Four of the items are the requests Sol already drafts responses for
// (SOL_INCOMING); their sections and responses are read from there rather
// than written twice.

import { AUTOLANE_READY_SHIFTS } from "./inboxNotes";
import { SOL_INCOMING, type SolRequest } from "./solScript";

export interface WorkAction {
  label: string;
  // What picking it does, in a sentence: the user's message in the transcript.
  description: string;
  // The unit of work shown while Sol acts, and what she reports after.
  status: string;
  reply: string;
  // For a note that asks for a yes or no: what picking this records on it.
  decision?: "approved" | "declined";
}

export interface WorkItem {
  // The InboxMessage this is about ("alert:…", "note:…", "sop:…").
  messageId: string;
  // The card's title: the question Sol is asking, short.
  title: string;
  // Her opening line when the item is opened in a conversation.
  ask: string;
  // Her write-up, shown when the card is expanded.
  sections: { heading: string; body: string }[];
  // The record the card links to, when the message's own project, work
  // order or brand isn't the right name for it. `detail` shows in place of
  // the time.
  record?: { label: string; detail?: string };
  // The responses she can act on. Empty: the card says "Answer below".
  actions: WorkAction[];
  // What a refresh finds: the condition still there, or cleared since.
  refresh: { outcome: "open" | "cleared"; note: string };
}

export interface WorkGroup {
  id: string;
  // The title is two parts: what kind of request the group is ("Easy
  // decisions on", "More thought needed on"), and what it is about. A group
  // named in one breath ("Access requests") has an empty subject.
  kind: string;
  subject: string;
  brandId: string | null;
  // Which of the card palettes it draws in.
  palette: number;
  items: WorkItem[];
  // What Sol says to typed input in the group's conversation.
  typedReply: string;
  // For a group whose messages all take the same single response: Sol's
  // account of them in a few sentences, and what she is doing while she
  // acts on all of them. Its card shows this in place of the rows, with one
  // button for the response; the rows are in the group's conversation.
  // `done` is what she reports in its conversation once they are all done.
  summary?: { text: string; acting: string; done: string };
}

function fromRequest(id: string, title: string, refresh: WorkItem["refresh"]): WorkItem {
  const req = SOL_INCOMING.find((r) => r.id === id) as SolRequest;
  return {
    messageId: req.alertId ? `alert:${req.alertId}` : `note:${req.noteId}`,
    title,
    ask: req.ask,
    sections: req.sections,
    actions: req.options,
    refresh,
  };
}

const stillOpen = (note: string): WorkItem["refresh"] => ({ outcome: "open", note });
const cleared = (note: string): WorkItem["refresh"] => ({ outcome: "cleared", note });

// Ranked by how much they ask of you: what's blocking Sol first, then the
// one-press decisions, then the groups that need more thought.
export const WORK_GROUPS: WorkGroup[] = [
  {
    id: "wg-access",
    kind: "Need your help with",
    subject: "Access requests",
    brandId: null,
    palette: 1,
    typedReply:
      "Noted. Both of these are blocked on someone granting me access; the buttons on the cards send the request, and I'll rerun the checks the moment it lands.",
    items: [
      {
        messageId: "note:note-access-yerba-slack",
        title: "Restoring Slack access unblocks 16 requests",
        ask: "I've lost access to the Yerba Madre Slack workspace, and 16 of my open checks depend on it.",
        sections: [
          {
            heading: "What's Blocked",
            body: "Prices, fees and agreements for Yerba Madre are confirmed in their Slack channel. Without access I can't verify the 16 requests that cite them, so they sit unanswered.",
          },
        ],
        record: { label: "Yerba Madre", detail: "Prices, fees or agreements Sol couldn't verify" },
        actions: [
          {
            label: "Restore Access",
            description: "Ask the Yerba Madre workspace admin to restore Sol's Slack access",
            status: "Requesting Slack access",
            reply: "Requested access to the Yerba Madre Slack workspace through the workspace admin. Once it's granted I'll rerun the 16 checks and clear the ones that verify.",
          },
        ],
        refresh: stillOpen("Still no Slack access; 16 requests waiting."),
      },
      {
        messageId: "note:note-access-autolane-brick",
        title: "Waiting on Build access",
        ask: "I need Build access to the Autolane Austin shift charges for October 19–20 before I can finalize them.",
        sections: [
          {
            heading: "What's Blocked",
            body: "The shift charges live on Build records I don't have permission to read. Until someone grants it, the two days can't be checked or billed.",
          },
        ],
        record: { label: "Autolane Austin Oct 19-20 shift charges", detail: "Shift charges can't be read without it" },
        actions: [
          {
            label: "Grant Access",
            description: "Grant Sol read access to the Autolane Austin shift charges",
            status: "Granting access",
            reply: "Granted. I can read the Autolane Austin shift charges now, and I'll finalize October 19–20 once they check out.",
          },
        ],
        refresh: stillOpen("Still no access to the shift charges."),
      },
    ],
  },
  {
    id: "wg-autolane-ready",
    kind: "Ready to finalize on",
    subject: "Autolane Austin shifts",
    brandId: "brand-autolane",
    palette: 4,
    summary: {
      text: "Six Autolane Austin supervision shifts, October 21 to 26, passed every finalization check. Hours match the schedule, charges match the rate card at $640.00 a shift, and nothing is disputed. Finalizing all six bills $3,840.00.",
      acting: "Finalizing six shifts",
      done: "Finalized. All six Austin shifts are billed at $640.00 each, $3,840.00 in total.",
    },
    typedReply:
      "All six passed the same checks, so one press finalizes them together. Tell me if any should be held back and I'll leave it open.",
    items: AUTOLANE_READY_SHIFTS.map<WorkItem>((s) => ({
      messageId: `note:${s.noteId}`,
      title: `Finalize the October ${s.day} shift?`,
      ask: `Austin's October ${s.day} supervision shift ran ${s.hours} hours as scheduled and bills ${s.charge} at the rate card.`,
      sections: [
        {
          heading: "Checks Passed",
          body: "Hours match the schedule, the charge matches the rate card, and Autolane has raised no dispute.",
        },
      ],
      record: { label: `Supervision shift — Austin October ${s.day}`, detail: `${s.hours} h · ${s.charge}` },
      actions: [
        {
          label: "Finalize",
          description: `Finalize the Austin October ${s.day} shift at ${s.charge}`,
          status: "Finalizing the work order",
          reply: `Finalized. The Austin October ${s.day} shift is billed at ${s.charge}.`,
        },
      ],
      refresh: stillOpen("All checks still pass."),
    })),
  },
  {
    id: "wg-finalization",
    kind: "Easy decisions on",
    subject: "Finalization",
    brandId: null,
    palette: 0,
    typedReply:
      "Noted. These three are each a one-press decision; pick a response on the card and I'll record it, or tell me which one you want to look at first.",
    items: [
      {
        messageId: "note:note-ltl-wi-ca-freight",
        title: "Hold LTL WI-CA 10/2 for freight reconciliation?",
        ask: "The LTL shipment WI-CA 10/2 is ready to finalize, but its freight charge is the carrier's estimate; the invoice hasn't arrived.",
        sections: [
          {
            heading: "Estimate on the Line",
            body: "The freight line is the quote from booking. Carrier invoices on this lane have come in above the quote twice this quarter, so finalizing now risks a correction later.",
          },
        ],
        record: { label: "LTL Shipment | WI-CA 10/2" },
        actions: [
          {
            label: "Hold for Reconciliation",
            description: "Hold the shipment unfinalized until the carrier invoice lands",
            status: "Holding the shipment",
            reply: "Held. The WI-CA 10/2 LTL shipment stays unfinalized until the carrier invoice lands and the freight charge can be checked against it.",
          },
        ],
        refresh: stillOpen("No carrier invoice yet."),
      },
      {
        messageId: "note:note-nike-adt-la-storage",
        title: "Hold Nike-ADT LA Storage billing until quote approval?",
        ask: "LA Storage for Nike-ADT is due to bill monthly, but the quote for the new pallet rate went out on October 24 and hasn't been approved.",
        sections: [
          {
            heading: "Old Rate or New",
            body: "Billing now uses the old pallet rate; billing after approval uses the new one. The difference across the month is about $640.",
          },
        ],
        record: { label: "Nike-ADT LA Storage", detail: "Quote sent Oct 24, unsigned" },
        actions: [
          {
            label: "Hold Unfinalized",
            description: "Hold the LA Storage billing until the quote is approved",
            status: "Holding the work order",
            reply: "Held unfinalized. Nike-ADT's LA Storage billing waits on the signed quote; I'll bring it back when it comes in.",
          },
        ],
        refresh: stillOpen("The quote is still unsigned."),
      },
      fromRequest("req-pm-zero-dollar", "Approve $0 on Terra Verde pallets outbound?", stillOpen("Still $180.00 in debits against $180.00 in credits.")),
      {
        messageId: "alert:alert-al-2",
        title: "Hold the Autolane ad hoc work order with $0 billed?",
        ask: "An Autolane ad hoc work order completed with costs recorded and nothing billed.",
        sections: [
          {
            heading: "Costs With Nothing Billed",
            body: "Ad Hoc Request Random Work Order has 3 cost charges totalling $612.00 and a billed amount of $0.00. Nothing on the work order says whether the brand is to be invoiced.",
          },
          {
            heading: "Choose a Response",
            body: "Hold it unfinalized until a billed amount lands, or finalize it at $0.00 and let the margin report show the loss.",
          },
        ],
        actions: [
          {
            label: "Hold for reconciliation",
            description: "Hold the work order unfinalized until something is billed",
            status: "Holding the work order",
            reply: "Held. The work order stays unfinalized with a note that $612.00 in costs has nothing billed against it. I'll bring it back when a billed amount lands.",
          },
          {
            label: "Finalize as billed",
            description: "Finalize the work order at $0.00 billed",
            status: "Finalizing at $0.00",
            reply: "Finalized at $0.00 billed. The three cost charges stay on the work order as recorded, so the margin report will show it as a loss.",
          },
        ],
        refresh: stillOpen("Still nothing billed against the $612.00 in costs."),
      },
      fromRequest("req-npn-closeout", "Assign Jasmine the North Riverside closeout follow-up?", stillOpen("Four North Riverside work orders still unfinalized; no follow-up assigned.")),
    ],
  },
  {
    id: "wg-coco",
    kind: "More thought needed on",
    subject: "Robot zero-dollar days and bot counts",
    brandId: "brand-coco",
    palette: 5,
    typedReply:
      "Noted. Three of these are a one-press decision on their cards; the San Jose October 22 day and the Chicago holiday rate need a word from you or from Robot before I can bill them.",
    items: [
      {
        messageId: "note:note-coco-jc-oct22-zero",
        title: "Reconcile zero per-bot charges?",
        ask: "Jersey City's daily deployment on October 22 completed with $0 in per-bot charges against 14 bots deployed.",
        sections: [
          {
            heading: "Zero Per-Bot Charges",
            body: "The deployment log shows 14 bots out and 14 back, but the per-bot charge line is $0.00. The rate card bills $18.00 per bot per day, so the work order is $252.00 short unless the day was meant as a credit.",
          },
        ],
        record: { label: "Jersey City daily deployment — October 22" },
        actions: [
          {
            label: "Apply rate card",
            description: "Add the 14 per-bot charges at the rate card and finalize",
            status: "Applying the rate card",
            reply: "Added 14 per-bot charges at $18.00 to the Jersey City October 22 deployment, $252.00 in all, and finalized it. The log and the charge line now agree.",
          },
          {
            label: "Hold for Reconciliation",
            description: "Hold the work order until Robot confirms the bot count",
            status: "Holding the work order",
            reply: "Held. I've asked Robot's ops contact to confirm the Jersey City count for October 22; the work order stays unfinalized until they do.",
          },
        ],
        refresh: stillOpen("Still $0.00 in per-bot charges against 14 bots."),
      },
      {
        messageId: "note:note-coco-jc-oct23-counts",
        title: "Can the charges stand?",
        ask: "Jersey City's October 23 deployment billed 11 bots deployed and 13 undeployed.",
        sections: [
          {
            heading: "Counts Don't Match",
            body: "Two more bots came back than went out. Either two were left over from October 22 or the undeploy count is wrong; the charges as billed assume the first.",
          },
        ],
        record: { label: "Daily Deployment & Undeployment - Jersey City (Oct 23)" },
        actions: [
          {
            label: "Approved as billed",
            description: "Approve the October 23 charges as billed",
            status: "Approving the charges",
            reply: "Approved as billed. The October 23 work order finalizes with 11 deploy and 13 undeploy charges, and I've noted that two bots carried over from October 22.",
          },
          {
            label: "Hold for review",
            description: "Hold the October 23 charges until the carry-over is checked",
            status: "Holding for review",
            reply: "Held for review. I've flagged the October 22 and 23 Jersey City work orders together so the carry-over can be checked once.",
          },
        ],
        refresh: stillOpen("Counts unchanged: 11 deployed, 13 undeployed."),
      },
      {
        messageId: "note:note-coco-sj-oct4-counts",
        title: "Hold for bot-count reconciliation?",
        ask: "San Jose's October 4 deployment lists 20 bots on the charge line and 17 in the deployment log.",
        sections: [
          {
            heading: "Three Bots Apart",
            body: "The charge line was entered by hand; the log is from the bots themselves. Nothing on the work order says which is right.",
          },
        ],
        record: { label: "Daily deployment — San Jose October 4" },
        actions: [
          {
            label: "Hold for reconciliation",
            description: "Hold the work order until Robot confirms whether 17 or 20 bots went out",
            status: "Holding the work order",
            reply: "Held. The San Jose October 4 work order stays open until Robot confirms whether 17 or 20 bots went out.",
          },
          {
            label: "Finalize as billed",
            description: "Finalize at 20 bots as billed",
            status: "Finalizing at 20 bots",
            reply: "Finalized at 20 bots as billed. I've left a note on the work order that the log shows 17, in case Robot queries the invoice.",
          },
        ],
        refresh: cleared("Robot confirmed 20 bots on the October 4 log at 9:40 AM today."),
      },
      {
        messageId: "note:note-coco-sj-oct22-nocharges",
        title: "daily deployment - San Jose, October 22",
        ask: "San Jose's October 22 deployment completed with no charges at all: 16 bots logged, no charge lines, and no credit recorded either.",
        sections: [
          {
            heading: "What I Found",
            body: "It isn't a zero-dollar day by design. A deliberate credit would show on the work order, and there's nothing. Tell me whether to bill it at the rate card or hold it.",
          },
        ],
        record: { label: "daily deployment - San Jose, October 22" },
        actions: [],
        refresh: stillOpen("Still no charges on the work order."),
      },
      {
        messageId: "note:note-coco-chi-oct21-holiday",
        title: "Billing treatment before finalizing?",
        ask: "Chicago's October 21 deployment ran on a holiday schedule, and the Robot contract doesn't say whether holiday days bill at the standard rate.",
        sections: [],
        record: { label: "Chicago daily deployment - October 21" },
        actions: [],
        refresh: stillOpen("The contract still has no holiday rate."),
      },
      {
        messageId: "note:note-coco-la-oct24-counts",
        title: "Hold for bot-count reconciliation?",
        ask: "Los Angeles's October 24 deployment lists 9 bots on the charge line and 12 in the deployment log.",
        sections: [
          {
            heading: "Three Bots Short",
            body: "The log is from the bots themselves; the charge line was entered by hand. Billing 9 would leave three bot-days unbilled.",
          },
        ],
        record: { label: "Daily deployment — Los Angeles October 24" },
        actions: [
          {
            label: "Hold for reconciliation",
            description: "Hold the work order until Robot confirms whether 9 or 12 bots went out",
            status: "Holding the work order",
            reply: "Held. The Los Angeles October 24 work order stays open until Robot confirms whether 9 or 12 bots went out.",
          },
          {
            label: "Finalize as billed",
            description: "Finalize at 9 bots as billed",
            status: "Finalizing at 9 bots",
            reply: "Finalized at 9 bots as billed. I've left a note on the work order that the log shows 12.",
          },
        ],
        refresh: stillOpen("Counts unchanged: 9 billed, 12 logged."),
      },
      {
        messageId: "note:note-coco-mia-oct25-zero",
        title: "Apply the rate card to Miami October 25?",
        ask: "Miami's October 25 deployment logged 10 bots out and back with no per-bot charge line.",
        sections: [
          {
            heading: "What The Rate Card Says",
            body: "$18.00 per bot per day, so 10 bots would bill $180.00. Nothing on the work order marks the day as a credit.",
          },
        ],
        record: { label: "Daily deployment — Miami October 25" },
        actions: [
          {
            label: "Apply rate card",
            description: "Bill 10 bots at $18.00 per bot per day",
            status: "Applying the rate card",
            reply: "Applied the rate card: 10 bots at $18.00, $180.00 on the Miami October 25 work order.",
          },
          {
            label: "Hold for Reconciliation",
            description: "Hold the work order until Robot confirms the day was billable",
            status: "Holding the work order",
            reply: "Held. The Miami October 25 work order stays open until Robot confirms the day was billable.",
          },
        ],
        refresh: stillOpen("Still no per-bot charge line."),
      },
    ],
  },
  {
    id: "wg-chewy-parcels",
    kind: "More thought needed on",
    subject: "Chewy popup parcels",
    brandId: "brand-chewy",
    palette: 1,
    typedReply:
      "Noted. Two of these need Chewy to tell us whether the materials shipped; I can draft that ask for you to send, or act on the tent kit now from its card.",
    items: [
      fromRequest("req-cw-tent-kit", "Tent kit lands a day after the DEN-A drop-off", stillOpen("Parcel 1Z84A0 is still in transit, ETA Nov 22.")),
      {
        messageId: "alert:alert-cw-2",
        title: "TPA-B receiving has no parcel to track",
        ask: "The TPA-B receiving task has no parcel attached, and the event drop-off starts Nov 15.",
        sections: [
          {
            heading: "What I Checked",
            body: "I looked for a tracking number on the work order, the project and the brand thread. There is none, and Chewy hasn't said whether the materials have shipped. Tampa has no network operator assigned yet either.",
          },
        ],
        actions: [],
        refresh: stillOpen("Still no parcel on the receiving task."),
      },
      {
        messageId: "alert:alert-cw-4",
        title: "Acknowledgement on DEN-A is 3 days overdue",
        ask: "DEN-A Hound Hill Dog Park has been waiting on an acknowledgement since Oct 25.",
        sections: [
          {
            heading: "Nobody Holding It",
            body: "The work order has no network operator or warehouse assigned, so the acknowledgement is sitting with the on-site contact, Christina LaFon, and nobody has nudged her.",
          },
        ],
        actions: [
          {
            label: "Nudge Christina",
            description: "Send Christina LaFon a reminder to acknowledge DEN-A",
            status: "Sending the reminder",
            reply: "Sent Christina LaFon a reminder to acknowledge DEN-A Hound Hill Dog Park. I'll clear this once the acknowledgement lands.",
          },
        ],
        refresh: cleared("Acknowledged by Christina LaFon at 11:52 AM today."),
      },
      {
        messageId: "note:note-sol-tracking",
        title: "Three popups this week depend on untracked parcels",
        ask: "Three Chewy popups this week depend on parcels that have no tracking number.",
        sections: [
          {
            heading: "The Three",
            body: "DEN-A (tent kit, now tracked but late), TPA-B (no parcel at all) and DEN-B signage (label created, not scanned). If any of them misses, the drop-off goes out short.",
          },
        ],
        actions: [],
        refresh: stillOpen("Two of the three parcels are still untracked."),
      },
    ],
  },
  {
    id: "wg-promobile",
    kind: "More thought needed on",
    subject: "Promobile storage and staffing",
    brandId: "brand-promobile",
    palette: 2,
    typedReply:
      "Noted. The storage work order and the staffing plan are each one press away on their cards; the Chicago operator gap I can't fill myself, but I can draft the ask to the regional list.",
    items: [
      fromRequest("req-pm-storage", "Start storage billing for PHX Energy?", stillOpen("Still no storage work order on PHX Energy | Phoenix, AZ.")),
      {
        messageId: "note:note-sol-staffing",
        title: "Approve next week's staffing plan?",
        ask: "Next week's Promobile staffing plan is drafted and waiting on your approval.",
        sections: [
          {
            heading: "What's In It",
            body: "Three tour stops, each with a lead and a second. The Chicago stop still shows the open network-operator slot, so its two names are provisional.",
          },
        ],
        actions: [
          {
            label: "Approve plan",
            description: "Publish next week's staffing plan as drafted",
            status: "Publishing the plan",
            reply: "Published next week's Promobile staffing plan. The three tour stops have a lead and a second each; the Chicago stop still shows the open network-operator slot.",
          },
          {
            label: "Hold",
            description: "Hold the plan until Chicago has a network operator",
            status: "Holding the plan",
            reply: "Held. I'll bring the plan back once AG1 — Chicago Tour Stop has a network operator assigned.",
          },
        ],
        refresh: stillOpen("The plan is unchanged and still unapproved."),
      },
      {
        messageId: "note:note-project-ag1-chicago",
        title: "AG1 Chicago has no network operator 4 days out",
        ask: "AG1 — Chicago Tour Stop loads in on Nov 1 and still has no network operator.",
        sections: [
          {
            heading: "Who Could Take It",
            body: "Two operators cover Chicago. Neither has been asked. I can't assign one without you, but I can draft the ask to both and hold the load-in tasks until one accepts.",
          },
        ],
        actions: [],
        refresh: stillOpen("Still no network operator on the tour stop."),
      },
      {
        messageId: "alert:alert-pm-2",
        title: "Pick and Stage on Terra Verde is 26h past target",
        ask: "Pick and Stage on Terra Verde was due Oct 27 at 8:00 AM MT and EDGE USA INC hasn't completed it.",
        sections: [
          {
            heading: "Past Target",
            body: "The task has been in progress since Oct 26. Nothing from EDGE USA INC says why; the outbound that depends on it is scheduled for tomorrow.",
          },
        ],
        actions: [
          {
            label: "Contact EDGE USA",
            description: "Ask EDGE USA INC to complete Pick and Stage today and say what held it up",
            status: "Messaging EDGE USA INC",
            reply: "Messaged EDGE USA INC asking them to complete Pick and Stage on Terra Verde today and to say what held it up. I'll update this when they reply.",
          },
        ],
        refresh: cleared("EDGE USA INC marked Pick and Stage complete at 10:40 AM today."),
      },
    ],
  },
  {
    id: "wg-figs-events",
    kind: "Readiness checks on",
    subject: "FIGS events",
    brandId: "brand-figs",
    palette: 3,
    typedReply:
      "Noted. The COI and the receiving counts are one press each on their cards; the Ojai tracking number has to come from FIGS, and I can draft that ask.",
    items: [
      {
        messageId: "alert:alert-figs-1",
        title: "Does the Ojai pop-up need a network operator COI?",
        ask: "Event Ops — Ojai Pop-up has setup and breakdown tasks, and nothing says whether the venue wants a certificate of insurance.",
        sections: [
          {
            heading: "What the Rule Saw",
            body: "The work order includes Event Setup and Event Breakdown tasks. Venues that host those usually want the operator's COI on file, and there's none attached.",
          },
        ],
        actions: [
          {
            label: "Confirm with venue",
            description: "Draft an email to the Ojai venue asking for their COI requirements",
            status: "Drafting the venue email",
            reply: "Drafted an email to the Ojai venue asking for their certificate of insurance requirements. It's saved on the work order for you to send.",
          },
          {
            label: "Not needed",
            description: "Mark the COI as not required for Ojai",
            status: "Updating the work order",
            reply: "Marked Event Ops — Ojai Pop-up as not needing a network operator COI and dismissed the alert.",
          },
        ],
        refresh: stillOpen("Still no COI on the work order, and no word from the venue."),
      },
      {
        messageId: "alert:alert-figs-3",
        title: "LA Hub receiving has both parcel and pallet counts",
        ask: "Castillo Box entered 42 parcels and 3 pallets on the same LA Hub receiving task.",
        sections: [
          {
            heading: "One Count Should Stand",
            body: "Monthly Storage — LA Hub bills by pallet. Forty-two parcels is about three pallets' worth, so the pallet count is almost certainly the right one.",
          },
        ],
        actions: [
          {
            label: "Keep pallets",
            description: "Keep the 3 pallets and clear the parcel count",
            status: "Correcting the counts",
            reply: "Set the LA Hub receiving to 3 pallets and cleared the parcel count. Castillo Box has been told which count stands.",
          },
        ],
        refresh: stillOpen("Both counts are still on the task."),
      },
      {
        messageId: "alert:alert-figs-4",
        title: "Ojai receiving has no tracking number",
        ask: "Receive Inventory on Event Ops — Ojai Pop-up hasn't started and has no parcel attached.",
        sections: [],
        actions: [],
        refresh: stillOpen("Still no parcel on the receiving task."),
      },
    ],
  },
  {
    id: "wg-stackmoves",
    kind: "Awaiting review on",
    subject: "Stackmoves orders",
    brandId: "brand-stackmoves",
    palette: 4,
    typedReply:
      "Noted. The two reviews are one press each; the cracked tabletop needs a decision on a replacement or a credit, and I can draft either for the customer.",
    items: [
      {
        messageId: "alert:alert-st-1",
        title: "Order 0293745 delivery awaiting review for 26h",
        ask: "The driver marked order 0293745's delivery complete on Oct 27 and Build City hasn't reviewed it.",
        sections: [],
        actions: [
          {
            label: "Mark reviewed",
            description: "Mark order 0293745's delivery as reviewed",
            status: "Reviewing the delivery",
            reply: "Marked order 0293745's delivery as reviewed. The driver's completion from Oct 27 stands.",
          },
        ],
        refresh: stillOpen("Still unreviewed."),
      },
      {
        messageId: "alert:alert-st-2",
        title: "Order 0293746 pickup awaiting review for 25h",
        ask: "The driver marked order 0293746's pickup complete on Oct 27 and it hasn't been reviewed.",
        sections: [],
        actions: [
          {
            label: "Mark reviewed",
            description: "Mark order 0293746's pickup as reviewed",
            status: "Reviewing the pickup",
            reply: "Marked order 0293746's pickup as reviewed.",
          },
        ],
        refresh: cleared("Reviewed by Build City at 9:15 AM today."),
      },
      {
        messageId: "alert:alert-st-3",
        title: "Customer reports a cracked tabletop on order 0293701",
        ask: "The customer on order 0293701 reports a crack along one edge of the glass tabletop, with a photo attached.",
        sections: [
          {
            heading: "Two Ways to Settle It",
            body: "Replace the top from the Build City stock, or credit the customer. Either needs the driver's delivery photos checked first to see whether the crack was there at handover.",
          },
        ],
        actions: [],
        refresh: stillOpen("No reply from the customer since the report."),
      },
    ],
  },
];

// The title as one line, for a conversation's name.
// How many groups the Sol sidebar and home show before pointing at the
// digest, which lists them all.
export const MY_WORK_PREVIEW = 5;

// How many of a group's open messages its card shows on the home and the
// digest. A group with more points to its conversation view, which shows
// them all.
export const WORK_CARD_LIMIT = 5;

export const workGroupTitle = (g: WorkGroup) => [g.kind, g.subject].filter(Boolean).join(" ");

export function workGroupById(id: string | null | undefined): WorkGroup | undefined {
  return id ? WORK_GROUPS.find((g) => g.id === id) : undefined;
}

// The group and item a message belongs to, if Sol has grouped it.
export function workItemFor(messageId: string): { group: WorkGroup; item: WorkItem } | undefined {
  for (const group of WORK_GROUPS) {
    const item = group.items.find((i) => i.messageId === messageId);
    if (item) return { group, item };
  }
  return undefined;
}
