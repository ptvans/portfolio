// Asks why a message, or a selection of them, is being ignored. (The action
// is labelled Ignore in the pane and Resolve on the Requests page; the state
// it sets is `resolved`.) Ignoring closes a message without taking any of the
// actions suggested on it, so the reason is required: it is the record of what
// was done instead. For several
// at once the one reason is recorded on each.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// How many titles are listed before "and N more…".
const SHOWN = 2;

export function ResolveDialog({
  titles,
  verb = "Ignore",
  onResolve,
  onCancel,
}: {
  // The messages being resolved, named under the heading.
  titles: string[];
  // What the action is called where it was clicked.
  verb?: "Ignore" | "Resolve";
  onResolve: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const ready = reason.trim().length > 0;
  const many = titles.length > 1;
  const more = titles.length - SHOWN;

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const submit = () => {
    if (ready) onResolve(reason.trim());
  };

  // Portalled to the body so it sits over the whole page, not just the pane
  // or chat it was opened from.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="resolve-dialog-title"
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-xl bg-white shadow-xl"
      >
        <div className="px-5 pb-4 pt-5">
          <h2 id="resolve-dialog-title" className="text-lg font-semibold text-slate-900">
            {many ? `${verb} ${titles.length} messages` : `${verb} message`}
          </h2>
          {many ? (
            <div className="mt-2 text-sm">
              <p className="font-medium text-slate-500">{verb === "Resolve" ? "Resolving:" : "Ignoring:"}</p>
              {/* Each title as a token, so the list reads as the things
                  being closed rather than as prose. */}
              <ul className="mt-1.5 flex flex-col items-start gap-1.5">
                {titles.slice(0, SHOWN).map((t, i) => (
                  <li
                    key={i}
                    title={t}
                    className="max-w-full truncate rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700"
                  >
                    {t}
                  </li>
                ))}
                {more > 0 && <li className="px-0.5 text-slate-400">and {more} more…</li>}
              </ul>
            </div>
          ) : (
            <p className="mt-0.5 truncate text-sm text-slate-500" title={titles[0]}>
              {titles[0]}
            </p>
          )}
          <p className="mt-4 text-base text-slate-700">
            This closes {many ? "these messages" : "the message"} without taking any of the suggested actions. Say why,
            or what was done instead.
          </p>
          <textarea
            ref={inputRef}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submit();
              }
            }}
            rows={4}
            aria-label="Reason for dismissing"
            placeholder="e.g. Jasmine is already following up on this with finance."
            className="mt-3 w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-base text-slate-800 outline-none placeholder:text-slate-400 focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={submit}
            className="rounded-md bg-brand-500 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
          >
            {verb}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
