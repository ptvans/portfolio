// A SOP written in a Stella chat. These aren't in the SOP library data; they
// exist in the chat that wrote them, so this page reads the SOP from there and
// shows it the way the SOP page in Brick does: its attributes, the raw prompt
// it was written from, and the instructions its agent runs. A reload clears
// the chats, and with them the SOP.

import { ListChecks, MessageSquare, TriangleAlert } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../../../components/EmptyState";
import { Breadcrumbs } from "../components/alerts/alertUi";
import { MessageTypeBadge } from "../components/messages/messageUi";
import { SopDraftStatus } from "../components/stella/SopDraftCard";
import { useStella } from "../context/StellaContext";

const CRUMBS = [{ label: "Automations", to: "/internal-ops/sops/list" }];

export function CreatedSop() {
  const { draftId } = useParams<{ draftId: string }>();
  const { draftById, select } = useStella();
  const found = draftId ? draftById(draftId) : undefined;

  if (!found) {
    return (
      <div className="mx-auto max-w-4xl">
        <Breadcrumbs items={CRUMBS} />
        <EmptyState
          icon={ListChecks}
          title="Automation not found"
          description="Automations written in a Stella chat last until the page reloads. Run the chat again to write it."
        />
      </div>
    );
  }

  const { draft, sessionId } = found;
  return (
    <div className="mx-auto max-w-5xl">
      <Breadcrumbs items={CRUMBS} />
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <MessageTypeBadge type="sop" size={28} />
          <h1 className="text-xl font-semibold text-slate-900">{draft.name}</h1>
          <SopDraftStatus status={draft.status} className="text-xs" />
        </div>
        {/* Back to the conversation that wrote it. */}
        <Link
          to="/internal-ops"
          onClick={() => select(sessionId)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <MessageSquare className="h-3.5 w-3.5" /> Open the chat
        </Link>
      </div>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {draft.attributes.map((a) => (
            <div key={a.label} className="flex min-w-0 items-baseline gap-2">
              <dt className="shrink-0 text-sm text-slate-400">{a.label}:</dt>
              <dd className={`min-w-0 break-words text-sm ${a.pending ? "italic text-slate-400" : "text-slate-800"}`}>
                {a.value}
              </dd>
            </div>
          ))}
        </dl>

        {draft.blocker && (
          <p className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" strokeWidth={2} aria-hidden />
            {draft.blocker}
          </p>
        )}

        <Section title="Raw prompt" paragraphs={draft.raw} />
        <Section
          title="Compiled instructions"
          paragraphs={draft.compiled}
          empty="Compiled once the open questions in the chat are answered."
        />
      </div>
    </div>
  );
}

function Section({ title, paragraphs, empty }: { title: string; paragraphs: string[] | null; empty?: string }) {
  return (
    <section className="rounded-lg border border-slate-200">
      <h2 className="border-b border-slate-200 px-4 py-2.5 text-base font-semibold text-slate-900">{title}</h2>
      <div className="space-y-3 px-4 py-3.5 text-base leading-relaxed text-slate-700">
        {paragraphs ? paragraphs.map((p, i) => <p key={i}>{p}</p>) : <p className="italic text-slate-400">{empty}</p>}
      </div>
    </section>
  );
}
