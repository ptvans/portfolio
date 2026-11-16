// Inventory: every brand's stock across every warehouse in one table — the
// Internal Ops view of what each brand sees on its own Inventory page.
// Narrowed by the header's brand filter, a search, and a low-stock toggle.
// ?item= highlights one row (the Assets drawer links here).

import { Boxes, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BrandChip } from "../../../components/BrandChip";
import { EmptyState } from "../../../components/EmptyState";
import { PageHeader } from "../../../components/PageHeader";
import { StatusBadge } from "../../../components/StatusBadge";
import { getBrand, getWarehouse, inventoryItems } from "../../../data";
import { useBrandFilter } from "../context/BrandFilterContext";

export function Inventory() {
  const { matches } = useBrandFilter();
  const [params] = useSearchParams();
  const highlight = params.get("item");
  const [q, setQ] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const highlightRef = useRef<HTMLTableRowElement>(null);

  const scoped = useMemo(() => inventoryItems.filter((i) => matches(i.brandId)), [matches]);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return scoped
      .filter((i) => !lowOnly || i.status === "low_stock")
      .filter((i) => {
        if (!needle) return true;
        const brand = getBrand(i.brandId)?.name ?? "";
        const warehouse = getWarehouse(i.warehouseId)?.name ?? "";
        return `${i.name} ${i.sku ?? ""} ${i.unitId ?? ""} ${brand} ${warehouse}`.toLowerCase().includes(needle);
      })
      .sort(
        (a, b) =>
          (getBrand(a.brandId)?.name ?? "").localeCompare(getBrand(b.brandId)?.name ?? "") || a.name.localeCompare(b.name),
      );
  }, [scoped, q, lowOnly]);

  useEffect(() => {
    highlightRef.current?.scrollIntoView({ block: "center" });
  }, [highlight]);

  const brandCount = new Set(scoped.map((i) => i.brandId)).size;
  const warehouseCount = new Set(scoped.map((i) => i.warehouseId)).size;
  const lowCount = scoped.filter((i) => i.status === "low_stock").length;

  return (
    <div>
      <PageHeader
        title="Inventory"
        description={`${scoped.length} items for ${brandCount} brands across ${warehouseCount} warehouses.`}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="flex h-9 w-72 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 shadow-sm">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search items, SKUs, brands, warehouses"
            className="min-w-0 flex-1 bg-transparent text-base text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={() => setLowOnly(!lowOnly)}
          aria-pressed={lowOnly}
          className={`h-9 rounded-lg border px-3 text-base font-medium shadow-sm transition-colors ${
            lowOnly ? "border-amber-300 bg-amber-50 text-amber-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Low stock · {lowCount}
        </button>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Boxes} title="No inventory matches" description="Try a different search or brand filter." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">Brand</th>
                <th className="px-4 py-3 font-medium">Warehouse</th>
                <th className="px-4 py-3 text-right font-medium">Quantity</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((i) => {
                const brand = getBrand(i.brandId);
                const isHighlit = i.id === highlight;
                return (
                  <tr key={i.id} ref={isHighlit ? highlightRef : undefined} className={isHighlit ? "bg-brand-50" : ""}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{i.name}</p>
                      <p className="text-xs text-slate-500">
                        {i.unitId ? `Unit ${i.unitId}` : i.sku ? `SKU ${i.sku}` : "No SKU"}
                        {i.operator ? ` · ${i.operator}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">{brand && <BrandChip name={brand.name} color={brand.color} />}</td>
                    <td className="px-4 py-3 text-slate-600">{getWarehouse(i.warehouseId)?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-900">
                      {i.quantity.toLocaleString()}
                      {i.status === "low_stock" && (
                        <span className="block text-xs text-amber-700">reorder at {i.reorderThreshold}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={i.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
