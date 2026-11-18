// A SOP Sol is writing, previewed in the rail beside the chat: two small
// blocks — its attributes and the raw prompt it came from. The instructions
// Sol compiles that prompt into, which are what the SOP's agent runs, are
// in the viewer only. The prompt is clamped, and the secondary attributes
// hidden; a chevron opens the SOP in full in the viewer, at that block.

import { ChevronDown, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { SopDraft } from "../../data/solScript";
import { MessageTypeBadge } from "../messages/messageUi";
import type { SopSection } from "./SopViewer";

export function SopDraftCard({ draft, onOpen }: { draft: SopDraft; onOpen: (section: SopSection) => void }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
        <MessageTypeBadge type="sop" size={18} />
        <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-slate-800">
          <span className="font-normal text-slate-500">Automation:</span> {draft.name}{" "}
          <Link
            to={`/internal-ops/sops/created/${draft.id}`}
            className="whitespace-nowrap text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline"
          >
            View
          </Link>
        </p>
        <SopDraftStatus status={draft.status} />
      </header>

      {draft.blocker && (
        <p className="flex gap-1.5 border-b border-amber-100 bg-amber-50/60 px-3 py-1.5 text-xs leading-snug text-amber-900">
          <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0 text-amber-600" strokeWidth={2} aria-hidden />
          {draft.blocker}
        </p>
      )}

      <div className="space-y-1.5 p-1.5">
        <Attributes attributes={draft.attributes} onOpen={() => onOpen("attributes")} />

        <Clamped label="Raw prompt" paragraphs={draft.raw} onOpen={() => onOpen("raw")} />
      </div>
    </article>
  );
}

// Where a SOP stands, as a small outlined label.
export function SopDraftStatus({ status, className = "" }: { status: SopDraft["status"]; className?: string }) {
  return (
    <span
      className={`shrink-0 rounded border px-1.5 py-px text-[11px] ${
        status === "active"
          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
          : status === "not executable"
            ? "border-amber-300 bg-amber-50 text-amber-800"
            : status === "draft"
              ? "border-slate-300 text-slate-600"
              : "border-dashed border-brand-300 text-brand-600"
      } ${className}`}
    >
      {status}
    </span>
  );
}

// Attributes kept out of the way until the block is opened.
const SECONDARY = new Set(["Version", "Updated"]);

// The SOP's attributes, untitled. The viewer shows the secondary ones.
function Attributes({ attributes, onOpen }: { attributes: SopDraft["attributes"]; onOpen: () => void }) {
  const shown = attributes.filter((a) => !SECONDARY.has(a.label));
  return (
    <section className="flex items-start gap-2 rounded-md bg-slate-50 px-2.5 py-2">
      <dl className="grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-xs">
        {shown.map((a) => (
          <div key={a.label} className="contents">
            <dt className="text-slate-400">{a.label}</dt>
            <dd className={`truncate ${a.pending ? "italic text-slate-400" : "text-slate-700"}`} title={a.value}>
              {a.value}
            </dd>
          </div>
        ))}
      </dl>
      <Toggle onClick={onOpen} label="attributes" />
    </section>
  );
}

function Toggle({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open ${label} in the Automation viewer`}
      title="Open in the Automation viewer"
      className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-600"
    >
      <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
    </button>
  );
}

function Block({ label, action, children }: { label: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-md bg-slate-50 px-2.5 py-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        {action}
      </div>
      {children}
    </section>
  );
}

// Text that shows its first few lines; the viewer has the rest.
function Clamped({ label, paragraphs, onOpen }: { label: string; paragraphs: string[]; onOpen: () => void }) {
  return (
    <Block label={label} action={<Toggle onClick={onOpen} label={label.toLowerCase()} />}>
      <p className="line-clamp-3 text-xs leading-relaxed text-slate-700">{paragraphs.join(" ")}</p>
    </Block>
  );
}
