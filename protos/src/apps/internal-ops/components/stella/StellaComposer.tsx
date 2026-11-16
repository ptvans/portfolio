// The box you talk to Stella in.
//
// Used full width at the bottom of an open chat, compact on the Stella home,
// slim under each My Work group, and in the Messages pane.

import { ArrowUp, AudioLines, Check, Lock, Pencil, Plus, X } from "lucide-react";
import { getBrand } from "../../../../data";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { VoiceLevelMeter } from "../../../../components/VoiceLevelMeter";
import { useSpeechRecognition } from "../../../../lib/useSpeechRecognition";
import type { SopRef } from "../../data/stellaScript";
import { BrandSelect } from "./BrandSelect";

export function StellaComposer({
  onSend,
  disabled = false,
  placeholder = "Ask Stella…",
  // A one-press reply the script is expecting next.
  suggestion,
  // Fixed starting points, shown under the box on the dashboard.
  quickActions,
  onQuickAction,
  // Which brand the task is scoped to. Controlled, so the caller decides
  // whether it lives on the session or just on the page.
  brandId = null,
  onBrandChange,
  // Shows the brand as fixed: a conversation about one brand's record can't be
  // re-scoped from its own composer.
  brandLocked = false,
  // A part of a SOP the next message is about, shown as a snippet at the top
  // of the box until it is sent or removed.
  sopRef = null,
  onDetachSopRef,
  autoFocus = false,
  compact = false,
  // One line, with the controls beside it: the chat under a My Work group.
  slim = false,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  suggestion?: string | null;
  quickActions?: string[];
  onQuickAction?: (label: string) => void;
  brandId?: string | null;
  onBrandChange?: (brandId: string | null) => void;
  brandLocked?: boolean;
  sopRef?: SopRef | null;
  onDetachSopRef?: () => void;
  autoFocus?: boolean;
  compact?: boolean;
  slim?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const voice = useSpeechRecognition();

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  // Picking a part of a SOP to modify puts you straight into the box.
  useEffect(() => {
    if (sopRef) inputRef.current?.focus();
  }, [sopRef]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || disabled) return;
    onSend(text);
    setDraft("");
  };

  return (
    // data-draft marks a box with something typed in it, so a wrapper that hides
    // the box until hovered (the chat under a My Work group) can keep it shown.
    <form onSubmit={submit} data-draft={draft.trim() ? "" : undefined} className={compact || slim ? "" : "px-6 pb-6 pt-2"}>
      <div className={compact || slim ? "" : "mx-auto max-w-4xl"}>
        {/* The script's next reply is set aside while a SOP part is attached:
            what gets sent then is about that part. */}
        {!compact && suggestion && !disabled && !sopRef && (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onSend(suggestion)}
              title={suggestion}
              className="max-w-full truncate rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-100"
            >
              {suggestion}
            </button>
          </div>
        )}

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm focus-within:border-brand-400 focus-within:ring-1 focus-within:ring-brand-400">
          {/* Voice is a mode of the same box: the text area becomes the live
              transcript, and the controls become cancel / done around a level
              meter. Done drops the transcript into the draft to edit or send. */}
          {voice.listening ? (
            <>
              <p
                className={`max-h-32 overflow-y-auto px-3.5 pb-1 pt-3 text-base ${compact ? "min-h-[4.5rem]" : "min-h-[3rem]"} ${
                  voice.transcript ? "text-slate-800" : "text-slate-400"
                }`}
                aria-live="polite"
              >
                {voice.transcript || "Listening…"}
              </p>
              <div className="flex items-center gap-3 px-2.5 pb-2.5 pt-0.5">
                <button
                  type="button"
                  aria-label="Cancel recording"
                  onClick={voice.cancel}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
                <VoiceLevelMeter level={voice.level} live={voice.meterLive} barClassName="bg-brand-500" />
                <button
                  type="button"
                  aria-label="Use transcription"
                  onClick={() => {
                    const text = voice.stop();
                    if (text) setDraft((d) => (d ? `${d} ${text}` : text));
                    inputRef.current?.focus();
                  }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white transition-colors hover:bg-brand-600"
                >
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                </button>
              </div>
            </>
          ) : slim ? (
            <div className="flex items-center gap-2 py-1.5 pl-2 pr-2">
              <button
                type="button"
                aria-label="Attach"
                disabled={disabled}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
              <textarea
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                rows={1}
                disabled={disabled}
                placeholder={disabled ? "Stella is working…" : placeholder}
                className="min-w-0 flex-1 resize-none bg-transparent py-1 text-sm text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
              />
              {!draft.trim() && voice.supported ? (
                <button
                  type="button"
                  aria-label="Voice input"
                  title="Dictate"
                  disabled={disabled}
                  onClick={voice.start}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white transition-colors hover:bg-brand-600 disabled:opacity-40"
                >
                  <AudioLines className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              ) : (
                <button
                  type="submit"
                  aria-label="Send"
                  disabled={!draft.trim() || disabled}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white transition-colors hover:bg-brand-600 disabled:opacity-40"
                >
                  <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
              )}
            </div>
          ) : (
            <>
              {sopRef && (
                <div className="mx-2.5 mt-2.5 flex items-start gap-2 rounded-md border border-brand-200 bg-brand-50 px-2.5 py-1.5">
                  <Pencil className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" strokeWidth={2} aria-hidden />
                  <div className="min-w-0 flex-1 text-xs">
                    <p className="truncate text-brand-700">
                      <span className="font-semibold">Modifying</span> {sopRef.draftName} › {sopRef.label}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-slate-500">{sopRef.excerpt}</p>
                  </div>
                  {onDetachSopRef && (
                    <button
                      type="button"
                      onClick={onDetachSopRef}
                      aria-label="Remove the Automation section"
                      className="shrink-0 rounded p-0.5 text-brand-500 hover:bg-brand-100 hover:text-brand-700"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  )}
                </div>
              )}
              <textarea
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                rows={compact ? 3 : 2}
                disabled={disabled}
                placeholder={
                  disabled
                    ? "Stella is working…"
                    : sopRef
                      ? `How should ${sopRef.label.toLowerCase()} change?`
                      : voice.error === "denied"
                        ? "Microphone access is blocked"
                        : voice.error === "unavailable"
                          ? "Voice input isn't available right now"
                          : placeholder
                }
                className="w-full resize-none rounded-lg bg-transparent px-3.5 pb-1 pt-3 text-base text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
              />
              {/* Attach and what the task is scoped to on the left, the way to
                  send it on the right — all inside the box, so the scope reads
                  as part of the message rather than a page-level filter. */}
              <div className="flex items-center gap-2 px-2.5 pb-2.5 pt-0.5">
                <button
                  type="button"
                  aria-label="Attach"
                  disabled={disabled}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" strokeWidth={2} />
                </button>
                {brandLocked ? (
                  <LockedBrand brandId={brandId} />
                ) : (
                  onBrandChange && <BrandSelect brandId={brandId} onChange={onBrandChange} disabled={disabled} />
                )}
                {/* Until something is typed (or dictated), the action is voice. */}
                {!draft.trim() && voice.supported ? (
                  <button
                    type="button"
                    aria-label="Voice input"
                    title="Dictate"
                    disabled={disabled}
                    onClick={voice.start}
                    className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white transition-colors hover:bg-brand-600 disabled:opacity-40"
                  >
                    <AudioLines className="h-4 w-4" strokeWidth={2} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    aria-label="Send"
                    disabled={!draft.trim() || disabled}
                    className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white transition-colors hover:bg-brand-600 disabled:opacity-40"
                  >
                    <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {quickActions && quickActions.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {quickActions.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => onQuickAction?.(label)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </form>
  );
}

function LockedBrand({ brandId }: { brandId: string | null }) {
  const brand = brandId ? getBrand(brandId) : undefined;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium" title={brand ? `Scoped to ${brand.name}` : "Build-wide"}>
      <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-slate-600">
        <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: brand?.color ?? "#e2e8f0" }} aria-hidden />
        {brand?.name ?? "All brands"}
      </span>
      <Lock className="h-3.5 w-3.5 text-slate-400" strokeWidth={2} aria-label="Scope is fixed" />
    </span>
  );
}
