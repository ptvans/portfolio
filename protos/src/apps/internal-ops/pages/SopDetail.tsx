// The SOP page: what an SOP's name opens from the index, a brand page or a
// message. A summary header (title and status, the description, one line of
// facts, and the run controls), then the two things people come here for:
// Activity, what the SOP did on each run, and Instructions, its text as written.
//
// From 1200px the two sit side by side, Instructions pinned beside the feed
// and scrolling on its own, so an entry and the rule it applied can be read
// together; above 1600px the page stops widening at 1680px. Below 1200px they
// become tabs, Activity first. On a phone the header stacks and the less used
// controls move into the ⋯ menu. Prose is capped at 72ch throughout, which in
// this font keeps every line under ~100 characters.

import { Ban, Ellipsis, Pencil, Play, RefreshCw, Workflow } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { EmptyState } from "../../../components/EmptyState";
import { runsForSop, type SopActivityRun } from "../../../data";
import { mockNow } from "../../../lib/format";
import type { Sop } from "../../../types/domain";
import { Breadcrumbs } from "../components/alerts/alertUi";
import { SopActivityFeed } from "../components/sop/SopActivityFeed";
import { SopInstructions } from "../components/sop/SopInstructions";
import { SOP_STATUS_STYLE } from "../components/sop/sopFormat";
import { operatesOn, scheduleForSop } from "../components/sop/sopSchedule";
import { useMessages } from "../context/MessagesContext";
import { useSops } from "../context/SopContext";

type Tab = "activity" | "instructions";

const TABS: { key: Tab; label: string }[] = [
  { key: "activity", label: "Activity" },
  { key: "instructions", label: "Instructions" },
];

// Older links named the tabs this page replaced: the definition is now the
// instructions; messages and the log are now the activity.
function tabFrom(param: string | null): Tab {
  return param === "instructions" || param === "definition" || param === "versions" ? "instructions" : "activity";
}

const CRUMBS = [{ label: "SOPs", to: "/internal-ops/sops/list" }];

export function SopDetail() {
  const { id } = useParams<{ id: string }>();
  const { getSop } = useSops();
  const sop = getSop(id);

  if (!sop) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 py-4 md:px-6">
          <Breadcrumbs items={CRUMBS} />
          <EmptyState icon={Workflow} title="SOP not found" description={`No SOP with id "${id}".`} />
        </div>
      </div>
    );
  }
  // Keyed so the page's own state starts over for another SOP.
  return <SopPage key={sop.id} sop={sop} />;
}

// "Daily 9:00 AM", read off the trigger when the SOP has no fixed schedule.
// The trigger sentence names its own zone, if any, so the hover shows it.
function runsLabel(sop: Sop): { label: string; detail: string } {
  if (sop.schedule) return { label: sop.schedule.summary, detail: sop.schedule.rule };
  const { cadence, time } = scheduleForSop(sop);
  const label = {
    day: `Daily ${time}`,
    week: `Weekly, Mon ${time}`,
    month: `Monthly, 1st ${time}`,
    event: "When triggered",
  }[cadence];
  return { label, detail: sop.trigger };
}

// Every time on the page is Central, Austin's zone.
const stamp = (iso: string) =>
  `${new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" })} CT`;

function SopPage({ sop }: { sop: Sop }) {
  const [params, setParams] = useSearchParams();
  const { setStatus } = useSops();
  const { messages } = useMessages();
  const tab = tabFrom(params.get("tab"));
  const setTab = (next: Tab) => {
    const p = new URLSearchParams(params);
    p.set("tab", next);
    setParams(p, { replace: true });
  };

  const runs = runsForSop(sop.id);
  const openMessages = messages.filter((m) => m.sopId === sop.id && !["resolved", "archived", "snoozed"].includes(m.status));
  const schedule = runsLabel(sop);

  // Run now starts a run in the feed (page state only: the prototype has no
  // runner). Refresh only spins; the feed is already live.
  const [manualRun, setManualRun] = useState<SopActivityRun>();
  const [refreshing, setRefreshing] = useState(false);
  const runNow = () => {
    const at = mockNow().toISOString();
    setManualRun({
      id: `manual-${sop.id}`,
      label: "Manual run",
      startedAt: at,
      endedAt: at,
      running: true,
      entries: [
        {
          id: `manual-${sop.id}-start`,
          at,
          type: "check",
          subject: { label: "Run started" },
          summary: "Started by you from the SOP page. Entries appear here as the run works through the instructions.",
        },
      ],
    });
    setTab("activity");
  };
  const refresh = () => {
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 700);
  };

  const canStop = sop.status === "active";
  const canResume = sop.status === "paused";
  const toggleRuns = () => setStatus(sop.id, canStop ? "paused" : "active");

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[1680px] px-4 pb-8 pt-3 md:px-6 md:pt-4 min-[1200px]:px-8">
        <Breadcrumbs items={CRUMBS} />

        <header className="mb-4 flex flex-col gap-3 md:mb-5 md:flex-row md:items-start md:justify-between md:gap-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <h1 className="text-xl font-semibold leading-snug text-slate-900 md:text-2xl">{sop.name}</h1>
              <span className={`rounded-md px-2 py-0.5 text-xs font-semibold capitalize ${SOP_STATUS_STYLE[sop.status]}`}>{sop.status}</span>
            </div>
            <p className="mt-1 max-w-[72ch] text-[15px] leading-relaxed text-slate-600 max-md:line-clamp-3">
              {sop.purpose || "No description yet."}
            </p>
            <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <Fact label="Runs">
                <span title={schedule.detail} className="cursor-help underline decoration-slate-300 decoration-dotted underline-offset-4">
                  {schedule.label}
                </span>
              </Fact>
              <Fact label="Owner">{sop.ownerName}</Fact>
              <Fact label="Subject">{operatesOn(sop)}</Fact>
              <Fact label="Version">
                v{sop.version} · {stamp(sop.updatedAt)}
              </Fact>
              {openMessages.length > 0 && (
                <Fact label="Messages">
                  <Link to={`/internal-ops/messages?ids=${openMessages.map((m) => m.id).join(",")}`} className="text-brand-700 hover:underline">
                    {openMessages.length} open
                  </Link>
                </Fact>
              )}
            </dl>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={runNow} disabled={sop.status === "archived"} className={`${BTN} max-md:flex-1 max-md:justify-center`}>
              <Play className="h-4 w-4" strokeWidth={2} aria-hidden />
              Run now
            </button>
            {(canStop || canResume) && (
              <button
                type="button"
                onClick={toggleRuns}
                className={`${canStop ? BTN_DANGER : BTN} max-md:hidden`}
              >
                {canStop ? <Ban className="h-4 w-4" strokeWidth={2} aria-hidden /> : <Play className="h-4 w-4" strokeWidth={2} aria-hidden />}
                {canStop ? "Stop runs" : "Resume runs"}
              </button>
            )}
            <Link to={`/internal-ops/sops/${sop.id}/versions/${sop.version}`} className={BTN_PRIMARY}>
              <Pencil className="h-4 w-4" strokeWidth={2} aria-hidden />
              Edit
            </Link>
            <button type="button" onClick={refresh} title="Refresh" aria-label="Refresh" className={`${ICON_BTN} max-md:hidden`}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} strokeWidth={2} aria-hidden />
            </button>
            <Menu label="More">
              {(close) => (
                <>
                  {(canStop || canResume) && (
                    <MenuItem
                      className="md:hidden"
                      danger={canStop}
                      onClick={() => {
                        toggleRuns();
                        close();
                      }}
                    >
                      {canStop ? "Stop runs" : "Resume runs"}
                    </MenuItem>
                  )}
                  <MenuItem
                    className="md:hidden"
                    onClick={() => {
                      refresh();
                      close();
                    }}
                  >
                    Refresh
                  </MenuItem>
                  {runs.length > 0 && <MenuLink to={`/internal-ops/sops/${sop.id}/analysis`}>Analysis</MenuLink>}
                  {runs[0] && <MenuLink to={`/internal-ops/sops/${sop.id}/runs/${runs[0].id}`}>Open latest run</MenuLink>}
                  {sop.source && (
                    <a href={sop.source.url} target="_blank" rel="noreferrer" role="menuitem" className={MENU_ROW}>
                      Open in the Notion SOP Hub
                    </a>
                  )}
                </>
              )}
            </Menu>
          </div>
        </header>

        <div role="tablist" aria-label="SOP sections" className="mb-4 flex gap-6 border-b border-slate-200 min-[1200px]:hidden">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`-mb-px border-b-2 px-0.5 py-2.5 text-sm font-medium transition-colors ${
                tab === t.key ? "border-brand-500 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 items-start gap-6 min-[1200px]:grid-cols-[minmax(0,1fr)_clamp(480px,42%,760px)]">
          <SopActivityFeed sop={sop} pending={manualRun} className={tab === "activity" ? "" : "max-[1199px]:hidden"} />
          <SopInstructions
            sop={sop}
            className={`min-[1200px]:sticky min-[1200px]:top-4 min-[1200px]:max-h-[calc(100dvh-5.5rem)] ${tab === "instructions" ? "" : "max-[1199px]:hidden"}`}
            bodyClassName="min-[1200px]:overflow-y-auto"
          />
        </div>
      </div>
    </div>
  );
}

const BTN_BASE = "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium whitespace-nowrap transition-colors disabled:opacity-50";
const BTN = `${BTN_BASE} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`;
const BTN_DANGER = `${BTN_BASE} border-red-300 bg-white text-red-600 hover:bg-red-50`;
const BTN_PRIMARY = `${BTN_BASE} border-brand-600 bg-brand-600 text-white hover:bg-brand-700`;
const ICON_BTN =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-50";
const MENU_ROW = "block w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50";

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 gap-1.5">
      <dt className="text-slate-500">{label}</dt>
      <dd className="min-w-0 text-slate-800">{children}</dd>
    </div>
  );
}

// The ⋯ button and its list. Closes on a click outside or Escape.
function Menu({ label, children }: { label: string; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
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
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} aria-label={label} title={label} className={ICON_BTN}>
        <Ellipsis className="h-4 w-4" strokeWidth={2} aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-1.5 w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function MenuItem({ onClick, danger, className = "", children }: { onClick: () => void; danger?: boolean; className?: string; children: ReactNode }) {
  return (
    <button type="button" role="menuitem" onClick={onClick} className={`${MENU_ROW} ${danger ? "text-red-600" : ""} ${className}`}>
      {children}
    </button>
  );
}

function MenuLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} role="menuitem" className={MENU_ROW}>
      {children}
    </Link>
  );
}
