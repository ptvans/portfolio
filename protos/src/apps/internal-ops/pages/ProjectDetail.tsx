import { useParams } from "react-router-dom";
import { getBrand, getProject, workOrdersForProject } from "../../../data";
import { ProjectDashboard } from "../../brand/pages/ProjectDashboard";

// Internal Ops project detail — the same layout Brand users see, plus an
// ops-only content block (brand, DRIs, billing) surfaced above the tabs.
export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const project = getProject(id);
  const brand = project ? getBrand(project.brandId) : undefined;
  const jobCount = project ? workOrdersForProject(project.id).length : 0;

  return (
    <ProjectDashboard
      projectsPath="/internal-ops/projects/list"
      jobsPath="/internal-ops/tasks"
      internalExtra={
        project && (
          <div className="mb-8 rounded-xl border border-brand-200 bg-brand-50/40 p-6">
            <p className="text-xs font-medium uppercase tracking-wide text-brand-600">Internal · Ops Only</p>
            <div className="mt-3 flex flex-wrap" style={{ columnGap: "4rem", rowGap: "1rem" }}>
              <InternalField label="Brand" value={project.brandName ?? brand?.name ?? "—"} color={project.brandColor ?? brand?.color} />
              <InternalField label="Ops DRI" value={project.brickContact} />
              <InternalField label="Brand DRI" value={project.brandContactName} />
              <InternalField label="Reference" value={project.referenceCode} />
              <InternalField label="Jobs" value={String(jobCount)} />
              <InternalField label="Billing" value="Not invoiced" />
            </div>
          </div>
        )
      }
    />
  );
}

function InternalField({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
        {color && <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />}
        {value}
      </p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}
