import { CheckCircle2, Circle, Loader2, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { brands, getBrand, getWorkOrder, workOrders } from "../../../data";
import type { AlertRuleStatus, AlertSeverity } from "../../../types/domain";
import {
  Breadcrumbs,
  SEVERITIES,
  SEVERITY_LABEL,
  SeverityTag,
  selectClass,
} from "../components/alerts/alertUi";
import { useAlerts, type RuleDraft } from "../context/AlertsContext";

// Full-page rule authoring (a modal is too easy to lose a minute of AI work
// in). Flow: describe → process → review the AI's reading → optionally test →
// save as draft or activate. Activation is gated on the prompt having been
// processed as written, and the page always says why a button is disabled.

type RuleSeverity = AlertSeverity | "per_alert";

interface Reading {
  prompt: string; // the prompt text this reading was produced from
  severity: RuleSeverity;
  schedule: string | null;
  assumptions: string[];
  instructions: string[];
}

const SCHEDULE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "When data changes" },
  { value: "Every hour", label: "Every hour" },
  { value: "Every 4 hours", label: "Every 4 hours" },
  { value: "Every day at 8:00 AM", label: "Every day at 8:00 AM" },
  { value: "Every day at 6:00 PM", label: "Every day at 6:00 PM" },
  { value: "Every Monday at 8:00 AM", label: "Every Monday at 8:00 AM" },
];

// Stand-in for the brick-ai prompt processor.
function simulateProcessing(prompt: string, brandName: string): Reading {
  const p = prompt.toLowerCase();
  const severity: RuleSeverity =
    /critical/.test(p) && /(otherwise|inside|within|unless)/.test(p)
      ? "per_alert"
      : /critical|urgent|safety|collision/.test(p)
        ? "critical"
        : /\bhigh\b|late|miss|no-show|unassigned/.test(p)
          ? "high"
          : /\blow\b|minor/.test(p)
            ? "low"
            : "medium";
  const schedule = /hourly|every hour/.test(p)
    ? "Every hour"
    : /evening|nightly/.test(p)
      ? "Every day at 6:00 PM"
      : /daily|every day|each day|morning/.test(p)
        ? "Every day at 8:00 AM"
        : /weekly|every week|monday/.test(p)
          ? "Every Monday at 8:00 AM"
          : null;
  const sentences = prompt
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const assumptions = [
    `Only ${brandName} work orders and their tasks are in scope.`,
    /hour|day|\d+h/.test(p)
      ? "Time thresholds are measured in the brand's local time zone."
      : "The rule has no time threshold, so it re-checks whenever relevant data changes.",
    /task/.test(p)
      ? "Cancelled tasks are ignored."
      : "One alert is raised per matching entity, not per rule run.",
  ];
  const instructions = [
    `Load ${brandName} entities relevant to this rule.`,
    ...sentences.map((s) => s.replace(/^alert/i, "Raise an alert")),
    severity === "per_alert"
      ? "Choose a severity for each alert using the thresholds above."
      : `Set severity to ${SEVERITY_LABEL[severity]}.`,
    "Name each alert after the specific entity and what happened.",
  ];
  return { prompt, severity, schedule, assumptions, instructions };
}

// Accepts a Brick id (wo-…) or a portal URL containing one.
function parseTarget(input: string) {
  const match = input.trim().match(/\b(wo-[a-z0-9-]+)\b/i);
  return match ? getWorkOrder(match[1].toLowerCase()) : undefined;
}

export function AlertRuleEditor() {
  const { ruleId } = useParams<{ ruleId: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { getRule, createRule, updateRule } = useAlerts();
  const existing = getRule(ruleId);
  const isEdit = Boolean(existing);

  const [brandId, setBrandId] = useState(existing?.brandId ?? params.get("brand") ?? "");
  const [name, setName] = useState(existing?.name ?? "");
  const [prompt, setPrompt] = useState(existing?.prompt ?? "");
  const [reading, setReading] = useState<Reading | null>(() =>
    existing
      ? {
          ...simulateProcessing(existing.prompt, getBrand(existing.brandId)?.name ?? "the brand"),
          severity: existing.severity,
          schedule: existing.schedule,
        }
      : null,
  );
  const [processing, setProcessing] = useState(false);
  // Manual overrides beside the AI's reading; survive reprocessing.
  const [severityOverride, setSeverityOverride] = useState<RuleSeverity | null>(null);
  const [scheduleOverride, setScheduleOverride] = useState<string | null | undefined>(undefined);
  const [editingSeverity, setEditingSeverity] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(false);

  const [testInput, setTestInput] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ target: string; fired: boolean; text: string } | null>(null);

  const brand = getBrand(brandId);
  const dirty =
    !existing
      ? Boolean(brandId || name || prompt)
      : brandId !== existing.brandId || name !== existing.name || prompt !== existing.prompt ||
        severityOverride !== null || scheduleOverride !== undefined;

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const stale = reading !== null && reading.prompt !== prompt;
  const processed = reading !== null && !stale;
  const severity = severityOverride ?? reading?.severity ?? "medium";
  const schedule = scheduleOverride !== undefined ? scheduleOverride : (reading?.schedule ?? null);

  const draftBlocker = !brandId ? "Choose a brand" : !name.trim() ? "Name the rule" : !prompt.trim() ? "Write a prompt" : null;
  const activateBlocker = draftBlocker ?? (!reading ? "Process the prompt before activating" : stale ? "Prompt changed — process it again before activating" : null);

  const process = () => {
    if (!prompt.trim()) return;
    setProcessing(true);
    setTestResult(null);
    setTimeout(() => {
      setReading(simulateProcessing(prompt, brand?.name ?? "the brand"));
      setProcessing(false);
    }, 1400);
  };

  const testTarget = testInput.trim() ? parseTarget(testInput) : undefined;
  const testInvalid = testInput.trim().length > 0 && !testTarget;
  const brandMismatch = testTarget && brandId && testTarget.brandId !== brandId;
  const runTest = () => {
    if (!testTarget || !processed || brandMismatch) return;
    setTesting(true);
    setTimeout(() => {
      const fired = testTarget.status === "active";
      setTestResult({
        target: testTarget.title ?? testTarget.id,
        fired,
        text: fired
          ? `Would raise 1 alert (${severity === "per_alert" ? "High" : SEVERITY_LABEL[severity]}): the condition matches one task on this work order.`
          : "No alert. Nothing on this work order matches the rule right now.",
      });
      setTesting(false);
    }, 1800);
  };

  const save = (status: AlertRuleStatus) => {
    const draft: RuleDraft = { brandId, name: name.trim(), prompt, severity, schedule };
    if (existing) {
      updateRule(existing.id, draft, status);
      navigate(`/internal-ops/alerts/${existing.id}`);
    } else {
      const id = createRule(draft, status);
      navigate(`/internal-ops/alerts/${id}`);
    }
  };

  const brandOptions = useMemo(() => [...brands].sort((a, b) => a.name.localeCompare(b.name)), []);
  const exampleIds = useMemo(
    () => workOrders.filter((w) => w.brandId === brandId && w.status === "active").slice(0, 2).map((w) => w.id),
    [brandId],
  );

  const crumbs = [
    { label: "Automations", to: "/internal-ops/sops/list" },
    ...(brand ? [{ label: brand.name, to: `/internal-ops/sops/brands/${brand.id}` }] : []),
  ];
  const cancelTo = existing
    ? `/internal-ops/alerts/${existing.id}`
    : brand
      ? `/internal-ops/sops/brands/${brand.id}`
      : "/internal-ops/sops/list";

  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs items={crumbs} />
      <h1 className="mb-5 text-xl font-semibold text-slate-900">{isEdit ? "Edit alert" : "Create alert"}</h1>

      {/* 1 — Describe */}
      <Step n={1} title="Describe the rule" done={processed}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Brand">
            <select
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              className={`${selectClass} w-full`}
              disabled={isEdit}
            >
              <option value="">Choose a brand…</option>
              {brandOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Failed deliveries over 24h"
              className={`${selectClass} w-full`}
            />
          </Field>
        </div>
        <Field label="Prompt" hint="Describe, in plain language, what should raise an alert and how serious it is.">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            placeholder="e.g. Alert on any delivery task that is more than 24 hours past its scheduled time and not completed. Critical if the customer has already messaged about it, otherwise high."
            className={`${selectClass} w-full resize-y leading-relaxed`}
          />
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={process}
            disabled={!prompt.trim() || processing || processed}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {processing ? "Processing…" : reading ? "Process again" : "Process prompt"}
          </button>
          {stale && !processing && (
            <p className="text-sm text-amber-700">Prompt edited since it was processed. Process it again to update the review.</p>
          )}
          {processed && !processing && <p className="text-sm text-slate-500">Up to date with the prompt.</p>}
          {!prompt.trim() && <p className="text-sm text-slate-400">Write a prompt to process it.</p>}
        </div>
      </Step>

      {/* 2 — Review */}
      <Step n={2} title="Review what the AI understood" done={processed} dim={!reading}>
        {!reading ? (
          <p className="text-sm text-slate-400">Process the prompt to see how it will be evaluated.</p>
        ) : (
          <div className={`space-y-4 ${stale || processing ? "opacity-50" : ""}`}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Setting
                label="Severity"
                overridden={severityOverride !== null}
                editing={editingSeverity}
                onEdit={() => setEditingSeverity(true)}
                onReset={() => {
                  setSeverityOverride(null);
                  setEditingSeverity(false);
                }}
                value={
                  severity === "per_alert" ? (
                    <span className="text-sm font-medium text-slate-800">Chosen by the AI per alert</span>
                  ) : (
                    <SeverityTag severity={severity} />
                  )
                }
                control={
                  <select
                    value={severity}
                    onChange={(e) => setSeverityOverride(e.target.value as RuleSeverity)}
                    className={`${selectClass} w-full`}
                  >
                    <option value="per_alert">Chosen by the AI per alert</option>
                    {SEVERITIES.map((s) => (
                      <option key={s} value={s}>
                        {SEVERITY_LABEL[s]}
                      </option>
                    ))}
                  </select>
                }
              />
              <Setting
                label="Runs"
                overridden={scheduleOverride !== undefined}
                editing={editingSchedule}
                onEdit={() => setEditingSchedule(true)}
                onReset={() => {
                  setScheduleOverride(undefined);
                  setEditingSchedule(false);
                }}
                value={<span className="text-sm font-medium text-slate-800">{schedule ?? "Whenever the data it covers changes"}</span>}
                control={
                  <select
                    value={schedule ?? ""}
                    onChange={(e) => setScheduleOverride(e.target.value || null)}
                    className={`${selectClass} w-full`}
                  >
                    {SCHEDULE_OPTIONS.map((o) => (
                      <option key={o.label} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                }
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Assumptions made</p>
              <ul className="list-disc space-y-0.5 pl-5 text-sm text-slate-700">
                {reading.assumptions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Instructions the evaluator will follow</p>
              <ol className="list-decimal space-y-1 rounded-lg bg-slate-50 py-3 pl-8 pr-4 text-sm text-slate-700">
                {reading.instructions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
              <p className="mt-1.5 text-xs text-slate-400">
                Instructions come from the prompt. To change them, edit the prompt and process it again.
              </p>
            </div>
          </div>
        )}
      </Step>

      {/* 3 — Test */}
      <Step n={3} title="Test against real data" optional done={Boolean(testResult)} dim={!processed}>
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <input
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runTest()}
              placeholder="Paste a portal URL or Brick id"
              disabled={!processed}
              className={`${selectClass} w-full disabled:bg-slate-50`}
            />
            {testInvalid && (
              <p className="mt-1 text-xs text-red-600">
                Enter a Brick work order id (like {exampleIds[0] ?? "wo-cw-1"}) or a portal URL. External ids aren't supported yet.
              </p>
            )}
            {testTarget && (
              <p className={`mt-1 text-xs ${brandMismatch ? "text-amber-700" : "text-slate-500"}`}>
                {brandMismatch
                  ? `That work order belongs to ${getBrand(testTarget.brandId)?.name}, not ${brand?.name}.`
                  : `Testing against Work order: ${testTarget.title ?? testTarget.id}`}
              </p>
            )}
            {!testInput && processed && exampleIds.length > 0 && (
              <p className="mt-1 text-xs text-slate-400">Try {exampleIds.join(" or ")}.</p>
            )}
          </div>
          <button
            type="button"
            onClick={runTest}
            disabled={!testTarget || !processed || testing || Boolean(brandMismatch)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            Run test
          </button>
        </div>
        {!processed && <p className="text-sm text-slate-400">Available once the prompt is processed.</p>}
        {testing && (
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="flex items-center gap-2 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" /> Evaluating {testTarget?.title ?? testTarget?.id}… this can take up to 30 seconds.
            </p>
            <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-slate-100" />
            <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-slate-100" />
          </div>
        )}
        {testResult && !testing && (
          <div className={`rounded-lg border p-3 text-sm ${testResult.fired ? "border-orange-200 bg-orange-50" : "border-slate-200 bg-slate-50"}`}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Result for {testResult.target}</p>
            <p className="mt-0.5 text-slate-700">{testResult.text}</p>
          </div>
        )}
      </Step>

      {/* Sticky save bar — always states why a disabled action is disabled. */}
      <div className="sticky bottom-0 z-20 -mb-6 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent pb-4 pt-2">
        <div className="flex items-center justify-end gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
          <p className="mr-auto text-sm text-slate-500">
            {activateBlocker ?? (testResult ? "Ready to activate." : "Ready to activate. Testing is optional.")}
          </p>
          <Link to={cancelTo} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            Cancel
          </Link>
          <button
            type="button"
            onClick={() => save("draft")}
            disabled={Boolean(draftBlocker)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            {existing?.status === "active" ? "Save as draft (stop running)" : "Save draft"}
          </button>
          <button
            type="button"
            onClick={() => save("active")}
            disabled={Boolean(activateBlocker)}
            className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-200"
          >
            {existing?.status === "active" ? "Save changes" : "Save & activate"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Step({
  n,
  title,
  optional,
  done,
  dim,
  children,
}: {
  n: number;
  title: string;
  optional?: boolean;
  done?: boolean;
  dim?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="mb-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className={`mb-4 flex items-center gap-2 text-sm font-semibold ${dim ? "text-slate-400" : "text-slate-900"}`}>
        {done ? <CheckCircle2 className="h-5 w-5 text-op-600" /> : <Circle className="h-5 w-5 text-slate-300" />}
        <span className="text-slate-400">{n}.</span> {title}
        {optional && <span className="font-normal text-slate-400">(optional)</span>}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

// The AI's reading of a setting, with a small Override affordance.
function Setting({
  label,
  value,
  control,
  overridden,
  editing,
  onEdit,
  onReset,
}: {
  label: string;
  value: ReactNode;
  control: ReactNode;
  overridden: boolean;
  editing: boolean;
  onEdit: () => void;
  onReset: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 px-3 py-2.5">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {label}
          {overridden && <span className="ml-1.5 normal-case tracking-normal text-brand-600">· set manually</span>}
        </span>
        {editing || overridden ? (
          <button type="button" onClick={onReset} className="text-xs font-medium text-slate-500 hover:text-slate-800">
            Use AI's reading
          </button>
        ) : (
          <button type="button" onClick={onEdit} className="text-xs font-medium text-brand-600 hover:text-brand-700">
            Override
          </button>
        )}
      </div>
      {editing ? control : value}
    </div>
  );
}
