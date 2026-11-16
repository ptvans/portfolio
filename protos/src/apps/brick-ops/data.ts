// Brick Ops seed data: the automation the agent offers on the home screen, and
// the Needs Your Attention queue.
//
// Needs Your Attention is the mobile name for the requests (URMs) Stella has
// grouped for Internal Ops on the web home — the same WORK_GROUPS, read
// rather than copied, so the two surfaces never disagree about what is open.
// State is the phone's own: acting here does not settle the web's copy.

import brockAvatar from "../../assets/brick-ops-agent.webp";
import forkyAvatar from "../../assets/brick-ops-agent-forky.webp";
import { WORK_GROUPS, type WorkAction, type WorkGroup, type WorkItem } from "../internal-ops/data/myWork";

export interface AttentionItem extends WorkItem {
  group: WorkGroup;
}

// Flattened in the web's ranking: what's blocking Stella first, then the
// one-press decisions, then the groups that need more thought.
export const ATTENTION: AttentionItem[] = WORK_GROUPS.flatMap((group) =>
  group.items.map((item) => ({ ...item, group })),
);

export const attentionById = (id: string) => ATTENTION.find((i) => i.messageId === id);

export const groupTitle = (g: WorkGroup) => (g.subject ? `${g.kind} ${g.subject}` : g.kind);

export type { WorkAction };

// ---- The agent ------------------------------------------------------------
//
// Brick Ops users name their agent themselves; it is Stella on the web. This
// is the name it starts with, until someone renames it.
export const DEFAULT_AGENT_NAME = "Brock";

// The looks a user can pick for the agent. Picking one also gives the agent
// that look's name; the name can still be edited any time after.
// `crop` zooms into art that isn't a head-and-shoulders portrait so its face
// fills the circle: `zoom` is the magnification and `focus` the point
// (percent across, percent down) the zoom holds still. The forklift keeps
// its beacon and cab and loses the wheels and forks below.
export interface AgentAvatar {
  id: string;
  name: string;
  src: string;
  crop?: { zoom: number; focus: string };
}

export const AGENT_AVATARS: AgentAvatar[] = [
  { id: "brock", name: DEFAULT_AGENT_NAME, src: brockAvatar },
  { id: "forky", name: "Forky", src: forkyAvatar, crop: { zoom: 1.6, focus: "36% 12%" } },
];

export const avatarById = (id: string) => AGENT_AVATARS.find((a) => a.id === id) ?? AGENT_AVATARS[0];

// ---- The automation the agent learned ------------------------------------
//
// Seeded from the Coco requests that keep ending the same way: a daily
// deployment whose bot counts and per-bot charges disagree gets held, and
// Coco's ops contact is asked to confirm. The agent has watched it done by hand
// often enough to draft it as an SOP. It stays a draft until someone turns
// it on; nothing here pretends it already runs.

export interface LearnedRun {
  when: string;
  what: string;
}

export const LEARNED_SOP = {
  id: "sop-draft-coco-bot-count-hold",
  name: "Robot-Count Mismatch Hold",
  brand: "Robot",
  pattern: "held Robot daily deployments for bot-count reconciliation",
  timesSeen: 7,
  since: "Oct 6",
  saves: "~40 min a week",
  trigger: "A Robot daily deployment work order is ready to finalize.",
  steps: [
    "Read the deployment log: bots deployed and bots undeployed for the day.",
    "Compare both counts with the per-bot charge line on the work order.",
    "If they agree, finalize the work order as usual.",
    "If they don't, hold it unfinalized with a note stating the gap.",
    "Ask Robot's ops contact to confirm the count, and bring the work order back when they answer.",
  ],
  learnedFrom: [
    { when: "Oct 24", what: "Los Angeles: held, 12 out and 10 back" },
    { when: "Oct 23", what: "Jersey City: held, 11 out and 13 back" },
    { when: "Oct 22", what: "Jersey City: held, $0 in per-bot charges for 14 bots" },
    { when: "Oct 14", what: "San Jose: held, 9 out and 8 back" },
    { when: "Oct 9", what: "Miami: held, $0 in per-bot charges for 6 bots" },
    { when: "Oct 7", what: "Chicago: held, 15 out and 14 back" },
    { when: "Oct 6", what: "San Jose: held, 8 out and 9 back" },
  ] satisfies LearnedRun[],
};

// What the agent says when the user types something the demo has no script for.
export const OFF_SCRIPT_REPLY =
  "I can't run that from the phone yet. Here I can act on what Needs Your Attention and walk you through the Automation I drafted; anything bigger is easier on the web.";
