import { ChevronDown, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

// A reusable, composable filter bar.
//
// The bar owns the interaction (typeahead → pick a field → pick a value → token
// pill) but is agnostic about what the tokens mean: the parent supplies the
// filterable `fields` and interprets the resulting `tokens` however it likes.
//
//   click into the bar (empty)   → all available fields are offered as chips
//   start typing                 → typeahead matches field names AND values
//   pick a field                 → a pending token appears; pick/enter a value
//   pick a value                 → the token is committed as a pill
//   click a committed token      → it re-enters edit mode to change its value
//
// Every token has a view mode (a pill) and an edit mode (an inline input +
// dropdown anchored under the token). Multiple tokens on the same field are
// allowed (the parent decides whether that means OR / range / etc.).

export type FilterFieldType = "select" | "text" | "date";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterField {
  key: string;
  label: string;
  type: FilterFieldType;
  // Required for `select`; the values a token can take.
  options?: FilterOption[];
  // Placeholder shown while entering a `text` / `date` value.
  valuePlaceholder?: string;
}

export interface FilterToken {
  fieldKey: string;
  value: string; // option value, free text, or ISO date (yyyy-mm-dd)
}

interface FilterBarProps {
  fields: FilterField[];
  tokens: FilterToken[];
  onChange: (next: FilterToken[]) => void;
  placeholder?: string;
  className?: string;
}

// The bar's interaction state:
//   { kind: "add" }                    → picking / typeahead-searching a field
//   { kind: "value", …, editIndex }    → entering a value for a field.
//        editIndex === null → a brand-new token (pending chip, trailing input)
//        editIndex === n    → editing the existing token at index n, in place
type Editor =
  | null
  | { kind: "add" }
  | { kind: "value"; fieldKey: string; editIndex: number | null };

type Suggestion =
  | { kind: "field"; field: FilterField }
  | { kind: "value"; field: FilterField; option: FilterOption };

const MAX_VALUE_SUGGESTIONS = 8;

function fmtDate(iso: string): string {
  if (!iso) return "";
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  });
}

// The value shown on a committed token pill.
function displayValue(field: FilterField, value: string): string {
  if (field.type === "date") return fmtDate(value);
  const opt = field.options?.find((o) => o.value === value);
  return opt ? opt.label : value;
}

// Bold the matched substring of `text` (case-insensitive), like the mockups.
function highlight(text: string, query: string) {
  const q = query.trim();
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i === -1) return text;
  return (
    <>
      {text.slice(0, i)}
      <span className="font-semibold text-indigo-700">{text.slice(i, i + q.length)}</span>
      {text.slice(i + q.length)}
    </>
  );
}

export function FilterBar({ fields, tokens, onChange, placeholder = "Filter", className }: FilterBarProps) {
  const [editor, setEditor] = useState<Editor>(null);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fieldByKey = useMemo(() => new Map(fields.map((f) => [f.key, f])), [fields]);
  const activeField = editor?.kind === "value" ? fieldByKey.get(editor.fieldKey) ?? null : null;

  // Close on outside click.
  useEffect(() => {
    if (!editor) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) reset();
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [editor]);

  // Focus the (single) active input whenever the editor changes.
  useEffect(() => {
    if (editor) inputRef.current?.focus();
  }, [editor]);

  useEffect(() => setHighlighted(0), [query, editor]);

  const suggestions = useMemo<Suggestion[]>(() => {
    const q = query.trim().toLowerCase();

    // Choosing / filtering a value for a select field.
    if (activeField?.type === "select") {
      return (activeField.options ?? [])
        .filter((o) => o.label.toLowerCase().includes(q))
        .map((o) => ({ kind: "value", field: activeField, option: o }));
    }
    // text / date values are entered inline; no list.
    if (editor?.kind === "value") return [];
    if (editor?.kind !== "add") return [];

    // "add" mode: offer fields (+ value matches once the user types).
    if (!q) return fields.map((f) => ({ kind: "field" as const, field: f }));

    const fieldMatches: Suggestion[] = fields
      .filter((f) => f.label.toLowerCase().includes(q))
      .map((f) => ({ kind: "field", field: f }));

    const valueMatches: Suggestion[] = [];
    for (const f of fields) {
      if (f.type !== "select" || !f.options) continue;
      for (const o of f.options) {
        if (o.label.toLowerCase().includes(q)) valueMatches.push({ kind: "value", field: f, option: o });
        if (valueMatches.length >= MAX_VALUE_SUGGESTIONS) break;
      }
      if (valueMatches.length >= MAX_VALUE_SUGGESTIONS) break;
    }
    return [...fieldMatches, ...valueMatches];
  }, [fields, editor, activeField, query]);

  function reset() {
    setEditor(null);
    setQuery("");
  }

  // Commit a value: replace the token at editIndex, or append a new one.
  function commit(fieldKey: string, value: string, editIndex: number | null) {
    if (!value) return;
    if (editIndex === null) {
      onChange([...tokens, { fieldKey, value }]);
      setQuery("");
      setEditor({ kind: "add" }); // keep composing
    } else {
      onChange(tokens.map((t, i) => (i === editIndex ? { fieldKey, value } : t)));
      reset();
    }
  }

  function startEdit(index: number) {
    const t = tokens[index];
    const field = fieldByKey.get(t.fieldKey);
    if (!field) return;
    // text/date prefill with the current value; select starts blank (full list).
    setQuery(field.type === "select" ? "" : t.value);
    setEditor({ kind: "value", fieldKey: t.fieldKey, editIndex: index });
  }

  function pickField(field: FilterField) {
    setQuery("");
    setEditor({ kind: "value", fieldKey: field.key, editIndex: null });
  }

  function chooseSuggestion(s: Suggestion) {
    if (s.kind === "field") pickField(s.field);
    else commit(s.field.key, s.option.value, editor?.kind === "value" ? editor.editIndex : null);
  }

  function removeToken(i: number) {
    onChange(tokens.filter((_, idx) => idx !== i));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      reset();
      return;
    }
    if (e.key === "Backspace" && query === "") {
      if (editor?.kind === "value") reset();
      else if (tokens.length) removeToken(tokens.length - 1);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (activeField && (activeField.type === "text" || activeField.type === "date")) {
        commit(activeField.key, query.trim(), editor?.kind === "value" ? editor.editIndex : null);
      } else if (suggestions[highlighted]) {
        chooseSuggestion(suggestions[highlighted]);
      }
      return;
    }
    if (e.key === "ArrowDown" && suggestions.length) {
      e.preventDefault();
      setHighlighted((h) => (h + 1) % suggestions.length);
      return;
    }
    if (e.key === "ArrowUp" && suggestions.length) {
      e.preventDefault();
      setHighlighted((h) => (h - 1 + suggestions.length) % suggestions.length);
    }
  }

  // The dropdown panel, anchored under whichever editor element is active.
  function dropdown() {
    const showDateHint = activeField?.type === "date";
    if (suggestions.length === 0 && !showDateHint) return null;
    return (
      <div className="absolute left-0 top-[calc(100%+8px)] z-20 max-h-72 w-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
        {suggestions.some((s) => s.kind === "field") && (
          <div className="flex flex-col items-start gap-1.5 pb-1">
            {suggestions.map((s, i) =>
              s.kind === "field" ? (
                <button
                  key={`f-${s.field.key}`}
                  type="button"
                  onMouseEnter={() => setHighlighted(i)}
                  onClick={() => chooseSuggestion(s)}
                  className={`rounded-md border px-2.5 py-1 text-sm font-medium transition ${
                    highlighted === i
                      ? "border-indigo-300 bg-indigo-100 text-indigo-700"
                      : "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                  }`}
                >
                  {s.field.label}:
                </button>
              ) : null,
            )}
          </div>
        )}

        {suggestions.map((s, i) =>
          s.kind === "value" ? (
            <button
              key={`v-${s.field.key}-${s.option.value}`}
              type="button"
              onMouseEnter={() => setHighlighted(i)}
              onClick={() => chooseSuggestion(s)}
              className={`block w-full rounded-md px-2.5 py-1.5 text-left text-sm text-slate-700 transition ${
                highlighted === i ? "bg-indigo-50" : "hover:bg-slate-50"
              }`}
            >
              {editor?.kind === "add" && <span className="text-slate-400">{s.field.label}: </span>}
              {highlight(s.option.label, query)}
            </button>
          ) : null,
        )}

        {showDateHint && <p className="px-2.5 py-1.5 text-xs text-slate-400">Pick a date, then press Enter.</p>}
      </div>
    );
  }

  // The shared editor: a label chip (in value mode) + the input, plus dropdown.
  // Used both inline (editing a token) and trailing (adding a new one).
  function editorControl() {
    const isDate = activeField?.type === "date";
    const editIndex = editor?.kind === "value" ? editor.editIndex : null;
    const inputPlaceholder = activeField
      ? activeField.type === "select"
        ? editIndex !== null
          ? displayValue(activeField, tokens[editIndex]?.value ?? "")
          : `${activeField.label}…`
        : activeField.valuePlaceholder ?? `${activeField.label}…`
      : tokens.length === 0
        ? placeholder
        : "";

    const isSelect = activeField?.type === "select";

    return (
      <span className="relative inline-flex flex-1 items-center gap-2">
        {activeField && (
          <span className="whitespace-nowrap text-sm font-semibold text-indigo-600">{activeField.label}:</span>
        )}
        {/* white "select box" holding the input */}
        <span className="relative inline-flex flex-1 items-center rounded-md border border-slate-300 bg-white">
          <input
            ref={inputRef}
            type={isDate ? "date" : "text"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={() => {
              // Commit an in-progress date on blur (native picker has no Enter).
              if (isDate && query) commit(activeField!.key, query, editIndex);
            }}
            placeholder={inputPlaceholder}
            className={`min-w-[130px] flex-1 border-0 bg-transparent py-1 pl-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 ${
              isSelect ? "pr-7" : "pr-2"
            }`}
          />
          {isSelect && (
            <ChevronDown className="pointer-events-none absolute right-1.5 h-4 w-4 text-slate-400" strokeWidth={2} />
          )}
        </span>
        {dropdown()}
      </span>
    );
  }

  const editingIndex = editor?.kind === "value" ? editor.editIndex : null;

  return (
    <div ref={rootRef} className={className}>
      <div
        className="flex min-h-[46px] flex-wrap items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100"
        onClick={() => {
          if (!editor) setEditor({ kind: "add" });
          inputRef.current?.focus();
        }}
      >
        <Search className="ml-1 h-4 w-4 shrink-0 text-slate-400" strokeWidth={2} />

        {tokens.map((t, i) => {
          const field = fieldByKey.get(t.fieldKey);
          if (!field) return null;

          // Edit mode: this token renders the inline editor in place.
          if (editingIndex === i) {
            return (
              <span
                key={`edit-${t.fieldKey}-${i}`}
                className="inline-flex items-center rounded-lg border border-indigo-400 bg-indigo-50 px-2.5 py-1"
                onClick={(e) => e.stopPropagation()}
              >
                {editorControl()}
              </span>
            );
          }

          // View mode: a clickable pill.
          return (
            <span
              key={`${t.fieldKey}-${i}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50 py-1 pl-2 pr-1 text-sm text-indigo-700"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  startEdit(i);
                }}
                className="text-left hover:text-indigo-900"
                title="Click to edit"
              >
                <span className="text-indigo-500">{field.label}:</span>{" "}
                <span className="font-semibold">{displayValue(field, t.value)}</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeToken(i);
                }}
                className="rounded text-indigo-400 hover:bg-indigo-100 hover:text-indigo-600"
                aria-label={`Remove ${field.label} filter`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          );
        })}

        {/* Trailing editor: field picker ("add") or a new pending value. */}
        {editingIndex === null && editor && (
          editor.kind === "value" ? (
            <span
              className="inline-flex flex-1 items-center rounded-lg border border-indigo-400 bg-indigo-50 px-2.5 py-1"
              onClick={(e) => e.stopPropagation()}
            >
              {editorControl()}
            </span>
          ) : (
            editorControl()
          )
        )}

        {/* Placeholder input when the bar is idle (nothing focused yet). */}
        {!editor && (
          <input
            ref={inputRef}
            readOnly
            placeholder={tokens.length === 0 ? placeholder : ""}
            className="min-w-[110px] flex-1 cursor-text border-0 bg-transparent px-1 py-1 text-sm text-slate-800 outline-none placeholder:text-slate-400"
            onFocus={() => setEditor({ kind: "add" })}
          />
        )}
      </div>
    </div>
  );
}
