// The phone's state: the chat with the agent (named by the user; Brock to
// start), which Needs Your Attention items have been answered, and what
// became of the automation it offered.
//
// The chat is a list of entries. Cards (the automation offer, an attention
// item) are entries too, and read their live state from here, so a card
// further up the chat updates when its item is answered from the list page.
//
// Besides the main chat there are side chats: blank conversations started
// from the menu's new-message button, kept apart from the main thread and
// listed under Side Chats in the menu.

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AGENT_AVATARS,
  ATTENTION,
  DEFAULT_AGENT_NAME,
  LEARNED_SOP,
  OFF_SCRIPT_REPLY,
  attentionById,
  avatarById,
  type AgentAvatar,
  type WorkAction,
} from "./data";

export type Entry =
  | { id: string; kind: "day"; text: string }
  | { id: string; kind: "stella"; text: string }
  | { id: string; kind: "user"; text: string }
  | { id: string; kind: "status"; text: string; done: boolean }
  | { id: string; kind: "suggestion" }
  | { id: string; kind: "attention"; messageId: string };

export interface SideChat {
  id: string;
  // Its first message, once there is one.
  title: string | null;
  entries: Entry[];
}

export type SuggestionState = "open" | "dismissed" | "enabled";

export interface Settled {
  label: string;
  reply: string;
}

interface BrickOpsState {
  agentName: string;
  renameAgent: (name: string) => void;
  agentAvatar: AgentAvatar;
  // Picks a look for the agent and gives it that look's name.
  chooseAvatar: (id: string) => void;
  entries: Entry[];
  busy: boolean;
  suggestion: SuggestionState;
  settled: Record<string, Settled>;
  remaining: number;
  act: (messageId: string, action: WorkAction) => void;
  actAll: (groupId: string) => void;
  skip: (messageId: string) => void;
  focus: (messageId: string) => void;
  dismissSuggestion: () => void;
  enableSuggestion: () => void;
  // Sends to the main chat, or to the side chat whose id is given.
  send: (text: string, chatId?: string) => void;
  sideChats: SideChat[];
  newSideChat: () => string;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  reset: () => void;
}

const Ctx = createContext<BrickOpsState | null>(null);

// How long the agent "works" before it reports back.
const WORK_MS = 1100;
const REPLY_MS = 700;

let seq = 0;
const nextId = () => `e${++seq}`;

function initialEntries(): Entry[] {
  return [
    { id: nextId(), kind: "day", text: "Today 9:41 AM" },
    {
      id: nextId(),
      kind: "stella",
      text: `Morning, Thom. You've ${LEARNED_SOP.pattern} by hand ${LEARNED_SOP.timesSeen} times since ${LEARNED_SOP.since}, so I wrote it up as an SOP.`,
    },
    { id: nextId(), kind: "suggestion" },
    { id: nextId(), kind: "stella", text: "And here's the top thing that needs you." },
    { id: nextId(), kind: "attention", messageId: ATTENTION[0].messageId },
  ];
}

// How long the chat is before anything has happened in it.
export const INITIAL_COUNT = initialEntries().length;

export function BrickOpsProvider({ children }: { children: ReactNode }) {
  const [agentName, setAgentName] = useState(DEFAULT_AGENT_NAME);
  const [avatarId, setAvatarId] = useState(AGENT_AVATARS[0].id);
  const agentAvatar = avatarById(avatarId);
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [busy, setBusy] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestionState>("open");
  const [settled, setSettled] = useState<Record<string, Settled>>({});
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [sideChats, setSideChats] = useState<SideChat[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const timers = useRef<number[]>([]);

  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  const push = (...add: Entry[]) => setEntries((prev) => [...prev, ...add]);

  // The next item to bring up in the chat: the highest-ranked one that is
  // still open, not skipped, and not already waiting on a card in the chat.
  const nextOpen = useCallback(
    (state: { entries: Entry[]; settled: Record<string, Settled>; skipped: Set<string> }) => {
      const onScreen = new Set(
        state.entries
          .filter((e): e is Extract<Entry, { kind: "attention" }> => e.kind === "attention")
          .map((e) => e.messageId)
          .filter((id) => !state.settled[id]),
      );
      return ATTENTION.find(
        (i) => !state.settled[i.messageId] && !state.skipped.has(i.messageId) && !onScreen.has(i.messageId),
      );
    },
    [],
  );

  // The agent shows a status line while it works, then reports back.
  const work = (status: string, reply: string, after?: () => void) => {
    const statusId = nextId();
    setBusy(true);
    push({ id: statusId, kind: "status", text: status, done: false });
    later(WORK_MS, () => {
      setEntries((prev) =>
        prev.map((e) => (e.id === statusId && e.kind === "status" ? { ...e, done: true } : e)),
      );
      push({ id: nextId(), kind: "stella", text: reply });
      setBusy(false);
      after?.();
    });
  };

  // After an item is answered or skipped, offer the next one, unless one is
  // already waiting in the chat.
  const offerNext = (nextSettled: Record<string, Settled>, nextSkipped: Set<string>) => {
    setEntries((prev) => {
      const waiting = prev.some((e) => e.kind === "attention" && !nextSettled[e.messageId] && !nextSkipped.has(e.messageId));
      if (waiting) return prev;
      const next = nextOpen({ entries: prev, settled: nextSettled, skipped: nextSkipped });
      if (!next) {
        return [...prev, { id: nextId(), kind: "stella", text: "That's the top of the list cleared. Everything else is in Needs Your Attention." }];
      }
      return [
        ...prev,
        { id: nextId(), kind: "stella", text: "Next up:" },
        { id: nextId(), kind: "attention", messageId: next.messageId },
      ];
    });
  };

  const act = (messageId: string, action: WorkAction) => {
    if (busy || settled[messageId]) return;
    push({ id: nextId(), kind: "user", text: action.description });
    const nextSettled = { ...settled, [messageId]: { label: action.label, reply: action.reply } };
    work(action.status, action.reply, () => {
      setSettled(nextSettled);
      offerNext(nextSettled, skipped);
    });
  };

  // A summary group's one button: the same single action on every open item.
  const actAll = (groupId: string) => {
    if (busy) return;
    const items = ATTENTION.filter((i) => i.group.id === groupId && !settled[i.messageId]);
    const group = items[0]?.group;
    if (!group?.summary) return;
    const action = items[0].actions[0];
    push({ id: nextId(), kind: "user", text: `${action.label} all ${items.length}` });
    const nextSettled = { ...settled };
    for (const i of items) nextSettled[i.messageId] = { label: i.actions[0].label, reply: i.actions[0].reply };
    work(group.summary.acting, group.summary.done, () => {
      setSettled(nextSettled);
      offerNext(nextSettled, skipped);
    });
  };

  const skip = (messageId: string) => {
    if (busy) return;
    const nextSkipped = new Set(skipped).add(messageId);
    setSkipped(nextSkipped);
    push({ id: nextId(), kind: "user", text: "Skip for now" });
    offerNext(settled, nextSkipped);
  };

  // Opened from the list: bring the item into the chat as a card.
  const focus = (messageId: string) => {
    const item = attentionById(messageId);
    if (!item) return;
    const nextSkipped = new Set(skipped);
    nextSkipped.delete(messageId);
    setSkipped(nextSkipped);
    push({ id: nextId(), kind: "stella", text: "Here it is." }, { id: nextId(), kind: "attention", messageId });
  };

  const dismissSuggestion = () => {
    if (busy || suggestion !== "open") return;
    setSuggestion("dismissed");
    push({ id: nextId(), kind: "user", text: "Not now" });
    setBusy(true);
    later(REPLY_MS, () => {
      push({
        id: nextId(),
        kind: "stella",
        text: "No problem. I'll keep the draft, and bring it back only if you hold more of these by hand.",
      });
      setBusy(false);
    });
  };

  const enableSuggestion = () => {
    if (busy || suggestion === "enabled") return;
    setSuggestion("enabled");
    push({ id: nextId(), kind: "user", text: `Turn on ${LEARNED_SOP.name}` });
    work(
      "Publishing the SOP",
      `It's on. The next Coco deployment whose bot counts and charges disagree, I'll hold and ask Coco to confirm. You'll get a note here each time, so you can tell me if I got one wrong.`,
    );
  };

  const pushSide = (chatId: string, ...add: Entry[]) =>
    setSideChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, entries: [...c.entries, ...add] } : c)));

  const send = (text: string, chatId?: string) => {
    const t = text.trim();
    if (!t || busy) return;
    const to = chatId ? (...add: Entry[]) => pushSide(chatId, ...add) : push;
    if (chatId) {
      setSideChats((prev) => prev.map((c) => (c.id === chatId && !c.title ? { ...c, title: t } : c)));
    }
    to({ id: nextId(), kind: "user", text: t });
    setBusy(true);
    later(REPLY_MS, () => {
      to({ id: nextId(), kind: "stella", text: OFF_SCRIPT_REPLY });
      setBusy(false);
    });
  };

  // A blank conversation, newest first in the menu.
  const newSideChat = () => {
    const id = `side-${++seq}`;
    setSideChats((prev) => [
      {
        id,
        title: null,
        entries: [{ id: nextId(), kind: "stella", text: "What's on your mind? This stays out of the main chat." }],
      },
      ...prev,
    ]);
    return id;
  };

  const reset = () => {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
    setBusy(false);
    setSuggestion("open");
    setSettled({});
    setSkipped(new Set());
    setSideChats([]);
    setEntries(initialEntries());
  };

  const remaining = useMemo(() => ATTENTION.filter((i) => !settled[i.messageId]).length, [settled]);

  // An emptied name falls back to the current look's own name.
  const renameAgent = (name: string) => setAgentName(name.trim() || agentAvatar.name);
  const chooseAvatar = (id: string) => {
    const next = avatarById(id);
    setAvatarId(next.id);
    setAgentName(next.name);
  };

  const value: BrickOpsState = {
    agentName,
    renameAgent,
    agentAvatar,
    chooseAvatar,
    entries,
    busy,
    suggestion,
    settled,
    remaining,
    act,
    actAll,
    skip,
    focus,
    dismissSuggestion,
    enableSuggestion,
    send,
    sideChats,
    newSideChat,
    drawerOpen,
    setDrawerOpen,
    reset,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBrickOps() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBrickOps must be used inside BrickOpsProvider");
  return ctx;
}
