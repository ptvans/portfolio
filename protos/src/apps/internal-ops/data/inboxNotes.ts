// Messages that aren't alerts, SOP runs or brand/NO threads: goal check-ins,
// project flags, task completion audits, notes from coworkers, and SOP
// requests that carry Stella's own write-up. A note's type is what it is
// about; most are written by Stella, which `from` says.
// Seeded on the prototype's clock (MOCK_NOW_ISO is 2026-10-28 noon Pacific).

import type { AlertSeverity } from "../../../types/domain";

export type NoteType = "sop" | "goal" | "project" | "audit" | "coworker";

// One time the SOP raised this subject: when, and what it found that time.
export interface RaisedEntry {
  at: string; // ISO
  note: string;
}

// One part of Stella's write-up, under a grey heading. `[label](/path)` in the
// text becomes a link.
export interface NoteSection {
  heading: string;
  text: string;
}

export interface InboxNote {
  id: string;
  type: NoteType;
  title: string;
  body: string;
  // Who wrote it: a coworker's name, or "Stella".
  from: string;
  // What it is asking you for; null for an FYI.
  ask: string | null;
  severity: AlertSeverity | "normal";
  at: string; // ISO
  brandId: string | null;
  projectId: string | null;
  // Sent to you rather than to the whole Internal Ops team.
  forMe: boolean;
  // The SOP that raised it, for the pane's "From:" link.
  sopId?: string;
  // Stella's write-up, shown in place of `body` when present.
  sections?: NoteSection[];
  // Asks for a yes or no: the pane shows Decline and Approve.
  decision?: boolean;
  // Every run that raised this same subject, oldest first, the latest being
  // this message. An SOP that finds the same problem again updates the one
  // message rather than raising another.
  raised?: RaisedEntry[];
}

// Six Autolane Austin shifts that passed every finalization check, so each
// asks for the same thing: finalize it. Shared with data/myWork.ts, where
// they make up a group shown as a summary rather than as six rows.
export const AUTOLANE_READY_SHIFTS = ["21", "22", "23", "24", "25", "26"].map((day) => ({
  day,
  noteId: `note-autolane-austin-oct${day}-ready`,
  hours: 8,
  charge: "$640.00",
}));

export const inboxNotes: InboxNote[] = [
  {
    id: "note-sop-npn360-closeout",
    type: "sop",
    title: "Approve North Riverside finance closeout follow-up for Jasmine",
    body: "Stella asks to assign Jasmine a dated follow-up on North Riverside's financial closeout.",
    from: "Stella",
    ask: null,
    severity: "high",
    at: "2026-10-28T11:45:00-07:00",
    brandId: "brand-npn360",
    projectId: "proj-npn-north-riverside",
    forMe: true,
    sopId: "sop-npn360-financial-closeout",
    decision: true,
    raised: [
      { at: "2026-10-25T11:45:00-07:00", note: "4 of 18 completed North Riverside work orders not finalized; no follow-up assigned." },
      { at: "2026-10-26T11:45:00-07:00", note: "Same 4 work orders. $713 in brand charges and $373.50 in operator credits still off statements." },
      { at: "2026-10-27T11:45:00-07:00", note: "No change. Storage order quantities still unvalidated; freight order still pending." },
      { at: "2026-10-28T11:45:00-07:00", note: "Still open after 4 daily runs. Asked for approval to assign Jasmine a dated follow-up." },
    ],
    sections: [
      {
        heading: "Worked through 29 steps",
        text: "As of October 28, 14 of 18 completed npn360 project work orders are finalized. The other four are in the [North Riverside project](/internal-ops/projects/proj-npn-north-riverside), with $713 in brand charges and $373.50 in operator credits not yet on statements. I found no documented closeout blocker or assigned follow-up.",
      },
      {
        heading: "Choose an action",
        text: "Before finance finalizes them, the [storage order’s](/internal-ops/projects/proj-npn-north-riverside) quantities need validation, and a separate [freight order](/internal-ops/projects/proj-npn-north-riverside) remains pending. I’ve asked for approval to assign Jasmine a dated project follow-up documenting those issues. No records have been changed.",
      },
    ],
  },
  {
    id: "note-goal-chewy-receiving",
    type: "goal",
    title: "Chewy on-time receiving is at 86%, under the 95% Q3 goal",
    body: "On-time receiving across Chewy's DEN and TPA popups slipped to 86% over the last 14 days. Three late inbound parcels account for most of the gap; without them the rate is 94%.",
    from: "Stella",
    ask: "Need review of",
    severity: "high",
    at: "2026-10-28T08:30:00-07:00",
    brandId: "brand-chewy",
    projectId: null,
    forMe: true,
  },
  {
    id: "note-goal-promobile-loadin",
    type: "goal",
    title: "Promobile tour stops hit 100% on-time load-in for October",
    body: "All 18 Promobile tour stops this month loaded in on time, ahead of the 97% goal. The streak started when the Chicago and LA hubs moved to day-before staging.",
    from: "Stella",
    ask: null,
    severity: "low",
    at: "2026-10-27T17:00:00-07:00",
    brandId: "brand-promobile",
    projectId: null,
    forMe: true,
  },
  {
    id: "note-project-ag1-chicago",
    type: "project",
    title: "AG1 — Chicago Tour Stop has no network operator 4 days before load-in",
    body: "The project is accepted and starts Monday, but no network operator has accepted the load-in work order. Two Chicago operators were offered it yesterday and haven't answered.",
    from: "Stella",
    ask: "Take action on",
    severity: "critical",
    at: "2026-10-28T09:10:00-07:00",
    brandId: "brand-promobile",
    projectId: "proj-pm-93n1dqnj",
    forMe: true,
  },
  {
    id: "note-project-olive-young",
    type: "project",
    title: "Olive Young warehousing has no statement of work",
    body: "Olive Young / Los Angeles / Warehousing started on October 13 without a statement of work on file, so its storage can't be billed against contracted rates.",
    from: "Stella",
    ask: "Need more information for",
    severity: "medium",
    at: "2026-10-27T13:45:00-07:00",
    brandId: "brand-promobile",
    projectId: "proj-pm-7j0xmag6",
    forMe: true,
  },
  {
    id: "note-audit-den-a",
    type: "audit",
    title: "DEN-A load-out was closed without the required photos",
    body: "The task completion audit found the DEN-A Hound Hill load-out marked complete with no pallet or site photos. The Automation requires both before a load-out can close.",
    from: "Stella",
    ask: "Need correction on",
    severity: "critical",
    at: "2026-10-28T10:20:00-07:00",
    brandId: "brand-chewy",
    projectId: null,
    forMe: true,
  },
  {
    id: "note-audit-promobile-weekly",
    type: "audit",
    title: "Weekly audit: 41 of 42 Promobile tasks passed",
    body: "One Yerba Madre receiving task in Denver is missing a signed BOL. Everything else completed this week met its checklist.",
    from: "Stella",
    ask: null,
    severity: "medium",
    at: "2026-10-26T07:00:00-07:00",
    brandId: "brand-promobile",
    projectId: null,
    forMe: true,
  },
  {
    id: "note-coworker-matthew",
    type: "coworker",
    title: "Chewy wants a call today about the late tent kit",
    body: "Brenda at Chewy asked for a call before 3pm about the DEN-A tent kit. I'm on site in Tampa all afternoon — can you take it? Notes from my last call are in the project channel.",
    from: "Matthew R.",
    ask: null,
    severity: "high",
    at: "2026-10-28T11:05:00-07:00",
    brandId: "brand-chewy",
    projectId: null,
    forMe: true,
  },
  {
    id: "note-coworker-dana",
    type: "coworker",
    title: "Base Power Houston North rollout plan is ready for comments",
    body: "Shared the battery install rollout plan for Houston North with the team. Looking for comments on the crew ramp before Friday.",
    from: "Dana K.",
    ask: null,
    severity: "normal",
    at: "2026-10-27T16:20:00-07:00",
    brandId: "brand-basepower",
    projectId: null,
    forMe: false,
  },
  {
    id: "note-stella-tracking",
    type: "project",
    title: "Three Chewy popups this week depend on parcels with no tracking",
    body: "DEN-A, DEN-B and TPA-B each have a receiving task whose parcels have no tracking number. If any of them are late there is no time to reorder before the event. I can ask the carrier for an ETA on each.",
    from: "Stella",
    ask: null,
    severity: "critical",
    at: "2026-10-28T11:40:00-07:00",
    brandId: "brand-chewy",
    projectId: null,
    forMe: true,
  },
  {
    id: "note-stella-staffing",
    type: "project",
    title: "Next week's Promobile staffing plan",
    body: "I drafted next week's staffing for the 12 Promobile tour stops from the accepted work orders: 31 shifts across 6 network operators. Two stops share a crew in Chicago on Tuesday.",
    from: "Stella",
    ask: "Need approval on",
    severity: "medium",
    at: "2026-10-27T09:00:00-07:00",
    brandId: "brand-promobile",
    projectId: null,
    forMe: true,
  },
  // -------------------------------------------------------------------------
  // The My Work examples from Thom's Nov 5 mockups: Coco's zero-dollar days
  // and bot counts, two finalization holds, and two access requests. Each is
  // an item in data/myWork.ts; Stella's write-up and responses live there.
  // -------------------------------------------------------------------------
  {
    id: "note-coco-jc-oct22-zero",
    type: "sop",
    title: "Jersey City daily deployment on October 22 has $0 in per-bot charges",
    body: "14 bots logged out and back, no per-bot charge line. The rate card bills $18.00 per bot per day.",
    from: "Stella",
    ask: "Need decision for",
    severity: "medium",
    at: "2026-10-15T09:10:00-07:00",
    brandId: "brand-coco",
    projectId: null,
    forMe: true,
  },
  {
    id: "note-coco-jc-oct23-counts",
    type: "sop",
    title: "Jersey City October 23 billed 11 bots deployed and 13 undeployed",
    body: "Two more bots came back than went out. The charges as billed assume two carried over from October 22.",
    from: "Stella",
    ask: "Need decision for",
    severity: "medium",
    at: "2026-10-16T09:10:00-07:00",
    brandId: "brand-coco",
    projectId: null,
    forMe: true,
  },
  {
    id: "note-coco-sj-oct4-counts",
    type: "sop",
    title: "San Jose October 4 charges 20 bots; the deployment log shows 17",
    body: "The charge line and the log disagree by three bots.",
    from: "Stella",
    ask: "Need decision for",
    severity: "medium",
    at: "2026-10-17T09:10:00-07:00",
    brandId: "brand-coco",
    projectId: null,
    forMe: true,
  },
  {
    id: "note-coco-sj-oct22-nocharges",
    type: "sop",
    title: "San Jose daily deployment on October 22 completed with no charges",
    body: "16 bots logged, no charge lines and no credit recorded.",
    from: "Stella",
    ask: "Need review of",
    severity: "medium",
    at: "2026-10-15T09:20:00-07:00",
    brandId: "brand-coco",
    projectId: null,
    forMe: true,
  },
  {
    id: "note-coco-chi-oct21-holiday",
    type: "sop",
    title: "Chicago October 21 ran on a holiday schedule; the contract has no holiday rate",
    body: "Nothing in the Robot contract says whether a holiday day bills at the standard rate.",
    from: "Stella",
    ask: "Need review of",
    severity: "medium",
    at: "2026-10-14T09:10:00-07:00",
    brandId: "brand-coco",
    projectId: null,
    forMe: true,
  },
  // Two more for the same group, so it holds more than a card shows.
  {
    id: "note-coco-la-oct24-counts",
    type: "sop",
    title: "Los Angeles October 24 charges 9 bots; the deployment log shows 12",
    body: "The charge line is three bots short of the log.",
    from: "Stella",
    ask: "Need decision for",
    severity: "medium",
    at: "2026-10-18T09:10:00-07:00",
    brandId: "brand-coco",
    projectId: null,
    forMe: true,
  },
  {
    id: "note-coco-mia-oct25-zero",
    type: "sop",
    title: "Miami daily deployment on October 25 has $0 in per-bot charges",
    body: "10 bots logged out and back, no per-bot charge line.",
    from: "Stella",
    ask: "Need decision for",
    severity: "medium",
    at: "2026-10-19T09:10:00-07:00",
    brandId: "brand-coco",
    projectId: null,
    forMe: true,
  },
  {
    id: "note-ltl-wi-ca-freight",
    type: "sop",
    title: "LTL shipment WI-CA 10/2 is ready to finalize on an estimated freight charge",
    body: "The carrier invoice hasn't arrived; the freight line is the quote.",
    from: "Stella",
    ask: "Need decision for",
    severity: "medium",
    at: "2026-10-26T10:00:00-07:00",
    brandId: null,
    projectId: null,
    forMe: true,
  },
  {
    id: "note-nike-adt-la-storage",
    type: "sop",
    title: "Nike-ADT LA Storage is due to bill before its new pallet-rate quote is approved",
    body: "Quote sent October 24, unsigned. Monthly storage bills on the 1st.",
    from: "Stella",
    ask: "Need decision for",
    severity: "medium",
    at: "2026-10-26T10:30:00-07:00",
    brandId: null,
    projectId: null,
    forMe: true,
  },
  {
    id: "note-access-yerba-slack",
    type: "sop",
    title: "Lost access to the Yerba Madre Slack workspace; 16 checks depend on it",
    body: "Prices, fees and agreements for Yerba Madre are confirmed in their Slack channel.",
    from: "Stella",
    ask: "Take action on",
    severity: "critical",
    at: "2026-10-28T08:05:00-07:00",
    brandId: null,
    projectId: null,
    forMe: true,
  },
  {
    id: "note-access-autolane-brick",
    type: "sop",
    title: "No Build access to Autolane Austin's October 19–20 shift charges",
    body: "The shift charges are on records Stella can't read, so the two days can't be checked or billed.",
    from: "Stella",
    ask: "Take action on",
    severity: "critical",
    at: "2026-10-28T08:10:00-07:00",
    brandId: "brand-autolane",
    projectId: null,
    forMe: true,
  },
  ...AUTOLANE_READY_SHIFTS.map<InboxNote>((s, i) => ({
    id: s.noteId,
    type: "sop",
    title: `Autolane Austin October ${s.day} shift passed every finalization check`,
    body: `${s.hours} hours as scheduled, ${s.charge} at the rate card, nothing disputed.`,
    from: "Stella",
    ask: "Need approval on",
    severity: "normal",
    at: `2026-10-27T10:0${i}:00-07:00`,
    brandId: "brand-autolane",
    projectId: null,
    forMe: true,
  })),
];
