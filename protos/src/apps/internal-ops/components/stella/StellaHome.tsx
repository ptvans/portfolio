// What the Stella page opens on: a greeting, the shortcuts, the box to talk
// to her in, and beneath it My Work — the messages she has grouped for you,
// each group with its responses and its own chat.

import { BellRing, ChevronDown, CornerDownRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CURRENT_USER_NAME } from "../../context/AlertsContext";
import { useStella } from "../../context/StellaContext";
import { MY_WORK_PREVIEW } from "../../data/myWork";
import { STELLA_STARTERS } from "../../data/stellaScript";
import { StellaComposer } from "./StellaComposer";
import { StellaIcon } from "./StellaIcon";
import { WorkGroupCard, WorkGroupTitle } from "./WorkGroupCard";

// The two shortcuts shown inline; the rest of the starters sit behind the
// chevron.
const SHORTCUTS: { label: string; prompt: string }[] = [
  { label: "Create an alert", prompt: "I want to make an alert." },
  { label: "Work order report summary", prompt: "Summarize the status of work orders created this week." },
];
const MORE_SHORTCUTS = STELLA_STARTERS.filter((s) => !SHORTCUTS.some((c) => c.prompt === s.prompt));

export function StellaHome() {
  const { active, send, setBrand, groups, inMyWork, groupSession } = useStella();
  const firstName = CURRENT_USER_NAME.split(" ")[0];
  // A group you have started a conversation with leaves the home: it lives
  // in that conversation, and on the digest.
  const withWork = groups.filter((g) => inMyWork(g) && !groupSession(g.id));
  // The first few groups; the rest are a count that leads to the digest.
  const shown = withWork.slice(0, MY_WORK_PREVIEW);
  const more = withWork.length - shown.length;

  return (
    // The id lets the sidebar's New Chat and home buttons scroll this back
    // to the top and put the cursor in the box.
    <div id="stella-home" className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-8">
      <div className="mx-auto max-w-[27rem] sm:max-w-xl">
        <div className="flex items-center justify-center gap-3">
          <StellaIcon size={28} />
          <h1 className="text-lg text-slate-700">Back again, {firstName}</h1>
        </div>

        <Shortcuts onPick={send} />

        <div className="mt-2">
          <StellaComposer
            compact
            autoFocus
            onSend={(text) => send(text)}
            disabled={active.busy}
            brandId={active.brandId}
            onBrandChange={setBrand}
            placeholder="Ask Stella..."
          />
        </div>

        <Reminders />

        {shown.length > 0 && (
          <div className="mt-9 space-y-7">
            {shown.map((g) => (
              <WorkGroupCard key={g.id} group={g} resolvable />
            ))}
            {more > 0 && (
              <Link
                to="/internal-ops/my-work"
                className="inline-flex items-center gap-1.5 px-1 text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline"
              >
                <CornerDownRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                Needs Your Attention Digest · {more} more {more === 1 ? "group" : "groups"}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Group conversations Stella has waited in for six hours or more, as alerts
// above the groups: which group, how long, and the way back into it.
function Reminders() {
  const { reminders, dismissReminder, select } = useStella();
  if (reminders.length === 0) return null;
  return (
    <div className="mt-7 space-y-2">
      {reminders.map(({ session, group, since }) => {
        const hours = Math.floor((Date.now() - since) / (60 * 60 * 1000));
        return (
          <div
            key={session.id}
            role="status"
            className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/80 py-2 pl-3.5 pr-2 text-sm"
          >
            <BellRing className="h-4 w-4 shrink-0 text-amber-600" strokeWidth={2} aria-hidden />
            <p className="min-w-0 flex-1 truncate text-slate-600">
              <span className="font-medium text-slate-800">Stella is waiting on your reply</span> · <WorkGroupTitle group={group} /> ·{" "}
              <span className="text-slate-500">{hours}h</span>
            </p>
            <button
              type="button"
              onClick={() => select(session.id)}
              className="shrink-0 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
            >
              View conversation
            </button>
            <button
              type="button"
              onClick={() => dismissReminder(session.id)}
              aria-label="Dismiss reminder"
              title="Dismiss"
              className="shrink-0 rounded p-1 text-slate-400 hover:bg-amber-100 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function Shortcuts({ onPick }: { onPick: (prompt: string) => void }) {
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

  const chip =
    "rounded-md bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-100 hover:text-brand-700";

  return (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
      {SHORTCUTS.map((s) => (
        <button key={s.label} type="button" onClick={() => onPick(s.prompt)} className={chip}>
          {s.label}
        </button>
      ))}
      <div ref={wrap} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="More shortcuts"
          className={`flex h-6 w-7 items-center justify-center rounded-md transition-colors ${
            open ? "bg-slate-200 text-slate-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
          }`}
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2.25} />
        </button>
        {open && (
          <ul
            role="menu"
            className="absolute right-0 top-full z-20 mt-2.5 w-[21rem] rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
          >
            {MORE_SHORTCUTS.map((s) => (
              <li key={s.label} role="none">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    onPick(s.prompt);
                  }}
                  className="block w-full rounded-lg px-3.5 py-2.5 text-left text-sm text-slate-700 hover:bg-brand-50 hover:text-brand-700"
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
