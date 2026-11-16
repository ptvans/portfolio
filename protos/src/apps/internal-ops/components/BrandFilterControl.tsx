import { Check, ChevronDown, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { brands } from "../../../data";
import { useBrandFilter } from "../context/BrandFilterContext";

// Global brand filter shown in the Internal Ops top header. Multi-select popover
// backed by the session-persistent BrandFilterContext. Empty selection = "All".

export function BrandFilterControl() {
  const { selectedBrandIds, isAll, toggleBrand, clear } = useBrandFilter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label = isAll
    ? "All brands"
    : selectedBrandIds.length === 1
      ? brands.find((b) => b.id === selectedBrandIds[0])?.name ?? "1 brand"
      : `${selectedBrandIds.length} brands`;

  return (
    <div className="flex w-full items-center gap-2" ref={rootRef}>
      <span className="text-sm font-medium text-slate-500">Brand</span>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex min-w-[11rem] items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className="flex items-center gap-1.5">
            {!isAll && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-100 px-1.5 text-xs font-semibold text-brand-700">
                {selectedBrandIds.length}
              </span>
            )}
            <span className="truncate">{label}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={2} />
        </button>

        {open && (
          <div className="absolute left-0 z-20 mt-1 max-h-[22rem] w-64 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
            <button
              type="button"
              onClick={() => clear()}
              className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              <span className="font-medium">All brands</span>
              {isAll && <Check className="h-4 w-4 text-brand-600" strokeWidth={2.5} />}
            </button>
            <div className="my-1 border-t border-slate-100" />
            {brands.map((b) => {
              const selected = selectedBrandIds.includes(b.id);
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => toggleBrand(b.id)}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2 truncate">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                      style={{ background: b.color }}
                    />
                    <span className="truncate">{b.name}</span>
                  </span>
                  {selected && <Check className="h-4 w-4 shrink-0 text-brand-600" strokeWidth={2.5} />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {!isAll && (
        <button
          type="button"
          onClick={() => clear()}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.5} />
          Clear
        </button>
      )}
    </div>
  );
}
