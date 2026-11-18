// The SOPs tab of Automations Setup: every SOP, in one list — the Standard
// SOPs (documents Sol runs step by step) and the Alerts (an SOP of type
// Alert: a prompt Sol keeps evaluating, which raises a message when it
// matches), searched and sorted together. Each brand's own page lists both
// at /sops/brands/:brandId.

import { ChevronDown, Plus, Workflow } from "lucide-react";
import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EmptyState } from "../../../components/EmptyState";
import { getBrand } from "../../../data";
import { SearchInput } from "../components/alerts/alertUi";
import { AutomationsSetup } from "../components/automations/AutomationsSetup";
import { SOP_SORTS, SopTable, type SopSort } from "../components/sop/SopTable";
import { useAlerts } from "../context/AlertsContext";
import { useSops } from "../context/SopContext";

export function Sops() {
  const { sops } = useSops();
  const { rules } = useAlerts();
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const sortParam = params.get("sort");
  const sort: SopSort = SOP_SORTS.some((s) => s.key === sortParam) ? (sortParam as SopSort) : "name";

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  // Search reads the name, the brand and what the SOP says it does.
  const { matchedSops, matchedRules } = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { matchedSops: sops, matchedRules: rules };
    const brandName = (id: string | null) => (id ? (getBrand(id)?.name ?? "") : "Build-wide");
    return {
      matchedSops: sops.filter((s) => `${s.name} ${brandName(s.brandId)} ${s.trigger} ${s.purpose}`.toLowerCase().includes(q)),
      matchedRules: rules.filter((r) => `${r.name} ${brandName(r.brandId)} ${r.schedule ?? ""}`.toLowerCase().includes(q)),
    };
  }, [sops, rules, query]);

  return (
    <AutomationsSetup
      tab="sops"
      actions={
        <Link
          to="/internal-ops?new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" /> New Automation
        </Link>
      }
    >

      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="w-full max-w-3xl">
          <SearchInput value={query} onChange={(v) => setParam("q", v || null)} placeholder="Search for Automation name, brand, or details" />
        </div>
        <label className="relative inline-flex shrink-0 items-center rounded-lg border border-slate-300 bg-white text-base font-medium text-slate-800 shadow-sm">
          <span className="pl-3.5">Sort</span>
          <select
            value={sort}
            onChange={(e) => setParam("sort", e.target.value === "name" ? null : e.target.value)}
            aria-label="Sort Automations by"
            className="appearance-none bg-transparent py-2 pl-2 pr-8 text-base text-slate-800 outline-none"
          >
            {SOP_SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-slate-500" strokeWidth={2} aria-hidden />
        </label>
      </div>

      {matchedSops.length + matchedRules.length === 0 ? (
        <EmptyState icon={Workflow} title={query ? `No Automations match "${query}"` : "No Automations yet"} />
      ) : (
        <SopTable sops={matchedSops} alerts={matchedRules} sort={sort} />
      )}
    </AutomationsSetup>
  );
}
