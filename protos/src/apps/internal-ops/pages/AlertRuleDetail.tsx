import { BellOff, ListChecks, Pencil, User } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../../../components/EmptyState";
import { getBrand } from "../../../data";
import { formatDateTime, formatRelative } from "../../../lib/format";
import { BrandChip } from "../../../components/BrandChip";
import { AlertCard, useDismissToast } from "../components/alerts/AlertCard";
import {
  Breadcrumbs,
  RuleStatusPill,
  UndoToast,
  compareAlerts,
  ruleScheduleLabel,
  ruleSeverityLabel,
} from "../components/alerts/alertUi";
import { useAlerts } from "../context/AlertsContext";
import { TypePill } from "../components/sop/SopTable";

// One rule: what it asks, how it runs, and every alert it has raised — active
// by default, with dismissed/cleared history a toggle away so an operator can
// judge whether the rule is noisy.
export function AlertRuleDetail() {
  const { ruleId } = useParams<{ ruleId: string }>();
  const { getRule, alertsForRule, setRuleStatus } = useAlerts();
  const rule = getRule(ruleId);
  const brand = getBrand(rule?.brandId);
  const [view, setView] = useState<"active" | "history">("active");
  const { onDismiss, toast } = useDismissToast();

  const ruleAlerts = useMemo(() => (rule ? alertsForRule(rule.id) : []), [rule, alertsForRule]);
  const active = ruleAlerts.filter((a) => a.status === "active").sort(compareAlerts);
  const history = ruleAlerts
    .filter((a) => a.status !== "active")
    .sort((a, b) => (b.dismissedAt ?? b.resolvedAt ?? "").localeCompare(a.dismissedAt ?? a.resolvedAt ?? ""));
  const shown = view === "active" ? active : history;

  const crumbs = [
    { label: "Automations", to: "/internal-ops/sops/list" },
    ...(brand ? [{ label: brand.name, to: `/internal-ops/sops/brands/${brand.id}` }] : []),
  ];

  if (!rule || !brand) {
    return (
      <div className="mx-auto max-w-4xl">
        <Breadcrumbs items={crumbs} />
        <EmptyState icon={ListChecks} title="Alert Automation not found" description={`No Alert Automation with id "${ruleId}".`} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Breadcrumbs items={crumbs} />
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900">{rule.name}</h1>
            <TypePill type="Alert" />
            <RuleStatusPill status={rule.status} />
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
            <BrandChip name={brand.name} color={brand.color} />
            <span aria-hidden>·</span>
            <User className="h-3.5 w-3.5" /> {rule.ownerName}
            <span aria-hidden>·</span>
            <span title={formatDateTime(rule.updatedAt)}>Edited {formatRelative(rule.updatedAt)}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {rule.status === "active" && (
            <button
              type="button"
              onClick={() => setRuleStatus(rule.id, "inactive")}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Deactivate
            </button>
          )}
          <Link
            to={`/internal-ops/alerts/${rule.id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Link>
          {rule.status !== "active" && (
            <button
              type="button"
              onClick={() => setRuleStatus(rule.id, "active")}
              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              {rule.status === "draft" ? "Activate" : "Reactivate"}
            </button>
          )}
        </div>
      </div>

      {rule.status === "draft" && (
        <p className="mb-4 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-600">
          This Alert Automation is a draft. Its rule won't run or raise messages until it's activated.
        </p>
      )}
      {rule.status === "inactive" && (
        <p className="mb-4 rounded-lg bg-slate-100 px-4 py-2.5 text-sm text-slate-600">
          This rule is switched off. Existing alerts stay in its history; no new ones will be raised.
        </p>
      )}

      <section className="mb-8 rounded-xl border border-slate-200 bg-white shadow-sm">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-t-xl bg-slate-100 sm:grid-cols-4">
          {[
            ["Severity", ruleSeverityLabel(rule) + (rule.severity === "per_alert" ? " (AI decides)" : "")],
            ["Runs", ruleScheduleLabel(rule)],
            ["Last triggered", rule.lastTriggeredAt ? formatRelative(rule.lastTriggeredAt) : "Never"],
            ["Active alerts", String(active.length)],
          ].map(([k, v]) => (
            <div key={k} className="bg-white px-4 py-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{k}</dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-800">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="border-t border-slate-100 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Prompt</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{rule.prompt}</p>
        </div>
      </section>

      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">
          Alerts from this rule <span className="font-normal text-slate-400">· {active.length} active</span>
        </h2>
        <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
          {(
            [
              ["active", `Active (${active.length})`],
              ["history", `Dismissed & cleared (${history.length})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              aria-pressed={view === key}
              className={`rounded-md px-3 py-1 font-medium ${view === key ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title={view === "active" ? "No active alerts from this rule" : "No dismissed or cleared alerts yet"}
        />
      ) : (
        <div className="space-y-3">
          {shown.map((a) => (
            <AlertCard key={a.id} alert={a} showBrand={false} showRule={false} onDismiss={onDismiss} />
          ))}
        </div>
      )}

      {toast && <UndoToast {...toast} />}
    </div>
  );
}
