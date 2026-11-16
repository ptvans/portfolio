import { Truck } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../../../components/EmptyState";
import { PageHeader } from "../../../components/PageHeader";
import { StatusBadge } from "../../../components/StatusBadge";
import { getRegion, getWorkOrder, networkOperators, tasksForNetworkOperator } from "../../../data";
import { useBrandFilter } from "../context/BrandFilterContext";

export function NetworkOperators() {
  const { matches, isAll } = useBrandFilter();
  const rows = useMemo(
    () =>
      networkOperators
        .map((no) => {
          const noTasks = tasksForNetworkOperator(no.id);
          // Which of this operator's brands are in scope of the current filter.
          const brandMatch = noTasks.some((t) => matches(getWorkOrder(t.workOrderId)?.brandId));
          const openTasks = noTasks.filter(
            (t) => t.status !== "completed" && t.status !== "cancelled"
          ).length;
          return { no, region: getRegion(no.regionId), openTasks, brandMatch };
        })
        // With a brand filter active, drop operators that do no work for those brands.
        .filter((row) => isAll || row.brandMatch),
    [matches, isAll]
  );

  return (
    <div>
      <PageHeader
        title="Network Operators"
        description="Every local partner executing jobs on the Build network."
      />

      {rows.length === 0 ? (
        <EmptyState icon={Truck} title="No network operators yet" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Network Operator</th>
                <th className="px-4 py-3 font-medium">Region</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Team Size</th>
                <th className="px-4 py-3 font-medium">Open Tasks</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ no, region, openTasks }) => (
                <tr key={no.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      to={`/internal-ops/network-operators/${no.id}`}
                      className="font-medium text-slate-900 hover:text-brand-600"
                    >
                      {no.name}
                    </Link>
                    <p className="text-xs text-slate-400">{no.contactName}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{region?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={no.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{no.fieldOperatorIds.length}</td>
                  <td className="px-4 py-3 text-slate-600">{openTasks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
