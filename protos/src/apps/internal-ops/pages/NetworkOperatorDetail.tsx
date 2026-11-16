import { ArrowLeft, Truck, Users } from "lucide-react";
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../../../components/EmptyState";
import { PageHeader } from "../../../components/PageHeader";
import { StatusBadge } from "../../../components/StatusBadge";
import {
  fieldOperators,
  getNetworkOperator,
  getRegion,
  getTaskKind,
  getWarehouse,
  tasksForNetworkOperator,
  trips,
  vehicles,
} from "../../../data";
import { formatDateTime } from "../../../lib/format";

export function NetworkOperatorDetail() {
  const { id } = useParams<{ id: string }>();
  const no = id ? getNetworkOperator(id) : undefined;

  const operators = useMemo(
    () => (id ? fieldOperators.filter((fo) => fo.networkOperatorId === id) : []),
    [id]
  );
  const noVehicles = useMemo(
    () => (id ? vehicles.filter((v) => v.networkOperatorId === id) : []),
    [id]
  );
  const noTasks = useMemo(() => (id ? tasksForNetworkOperator(id) : []), [id]);
  const noTrips = useMemo(
    () => (id ? trips.filter((t) => operators.some((fo) => t.fieldOperatorIds.includes(fo.id))) : []),
    [id, operators]
  );

  if (!no) {
    return (
      <div>
        <Link
          to="/internal-ops/network-operators"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          Back to Network Operators
        </Link>
        <EmptyState icon={Truck} title="Network operator not found" description={`No NO with id "${id}".`} />
      </div>
    );
  }

  const region = getRegion(no.regionId);

  return (
    <div>
      <Link
        to="/internal-ops/network-operators"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        Back to Network Operators
      </Link>

      <PageHeader
        title={no.name}
        description={`${region?.name ?? "Unknown region"} · Contact: ${no.contactName} (${no.contactEmail})`}
        actions={<StatusBadge status={no.status} />}
      />

      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Users className="h-4 w-4" strokeWidth={2} />
          Field Operators ({operators.length})
        </h2>
        {operators.length === 0 ? (
          <EmptyState icon={Users} title="No field operators" />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {operators.map((fo) => (
              <div key={fo.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: fo.avatarColor }}
                >
                  {fo.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{fo.name}</p>
                  <StatusBadge status={fo.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Truck className="h-4 w-4" strokeWidth={2} />
          Vehicles ({noVehicles.length})
        </h2>
        {noVehicles.length === 0 ? (
          <EmptyState icon={Truck} title="No vehicles" />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {noVehicles.map((v) => (
              <div key={v.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-slate-900">{v.label}</p>
                <p className="text-xs capitalize text-slate-500">{v.type.replaceAll("_", " ")}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Trips ({noTrips.length})</h2>
        {noTrips.length === 0 ? (
          <EmptyState icon={Truck} title="No trips" />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Warehouse</th>
                  <th className="px-4 py-3 font-medium">Scheduled</th>
                  <th className="px-4 py-3 font-medium">Tasks</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {noTrips.map((trip) => {
                  const warehouse = getWarehouse(trip.warehouseId);
                  return (
                    <tr key={trip.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600">{warehouse?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-500">{formatDateTime(trip.scheduledAt)}</td>
                      <td className="px-4 py-3 text-slate-500">{trip.taskIds.length}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={trip.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Current Tasks ({noTasks.length})</h2>
        {noTasks.length === 0 ? (
          <EmptyState icon={Truck} title="No tasks" />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Kind</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Scheduled</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {noTasks
                  .slice()
                  .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
                  .map((task) => {
                    const kind = getTaskKind(task.taskKindId);
                    return (
                      <tr key={task.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{kind?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{task.location}</td>
                        <td className="px-4 py-3 text-slate-500">{formatDateTime(task.scheduledAt)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={task.status} kind="task" />
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
