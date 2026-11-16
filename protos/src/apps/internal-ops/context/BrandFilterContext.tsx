import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

// Session-persistent brand filter for the Internal Ops app.
//
// `selectedBrandIds` is the set of brands the user has narrowed the app to.
// An empty array means "All brands" (the default). The selection is shared
// across every page via context and persisted to sessionStorage so it survives
// route changes and reloads for the duration of the browser session.

const STORAGE_KEY = "internal-ops:brand-filter";

interface BrandFilterState {
  /** Selected brand ids; empty means "All brands". */
  selectedBrandIds: string[];
  /** True when no brand is selected (i.e. showing all brands). */
  isAll: boolean;
  setSelectedBrandIds: (ids: string[]) => void;
  toggleBrand: (id: string) => void;
  clear: () => void;
  /** Whether a given brand id passes the active filter (null/undefined never matches an active filter). */
  matches: (brandId: string | null | undefined) => boolean;
}

const BrandFilterContext = createContext<BrandFilterState | null>(null);

function readInitial(): string[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

// With `enabled` false the filter is inert: every brand matches, so a selection
// left in sessionStorage can't silently hide data while the control is hidden.
export function BrandFilterProvider({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>(readInitial);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(selectedBrandIds));
    } catch {
      // Ignore storage failures (e.g. private mode) — in-memory state still works.
    }
  }, [selectedBrandIds]);

  const value = useMemo<BrandFilterState>(() => {
    const isAll = !enabled || selectedBrandIds.length === 0;
    return {
      selectedBrandIds,
      isAll,
      setSelectedBrandIds,
      toggleBrand: (id) =>
        setSelectedBrandIds((prev) =>
          prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        ),
      clear: () => setSelectedBrandIds([]),
      matches: (brandId) => isAll || (brandId != null && selectedBrandIds.includes(brandId)),
    };
  }, [selectedBrandIds, enabled]);

  return <BrandFilterContext.Provider value={value}>{children}</BrandFilterContext.Provider>;
}

export function useBrandFilter() {
  const ctx = useContext(BrandFilterContext);
  if (!ctx) throw new Error("useBrandFilter must be used within BrandFilterProvider");
  return ctx;
}
