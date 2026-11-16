import { ArrowLeft, Boxes, MapPin, Plus, Workflow } from "lucide-react";
import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { EmptyState } from "../../../components/EmptyState";
import { PageHeader } from "../../../components/PageHeader";
import { StatusBadge } from "../../../components/StatusBadge";
import {
  deploymentsForBrand,
  getBrand,
  getCustomer,
  getOrderKind,
  getRegion,
  getWarehouse,
  inventoryForBrand,
  regionsForBrand,
  workOrdersForBrand,
} from "../../../data";
import { formatDate } from "../../../lib/format";
import { SopTable } from "../components/sop/SopTable";
import { useSops } from "../context/SopContext";

export function BrandDetail() {
  const { id } = useParams<{ id: string }>();
  const brand = id ? getBrand(id) : undefined;
  const navigate = useNavigate();
  const { sopsForBrand, createDraft } = useSops();
  const brandSops = id ? sopsForBrand(id) : [];

  const newSop = () => {
    if (!brand) return;
    const sopId = createDraft(brand.id, `${brand.name} New Automation`);
    navigate(`/internal-ops/sops/${sopId}/versions/1`);
  };

  const workOrders = useMemo(() => (id ? workOrdersForBrand(id) : []), [id]);
  const inventory = useMemo(() => (id ? inventoryForBrand(id) : []), [id]);
  const deployments = useMemo(() => (id ? deploymentsForBrand(id) : []), [id]);
  const brandRegions = useMemo(() => (id ? regionsForBrand(id) : []), [id]);

  if (!brand) {
    return (
      <div>
        <Link
          to="/internal-ops/brands"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          Back to Brands
        </Link>
        <EmptyState icon={Boxes} title="Brand not found" description={`No brand with id "${id}".`} />
      </div>
    );
  }

  return (
    <div>
      <Link
        to="/internal-ops/brands"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        Back to Brands
      </Link>

      <PageHeader
        title={brand.name}
        description={brand.description}
        actions={
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: brand.color }}
          >
            {brand.logoInitials}
          </span>
        }
      />

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Regions ({brandRegions.length})</h2>
        {brandRegions.length === 0 ? (
          <EmptyState icon={MapPin} title="No regions" />
        ) : (
          <div className="flex flex-wrap gap-2">
            {brandRegions.map((region) => (
              <div
                key={region.id}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1.5 pl-2.5 pr-2 shadow-sm"
              >
                <MapPin className="h-4 w-4 text-brand-600" strokeWidth={2} />
                <span className="text-sm font-medium text-slate-700">{region.name}</span>
                <StatusBadge status={region.status} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SOPs: the processes Brick runs for this brand, as executable records
          Stella reads and runs (see docs/prd-sop-platform.html). */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Automations ({brandSops.length})</h2>
          <button
            type="button"
            onClick={newSop}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-700"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            New Automation
          </button>
        </div>
        {brandSops.length === 0 ? (
          <EmptyState
            icon={Workflow}
            title="No Automations yet"
            description="Describe a process to Stella and it compiles into an executable Automation scoped to this brand."
          />
        ) : (
          <SopTable sops={brandSops} />
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Work Orders ({workOrders.length})</h2>
        {workOrders.length === 0 ? (
          <EmptyState icon={Boxes} title="No work orders" />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Order Kind</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Tasks</th>
                </tr>
              </thead>
              <tbody>
                {workOrders
                  .slice()
                  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                  .map((wo) => {
                    const customer = getCustomer(wo.customerId);
                    const orderKind = getOrderKind(wo.orderKindId);
                    return (
                      <tr key={wo.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {customer?.name ?? "Unknown customer"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{orderKind?.name ?? "—"}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={wo.status} />
                        </td>
                        <td className="px-4 py-3 text-slate-500">{formatDate(wo.createdAt)}</td>
                        <td className="px-4 py-3 text-slate-500">{wo.taskIds.length}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Inventory ({inventory.length})</h2>
        {inventory.length === 0 ? (
          <EmptyState icon={Boxes} title="No inventory" />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Warehouse</th>
                  <th className="px-4 py-3 font-medium">Quantity</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item) => {
                  const warehouse = getWarehouse(item.warehouseId);
                  return (
                    <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.sku ?? "—"}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                      <td className="px-4 py-3 text-slate-600">{warehouse?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {item.quantity}
                        <span className="ml-1 text-xs text-slate-400">/ {item.reorderThreshold} min</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.status} />
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
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Deployments ({deployments.length})</h2>
        {deployments.length === 0 ? (
          <EmptyState icon={Boxes} title="No deployments" />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Region</th>
                  <th className="px-4 py-3 font-medium">Warehouse</th>
                  <th className="px-4 py-3 font-medium">Quantity</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">ETA</th>
                </tr>
              </thead>
              <tbody>
                {deployments.map((dep) => {
                  const region = getRegion(dep.regionId);
                  const warehouse = getWarehouse(dep.warehouseId);
                  return (
                    <tr key={dep.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600">{region?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{warehouse?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{dep.quantity}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={dep.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(dep.eta)}</td>
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
