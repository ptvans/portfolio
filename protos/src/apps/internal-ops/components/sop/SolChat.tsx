// Column 1 of the SOP authoring page: the Sol agent chat.
//
// Sol helps author and modify the SOP document and its compiled nodes. In
// production this is the compiler + patch loop from the PRD; here it is a
// scripted stand-in: a message with a document block attached rewrites that
// block after a short "Reworking" pause, and a bare message gets a canned
// answer grounded in the sample run history.

import { PanelLeftClose, Pencil } from "lucide-react";
import { SolComposer } from "../sol/SolComposer";
import { SolIcon } from "../sol/SolIcon";
import { useEffect, useRef, useState } from "react";
import type { Sop, SopDocBlock, SopVersion } from "../../../../types/domain";
import { SOL_HISTORY } from "../../data/solScript";
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
      return `This Automation is empty. Describe the process the way you would for a new hire, one step per block, and I'll compile it into nodes with an owner, rules and a done condition each.`;
    }
    return current
      ? `You're on version ${version.version} of "${sop.name}", the current one. ${version.note} Ask me to change a step, or select a block and choose Modify with prompt; saving publishes version ${sop.version + 1}.`
      : `You're reading version ${version.version} of "${sop.name}", published ${new Date(version.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} by ${version.publishedBy}. ${version.note} The current version is ${sop.version}. Edits made here save as version ${sop.version + 1}, based on this one.`;
  }
  if (sop.nodes.length === 0) {
    return `This Automation is empty. Describe the process the way you would for a new hire, one step per block, and I'll compile it into nodes with an owner, rules and a done condition each.`;
  }
  const failing = sop.nodes.find((n) => n.health === "failing");
  if (failing) {
    return `I'm watching "${sop.name}". Version ${sop.version} is live. The current run is stopped at "${failing.title}" with an open escalation. Ask me to change a step, or select a block and choose Modify with prompt.`;
  }
  return `I'm watching "${sop.name}". Version ${sop.version} is ${sop.status}. Ask me to change a step, or select a block and choose Modify with prompt.`;
}

// The pane is titled like a Sol conversation: the matching chat from the
// Sol history when there is one (ses-<id> for sop-<id>), otherwise a title
// for what this chat is about.
function conversationTitle(sop: Sop, version: SopVersion | undefined): string {
  const seeded = SOL_HISTORY.find((s) => s.id === `ses-${sop.id.replace(/^sop-/, "")}`);
  if (seeded) return seeded.title;
  return version ? `Edit ${sop.name} v${version.version}` : `${sop.name} run`;
}

function genericReply(sop: Sop, turn: number): string {
  const failing = sop.nodes.find((n) => n.health === "failing");
  if (turn === 0 && failing) {
    return `I read the run history. "${failing.title}" failed because a saved reference no longer resolved and the Austin assignment is inactive. I can add a learned rule to re-resolve assignments by region name before failing. Select that block and tell me to, and I'll draft the change for you to save.`;
  }
  return `Noted. To change a step, select its block in the document and choose Modify with prompt; I'll rewrite only that block and leave the hard constraints alone.`;
}

export function SolChat({
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
  // Sol's rewrite of a block: the prompt is folded into the block body.
  onApplyEdit: (blockId: string, prompt: string) => void;
  // Bumped by the parent when it wants the input focused (Modify w/ prompt).
  focusSignal: number;
  // When set, the header shows a collapse control that folds the column into
  // the narrow tray the page renders in its place.
  onCollapse?: () => void;
}) {
  const [log, setLog] = useState<Entry[]>(() => [{ type: "assistant", text: openingMessage(sop, version) }]);
  const [busy, setBusy] = useState(false);
  const [, setNow] = useState(Date.now());
  const genericTurns = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

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

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;
    const block = attachedBlock;
    const statusId = `s-${Date.now()}`;
    setLog((prev) => [
      ...prev,
      { type: "user", text, blockHeading: block?.heading },
      { type: "status", id: statusId, label: "Reworking", startedAt: Date.now(), endedAt: null },
    ]);
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
        <h2 className="min-w-0 truncate text-sm font-medium text-slate-700" title={conversationTitle(sop, version)}>
          {conversationTitle(sop, version)}
        </h2>
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            aria-label="Collapse Sol"
            title="Collapse"
            className="ml-auto rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <PanelLeftClose className="h-4 w-4" strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Messages and composer match the Sol home chat (SolTranscript /
          SolComposer): user bubbles on the right, Sol's replies beside
          her orb in plain text, and the same composer box. */}
      <div ref={scrollRef} className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {/* Push the conversation to the bottom of the column like a chat. */}
        <div className="flex min-h-full flex-col justify-end gap-5">
          {log.map((entry, i) => {
            if (entry.type === "user") {
              return (
                <div key={i} className="ml-8 self-end rounded-2xl bg-brand-50 px-4 py-3 text-md leading-relaxed text-slate-800">
                  {entry.blockHeading && (
                    <div className="mb-2 border-l-2 border-brand-300 pl-2.5 text-xs">
                      <p className="flex items-center gap-1.5 font-medium text-brand-700">
                        <Pencil className="h-3 w-3 shrink-0" strokeWidth={2.25} aria-hidden />
                        {sop.name} › {entry.blockHeading}
                      </p>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap break-words">{entry.text}</p>
                </div>
              );
            }
            if (entry.type === "status") {
              const end = entry.endedAt ?? Date.now();
              return (
                <div key={i} className="flex items-center gap-2 pl-[32px]">
                  <p className={`text-base italic ${entry.endedAt ? "text-slate-400" : "text-brand-600"}`}>{entry.label}</p>
                  <p className="text-xs tabular-nums text-slate-400">{formatElapsedMs(end - entry.startedAt)}</p>
                </div>
              );
            }
            return (
              <div key={i} className="flex items-start gap-3">
                <SolIcon size={20} className="mt-[3px]" />
                <p className="min-w-0 flex-1 text-md leading-relaxed text-slate-700">{entry.text}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="shrink-0 px-3 pb-3">
        <SolComposer
          compact
          onSend={send}
          disabled={busy}
          placeholder="Ask Sol to change the Automation…"
          sopRef={
            attachedBlock
              ? {
                  draftId: sop.id,
                  draftName: sop.name,
                  section: "raw",
                  paragraph: null,
                  label: attachedBlock.heading,
                  excerpt: attachedBlock.body,
                }
              : null
          }
          onDetachSopRef={onDetachBlock}
          focusSignal={focusSignal}
        />
      </div>
    </div>
  );
}
