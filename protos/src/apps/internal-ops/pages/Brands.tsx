import { Boxes } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { BrandChip } from "../../../components/BrandChip";
import { EmptyState } from "../../../components/EmptyState";
import { PageHeader } from "../../../components/PageHeader";
import { brands, inventoryItems, tasksForBrand, workOrdersForBrand } from "../../../data";

export function Brands() {
  const rows = useMemo(
    () =>
      brands.map((brand) => {
        const workOrders = workOrdersForBrand(brand.id);
        const tasks = tasksForBrand(brand.id);
        const activeJobs = workOrders.filter((wo) => wo.status === "active").length;
        const openTasks = tasks.filter((t) => t.status !== "completed" && t.status !== "cancelled").length;
        const lowStock = inventoryItems.filter(
          (i) => i.brandId === brand.id && i.status === "low_stock"
        ).length;
        return { brand, activeJobs, openTasks, lowStock };
      }),
    []
  );

  return (
    <div>
      <PageHeader title="Brands" description="Every brand running jobs on the Build network." />

      {rows.length === 0 ? (
        <EmptyState icon={Boxes} title="No brands yet" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Brand</th>
                <th className="px-4 py-3 font-medium">Active Jobs</th>
                <th className="px-4 py-3 font-medium">Open Tasks</th>
                <th className="px-4 py-3 font-medium">Low Stock</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ brand, activeJobs, openTasks, lowStock }) => (
                <tr key={brand.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/internal-ops/brands/${brand.id}`} className="inline-flex hover:opacity-80">
                      <BrandChip name={brand.name} color={brand.color} />
                    </Link>
                    <p className="mt-1 text-xs text-slate-400">{brand.description}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{activeJobs}</td>
                  <td className="px-4 py-3 text-slate-600">{openTasks}</td>
                  <td className="px-4 py-3">
                    {lowStock > 0 ? (
                      <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                        {lowStock} item{lowStock === 1 ? "" : "s"}
                      </span>
                    ) : (
                      <span className="text-slate-400">None</span>
                    )}
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
