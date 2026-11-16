// The Goals tab of Automations Setup: the targets Stella tracks, per brand or
// Brick-wide, with where each one stands. Searched and laid out like the SOPs
// tab next to it.

import { ChevronDown, Target } from "lucide-react";
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { EmptyState } from "../../../components/EmptyState";
import { getBrand } from "../../../data";
import { formatRelative } from "../../../lib/format";
import { SearchInput } from "../components/alerts/alertUi";
import { AutomationsSetup } from "../components/automations/AutomationsSetup";
import { goals, type Goal, type GoalStatus } from "../data/goals";

const STATUS_LABEL: Record<GoalStatus, string> = {
  on_track: "On track",
  at_risk: "At risk",
  behind: "Behind",
  achieved: "Achieved",
};

const STATUS_STYLE: Record<GoalStatus, string> = {
  on_track: "bg-emerald-50 text-emerald-700",
  at_risk: "bg-amber-50 text-amber-700",
  behind: "bg-rose-50 text-rose-700",
  achieved: "bg-brand-50 text-brand-700",
};

const STATUS_ORDER: Record<GoalStatus, number> = { behind: 0, at_risk: 1, on_track: 2, achieved: 3 };

type GoalSort = "name" | "status" | "updated";

const GOAL_SORTS: { key: GoalSort; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "status", label: "Status" },
  { key: "updated", label: "Last check-in" },
];

function scopeName(goal: Goal): string {
  return goal.brandId ? (getBrand(goal.brandId)?.name ?? "Brick-wide") : "Brick-wide";
}

export function Goals() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const sortParam = params.get("sort");
  const sort: GoalSort = GOAL_SORTS.some((s) => s.key === sortParam) ? (sortParam as GoalSort) : "name";

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  // Search reads the name, the brand and the metric.
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q ? goals.filter((g) => `${g.name} ${scopeName(g)} ${g.metric}`.toLowerCase().includes(q)) : goals;
    return [...matched].sort((a, b) => {
      switch (sort) {
        case "status":
          return STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.name.localeCompare(b.name);
        case "updated":
          return b.updatedAt.localeCompare(a.updatedAt);
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [query, sort]);

  return (
    <AutomationsSetup tab="goals">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="w-full max-w-3xl">
          <SearchInput value={query} onChange={(v) => setParam("q", v || null)} placeholder="Search for goal name, brand, or metric" />
        </div>
        <label className="relative inline-flex shrink-0 items-center rounded-lg border border-slate-300 bg-white text-base font-medium text-slate-800 shadow-sm">
          <span className="pl-3.5">Sort</span>
          <select
            value={sort}
            onChange={(e) => setParam("sort", e.target.value === "name" ? null : e.target.value)}
            aria-label="Sort goals by"
            className="appearance-none bg-transparent py-2 pl-2 pr-8 text-base text-slate-800 outline-none"
          >
            {GOAL_SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-slate-500" strokeWidth={2} aria-hidden />
        </label>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Target} title={query ? `No goals match "${query}"` : "No goals yet"} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-700">
              <tr>
                <th className="px-4 py-3.5 font-medium">Name</th>
                <th className="px-3 py-3.5 font-medium">Scope</th>
                <th className="px-3 py-3.5 font-medium">Metric</th>
                <th className="px-3 py-3.5 text-right font-medium">Target</th>
                <th className="px-3 py-3.5 text-right font-medium">Current</th>
                <th className="px-3 py-3.5 text-center font-medium">Status</th>
                <th className="px-3 py-3.5 font-medium">Owner</th>
                <th className="px-3 py-3.5 font-medium">Period</th>
                <th className="px-4 py-3.5 text-right font-medium">Checked</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((g) => (
                <tr key={g.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="max-w-[22rem] px-4 py-2.5">
                    <span className="block truncate font-medium text-slate-900" title={g.name}>
                      {g.name}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{scopeName(g)}</td>
                  <td className="max-w-[24rem] px-3 py-2.5 text-slate-600">
                    <span className="block truncate" title={g.metric}>
                      {g.metric}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right text-slate-600">{g.target}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right font-medium text-slate-900">{g.current}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[g.status]}`}>
                      {STATUS_LABEL[g.status]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-400">{g.ownerName}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{g.period}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right text-slate-400" title={g.cadence}>
                    {formatRelative(g.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AutomationsSetup>
  );
}
