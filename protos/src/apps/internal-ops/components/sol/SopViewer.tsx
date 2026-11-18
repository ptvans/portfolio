// A SOP Sol is writing, in full, in the rail beside the chat. Opened from
// a chevron on one of its cards, it takes the rail over so the SOP can be read
// while the conversation goes on: it follows the chat, so an answer that
// compiles the instructions or changes the schedule shows here as it lands.
//
// Any part of it can be selected: the attributes as a block, or a single
// paragraph of the prompt or the instructions. It opens with the section whose
// chevron was pressed selected. The selection carries a Modify button, which
// hands that part to the chat input so the next message is about it.

import { Pencil, TriangleAlert, X } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { SopDraft, SopRef } from "../../data/solScript";
import { MessageTypeBadge } from "../messages/messageUi";
import { SopDraftStatus } from "./SopDraftCard";

// The parts of a SOP a card can open.
export type SopSection = SopRef["section"];

const SECTION_LABEL: Record<SopSection, string> = {
  attributes: "Attributes",
  raw: "Raw prompt",
  compiled: "Compiled instructions",
};

// What is selected: a whole section, or one of its paragraphs.
interface Selection {
  section: SopSection;
  paragraph: number | null;
}

export function SopViewer({
  draft,
  section,
  onClose,
  onModify,
}: {
  draft: SopDraft;
  // The section to open on, selected.
  section: SopSection;
  onClose: () => void;
  onModify: (ref: SopRef) => void;
}) {
  const [selected, setSelected] = useState<Selection>({ section, paragraph: null });
  const refs = useRef<Partial<Record<SopSection, HTMLElement | null>>>({});

  useEffect(() => {
    refs.current[section]?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [draft.id, section]);

  const isSelected = (s: SopSection, paragraph: number | null) =>
    selected.section === s && selected.paragraph === paragraph;

  // The selection as a reference the chat can carry.
  const modify = () => {
    const { section: s, paragraph } = selected;
    const paragraphs =
      s === "attributes"
        ? draft.attributes.map((a) => `${a.label}: ${a.value}`)
        : s === "raw"
          ? draft.raw
          : (draft.compiled ?? []);
    const excerpt = paragraph === null ? paragraphs.join(s === "attributes" ? " · " : " ") : (paragraphs[paragraph] ?? "");
    onModify({
      draftId: draft.id,
      draftName: draft.name,
      section: s,
      paragraph,
      label: paragraph === null ? SECTION_LABEL[s] : `${SECTION_LABEL[s]} ¶${paragraph + 1}`,
      excerpt,
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <header className="flex shrink-0 items-start gap-2 border-b border-slate-200 px-4 py-3">
        <MessageTypeBadge type="sop" size={22} className="mt-px" />
        <div className="min-w-0 flex-1">
          <p className="text-md font-semibold leading-snug text-slate-900">
            <span className="font-normal text-slate-500">Automation:</span> {draft.name}
          </p>
          <div className="mt-1 flex items-center gap-2.5">
            <SopDraftStatus status={draft.status} />
            <Link
              to={`/internal-ops/sops/created/${draft.id}`}
              className="text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline"
            >
              Open page
            </Link>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          title="Back to the Automation cards"
          className="-mr-1 mt-px rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 pt-5">
        {draft.blocker && (
          <p className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" strokeWidth={2} aria-hidden />
            {draft.blocker}
          </p>
        )}

        {/* The attributes select as one block. */}
        <Section
          title="Attributes"
          selected={isSelected("attributes", null)}
          onSelect={() => setSelected({ section: "attributes", paragraph: null })}
          onModify={modify}
          sectionRef={(el) => (refs.current.attributes = el)}
          wholeSection
        >
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
            {draft.attributes.map((a) => (
              <div key={a.label} className="contents">
                <dt className="text-slate-400">{a.label}</dt>
                <dd className={`break-words ${a.pending ? "italic text-slate-400" : "text-slate-800"}`}>{a.value}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section
          title="Raw prompt"
          selected={isSelected("raw", null)}
          onSelect={() => setSelected({ section: "raw", paragraph: null })}
          onModify={modify}
          sectionRef={(el) => (refs.current.raw = el)}
        >
          <Paragraphs
            paragraphs={draft.raw}
            edits={editsFor(draft, "raw")}
            selected={selected.section === "raw" ? selected.paragraph : null}
            onSelect={(paragraph) => setSelected({ section: "raw", paragraph })}
            onModify={modify}
          />
        </Section>

        <Section
          title="Compiled instructions"
          selected={isSelected("compiled", null)}
          onSelect={() => setSelected({ section: "compiled", paragraph: null })}
          onModify={draft.compiled ? modify : undefined}
          sectionRef={(el) => (refs.current.compiled = el)}
        >
          {draft.compiled ? (
            <Paragraphs
              paragraphs={draft.compiled}
              edits={editsFor(draft, "compiled")}
              selected={selected.section === "compiled" ? selected.paragraph : null}
              onSelect={(paragraph) => setSelected({ section: "compiled", paragraph })}
              onModify={modify}
            />
          ) : (
            <p className="text-sm italic text-slate-400">Compiled once the open questions in the chat are answered.</p>
          )}
        </Section>
      </div>
    </div>
  );
}

// Click or Enter selects; the selection is styled by the caller.
const selectable = (onSelect: () => void) => ({
  role: "button" as const,
  tabIndex: 0,
  onClick: onSelect,
  onKeyDown: (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
    }
  },
});

const SELECTED = "border-brand-300 bg-brand-50/60 ring-2 ring-brand-100";

// A section of the SOP. Its heading selects the whole of it; so does any
// click inside one that selects as a block (the attributes).
function Section({
  title,
  selected,
  onSelect,
  onModify,
  sectionRef,
  wholeSection = false,
  children,
}: {
  title: string;
  selected: boolean;
  onSelect: () => void;
  onModify?: () => void;
  sectionRef: (el: HTMLElement | null) => void;
  wholeSection?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      ref={sectionRef}
      {...(wholeSection ? selectable(onSelect) : {})}
      aria-pressed={wholeSection ? selected : undefined}
      className={`relative scroll-mt-4 rounded-lg border px-4 py-3 transition-colors ${
        selected ? SELECTED : "border-slate-200"
      } ${wholeSection && !selected ? "cursor-pointer hover:border-slate-300 hover:bg-slate-50/60" : ""}`}
    >
      <h2
        {...(wholeSection ? {} : selectable(onSelect))}
        aria-pressed={wholeSection ? undefined : selected}
        className={`mb-2 text-[11px] font-semibold uppercase tracking-wide ${
          selected ? "text-brand-600" : "text-slate-400"
        } ${wholeSection ? "" : "w-fit cursor-pointer hover:text-slate-600"}`}
      >
        {title}
      </h2>
      {children}
      {selected && onModify && <ModifyButton onClick={onModify} />}
    </section>
  );
}

// A section's paragraphs changed with Modify, by index, with what changed.
function editsFor(draft: SopDraft, section: "raw" | "compiled"): Record<number, string> {
  const out: Record<number, string> = {};
  for (const [key, changed] of Object.entries(draft.edits ?? {})) {
    const [s, i] = key.split(":");
    if (s === section) out[Number(i)] = changed;
  }
  return out;
}

// The text with what Modify changed marked, and an Edited tag at the end.
function withMark(text: string, changed: string | undefined): ReactNode {
  if (changed === undefined) return text;
  const at = text.indexOf(changed);
  return (
    <>
      {at < 0 ? (
        text
      ) : (
        <>
          {text.slice(0, at)}
          <mark className="rounded bg-emerald-100 px-0.5 font-medium text-emerald-900">{changed}</mark>
          {text.slice(at + changed.length)}
        </>
      )}{" "}
      <span className="whitespace-nowrap rounded bg-emerald-50 px-1 py-px align-[1px] text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
        Edited
      </span>
    </>
  );
}

function Paragraphs({
  paragraphs,
  edits,
  selected,
  onSelect,
  onModify,
}: {
  paragraphs: string[];
  edits: Record<number, string>;
  selected: number | null;
  onSelect: (paragraph: number) => void;
  onModify: () => void;
}) {
  return (
    <div className="-mx-2 space-y-1 text-sm leading-relaxed text-slate-700">
      {paragraphs.map((p, i) => (
        <p
          key={i}
          {...selectable(() => onSelect(i))}
          aria-pressed={selected === i}
          className={`relative cursor-pointer rounded-md border px-2 py-1.5 transition-colors ${
            selected === i ? SELECTED : "border-transparent hover:bg-slate-50"
          }`}
        >
          {withMark(p, edits[i])}
          {selected === i && <ModifyButton onClick={onModify} />}
        </p>
      ))}
    </div>
  );
}

// Sits on the top-right corner of the selection.
function ModifyButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="absolute -top-3 right-2 z-10 inline-flex items-center gap-1 rounded-md bg-brand-500 px-2 py-0.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-600"
    >
      <Pencil className="h-3 w-3" strokeWidth={2.25} aria-hidden />
      Modify
    </button>
  );
}
