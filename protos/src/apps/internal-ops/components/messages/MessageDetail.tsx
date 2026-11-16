// What the inspection pane shows for each kind of message.
//
// An alert Stella has drafted responses for shows her request — the same
// session the Stella page lists under Incoming, so a response picked here
// settles it there too. Any other alert, and an SOP run that stopped, gets
// what the record itself says and the actions that actually exist for it. A
// thread is the conversation, with a reply box. A note (goal, project, audit,
// coworker, Stella, or an SOP's request) is what it says, or Stella's
// write-up when it has one; a coworker's note can be replied to, and a note
// that asks for a decision takes Approve or Decline.
//
// The header names the message's type, who it waits on, the SOP it came
// from, and resolves it.

import { Check, Lightbulb } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getProject, getSop, getSopRun, messagesForThread, nodeRunsForRun } from "../../../../data";
import { formatDateTime } from "../../../../lib/format";
import { useAlerts } from "../../context/AlertsContext";
import { useMessages, type Decision, type InboxMessage } from "../../context/MessagesContext";
import { inboxNotes } from "../../data/inboxNotes";
import { useStella } from "../../context/StellaContext";
import { workItemFor } from "../../data/myWork";
import type { StellaEntry } from "../../data/stellaScript";
import { linkAlertText } from "../alerts/AlertCard";
import { InspectionPane, PaneBadge, PaneSection } from "../InspectionPane";
import { StellaComposer } from "../stella/StellaComposer";
import { ActionsCard, StellaEntryView } from "../stella/StellaTranscript";
import { From, Meta, RaisedHistoryCard, ResolutionNote, ResolveButton, SnoozeButton, SnoozeNote, sourceSop } from "./MessageMeta";
import { MessageTypeBadge } from "./messageUi";

// Stella's honest answer to a question asked about a record she has no
// script for. Nothing is pretended.
const NO_SCRIPT_REPLY =
  "I can't act on this one from here yet. Use the actions above, or open a chat with me in Stella and I'll tell you what I can run.";

export function MessageDetail({ message, onClose }: { message: InboxMessage; onClose: () => void }) {
  const { getRule } = useAlerts();
  const source = sourceSop(message, getRule);
  const [, rerender] = useState(0);
  const chat = paneChats.get(message.id) ?? [];
  const pushChat = (id: string, entry: StellaEntry) => {
    paneChats.set(id, [...(paneChats.get(id) ?? []), entry]);
    rerender((n) => n + 1);
  };
  return (
    <InspectionPane
      key={message.id}
      icon={<MessageTypeBadge type={message.type} size={28} />}
      title={<Title message={message} />}
      badge={<StatusBadge message={message} />}
      meta={<Meta message={message} />}
      action={
        <div className="flex items-center gap-2">
          <SnoozeButton message={message} />
          <ResolveButton message={message} />
        </div>
      }
      from={
        (source || message.status === "resolved" || message.status === "snoozed") && (
          <div className="flex flex-col gap-2">
            {source && <From source={source} />}
            <ResolutionNote messageId={message.id} />
            <SnoozeNote messageId={message.id} />
          </div>
        )
      }
      onClose={onClose}
      footer={<Footer message={message} pushChat={pushChat} />}
    >
      {message.kind === "thread" && <p className="mb-5 text-lg text-slate-500">Conversation</p>}
      {message.kind === "alert" && <AlertBody message={message} />}
      {message.kind === "sop" && <SopBody message={message} />}
      {message.kind === "thread" && <ThreadBody message={message} />}
      {message.kind === "note" && <NoteBody message={message} />}
      {chat.length > 0 && (
        <div className="mt-6 flex flex-col gap-5">
          {chat.map((e, i) => (
            <StellaEntryView key={i} entry={e} />
          ))}
        </div>
      )}
    </InspectionPane>
  );
}

function Title({ message }: { message: InboxMessage }) {
  const { alerts } = useAlerts();
  if (message.kind === "alert") {
    const alert = alerts.find((a) => a.id === message.refId);
    if (alert) return <>{linkAlertText(alert).title}</>;
  }
  return <>{message.title}</>;
}

function StatusBadge({ message }: { message: InboxMessage }) {
  switch (message.status) {
    case "needs_input":
      return <PaneBadge tone="amber">Action Req’d</PaneBadge>;
    case "unread":
      return <PaneBadge tone="brand">Unread</PaneBadge>;
    case "resolved":
      return <PaneBadge tone="emerald">Ignored</PaneBadge>;
    case "archived":
      return <PaneBadge tone="slate">Archived</PaneBadge>;
    case "snoozed":
      return <PaneBadge tone="brand">Resolved</PaneBadge>;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Bodies
// ---------------------------------------------------------------------------

function Stack({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-6">{children}</div>;
}

function AlertBody({ message }: { message: InboxMessage }) {
  const { alerts, getRule } = useAlerts();
  const { itemState, actOn } = useStella();
  const { archive, unarchive } = useMessages();
  const navigate = useNavigate();
  const alert = alerts.find((a) => a.id === message.refId);
  if (!alert) return null;
  const rule = getRule(alert.ruleId);
  const work = workItemFor(message.id);

  // Stella's request: her write-up, which the pane's header opens, and the
  // responses she can act on. Acting here is the same as on the Stella home.
  if (work && work.item.actions.length > 0) {
    const state = itemState(message.id);
    return (
      <Stack>
        {work.item.sections.map((s) => (
          <PaneSection key={s.heading} heading={s.heading}>
            {s.body}
          </PaneSection>
        ))}
        <div className="ml-[30px]">
          <ActionsCard
            options={work.item.actions}
            chosen={state.acted}
            onChoose={
              state.busy || alert.status !== "active" ? undefined : (option) => actOn(work.group.id, message.id, option)
            }
          />
        </div>
      </Stack>
    );
  }

  return (
    <Stack>
      <PaneSection heading="What happened">{alert.description}</PaneSection>
      <PaneSection heading="Why it was flagged">{alert.reasoning}</PaneSection>
      {alert.status === "dismissed" && alert.dismissedByName && (
        <p className="ml-[30px] text-sm text-slate-500">
          Dismissed by <span className="font-medium text-slate-700">{alert.dismissedByName}</span> ·{" "}
          {formatDateTime(alert.dismissedAt ?? null)}
        </p>
      )}
      <div className="ml-[30px]">
        {alert.status === "active" ? (
          <ActionsCard
            options={[
              { label: "Dismiss", description: "Dismiss the alert — it moves to Archived" },
              { label: "View Automation", description: `Open the Alert Automation that raised it${rule ? `: ${rule.name}` : ""}` },
            ]}
            chosen={null}
            onChoose={(i) => (i === 0 ? archive([message.id]) : rule && navigate(`/internal-ops/alerts/${rule.id}`))}
          />
        ) : alert.status === "dismissed" ? (
          <ActionsCard
            options={[{ label: "Restore", description: "Put the alert back with the ones that need input" }]}
            chosen={null}
            onChoose={() => unarchive([message.id])}
          />
        ) : null}
      </div>
    </Stack>
  );
}

function SopBody({ message }: { message: InboxMessage }) {
  const { archive, unarchive } = useMessages();
  const navigate = useNavigate();
  const run = getSopRun(message.refId);
  const sop = getSop(message.sopId ?? undefined);
  if (!run || !sop) return null;
  const nodeRuns = nodeRunsForRun(run.id);
  const errors = nodeRuns.flatMap((n) => n.errors);
  const issues = nodeRuns.flatMap((n) => n.issues);
  const runPath = `/internal-ops/sops/${sop.id}/runs/${run.id}`;

  return (
    <Stack>
      <PaneSection heading="What the run did">
        {sop.name} ran for {run.label} on version {run.version} and{" "}
        {run.status === "failed" ? "stopped before it finished" : run.status === "escalated" ? "escalated to its owner" : "is waiting on an approval"}
        . {run.humanTouches} human touch{run.humanTouches === 1 ? "" : "es"}, {run.escalations} escalation
        {run.escalations === 1 ? "" : "s"}.
      </PaneSection>
      {errors.length > 0 && (
        <PaneSection heading="What stopped it">
          <List items={errors} />
        </PaneSection>
      )}
      {issues.length > 0 && (
        <PaneSection heading="Flagged for a person">
          <List items={issues} />
        </PaneSection>
      )}
      <div className="ml-[30px]">
        {message.status === "archived" ? (
          <ActionsCard
            options={[{ label: "Restore", description: "Put the message back with the ones that need input" }]}
            chosen={null}
            onChoose={() => unarchive([message.id])}
          />
        ) : (
          <ActionsCard
            options={[
              { label: "Open run", description: "Open the run, step by step, with each step's log" },
              { label: "Dismiss", description: "Dismiss the message — it moves to Archived" },
            ]}
            chosen={null}
            onChoose={(i) => (i === 0 ? navigate(runPath) : archive([message.id]))}
          />
        )}
      </div>
    </Stack>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-4 marker:text-slate-300">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}

function NoteBody({ message }: { message: InboxMessage }) {
  const { archive, unarchive, repliesFor } = useMessages();
  const navigate = useNavigate();
  const note = inboxNotes.find((n) => n.id === message.refId);
  if (!note) return null;
  const project = note.projectId ? getProject(note.projectId) : undefined;
  const replies = repliesFor(note.id);

  // How often the SOP has raised it comes first, then what to do about it;
  // Stella's write-up and any replies read below, for whoever wants the why.
  return (
    <Stack>
      {message.raised.length > 1 && (
        <div className="ml-[30px]">
          <RaisedHistoryCard message={message} />
        </div>
      )}
      <div className="ml-[30px]">
        {note.decision && message.status !== "archived" ? (
          <DecisionCard noteId={note.id} open={message.status === "needs_input"} />
        ) : message.status === "archived" ? (
          <ActionsCard
            options={[{ label: "Restore", description: "Put the message back in the inbox" }]}
            chosen={null}
            onChoose={() => unarchive([message.id])}
          />
        ) : (
          <ActionsCard
            options={[
              ...(project ? [{ label: "Open project", description: project.name }] : []),
              { label: "Dismiss", description: "Dismiss the message — it moves to Archived" },
            ]}
            chosen={null}
            onChoose={(i) => (project && i === 0 ? navigate(`/internal-ops/projects/${project.id}`) : archive([message.id]))}
          />
        )}
      </div>
      {note.sections ? (
        note.sections.map((x) => (
          <PaneSection key={x.heading} heading={x.heading}>
            {withLinks(x.text)}
          </PaneSection>
        ))
      ) : (
        <PaneSection heading={`From ${note.from}`}>{note.body}</PaneSection>
      )}
      {replies.map((m) => (
        <div key={m.id} className="ml-[30px] flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_STYLE[m.authorRole]}`}>{m.author}</span>
            <span className="text-xs text-slate-400">{formatDateTime(m.sentAt)}</span>
          </div>
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-base leading-relaxed text-slate-700">{m.body}</p>
        </div>
      ))}
    </Stack>
  );
}

// `[label](/path)` in a write-up becomes an in-app link.
function withLinks(text: string) {
  return text.split(/(\[[^\]]+\]\([^)]+\))/g).map((part, i) => {
    const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    return m ? (
      <Link key={i} to={m[2]} className="text-brand-600 hover:text-brand-700 hover:underline">
        {m[1]}
      </Link>
    ) : (
      <span key={i}>{part}</span>
    );
  });
}

const CHOICES: { choice: Decision["choice"]; label: string }[] = [
  { choice: "declined", label: "Decline" },
  { choice: "approved", label: "Approve" },
];

// Approve or Decline what Stella asked for, with an optional note. Once
// decided it says who chose what; resolving the message without deciding
// closes it to new choices.
function DecisionCard({ noteId, open }: { noteId: string; open: boolean }) {
  const { decisionFor, decide } = useMessages();
  const decision = decisionFor(noteId);
  const [text, setText] = useState("");
  return (
    <div className="max-w-md rounded-xl border border-brand-100 bg-brand-50/60 px-5 py-4">
      <p className="flex items-center gap-2.5 text-md font-semibold text-slate-900">
        <Lightbulb className="h-4 w-4 shrink-0 text-slate-600" strokeWidth={2} aria-hidden />
        Actions
      </p>
      {decision ? (
        <p className="mt-2 pl-[26px] text-base text-slate-600">
          {decision.choice === "approved" ? "Approved" : "Declined"} by {decision.by} · {formatDateTime(decision.at)}
          {decision.note && <span className="mt-1 block text-slate-500">“{decision.note}”</span>}
        </p>
      ) : (
        <textarea
          rows={2}
          value={text}
          disabled={!open}
          onChange={(e) => setText(e.target.value)}
          placeholder="Optional note or description"
          aria-label="Note for your decision"
          className="mt-2 w-full resize-none bg-transparent pl-[26px] text-base text-slate-700 placeholder:text-slate-400 focus:outline-none disabled:opacity-60"
        />
      )}
      <div className="mt-3 flex justify-end gap-3">
        {CHOICES.map((c) => {
          const picked = decision?.choice === c.choice;
          return (
            <button
              key={c.choice}
              type="button"
              disabled={Boolean(decision) || !open}
              onClick={() => decide(noteId, c.choice, text.trim())}
              aria-pressed={picked}
              className={`inline-flex min-w-[7.5rem] items-center justify-center gap-1.5 rounded-md px-4 py-1.5 text-base font-semibold text-white transition-colors ${
                picked ? "bg-brand-600" : decision ? "bg-brand-500 opacity-35" : "bg-brand-500 hover:bg-brand-600 disabled:opacity-50"
              }`}
            >
              {picked && <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />}
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const ROLE_STYLE = {
  internal_ops: "bg-brick-100 text-brick-700",
  brand: "bg-brand-100 text-brand-700",
  network_operator: "bg-op-100 text-op-700",
};

function ThreadBody({ message }: { message: InboxMessage }) {
  const { repliesFor } = useMessages();
  const conversation = [...messagesForThread(message.refId), ...repliesFor(message.refId)];
  return (
    <div className="flex flex-col gap-4">
      {conversation.map((m) => (
        <div key={m.id} className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_STYLE[m.authorRole]}`}>{m.author}</span>
            <span className="text-xs text-slate-400">{formatDateTime(m.sentAt)}</span>
          </div>
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-base leading-relaxed text-slate-700">{m.body}</p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Asking Stella about a message
// ---------------------------------------------------------------------------
//
// Questions about a message with a Stella session go into that session (and
// show in the body above, with the rest of it). Anything else is held here,
// per message, for as long as the page is open.

const paneChats = new Map<string, StellaEntry[]>();

function Footer({
  message,
  pushChat,
}: {
  message: InboxMessage;
  pushChat: (messageId: string, entry: StellaEntry) => void;
}) {
  const { reply, markRead } = useMessages();

  if (message.kind === "thread" || message.type === "coworker") {
    return (
      <StellaComposer
        brandId={message.brandId}
        placeholder={message.kind === "thread" ? "Reply to the thread…" : "Reply…"}
        onSend={(text) => {
          reply(message.refId, text);
          markRead(message.id);
        }}
      />
    );
  }

  return (
    <StellaComposer
      brandId={message.brandId}
      placeholder="Ask Stella about this…"
      onSend={(text) => {
        const id = message.id;
        pushChat(id, { kind: "user", text, brandId: message.brandId });
        setTimeout(() => pushChat(id, { kind: "agent", text: NO_SCRIPT_REPLY }), 700);
      }}
    />
  );
}
