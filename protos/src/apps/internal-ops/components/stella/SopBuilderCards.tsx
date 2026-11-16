// The cards the SOP builder puts in the conversation while it turns a source
// document into SOPs: the SOPs it proposes, the questions it needs answered
// before it can write them, and where each SOP ended up.

import { Check, CornerDownRight, TriangleAlert } from "lucide-react";
import { useState } from "react";
import type { SopProposal, StellaEntry } from "../../data/stellaScript";
import { MessageTypeBadge } from "../messages/messageUi";

// One proposed SOP: what it runs over, and the page's steps it keeps.
function ProposalBody({ sop }: { sop: SopProposal }) {
  return (
    <>
      <p className="text-sm leading-relaxed text-slate-600">
        {sop.summary}
        {sop.note && <span className="font-semibold text-slate-800"> {sop.note}</span>}
      </p>
      <ul className="mt-1.5 space-y-0.5">
        {sop.steps.map((step) => (
          <li key={step} className="flex items-start gap-1.5 text-sm text-slate-500">
            <CornerDownRight className="mt-[3px] h-3.5 w-3.5 shrink-0 text-slate-300" strokeWidth={2} aria-hidden />
            {step}
          </li>
        ))}
      </ul>
    </>
  );
}

export function ProposalsCard({ entry }: { entry: Extract<StellaEntry, { kind: "proposals" }> }) {
  return (
    <div className="ml-[34px] max-w-3xl space-y-2.5">
      {entry.sops.map((sop, i) => (
        <article key={sop.name} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="mb-1.5 flex items-center gap-2">
            <MessageTypeBadge type="sop" size={20} />
            <p className="min-w-0 flex-1 text-base font-semibold text-slate-900">{sop.name}</p>
            <span className="shrink-0 text-xs text-slate-400">
              Automation {i + 1} of {entry.sops.length}
            </span>
          </div>
          <ProposalBody sop={sop} />
        </article>
      ))}
    </div>
  );
}

// Questions with options to pick. Each starts on Stella's suggestion; nothing
// goes out until the answers are sent, and once they are the card is locked
// on what was picked.
export function QuestionsCard({
  entry,
  onAnswer,
}: {
  entry: Extract<StellaEntry, { kind: "questions" }>;
  onAnswer?: (entryId: string, picks: Record<string, number>) => void;
}) {
  const [draft, setDraft] = useState<Record<string, number>>(() =>
    Object.fromEntries(entry.questions.map((q) => [q.key, q.suggested ?? q.preset ?? 0])),
  );
  const answered = entry.picks !== null;
  const picks = entry.picks ?? draft;

  return (
    <div className="ml-[34px] max-w-3xl rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-100 px-5 py-3.5">
        <p className="text-md font-semibold text-slate-900">{entry.heading}</p>
        {entry.intro && <p className="mt-0.5 text-sm text-slate-500">{entry.intro}</p>}
        {entry.sop && (
          <div className="mt-2.5 rounded-lg bg-slate-50 px-3 py-2.5">
            <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
              <MessageTypeBadge type="sop" size={16} />
              {entry.sop.name}
            </p>
            <ProposalBody sop={entry.sop} />
          </div>
        )}
      </header>

      <ol className="divide-y divide-slate-100">
        {entry.questions.map((q, i) => (
          <li key={q.key} className="flex items-start gap-3 px-5 py-4">
            <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className="text-base font-medium leading-snug text-slate-900">{q.text}</p>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">{q.tag}</span>
              </div>
              {q.quote && (
                <blockquote className="mt-1.5 border-l-2 border-slate-200 pl-2.5 text-sm italic text-slate-500">
                  “{q.quote}”
                </blockquote>
              )}
              {q.consequence && (
                <p className="mt-1.5 flex items-start gap-1.5 text-sm text-amber-800">
                  <TriangleAlert className="mt-[3px] h-3.5 w-3.5 shrink-0 text-amber-500" strokeWidth={2} aria-hidden />
                  {q.consequence}
                </p>
              )}
              {q.note && <p className="mt-1 text-sm text-slate-500">{q.note}</p>}

              <div role="radiogroup" aria-label={q.text} className="mt-2.5 flex flex-wrap gap-2">
                {q.options.map((o, j) => {
                  const on = picks[q.key] === j;
                  return (
                    <button
                      key={o.label}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      disabled={answered}
                      onClick={() => setDraft((d) => ({ ...d, [q.key]: j }))}
                      title={o.value}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-left text-sm transition-colors ${
                        on
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : answered
                            ? "border-slate-200 text-slate-400 opacity-60"
                            : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {on && <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden />}
                      {o.label}
                      {q.suggested === j && (
                        <span className="rounded bg-emerald-50 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                          Suggested
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </li>
        ))}
      </ol>

      <footer className="flex justify-end border-t border-slate-100 px-5 py-3">
        {answered ? (
          <p className="flex items-center gap-1.5 text-sm text-slate-400">
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
            Sent
          </p>
        ) : (
          <button
            type="button"
            disabled={!onAnswer}
            onClick={() => onAnswer?.(entry.id, draft)}
            className="rounded-md bg-brand-500 px-4 py-1.5 text-base font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
          >
            {entry.submitLabel}
          </button>
        )}
      </footer>
    </div>
  );
}

export function SopListCard({ entry }: { entry: Extract<StellaEntry, { kind: "sopList" }> }) {
  return (
    <div className="ml-[34px] max-w-3xl rounded-xl border border-slate-200 bg-white shadow-sm">
      <p className="border-b border-slate-100 px-4 py-2.5 text-md font-semibold text-slate-900">{entry.heading}</p>
      <ul className="divide-y divide-slate-100">
        {entry.rows.map((r) => (
          <li key={r.name} className="flex items-start gap-2.5 px-4 py-2.5">
            <MessageTypeBadge type="sop" size={20} className="mt-px" />
            <div className="min-w-0 flex-1">
              <p className="text-base text-slate-800">{r.name}</p>
              {r.detail && <p className="mt-0.5 break-all text-xs text-slate-400">{r.detail}</p>}
            </div>
            <span
              className={`shrink-0 rounded border px-1.5 py-px text-xs ${
                r.tone === "ok" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-amber-300 bg-amber-50 text-amber-800"
              }`}
            >
              {r.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
