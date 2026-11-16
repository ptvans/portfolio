import { Copy, Mail, MapPin, MoveRight, Plus } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../../components/PageHeader";
import { getBrand, projects } from "../../../data";
import type { Project, ProjectStatus } from "../../../types/domain";
import { useBrandFilter } from "../context/BrandFilterContext";

const SECTIONS: { status: ProjectStatus; label: string }[] = [
  { status: "requested", label: "Requested" },
  { status: "accepted", label: "Accepted" },
  { status: "started", label: "Started" },
  { status: "completed", label: "Completed" },
  { status: "cancelled", label: "Cancelled" },
];

const PREVIEW_LIMIT = 3;

function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
  });
}

// How the region reads on a card: "(Multiple)" for multi-region, the single
// region when there's one, else the fallback label ("n/a" / "Multiple").
function regionDisplay(p: Project): string {
  if (p.regionNames.length > 1) return "(Multiple)";
  if (p.regionNames.length === 1) return p.regionNames[0];
  return p.regionLabel === "Multiple" ? "(Multiple)" : p.regionLabel;
}

export function ProjectsDashboard() {
  const { matches } = useBrandFilter();
  const byStatus = useMemo(() => {
    const map: Record<string, Project[]> = {};
    for (const p of projects) {
      if (!matches(p.brandId)) continue;
      (map[p.status] ??= []).push(p);
    }
    return map;
  }, [matches]);

  return (
    <div>
      <PageHeader
        title="Projects"
        actions={
          <>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <Mail className="h-4 w-4" strokeWidth={2} />
              Create from Email
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              Create Project
            </button>
          </>
        }
      />

      <div className="space-y-6">
        {SECTIONS.map(({ status, label }) => {
          const list = byStatus[status] ?? [];
          if (list.length === 0) return null;
          const preview = list.slice(0, PREVIEW_LIMIT);
          const remaining = list.length - preview.length;
          const indexHref = `/internal-ops/projects/list?status=${status}`;
          return (
            <section key={status} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-slate-900">{label}</h2>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                    {list.length}
                  </span>
                </div>
                <Link to={indexHref} className="text-sm font-medium text-brand-600 hover:text-brand-700">
                  View All
                </Link>
              </div>

              <div className="space-y-2.5">
                {preview.map((p) => (
                  <ProjectRow key={p.id} project={p} />
                ))}
              </div>

              {remaining > 0 && (
                <div className="mt-3 text-center">
                  <Link to={indexHref} className="text-sm font-medium text-brand-600 hover:text-brand-700">
                    {remaining} more
                  </Link>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ProjectRow({ project: p }: { project: Project }) {
  const brand = getBrand(p.brandId);
  const brandName = p.brandName ?? brand?.name ?? "—";
  const brandColor = p.brandColor ?? brand?.color ?? "#64748b";
  const start = fmtDate(p.startDate);
  const end = fmtDate(p.endDate);
  return (
    <Link
      to={`/internal-ops/projects/${p.id}`}
      className="block rounded-lg border border-slate-200 px-4 py-3 transition hover:border-brand-300 hover:bg-slate-50"
    >
      <div className="flex items-start justify-between gap-4">
        {/* left: brand + name + ref, then dates */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1">
              <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: brandColor }} />
              <span className="text-sm font-medium text-slate-600">{brandName}</span>
            </span>
            <span className="truncate font-medium text-slate-900">{p.name}</span>
            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
              {p.referenceCode}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  navigator.clipboard?.writeText(p.referenceCode).catch(() => {});
                }}
                className="hover:text-slate-600"
                aria-label="Copy reference code"
              >
                <Copy className="h-3 w-3" />
              </button>
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-400">
            {start && end ? (
              <span>
                {start} - {end}
              </span>
            ) : start ? (
              <span className="inline-flex items-center gap-1.5">
                <MoveRight className="h-3.5 w-3.5" />
                {start}
              </span>
            ) : (
              <span>Dates TBD</span>
            )}
          </div>
        </div>

        {/* right: region + contact */}
        <div className="shrink-0 text-right">
          <div className="inline-flex items-center gap-1 text-sm text-slate-500">
            <span className={regionDisplay(p) === "(Multiple)" ? "text-brand-600" : undefined}>{regionDisplay(p)}</span>
            <MapPin className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-1 text-sm text-slate-500">{p.brickContact}</p>
        </div>
      </div>
    </Link>
  );
}
