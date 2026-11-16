// The unified message store behind the Messages page.
//
// Messages come from four places and are read as one list:
//   • alerts — raised when an Alert SOP's prompt matches the ops data
//     (AlertsContext owns their state: active, dismissed, resolved);
//   • SOPs — a run that stopped short, escalated or is waiting on approval
//     leaves a message for the SOP's owner;
//   • people — the brand and network-operator threads Internal Ops is in;
//   • notes — goal check-ins, project flags, task completion audits and
//     notes from coworkers.
// Each message has one of seven types, the business object it is about,
// which picks its badge in the list. Who wrote it (Stella, a coworker, a
// brand) is not a type: alerts and SOP-run messages are typed SOP, since an
// SOP raised them, and a note Stella wrote about a project is a project note.
//
// Alert state stays in AlertsContext. This context holds what is new to the
// unified surface: which threads have been read, which SOP messages and
// threads were archived or resolved, replies typed into a thread, decisions
// taken on a note, and saved filters.

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  brands,
  getBrand,
  getNetworkOperator,
  getSop,
  getTask,
  getWorkOrder,
  messageThreads,
  nodeRunsForRun,
  sopRuns,
} from "../../../data";
import { MOCK_NOW_ISO } from "../../../lib/format";
import type { AlertSeverity, Message } from "../../../types/domain";
import { inboxNotes, type RaisedEntry } from "../data/inboxNotes";
import { STELLA_INCOMING } from "../data/stellaScript";
import { CURRENT_USER_NAME, useAlerts } from "./AlertsContext";

export type MessageKind = "alert" | "sop" | "thread" | "note";
export type MessageType = "sop" | "goal" | "project" | "audit" | "coworker" | "no" | "brand";
// "snoozed" is snoozed until fixed: the SOP keeps checking, and the message
// comes back as Action Required if the condition is still there once it has
// changed. Until then it stays out of the way.
export type MessageStatus = "needs_input" | "unread" | "read" | "resolved" | "archived" | "snoozed";
// Alerts' four, plus "normal" for anything nobody rated: threads, FYIs.
export type MessageSeverity = AlertSeverity | "normal";

export interface InboxMessage {
  // "<kind>:<id of the record it came from>", which is also the ?item= value.
  id: string;
  kind: MessageKind;
  refId: string;
  // What Stella is asking for ("Need decision for"), for messages still open.
  // Null for threads and anything already settled.
  ask: string | null;
  title: string;
  // Searchable text beyond the title.
  body: string;
  type: MessageType;
  status: MessageStatus;
  severity: MessageSeverity;
  // The auto-generated topic it was clustered into, if any (TOPICS).
  topic: string | null;
  // In your scope: sent to you, or about a brand or NO you look after.
  mine: boolean;
  at: string; // ISO
  brandId: string | null;
  networkOperatorId: string | null;
  projectId: string | null;
  workOrderId: string | null;
  ruleId: string | null;
  sopId: string | null;
  // Who it is waiting on: the rule's or SOP's owner.
  assignee: string | null;
  // Every time its SOP raised this same subject, oldest first (the latest is
  // this message). Empty when it has only been raised once.
  raised: RaisedEntry[];
}

export interface MessageFilters {
  // Whose messages: yours, or the whole team's. A scope, not a facet — the
  // facets list only what is in it.
  owner: "me" | "all";
  status: string[];
  type: string[];
  severity: string[];
  topic: string[];
  rule: string[];
  sop: string[];
  brand: string[];
  networkOperator: string[];
  project: string[];
  workOrder: string[];
  // An exact set of messages, from a link that names them (Stella's
  // Incoming). Not a facet: it narrows everything else and has no counts.
  ids: string[];
  q: string;
}

export type FacetKey = Exclude<keyof MessageFilters, "q" | "ids" | "owner">;

export const EMPTY_FILTERS: MessageFilters = {
  owner: "all",
  status: [],
  type: [],
  severity: [],
  topic: [],
  rule: [],
  sop: [],
  brand: [],
  networkOperator: [],
  project: [],
  workOrder: [],
  ids: [],
  q: "",
};

// Where the Messages page opens: your open messages that are critical or
// high. The Stella page counts this view for its link here.
export const DEFAULT_FILTERS: MessageFilters = {
  ...EMPTY_FILTERS,
  owner: "me",
  status: ["needs_input", "unread"],
  severity: ["critical", "high"],
};

export interface SavedFilter {
  id: string;
  name: string;
  filters: MessageFilters;
}

// The brands and network operators "you" look after in the prototype, beside
// CURRENT_USER_NAME. Messages about them are in the Owner: Me scope.
export const MY_BRAND_IDS = ["brand-chewy", "brand-promobile"];
export const MY_NO_IDS = ["no-golojix", "no-raincity"];

const SEED_SAVED: SavedFilter[] = [
  {
    id: "saved-chewy-open",
    name: "Chewy · action required",
    filters: { ...EMPTY_FILTERS, brand: ["brand-chewy"], status: ["needs_input"] },
  },
  {
    id: "saved-urgent",
    name: "Critical and high",
    filters: { ...EMPTY_FILTERS, severity: ["critical", "high"], status: ["needs_input"] },
  },
  {
    id: "saved-sops",
    name: "Raised by an Automation",
    filters: { ...EMPTY_FILTERS, type: ["sop"] },
  },
];

const SOP_ASK: Partial<Record<string, string>> = {
  failed: "Take action on",
  escalated: "Need review of",
  awaiting_approval: "Need approval on",
};

interface MessagesState {
  messages: InboxMessage[];
  getMessage: (id: string | null) => InboxMessage | undefined;
  markRead: (id: string) => void;
  // Archive accepts alerts too, and hands those to AlertsContext's dismiss.
  archive: (ids: string[]) => void;
  unarchive: (ids: string[]) => void;
  // Marks a message done, with why it was closed without taking the
  // suggested actions. Alerts go to AlertsContext's resolve.
  resolve: (id: string, reason: string) => void;
  resolutionFor: (id: string) => Resolution | undefined;
  // Takes back a resolve, and for a note its decision: the message is open
  // again, as it was before. Used by undo on a Stella response.
  unresolve: (id: string) => void;
  // Snoozes a message until its SOP finds the condition fixed, or wakes it.
  snooze: (id: string) => void;
  unsnooze: (id: string) => void;
  snoozeFor: (id: string) => Snooze | undefined;
  // A note's Approve or Decline, with the optional note typed beside it.
  decisionFor: (noteId: string) => Decision | undefined;
  decide: (noteId: string, choice: Decision["choice"], note: string) => void;
  repliesFor: (threadId: string) => Message[];
  reply: (threadId: string, body: string) => void;
  saved: SavedFilter[];
  saveFilter: (name: string, filters: MessageFilters) => void;
}

export interface Decision {
  choice: "approved" | "declined";
  note: string;
  by: string;
  at: string; // ISO
}

// Why a message was resolved, as typed in the Dismiss dialog. ("Dismiss" is
// the label; the state stays `resolved`, apart from `archived`.)
export interface Resolution {
  reason: string;
  by: string;
  at: string; // ISO
}

// A snooze until fixed: who set it and when.
export interface Snooze {
  by: string;
  at: string; // ISO
}

// A message before its topic and scope are worked out from the rest of it.
type Draft = Omit<InboxMessage, "topic" | "mine">;

const MessagesContext = createContext<MessagesState | null>(null);

let replySeq = 0;

export function MessagesProvider({ children }: { children: ReactNode }) {
  const { alerts, getRule, dismiss, undoDismiss, resolve: resolveAlert, reopen: reopenAlert } = useAlerts();
  const [read, setRead] = useState<Set<string>>(new Set());
  const [archived, setArchived] = useState<Set<string>>(new Set());
  const [resolved, setResolved] = useState<Set<string>>(new Set());
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [resolutions, setResolutions] = useState<Record<string, Resolution>>({});
  const [snoozes, setSnoozes] = useState<Record<string, Snooze>>({});
  const [replies, setReplies] = useState<Record<string, Message[]>>({});
  const [saved, setSaved] = useState<SavedFilter[]>(SEED_SAVED);

  const messages = useMemo<InboxMessage[]>(() => {
    const fromAlerts = alerts.map<Draft>((a) => {
      const rule = getRule(a.ruleId);
      const wo = getWorkOrder(a.entity.workOrderId);
      const status: MessageStatus =
        a.status === "dismissed"
          ? "archived"
          : a.status === "resolved"
            ? "resolved"
            : snoozes[`alert:${a.id}`]
              ? "snoozed"
              : "needs_input";
      return {
        id: `alert:${a.id}`,
        raised: [],
        kind: "alert",
        refId: a.id,
        ask: status === "needs_input" ? alertAsk(a.severity, a.id) : null,
        title: a.name,
        body: `${a.description} ${rule?.name ?? ""}`,
        type: "sop",
        status,
        severity: a.severity,
        at: a.createdAt,
        brandId: a.brandId,
        networkOperatorId: null,
        projectId: a.entity.projectId ?? wo?.projectId ?? null,
        workOrderId: a.entity.workOrderId ?? null,
        ruleId: a.ruleId,
        sopId: null,
        assignee: rule?.ownerName ?? null,
      };
    });

    // Only runs that need a person leave a message. A clean run is history,
    // and lives on the SOP's runs page.
    const fromSops = sopRuns
      .filter((r) => r.status === "failed" || r.status === "escalated" || r.status === "awaiting_approval")
      .map<Draft>((r) => {
        const sop = getSop(r.sopId);
        const issues = nodeRunsForRun(r.id).flatMap((n) => [...n.errors, ...n.issues]);
        const id = `sop:${r.id}`;
        // A Brick-wide SOP runs per brand; the run's label names the brand.
        const brandId = sop?.brandId ?? brands.find((b) => r.label.startsWith(b.name))?.id ?? null;
        const status: MessageStatus = archived.has(id)
          ? "archived"
          : resolved.has(id)
            ? "resolved"
            : snoozes[id]
              ? "snoozed"
              : "needs_input";
        return {
          id,
          kind: "sop",
          raised: [],
          refId: r.id,
          ask: status === "needs_input" ? (SOP_ASK[r.status] ?? null) : null,
          title: `${sop?.name ?? "Automation"} — ${r.label}`,
          body: issues.join(" "),
          type: "sop",
          status,
          severity: r.status === "failed" ? "high" : "medium",
          at: r.startedAt,
          brandId,
          networkOperatorId: null,
          projectId: null,
          workOrderId: null,
          ruleId: null,
          sopId: r.sopId,
          assignee: sop?.ownerName ?? null,
        };
      });

    const fromThreads = messageThreads.map<Draft>((t) => {
      const id = `thread:${t.id}`;
      const task = t.relatedTaskId ? getTask(t.relatedTaskId) : undefined;
      const wo = getWorkOrder(task?.workOrderId);
      const status: MessageStatus = archived.has(id)
        ? "archived"
        : resolved.has(id)
          ? "resolved"
          : t.unread && !read.has(id)
          ? "unread"
          : "read";
      const last = replies[t.id]?.at(-1)?.sentAt;
      return {
        id,
        kind: "thread",
        refId: t.id,
        raised: [],
        ask: null,
        title: t.subject,
        body: getNetworkOperator(t.networkOperatorId ?? undefined)?.name ?? "",
        type: t.participants.includes("brand") ? "brand" : "no",
        status,
        severity: "normal",
        at: last ?? t.lastMessageAt,
        brandId: t.brandId,
        networkOperatorId: t.networkOperatorId,
        projectId: wo?.projectId ?? null,
        workOrderId: wo?.id ?? null,
        ruleId: null,
        sopId: null,
        assignee: null,
      };
    });

    // A note that asks for something (or for a decision) waits on you until
    // it's resolved or dismissed; an FYI is unread until opened.
    const fromNotes = inboxNotes.map<Draft>((n) => {
      const id = `note:${n.id}`;
      const status: MessageStatus = archived.has(id)
        ? "archived"
        : resolved.has(id) || decisions[n.id]
          ? "resolved"
          : snoozes[id]
            ? "snoozed"
            : n.ask || n.decision
              ? "needs_input"
              : read.has(id)
                ? "read"
                : "unread";
      const last = replies[n.id]?.at(-1)?.sentAt;
      // Search reads the write-up too, with its links as plain words.
      const sections = (n.sections ?? []).map((x) => x.text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"));
      return {
        id,
        kind: "note",
        refId: n.id,
        raised: n.raised ?? [],
        ask: status === "needs_input" ? n.ask : null,
        title: n.title,
        body: [n.body, ...sections, n.from].join(" "),
        type: n.type,
        status,
        severity: n.severity,
        at: last ?? n.at,
        brandId: n.brandId,
        networkOperatorId: null,
        projectId: n.projectId,
        workOrderId: null,
        ruleId: null,
        sopId: n.sopId ?? null,
        assignee: n.forMe ? CURRENT_USER_NAME : null,
      };
    });

    return [...fromAlerts, ...fromSops, ...fromThreads, ...fromNotes].map((m) => ({
      ...m,
      topic: topicFor(m),
      mine:
        m.assignee === CURRENT_USER_NAME ||
        (m.brandId !== null && MY_BRAND_IDS.includes(m.brandId)) ||
        (m.networkOperatorId !== null && MY_NO_IDS.includes(m.networkOperatorId)),
    }));
  }, [alerts, getRule, archived, resolved, snoozes, decisions, read, replies]);

  const byId = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);

  const markRead = useCallback((id: string) => {
    setRead((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);

  const archive = useCallback(
    (ids: string[]) => {
      const alertIds = ids.filter((id) => id.startsWith("alert:")).map((id) => id.slice(6));
      if (alertIds.length) dismiss(alertIds);
      setArchived((prev) => {
        const next = new Set(prev);
        ids.filter((id) => !id.startsWith("alert:")).forEach((id) => next.add(id));
        return next;
      });
    },
    [dismiss],
  );

  const unarchive = useCallback(
    (ids: string[]) => {
      const alertIds = ids.filter((id) => id.startsWith("alert:")).map((id) => id.slice(6));
      if (alertIds.length) undoDismiss(alertIds);
      setArchived((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    },
    [undoDismiss],
  );

  const resolve = useCallback(
    (id: string, reason: string) => {
      if (id.startsWith("alert:")) resolveAlert(id.slice(6));
      else setResolved((prev) => new Set(prev).add(id));
      setResolutions((prev) => ({ ...prev, [id]: { reason, by: CURRENT_USER_NAME, at: MOCK_NOW_ISO } }));
    },
    [resolveAlert],
  );

  const unresolve = useCallback(
    (id: string) => {
      if (id.startsWith("alert:")) reopenAlert(id.slice(6));
      setResolved((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setResolutions((prev) => {
        if (!prev[id]) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (id.startsWith("note:")) {
        const noteId = id.slice(5);
        setDecisions((prev) => {
          if (!prev[noteId]) return prev;
          const next = { ...prev };
          delete next[noteId];
          return next;
        });
      }
    },
    [reopenAlert],
  );

  const snooze = useCallback((id: string) => {
    setSnoozes((prev) => ({ ...prev, [id]: { by: CURRENT_USER_NAME, at: MOCK_NOW_ISO } }));
  }, []);

  const unsnooze = useCallback((id: string) => {
    setSnoozes((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const decide = useCallback((noteId: string, choice: Decision["choice"], note: string) => {
    setDecisions((prev) => ({ ...prev, [noteId]: { choice, note, by: CURRENT_USER_NAME, at: MOCK_NOW_ISO } }));
  }, []);

  const reply = useCallback((threadId: string, body: string) => {
    replySeq += 1;
    const message: Message = {
      id: `local-msg-${replySeq}`,
      threadId,
      author: CURRENT_USER_NAME,
      authorRole: "internal_ops",
      body,
      // On the prototype's clock, so a reply sorts with the seeded messages.
      sentAt: MOCK_NOW_ISO,
    };
    setReplies((prev) => ({ ...prev, [threadId]: [...(prev[threadId] ?? []), message] }));
  }, []);

  const saveFilter = useCallback((name: string, filters: MessageFilters) => {
    setSaved((prev) => [...prev, { id: `saved-${Date.now().toString(36)}`, name, filters }]);
  }, []);

  const value = useMemo<MessagesState>(
    () => ({
      messages,
      getMessage: (id) => (id ? byId.get(id) : undefined),
      markRead,
      archive,
      unarchive,
      resolve,
      resolutionFor: (id) => resolutions[id],
      unresolve,
      snooze,
      unsnooze,
      snoozeFor: (id) => snoozes[id],
      decisionFor: (noteId) => decisions[noteId],
      decide,
      repliesFor: (threadId) => replies[threadId] ?? [],
      reply,
      saved,
      saveFilter,
    }),
    [messages, byId, markRead, archive, unarchive, resolve, resolutions, unresolve, snooze, unsnooze, snoozes, decisions, decide, replies, reply, saved, saveFilter],
  );

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
}

export function useMessages() {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error("useMessages must be used within MessagesProvider");
  return ctx;
}

// Alerts Stella has drafted responses for ask for a decision; the rest ask
// for action or a look, by how urgent the rule says they are.
const ALERTS_WITH_RESPONSES = new Set(STELLA_INCOMING.map((r) => r.alertId));

function alertAsk(severity: AlertSeverity, alertId: string) {
  if (ALERTS_WITH_RESPONSES.has(alertId)) return "Need decision for";
  return severity === "critical" || severity === "high" ? "Take action on" : "Need review of";
}

// ---------------------------------------------------------------------------
// Topics
// ---------------------------------------------------------------------------
//
// Stand-ins for the topics Stella clusters messages into. A message lands in
// the first topic whose pattern its title or body matches.

export interface Topic {
  id: string;
  label: string;
  // The stops of the swatch's gradient.
  colors: string[];
  match: RegExp;
}

export const TOPICS: Topic[] = [
  {
    id: "inbound",
    label: "Late inbound & tracking",
    colors: ["#fb923c", "#fdba74", "#93c5fd"],
    match: /parcel|tracking|inbound|lands after|arrives|shipped|receiving|restock|low stock/i,
  },
  {
    id: "completion",
    label: "Task completion & review",
    colors: ["#a78bfa", "#86efac", "#60a5fa"],
    match: /overdue|past due|waiting on review|acknowledg|closed without|completed task|tasks passed|audit/i,
  },
  {
    id: "billing",
    label: "Margin & billing",
    colors: ["#f472b6", "#c026d3", "#e879f9"],
    match: /margin|\$0|billed|dollar|charges|over contracted|statement of work/i,
  },
  {
    id: "events",
    label: "Event readiness",
    colors: ["#facc15", "#4ade80", "#60a5fa"],
    match: /event|pop-?up|\bcoi\b|venue|load-in|tour stop|rollout/i,
  },
  {
    id: "staffing",
    label: "Training & staffing",
    colors: ["#2dd4bf", "#818cf8", "#f9a8d4"],
    match: /train|supervision|shift|staffing|onboarding|go-live/i,
  },
];

function topicFor(m: Draft) {
  const text = `${m.title} ${m.body}`;
  return TOPICS.find((t) => t.match.test(text))?.id ?? null;
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

export function facetValue(m: InboxMessage, key: FacetKey): string | null {
  switch (key) {
    case "status":
      return m.status;
    case "type":
      return m.type;
    case "severity":
      return m.severity;
    case "topic":
      return m.topic;
    case "rule":
      return m.ruleId;
    case "sop":
      return m.sopId;
    case "brand":
      return m.brandId;
    case "networkOperator":
      return m.networkOperatorId;
    case "project":
      return m.projectId;
    case "workOrder":
      return m.workOrderId;
  }
}

export const FACETS: FacetKey[] = [
  "status",
  "type",
  "severity",
  "topic",
  "rule",
  "sop",
  "brand",
  "networkOperator",
  "project",
  "workOrder",
];

function matchesQuery(m: InboxMessage, q: string) {
  if (!q) return true;
  const brand = m.brandId ? getBrand(m.brandId)?.name : "";
  const no = m.networkOperatorId ? getNetworkOperator(m.networkOperatorId)?.name : "";
  return [m.title, m.body, brand, no, STATUS_LABEL[m.status], m.assignee]
    .filter(Boolean)
    .some((s) => s!.toLowerCase().includes(q));
}

// Everything that passes the filters, skipping one facet when asked — which is
// how each facet's counts are taken, so picking a brand doesn't zero out the
// other brands' counts.
export function applyFilters(messages: InboxMessage[], f: MessageFilters, skip?: FacetKey) {
  const q = f.q.trim().toLowerCase();
  return messages.filter(
    (m) =>
      (f.owner !== "me" || m.mine) &&
      (!f.ids?.length || f.ids.includes(m.id)) &&
      FACETS.every((k) => k === skip || !f[k]?.length || f[k].includes(facetValue(m, k) ?? "")) &&
      matchesQuery(m, q),
  );
}

export function sameFilters(a: MessageFilters, b: MessageFilters) {
  return (
    a.q.trim() === b.q.trim() &&
    a.owner === b.owner &&
    (a.ids ?? []).length === (b.ids ?? []).length &&
    (a.ids ?? []).every((v) => b.ids.includes(v)) &&
    FACETS.every((k) => (a[k] ?? []).length === (b[k] ?? []).length && (a[k] ?? []).every((v) => b[k].includes(v)))
  );
}

export const STATUS_LABEL: Record<MessageStatus, string> = {
  needs_input: "Action Required",
  unread: "Unread",
  read: "Read",
  resolved: "Dismissed",
  archived: "Archived",
  snoozed: "Snoozed",
};

export const TYPE_LABEL: Record<MessageType, string> = {
  sop: "Automation",
  goal: "Goal",
  project: "Project",
  audit: "Task Completion Audit",
  coworker: "Coworker",
  no: "NO",
  brand: "Brand",
};

export const SEVERITY_LABEL: Record<MessageSeverity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  normal: "Normal",
  low: "Low",
};
