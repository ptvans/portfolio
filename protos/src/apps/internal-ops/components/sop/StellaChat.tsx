// Column 1 of the SOP authoring page: the Stella agent chat.
//
// Stella helps author and modify the SOP document and its compiled nodes. In
// production this is the compiler + patch loop from the PRD; here it is a
// scripted stand-in: a message with a document block attached rewrites that
// block after a short "Reworking" pause, and a bare message gets a canned
// answer grounded in the sample run history.

import { PanelLeftClose, SendHorizontal, X } from "lucide-react";
import { StellaIcon } from "../stella/StellaIcon";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Sop, SopDocBlock, SopVersion } from "../../../../types/domain";
import { formatElapsedMs } from "./sopFormat";

type Entry =
  | { type: "user"; text: string; blockHeading?: string }
  | { type: "status"; id: string; label: string; startedAt: number; endedAt: number | null }
  | { type: "assistant"; text: string };

const REWORK_MS = 2400;

function openingMessage(sop: Sop, version: SopVersion | undefined): string {
  if (version) {
    const current = version.version === sop.version;
    if (sop.nodes.length === 0) {
      return `This SOP is empty. Describe the process the way you would for a new hire, one step per block, and I'll compile it into nodes with an owner, rules and a done condition each.`;
    }
    return current
      ? `You're on version ${version.version} of "${sop.name}", the current one. ${version.note} Ask me to change a step, or select a block and choose Modify with prompt; saving publishes version ${sop.version + 1}.`
      : `You're reading version ${version.version} of "${sop.name}", published ${new Date(version.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} by ${version.publishedBy}. ${version.note} The current version is ${sop.version}. Edits made here save as version ${sop.version + 1}, based on this one.`;
  }
  if (sop.nodes.length === 0) {
    return `This SOP is empty. Describe the process the way you would for a new hire, one step per block, and I'll compile it into nodes with an owner, rules and a done condition each.`;
  }
  const failing = sop.nodes.find((n) => n.health === "failing");
  if (failing) {
    return `I'm watching "${sop.name}". Version ${sop.version} is live. The current run is stopped at "${failing.title}" with an open escalation. Ask me to change a step, or select a block and choose Modify with prompt.`;
  }
  return `I'm watching "${sop.name}". Version ${sop.version} is ${sop.status}. Ask me to change a step, or select a block and choose Modify with prompt.`;
}

function genericReply(sop: Sop, turn: number): string {
  const failing = sop.nodes.find((n) => n.health === "failing");
  if (turn === 0 && failing) {
    return `I read the run history. "${failing.title}" failed because a saved reference no longer resolved and the Austin assignment is inactive. I can add a learned rule to re-resolve assignments by region name before failing. Select that block and tell me to, and I'll draft the change for you to save.`;
  }
  return `Noted. To change a step, select its block in the document and choose Modify with prompt; I'll rewrite only that block and leave the hard constraints alone.`;
}

export function StellaChat({
  sop,
  version,
  attachedBlock,
  onDetachBlock,
  onApplyEdit,
  focusSignal,
  onCollapse,
}: {
  sop: Sop;
  version?: SopVersion;
  attachedBlock: SopDocBlock | null;
  onDetachBlock: () => void;
  // Stella's rewrite of a block: the prompt is folded into the block body.
  onApplyEdit: (blockId: string, prompt: string) => void;
  // Bumped by the parent when it wants the input focused (Modify w/ prompt).
  focusSignal: number;
  // When set, the header shows a collapse control that folds the column into
  // the narrow tray the page renders in its place.
  onCollapse?: () => void;
}) {
  const [log, setLog] = useState<Entry[]>(() => [{ type: "assistant", text: openingMessage(sop, version) }]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [, setNow] = useState(Date.now());
  const genericTurns = useRef(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (focusSignal > 0) inputRef.current?.focus();
  }, [focusSignal]);

  // Tick while a status is running so its elapsed time counts up.
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [busy]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log]);

  const send = (e?: FormEvent) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    const block = attachedBlock;
    const statusId = `s-${Date.now()}`;
    setLog((prev) => [
      ...prev,
      { type: "user", text, blockHeading: block?.heading },
      { type: "status", id: statusId, label: "Reworking", startedAt: Date.now(), endedAt: null },
    ]);
    setDraft("");
    setBusy(true);
    onDetachBlock();

    timers.current.push(
      setTimeout(() => {
        const reply = block
          ? (() => {
              onApplyEdit(block.id, text);
              return `I've updated "${block.heading}" with that. The change is in the document as a learned rule, so it doesn't touch the step's hard constraints. Review it and Save to publish version ${sop.version + 1}.`;
            })()
          : genericReply(sop, genericTurns.current++);
        setLog((prev) => [
          ...prev.map((en) => (en.type === "status" && en.id === statusId ? { ...en, endedAt: Date.now() } : en)),
          { type: "assistant", text: reply },
        ]);
        setBusy(false);
      }, REWORK_MS),
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex shrink-0 items-center gap-2 px-4 py-3">
        <StellaIcon size={18} thinking={busy} />
        <h2 className="text-sm font-semibold text-slate-800">Stella (AI)</h2>
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            aria-label="Collapse Stella"
            title="Collapse"
            className="ml-auto rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <PanelLeftClose className="h-4 w-4" strokeWidth={2} />
          </button>
        )}
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
        {/* Push the conversation to the bottom of the column like a chat. */}
        <div className="flex min-h-full flex-col justify-end gap-3">
          {log.map((entry, i) => {
            if (entry.type === "user") {
              return (
                <div key={i} className="ml-8 rounded-2xl bg-brand-50 px-4 py-3 text-sm leading-relaxed text-slate-800">
                  {entry.blockHeading && (
                    <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-brand-600">
                      Modify · {entry.blockHeading}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap">{entry.text}</p>
                </div>
              );
            }
            if (entry.type === "status") {
              const end = entry.endedAt ?? Date.now();
              return (
                <div key={i} className="pl-1">
                  <p className={`text-sm italic ${entry.endedAt ? "text-slate-400" : "text-brand-600"}`}>{entry.label}</p>
                  <p className="text-[11px] text-slate-400">{formatElapsedMs(end - entry.startedAt)}</p>
                </div>
              );
            }
            return (
              <p key={i} className="pl-1 text-sm leading-relaxed text-brand-700">
                {entry.text}
              </p>
            );
          })}
        </div>
      </div>

      <form onSubmit={send} className="shrink-0 border-t border-slate-100 p-3">
        {attachedBlock && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs text-brand-700">
            <span className="font-medium">Modifying:</span>
            <span className="truncate">{attachedBlock.heading}</span>
            <button type="button" onClick={onDetachBlock} className="ml-auto rounded p-0.5 hover:bg-brand-100" aria-label="Detach block">
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
        )}
        <div className="relative">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={3}
            placeholder={attachedBlock ? `How should "${attachedBlock.heading}" change?` : "Ask Stella to change the SOP…"}
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-11 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
          />
          <button
            type="submit"
            disabled={!draft.trim() || busy}
            aria-label="Send"
            className="absolute bottom-2.5 right-2.5 rounded-lg bg-brand-600 p-1.5 text-white transition-colors hover:bg-brand-700 disabled:opacity-40"
          >
            <SendHorizontal className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </form>
    </div>
  );
}
