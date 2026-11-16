import { Bot, Car, PlugZap, Zap, ZapOff, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { getAssetType, type Asset, type AssetState, type HealthLevel } from "../../data/assets";

// Small building blocks shared by the Brand and Network Operator Assets pages.

export const STATE_META: Record<AssetState, { label: string; className: string }> = {
  on_shift: { label: "On shift", className: "bg-brand-100 text-brand-700" },
  charging: { label: "Charging", className: "bg-emerald-100 text-emerald-700" },
  available: { label: "Available", className: "bg-slate-100 text-slate-700" },
  service: { label: "In service", className: "bg-amber-100 text-amber-800" },
  offline: { label: "Offline", className: "bg-slate-200 text-slate-500" },
};

export function AssetStateBadge({ state }: { state: AssetState }) {
  const m = STATE_META[state];
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${m.className}`}>{m.label}</span>;
}

const HEALTH_META: Record<HealthLevel, { label: string; dot: string; text: string }> = {
  good: { label: "Good", dot: "bg-emerald-500", text: "text-slate-700" },
  attention: { label: "Attention", dot: "bg-amber-500", text: "text-amber-800" },
  critical: { label: "Critical", dot: "bg-red-500", text: "text-red-700" },
};

export function HealthBadge({ level, detail }: { level: HealthLevel; detail?: string }) {
  const m = HEALTH_META[level];
  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 text-sm ${m.text}`}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${m.dot}`} />
      <span className="truncate">{detail ?? m.label}</span>
    </span>
  );
}

// Battery colour follows how worried to be, not a brand colour.
export function socTone(soc: number) {
  if (soc < 25) return { bar: "bg-red-500", text: "text-red-700" };
  if (soc < 50) return { bar: "bg-amber-500", text: "text-amber-700" };
  return { bar: "bg-emerald-500", text: "text-slate-900" };
}

export function BatteryBar({ asset, wide = false }: { asset: Asset; wide?: boolean }) {
  const tone = socTone(asset.soc);
  const type = getAssetType(asset.assetTypeId);
  const range = type?.ratedRangeMi ? Math.round((type.ratedRangeMi * asset.soc * asset.health.batteryHealthPct) / 10000) : null;
  return (
    <div className="flex items-center gap-2.5">
      <div className={`relative h-2 overflow-hidden rounded-full bg-slate-200 ${wide ? "w-28" : "w-16"}`}>
        <div className={`absolute inset-y-0 left-0 rounded-full ${tone.bar}`} style={{ width: `${Math.max(2, asset.soc)}%` }} />
      </div>
      <span className={`w-9 text-sm font-semibold tabular-nums ${tone.text}`}>{asset.soc}%</span>
      <ChargeIcon asset={asset} />
      {range !== null && <span className="whitespace-nowrap text-xs tabular-nums text-slate-400">{range} mi</span>}
    </div>
  );
}

export function ChargeIcon({ asset }: { asset: Asset }) {
  const s = asset.charging.status;
  if (s === "charging") return <Zap className="h-3.5 w-3.5 fill-emerald-500 text-emerald-600" strokeWidth={2} aria-label="Charging" />;
  if (s === "charger_fault") return <ZapOff className="h-3.5 w-3.5 text-red-600" strokeWidth={2} aria-label="Charger fault" />;
  if (s === "unplugged" && asset.state !== "service" && asset.state !== "offline")
    return <PlugZap className="h-3.5 w-3.5 text-amber-600" strokeWidth={2} aria-label="Not plugged in" />;
  return <span className="h-3.5 w-3.5" />;
}

export function chargeLabel(asset: Asset): string {
  const c = asset.charging;
  switch (c.status) {
    case "charging":
      return `Charging · ${c.charger ?? "charger"}${c.ratePctPerHr ? ` · +${c.ratePctPerHr}%/hr` : ""}`;
    case "full":
      return `Plugged in, at charge limit · ${c.charger ?? "charger"}`;
    case "unplugged":
      return "Not plugged in";
    case "charger_fault":
      return `Charger fault · ${c.charger ?? "charger"}`;
    case "swappable":
      return "Swappable battery pack";
  }
}

export function Sparkline({ values, height = 44, className = "" }: { values: number[]; height?: number; className?: string }) {
  const w = 240;
  const max = 100;
  const step = w / Math.max(1, values.length - 1);
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(height - (v / max) * (height - 4) - 2).toFixed(1)}`);
  const last = values[values.length - 1] ?? 0;
  const stroke = last < 25 ? "#dc2626" : last < 50 ? "#d97706" : "#059669";
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className={`w-full ${className}`} style={{ height }} aria-hidden>
      <line x1="0" x2={w} y1={height - (20 / max) * (height - 4) - 2} y2={height - (20 / max) * (height - 4) - 2} stroke="#e2e8f0" strokeDasharray="3 3" />
      <polygon points={`0,${height} ${pts.join(" ")} ${w},${height}`} fill={stroke} opacity="0.08" />
      <polyline points={pts.join(" ")} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function AssetThumb({ asset, size = "md" }: { asset: Asset; size?: "md" | "lg" }) {
  const type = getAssetType(asset.assetTypeId);
  const cls = size === "lg" ? "h-28 w-full rounded-lg" : "h-9 w-12 rounded-md";
  if (type?.image) return <img src={type.image} alt={type.name} className={`${cls} shrink-0 bg-slate-100 object-cover`} />;
  const Icon: LucideIcon = type?.kind === "robot" ? Bot : Car;
  return (
    <span className={`${cls} flex shrink-0 items-center justify-center bg-slate-800 text-slate-300`}>
      <Icon className={size === "lg" ? "h-9 w-9" : "h-5 w-5"} strokeWidth={1.6} />
    </span>
  );
}

export function suppliesStatus(asset: Asset) {
  const kit = getAssetType(asset.assetTypeId)?.supplyKit ?? [];
  const short = kit.filter((s) => (asset.supplies[s.id] ?? 0) < s.par);
  return { kit, short, atPar: kit.length - short.length };
}

export function SuppliesBadge({ asset }: { asset: Asset }) {
  const { kit, short } = suppliesStatus(asset);
  if (kit.length === 0 || asset.state === "offline") return <span className="text-slate-400">—</span>;
  if (short.length === 0) return <span className="text-sm text-slate-500">Full kit</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-amber-800" title={short.map((s) => s.label).join(", ")}>
      <span className="h-2 w-2 rounded-full bg-amber-500" />
      {short.length} short
    </span>
  );
}

export function KpiTile({ label, value, sub, tone = "default" }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "default" | "warn" | "bad" | "good" }) {
  const valueTone = tone === "bad" ? "text-red-700" : tone === "warn" ? "text-amber-700" : tone === "good" ? "text-emerald-700" : "text-slate-900";
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${valueTone}`}>{value}</p>
      {sub && <p className="mt-0.5 truncate text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export function SectionCard({ title, subtitle, actions, children, className = "" }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:flex-nowrap">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      {children}
    </section>
  );
}

export function TabBar<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; count?: number; alert?: boolean }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            value === t.id ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          {t.label}
          {t.count !== undefined && (
            <span className={`rounded-full px-1.5 py-px text-xs tabular-nums ${t.alert ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function minutesAgo(iso: string, nowISO: string) {
  const m = Math.round((new Date(nowISO).getTime() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (m < 60 * 24) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / (60 * 24))}d ago`;
}
