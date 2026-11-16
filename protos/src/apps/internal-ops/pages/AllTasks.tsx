import { ClipboardList, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { EmptyState } from "../../../components/EmptyState";
import { PageHeader } from "../../../components/PageHeader";
import { StatusBadge, TASK_STATUS_LABELS } from "../../../components/StatusBadge";
import {
  getBrand,
  getNetworkOperator,
  getTaskKind,
  getWorkOrder,
  networkOperators,
  tasks,
} from "../../../data";
import { formatDateTime } from "../../../lib/format";
import type { TaskStatus } from "../../../types/domain";
import { useBrandFilter } from "../context/BrandFilterContext";

const STATUS_OPTIONS: TaskStatus[] = ["not_started", "in_progress", "completed", "cancelled"];

export function AllTasks() {
  const { matches } = useBrandFilter();
  const [noFilter, setNoFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  // ?workOrder=<id> narrows to one work order (linked from alert cards).
  const [params, setParams] = useSearchParams();
  const woFilter = params.get("workOrder");
  const woFilterRecord = woFilter ? getWorkOrder(woFilter) : undefined;

  const rows = useMemo(() => {
    return tasks
      .map((task) => {
        const wo = getWorkOrder(task.workOrderId);
        const brand = wo ? getBrand(wo.brandId) : undefined;
        const no = getNetworkOperator(task.networkOperatorId);
        const kind = getTaskKind(task.taskKindId);
        return { task, wo, brand, no, kind };
      })
      .filter((row) => matches(row.brand?.id))
      .filter((row) => (noFilter === "all" ? true : row.no?.id === noFilter))
      .filter((row) => (statusFilter === "all" ? true : row.task.status === statusFilter))
      .filter((row) => (woFilter ? row.task.workOrderId === woFilter : true))
      .sort((a, b) => a.task.scheduledAt.localeCompare(b.task.scheduledAt));
  }, [matches, noFilter, statusFilter, woFilter]);

  return (
    <div>
      <PageHeader
        title="All Tasks"
        description="System-wide coordination board across every brand and network operator."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={noFilter}
          onChange={(e) => setNoFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
        >
          <option value="all">All network operators</option>
          {networkOperators.map((no) => (
            <option key={no.id} value={no.id}>
              {no.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
        >
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {TASK_STATUS_LABELS[s] ?? s.replaceAll("_", " ")}
            </option>
          ))}
        </select>

        {woFilter && (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-sm text-brand-700">
            Work order: {woFilterRecord?.title ?? woFilter}
            <button
              type="button"
              onClick={() => setParams({})}
              aria-label="Clear work order filter"
              className="text-brand-500 hover:text-brand-800"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        )}

        <span className="text-xs text-slate-400">
          {rows.length} task{rows.length === 1 ? "" : "s"}
        </span>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No tasks match these filters" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Brand</th>
                <th className="px-4 py-3 font-medium">Network Operator</th>
                <th className="px-4 py-3 font-medium">Task Kind</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Scheduled</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ task, brand, no, kind }) => (
                <tr key={task.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">{brand?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{no?.name ?? "Unassigned"}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{kind?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{task.location}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDateTime(task.scheduledAt)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={task.status} kind="task" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
