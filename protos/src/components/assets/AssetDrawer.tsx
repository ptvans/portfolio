import { ArrowRight, Minus, Plus, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { BASE_LABEL, FLEET_CLOCK, getAssetType, getUsageLocation, shiftLogs, type Asset } from "../../data/assets";
import type { CheckRow } from "../../lib/batteryCheck";
import { useAssets } from "../../state/AssetsContext";
import { AssetStateBadge, AssetThumb, HealthBadge, Sparkline, chargeLabel, minutesAgo, socTone, suppliesStatus } from "./AssetBits";
import { VerdictPill } from "./PreShiftCheck";

type Tab = "overview" | "health" | "supplies" | "history";

// Right-hand inspection panel for one asset. The operator can restock supplies
// from here; the brand sees the same panel read-only.
export function AssetDrawer({
  asset,
  onClose,
  editable,
  tonight,
  inventoryHref,
}: {
  asset: Asset;
  onClose: () => void;
  editable: boolean;
  tonight?: CheckRow;
  inventoryHref?: string;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const type = getAssetType(asset.assetTypeId);
  const { short } = suppliesStatus(asset);
  const logs = shiftLogs.filter((l) => l.assetId === asset.id).sort((a, b) => b.date.localeCompare(a.date));

  const tabs: { id: Tab; label: string; dot?: boolean }[] = [
    { id: "overview", label: "Overview" },
    { id: "health", label: "Health", dot: asset.health.level !== "good" },
    { id: "supplies", label: "Supplies", dot: short.length > 0 },
    { id: "history", label: "Shifts" },
  ];

  return (
    <aside className="fixed bottom-0 right-0 top-12 z-30 flex w-full max-w-[400px] flex-col border-l border-slate-200 bg-white shadow-xl">
      <div className="flex items-start justify-between gap-2 px-5 pb-3 pt-5">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{type?.name}</p>
          <h2 className="mt-0.5 flex items-center gap-2 text-lg font-semibold text-slate-900">
            {asset.unitId} <AssetStateBadge state={asset.state} />
          </h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex gap-1 border-b border-slate-200 px-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`-mb-px flex items-center gap-1.5 border-b-2 px-2.5 py-2 text-sm font-medium ${
              tab === t.id ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
            {t.dot && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {tab === "overview" && <Overview asset={asset} tonight={tonight} inventoryHref={inventoryHref} />}
        {tab === "health" && <Health asset={asset} />}
        {tab === "supplies" && <Supplies asset={asset} editable={editable} />}
        {tab === "history" && (
          <div>
            {logs.length === 0 ? (
              <p className="text-sm text-slate-500">No check-in / check-out records for this unit yet.</p>
            ) : (
              <>
                <p className="mb-3 text-xs text-slate-500">Battery at check-out and check-in for each shift since tracking started.</p>
                <ul className="divide-y divide-slate-100">
                  {logs.map((l) => {
                    const used = l.checkoutSoc - l.checkinSoc;
                    return (
                      <li key={l.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                        <div className="min-w-0">
                          <p className="text-slate-800">
                            {new Date(`${l.date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })} ·{" "}
                            {getUsageLocation(l.locationId)?.label.replace("Tso · ", "")}
                          </p>
                          <p className="truncate text-xs text-slate-400">
                            {l.driver} · {l.hours}h
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="tabular-nums text-slate-700">
                            {l.checkoutSoc}% → {l.checkinSoc}%
                          </p>
                          <p className="text-xs tabular-nums text-slate-400">
                            −{used}% · {(used / l.hours).toFixed(1)}%/hr
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function Overview({ asset, tonight, inventoryHref }: { asset: Asset; tonight?: CheckRow; inventoryHref?: string }) {
  const tone = socTone(asset.soc);
  const type = getAssetType(asset.assetTypeId);
  const range = type?.ratedRangeMi ? Math.round((type.ratedRangeMi * asset.soc * asset.health.batteryHealthPct) / 10000) : null;
  return (
    <div className="space-y-5">
      <AssetThumb asset={asset} size="lg" />

      <div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Battery</p>
            <p className={`text-3xl font-semibold tabular-nums ${tone.text}`}>
              {asset.soc}%{range !== null && <span className="ml-2 text-sm font-normal text-slate-400">≈ {range} mi</span>}
            </p>
          </div>
          <p className="pb-1 text-xs text-slate-500">Last 24h</p>
        </div>
        <Sparkline values={asset.socHistory} className="mt-2" />
        <p className="mt-2 text-sm text-slate-600">{chargeLabel(asset)}</p>
      </div>

      {tonight && (
        <div className="rounded-lg border border-slate-200 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Tonight</p>
            <VerdictPill verdict={tonight.projection.verdict} />
          </div>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {tonight.location.label} · {tonight.assignment.start}–{tonight.assignment.end}
          </p>
          <p className="text-sm text-slate-500">{tonight.assignment.driver}</p>
          <p className="mt-2 text-sm tabular-nums text-slate-700">
            {tonight.projection.startSoc}% at start → <span className="font-semibold">{tonight.projection.endSoc}%</span> at end
            <span className="text-slate-400"> (buffer {tonight.projection.bufferPct}%)</span>
          </p>
        </div>
      )}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <Field label="Location" value={asset.locationLabel} />
        <Field label="Last seen" value={minutesAgo(asset.lastSeenISO, FLEET_CLOCK.nowISO)} />
        <Field label="Home base" value={BASE_LABEL[asset.brandId] ?? "—"} />
        <Field label="Battery health" value={`${asset.health.batteryHealthPct}%`} />
      </dl>

      {inventoryHref && (
        <Link to={inventoryHref} className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
          View inventory record <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function Health({ asset }: { asset: Asset }) {
  const { policy } = useAssets();
  const h = asset.health;
  const degraded = h.batteryHealthPct > 0 && h.batteryHealthPct < policy.degradationFlagPct;
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Overall</p>
        <div className="mt-1">
          <HealthBadge level={h.level} />
        </div>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Open issues</p>
        {h.warnings.length === 0 ? (
          <p className="mt-1 text-sm text-slate-500">None.</p>
        ) : (
          <ul className="mt-1.5 space-y-2">
            {h.warnings.map((w) => (
              <li
                key={w.label}
                className={`rounded-lg px-3 py-2 text-sm ${w.level === "critical" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900"}`}
              >
                {w.label}
                {w.since && (
                  <span className="block text-xs opacity-70">since {minutesAgo(w.since, FLEET_CLOCK.nowISO)}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Battery health</p>
        <div className="mt-1.5 flex items-center gap-3">
          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
            <div className={`absolute inset-y-0 left-0 rounded-full ${degraded ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${h.batteryHealthPct}%` }} />
            <div className="absolute inset-y-0 w-px bg-slate-500" style={{ left: `${policy.degradationFlagPct}%` }} title="Degradation floor" />
          </div>
          <span className="text-sm font-semibold tabular-nums">{h.batteryHealthPct}%</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">Capacity vs. new. Flagged below {policy.degradationFlagPct}%.</p>
      </div>

      {h.tirePsi && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Tire pressure (psi)</p>
          <div className="mt-1.5 grid w-40 grid-cols-2 gap-1.5">
            {h.tirePsi.map((psi, i) => (
              <div key={i} className={`rounded-md px-2 py-1 text-center text-sm tabular-nums ${psi < 36 ? "bg-amber-100 font-semibold text-amber-900" : "bg-slate-100 text-slate-700"}`}>
                <span className="mr-1 text-[10px] text-slate-400">{["FL", "FR", "RL", "RR"][i]}</span>
                {psi}
              </div>
            ))}
          </div>
        </div>
      )}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        {h.odometerMi !== undefined && <Field label="Odometer" value={`${h.odometerMi.toLocaleString()} mi`} />}
        {h.lastServiceISO && (
          <Field label="Last service" value={new Date(`${h.lastServiceISO}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })} />
        )}
        {h.software && <Field label="Software" value={h.software} />}
      </dl>
    </div>
  );
}

function Supplies({ asset, editable }: { asset: Asset; editable: boolean }) {
  const { setSupply, restock } = useAssets();
  const { kit, short } = suppliesStatus(asset);
  if (kit.length === 0) return <p className="text-sm text-slate-500">This asset type has no supply kit.</p>;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate-600">{short.length === 0 ? "Everything at par." : `${short.length} item${short.length === 1 ? "" : "s"} below par.`}</p>
        {editable && short.length > 0 && (
          <button type="button" onClick={() => restock(asset.id, kit)} className="rounded-md bg-brand-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-700">
            Mark restocked
          </button>
        )}
      </div>
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {kit.map((s) => {
          const have = asset.supplies[s.id] ?? 0;
          const low = have < s.par;
          return (
            <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className={low ? "text-amber-900" : "text-slate-700"}>{s.label}</span>
              <div className="flex items-center gap-2">
                {editable && (
                  <button type="button" aria-label={`Fewer ${s.label}`} onClick={() => setSupply(asset.id, s.id, have - 1)} className="rounded p-0.5 text-slate-400 hover:bg-slate-100">
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                )}
                <span className={`w-12 text-center tabular-nums ${low ? "font-semibold text-amber-700" : "text-slate-500"}`}>
                  {have} / {s.par}
                </span>
                {editable && (
                  <button type="button" aria-label={`More ${s.label}`} onClick={() => setSupply(asset.id, s.id, have + 1)} className="rounded p-0.5 text-slate-400 hover:bg-slate-100">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 truncate text-slate-800">{value}</dd>
    </div>
  );
}
