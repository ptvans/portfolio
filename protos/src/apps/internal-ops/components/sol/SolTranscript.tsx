// The conversation itself: what the user said, what Sol said, the tools it
// called on the way, and the SOP that came out the other end.
//
// Tool calls are shown rather than hidden. The point of the task is that a
// person can check the agent's reading of their document, and that starts with
// seeing which calls it made and what came back.

import { Check, CornerDownRight, FileText, GitBranch, MessageSquare, Pencil, Route, Terminal, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BrandChip } from "../../../../components/BrandChip";
import { getBrand, getSop, runsForSop } from "../../../../data";
import { alerts } from "../../../../data/alerts";
import { formatDateTime, formatRelative } from "../../../../lib/format";
import { SolIcon } from "./SolIcon";
import type { SolEntry } from "../../data/solScript";
import { linkAlertText } from "../alerts/AlertCard";
import { MessageMetaCard } from "../messages/MessageMeta";
import { severityBorderClass } from "../alerts/alertUi";
import { formatElapsedMs } from "../sop/sopFormat";
import { ProposalsCard, QuestionsCard, SopListCard } from "./SopBuilderCards";
import { WorkAllEntry, WorkEntry } from "./WorkGroupCard";

export function SolTranscript({
  entries,
  onChoose,
  onAnswer,
  busy = false,
}: {
  entries: SolEntry[];
  // Picks a response on a choice card. Without it the cards are read-only.
  onChoose?: (option: number) => void;
  // Sends the picks on a questions card. Without it the cards are read-only.
  onAnswer?: (entryId: string, picks: Record<string, number>) => void;
  busy?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [, tick] = useState(0);
  const running = entries.some((e) => e.kind === "status" && e.endedAt === null);

  // Keep the elapsed clock on an open status moving.
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  // Follow the conversation as it grows. A request nobody has answered yet
  // opens at the top instead, so it reads from the ask down, and a new card of
  // questions is brought in from its top, so it reads from the first question.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const last = entries[entries.length - 1];
    const card = listRef.current?.lastElementChild as HTMLElement | null;
    if (last?.kind === "questions" && !last.picks && card) {
      el.scrollTop = card.offsetTop - 24;
      return;
    }
    el.scrollTop = entries.some((e) => e.kind === "user") ? el.scrollHeight : 0;
  }, [entries]);

  return (
    <div ref={scrollRef} className="thin-scrollbar relative min-h-0 flex-1 overflow-y-auto px-6 py-6">
      <div ref={listRef} className="mx-auto flex max-w-4xl flex-col gap-6">
        {entries.map((entry, i) => (
          <SolEntryView key={i} entry={entry} onChoose={onChoose} onAnswer={busy ? undefined : onAnswer} busy={busy} />
        ))}
      </div>
    </div>
  );
}

// One transcript entry. Exported for surfaces that lay a conversation out
// themselves (the Messages pane).
export function SolEntryView({
  entry,
  onChoose,
  onAnswer,
  busy,
}: {
  entry: SolEntry;
  onChoose?: (option: number) => void;
  onAnswer?: (entryId: string, picks: Record<string, number>) => void;
  busy?: boolean;
}) {
  switch (entry.kind) {
    case "user":
      // The brand the message is scoped to is shown on the composer, not
      // repeated on each bubble.
      return (
        <div className="ml-12 max-w-2xl self-end rounded-2xl bg-brand-50 px-4 py-3 text-md leading-relaxed text-slate-800">
          {/* The part of a SOP the message is about, quoted above it. */}
          {entry.sopRef && (
            <div className="mb-2 border-l-2 border-brand-300 pl-2.5 text-xs">
              <p className="flex items-center gap-1.5 font-medium text-brand-700">
                <Pencil className="h-3 w-3 shrink-0" strokeWidth={2.25} aria-hidden />
                {entry.sopRef.draftName} › {entry.sopRef.label}
              </p>
              <p className="mt-0.5 line-clamp-2 text-slate-500">{entry.sopRef.excerpt}</p>
            </div>
          )}
          <p className="whitespace-pre-wrap break-words">{entry.text}</p>
        </div>
      );

    case "agent":
      return <AgentText text={entry.text} heading={entry.heading} alertId={entry.alertId} noteId={entry.noteId} />;

    case "choice":
      return (
        <div className="ml-[34px]">
          <ActionsCard options={entry.options} chosen={entry.chosen} onChoose={busy ? undefined : onChoose} />
        </div>
      );

    case "status": {
      const end = entry.endedAt ?? Date.now();
      return (
        <div className="flex items-center gap-2">
          <SolIcon size={20} thinking={!entry.endedAt} />
          <p className={`text-base italic ${entry.endedAt ? "text-slate-400" : "text-brand-600"}`}>{entry.label}</p>
          <p className="text-xs tabular-nums text-slate-400">{formatElapsedMs(end - entry.startedAt)}</p>
        </div>
      );
    }

    case "tool":
      return (
        <div
          className={`rounded-xl border px-3 py-2 ${entry.ok ? "border-slate-200 bg-white" : "border-amber-200 bg-amber-50/60"}`}
        >
          <div className="flex items-center gap-1.5">
            {entry.ok ? (
              <Terminal className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={2} aria-hidden />
            ) : (
              <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-amber-600" strokeWidth={2} aria-hidden />
            )}
            <code className="break-all font-mono text-[11px] text-slate-700">
              {entry.tool}
              <span className="text-slate-400">({entry.args})</span>
            </code>
          </div>
          <p className={`mt-1 pl-5 text-xs ${entry.ok ? "text-slate-500" : "text-amber-900"}`}>{entry.result}</p>
        </div>
      );

    case "artifact":
      return <ArtifactCard entry={entry} />;

    case "proposals":
      return <ProposalsCard entry={entry} />;

    case "questions":
      return <QuestionsCard entry={entry} onAnswer={onAnswer} />;

    case "sopList":
      return <SopListCard entry={entry} />;

    case "work":
      return <WorkEntry entry={entry} />;

    case "workAll":
      return <WorkAllEntry entry={entry} />;
  }
}

// Sol's prose. Lines that start with a bullet or a number are drawn as a
// list so the gaps she reports read as a list rather than a paragraph. A
// heading titles the message; an alert is drawn under it as the source, and a
// note as its message's metadata.
function AgentText({ text, heading, alertId, noteId }: { text: string; heading?: string; alertId?: string; noteId?: string }) {
  const alert = alertId ? alerts.find((a) => a.id === alertId) : undefined;
  return (
    <div className="flex items-start gap-3">
      <SolIcon size={20} className={heading ? "mt-0.5" : "mt-[3px]"} />
      <div className="min-w-0 max-w-2xl flex-1 space-y-2 text-md leading-relaxed text-slate-700">
      {heading && <p className="font-semibold text-slate-900">{heading}</p>}
      {text.split("\n\n").map((para, i) => {
        const lines = para.split("\n");
        const listy = lines.length > 1 && lines.every((l) => /^\s*(•|\d+\.)\s/.test(l));
        if (listy) {
          return (
            <ul key={i} className="space-y-1.5 pl-1">
              {lines.map((line, j) => (
                <li key={j} className="flex gap-2">
                  <span className="shrink-0 text-brand-400">{line.match(/^\s*(•|\d+\.)/)?.[1]}</span>
                  <span className="min-w-0">{renderCode(line.replace(/^\s*(•|\d+\.)\s*/, ""))}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            {renderCode(para)}
          </p>
        );
      })}
      {alert && (
        <>
          <p className="flex items-center gap-1.5 text-base text-slate-400">
            <CornerDownRight className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
            From {titleCase(alert.entity.kind)}:
          </p>
          <SourceAlert alert={alert} />
        </>
      )}
      {noteId && <MessageMetaCard messageId={`note:${noteId}`} />}
      </div>
    </div>
  );
}

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

// The alert a request came from, compact: what happened with the record
// linked, how long ago, whose it is, and the way into the alert list.
function SourceAlert({ alert }: { alert: (typeof alerts)[number] }) {
  const brand = getBrand(alert.brandId);
  const linked = linkAlertText(alert);
  return (
    <article
      className={`max-w-md rounded-lg border border-l-4 border-y-slate-200 border-r-slate-200 bg-white py-3 pl-4 pr-4 shadow-sm ${severityBorderClass(alert.severity)}`}
    >
      <div className="flex items-start gap-2.5">
        <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" strokeWidth={1.75} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold leading-snug text-slate-900">{linked.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">{linked.description}</p>
          <div className="mt-2 flex items-center gap-2.5 text-sm text-slate-400">
            <span title={formatDateTime(alert.createdAt)}>{formatRelative(alert.createdAt)}</span>
            {brand && <BrandChip name={brand.name} color={brand.color} />}
            <Link to={`/internal-ops/messages?item=alert:${alert.id}`} className="ml-auto font-medium text-brand-600 hover:text-brand-700 hover:underline">
              Open
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

// The responses Sol can act on, numbered with what each one does, and a
// button per response. Once one is picked the card stays as the record: the
// choice keeps its button, marked, and the other is struck from play.
export function ActionsCard({
  options,
  chosen,
  onChoose,
}: {
  options: { label: string; description: string }[];
  chosen: number | null;
  onChoose?: (option: number) => void;
}) {
  const decided = chosen !== null;
  return (
    <div className="max-w-md rounded-xl border border-brand-100 bg-brand-50/60 px-5 py-4">
      <p className="flex items-center gap-2.5 text-md font-semibold text-slate-900">
        <Route className="h-4 w-4 shrink-0 text-brand-500" strokeWidth={2} aria-hidden />
        Actions
      </p>
      <ol className="mt-2 list-decimal space-y-1 pl-11 text-base text-slate-600 marker:text-slate-500">
        {options.map((o) => (
          <li key={o.label}>{o.description}</li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap justify-end gap-3">
        {options.map((o, i) => {
          const picked = chosen === i;
          return (
            <button
              key={o.label}
              type="button"
              disabled={decided || !onChoose}
              onClick={() => onChoose?.(i)}
              aria-pressed={picked}
              className={`inline-flex min-w-[8rem] items-center justify-center gap-1.5 rounded-md px-4 py-1.5 text-base font-semibold text-white transition-colors ${
                picked
                  ? "bg-brand-600"
                  : decided
                    ? "bg-brand-500 opacity-35"
                    : "bg-brand-500 hover:bg-brand-600 disabled:opacity-50"
              }`}
            >
              {picked && <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />}
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// `backticked` spans become code, so tool names read as tool names.
function renderCode(text: string) {
  return text.split(/(`[^`]+`)/g).map((part, i) =>
    part.startsWith("`") && part.endsWith("`") ? (
      <code key={i} className="break-all rounded bg-slate-100 px-1 py-0.5 font-mono text-[11.5px] text-slate-700">
        {part.slice(1, -1)}
      </code>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

// The finished SOP, with the three ways into it: the definition as written,
// one execution of it, and every execution at once.
function ArtifactCard({ entry }: { entry: Extract<SolEntry, { kind: "artifact" }> }) {
  const runs = runsForSop(entry.sopId);
  const latest = runs[0];
  // Link the SOP's current version, not v1 — these SOPs have history.
  const version = getSop(entry.sopId)?.version ?? 1;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-2">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" strokeWidth={2} aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{entry.title}</p>
          <p className="mt-0.5 text-xs text-slate-500">{entry.summary}</p>
        </div>
        <span className="ml-auto shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
          {entry.status}
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <ViewLink
          to={`/internal-ops/sops/${entry.sopId}/versions/${version}`}
          icon={FileText}
          title="Definition"
          body="The Automation as written, with the tool calls beside each section"
        />
        <ViewLink
          to={latest ? `/internal-ops/sops/${entry.sopId}/runs/${latest.id}` : `/internal-ops/sops/${entry.sopId}`}
          icon={Check}
          title="A run"
          body={latest ? `${latest.label} — what each step did` : "No runs yet"}
        />
        <ViewLink
          to={`/internal-ops/sops/${entry.sopId}/analysis`}
          icon={GitBranch}
          title="Analysis"
          body={`All ${runs.length} sweeps: time, issues, branches, gaps`}
        />
      </div>
    </div>
  );
}

function ViewLink({
  to,
  icon: Icon,
  title,
  body,
}: {
  to: string;
  icon: typeof FileText;
  title: string;
  body: string;
}) {
  return (
    <Link
      to={to}
      className="group rounded-lg border border-slate-200 px-3 py-2 transition-colors hover:border-brand-300 hover:bg-brand-50"
    >
      <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 group-hover:text-brand-700">
        <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        {title}
      </p>
      <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{body}</p>
    </Link>
  );
}
