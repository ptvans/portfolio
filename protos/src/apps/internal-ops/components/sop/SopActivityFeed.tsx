// What the SOP did, on its page: every entry from every run, grouped by run
// and newest first. A run's header counts its entries by type, so a run where
// nothing happened reads as one line and a run that raised an alert stands
// out. Chips filter by type; a long run shows its first entries and offers the
// rest. Times are Central, Austin's zone, labelled, with UTC on hover.

import { ChevronRight, ListChecks } from "lucide-react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../../../../components/EmptyState";
import { activityForSop, type SopActivityEntry, type SopActivityRun, type SopActivityType } from "../../../../data";
import type { Sop } from "../../../../types/domain";
import { RichText } from "./SopText";

const ZONE = "America/Chicago";
const ZONE_LABEL = "CT";
const FIRST_ENTRIES = 8;

type Filter = "all" | SopActivityType;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "alert", label: "Alerts" },
  { key: "action", label: "Actions" },
  { key: "proposal", label: "Proposals" },
  { key: "check", label: "Checks" },
];

const TYPE_LABEL: Record<SopActivityType, [string, string]> = {
  alert: ["alert", "alerts"],
  action: ["action", "actions"],
  proposal: ["proposal", "proposals"],
  check: ["check", "checks"],
};

const TYPE_STYLE: Record<SopActivityType, string> = {
  alert: "border-orange-200 bg-orange-50 text-orange-700",
  action: "border-emerald-200 bg-emerald-50 text-emerald-700",
  proposal: "border-violet-200 bg-violet-50 text-violet-700",
  check: "border-sky-200 bg-sky-50 text-sky-700",
};

// The order counts read in a run header: what needs a look first.
const TYPE_ORDER: SopActivityType[] = ["alert", "proposal", "action", "check"];

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: ZONE });
const date = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: ZONE });

// "9:02–9:05 AM", "11:58 AM–12:03 PM", or across days "Sep 6, 6:00 PM – Sep 7, 10:20 AM".
function range(startIso: string, endIso: string): string {
  const a = time(startIso);
  const b = time(endIso);
  if (date(startIso) !== date(endIso)) return `${date(startIso)}, ${a} – ${date(endIso)}, ${b}`;
  if (a === b) return a;
  const [aTime, aMer] = a.split(" ");
  const [bTime, bMer] = b.split(" ");
  return aMer === bMer ? `${aTime}–${bTime} ${bMer}` : `${a}–${b}`;
}

// The full stamp, and UTC, the clock the schedule is written in.
function zonesTitle(iso: string): string {
  const d = new Date(iso);
  const ct = d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: ZONE });
  const utc = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  return `${ct} ${ZONE_LABEL} (Austin) · ${utc} UTC`;
}

function counts(entries: SopActivityEntry[]): Partial<Record<SopActivityType, number>> {
  const c: Partial<Record<SopActivityType, number>> = {};
  for (const e of entries) c[e.type] = (c[e.type] ?? 0) + 1;
  return c;
}

export function SopActivityFeed({ sop, pending, className = "" }: { sop: Sop; pending?: SopActivityRun; className?: string }) {
  const history = useMemo(() => activityForSop(sop), [sop]);
  const runs = pending ? [pending, ...history] : history;
  const [filter, setFilter] = useState<Filter>("all");
  // The newest run opens; the rest start folded to their header.
  const [open, setOpen] = useState<Set<string>>(() => new Set(runs[0] ? [runs[0].id] : []));
  const [shown, setShown] = useState<Record<string, number>>({});

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // A manual run opens as soon as it appears.
  const pendingId = pending?.id;
  useLayoutEffect(() => {
    if (pendingId) setOpen((prev) => new Set(prev).add(pendingId));
  }, [pendingId]);

  const visible = runs
    .map((run) => ({ run, entries: filter === "all" ? run.entries : run.entries.filter((e) => e.type === filter) }))
    .filter((r) => r.entries.length > 0);

  return (
    <section aria-labelledby="sop-activity" className={`min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-slate-200 px-3 py-3 md:px-5">
        <h2 id="sop-activity" className="text-base font-semibold text-slate-900">
          Activity
        </h2>
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
          Live · times in {ZONE_LABEL}, Austin
        </span>
      </div>

      <div role="group" aria-label="Filter by type" className="flex flex-wrap gap-1.5 px-3 py-2.5 md:px-5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3 py-0.5 text-xs font-medium transition-colors ${
              filter === f.key ? "border-brand-200 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="border-t border-slate-100 px-4 py-10">
          <EmptyState
            icon={ListChecks}
            title={runs.length === 0 ? "No runs yet" : "Nothing of this type"}
            description={runs.length === 0 ? "What this SOP does on each run will show here." : "No run has an entry of this type. Pick another filter."}
          />
        </div>
      ) : (
        visible.map(({ run, entries }) => (
          <RunGroup
            key={run.id}
            run={run}
            entries={entries}
            open={open.has(run.id)}
            onToggle={() => toggle(run.id)}
            limit={shown[run.id] ?? FIRST_ENTRIES}
            onShowAll={() => setShown((s) => ({ ...s, [run.id]: Infinity }))}
          />
        ))
      )}
    </section>
  );
}

function RunGroup({
  run,
  entries,
  open,
  onToggle,
  limit,
  onShowAll,
}: {
  run: SopActivityRun;
  entries: SopActivityEntry[];
  open: boolean;
  onToggle: () => void;
  limit: number;
  onShowAll: () => void;
}) {
  const c = counts(run.entries);
  const alerted = (c.alert ?? 0) > 0;
  const quiet = !c.alert && !c.action && !c.proposal;
  const rest = entries.length - limit;
  const running = run.running === true;

  return (
    <div className="border-t border-slate-200">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`flex w-full flex-wrap items-center gap-x-2.5 gap-y-1 px-3 py-2.5 text-left text-sm transition-colors md:px-5 ${
          alerted ? "bg-orange-50/60 shadow-[inset_3px_0_0] shadow-orange-400 hover:bg-orange-50" : "bg-slate-50 hover:bg-slate-100"
        }`}
      >
        <ChevronRight className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-90" : ""}`} strokeWidth={2} aria-hidden />
        <span className="font-semibold text-slate-900">{date(run.startedAt)}</span>
        <span className="text-slate-600">{run.label}</span>
        <span className="text-slate-500" title={`${zonesTitle(run.startedAt)} → ${zonesTitle(run.endedAt)}`}>
          {range(run.startedAt, run.endedAt)} {ZONE_LABEL}
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          {running && <span className="rounded border border-brand-200 bg-brand-50 px-1.5 text-xs leading-5 text-brand-700">Running</span>}
          {TYPE_ORDER.filter((t) => c[t]).map((t) => (
            <span key={t} className={`rounded border px-1.5 text-xs leading-5 whitespace-nowrap ${TYPE_STYLE[t]}`}>
              {c[t]} {TYPE_LABEL[t][c[t] === 1 ? 0 : 1]}
            </span>
          ))}
          {quiet && !running && <span className="text-xs text-slate-500">No alerts or changes</span>}
        </span>
      </button>

      {open && (
        <>
          <ol>
            {entries.slice(0, limit).map((e) => (
              <Entry key={e.id} entry={e} />
            ))}
          </ol>
          {rest > 0 && (
            <button
              type="button"
              onClick={onShowAll}
              className="block w-full border-t border-slate-100 px-3 py-2.5 text-left text-sm font-medium text-brand-700 hover:bg-slate-50 md:px-5"
            >
              Show {rest} more from this run
            </button>
          )}
        </>
      )}
    </div>
  );
}

function Entry({ entry }: { entry: SopActivityEntry }) {
  return (
    <li className="grid grid-cols-1 gap-1 border-t border-slate-100 px-3 py-2.5 md:grid-cols-[4.5rem_minmax(0,1fr)] md:gap-3 md:px-5">
      <time dateTime={entry.at} title={zonesTitle(entry.at)} className="text-xs leading-5 whitespace-nowrap text-slate-500 tabular-nums">
        {time(entry.at)}
        <span className="ml-1 text-[11px] text-slate-400 md:ml-0 md:block md:leading-4">{ZONE_LABEL}</span>
      </time>
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className={`rounded border px-1.5 text-xs leading-5 capitalize ${TYPE_STYLE[entry.type]}`}>{TYPE_LABEL[entry.type][0]}</span>
          {entry.subject.to ? (
            <Link to={entry.subject.to} className="min-w-0 text-sm font-medium text-brand-700 hover:underline">
              {entry.subject.label}
            </Link>
          ) : (
            <span className="min-w-0 text-sm font-medium text-slate-800">{entry.subject.label}</span>
          )}
        </div>
        <Summary text={entry.summary} />
      </div>
    </li>
  );
}

// Clamped to two lines (three on a phone), with a toggle only when the text
// is actually cut off.
function Summary({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [cut, setCut] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || expanded) return;
    const measure = () => setCut(el.scrollHeight > el.clientHeight + 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [expanded, text]);

  return (
    <div className="mt-0.5 max-w-[68ch]">
      <p ref={ref} className={`text-sm leading-relaxed text-slate-600 ${expanded ? "" : "line-clamp-3 md:line-clamp-2"}`}>
        <RichText text={text} />
      </p>
      {(cut || expanded) && (
        <button type="button" onClick={() => setExpanded((v) => !v)} className="text-xs font-medium text-brand-700 hover:underline">
          {expanded ? "Less" : "More"}
        </button>
      )}
    </div>
  );
}
