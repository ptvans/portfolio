import { useMemo, useState, type ReactNode } from "react";
import { Copy, ExternalLink, FolderKanban, Hash, Plus, X } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../../../components/EmptyState";
import { StatusBadge } from "../../../components/StatusBadge";
import { getProject, getRegion, getTask, getTaskKind, workOrdersForProject } from "../../../data";
import type { Project, ProjectStatus, WorkOrder } from "../../../types/domain";

type Tab = "jobs" | "warehouses" | "responsibilities" | "sow";

const STATUS_BADGE: Record<ProjectStatus, string> = {
  requested: "bg-slate-100 text-slate-600",
  accepted: "bg-brand-100 text-brand-700",
  started: "bg-amber-100 text-amber-700",
  completed: "bg-op-100 text-op-700",
  cancelled: "bg-slate-100 text-slate-500",
};

const STATUS_LABEL: Record<ProjectStatus, string> = {
  requested: "Requested",
  accepted: "Accepted",
  started: "Started",
  completed: "Completed",
  cancelled: "Cancelled",
};

function fmt(iso: string | null): string | null {
  if (!iso) return null;
  // Accept both date-only ("2026-05-01") and full ISO ("2026-05-01T00:00:00-06:00").
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
  });
}

function dateRange(a: string | null, b: string | null): string {
  const s = fmt(a);
  const e = fmt(b);
  if (s && e) return `${s} - ${e}`;
  return s ?? e ?? "TBD";
}

// Reused by both the Brand app and the Internal Ops app — same layout, with
// path props and an optional internal-only content slot.
export function ProjectDashboard({
  projectsPath = "/brand/projects",
  jobsPath = "/brand/jobs",
  internalExtra,
}: {
  projectsPath?: string;
  jobsPath?: string;
  internalExtra?: ReactNode;
} = {}) {
  const { id } = useParams<{ id: string }>();
  const project = getProject(id);
  const [tab, setTab] = useState<Tab>("jobs");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const jobs = useMemo(() => (project ? workOrdersForProject(project.id) : []), [project]);
  const selectedJob = jobs.find((j) => j.id === selectedJobId) ?? null;

  if (!project) {
    return (
      <div>
        <Link to={projectsPath} className="text-sm text-slate-400 hover:text-brand-600">
          Projects /
        </Link>
        <EmptyState
          icon={FolderKanban}
          title="Project not found"
          description="This project doesn't exist for the current brand."
        />
      </div>
    );
  }

  const selectTab = (t: Tab) => {
    setTab(t);
    setSelectedJobId(null);
  };

  return (
    <div className="flex gap-6">
      {/* Main column */}
      <div className="min-w-0 flex-1">
        <Link to={projectsPath} className="text-sm text-slate-400 hover:text-brand-600">
          Projects /
        </Link>
        <div className="mt-1 flex items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
            <CopyRef code={project.referenceCode} />
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium ${STATUS_BADGE[project.status]}`}
          >
            {STATUS_LABEL[project.status]}
          </span>
        </div>

        {/* Description card */}
        <div className="mt-4 mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Description</p>
          <p className="mt-1.5 text-sm text-slate-700">{project.description}</p>
          <div className="mt-5 flex flex-wrap" style={{ columnGap: "4rem", rowGap: "1rem" }}>
            <Field value={dateRange(project.startDate, project.endDate)} label="Dates" />
            <Field value={project.brickContact} label="Brick Contact" />
            <Field value="n/a" label="AnotherVariable" />
          </div>
        </div>

        {/* Internal-ops-only content (empty for the Brand app) */}
        {internalExtra}

        {/* Tabs */}
        <div className="mt-6 flex gap-6 border-b border-slate-200 text-sm font-medium">
          <TabButton label="Jobs" active={tab === "jobs"} onClick={() => selectTab("jobs")} />
          <TabButton label="Warehouses" active={tab === "warehouses"} onClick={() => selectTab("warehouses")} />
          <TabButton
            label="Responsibilities"
            active={tab === "responsibilities"}
            onClick={() => selectTab("responsibilities")}
          />
          <TabButton label="Statement of Work" active={tab === "sow"} onClick={() => selectTab("sow")} />
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          {tab === "jobs" && (
            <JobsTab jobs={jobs} jobsPath={jobsPath} selectedJobId={selectedJobId} onSelect={setSelectedJobId} />
          )}
          {tab === "warehouses" && <WarehousesTab project={project} />}
          {tab === "responsibilities" && (
            <EmptyState
              icon={FolderKanban}
              title="Responsibilities"
              description="Network-operator responsibilities for this project will appear here."
            />
          )}
          {tab === "sow" && <SowTab project={project} />}
        </div>
      </div>

      {/* Right column: job inspection panel or Resources */}
      <aside className="hidden w-80 shrink-0 lg:block">
        {selectedJob ? (
          <JobPanel job={selectedJob} onClose={() => setSelectedJobId(null)} />
        ) : (
          <Resources project={project} />
        )}
      </aside>
    </div>
  );
}

function CopyRef({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
    >
      {code}
      <Copy className="h-3 w-3" />
      {copied && <span className="text-brand-600">copied</span>}
    </button>
  );
}

function Field({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-800">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 pb-3 pt-1 transition ${
        active ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700"
      }`}
    >
      {label}
    </button>
  );
}

// ---------------- Jobs ----------------

function JobsTab({
  jobs,
  jobsPath,
  selectedJobId,
  onSelect,
}: {
  jobs: WorkOrder[];
  jobsPath: string;
  selectedJobId: string | null;
  onSelect: (id: string) => void;
}) {
  const [sub, setSub] = useState<"active" | "completed">("active");
  const active = jobs.filter((j) => j.status !== "completed" && j.status !== "cancelled");
  const completed = jobs.filter((j) => j.status === "completed");
  const shown = sub === "active" ? active : completed;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">Jobs</h2>
        <Link to={jobsPath} className="text-sm font-medium text-brand-600 hover:text-brand-700">
          View All
        </Link>
      </div>

      <div className="mt-3 flex gap-6 border-b border-slate-200 text-sm font-medium">
        <SubTab label="Active" count={active.length} active={sub === "active"} onClick={() => setSub("active")} />
        <SubTab
          label="Completed"
          count={completed.length}
          active={sub === "completed"}
          onClick={() => setSub("completed")}
        />
      </div>

      {shown.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">No {sub} jobs.</p>
      ) : (
        <table className="mt-1 w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="py-2 pr-3 font-medium">Job</th>
              <th className="py-2 pr-3 font-medium">Start Date - End Date</th>
              <th className="py-2 pr-3 font-medium">Region</th>
              <th className="py-2 pr-3 font-medium">Tasks</th>
              <th className="py-2 font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((job) => {
              const region = getRegion(job.regionId);
              const isSel = job.id === selectedJobId;
              const taskNames = job.taskIds.map(
                (tid) => getTaskKind(getTask(tid)?.taskKindId ?? "")?.name ?? "Task",
              );
              return (
                <tr
                  key={job.id}
                  onClick={() => onSelect(job.id)}
                  className={`cursor-pointer border-t border-slate-100 ${
                    isSel ? "bg-brand-50" : "hover:bg-slate-50"
                  }`}
                >
                  <td className="py-3 pr-3 font-medium text-slate-800">{job.title ?? job.id}</td>
                  <td className="py-3 pr-3 text-slate-500">{dateRange(job.startDate ?? null, job.endDate ?? null)}</td>
                  <td className="py-3 pr-3 text-slate-500">{region?.name ?? "—"}</td>
                  <td className="py-3 pr-3">
                    <span className="group relative inline-block cursor-default font-medium text-brand-600">
                      {job.taskIds.length}
                      {taskNames.length > 0 && (
                        <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 hidden w-max max-w-xs -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-left text-xs font-normal text-white shadow-lg group-hover:block">
                          {taskNames.slice(0, 3).map((n, i) => (
                            <span key={i} className="block whitespace-nowrap">
                              {n}
                            </span>
                          ))}
                          {taskNames.length > 3 && (
                            <span className="mt-0.5 block text-slate-300">
                              {taskNames.length - 3} more…
                            </span>
                          )}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="max-w-[16rem] truncate py-3 text-slate-500">
                    {String(job.parameters?.client ?? "") || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function SubTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px flex items-center gap-2 border-b-2 pb-2.5 pt-1 transition ${
        active ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500"
      }`}
    >
      {label}
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{count}</span>
    </button>
  );
}

function JobPanel({ job, onClose }: { job: WorkOrder; onClose: () => void }) {
  const region = getRegion(job.regionId);
  const tasks = job.taskIds.map((tid) => getTask(tid)).filter(Boolean);
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 p-5">
        <h2 className="text-base font-semibold text-slate-900">{job.title ?? job.id}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-4 p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Dates</p>
          <p className="mt-0.5 text-sm text-slate-800">
            {dateRange(job.startDate ?? null, job.endDate ?? null)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Region</p>
          <p className="mt-0.5 text-sm text-slate-800">{region?.name ?? "—"}</p>
        </div>
        <div>
          <p className="mb-1 border-b border-slate-100 pb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            Tasks
          </p>
          {tasks.length === 0 ? (
            <p className="py-2 text-sm text-slate-400">No tasks on this job.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {tasks.map((t) => {
                const kind = getTaskKind(t!.taskKindId);
                return (
                  <div key={t!.id} className="flex items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-slate-800">{kind?.name ?? "Task"}</p>
                      <p className="text-xs text-slate-400">{fmt(t!.scheduledAt.slice(0, 10))}</p>
                    </div>
                    <StatusBadge status={t!.status} kind="task" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------- Warehouses ----------------

function WarehousesTab({ project }: { project: Project }) {
  if (project.warehouses.length === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="No warehouses"
        description="No warehouses have been assigned to this project yet."
      />
    );
  }
  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">Warehouses</h2>
        <span className="text-sm font-medium text-brand-600">View All</span>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-2 py-1.5 font-medium first:pl-0">Region</th>
              <th className="px-2 py-1.5 font-medium">Network Operator</th>
              <th className="px-2 py-1.5 font-medium">Warehouse Contact</th>
              <th className="px-2 py-1.5 font-medium">Shipping Address</th>
              <th className="px-2 py-1.5 font-medium">Hours</th>
              <th className="px-2 py-1.5 font-medium last:pr-0">Loading Dock</th>
            </tr>
          </thead>
          <tbody>
            {project.warehouses.map((w, i) => (
              <tr key={i} className="border-b border-slate-100 align-top">
                <td className="px-2 py-2 text-slate-700 first:pl-0">{w.regionName}</td>
                <td className="px-2 py-2 text-slate-700">{w.networkOperator}</td>
                <td className="px-2 py-2 text-slate-500">
                  <p className="text-slate-700">{w.contactName}</p>
                  <p className="text-brand-600">{w.contactEmail}</p>
                  <p>{w.contactPhone}</p>
                </td>
                <td className="max-w-[16rem] whitespace-pre-line px-2 py-2 text-xs text-slate-500">
                  {w.shippingAddress}
                </td>
                <td className="max-w-[12rem] px-2 py-2 text-xs text-slate-500">{w.hours}</td>
                <td className="px-2 py-2 text-slate-700 last:pr-0">{w.loadingDock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------- Statement of Work ----------------

function SowTab({ project }: { project: Project }) {
  if (!project.statementOfWork) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="Statement of Work"
        description="No statement of work has been attached to this project yet."
      />
    );
  }
  return (
    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">
      {project.statementOfWork}
    </pre>
  );
}

// ---------------- Resources sidebar ----------------

function Resources({ project }: { project: Project }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">Resources</h2>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Links</p>
        <div className="mt-3 space-y-2">
          {project.links.map((l) => (
            <a
              key={l.label}
              href={l.url}
              className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-brand-300"
            >
              <span className="truncate">{l.label}</span>
              <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" />
            </a>
          ))}
          <AddButton label="Add" />
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Slack Channels</p>
        <div className="mt-3 space-y-2">
          {project.slackChannels.map((c) => (
            <a
              key={c}
              href="#"
              className="flex items-center justify-between gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700"
            >
              <span className="inline-flex items-center gap-1.5 truncate">
                <Hash className="h-3.5 w-3.5" />
                {c.replace(/^#/, "")}
              </span>
              <ExternalLink className="h-4 w-4 shrink-0 text-brand-400" />
            </a>
          ))}
          <AddButton label="Add" />
        </div>
      </div>
    </div>
  );
}

function AddButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
    >
      <Plus className="h-4 w-4" /> {label}
    </button>
  );
}
