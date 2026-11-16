// A My Work group on the Stella home: Stella's name for the group on a tinted
// band, the brand it is about, and one row per message with the responses
// she can act on. Under the card, the group's chat — invisible until the card
// is hovered or it has focus — which opens the group's conversation.
//
// The same rows draw a `work` entry in a conversation, so what you acted on
// from the home reads the same way in the transcript.

import { Check, CheckCheck, ChevronDown, ChevronRight, CornerDownRight, MessageCircle, MessageSquareWarning, Undo2, X } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BrandChip } from "../../../../components/BrandChip";
import { getBrand, getProject, getWorkOrder } from "../../../../data";
import { useMessages, type InboxMessage } from "../../context/MessagesContext";
import { DISMISS_REASONS, isSettled, useStella, type DismissReason, type WorkItemState } from "../../context/StellaContext";
import type { StellaEntry } from "../../data/stellaScript";
import { WORK_CARD_LIMIT, type WorkGroup, type WorkItem } from "../../data/myWork";
import { messageWhen } from "../messages/messageUi";
import { SeverityIcon } from "../messages/SeverityIcon";
import { StellaComposer } from "./StellaComposer";
import { StellaIcon } from "./StellaIcon";

// The tints a group can draw in: the band across the top of its card (a
// translucent wash, so it sits lightly on the card) and the dot that stands
// for it.
export const WORK_PALETTES = [
  { header: "linear-gradient(90deg, rgba(217, 226, 255, 0.55) 0%, rgba(233, 238, 255, 0.55) 45%, rgba(247, 249, 255, 0.55) 100%)", dot: "#7b93ff" },
  { header: "linear-gradient(90deg, rgba(255, 225, 189, 0.55) 0%, rgba(255, 240, 220, 0.55) 45%, rgba(255, 250, 243, 0.55) 100%)", dot: "#f59a5b" },
  { header: "linear-gradient(90deg, rgba(228, 217, 253, 0.55) 0%, rgba(239, 233, 254, 0.55) 45%, rgba(250, 248, 255, 0.55) 100%)", dot: "#a98be6" },
  { header: "linear-gradient(90deg, rgba(205, 242, 221, 0.55) 0%, rgba(225, 248, 234, 0.55) 45%, rgba(243, 252, 247, 0.55) 100%)", dot: "#4fbf86" },
  { header: "linear-gradient(90deg, rgba(203, 238, 240, 0.55) 0%, rgba(224, 246, 246, 0.55) 45%, rgba(242, 251, 251, 0.55) 100%)", dot: "#2dbfc4" },
  { header: "linear-gradient(90deg, rgba(243, 244, 251, 0.55) 0%, rgba(233, 236, 251, 0.55) 55%, rgba(217, 223, 251, 0.55) 100%)", dot: "#8b9cf5" },
];

// The wash is a light gradient; dark mode (.group-wash in index.css) redraws
// it from the dot colour so the band does not glare on a dark card.
function washStyle(p: { header: string; dot: string }) {
  return { "--wash": p.header, "--wash-dot": p.dot } as CSSProperties;
}

export const paletteFor = (group: WorkGroup) => WORK_PALETTES[group.palette % WORK_PALETTES.length];

// A sidebar row's title with a drifting dashed underline beneath it (styles
// in index.css): the group's colour, or another gradient passed as `line`.
// The line is as wide as the text.
export function WorkRowTitle({ line, children }: { line?: string | null; children: ReactNode }) {
  return (
    <span className="relative min-w-0 truncate pb-1">
      {children}
      {line && (
        <span
          aria-hidden
          className="work-line absolute inset-x-0 bottom-0"
          style={{ "--work-line": line } as CSSProperties}
        />
      )}
    </span>
  );
}

// A group's title: the kind of request, muted, then what it is about. A
// group with no subject is named by its kind alone, in full weight.
export function WorkGroupTitle({ group }: { group: WorkGroup }) {
  if (!group.subject) return <span className="text-slate-700">{group.kind}</span>;
  return (
    <>
      <span className="text-slate-500">{group.kind}</span>{" "}
      <span className="text-slate-700">{group.subject}</span>
    </>
  );
}

// The brand chip under a card's band. Off for now; flip to bring it back.
const SHOW_BRAND_CHIP = false;

export function WorkGroupCard({
  group,
  // Which of the group's messages to draw; all of its open ones by default.
  messageIds,
  // The chat under the card. Off in a transcript, where the composer is the
  // conversation's own.
  withChat = true,
  // How the group is named: a band across the top of the card, or, for one
  // message's own conversation, a small inset bar above it, so the card
  // reads as the message with its group as a breadcrumb.
  heading = "band",
  // Offer "Move to Resolved" in the band once every message is answered. On
  // the home and the digest, where groups are worked through and filed away;
  // not in a transcript or the Resolved view.
  resolvable = false,
  // In a conversation, a group whose messages all take the same response
  // shows the first of them and keeps the rest behind "View N more": they
  // read alike, and Stella's summary under the card covers them.
  condense = false,
}: {
  group: WorkGroup;
  messageIds?: string[];
  withChat?: boolean;
  heading?: "band" | "inset";
  resolvable?: boolean;
  condense?: boolean;
}) {
  const { openItems, itemState, actOn, undoItem, dismissItem, feedbackOn, openGroup, sendToGroup, groupSession, goHome, groupSettled, resolveGroup } =
    useStella();
  const { getMessage } = useMessages();
  const brand = group.brandId ? getBrand(group.brandId) : undefined;
  const palette = paletteFor(group);
  const items = messageIds
    ? group.items.filter((i) => messageIds.includes(i.messageId))
    : openItems(group);
  const conversation = groupSession(group.id);
  const busy = conversation?.busy ?? false;
  // Answered messages drop into a collapsed Resolved section at the foot of
  // the card, opened with "View Resolved", and the open ones stay on top.
  // On the home and the digest that holds even once every message is
  // answered: the card is then just its band and the collapsed section,
  // until the group is filed. A card given its messages (a transcript, the
  // Resolved view) is the record, so there a fully answered one is a plain
  // list.
  const [showResolved, setShowResolved] = useState(false);
  const settled = items.filter((i) => isSettled(itemState(i.messageId)));
  const tucked = settled.length > 0 && (settled.length < items.length || !messageIds);
  const pending = tucked ? items.filter((i) => !settled.includes(i)) : items;
  // On the home and the digest a card shows only the first few; the rest
  // are in the group's conversation view, which shows them all. A card
  // given its messages (a transcript, the Resolved view) shows every one.
  const capped = !messageIds && pending.length > WORK_CARD_LIMIT;
  const visible = capped ? pending.slice(0, WORK_CARD_LIMIT) : pending;
  const row = (item: WorkItem) => {
    const message = getMessage(item.messageId);
    if (!message) return null;
    return (
      <WorkItemRow
        key={item.messageId}
        item={item}
        message={message}
        state={itemState(item.messageId)}
        onAct={(option) => actOn(group.id, item.messageId, option)}
        onUndo={() => undoItem(group.id, item.messageId)}
        onDismiss={(reason) => dismissItem(group.id, item.messageId, reason)}
        onFeedback={() => {
          feedbackOn(group.id, item.messageId);
          toStella();
        }}
        onChat={() => {
          openGroup(group.id, item.messageId);
          toStella();
        }}
      />
    );
  };
  // A response most of the group's open messages can take, offered once
  // for all of them under the card.
  const shared = sharedAction(capped ? visible : items, itemState);
  // A group whose messages all take the same one response is drawn as a
  // summary on the home and the digest: Stella's account of them and one
  // button, with the rows left to its conversation. That holds until any of
  // them is answered; after that the card is the usual one.
  const response = items[0]?.actions[0];
  const uniform =
    !!group.summary &&
    !!response &&
    items.every((i) => i.actions.length === 1 && i.actions[0].label.toLowerCase() === response.label.toLowerCase());
  const summarized = uniform && !messageIds && settled.length === 0;
  // The same group in a conversation: one row, and the rest on request.
  const [showMore, setShowMore] = useState(false);
  const condensed = condense && uniform && visible.length > 1;
  const shownRows = condensed && !showMore ? visible.slice(0, 1) : visible;
  const acting = items.some((i) => itemState(i.messageId).busy);
  const lead = items[0] ? getMessage(items[0].messageId) : undefined;
  // The card is also drawn on the digest page; a conversation started from
  // there opens on the Stella home, where conversations live.
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const toStella = () => {
    if (!/^\/internal-ops\/?$/.test(pathname)) navigate("/internal-ops");
  };

  return (
    <section id={`work-${group.id}`} className="group/card scroll-mt-6">
      {/* The breadcrumb leads back to the home, with the group in view. */}
      {heading === "inset" && (
        <button
          type="button"
          onClick={() => {
            goHome(group.id);
            toStella();
          }}
          title="Show this group on the Stella home"
          className="group-wash mb-2 ml-3 inline-flex max-w-full items-center gap-1.5 rounded-md px-2.5 py-1 text-left text-sm leading-snug transition-[filter] hover:brightness-[0.97]"
          style={washStyle(palette)}
        >
          <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={2} aria-hidden />
          <span className="min-w-0 truncate">
            <WorkGroupTitle group={group} />
          </span>
        </button>
      )}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        {heading === "band" && (
          <header className="group-wash flex items-center gap-3 px-4 py-2 text-md leading-snug" style={washStyle(palette)}>
            <span className="min-w-0 flex-1">
              <WorkGroupTitle group={group} />
            </span>
            {resolvable && groupSettled(group) && (
              <button
                type="button"
                onClick={() => resolveGroup(group.id)}
                className="-my-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-0.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
              >
                <CheckCheck className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                Move to Resolved
              </button>
            )}
          </header>
        )}
        <div className="px-4 pb-1 pt-2.5">
          {SHOW_BRAND_CHIP && brand && (
            <div className="mb-1">
              <BrandChip name={brand.name} color={brand.color} />
            </div>
          )}
          {summarized && group.summary && response && (
            <div className="pb-3 pt-1">
              <p className="flex items-center gap-2 text-sm text-slate-500">
                {lead && <SeverityIcon severity={lead.severity} size={12} />}
                {items.length} requests, one response
              </p>
              <p className="mt-1.5 text-md leading-relaxed text-slate-700">{group.summary.text}</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    openGroup(group.id);
                    toStella();
                  }}
                  className="group/details inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  View details
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover/details:text-slate-500" strokeWidth={2} aria-hidden />
                </button>
                {acting ? (
                  <span className="flex items-center gap-2 text-sm">
                    <StellaIcon size={16} thinking />
                    <span className="italic text-brand-600">{group.summary.acting}…</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => items.forEach((i) => actOn(group.id, i.messageId, 0))}
                    title={`${response.label} on ${items.length} requests`}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                  >
                    {response.label} all {items.length}
                  </button>
                )}
              </div>
            </div>
          )}
          {!summarized && <ul className="divide-y divide-slate-100">{shownRows.map(row)}</ul>}
          {!summarized && condensed && (
            <div className="border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowMore((v) => !v)}
                aria-expanded={showMore}
                className="group/more flex w-full items-center justify-center gap-2 py-2.5 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                {showMore ? "Show fewer" : `View ${visible.length - 1} more`}
                <ChevronRight
                  className={`h-4 w-4 text-slate-400 transition-transform group-hover/more:text-slate-500 ${showMore ? "rotate-90" : ""}`}
                  strokeWidth={2}
                  aria-hidden
                />
              </button>
            </div>
          )}
          {!summarized && capped && (
            <div className="border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  openGroup(group.id);
                  toStella();
                }}
                className="group/all flex w-full items-center justify-center gap-2 py-2.5 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                View all {items.length} requests
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover/all:text-slate-500" strokeWidth={2} aria-hidden />
              </button>
            </div>
          )}
          {tucked && (
            <div className={pending.length > 0 ? "border-t border-slate-100" : ""}>
              <button
                type="button"
                onClick={() => setShowResolved((v) => !v)}
                aria-expanded={showResolved}
                className="group/toggle flex w-full items-center justify-center gap-2 py-2.5 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                {showResolved ? "Hide Resolved" : "View Resolved"}
                <ChevronRight
                  className={`h-4 w-4 text-slate-400 transition-transform group-hover/toggle:text-slate-500 ${showResolved ? "rotate-90" : ""}`}
                  strokeWidth={2}
                  aria-hidden
                />
              </button>
              {showResolved && <ul className="divide-y divide-slate-100 border-t border-slate-100">{settled.map(row)}</ul>}
            </div>
          )}
        </div>
      </div>
      {withChat && shared && !summarized && (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-slate-200/80 bg-white/70 py-1.5 pl-3.5 pr-1.5 text-sm text-slate-500">
          <span className="min-w-0 truncate">
            {shared.items.length === shared.open ? "All" : `${shared.items.length} of ${shared.open}`} can take the same response
          </span>
          <button
            type="button"
            disabled={shared.busy}
            onClick={() => shared.items.forEach(({ item, option }) => actOn(group.id, item.messageId, option))}
            title={`${shared.label} on ${shared.items.length} messages`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
          >
            {shared.label}
            <span className="rounded bg-slate-100 px-1.5 text-xs font-semibold text-slate-500">{shared.items.length}</span>
          </button>
        </div>
      )}
      {/* A group already in conversation points there instead of offering
          a second place to type. */}
      {withChat && conversation && (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-slate-200/80 bg-white/70 py-1.5 pl-3.5 pr-1.5 text-sm text-slate-500">
          <span className="flex min-w-0 items-center gap-2">
            <MessageCircle className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.75} aria-hidden />
            <span className="truncate">You have a conversation open about this group</span>
          </span>
          <button
            type="button"
            onClick={() => {
              openGroup(group.id);
              toStella();
            }}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
          >
            Continue conversation
          </button>
        </div>
      )}
      {withChat && !conversation && (
        <div className="mt-2 opacity-0 transition-opacity duration-200 focus-within:opacity-100 group-hover/card:opacity-100 has-[[data-draft]]:opacity-100">
          <StellaComposer slim placeholder="Ask…" disabled={busy} onSend={(text) => {
              sendToGroup(group.id, text);
              toStella();
            }}
          />
        </div>
      )}
    </section>
  );
}

// The response most of the group's still-open messages share, if there is
// one: at least two of them, and more than half of those that offer any
// response (a message answered in the chat has none to share). Labels are
// matched without regard to case, since the same response is spelled a few
// ways in the data. Each message's own index for it comes back, for acting
// on it.
function sharedAction(items: WorkItem[], stateOf: (messageId: string) => WorkItemState) {
  const open = items.filter((i) => {
    const s = stateOf(i.messageId);
    return i.actions.length > 0 && s.acted === null && !s.dismissed && s.checked !== "cleared";
  });
  const tally = new Map<string, { label: string; items: { item: WorkItem; option: number }[] }>();
  for (const item of open) {
    const seen = new Set<string>();
    item.actions.forEach((a, option) => {
      const key = a.label.trim().toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      const hit = tally.get(key) ?? { label: a.label, items: [] };
      hit.items.push({ item, option });
      tally.set(key, hit);
    });
  }
  let best: { label: string; items: { item: WorkItem; option: number }[] } | null = null;
  for (const hit of tally.values()) if (!best || hit.items.length > best.items.length) best = hit;
  if (!best || best.items.length < 2 || best.items.length * 2 <= open.length) return null;
  return { ...best, open: open.length, busy: open.some((i) => stateOf(i.messageId).busy) };
}

// One message: the question, the record it is about, and the responses. The
// dismiss menu shows on hover; the chevron opens Stella's write-up.
function WorkItemRow({
  item,
  message,
  state,
  onAct,
  onUndo,
  onDismiss,
  onFeedback,
  onChat,
}: {
  item: WorkItem;
  message: InboxMessage;
  state: WorkItemState;
  onAct: (option: number) => void;
  onUndo: () => void;
  onDismiss: (reason: DismissReason) => void;
  onFeedback: () => void;
  onChat: () => void;
}) {
  const [open, setOpen] = useState(false);
  // Off the list, one way or another: it cleared itself or you put it aside.
  const cleared = state.checked === "cleared" || state.dismissed !== null;
  const acted = state.acted !== null;
  const picked = acted ? item.actions[state.acted!] : undefined;
  const record = item.record?.label ?? recordLabel(message);

  return (
    <li className="group/row py-3">
      <div className="flex items-start gap-2.5">
        {state.dismissed ? (
          <span className="mt-1 flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-slate-400 text-white" aria-label="Dismissed">
            <X className="h-2 w-2" strokeWidth={3} />
          </span>
        ) : cleared ? (
          <span className="mt-1 flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white" aria-label="Cleared">
            <Check className="h-2 w-2" strokeWidth={3} />
          </span>
        ) : (
          <span role="img" aria-label={`${message.severity} severity`} title={`${message.severity} severity`} className="mt-1 flex h-3 w-3 shrink-0 items-center justify-center">
            <SeverityIcon severity={message.severity} size={12} />
          </span>
        )}
        <p className={`min-w-0 flex-1 text-md leading-snug ${cleared ? "text-slate-400 line-through" : "text-slate-800"}`}>{item.title}</p>
        {!cleared && !acted && <DismissMenu onDismiss={onDismiss} onFeedback={onFeedback} />}
      </div>

      {/* The record it is about, how long ago, and the way to the write-up. */}
      <div className="ml-[22px] mt-1.5 flex items-center gap-2 rounded-md bg-slate-50 px-2.5 py-1 text-sm">
        <Link
          to={`/internal-ops/messages?item=${message.id}`}
          className="min-w-0 truncate font-medium text-brand-600 hover:text-brand-700 hover:underline"
          title={record}
        >
          {record}
        </Link>
        {item.record?.detail ? (
          <span className="min-w-0 truncate text-slate-500" title={item.record.detail}>
            {item.record.detail}
          </span>
        ) : (
          <span className="shrink-0 text-slate-400">{messageWhen(message.at)}</span>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Hide the write-up" : "Show the write-up"}
          className="ml-auto shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2} />
        </button>
      </div>

      {open && (
        <div className="ml-[22px] mt-2 space-y-2 text-sm leading-relaxed text-slate-600">
          <p>{item.ask}</p>
          {item.sections.map((s) => (
            <div key={s.heading}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{s.heading}</p>
              <p className="mt-0.5">{s.body}</p>
            </div>
          ))}
        </div>
      )}

      {state.dismissed ? (
        <p className="ml-[22px] mt-1.5 text-xs text-slate-400">Dismissed · {DISMISS_REASONS[state.dismissed]}</p>
      ) : (
        state.checked && (
          <p className={`ml-[22px] mt-1.5 text-xs ${cleared ? "text-emerald-700" : "text-slate-400"}`}>
            {cleared ? "Cleared itself" : "Checked just now, still open"} · {item.refresh.note}
          </p>
        )
      )}

      {!cleared && (
        <div className="ml-[22px] mt-2.5 flex items-center justify-end gap-2">
          {acted && picked ? (
            <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
              {state.busy ? (
                <>
                  <StellaIcon size={16} thinking />
                  <span className="italic text-brand-600">{picked.status}…</span>
                </>
              ) : (
                <span className="min-w-0 truncate text-slate-500" title={picked.reply}>
                  {picked.reply}
                </span>
              )}
            </div>
          ) : item.actions.length === 0 ? (
            <span className="text-sm font-medium text-slate-500">Answer below</span>
          ) : null}
          {item.actions.map((a, i) => {
            const isPicked = state.acted === i;
            if (acted && !isPicked) return null;
            return (
              <button
                key={a.label}
                type="button"
                disabled={acted}
                onClick={() => onAct(i)}
                aria-pressed={isPicked}
                title={a.description}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1 text-sm font-medium transition-colors ${
                  isPicked
                    ? "border-brand-200 bg-brand-50 text-brand-700"
                    : "border-slate-300 bg-white text-slate-700 shadow-sm hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                }`}
              >
                {isPicked && <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />}
                {a.label}
              </button>
            );
          })}
          {/* A response that has been acted on can be taken back: the
              message opens again with all of its responses. */}
          {acted && !state.busy && (
            <button
              type="button"
              onClick={onUndo}
              aria-label={`Undo ${picked?.label ?? "response"}`}
              title="Undo"
              className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <Undo2 className="h-4 w-4" strokeWidth={1.75} />
            </button>
          )}
          <button
            type="button"
            onClick={onChat}
            aria-label="Open a conversation about this"
            title="Talk to Stella about this"
            className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      )}
    </li>
  );
}

// The way to put a message aside: an X with a chevron that opens the reasons,
// plus a route to tell the automation behind it what went wrong. Hidden
// until the row is hovered, and kept shown while the menu is open.
function DismissMenu({ onDismiss, onFeedback }: { onDismiss: (reason: DismissReason) => void; onFeedback: () => void }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };
  const row = "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900";

  return (
    <div ref={wrap} className="relative -mr-1 -mt-0.5 shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Dismiss"
        title="Dismiss"
        className={`flex items-center gap-0.5 rounded py-1 pl-1 pr-0.5 text-slate-400 transition-opacity hover:bg-slate-100 hover:text-slate-600 ${
          open ? "bg-slate-100 text-slate-600 opacity-100" : "opacity-0 focus-visible:opacity-100 group-hover/row:opacity-100"
        }`}
      >
        <X className="h-3.5 w-3.5" strokeWidth={2} />
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2} />
      </button>
      {open && (
        <ul
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 w-60 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          <li role="none">
            <button type="button" role="menuitem" onClick={pick(() => onDismiss("elsewhere"))} className={row}>
              <X className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={2} aria-hidden />
              Dismiss · {DISMISS_REASONS.elsewhere}
            </button>
          </li>
          <li role="none">
            <button type="button" role="menuitem" onClick={pick(() => onDismiss("invalid"))} className={row}>
              <X className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={2} aria-hidden />
              Dismiss · {DISMISS_REASONS.invalid}
            </button>
          </li>
          <li role="none" className="my-1 border-t border-slate-100" />
          <li role="none">
            <button type="button" role="menuitem" onClick={pick(onFeedback)} className={row}>
              <MessageSquareWarning className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={2} aria-hidden />
              Improve this automation
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}

// The record a message is about, for its link: the project, else the work
// order, else the brand, else the message itself.
function recordLabel(message: InboxMessage) {
  return (
    getProject(message.projectId ?? undefined)?.name ??
    getWorkOrder(message.workOrderId ?? undefined)?.title ??
    (message.brandId ? getBrand(message.brandId)?.name : undefined) ??
    message.title
  );
}

// A `work` entry in a conversation: the messages brought in, as their cards.
// In one message's own conversation the group is a breadcrumb above the
// card rather than a band across it.
export function WorkEntry({ entry }: { entry: Extract<StellaEntry, { kind: "work" }> }) {
  const { groups, active } = useStella();
  const group = groups.find((g) => g.id === entry.groupId);
  if (!group) return null;
  return (
    <WorkGroupCard group={group} messageIds={entry.messageIds} withChat={false} heading={active.itemId ? "inset" : "band"} condense />
  );
}

// A `workAll` entry: one press that gives every message of the group its
// shared response, under Stella's summary of them. It counts only what is
// still unanswered. Pressing it turns it into your message in the
// transcript, so it is only ever drawn as a button; with nothing left to
// answer it isn't drawn at all.
export function WorkAllEntry({ entry }: { entry: Extract<StellaEntry, { kind: "workAll" }> }) {
  const { groups, itemState, actOnAll } = useStella();
  const group = groups.find((g) => g.id === entry.groupId);
  const response = group?.items[0]?.actions[0];
  if (!group || !response) return null;

  const total = group.items.length;
  const left = group.items.filter((i) => {
    const s = itemState(i.messageId);
    return s.acted === null && !isSettled(s);
  });
  if (left.length === 0) return null;
  // A row above being acted on by itself: wait for it.
  const acting = group.items.some((i) => itemState(i.messageId).busy);

  return (
    // Indented to sit under Stella's text, past her icon.
    <div className="ml-[34px]">
      <button
        type="button"
        disabled={acting}
        onClick={() => actOnAll(group.id)}
        title={`${response.label} on ${left.length} requests`}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
      >
        {response.label} {left.length === total ? `all ${total}` : `the other ${left.length}`}
      </button>
    </div>
  );
}
