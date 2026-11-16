// A message's metadata: when it came in, the brand or network operator it is
// about, who owns it, how many times its SOP has raised it, the SOP it came
// from, and the ways to settle it (ignore with a reason, or resolve until the
// SOP finds it fixed). The Messages pane lays these out in its header; a
// Stella chat opened from the message shows them together as a card under
// her opening line.

import { BellOff, Check, ChevronDown, CircleCheck, ExternalLink, EyeOff, History, User } from "lucide-react";
import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { BrandChip } from "../../../../components/BrandChip";
import { getBrand, getNetworkOperator, getSop } from "../../../../data";
import { formatDateTime } from "../../../../lib/format";
import { useAlerts } from "../../context/AlertsContext";
import { useMessages, type InboxMessage } from "../../context/MessagesContext";
import { messageWhen } from "./messageUi";
import { ResolveDialog } from "./ResolveDialog";

// The "Raised N×" chip is for the list row; the pane and the chat card say
// it in their own history line instead.
export function Meta({ message }: { message: InboxMessage }) {
  const brand = message.brandId ? getBrand(message.brandId) : undefined;
  const no = message.networkOperatorId ? getNetworkOperator(message.networkOperatorId) : undefined;
  return (
    <>
      <span title={formatDateTime(message.at)}>{messageWhen(message.at)}</span>
      {brand && <BrandChip name={brand.name} color={brand.color} />}
      {no && (
        <span className="inline-flex items-center rounded-md bg-op-50 px-2 py-1 text-sm font-medium text-op-700">{no.name}</span>
      )}
      {message.assignee && (
        <span className="flex items-center gap-1.5 text-slate-500" title="Owner">
          <User className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          {message.assignee}
        </span>
      )}
    </>
  );
}

// How many runs have raised this same subject. One message, updated each
// time, rather than one per run.
export function RaisedChip({ count }: { count: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-800"
      title={`Raised ${count} times by its Automation`}
    >
      <History className="h-3 w-3" strokeWidth={2.25} aria-hidden />
      Raised {count}×
    </span>
  );
}

// The same history as a card of its own, at the top of the Messages pane for
// a message its SOP has raised more than once. Closed until opened: the
// count is the point, the runs are there for whoever wants them.
export function RaisedHistoryCard({ message }: { message: InboxMessage }) {
  const [open, setOpen] = useState(false);
  if (message.raised.length < 2) return null;
  const latest = message.raised[message.raised.length - 1];
  return (
    <article className="max-w-xl rounded-lg border border-amber-200 bg-amber-50/40 px-4 py-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-left text-sm font-semibold text-slate-800"
      >
        <History className="h-4 w-4 shrink-0 text-amber-600" strokeWidth={2} aria-hidden />
        Raised {message.raised.length} times by its Automation
        <span className="ml-auto text-xs font-normal text-slate-500">latest {messageWhen(latest.at)}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2} aria-hidden />
      </button>
      {open && (
        <>
          <p className="mt-1 text-xs text-slate-500">One message, updated each run, rather than one per run.</p>
          <ol className="mt-2.5 space-y-2 border-l-2 border-amber-200 pl-3 text-sm">
            {[...message.raised].reverse().map((r, i) => (
              <li key={r.at}>
                <p className="font-medium text-slate-700">
                  {formatDateTime(r.at)}
                  {i === 0 && <span className="ml-1.5 rounded bg-amber-100 px-1 py-px text-[11px] font-medium text-amber-700">latest</span>}
                </p>
                <p className="text-slate-500">{r.note}</p>
              </li>
            ))}
          </ol>
        </>
      )}
    </article>
  );
}

// Every time the SOP raised this subject, newest first, behind a disclosure.
export function RaisedHistory({ message }: { message: InboxMessage }) {
  const [open, setOpen] = useState(false);
  if (message.raised.length < 2) return null;
  const latest = message.raised[message.raised.length - 1];
  return (
    <div className="text-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 text-left text-slate-500 hover:text-slate-700"
      >
        <History className="h-3.5 w-3.5 shrink-0 text-amber-600" strokeWidth={2} aria-hidden />
        <span>
          Raised {message.raised.length} times by its Automation, latest {messageWhen(latest.at)}. One message, updated each run.
        </span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2} aria-hidden />
      </button>
      {open && (
        <ol className="mt-2 space-y-2 border-l-2 border-amber-200 pl-3">
          {[...message.raised].reverse().map((r, i) => (
            <li key={r.at}>
              <p className="font-medium text-slate-700">
                {formatDateTime(r.at)}
                {i === 0 && <span className="ml-1.5 rounded bg-amber-50 px-1 py-px text-[11px] font-medium text-amber-700">latest</span>}
              </p>
              <p className="text-slate-500">{r.note}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// Resolve (the label for snoozing until fixed): the SOP keeps checking on its
// schedule, and the message comes back as Action Required only once the
// condition has changed. Pressing it again wakes the message now. Gone once
// the message is settled.
export function SnoozeButton({ message }: { message: InboxMessage }) {
  const { snooze, unsnooze } = useMessages();
  if (message.status === "archived" || message.status === "resolved") return null;
  const on = message.status === "snoozed";
  return (
    <button
      type="button"
      onClick={() => (on ? unsnooze(message.id) : snooze(message.id))}
      aria-pressed={on}
      title={on ? "Resolved: its Automation keeps checking and brings it back if the condition recurs. Click to bring it back now." : "Mark this resolved; its Automation keeps checking and brings it back if the condition recurs"}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-3 py-1.5 text-sm font-medium shadow-sm transition-colors ${
        on
          ? "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
          : "border-slate-400 bg-white text-slate-800 hover:bg-slate-50"
      }`}
    >
      <Check className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
      {on ? "Resolved" : "Resolve"}
    </button>
  );
}

// That it is resolved (snoozed until fixed), and what that means, once it is.
export function SnoozeNote({ messageId }: { messageId: string }) {
  const { snoozeFor } = useMessages();
  const snooze = snoozeFor(messageId);
  if (!snooze) return null;
  return (
    <p className="flex gap-2 text-sm text-slate-500">
      <BellOff className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-600" strokeWidth={2} aria-hidden />
      <span>
        <span className="font-medium text-slate-700">Resolved by {snooze.by}.</span> The Automation keeps checking on its
        schedule and brings this back as Action Required if the condition recurs.
      </span>
    </p>
  );
}

// Ignore (the label for resolving with a reason) settles the message wherever
// it came from; an alert is resolved in AlertsContext. It asks for the reason
// first. Gone once archived: Restore is the way back.
export function ResolveButton({ message }: { message: InboxMessage }) {
  const { resolve } = useMessages();
  const [asking, setAsking] = useState(false);
  const cancel = useCallback(() => setAsking(false), []);
  if (message.status === "archived") return null;
  const done = message.status === "resolved";
  return (
    <>
      <button
        type="button"
        disabled={done}
        onClick={() => setAsking(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-400 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm transition-colors hover:bg-slate-50 disabled:border-emerald-200 disabled:bg-emerald-50 disabled:text-emerald-700 disabled:shadow-none"
      >
        <EyeOff className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
        {done ? "Ignored" : "Ignore"}
      </button>
      {asking && (
        <ResolveDialog
          titles={[message.title]}
          onCancel={cancel}
          onResolve={(reason) => {
            resolve(message.id, reason);
            setAsking(false);
          }}
        />
      )}
    </>
  );
}

// Why it was ignored, once it has been.
export function ResolutionNote({ messageId }: { messageId: string }) {
  const { resolutionFor } = useMessages();
  const resolution = resolutionFor(messageId);
  if (!resolution) return null;
  return (
    <p className="flex gap-2 text-sm text-slate-500">
      <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" strokeWidth={2} aria-hidden />
      <span>
        <span className="font-medium text-slate-700">Ignored by {resolution.by}:</span> {resolution.reason}
      </span>
    </p>
  );
}

// The SOP that raised it: an alert's Alert SOP, or the SOP a run or a note
// belongs to. Threads have none.
export function sourceSop(message: InboxMessage, getRule: (id: string) => { name: string } | undefined) {
  const name = message.ruleId ? getRule(message.ruleId)?.name : message.sopId ? getSop(message.sopId)?.name : undefined;
  if (!name) return null;
  return { name, to: message.ruleId ? `/internal-ops/alerts/${message.ruleId}` : `/internal-ops/sops/${message.sopId}` };
}

export function From({ source }: { source: { name: string; to: string } }) {
  return (
    <span className="flex items-center gap-3">
      From:
      <Link to={source.to} className="inline-flex min-w-0 items-center gap-1.5 font-medium text-brand-600 hover:text-brand-700 hover:underline">
        <span className="truncate">{source.name}</span>
        <ExternalLink className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
      </Link>
    </span>
  );
}

// The same metadata as one card, for a chat about the message.
export function MessageMetaCard({ messageId }: { messageId: string }) {
  const { getMessage } = useMessages();
  const { getRule } = useAlerts();
  const message = getMessage(messageId);
  if (!message) return null;
  const source = sourceSop(message, getRule);
  return (
    <div className="max-w-xl rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
          <Meta message={message} />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SnoozeButton message={message} />
          <ResolveButton message={message} />
        </div>
      </div>
      {source && (
        <div className="mt-3 text-sm text-slate-400">
          <From source={source} />
        </div>
      )}
      <div className="mt-3 space-y-2 empty:hidden">
        <RaisedHistory message={message} />
        <ResolutionNote messageId={message.id} />
        <SnoozeNote messageId={message.id} />
      </div>
    </div>
  );
}
