// Column 2 of the SOP authoring page: the document.
//
// The operator authors the SOP as prose, one block per step. Each block with a
// compiled node can be selected (the graph and inspector follow) and handed to
// Sol with "Modify w/ prompt". Edits are held by the page until Save, which
// publishes the next SOP version.
//
// In `readOnly` mode (the run view) the document is the record of what ran:
// blocks start collapsed, carry the status dot for how their node fared in the
// run, and still select; there is no editing, no Save / Cancel, no Modify
// button and no attachment controls.

import {
  Building2,
  ChevronDown,
  Cog,
  ChevronUp,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Lock,
  Paperclip,
  Plus,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { SolIcon } from "../sol/SolIcon";
import { useLayoutEffect, useRef, useState, type ChangeEvent } from "react";
import { attachmentKindFor } from "../../../../data/shiftRequirements";
import type { SopAction, SopAttachment, SopDocBlock, SopNode, SopNodeHealth } from "../../../../types/domain";
import { ActionGutter, actionCounts } from "./SopActionGutter";
import { executorFor, EXECUTOR_LABEL, HEALTH_DOT, type SopExecutor } from "./sopFormat";

const attachmentIcon: Record<SopAttachment["kind"], typeof FileText> = {
  pdf: FileText,
  xls: FileSpreadsheet,
  csv: FileSpreadsheet,
  doc: FileText,
  img: ImageIcon,
  file: Paperclip,
};

const attachmentTint: Record<SopAttachment["kind"], string> = {
  pdf: "text-rose-500",
  xls: "text-emerald-600",
  csv: "text-emerald-600",
  doc: "text-slate-500",
  img: "text-violet-500",
  file: "text-slate-400",
};

export function SopDocumentEditor({
  blocks,
  nodes,
  attachments,
  selectedBlockId,
  onSelectBlock,
  onChangeBlock,
  onModifyWithPrompt,
  onAddAttachments,
  onRemoveAttachment,
  dirty,
  justSaved,
  onSave,
  onCancel,
  readOnly = false,
  blockHealth,
  actionsByNode,
  showGutter = false,
  onToggleGutter,
  onConfirmAction,
}: {
  blocks: SopDocBlock[];
  // The compiled nodes, for each block's executor chip.
  nodes: SopNode[];
  attachments: SopAttachment[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
  onChangeBlock: (id: string, patch: Partial<Pick<SopDocBlock, "heading" | "body">>) => void;
  onModifyWithPrompt: (block: SopDocBlock) => void;
  onAddAttachments: (files: FileList) => void;
  onRemoveAttachment: (id: string) => void;
  dirty: boolean;
  justSaved: boolean;
  onSave: () => void;
  onCancel: () => void;
  readOnly?: boolean;
  // How each block's node fared, keyed by node id. Drawn as the status dot.
  blockHealth?: Record<string, SopNodeHealth>;
  // The actions and tool calls detected for each node, keyed by node id. Shown
  // in the gutter beside the section they were read out of.
  actionsByNode?: Record<string, SopAction[]>;
  showGutter?: boolean;
  onToggleGutter?: () => void;
  onConfirmAction?: (nodeId: string, actionId: string) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);

  const handleFiles = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) onAddAttachments(e.target.files);
    e.target.value = "";
  };

  // Across the whole document, so the header can say how much of it Sol is
  // still guessing at and where Brick has no tool.
  const allActions = Object.values(actionsByNode ?? {}).flat();
  const totals = actionCounts(allActions);
  const gutter = showGutter && allActions.length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 px-4 pt-4">
        {allActions.length > 0 && onToggleGutter && (
          <button
            type="button"
            onClick={onToggleGutter}
            aria-pressed={gutter}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
              gutter ? "border-brand-300 bg-brand-50 text-brand-700" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Wrench className="h-3.5 w-3.5" strokeWidth={2} />
            Actions &amp; tools
          </button>
        )}
        {gutter && (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
            <span>{totals.total} detected across the document</span>
            {totals.confirmed > 0 && (
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 font-medium text-emerald-700">{totals.confirmed} confirmed</span>
            )}
            {totals.missing > 0 && (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 font-medium text-amber-700">{totals.missing} missing a tool</span>
            )}
          </p>
        )}

        {!readOnly && (
          <div className="ml-auto flex items-center gap-2">
            {justSaved && !dirty && <span className="mr-1 text-sm font-medium text-emerald-600">Saved</span>}
            <button
              type="button"
              onClick={onCancel}
              disabled={!dirty}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={!dirty}
              className="rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Save
            </button>
          </div>
        )}
      </div>

      {readOnly && (
        <div className="flex shrink-0 items-center gap-2 px-5 pt-2 text-xs text-slate-500">
          <Lock className="h-3.5 w-3.5 text-slate-400" strokeWidth={2} />
          Read-only. This is the document the run executed; edit the Automation from its version.
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-3">
        {blocks.length === 0 && (
          <p className="px-3 py-6 text-sm text-slate-400">No steps yet. Describe the process to Sol, or start typing below.</p>
        )}
        {blocks.map((block) => (
          <Block
            key={block.id}
            block={block}
            executor={(() => {
              const node = nodes.find((n) => n.id === block.nodeId);
              return node ? executorFor(node) : null;
            })()}
            selected={block.id === selectedBlockId}
            readOnly={readOnly}
            health={block.nodeId ? blockHealth?.[block.nodeId] : undefined}
            actions={gutter && block.nodeId ? (actionsByNode?.[block.nodeId] ?? []) : null}
            onConfirmAction={
              block.nodeId && onConfirmAction
                ? (actionId) => onConfirmAction(block.nodeId as string, actionId)
                : undefined
            }
            onSelect={() => onSelectBlock(block.id)}
            onChange={(patch) => onChangeBlock(block.id, patch)}
            onModify={() => onModifyWithPrompt(block)}
          />
        ))}
      </div>

      {/* Source files the SOP was compiled from — the original document, the
          schedule the current run is reading, and anything else that should
          inform the next compile. Read-only views list them without controls. */}
      {readOnly ? (
        attachments.length > 0 && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-slate-200 px-4 py-3">
            {attachments.map((a) => {
              const Icon = attachmentIcon[a.kind];
              return (
                <span key={a.id} title={a.name} className="inline-flex max-w-[12rem] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600">
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${attachmentTint[a.kind]}`} strokeWidth={2} />
                  <span className="truncate">{a.name}</span>
                </span>
              );
            })}
          </div>
        )
      ) : (
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-slate-200 px-4 py-4">
        {attachments.map((a) => {
          const Icon = attachmentIcon[a.kind];
          return (
            <div key={a.id} className="relative">
              <div title={a.name} className="flex h-[76px] w-[76px] flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-1">
                <Icon className={`h-7 w-7 ${attachmentTint[a.kind]}`} strokeWidth={1.75} />
                <span className="w-full truncate text-center text-[10px] text-slate-400">{a.name}</span>
              </div>
              <button
                type="button"
                onClick={() => onRemoveAttachment(a.id)}
                aria-label={`Remove ${a.name}`}
                className="absolute -right-1.5 -top-1.5 rounded-full border border-slate-200 bg-white p-0.5 text-slate-400 shadow-sm transition-colors hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="flex h-[76px] w-[76px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 text-slate-400 transition-colors hover:border-brand-400 hover:text-brand-600"
        >
          <Plus className="h-5 w-5" strokeWidth={2} />
          <span className="text-[11px]">Add file</span>
        </button>
        <input ref={fileInput} type="file" multiple className="hidden" onChange={handleFiles} />
      </div>
      )}
    </div>
  );
}

export function attachmentFromFile(file: File): SopAttachment {
  return { id: `att-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, name: file.name, kind: attachmentKindFor(file.name) };
}

function Block({
  block,
  executor,
  selected,
  readOnly,
  health,
  actions,
  onConfirmAction,
  onSelect,
  onChange,
  onModify,
}: {
  block: SopDocBlock;
  executor: SopExecutor | null;
  selected: boolean;
  readOnly: boolean;
  health: SopNodeHealth | undefined;
  // null when the gutter is off; an empty array means a section with no
  // detected tool calls, which is itself worth seeing.
  actions: SopAction[] | null;
  onConfirmAction?: (actionId: string) => void;
  onSelect: () => void;
  onChange: (patch: Partial<Pick<SopDocBlock, "heading" | "body">>) => void;
  onModify: () => void;
}) {
  // A read-only record starts folded so the run reads as a list of steps;
  // the editor starts open so the document reads as a page.
  const [open, setOpen] = useState(!readOnly);
  const compiled = block.nodeId !== null;

  return (
    <section
      onClick={onSelect}
      onFocus={onSelect}
      className={`rounded-xl px-3 py-3 transition-colors ${selected ? "bg-brand-50/70" : "hover:bg-slate-50"}`}
    >
      {/* The prose on the left, what the agent read out of it on the right.
          One grid per section keeps the two aligned however long the text. */}
      <div className={actions ? "grid gap-3 lg:grid-cols-[minmax(0,1fr)_13rem]" : undefined}>
      <div>
      <div className="flex items-center gap-2">
        {health && (
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${HEALTH_DOT[health]}`}
            title={{ healthy: "Succeeded", attention: "Needs attention", failing: "Failed", idle: "Did not run" }[health]}
          />
        )}
        {readOnly ? (
          // Read-only: the heading row is the fold toggle.
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
              setOpen((v) => !v);
            }}
            className="min-w-0 flex-1 truncate text-left text-[15px] font-semibold text-slate-900"
          >
            {block.heading || "Untitled step"}
          </button>
        ) : (
          <input
            value={block.heading}
            onChange={(e) => onChange({ heading: e.target.value })}
            aria-label="Block heading"
            className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-slate-900 outline-none placeholder:text-slate-300"
            placeholder="Step heading"
          />
        )}
        {executor && <ExecutorChip executor={executor} />}
        {selected && compiled && !readOnly && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onModify();
            }}
            className="shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-700"
          >
            Modify w/ prompt
          </button>
        )}
        {!compiled && (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
            Prose
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          aria-label={open ? "Collapse" : "Expand"}
          className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          {open ? <ChevronUp className="h-4 w-4" strokeWidth={2} /> : <ChevronDown className="h-4 w-4" strokeWidth={2} />}
        </button>
      </div>
      {open &&
        (readOnly ? (
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{block.body}</p>
        ) : (
          <AutoTextarea
            value={block.body}
            onChange={(v) => onChange({ body: v })}
            placeholder="Describe this step the way you would for a new hire."
            className="mt-2 w-full resize-none bg-transparent text-sm leading-relaxed text-slate-700 outline-none placeholder:text-slate-300"
          />
        ))}
      </div>

      {actions && (
        <div className="lg:border-l lg:border-slate-200 lg:pl-3">
          <ActionGutter actions={actions} collapsed={!open} onConfirm={onConfirmAction} />
        </div>
      )}
      </div>
    </section>
  );
}

// Who runs the step: a person, or Sol.
function ExecutorChip({ executor }: { executor: SopExecutor }) {
  const Icon = { sol: SolIcon, operator: UserRound, automation: Cog, external: Building2 }[executor];
  const tone = {
    sol: "bg-violet-100 text-violet-700",
    operator: "bg-amber-100 text-amber-800",
    automation: "bg-sky-100 text-sky-700",
    external: "bg-slate-100 text-slate-600",
  }[executor];
  const title = {
    sol: "Executed by an AI agent",
    operator: "Executed by a person",
    automation: "Executed by a scheduled job or bot",
    external: "Executed by an outside party",
  }[executor];
  return (
    <span title={title} className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}>
      <Icon className="h-3 w-3" strokeWidth={2.25} />
      {EXECUTOR_LABEL[executor]}
    </span>
  );
}

// A textarea that grows with its content so the document reads as one page.
function AutoTextarea({
  value,
  onChange,
  className,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Re-measure whenever the text or the available width changes. Measuring at
  // zero width (before the column has laid out) would wrap every word onto its
  // own line and lock in a height of thousands of pixels, so wait for a width.
  const fit = () => {
    const el = ref.current;
    if (!el || el.clientWidth === 0) return;
    el.style.height = "0px";
    const next = `${el.scrollHeight}px`;
    if (el.style.height !== next) el.style.height = next;
  };

  useLayoutEffect(fit, [value]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let lastWidth = el.clientWidth;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth !== lastWidth) {
        lastWidth = el.clientWidth;
        fit();
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return <textarea ref={ref} value={value} onChange={(e) => onChange(e.target.value)} rows={1} placeholder={placeholder} className={className} />;
}
