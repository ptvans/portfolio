// The brand label used across Internal Ops lists: a colour swatch plus the
// brand name on a light pill. Originated on the Projects index.
export function BrandChip({ name, color }: { name: string; color?: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1">
      <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: color ?? "#64748b" }} />
      <span className="text-sm font-medium text-slate-600">{name}</span>
    </span>
  );
}
