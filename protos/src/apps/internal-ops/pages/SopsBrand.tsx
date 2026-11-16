import { Boxes, ListChecks, Plus, User } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../../../components/EmptyState";
import { getBrand } from "../../../data";
import { formatDateTime, formatRelative } from "../../../lib/format";
import type { AlertRule, AlertRuleStatus } from "../../../types/domain";
import { BrandChip } from "../../../components/BrandChip";
import {
  ActiveCountPill,
  Breadcrumbs,
  RuleStatusPill,
  SearchInput,
  ruleScheduleLabel,
  ruleSeverityLabel,
  selectClass,
} from "../components/alerts/alertUi";
import { TypePill, SopTable } from "../components/sop/SopTable";
import { useAlerts } from "../context/AlertsContext";
import { useSops } from "../context/SopContext";

type SortKey = "status" | "triggered" | "active" | "name";
const STATUS_RANK: Record<AlertRuleStatus, number> = { active: 0, draft: 1, inactive: 2 };

const CRUMBS = [{ label: "SOPs", to: "/internal-ops/sops/list" }];

// A brand's SOPs of both types: its Standard SOPs, then its Alerts (active, draft
// and inactive). "brick" is the Brick-wide group, which has Standard SOPs only.
export function SopsBrand() {
  const { brandId } = useParams<{ brandId: string }>();
  const brickWide = brandId === "brick";
  const brand = getBrand(brandId);
  const { rules, activeCountForRule } = useAlerts();
  const { sops } = useSops();
  const processes = sops.filter((s) => (brickWide ? s.brandId === null : s.brandId === brandId));
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("status");

  const brandRules = useMemo(() => rules.filter((r) => r.brandId === brandId), [rules, brandId]);

  const shownRules = useMemo(() => {
    const q = query.trim().toLowerCase();
    const cmp: Record<SortKey, (a: AlertRule, b: AlertRule) => number> = {
      status: (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.name.localeCompare(b.name),
      triggered: (a, b) => (b.lastTriggeredAt ?? "").localeCompare(a.lastTriggeredAt ?? ""),
      active: (a, b) => activeCountForRule(b.id) - activeCountForRule(a.id) || a.name.localeCompare(b.name),
      name: (a, b) => a.name.localeCompare(b.name),
    };
    return brandRules
      .filter((r) => !q || r.name.toLowerCase().includes(q) || r.prompt.toLowerCase().includes(q))
      .sort(cmp[sort]);
  }, [brandRules, query, sort, activeCountForRule]);


  if (!brand && !brickWide) {
    return (
      <div className="mx-auto max-w-4xl">
        <Breadcrumbs items={CRUMBS} />
        <EmptyState icon={Boxes} title="Brand not found" description={`No brand with id "${brandId}".`} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Breadcrumbs items={CRUMBS} />
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-slate-900">SOPs</h1>
          {brand ? <BrandChip name={brand.name} color={brand.color} /> : <span className="text-sm font-semibold text-slate-600">Brick-wide</span>}
        </div>
        {brand && (
          <Link
            to={`/internal-ops/alerts/new?brand=${brand.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" /> Create alert
          </Link>
        )}
      </div>

      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <TypePill type="Standard" /> Standard ({processes.length})
        </h2>
        {processes.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-400">
            {brand ? `${brand.name} has no standard SOPs yet.` : "No Brick-wide standard SOPs."}
          </p>
        ) : (
          <SopTable sops={processes} />
        )}
      </section>

      {brand && (
      <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <TypePill type="Alert" /> Alerts ({brandRules.length})
      </h2>

      <div className="mb-4 flex items-center gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Search alerts by name or rule" />
        <label className="flex items-center gap-2 text-sm text-slate-500">
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={selectClass}>
            <option value="status">Status</option>
            <option value="triggered">Last triggered</option>
            <option value="active">Most active alerts</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>

      {shownRules.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title={query ? `No alerts match "${query}"` : `${brand.name} has no alerts yet`}
        />
      ) : (
        <div className="space-y-3">
          {shownRules.map((r) => (
            <RuleCard key={r.id} rule={r} activeCount={activeCountForRule(r.id)} />
          ))}
        </div>
      )}
      </section>
      )}
    </div>
  );
}

function RuleCard({ rule, activeCount }: { rule: AlertRule; activeCount: number }) {
  const muted = rule.status === "inactive";
  return (
    <Link
      to={`/internal-ops/alerts/${rule.id}`}
      className={`block rounded-md border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50/60 ${
        rule.status === "draft" ? "border-dashed" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className={`font-medium ${muted ? "text-slate-500" : "text-slate-900"}`}>{rule.name}</p>
        <div className="flex shrink-0 items-center gap-2">
          <ActiveCountPill count={activeCount} />
          <RuleStatusPill status={rule.status} />
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
        {rule.status === "draft" ? (
          <span>Not running · edited {formatRelative(rule.updatedAt)}</span>
        ) : (
          <>
            <span>
              Last triggered:{" "}
              <span className="font-medium text-slate-700" title={formatDateTime(rule.lastTriggeredAt)}>
                {rule.lastTriggeredAt ? formatRelative(rule.lastTriggeredAt) : "never"}
              </span>
            </span>
          </>
        )}
        <span aria-hidden>·</span>
        <span className="inline-flex items-center gap-1">
          <User className="h-3.5 w-3.5" /> {rule.ownerName}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-400">
        {ruleSeverityLabel(rule)} severity · {ruleScheduleLabel(rule)}
      </p>
    </Link>
  );
}
