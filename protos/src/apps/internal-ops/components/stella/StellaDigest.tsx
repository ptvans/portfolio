// Needs Your Attention Digest: every group of messages Stella has put together for you,
// in the Stella page's main card. The same cards, responses and chats as
// the home, which shows only the first few; no box for a new chat here.
//
// Its Resolved view is the record of what has been answered: each group
// that has resolved messages, showing only those. A group moved out of My
// Work is there whole; one still partly open is there with the part that is
// done. The cards carry no chat or shared response.

import { CheckCheck, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { isSettled, useStella } from "../../context/StellaContext";
import { SESSION_DOTS } from "./statusDots";
import { WorkGroupCard } from "./WorkGroupCard";

const DIGEST = "/internal-ops/my-work";
const RESOLVED = "/internal-ops/my-work/resolved";

function groupCount(n: number) {
  return `${n} ${n === 1 ? "group" : "groups"}`;
}

export function StellaDigest({ resolved = false }: { resolved?: boolean }) {
  const { groups, inMyWork, resolvedGroups, openItems, itemState } = useStella();
  const open = groups.filter(inMyWork);
  // Moved groups first, most recent on top, then the ones still in My Work
  // that have something resolved; each with just its resolved messages.
  const done = [...resolvedGroups, ...groups.filter((g) => !resolvedGroups.includes(g))]
    .map((group) => ({
      group,
      messageIds: openItems(group)
        .filter((i) => isSettled(itemState(i.messageId)))
        .map((i) => i.messageId),
    }))
    .filter((d) => d.messageIds.length > 0);

  return (
    <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-8">
      <div className="mx-auto max-w-[27rem] sm:max-w-xl">
        {resolved ? (
          <>
            <Link
              to={DIGEST}
              className="-ml-1 mb-2 inline-flex items-center gap-1 rounded px-1 text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline"
            >
              <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              Needs Your Attention Digest
            </Link>
            <h1 className="text-lg font-semibold text-slate-800">Resolved</h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
              {done.length > 0 && <CheckCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" strokeWidth={2} aria-hidden />}
              {done.length === 0 ? "Nothing resolved yet. Requests land here as you answer them." : groupCount(done.length)}
            </p>
            {done.length > 0 && (
              <div className="mt-9 space-y-7">
                {done.map(({ group, messageIds }) => (
                  <WorkGroupCard key={group.id} group={group} messageIds={messageIds} withChat={false} />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-4">
              <h1 className="text-lg font-semibold text-slate-800">Needs Your Attention Digest</h1>
              <Link
                to={RESOLVED}
                className="inline-flex shrink-0 items-center gap-1.5 rounded px-1 text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline"
              >
                Resolved
                {done.length > 0 && (
                  <span className="rounded bg-brand-50 px-1.5 text-xs font-semibold text-brand-600">{done.length}</span>
                )}
              </Link>
            </div>
            {/* Every group here is waiting on you: the waiting dot, and how many. */}
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
              {open.length > 0 && (
                <span
                  role="img"
                  aria-label={SESSION_DOTS.waiting.label}
                  title={SESSION_DOTS.waiting.label}
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: SESSION_DOTS.waiting.color }}
                />
              )}
              {open.length === 0 ? "Nothing is waiting on you." : groupCount(open.length)}
            </p>

            {open.length > 0 && (
              <div className="mt-9 space-y-7">
                {open.map((g) => (
                  <WorkGroupCard key={g.id} group={g} resolvable />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
