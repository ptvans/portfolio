// The Stella page: the dedicated chat surface for the agent.
//
// Left: new chat, then My Work — the groups of messages Stella has put
// together for you, until you respond to one — above the conversations
// you've had with her (pinned first, then the ones open now, then earlier
// ones). Middle: the home (greeting, shortcuts, the box, and the My Work
// groups themselves) until a chat is open, then the conversation, as a card.
// Right, once a task is running: what the agent is working through, step by
// step, so a long-running task is legible without reading the whole
// transcript — and, for a task that writes SOPs, a preview of each one as it
// takes shape.

import { ChevronUp, CornerDownRight, House, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getBrand } from "../../../data";
import { SopDraftCard } from "../components/stella/SopDraftCard";
import { SopViewer, type SopSection } from "../components/stella/SopViewer";
import { StellaComposer } from "../components/stella/StellaComposer";
import { StellaDigest } from "../components/stella/StellaDigest";
import { StellaHome } from "../components/stella/StellaHome";
import { SESSION_DOTS, WAITING_LINE, sessionIndicator } from "../components/stella/statusDots";
import { StellaTranscript } from "../components/stella/StellaTranscript";
import { HandRaisedIcon } from "../components/stella/HandRaisedIcon";
import { WorkGroupTitle, WorkRowTitle } from "../components/stella/WorkGroupCard";
import { MY_WORK_PREVIEW, workGroupById, workGroupTitle } from "../data/myWork";
import { isBlank, isViewOnly, useStella, type StellaSession } from "../context/StellaContext";
import type { SopRef } from "../data/stellaScript";

// The page draws one of these in its main card: the home (a blank chat), an
// open conversation, the My Work digest at /internal-ops/my-work, or its
// Resolved view at /internal-ops/my-work/resolved. The sidebar is the same
// for all of them.
export function Stella({ view = "chat" }: { view?: "chat" | "digest" | "resolved" }) {
  // The digest and its Resolved view share the same layout.
  const digest = view === "digest" || view === "resolved";
  const navigate = useNavigate();
  // Anything picked in the sidebar shows on the home or in a chat, so from
  // the digest it leads back there.
  const leaveDigest = () => {
    if (digest) navigate("/internal-ops");
  };
  const {
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
    suggestion,
    groups,
    inMyWork,
    groupSettled,
    groupSession,
    groupSeverity,
    goHome,
    homeTarget,
    clearHomeTarget,
  } = useStella();
  const [params, setParams] = useSearchParams();
  const [myWorkOpen, setMyWorkOpen] = useState(true);
  // A task that writes SOPs shows them in the rail instead of its progress:
  // the cards filling in are the progress. The rail waits for the first one.
  const writesSops = Boolean(activeTask?.drafts);
  const hasProgress = progress.length > 0 && !writesSops;
  const blank = isBlank(active);
  // The SOP open in the viewer, which takes the rail over from the cards. It
  // reads the draft live, so it keeps up with the chat; another chat closes it.
  const [viewing, setViewing] = useState<{ draftId: string; section: SopSection } | null>(null);
  const viewed = viewing ? drafts.find((d) => d.id === viewing.draftId) : undefined;
  // The part of a SOP picked with Modify, waiting in the composer for the
  // message about it.
  const [modifying, setModifying] = useState<SopRef | null>(null);
  useEffect(() => {
    setViewing(null);
    setModifying(null);
  }, [activeId]);

  // My Work lists the groups that still have something open and no
  // conversation of their own yet. Once you respond to a group as a whole it
  // is a conversation, listed with those instead; responding to one of its
  // messages opens that message's own conversation and leaves the group here.
  // Most severe first: the context keeps groups in that order.
  const myWork = groups.filter((g) => inMyWork(g) && !groupSession(g.id));
  // The sidebar shows the first few; the digest page lists them all.
  const myWorkShown = myWork.slice(0, MY_WORK_PREVIEW);
  // A My Work row, or a group's name in a chat, scrolls the home to its
  // group. From inside a chat the home has to open first, so the scroll
  // waits a render.
  useEffect(() => {
    if (!homeTarget || !blank || digest) return;
    document.getElementById(`work-${homeTarget}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    clearHomeTarget();
  }, [homeTarget, blank, digest, clearHomeTarget]);

  const pick = (id: string) => {
    select(id);
    leaveDigest();
  };

  // A group opened only to see its messages isn't a conversation yet.
  const conversations = sessions.filter((s) => !isBlank(s) && !isViewOnly(s));

  // The landing page is the blank chat, not the digest or a conversation.
  const onLanding = blank && !digest;
  const toLanding = () => {
    newChat();
    leaveDigest();
  };
  // Already on it: back to the top of the page, and for New Chat the cursor
  // goes in the box.
  const toTop = (focus: boolean) => {
    const home = document.getElementById("stella-home");
    home?.scrollTo({ top: 0, behavior: "smooth" });
    if (focus) home?.querySelector("textarea")?.focus({ preventScroll: true });
  };
  const pinned = conversations.filter((s) => s.pinned);
  const open = conversations.filter((s) => !s.pinned && s.live);
  const prior = conversations.filter((s) => !s.pinned && !s.live);

  // A link can hand a prompt over through the URL (?ask=). Send it once,
  // into a fresh chat, then drop it so a refresh doesn't replay it.
  const handoff = params.get("ask");
  const handoffBrand = params.get("brand");
  const sent = useRef<string | null>(null);
  useEffect(() => {
    if (!handoff || sent.current === handoff) return;
    // Open a blank chat first; this runs again once it is active.
    if (!blank) {
      newChat();
      return;
    }
    sent.current = handoff;
    send(handoff, handoffBrand);
    const next = new URLSearchParams(params);
    next.delete("ask");
    next.delete("brand");
    setParams(next, { replace: true });
  }, [handoff, handoffBrand, blank, newChat, send, params, setParams]);

  // "New Automation" on the SOPs list opens a fresh chat here (?new), with
  // nothing sent: the author says what to build. Dropped once it is open.
  const wantsNew = params.has("new");
  useEffect(() => {
    if (!wantsNew) return;
    if (!blank) newChat();
    const next = new URLSearchParams(params);
    next.delete("new");
    setParams(next, { replace: true });
  }, [wantsNew, blank, newChat, params, setParams]);

  return (
    <div className="h-full min-h-0 overflow-hidden bg-slate-50">
      <div
        className={`mx-auto grid h-full min-h-0 gap-8 px-6 transition-[grid-template-columns] duration-300 ${
          digest
            ? "max-w-[1280px] grid-cols-[300px_minmax(0,1fr)]"
            : viewed
            ? "max-w-[1600px] grid-cols-[300px_minmax(0,1fr)_520px]"
            : drafts.length > 0
              ? "max-w-[1600px] grid-cols-[300px_minmax(0,1fr)_320px]"
              : hasProgress
                ? "max-w-[1560px] grid-cols-[300px_minmax(0,1fr)_260px]"
                : "max-w-[1280px] grid-cols-[300px_minmax(0,1fr)]"
        }`}
      >
        {/* ---------------- Sessions ---------------- */}
        <aside className="flex min-h-0 flex-col pb-5 pt-[52px]">
          {/* Both lead to the landing page. Already there, the home button
              scrolls it back to the top, and New Chat does that and puts the
              cursor in the box. */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => (onLanding ? toTop(false) : toLanding())}
              aria-label="Stella home"
              title="Stella home"
              className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-200/60 hover:text-slate-700"
            >
              <House className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => (onLanding ? toTop(true) : toLanding())}
              className="inline-flex w-[140px] items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              <Plus className="h-4 w-4 text-slate-500" strokeWidth={1.75} />
              New Chat
            </button>
          </div>

          <div className="thin-scrollbar -mx-1 mt-7 min-h-0 flex-1 overflow-y-auto px-1 pb-4">
            {myWork.length > 0 && (
              <section className="mb-7">
                <button
                  type="button"
                  onClick={() => setMyWorkOpen((v) => !v)}
                  aria-expanded={myWorkOpen}
                  className="flex w-full items-center justify-between px-1 text-sm font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700"
                >
                  Needs Your Attention
                  <ChevronUp
                    className={`h-4 w-4 text-slate-400 transition-transform ${myWorkOpen ? "" : "rotate-180"}`}
                    strokeWidth={2}
                  />
                </button>
                {myWorkOpen && (
                  <ul className="-mx-1 mt-1.5 space-y-1.5 p-1">
                    {myWorkShown.map((g) => {
                      return (
                        <li key={g.id}>
                          <button
                            type="button"
                            onClick={() => {
                              goHome(g.id);
                              leaveDigest();
                            }}
                            title={workGroupTitle(g)}
                            className="flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-left text-md text-slate-700 transition-colors hover:bg-slate-100"
                          >
                            {/* An incoming group is marked by a raised hand
                                in the colour of its severity. With anything
                                open it is waiting on you: the waiting tracer.
                                One you have fully answered drops the tracer
                                until it is filed. */}
                            <HandRaisedIcon severity={groupSeverity(g)} label={`Incoming request · ${groupSeverity(g) ?? "normal"} severity`} />
                            <WorkRowTitle line={groupSettled(g) ? null : WAITING_LINE}>
                              <WorkGroupTitle group={g} />
                            </WorkRowTitle>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <Link
                  to="/internal-ops/my-work"
                  className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 text-md font-medium text-brand-600 hover:text-brand-700 hover:underline"
                >
                  <CornerDownRight className="h-4 w-4" strokeWidth={2} aria-hidden />
                  All Needs Attention
                </Link>
              </section>
            )}

            <p className="px-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Conversations</p>
            {pinned.length > 0 && <SessionGroup label="Pinned" sessions={pinned} activeId={activeId} onSelect={pick} />}
            {open.length > 0 && <SessionGroup label="Today" sessions={open} activeId={activeId} onSelect={pick} />}
            {prior.length > 0 && <SessionGroup label="Prior" sessions={prior} activeId={activeId} onSelect={pick} />}
          </div>
        </aside>

        {/* ---------------- Conversation ---------------- */}
        {/* The home and the digest sit on a translucent card; an open
            conversation gets a solid one. The card runs from the header to
            the foot of the window, square, edged at the sides only. */}
        <section
          className={`flex min-h-0 min-w-0 flex-col overflow-hidden border-x border-slate-200/80 shadow-sm ${
            blank || digest ? "bg-white/65" : "bg-white"
          }`}
        >
          {/* A blank chat has no title yet; the home stands in for one. */}
          {!blank && !digest && (
            <header className="flex shrink-0 items-center gap-2.5 border-b border-slate-200 px-6 py-3.5">
              <h1 className="min-w-0 truncate text-base text-slate-700" title={active.title}>
                {active.title}
              </h1>
            </header>
          )}

          {digest ? (
            <StellaDigest resolved={view === "resolved"} />
          ) : blank ? (
            <StellaHome />
          ) : active.live ? (
            <StellaTranscript entries={active.entries} onAnswer={answer} busy={active.busy} />
          ) : (
            <div className="flex min-h-0 flex-1 items-center justify-center px-6">
              <p className="max-w-sm text-center text-base text-slate-400">
                This is an earlier conversation. Its transcript is not kept in the prototype — start a new chat to run
                the SOP composer.
              </p>
            </div>
          )}

          {/* The home carries its own box and the digest has none; the
              composer is for an open chat. */}
          {!blank && !digest && (
          <div className="shrink-0">
            <StellaComposer
              onSend={(text) => {
                send(text, undefined, undefined, modifying ?? undefined);
                setModifying(null);
              }}
              sopRef={modifying}
              onDetachSopRef={() => setModifying(null)}
              disabled={active.busy || !active.live}
              suggestion={suggestion}
              brandId={active.brandId}
              onBrandChange={active.live ? setBrand : undefined}
              // A group's conversation stays on the brand the group is about.
              brandLocked={Boolean(active.groupId)}
              placeholder="Ask Stella..."
            />
          </div>
          )}
        </section>

        {/* ---------------- Progress ----------------
            Only once the session has routed to a task. Until then there is no
            progress to show, and a rail of placeholders would be describing a
            workflow nobody has chosen yet. A task that writes SOPs shows its
            SOP cards here instead, straight on the page with no panel. */}
        {digest ? null : viewed && viewing ? (
          <aside className="min-h-0 pb-9 pt-8">
            <SopViewer
              key={`${viewed.id}-${viewing.section}`}
              draft={viewed}
              section={viewing.section}
              onClose={() => setViewing(null)}
              onModify={setModifying}
            />
          </aside>
        ) : drafts.length > 0 ? (
          <aside className="min-h-0 overflow-y-auto pb-9 pt-8">
            <p className="mb-3 text-base font-medium text-slate-700">Created</p>
            <div className="space-y-3">
              {drafts.map((d) => (
                <SopDraftCard key={d.id} draft={d} onOpen={(section) => setViewing({ draftId: d.id, section })} />
              ))}
            </div>
          </aside>
        ) : hasProgress && (
          <aside className="my-5 min-h-0 overflow-y-auto rounded-xl border border-slate-200/80 bg-white px-4 py-4 shadow-sm">
            <p className="mb-3 text-base font-medium text-slate-700">Progress</p>
            <ol className="space-y-3">
              {progress.map((step, i) => (
                <li key={step.label} className="flex items-start gap-2.5">
                  <span
                    className={`mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      step.state === "done"
                        ? "bg-emerald-100 text-emerald-700"
                        : step.state === "active"
                          ? "bg-brand-600 text-white"
                          : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-base leading-snug ${step.state === "todo" ? "text-slate-400" : "text-slate-800"}`}>
                      {step.label}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-slate-400">{step.detail}</span>
                  </span>
                </li>
              ))}
            </ol>

            {active.live && active.status === "done" && activeTask && (
              <p className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-snug text-emerald-800">
                {activeTask.doneNote}
              </p>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

// A run of conversations under a small label. Titles only; when it ran and
// what it was scoped to are on hover.
function SessionGroup({
  label,
  sessions,
  activeId,
  onSelect,
}: {
  label: string;
  sessions: StellaSession[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mt-4">
      <p className="mb-1.5 px-1 text-sm text-slate-400">{label}</p>
      <ul className="-mx-1 space-y-0.5">
        {sessions.map((s) => {
          const brand = s.brandId ? getBrand(s.brandId) : undefined;
          const selected = s.id === activeId;
          // A conversation from My Work is titled the way its group is.
          const group = workGroupById(s.groupId);
          // The tracer under the title and the dot beside it say what the
          // conversation is doing: thinking, waiting on you, or new to you.
          const { line, dot } = sessionIndicator(s);
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onSelect(s.id)}
                title={[s.title, s.when, brand?.name].filter(Boolean).join(" · ")}
                className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-md transition-colors ${
                  selected ? "bg-slate-200/70 text-slate-900" : `${group ? "text-slate-700" : "text-slate-600"} hover:bg-slate-100`
                }`}
              >
                {/* A conversation that came in from My Work keeps its
                    raised hand, now in neutral grey. */}
                {group && <HandRaisedIcon label="From Needs Your Attention" />}
                <WorkRowTitle line={line}>{group && !s.itemId ? <WorkGroupTitle group={group} /> : s.title}</WorkRowTitle>
                {dot && (
                  <span
                    role="img"
                    aria-label={SESSION_DOTS[dot].label}
                    title={SESSION_DOTS[dot].label}
                    className="ml-auto h-2 w-2 shrink-0 rounded-full"
                    style={{ background: SESSION_DOTS[dot].color }}
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
