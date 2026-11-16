// Session state for the Stella chat, and the state of My Work.
//
// One session is one task. A session starts untasked: the first message routes
// it to one of the scripted tasks in stellaScript.ts, and from then on it
// walks that task's turns. A My Work group gets a session of its own the
// first time you respond to it — by acting on one of its messages, by writing
// in its chat, or by opening one of its messages — and that session is the
// group's conversation from then on. Everything here is session-local — a
// reload starts over, the same as the rest of the prototype.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import {
  formatAnswers,
  rewriteSopPart,
  routeToTask,
  STELLA_HISTORY,
  STELLA_NEW_TITLE,
  STELLA_NO_ROUTE,
  STELLA_THINKING_BEATS,
  STELLA_THINKING_TRIGGER,
  taskById,
  withEdits,
  type SopDraft,
  type SopEdits,
  type SopRef,
  type StellaAnswers,
  type StellaEntry,
  type StellaTask,
} from "../data/stellaScript";
import { WORK_GROUPS, workGroupById, workGroupTitle, type WorkGroup, type WorkItem } from "../data/myWork";
import { useMessages, type MessageSeverity } from "./MessagesContext";
import { severityRank, topSeverity } from "../components/messages/severity";

export type SessionStatus = "active" | "waiting" | "done" | "idle";

export interface StellaSession {
  id: string;
  title: string;
  status: SessionStatus;
  when: string;
  // Null until the first message routes the session to a task.
  taskId: string | null;
  // How far through that task's turns the session is.
  turn: number;
  // What the user has picked on question cards so far, by question key.
  answers: StellaAnswers;
  // Paragraphs of its SOPs rewritten with Modify.
  edits: SopEdits;
  // What the task is scoped to. Picked in the composer; a task that names its
  // own brand sets it when the session routes.
  brandId: string | null;
  // Set on a conversation opened from My Work: the group it came from, and,
  // for a conversation about one of the group's messages, that message. Such
  // a session never routes to a task: Stella answers for the group.
  groupId: string | null;
  itemId: string | null;
  pinned: boolean;
  // Stella has written in it since you last opened it. Cleared by select.
  unread: boolean;
  // In a group's conversation: when Stella last wrote with no reply from you
  // since. Null while the last word is yours, or outside a group
  // conversation. What the reminder on the home counts from.
  awaitingSince: number | null;
  entries: StellaEntry[];
  // True while beats are still landing, which disables the composer.
  busy: boolean;
  live: boolean;
}

// Where one My Work message stands, beyond what Messages says about it.
export interface WorkItemState {
  // The response picked on its card, by index, once one is.
  acted: number | null;
  // True while Stella acts on the pick.
  busy: boolean;
  // A refresh in flight.
  checking: boolean;
  // What the last refresh found.
  checked: "open" | "cleared" | null;
  // Put aside from its menu, with why.
  dismissed: DismissReason | null;
}

// Why a message was put aside without acting on it.
export type DismissReason = "elsewhere" | "invalid";
export const DISMISS_REASONS: Record<DismissReason, string> = {
  elsewhere: "Resolved elsewhere",
  invalid: "Not valid",
};

// A message that needs nothing more from you: answered (and Stella is done
// acting on it), dismissed, or cleared by itself. What a card files under
// Resolved.
export function isSettled(s: WorkItemState) {
  return (s.acted !== null && !s.busy) || s.dismissed !== null || s.checked === "cleared";
}

// How long Stella's last message in a group conversation can sit unanswered
// before the home reminds you of it.
export const REMINDER_AFTER_MS = 6 * 60 * 60 * 1000;

// A group conversation Stella has been waiting in for longer than that.
export interface StellaReminder {
  session: StellaSession;
  group: WorkGroup;
  // When Stella wrote the message still waiting on a reply.
  since: number;
}

// The conversation seeded as already waiting, so the reminder can be seen
// without sitting through six hours: its group, and what was said.
const SEED_WAITING = {
  groupId: "wg-figs-events",
  hoursAgo: 7,
  user: "Can you draft the ask to FIGS for the Ojai tracking number?",
  agent: "Drafted. One thing before I send it: should it go to the FIGS ops inbox, or straight to the event lead?",
};

const IDLE_ITEM: WorkItemState = { acted: null, busy: false, checking: false, checked: null, dismissed: null };

// How Stella opens a message's conversation when you want to tell the
// automation behind it what it got wrong.
const FEEDBACK_PROMPT =
  "What should this have done differently? Tell me what was off — the trigger, the timing, who it went to — and I'll pass it to the automation that raised it.";

// What Stella says to typed input in one message's conversation.
const ITEM_TYPED_REPLY =
  "Noted. Pick a response on the card above and I'll act on it, or tell me what you'd rather do and I'll draft it for you to check.";

interface StellaContextValue {
  sessions: StellaSession[];
  activeId: string;
  active: StellaSession;
  activeTask: StellaTask | undefined;
  select: (id: string) => void;
  newChat: () => string;
  // `brandId` overrides the session's scope for this message, for a URL
  // handoff that carries its own brand. `sessionId`
  // sends into a session other than the open one. `sopRef` is the part of a
  // SOP the message asks to change.
  send: (text: string, brandId?: string | null, sessionId?: string, sopRef?: SopRef) => void;
  setBrand: (brandId: string | null) => void;
  // Send the picks on a questions card, by the card's id. The card keeps them
  // as its record and they go out as the user's next message.
  answer: (entryId: string, picks: Record<string, number>) => void;
  // The progress rail: which steps are done, which is in flight.
  progress: { label: string; detail: string; state: "done" | "active" | "todo" }[];
  // The SOPs the active task is writing, as they stand now. Empty for a task
  // that doesn't write any.
  drafts: SopDraft[];
  // A SOP any chat has drafted, by id, with the session that drafted it.
  // Undefined once a reload has cleared the chats.
  draftById: (id: string) => { draft: SopDraft; sessionId: string } | undefined;
  // What the composer offers next: the task's expected reply once routed, or
  // nothing while the session is still untasked (the task chips serve there).
  suggestion: string | null;

  // ---- My Work ----
  // Most severe first (by groupSeverity); groups of the same severity keep
  // the order they were put together in. The sidebar, the home and the
  // digest all list them this way.
  groups: WorkGroup[];
  // A group's severity: that of its most serious message, answered or not,
  // so a card keeps its place and colour while you work through it.
  groupSeverity: (group: WorkGroup) => MessageSeverity | undefined;
  // The items of a group still on the home: open in Messages, or acted on or
  // checked here (those stay, with their result, as the record).
  openItems: (group: WorkGroup) => WorkItem[];
  itemState: (messageId: string) => WorkItemState;
  // Every message on the group's card has been answered: acted on (and
  // Stella is done acting), dismissed, or cleared itself.
  groupSettled: (group: WorkGroup) => boolean;
  // Groups moved out of My Work into Resolved, most recent first.
  resolvedGroups: WorkGroup[];
  // Still in My Work: has messages on its card and hasn't been moved to
  // Resolved. What the home, the sidebar and the digest list.
  inMyWork: (group: WorkGroup) => boolean;
  // Move a settled group out of My Work into Resolved.
  resolveGroup: (groupId: string) => void;
  // Group conversations Stella has waited in for six hours or more, for the
  // alert above the groups on the home.
  reminders: StellaReminder[];
  dismissReminder: (sessionId: string) => void;
  // The group's own conversation, once it has one: a message has been sent
  // in it. The group merely opened to see all of its messages doesn't count,
  // nor does a conversation about one of its messages: the group stays in
  // My Work.
  groupSession: (groupId: string) => StellaSession | undefined;
  // Open a conversation and switch to it: the group's, with all of its open
  // messages, or, given a message, that message's own, titled for it.
  openGroup: (groupId: string, messageId?: string) => void;
  // Write into the group's conversation from its chat on the home, opening
  // it if it has none, and switch to it.
  sendToGroup: (groupId: string, text: string) => void;
  // Pick one of a message's responses. Stella acts on it and settles the
  // message in Messages; the result shows on its row. No conversation is
  // started: that takes writing in a chat.
  actOn: (groupId: string, messageId: string, option: number) => void;
  // In a summarised group's conversation: give every message still open
  // its shared response. The press goes into the transcript as your message
  // in place of the button, then Stella works and reports.
  actOnAll: (groupId: string) => void;
  // Take back a response picked on a card: the message is open again, here
  // and in Messages, and a group filed under Resolved returns to My Work.
  undoItem: (groupId: string, messageId: string) => void;
  // Check whether the message's condition still holds.
  refresh: (groupId: string, messageId: string) => void;
  // Put a message aside without acting on it. It stays on its card, struck
  // through with the reason, and settles in Messages.
  dismissItem: (groupId: string, messageId: string, reason: DismissReason) => void;
  // Open the message's conversation with Stella asking what the automation
  // that raised it should have done differently.
  feedbackOn: (groupId: string, messageId: string) => void;
  // Go back to the home with a group in view. The home scrolls to
  // `homeTarget` once it is showing and then clears it.
  goHome: (groupId: string) => void;
  homeTarget: string | null;
  clearHomeTarget: () => void;
}

const StellaContext = createContext<StellaContextValue | null>(null);

// Ids carry the time as well as a counter, so a hot reload (which resets
// the counter but keeps the sessions) can't hand out an id twice.
let seq = 0;
function freshSession(): StellaSession {
  seq += 1;
  return {
    id: `ses-live-${Date.now().toString(36)}-${seq}`,
    title: STELLA_NEW_TITLE,
    status: "active",
    when: "Now",
    taskId: null,
    turn: 0,
    answers: {},
    edits: {},
    brandId: null,
    groupId: null,
    itemId: null,
    pinned: false,
    unread: false,
    awaitingSince: null,
    // Empty: the page draws the home until the first message.
    entries: [],
    busy: false,
    live: true,
  };
}

// A chat nobody has typed in yet. It isn't listed, and New Chat reuses it
// rather than stacking up blanks.
export function isBlank(s: StellaSession) {
  return s.live && !s.groupId && s.entries.length === 0;
}

// A group conversation from earlier today that Stella is still waiting in.
function seedWaitingSession(): StellaSession[] {
  const group = workGroupById(SEED_WAITING.groupId);
  if (!group) return [];
  return [
    {
      ...freshSession(),
      id: "ses-figs-readiness",
      title: workGroupTitle(group),
      status: "waiting",
      when: `${SEED_WAITING.hoursAgo}h ago`,
      brandId: group.brandId,
      groupId: group.id,
      awaitingSince: Date.now() - SEED_WAITING.hoursAgo * 60 * 60 * 1000,
      entries: [
        { kind: "work", groupId: group.id, messageIds: group.items.map((i) => i.messageId) },
        { kind: "user", text: SEED_WAITING.user, brandId: group.brandId },
        { kind: "agent", text: SEED_WAITING.agent },
      ],
    },
  ];
}

// A group opened in the conversation view with nothing typed in it yet: a
// way to see all of its messages, not a conversation. It isn't listed, and
// the group keeps its card, until the first message is sent.
export function isViewOnly(s: StellaSession) {
  return !!s.groupId && !s.itemId && !s.entries.some((e) => e.kind === "user");
}

export function StellaProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<StellaSession[]>(() => [
    freshSession(),
    ...STELLA_HISTORY.map<StellaSession>((h) => ({
      ...h,
      taskId: null,
      turn: 0,
      answers: {},
      edits: {},
      groupId: null,
      itemId: null,
      pinned: h.pinned ?? false,
      unread: h.unread ?? false,
      awaitingSince: null,
      entries: [],
      busy: false,
      live: false,
    })),
  ].concat(seedWaitingSession()));
  const [activeId, setActiveId] = useState(() => sessions[0].id);
  const [items, setItems] = useState<Record<string, WorkItemState>>({});
  const [homeTarget, setHomeTarget] = useState<string | null>(null);
  // Ids of groups moved to Resolved, most recent first.
  const [resolvedIds, setResolvedIds] = useState<string[]>([]);
  // Conversations whose reminder was put away; a reply brings it back in play.
  const [dismissedReminders, setDismissedReminders] = useState<string[]>([]);
  // The time reminders are measured against, refreshed each minute.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(tick);
  }, []);
  const { pathname } = useLocation();
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const { getMessage, resolve: resolveMessage, unresolve: unresolveMessage, decide } = useMessages();

  const patch = useCallback((id: string, fn: (s: StellaSession) => StellaSession) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? fn(s) : s)));
  }, []);

  // Opening a conversation reads whatever Stella wrote in it.
  const select = useCallback(
    (id: string) => {
      setActiveId(id);
      patch(id, (s) => (s.unread ? { ...s, unread: false } : s));
    },
    [patch],
  );

  const append = useCallback(
    (id: string, entry: StellaEntry) => patch(id, (s) => ({ ...s, entries: [...s.entries, entry] })),
    [patch],
  );

  const patchItem = useCallback((messageId: string, fn: (s: WorkItemState) => WorkItemState) => {
    setItems((prev) => ({ ...prev, [messageId]: fn(prev[messageId] ?? IDLE_ITEM) }));
  }, []);

  const setBrand = useCallback(
    (brandId: string | null) => patch(activeId, (s) => ({ ...s, brandId })),
    [activeId, patch],
  );

  // Sends `text` into `session` as it stands, which a caller may have just
  // changed (the answers on a card) ahead of React catching up.
  const dispatch = useCallback(
    (session: StellaSession | undefined, text: string, brandOverride?: string | null, sopRef?: SopRef) => {
      if (!session || session.busy || !session.live) return;
      const target = session.id;
      const trimmed = text.trim();
      if (!trimmed) return;

      const brandId = brandOverride !== undefined ? brandOverride : session.brandId;
      if (brandOverride !== undefined) patch(target, (s) => ({ ...s, brandId: brandOverride }));
      append(target, { kind: "user", text: trimmed, brandId, ...(sopRef && { sopRef }) });

      // A change asked of one part of a SOP sits outside the script: Stella
      // makes it in that part if she can, and the task stays on the turn it
      // was on.
      if (sopRef) {
        const base = taskById(session.taskId)
          ?.drafts?.(session.turn, session.answers)
          .find((d) => d.id === sopRef.draftId);
        const { edits, reply } = rewriteSopPart(trimmed, base && withEdits(base, session.edits), sopRef);
        const statusId = `st-${Date.now()}-modify`;
        patch(target, (s) => ({ ...s, busy: true }));
        timers.current.push(
          setTimeout(
            () =>
              append(target, {
                kind: "status",
                id: statusId,
                label: `Reworking ${sopRef.label.toLowerCase()}`,
                startedAt: Date.now(),
                endedAt: null,
              }),
            300,
          ),
          setTimeout(() => {
            patch(target, (s) => ({
              ...s,
              busy: false,
              edits: { ...s.edits, ...edits },
              entries: [
                ...s.entries.map((e) => (e.kind === "status" && e.id === statusId ? { ...e, endedAt: Date.now() } : e)),
                { kind: "agent", text: reply },
              ],
            }));
          }, 2100),
        );
        return;
      }

      // A conversation from My Work never routes: Stella answers for the
      // group, and its messages are settled from their cards.
      const group = workGroupById(session.groupId);
      if (group) {
        const text = session.itemId ? ITEM_TYPED_REPLY : group.typedReply;
        // In the group's own conversation the last word decides who is
        // waiting: yours clears it, Stella's starts the clock again.
        const ofGroup = !session.itemId;
        if (ofGroup) {
          patch(target, (s) => ({ ...s, status: "active", awaitingSince: null }));
          setDismissedReminders((prev) => prev.filter((id) => id !== target));
        }
        timers.current.push(
          setTimeout(() => {
            append(target, { kind: "agent", text });
            if (ofGroup) patch(target, (s) => ({ ...s, status: "waiting", awaitingSince: Date.now() }));
          }, 700),
        );
        return;
      }

      // Until it routes, a session is named for what was asked.
      if (session.title === STELLA_NEW_TITLE) patch(target, (s) => ({ ...s, title: trimmed }));

      // Test message: hold the loader up for a long stretch, then reply. It
      // sits outside the tasks, so it never routes or moves a turn on.
      if (STELLA_THINKING_TRIGGER.test(trimmed)) {
        const { label, holds, reply } = STELLA_THINKING_BEATS;
        const statusId = `st-${Date.now()}-thinking`;
        patch(target, (s) => ({ ...s, busy: true }));
        timers.current.push(
          setTimeout(
            () => append(target, { kind: "status", id: statusId, label, startedAt: Date.now(), endedAt: null }),
            300,
          ),
          setTimeout(() => {
            patch(target, (s) => ({
              ...s,
              busy: false,
              entries: [
                ...s.entries.map((e) => (e.kind === "status" && e.id === statusId ? { ...e, endedAt: Date.now() } : e)),
                { kind: "agent", text: reply },
              ],
            }));
          }, 300 + holds),
        );
        return;
      }

      // An untasked session routes on its first message. The same message then
      // feeds the task's opening turn, so the chips work in one press.
      let task = taskById(session.taskId);
      let turnIndex = session.turn;
      if (!task) {
        const routed = routeToTask(trimmed);
        if (!routed) {
          timers.current.push(setTimeout(() => append(target, { kind: "agent", text: STELLA_NO_ROUTE }), 700));
          return;
        }
        task = routed;
        turnIndex = 0;
        patch(target, (s) => ({
          ...s,
          taskId: routed.id,
          title: routed.title,
          // A task that belongs to a brand sets it, unless the user already
          // picked one in the composer — their choice wins.
          brandId: brandId ?? routed.brandId,
        }));
      }

      const turn = task.turns[turnIndex];
      // Past the end of the script: Stella says so rather than inventing more.
      if (!turn) {
        timers.current.push(
          setTimeout(
            () =>
              append(target, {
                kind: "agent",
                text: "This task is finished. Start a new chat for the next one, or open the Automation from the card above.",
              }),
            600,
          ),
        );
        return;
      }

      // Input that doesn't move the task on leaves it exactly where it was.
      if (turn.match && !turn.match.test(trimmed)) {
        timers.current.push(setTimeout(() => append(target, { kind: "agent", text: turn.nudge ?? "" }), 700));
        return;
      }

      patch(target, (s) => ({ ...s, busy: true }));

      const beats = typeof turn.beats === "function" ? turn.beats(session.answers) : turn.beats;
      for (const beat of beats) {
        if ("status" in beat) {
          const statusId = `st-${Date.now()}-${beat.after}`;
          timers.current.push(
            setTimeout(
              () => append(target, { kind: "status", id: statusId, label: beat.status, startedAt: Date.now(), endedAt: null }),
              beat.after,
            ),
          );
          timers.current.push(
            setTimeout(
              () =>
                patch(target, (s) => ({
                  ...s,
                  entries: s.entries.map((e) => (e.kind === "status" && e.id === statusId ? { ...e, endedAt: Date.now() } : e)),
                })),
              beat.after + beat.holds,
            ),
          );
        } else {
          timers.current.push(setTimeout(() => append(target, beat.entry), beat.after));
        }
      }

      const last = beats.reduce((m, b) => Math.max(m, "status" in b ? b.after + b.holds : b.after), 0);
      const total = task.turns.length;
      timers.current.push(
        setTimeout(() => {
          patch(target, (s) => {
            const next = turnIndex + 1;
            return { ...s, busy: false, turn: next, status: next >= total ? "done" : "active" };
          });
        }, last + 200),
      );
    },
    [append, patch],
  );

  const send = useCallback(
    (text: string, brandOverride?: string | null, sessionId?: string, sopRef?: SopRef) =>
      dispatch(
        sessions.find((s) => s.id === (sessionId ?? activeId)),
        text,
        brandOverride,
        sopRef,
      ),
    [activeId, sessions, dispatch],
  );

  const answer = useCallback(
    (entryId: string, picks: Record<string, number>) => {
      const session = sessions.find((s) => s.id === activeId);
      const entry = session?.entries.find((e) => e.kind === "questions" && e.id === entryId);
      if (!session || session.busy || entry?.kind !== "questions" || entry.picks) return;
      const answers = { ...session.answers };
      for (const q of entry.questions) answers[q.key] = q.options[picks[q.key]]?.value ?? "";
      const entries = session.entries.map((e) => (e === entry ? { ...entry, picks } : e));
      patch(session.id, (s) => ({ ...s, answers, entries }));
      dispatch({ ...session, answers, entries }, formatAnswers(entry, picks));
    },
    [activeId, sessions, patch, dispatch],
  );

  const newChat = useCallback(() => {
    const blank = sessions.find(isBlank);
    if (blank) {
      setActiveId(blank.id);
      return blank.id;
    }
    const session = freshSession();
    setSessions((prev) => [session, ...prev]);
    setActiveId(session.id);
    return session.id;
  }, [sessions]);

  // ---------------------------------------------------------------------------
  // My Work
  // ---------------------------------------------------------------------------

  const itemState = useCallback((messageId: string) => items[messageId] ?? IDLE_ITEM, [items]);

  const openItems = useCallback(
    (group: WorkGroup) =>
      group.items.filter((i) => {
        const state = items[i.messageId];
        if (state && (state.acted !== null || state.checked === "cleared" || state.dismissed)) return true;
        // Open: waiting on you, or not yet settled (an FYI stays until read
        // into the ground in Messages).
        const status = getMessage(i.messageId)?.status;
        return status === "needs_input" || status === "unread" || status === "read";
      }),
    [items, getMessage],
  );

  const groupSeverity = useCallback(
    (group: WorkGroup) => topSeverity(group.items.map((i) => getMessage(i.messageId)?.severity)),
    [getMessage],
  );

  const groups = useMemo(
    () =>
      WORK_GROUPS.map((g, i) => ({ g, i, rank: severityRank(groupSeverity(g)) }))
        .sort((a, b) => a.rank - b.rank || a.i - b.i)
        .map(({ g }) => g),
    [groupSeverity],
  );

  const groupSettled = useCallback(
    (group: WorkGroup) => {
      const shown = openItems(group);
      return (
        shown.length > 0 &&
        shown.every((i) => {
          const s = items[i.messageId];
          return !!s && isSettled(s);
        })
      );
    },
    [openItems, items],
  );

  const inMyWork = useCallback(
    (group: WorkGroup) => !resolvedIds.includes(group.id) && openItems(group).length > 0,
    [resolvedIds, openItems],
  );

  const resolvedGroups = useMemo(
    () => resolvedIds.map((id) => workGroupById(id)).filter((g): g is WorkGroup => !!g),
    [resolvedIds],
  );

  const resolveGroup = useCallback(
    (groupId: string) => {
      const group = workGroupById(groupId);
      if (!group || !groupSettled(group)) return;
      setResolvedIds((prev) => (prev.includes(groupId) ? prev : [groupId, ...prev]));
    },
    [groupSettled],
  );

  // Leaving the Stella home files every fully answered group under Resolved:
  // going to another page, or opening a conversation in place of the home. A
  // group Stella is still acting on waits for the next time.
  const showing = sessions.find((s) => s.id === activeId) ?? sessions[0];
  const onHome = /^\/internal-ops\/?$/.test(pathname) && isBlank(showing);
  const wasOnHome = useRef(onHome);
  const settledNow = useRef<string[]>([]);
  settledNow.current = WORK_GROUPS.filter(groupSettled).map((g) => g.id);
  useEffect(() => {
    if (wasOnHome.current && !onHome) {
      const done = settledNow.current;
      setResolvedIds((prev) => {
        const fresh = done.filter((id) => !prev.includes(id));
        return fresh.length > 0 ? [...fresh, ...prev] : prev;
      });
    }
    wasOnHome.current = onHome;
  }, [onHome]);

  // Group conversations where Stella's last message has waited too long.
  const reminders = useMemo<StellaReminder[]>(
    () =>
      sessions.flatMap((session) => {
        const group = workGroupById(session.groupId);
        if (!group || session.itemId || session.awaitingSince === null) return [];
        if (now - session.awaitingSince < REMINDER_AFTER_MS) return [];
        if (dismissedReminders.includes(session.id) || resolvedIds.includes(group.id)) return [];
        return [{ session, group, since: session.awaitingSince }];
      }),
    [sessions, now, dismissedReminders, resolvedIds],
  );

  const dismissReminder = useCallback(
    (sessionId: string) => setDismissedReminders((prev) => (prev.includes(sessionId) ? prev : [...prev, sessionId])),
    [],
  );

  const groupSession = useCallback(
    (groupId: string) => sessions.find((s) => s.groupId === groupId && !s.itemId && !isViewOnly(s)),
    [sessions],
  );

  // The group's conversation with `messageIds` brought into it, created if
  // it has none. Messages already in it aren't brought in twice. Returns the
  // session as it will stand, for a caller that sends into it in the same
  // tick.
  const ensureGroupSession = useCallback(
    (group: WorkGroup, messageIds: string[]): StellaSession => {
      const existing = sessions.find((s) => s.groupId === group.id && !s.itemId);
      if (existing) {
        const shown = new Set(existing.entries.flatMap((e) => (e.kind === "work" ? e.messageIds : [])));
        const fresh = messageIds.filter((id) => !shown.has(id));
        if (fresh.length === 0) return existing;
        const entry: StellaEntry = { kind: "work", groupId: group.id, messageIds: fresh };
        const next = { ...existing, entries: [...existing.entries, entry] };
        patch(existing.id, () => next);
        return next;
      }
      // A group Stella has summarised opens with that summary as her
      // message under the card, since the card there shows only the first
      // of its messages, and under it the one response for all of them.
      const session: StellaSession = {
        ...freshSession(),
        title: workGroupTitle(group),
        brandId: group.brandId,
        groupId: group.id,
        entries: [
          { kind: "work", groupId: group.id, messageIds },
          ...(group.summary
            ? [
                { kind: "agent" as const, text: group.summary.text },
                { kind: "workAll" as const, groupId: group.id },
              ]
            : []),
        ],
      };
      setSessions((prev) => [session, ...prev]);
      return session;
    },
    [sessions, patch],
  );

  // One message's own conversation, titled for it, created if it has none.
  // The group it came from stays in My Work.
  const ensureItemSession = useCallback(
    (group: WorkGroup, item: WorkItem): StellaSession => {
      const existing = sessions.find((s) => s.itemId === item.messageId);
      if (existing) return existing;
      const session: StellaSession = {
        ...freshSession(),
        title: item.title,
        brandId: group.brandId,
        groupId: group.id,
        itemId: item.messageId,
        entries: [{ kind: "work", groupId: group.id, messageIds: [item.messageId] }],
      };
      setSessions((prev) => [session, ...prev]);
      return session;
    },
    [sessions],
  );

  const openGroup = useCallback(
    (groupId: string, messageId?: string) => {
      const group = workGroupById(groupId);
      if (!group) return;
      const item = messageId ? group.items.find((i) => i.messageId === messageId) : undefined;
      const session = item
        ? ensureItemSession(group, item)
        : ensureGroupSession(group, openItems(group).map((i) => i.messageId));
      setActiveId(session.id);
    },
    [ensureGroupSession, ensureItemSession, openItems],
  );

  const sendToGroup = useCallback(
    (groupId: string, text: string) => {
      const group = workGroupById(groupId);
      if (!group || !text.trim()) return;
      const session = ensureGroupSession(group, openItems(group).map((i) => i.messageId));
      setActiveId(session.id);
      dispatch(session, text);
    },
    [ensureGroupSession, openItems, dispatch],
  );

  const actOn = useCallback(
    (groupId: string, messageId: string, option: number) => {
      const group = workGroupById(groupId);
      const item = group?.items.find((i) => i.messageId === messageId);
      const action = item?.actions[option];
      const state = items[messageId] ?? IDLE_ITEM;
      if (!group || !item || !action || state.acted !== null || state.busy) return;

      // Responding is not a conversation: nothing is added to the list. The
      // result shows on the message's row. Only a conversation already open
      // about this message gets the exchange written into it.
      const id = sessions.find((s) => s.itemId === messageId)?.id;
      patchItem(messageId, (s) => ({ ...s, acted: option, busy: true }));
      if (id) append(id, { kind: "user", text: action.description, brandId: group.brandId });

      const statusId = `st-${Date.now()}-act`;
      timers.current.push(
        setTimeout(() => {
          if (id) append(id, { kind: "status", id: statusId, label: action.status, startedAt: Date.now(), endedAt: null });
        }, 400),
        setTimeout(() => {
          if (id) {
            patch(id, (s) => ({
              ...s,
              entries: [
                ...s.entries.map((e) => (e.kind === "status" && e.id === statusId ? { ...e, endedAt: Date.now() } : e)),
                { kind: "agent", text: action.reply },
              ],
            }));
          }
          patchItem(messageId, (s) => ({ ...s, busy: false }));
          // Settle the message it came from.
          if (action.decision && messageId.startsWith("note:")) decide(messageId.slice(5), action.decision, "");
          else resolveMessage(messageId, action.label);
        }, 2200),
      );
    },
    [items, sessions, patchItem, append, patch, decide, resolveMessage],
  );

  const undoItem = useCallback(
    (groupId: string, messageId: string) => {
      const state = items[messageId] ?? IDLE_ITEM;
      if (state.acted === null || state.busy) return;
      patchItem(messageId, () => IDLE_ITEM);
      unresolveMessage(messageId);
      setResolvedIds((prev) => (prev.includes(groupId) ? prev.filter((id) => id !== groupId) : prev));
    },
    [items, patchItem, unresolveMessage],
  );

  const actOnAll = useCallback(
    (groupId: string) => {
      const group = workGroupById(groupId);
      const session = sessions.find((s) => s.groupId === groupId && !s.itemId);
      const response = group?.items[0]?.actions[0];
      if (!group?.summary || !session || !response || session.busy) return;
      const left = group.items.filter((i) => {
        const s = items[i.messageId] ?? IDLE_ITEM;
        return s.acted === null && !isSettled(s);
      });
      if (left.length === 0) return;

      const { acting, done } = group.summary;
      const text = `${response.label} ${left.length === group.items.length ? `all ${left.length}` : `the other ${left.length}`}`;
      const id = session.id;
      // The button gives way to what it said, as your message.
      patch(id, (s) => ({
        ...s,
        busy: true,
        status: "active",
        entries: [...s.entries.filter((e) => e.kind !== "workAll"), { kind: "user", text, brandId: group.brandId }],
      }));
      left.forEach((i) => actOn(groupId, i.messageId, 0));

      const statusId = `st-${Date.now()}-all`;
      timers.current.push(
        setTimeout(() => append(id, { kind: "status", id: statusId, label: acting, startedAt: Date.now(), endedAt: null }), 400),
        setTimeout(() => {
          patch(id, (s) => ({
            ...s,
            busy: false,
            entries: [
              ...s.entries.map((e) => (e.kind === "status" && e.id === statusId ? { ...e, endedAt: Date.now() } : e)),
              { kind: "agent", text: done },
            ],
          }));
        }, 2300),
      );
    },
    [sessions, items, patch, append, actOn],
  );

  const refresh = useCallback(
    (groupId: string, messageId: string) => {
      const item = workGroupById(groupId)?.items.find((i) => i.messageId === messageId);
      const state = items[messageId] ?? IDLE_ITEM;
      if (!item || state.checking || state.acted !== null || state.checked === "cleared") return;
      patchItem(messageId, (s) => ({ ...s, checking: true, checked: null }));
      timers.current.push(
        setTimeout(() => {
          patchItem(messageId, (s) => ({ ...s, checking: false, checked: item.refresh.outcome }));
          if (item.refresh.outcome === "cleared") resolveMessage(messageId, item.refresh.note);
        }, 1300),
      );
    },
    [items, patchItem, resolveMessage],
  );

  const dismissItem = useCallback(
    (groupId: string, messageId: string, reason: DismissReason) => {
      const item = workGroupById(groupId)?.items.find((i) => i.messageId === messageId);
      const state = items[messageId] ?? IDLE_ITEM;
      if (!item || state.busy || state.acted !== null || state.checked === "cleared" || state.dismissed) return;
      patchItem(messageId, (s) => ({ ...s, dismissed: reason }));
      resolveMessage(messageId, `Dismissed: ${DISMISS_REASONS[reason].toLowerCase()}`);
    },
    [items, patchItem, resolveMessage],
  );

  const feedbackOn = useCallback(
    (groupId: string, messageId: string) => {
      const group = workGroupById(groupId);
      const item = group?.items.find((i) => i.messageId === messageId);
      if (!group || !item) return;
      const session = ensureItemSession(group, item);
      setActiveId(session.id);
      // Asked once per conversation.
      if (!session.entries.some((e) => e.kind === "agent" && e.text === FEEDBACK_PROMPT)) {
        append(session.id, { kind: "agent", text: FEEDBACK_PROMPT });
      }
    },
    [ensureItemSession, append],
  );

  const goHome = useCallback(
    (groupId: string) => {
      newChat();
      setHomeTarget(groupId);
    },
    [newChat],
  );
  const clearHomeTarget = useCallback(() => setHomeTarget(null), []);

  const active = sessions.find((s) => s.id === activeId) ?? sessions[0];
  const activeTask = taskById(active.taskId);

  const progress = useMemo(() => {
    // Before a task is picked there is nothing to walk through, so the rail
    // shows what routing will decide rather than a fake set of steps.
    if (!activeTask) return [];
    return activeTask.progress.map((step, i) => ({
      ...step,
      state: !active.live
        ? ("todo" as const)
        : i < active.turn
          ? ("done" as const)
          : i === active.turn
            ? ("active" as const)
            : ("todo" as const),
    }));
  }, [activeTask, active]);

  const drafts = useMemo(
    () =>
      active.live && activeTask?.drafts
        ? activeTask.drafts(active.turn, active.answers).map((d) => withEdits(d, active.edits))
        : [],
    [active.live, active.turn, active.answers, active.edits, activeTask],
  );

  const suggestion = active.live && activeTask ? (activeTask.turns[active.turn]?.suggestion ?? null) : null;

  const value = useMemo(
    () => ({
      sessions,
      activeId,
      active,
      activeTask,
      select,
      newChat,
      send,
      setBrand,
      answer,
      progress,
      drafts,
      draftById: (id: string) => {
        for (const s of sessions) {
          const task = taskById(s.taskId);
          const draft = s.live && task?.drafts ? task.drafts(s.turn, s.answers).find((d) => d.id === id) : undefined;
          if (draft) return { draft: withEdits(draft, s.edits), sessionId: s.id };
        }
        return undefined;
      },
      suggestion,
      groups,
      groupSeverity,
      openItems,
      itemState,
      groupSettled,
      resolvedGroups,
      inMyWork,
      resolveGroup,
      reminders,
      dismissReminder,
      groupSession,
      openGroup,
      sendToGroup,
      actOn,
      undoItem,
      actOnAll,
      refresh,
      dismissItem,
      feedbackOn,
      goHome,
      homeTarget,
      clearHomeTarget,
    }),
    [sessions, activeId, active, activeTask, select, newChat, send, setBrand, answer, progress, drafts, suggestion, groups, groupSeverity, openItems, itemState, groupSettled, resolvedGroups, inMyWork, resolveGroup, reminders, dismissReminder, groupSession, openGroup, sendToGroup, actOn, undoItem, actOnAll, refresh, dismissItem, feedbackOn, goHome, homeTarget, clearHomeTarget],
  );

  return <StellaContext.Provider value={value}>{children}</StellaContext.Provider>;
}

export function useStella() {
  const ctx = useContext(StellaContext);
  if (!ctx) throw new Error("useStella must be used within a StellaProvider");
  return ctx;
}
