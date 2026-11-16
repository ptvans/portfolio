// The brand a Stella task is scoped to, picked from inside the chat input.
//
// Single-select, unlike the header's BrandFilterControl: a task runs against
// one brand or against all of them, never against three. "All brands" is the
// default and means Brick-wide — the finalization SOP, for instance, is not
// scoped to anyone.

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { brands } from "../../../../data";

export function BrandSelect({
  brandId,
  onChange,
  disabled = false,
}: {
  brandId: string | null;
  onChange: (brandId: string | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const brand = brandId ? brands.find((b) => b.id === brandId) : undefined;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {/* The brand as a chip, with the chevron beside it rather than in it —
          the chip is the same label the rest of Internal Ops uses for a brand. */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={brand ? `Scoped to ${brand.name}` : "Not scoped to a brand"}
        className="group inline-flex max-w-[14rem] items-center gap-1.5 rounded-md text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span
          className={`inline-flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 transition-colors group-hover:bg-slate-200 ${
            brand ? "bg-slate-100 text-slate-600" : "bg-slate-100 text-slate-500"
          }`}
        >
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
            style={{ background: brand?.color ?? "#e2e8f0" }}
            aria-hidden
          />
          <span className="truncate">{brand?.name ?? "All brands"}</span>
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-slate-600" strokeWidth={2} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute bottom-full left-0 z-30 mb-1 max-h-[18rem] w-60 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
        >
          <Option
            label="All brands"
            hint="Brick-wide"
            selected={!brandId}
            onPick={() => {
              onChange(null);
              setOpen(false);
            }}
          />
          <div className="my-1 border-t border-slate-100" />
          {brands.map((b) => (
            <Option
              key={b.id}
              label={b.name}
              color={b.color}
              selected={b.id === brandId}
              onPick={() => {
                onChange(b.id);
                setOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Option({
  label,
  hint,
  color,
  selected,
  onPick,
}: {
  label: string;
  hint?: string;
  color?: string;
  selected: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onPick}
      className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: color ?? "#e2e8f0" }} aria-hidden />
        <span className="truncate">{label}</span>
        {hint && <span className="shrink-0 text-xs text-slate-400">{hint}</span>}
      </span>
      {selected && <Check className="h-4 w-4 shrink-0 text-brand-600" strokeWidth={2.5} />}
    </button>
  );
}
