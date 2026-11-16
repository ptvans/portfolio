import { useState } from "react";
import { FLEET_CLOCK, getAssetType, type Asset } from "../../data/assets";
import type { CheckRow } from "../../lib/batteryCheck";
import { AssetStateBadge, AssetThumb, BatteryBar, HealthBadge, SuppliesBadge, minutesAgo, suppliesStatus } from "./AssetBits";

type Filter = "all" | "low" | "attention" | "supplies";

// The live fleet table. `tonight` maps an asset id to the check row it's
// booked on, so the table can show where each car is going tonight.
export function FleetTable({
  assets,
  selectedId,
  onSelect,
  tonight,
}: {
  assets: Asset[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  tonight?: Map<string, CheckRow>;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const isLow = (a: Asset) => a.soc < 50 && a.state !== "offline";
  const needsAttention = (a: Asset) => a.health.level !== "good";
  const suppliesShort = (a: Asset) => suppliesStatus(a).short.length > 0 && a.state !== "offline";

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "All", count: assets.length },
    { id: "low", label: "Low battery", count: assets.filter(isLow).length },
    { id: "attention", label: "Health issues", count: assets.filter(needsAttention).length },
    { id: "supplies", label: "Supplies short", count: assets.filter(suppliesShort).length },
  ];
  const rows = assets.filter((a) =>
    filter === "low" ? isLow(a) : filter === "attention" ? needsAttention(a) : filter === "supplies" ? suppliesShort(a) : true,
  );
  const showTonight = Boolean(tonight && tonight.size > 0);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap gap-1.5 border-b border-slate-100 px-4 py-3">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === f.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {f.label} <span className="ml-0.5 tabular-nums opacity-70">{f.count}</span>
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">Unit</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Battery</th>
              <th className="px-4 py-2.5 font-medium">Health</th>
              <th className="px-4 py-2.5 font-medium">Supplies</th>
              {showTonight && <th className="px-4 py-2.5 font-medium">Tonight</th>}
              <th className="px-4 py-2.5 font-medium">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const isSel = a.id === selectedId;
              const row = tonight?.get(a.id);
              const topWarning = a.health.warnings[0];
              return (
                <tr
                  key={a.id}
                  onClick={() => onSelect(a.id)}
                  className={`cursor-pointer border-b border-slate-100 last:border-0 ${isSel ? "bg-brand-50" : "hover:bg-slate-50"}`}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <AssetThumb asset={a} />
                      <div className="min-w-0">
                        <p className="font-medium text-brand-600">{a.unitId}</p>
                        <p className="truncate text-xs text-slate-400">{getAssetType(a.assetTypeId)?.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <AssetStateBadge state={a.state} />
                  </td>
                  <td className="px-4 py-2.5">
                    <BatteryBar asset={a} />
                  </td>
                  <td className="max-w-[220px] px-4 py-2.5">
                    <HealthBadge level={a.health.level} detail={topWarning ? shortWarning(topWarning.label) : undefined} />
                  </td>
                  <td className="px-4 py-2.5">
                    <SuppliesBadge asset={a} />
                  </td>
                  {showTonight && (
                    <td className="px-4 py-2.5">
                      {row ? (
                        <div className="min-w-0">
                          <p className="truncate text-slate-800">{row.location.label.replace("Tso · ", "")}</p>
                          <p className="truncate text-xs text-slate-400">
                            {row.assignment.driver} · {row.assignment.start}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400">{a.state === "available" || a.state === "charging" ? "Spare" : "—"}</span>
                      )}
                    </td>
                  )}
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">{minutesAgo(a.lastSeenISO, FLEET_CLOCK.nowISO)}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">
                  Nothing matches this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function shortWarning(label: string) {
  return label.split(" — ")[0];
}
