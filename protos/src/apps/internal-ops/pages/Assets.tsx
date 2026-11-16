// Assets: every individually tracked unit (vehicles, robots) on the network,
// across brands and network operators — the Internal Ops roll-up of the
// Brand and NO Assets pages. Read-only: operators manage their own fleets.
// Narrowed by the header's brand filter; ?asset= opens a unit's drawer.

import { Car } from "lucide-react";
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { EmptyState } from "../../../components/EmptyState";
import { PageHeader } from "../../../components/PageHeader";
import { KpiTile, suppliesStatus } from "../../../components/assets/AssetBits";
import { AssetDrawer } from "../../../components/assets/AssetDrawer";
import { FleetTable } from "../../../components/assets/FleetTable";
import { getBrand, getNetworkOperator } from "../../../data";
import type { CheckRow } from "../../../lib/batteryCheck";
import { useAssets } from "../../../state/AssetsContext";
import { useBrandFilter } from "../context/BrandFilterContext";

export function Assets() {
  const { fleet, checkRows } = useAssets();
  const { matches } = useBrandFilter();
  const [params, setParams] = useSearchParams();

  const assets = useMemo(() => fleet.filter((a) => matches(a.brandId)), [fleet, matches]);
  const tonight = useMemo(() => new Map<string, CheckRow>(checkRows.map((r) => [r.asset.id, r])), [checkRows]);

  const selectedId = params.get("asset");
  const selected = assets.find((a) => a.id === selectedId) ?? null;
  const select = (id: string | null) => setParams(id ? { asset: id } : {}, { replace: true });

  // Which brand fleets and operators are in view, for the description.
  const fleets = [...new Set(assets.map((a) => a.brandId))].map((id) => getBrand(id)?.name).filter(Boolean);
  const operators = new Set(assets.map((a) => a.networkOperatorId));

  if (assets.length === 0) {
    return (
      <>
        <PageHeader title="Assets" />
        <EmptyState icon={Car} title="No tracked assets" description="No brand in the current filter has individually tracked units." />
      </>
    );
  }

  const live = assets.filter((a) => a.state !== "offline");
  const avgSoc = Math.round(live.reduce((s, a) => s + a.soc, 0) / Math.max(1, live.length));
  const healthIssues = assets.filter((a) => a.health.level !== "good").length;
  const suppliesShort = live.filter((a) => suppliesStatus(a).short.length > 0).length;
  const flagged = checkRows.filter((r) => matches(r.asset.brandId) && r.projection.verdict !== "ok").length;

  return (
    <div className={selected ? "lg:pr-[400px]" : ""}>
      <PageHeader
        title="Assets"
        description={`Live battery, health and supplies for ${fleets.join(", ")}: ${assets.length} units run by ${operators.size} network ${operators.size === 1 ? "operator" : "operators"}${
          operators.size === 1 ? ` (${getNetworkOperator([...operators][0])?.name ?? ""})` : ""
        }.`}
      />

      <div className={`mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 ${selected ? "2xl:grid-cols-5" : "xl:grid-cols-5"}`}>
        <KpiTile label="In service" value={`${live.length}/${assets.length}`} sub={`${assets.length - live.length} offline`} />
        <KpiTile label="Average battery" value={`${avgSoc}%`} sub="Across live units" tone={avgSoc < 50 ? "warn" : "default"} />
        <KpiTile label="Health issues" value={healthIssues} sub="Open warnings" tone={healthIssues > 0 ? "warn" : "good"} />
        <KpiTile label="Supplies short" value={suppliesShort} sub="Units below par" tone={suppliesShort > 0 ? "warn" : "good"} />
        <KpiTile
          label="Tonight's battery check"
          value={flagged > 0 ? `${flagged} flagged` : "Clear"}
          sub="Pre-assignment check"
          tone={flagged > 0 ? "bad" : "good"}
        />
      </div>

      <FleetTable assets={assets} selectedId={selectedId} onSelect={select} tonight={tonight} />

      {selected && (
        <AssetDrawer
          asset={selected}
          onClose={() => select(null)}
          editable={false}
          tonight={tonight.get(selected.id)}
          inventoryHref={`/internal-ops/inventory?item=${selected.inventoryItemId}`}
        />
      )}
    </div>
  );
}
