import { Copy, Mail, MapPin, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EmptyState } from "../../../components/EmptyState";
import { FilterBar, type FilterField, type FilterToken } from "../../../components/FilterBar";
import { PageHeader } from "../../../components/PageHeader";
import { BrandChip } from "../../../components/BrandChip";
import { getBrand, projects } from "../../../data";
import type { Project, ProjectStatus } from "../../../types/domain";
import { useBrandFilter } from "../context/BrandFilterContext";

// Tab display order (also the default landing tab is the first entry).
const STATUS_ORDER: ProjectStatus[] = ["started", "accepted", "requested", "completed", "cancelled"];
const DEFAULT_STATUS: ProjectStatus = "started";
const STATUS_LABEL: Record<ProjectStatus, string> = {
  requested: "Requested",
  accepted: "Accepted",
  started: "Started",
  completed: "Completed",
  cancelled: "Cancelled",
};
const STATUS_PILL: Record<ProjectStatus, string> = {
  requested: "bg-slate-100 text-slate-600",
  accepted: "bg-blue-50 text-blue-700",
  started: "bg-brand-50 text-brand-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-rose-50 text-rose-700",
};

function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
  });
}
function regionDisplay(p: Project): string {
  if (p.regionNames.length > 1) return "(Multiple)";
  if (p.regionNames.length === 1) return p.regionNames[0];
  return p.regionLabel === "Multiple" ? "(Multiple)" : p.regionLabel;
}
function dateRange(p: Project): string {
  const start = fmtDate(p.startDate);
  const end = fmtDate(p.endDate);
  if (start && end) return `${start} - ${end}`;
  if (start) return start;
  return "—";
}

// --- Filter configuration ---------------------------------------------------
// Options are derived from the project data so the typeahead only ever offers
// values that actually exist.

const uniqueSorted = (vals: string[]) =>
  [...new Set(vals)].filter(Boolean).sort((a, b) => a.localeCompare(b));

const BRAND_OPTIONS = uniqueSorted(projects.map((p) => p.brandId)).map((id) => ({
  value: id,
  label: getBrand(id)?.name ?? id,
}));
const PROJECT_OPTIONS = projects
  .map((p) => ({ value: p.id, label: p.name }))
  .sort((a, b) => a.label.localeCompare(b.label));
const REGION_OPTIONS = uniqueSorted(
  projects.flatMap((p) =>
    p.regionNames.length ? p.regionNames : p.regionLabel === "Multiple" || p.regionLabel === "n/a" ? [] : [p.regionLabel],
  ),
).map((r) => ({ value: r, label: r }));
const BRICK_CONTACT_OPTIONS = uniqueSorted(projects.map((p) => p.brickContact).filter((c) => c !== "—")).map((c) => ({
  value: c,
  label: c,
}));
const BRAND_CONTACT_OPTIONS = uniqueSorted(projects.map((p) => p.brandContactName).filter((c) => c !== "—")).map((c) => ({
  value: c,
  label: c,
}));

const FILTER_FIELDS: FilterField[] = [
  { key: "brand", label: "Brand", type: "select", options: BRAND_OPTIONS },
  { key: "project", label: "Project", type: "select", options: PROJECT_OPTIONS },
  { key: "region", label: "Region", type: "select", options: REGION_OPTIONS },
  { key: "reference", label: "Reference Code", type: "text", valuePlaceholder: "PROJ-…" },
  { key: "brandContact", label: "Brand Contact", type: "select", options: BRAND_CONTACT_OPTIONS },
  { key: "brickContact", label: "Brick Contact", type: "select", options: BRICK_CONTACT_OPTIONS },
  { key: "startFrom", label: "Start from Date", type: "date" },
  { key: "startTo", label: "Start to Date", type: "date" },
  { key: "endFrom", label: "End from Date", type: "date" },
  { key: "endTo", label: "End to Date", type: "date" },
];

function matchToken(p: Project, t: FilterToken): boolean {
  switch (t.fieldKey) {
    case "brand":
      return p.brandId === t.value;
    case "project":
      return p.id === t.value;
    case "region":
      return p.regionNames.includes(t.value) || p.regionLabel === t.value;
    case "reference":
      return p.referenceCode.toLowerCase().includes(t.value.toLowerCase());
    case "brandContact":
      return p.brandContactName === t.value;
    case "brickContact":
      return p.brickContact === t.value;
    case "startFrom":
      return !!p.startDate && p.startDate.slice(0, 10) >= t.value;
    case "startTo":
      return !!p.startDate && p.startDate.slice(0, 10) <= t.value;
    case "endFrom":
      return !!p.endDate && p.endDate.slice(0, 10) >= t.value;
    case "endTo":
      return !!p.endDate && p.endDate.slice(0, 10) <= t.value;
    default:
      return true;
  }
}

// Tokens on the same field are OR'd; different fields are AND'd.
function passesFilters(p: Project, tokens: FilterToken[]): boolean {
  const byField = new Map<string, FilterToken[]>();
  for (const t of tokens) {
    const arr = byField.get(t.fieldKey) ?? [];
    arr.push(t);
    byField.set(t.fieldKey, arr);
  }
  for (const group of byField.values()) {
    if (!group.some((t) => matchToken(p, t))) return false;
  }
  return true;
}

export function ProjectsIndex() {
  const [params, setParams] = useSearchParams();
  const statusParam = params.get("status");
  const activeStatus: ProjectStatus = STATUS_ORDER.includes(statusParam as ProjectStatus)
    ? (statusParam as ProjectStatus)
    : DEFAULT_STATUS;

  const [tokens, setTokens] = useState<FilterToken[]>([]);
  const { matches } = useBrandFilter();

  // Projects matching the global brand filter and the active filter tokens
  // (ignoring the status tab). The per-tab counters are derived from this set
  // so they reflect the filters.
  const filtered = useMemo(
    () =>
      projects.filter(
        (p) => matches(p.brandId) && (tokens.length === 0 || passesFilters(p, tokens)),
      ),
    [tokens, matches],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: filtered.length };
    for (const p of filtered) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  }, [filtered]);

  const rows = useMemo(
    () => filtered.filter((p) => p.status === activeStatus),
    [activeStatus, filtered],
  );

  function setStatus(next: ProjectStatus) {
    setParams({ status: next });
  }

  const tabs: ProjectStatus[] = [...STATUS_ORDER];

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

      {/* composable filter tokens — above the tabs/table */}
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-2.5 shrink-0 text-sm font-medium text-slate-500">Filter</span>
        <FilterBar
          fields={FILTER_FIELDS}
          tokens={tokens}
          onChange={setTokens}
          placeholder="Filter projects by brand, region, contact, dates…"
          className="flex-1"
        />
        {tokens.length > 0 && (
          <button
            type="button"
            onClick={() => setTokens([])}
            className="mt-2 shrink-0 text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            Clear
          </button>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* filter tabs */}
        <div className="flex flex-wrap gap-4 border-b border-slate-200 px-4 text-sm font-medium">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setStatus(t)}
              className={`-mb-px flex items-center gap-2 border-b-2 pb-3 pt-3 transition ${
                activeStatus === t ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {STATUS_LABEL[t]}
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{counts[t] ?? 0}</span>
            </button>
          ))}
        </div>

        {rows.length === 0 ? (
          <div className="px-4 py-12">
            <EmptyState
              icon={MapPin}
              title="No projects"
              description={
                tokens.length ? "No projects match these filters." : "No projects match this status."
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Project</th>
                  <th className="px-4 py-2.5 font-medium">Region</th>
                  <th className="px-4 py-2.5 font-medium">Dates</th>
                  <th className="px-4 py-2.5 font-medium">Contact</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const brand = getBrand(p.brandId);
                  const brandName = p.brandName ?? brand?.name ?? "—";
                  const brandColor = p.brandColor ?? brand?.color ?? "#64748b";
                  return (
                    <tr key={p.id} className="border-b border-slate-100 align-middle last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <BrandChip name={brandName} color={brandColor} />
                          <Link
                            to={`/internal-ops/projects/${p.id}`}
                            className="whitespace-nowrap text-[15px] font-semibold text-slate-900 hover:text-brand-700"
                          >
                            {p.name}
                          </Link>
                          <span className="inline-flex shrink-0 items-center gap-1.5 text-sm text-slate-400">
                            {p.referenceCode}
                            <button
                              type="button"
                              onClick={() => navigator.clipboard?.writeText(p.referenceCode).catch(() => {})}
                              className="hover:text-slate-600"
                              aria-label="Copy reference code"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        <span className={regionDisplay(p) === "(Multiple)" ? "text-brand-600" : undefined}>
                          {regionDisplay(p)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{dateRange(p)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{p.brickContact}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_PILL[p.status]}`}
                        >
                          {STATUS_LABEL[p.status]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
