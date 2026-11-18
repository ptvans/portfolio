import { Minus, Plus, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { SolIcon } from "../../apps/internal-ops/components/sol/SolIcon";
import { TRACKING_STARTED, getAssetType, stakeholders, type Asset } from "../../data/assets";
import { bufferFor, type LocationUsage } from "../../lib/batteryCheck";
import { useAssets } from "../../state/AssetsContext";

// The daily limit the fleet charges to (Tesla Model Y).
const CHARGE_LIMIT = 90;
import { SectionCard, suppliesStatus } from "./AssetBits";

// Sol's battery-usage estimate, split by location.
export function UsageByLocationCard({ brandId }: { brandId: string }) {
  const { usage, policy, estimateRanAt, estimating, rerunEstimate } = useAssets();
  const withData = usage.filter((u) => u.samples > 0 && u.location.brandId === brandId);
  const max = Math.max(...withData.map((u) => u.ratePctPerHr), 1);
  const nearest = withData[0];
  const farthest = withData[withData.length - 1];
  const totalSamples = withData.reduce((a, u) => a + u.samples, 0);
  const needed = (u: LocationUsage, hours: number) => Math.min(100, Math.ceil(u.ratePctPerHr * hours + bufferFor(u.location, policy)));

  return (
    <SectionCard
      title={
        <span className="inline-flex items-center gap-2">
          <SolIcon size={18} thinking={estimating} /> Battery use by location
        </span>
      }
      subtitle={
        estimating
          ? "Sol is re-reading the check-out / check-in logs…"
          : `Sol's estimate from ${totalSamples} check-out / check-in pairs since ${TRACKING_STARTED} · updated ${estimateRanAt}`
      }
      actions={
        <button
          type="button"
          onClick={rerunEstimate}
          disabled={estimating}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${estimating ? "animate-spin" : ""}`} /> Re-estimate
        </button>
      }
    >
      {withData.length === 0 ? (
        <p className="px-5 py-4 text-sm text-slate-500">Not enough check-in / check-out data yet.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr className="border-b border-slate-100">
                  <th className="px-5 py-2 font-medium">Store</th>
                  <th className="px-3 py-2 font-medium">Usage per shift hour</th>
                  <th className="px-3 py-2 text-right font-medium">Avg shift</th>
                  <th className="px-3 py-2 text-right font-medium">Buffer</th>
                  <th className="px-5 py-2 text-right font-medium">Needs at checkout · 4h / 5h</th>
                </tr>
              </thead>
              <tbody>
                {withData.map((u) => {
                  const far = u.location.milesFromBase > 10;
                  return (
                    <tr key={u.location.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-5 py-2.5">
                        <p className="whitespace-nowrap text-slate-900">
                          {u.location.label.replace("Tso · ", "")}
                          {far && <span className="ml-2 rounded bg-amber-100 px-1.5 py-px text-[11px] font-medium text-amber-800">Far out</span>}
                        </p>
                        <p className="text-xs text-slate-400">
                          {u.location.milesFromBase} mi from garage · {u.samples} shifts
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="relative h-2 w-32 rounded-full bg-slate-100">
                            <div className={`absolute inset-y-0 left-0 rounded-full ${far ? "bg-amber-500" : "bg-brand-500"}`} style={{ width: `${(u.ratePctPerHr / max) * 100}%` }} />
                          </div>
                          <span className="font-semibold tabular-nums text-slate-900">{u.ratePctPerHr}%/hr</span>
                          <span className="whitespace-nowrap text-xs tabular-nums text-slate-400">
                            {u.minRate}–{u.maxRate}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">−{u.avgPerShiftPct}%</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{bufferFor(u.location, policy)}%</td>
                      <td className="px-5 py-2.5 text-right tabular-nums text-slate-900">
                        {needed(u, 4)}% / {needed(u, 5)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {nearest && farthest && nearest !== farthest && (
            <div className="flex gap-2.5 border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-sm text-slate-700">
              <SolIcon size={16} className="mt-0.5" />
              <p>
                The far-out stores burn about {(farthest.ratePctPerHr / nearest.ratePctPerHr).toFixed(1)}× the battery of{" "}
                {nearest.location.label.replace("Tso · ", "")}. A 5-hour {farthest.location.label.replace("Tso · ", "")} shift needs{" "}
                {needed(farthest, 5)}% at checkout to finish above the {policy.bufferPct}% buffer
                {needed(farthest, 5) > CHARGE_LIMIT
                  ? ` — more than the ${CHARGE_LIMIT}% daily charge limit, so those shifts need a full charge or a shorter block.`
                  : ` — only ${CHARGE_LIMIT - needed(farthest, 5)} points under the ${CHARGE_LIMIT}% daily charge limit, so a car that missed its overnight charge won't make it.`}
              </p>
            </div>
          )}
        </>
      )}
    </SectionCard>
  );
}

// The battery rules the check runs on. The brand edits them; the operator reads them.
export function BatteryPolicyCard({ editable }: { editable: boolean }) {
  const { policy, setPolicy } = useAssets();
  return (
    <SectionCard title="Battery policy" subtitle={editable ? "Applies to tonight's check as soon as you change it." : "Set by Autolane."}>
      <dl className="divide-y divide-slate-100 text-sm">
        <PolicyRow label="End-of-shift buffer" hint="Every vehicle should finish its shift at or above this.">
          <Stepper value={policy.bufferPct} min={5} max={40} step={5} suffix="%" editable={editable} onChange={(v) => setPolicy({ bufferPct: v })} />
        </PolicyRow>
        <PolicyRow label="Near-garage buffer" hint={`For stores within ${policy.nearBaseMiles} mi of the garage.`}>
          <Stepper value={policy.nearBaseBufferPct} min={5} max={40} step={5} suffix="%" editable={editable} onChange={(v) => setPolicy({ nearBaseBufferPct: v })} />
        </PolicyRow>
        <PolicyRow label="Battery degradation floor" hint="Flag a battery whose capacity drops below this.">
          <Stepper value={policy.degradationFlagPct} min={70} max={95} step={5} suffix="%" editable={editable} onChange={(v) => setPolicy({ degradationFlagPct: v })} />
        </PolicyRow>
        <PolicyRow label="Supercharging" hint="The 20–80% rule is treated as a non-issue for this fleet.">
          {editable ? (
            <button
              type="button"
              role="switch"
              aria-checked={policy.superchargeAllowed}
              onClick={() => setPolicy({ superchargeAllowed: !policy.superchargeAllowed })}
              className={`relative h-5 w-9 rounded-full transition-colors ${policy.superchargeAllowed ? "bg-brand-600" : "bg-slate-300"}`}
            >
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${policy.superchargeAllowed ? "left-[18px]" : "left-0.5"}`} />
            </button>
          ) : (
            <span className="text-slate-800">{policy.superchargeAllowed ? "Allowed" : "Not allowed"}</span>
          )}
        </PolicyRow>
        <PolicyRow label="Check timing" hint="The check runs before assignments post, not after.">
          <span className="whitespace-nowrap text-slate-800">
            {policy.runCheckAt} → post {policy.postAssignmentsAt}
          </span>
        </PolicyRow>
      </dl>
      <div className="border-t border-slate-100 px-5 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Notifies</p>
        <ul className="mt-1.5 space-y-1 text-sm">
          {stakeholders.map((s) => (
            <li key={s.id} className="text-slate-700">
              <span className="font-medium">{s.name}</span> <span className="text-slate-400">· {s.role} · {s.channel}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mx-5 mb-4 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
        <span className="font-medium">Open:</span> align with Nick Dallesandro on the floor (10% near the garage vs. 20% general) and on the
        degradation threshold.
      </div>
    </SectionCard>
  );
}

function PolicyRow({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3">
      <div className="min-w-0">
        <dt className="font-medium text-slate-900">{label}</dt>
        <dd className="text-xs text-slate-500">{hint}</dd>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Stepper({ value, min, max, step, suffix, editable, onChange }: { value: number; min: number; max: number; step: number; suffix: string; editable: boolean; onChange: (v: number) => void }) {
  if (!editable) return <span className="font-semibold tabular-nums text-slate-900">{value}{suffix}</span>;
  return (
    <div className="inline-flex items-center rounded-lg border border-slate-200">
      <button type="button" aria-label="Decrease" disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))} className="px-2 py-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-30">
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="w-12 text-center text-sm font-semibold tabular-nums">{value}{suffix}</span>
      <button type="button" aria-label="Increase" disabled={value >= max} onClick={() => onChange(Math.min(max, value + step))} className="px-2 py-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-30">
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// Supply levels across the fleet: one row per unit, one column per kit item.
export function SuppliesMatrix({ assets, editable, onSelect }: { assets: Asset[]; editable: boolean; onSelect: (id: string) => void }) {
  const { restock } = useAssets();
  const active = assets.filter((a) => a.state !== "offline");
  const kit = getAssetType(active[0]?.assetTypeId ?? "")?.supplyKit ?? [];
  if (kit.length === 0) return null;
  const shortCount = active.filter((a) => suppliesStatus(a).short.length > 0).length;
  return (
    <SectionCard title="In-vehicle supplies" subtitle={`Par levels per unit. ${shortCount} of ${active.length} units short of par.`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs text-slate-500">
            <tr className="border-b border-slate-100">
              <th className="px-5 py-2 font-medium uppercase tracking-wide">Unit</th>
              {kit.map((s) => (
                <th key={s.id} className="px-2 py-2 text-center font-medium leading-tight">
                  {s.label}
                  <span className="block font-normal text-slate-400">par {s.par}</span>
                </th>
              ))}
              {editable && <th className="px-5 py-2" />}
            </tr>
          </thead>
          <tbody>
            {active.map((a) => {
              const { short } = suppliesStatus(a);
              return (
                <tr key={a.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-5 py-2">
                    <button type="button" onClick={() => onSelect(a.id)} className="font-medium text-brand-600 hover:underline">
                      {a.unitId}
                    </button>
                  </td>
                  {kit.map((s) => {
                    const have = a.supplies[s.id] ?? 0;
                    const low = have < s.par;
                    return (
                      <td key={s.id} className="px-2 py-2 text-center">
                        <span className={`inline-block min-w-8 rounded px-1.5 py-0.5 tabular-nums ${low ? (have === 0 ? "bg-red-100 font-semibold text-red-700" : "bg-amber-100 font-semibold text-amber-800") : "text-slate-400"}`}>
                          {have}
                        </span>
                      </td>
                    );
                  })}
                  {editable && (
                    <td className="px-5 py-2 text-right">
                      {short.length > 0 && (
                        <button type="button" onClick={() => restock(a.id, kit)} className="whitespace-nowrap text-xs font-medium text-brand-600 hover:text-brand-700">
                          Mark restocked
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

