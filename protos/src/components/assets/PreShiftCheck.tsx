import { Fragment } from "react";
import { ArrowRight, BatteryWarning, Bell, CheckCircle2, PlugZap, Repeat2, Send, Undo2, Zap } from "lucide-react";
import { FLEET_CLOCK, getAssetType, stakeholders } from "../../data/assets";
import type { CheckRow, Remedy, Verdict } from "../../lib/batteryCheck";
import { useAssets, type FleetNotice } from "../../state/AssetsContext";
import { SectionCard, socTone } from "./AssetBits";

export function VerdictPill({ verdict }: { verdict: Verdict }) {
  const m =
    verdict === "ok"
      ? { label: "Ready", cls: "bg-emerald-100 text-emerald-700" }
      : verdict === "below_buffer"
        ? { label: "Below buffer", cls: "bg-amber-100 text-amber-800" }
        : { label: "Won't finish", cls: "bg-red-100 text-red-700" };
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${m.cls}`}>{m.label}</span>;
}

function resolutionOf(row: CheckRow, swaps: Record<string, string>) {
  if (swaps[row.assignment.id]) return "swap" as const;
  if (row.plan) return row.plan;
  return null;
}

// The pre-assignment battery check. The operator resolves flagged vehicles
// here and then posts the assignments; nothing posts until every vehicle is
// projected to finish its shift above the buffer (or someone overrides).
export function PreShiftCheck() {
  const { checkRows, swaps, applyRemedy, undoRemedy, postAssignments, postedAt, policy, notices } = useAssets();
  const flagged = checkRows.filter((r) => r.projection.verdict !== "ok");
  const resolved = checkRows.filter((r) => resolutionOf(r, swaps));
  const posted = postedAt !== null;

  return (
    <div className="grid items-start gap-4 2xl:grid-cols-[minmax(0,1fr)_320px]">
      <SectionCard
        title={`Pre-assignment battery check · Tonight, ${FLEET_CLOCK.dateLabel}`}
        subtitle={`Ran ${FLEET_CLOCK.nowLabel}, before assignments post at ${policy.postAssignmentsAt}. Projects each vehicle's battery at end of shift from Stella's per-location usage, against a ${policy.bufferPct}% buffer (${policy.nearBaseBufferPct}% for stores within ${policy.nearBaseMiles} mi of the garage).`}
        actions={
          posted ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> Posted {postedAt}
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">Draft — not posted</span>
          )
        }
      >
        <div className="flex flex-wrap gap-x-5 gap-y-1 border-b border-slate-100 px-5 py-2.5 text-sm">
          <Stat n={checkRows.length - flagged.length} label="ready" cls="text-emerald-700" />
          <Stat n={checkRows.filter((r) => r.projection.verdict === "below_buffer").length} label="below buffer" cls="text-amber-700" />
          <Stat n={checkRows.filter((r) => r.projection.verdict === "wont_finish").length} label="won't finish" cls="text-red-700" />
          {resolved.length > 0 && <Stat n={resolved.length} label="changed by this check" cls="text-brand-700" />}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr className="border-b border-slate-100">
                <th className="px-5 py-2 font-medium">Vehicle</th>
                <th className="px-3 py-2 font-medium">Supervisor · store</th>
                <th className="px-3 py-2 font-medium">Shift</th>
                <th className="px-3 py-2 text-right font-medium">Now</th>
                <th className="px-3 py-2 text-right font-medium">At start</th>
                <th className="px-3 py-2 text-right font-medium">At end</th>
                <th className="px-5 py-2 font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {checkRows.map((row) => {
                const res = resolutionOf(row, swaps);
                const open = !posted && row.projection.verdict !== "ok";
                return (
                  <Fragment key={row.assignment.id}>
                    <tr className={`border-b border-slate-100 ${open ? "bg-red-50/40" : ""}`}>
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-900">{row.asset.unitId}</p>
                        {res === "swap" && <p className="text-xs text-brand-600">swapped from {unitOf(row.originalAssetId)}</p>}
                        {res === "plug_in" && <p className="text-xs text-brand-600">plugged in at Bay 7</p>}
                        {res === "supercharge" && <p className="text-xs text-brand-600">supercharge booked 3:45 PM</p>}
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-slate-800">{row.assignment.driver}</p>
                        <p className="whitespace-nowrap text-xs text-slate-400">
                          {row.location.label.replace("Tso · ", "")} · {row.location.milesFromBase} mi out
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                        {row.assignment.start}–{row.assignment.end}
                      </td>
                      <td className={`px-3 py-3 text-right tabular-nums ${socTone(row.asset.soc).text}`}>{row.asset.soc}%</td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-700">{row.projection.startSoc}%</td>
                      <td className="px-3 py-3 text-right">
                        <span className={`font-semibold tabular-nums ${row.projection.endSoc < row.projection.bufferPct ? "text-red-700" : "text-slate-900"}`}>
                          {row.projection.endSoc}%
                        </span>
                        <span className="block whitespace-nowrap text-[11px] text-slate-400">
                          −{row.projection.usagePct}% · floor {row.projection.bufferPct}%
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <VerdictPill verdict={row.projection.verdict} />
                          {res && !posted && (
                            <button
                              type="button"
                              onClick={() => undoRemedy(row)}
                              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700"
                            >
                              <Undo2 className="h-3 w-3" /> Undo
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {open && (
                      <tr className="border-b border-slate-100 bg-red-50/40">
                        <td colSpan={7} className="px-5 pb-3.5 pt-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="mr-1 inline-flex items-center gap-1.5 text-sm text-red-800">
                              <BatteryWarning className="h-4 w-4" />
                              {row.reason}.
                            </span>
                            {row.remedies.length === 0 && <span className="text-sm text-slate-600">No spare or charging option clears the buffer — escalate.</span>}
                            {row.remedies.map((r) => (
                              <RemedyButton key={remedyKey(r)} remedy={r} onClick={() => applyRemedy(row, r)} />
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
          {posted ? (
            <p className="text-sm text-slate-600">
              Assignments posted to <span className="font-medium">#ext-tso-dispatch</span> and pushed to the Operations Console.
            </p>
          ) : flagged.length > 0 ? (
            <p className="text-sm text-slate-600">
              Resolve {flagged.length} flagged vehicle{flagged.length === 1 ? "" : "s"} — swap the car, or keep charging and notify.
            </p>
          ) : (
            <p className="text-sm text-emerald-700">Every vehicle finishes its shift above the buffer.</p>
          )}
          {!posted && (
            <div className="flex items-center gap-3">
              {flagged.length > 0 && (
                <button type="button" onClick={() => postAssignments(true)} className="text-sm text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline">
                  Post anyway
                </button>
              )}
              <button
                type="button"
                disabled={flagged.length > 0}
                onClick={() => postAssignments(false)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
              >
                <Send className="h-4 w-4" /> Post assignments
              </button>
            </div>
          )}
        </footer>
      </SectionCard>

      <NoticeFeed notices={notices} />
    </div>
  );
}

function Stat({ n, label, cls }: { n: number; label: string; cls: string }) {
  return (
    <span className="text-slate-500">
      <span className={`font-semibold tabular-nums ${n > 0 ? cls : "text-slate-400"}`}>{n}</span> {label}
    </span>
  );
}

function unitOf(assetId: string) {
  return assetId.replace("asset-", "");
}

function remedyKey(r: Remedy) {
  return r.kind === "swap" ? `swap-${r.toAssetId}` : r.kind;
}

function RemedyButton({ remedy, onClick }: { remedy: Remedy; onClick: () => void }) {
  const end = `ends ${remedy.projection.endSoc}%`;
  const base =
    "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-800 shadow-sm hover:border-brand-300 hover:bg-brand-50";
  if (remedy.kind === "swap") {
    return (
      <button type="button" onClick={onClick} className={base}>
        <Repeat2 className="h-4 w-4 text-brand-600" /> Swap to {unitOf(remedy.toAssetId)}
        <span className="font-normal text-slate-400">· {end} · notifies Christina</span>
      </button>
    );
  }
  if (remedy.kind === "plug_in") {
    return (
      <button type="button" onClick={onClick} className={base}>
        <PlugZap className="h-4 w-4 text-emerald-600" /> Plug in now
        <span className="font-normal text-slate-400">
          · {remedy.projection.startSoc}% by start, {end} · notifies Christina
        </span>
      </button>
    );
  }
  return (
    <button type="button" onClick={onClick} className={base}>
      <Zap className="h-4 w-4 text-emerald-600" /> Supercharge ~{remedy.minutes} min
      <span className="font-normal text-slate-400">· {end} · notifies George</span>
    </button>
  );
}

export function NoticeFeed({ notices, compact = false }: { notices: FleetNotice[]; compact?: boolean }) {
  return (
    <SectionCard
      title={
        <span className="inline-flex items-center gap-1.5">
          <Bell className="h-4 w-4 text-slate-400" /> Notifications
        </span>
      }
      subtitle={compact ? undefined : "Who hears about a flagged vehicle"}
    >
      {!compact && (
        <ul className="space-y-2.5 border-b border-slate-100 px-5 py-3.5">
          {stakeholders.map((s) => (
            <li key={s.id} className="flex gap-2.5">
              <Avatar name={s.name} />
              <div className="min-w-0 text-sm">
                <p className="font-medium text-slate-900">
                  {s.name} <span className="font-normal text-slate-400">· {s.role}</span>
                </p>
                <p className="text-xs text-slate-500">{s.notifyWhen}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="px-5 py-3.5">
        {notices.length === 0 ? (
          <p className="text-sm text-slate-400">Nothing sent yet.</p>
        ) : (
          <ul className="space-y-3">
            {[...notices].reverse().map((n) => (
              <li key={n.id} className="text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{n.title}</p>
                  <span className="shrink-0 text-xs text-slate-400">{n.at}</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  To {n.to.map((id) => stakeholders.find((s) => s.id === id)?.name.split(" ")[0]).join(" & ")} · {n.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SectionCard>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
  return <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-700">{initials}</span>;
}

// Brand-side summary: read-only view of the operator's check.
export function PreShiftCheckSummary({ operatorName }: { operatorName: string }) {
  const { checkRows, swaps, postedAt, notices } = useAssets();
  if (checkRows.length === 0) return null;
  const flagged = checkRows.filter((r) => r.projection.verdict !== "ok");
  const changed = checkRows.filter((r) => resolutionOf(r, swaps));
  const vehicleName = getAssetType(checkRows[0].asset.assetTypeId)?.kind === "robot" ? "unit" : "vehicle";
  return (
    <SectionCard
      title={`Tonight's battery check · ${FLEET_CLOCK.dateLabel}`}
      subtitle={`${operatorName} runs it at ${FLEET_CLOCK.nowLabel}, before vehicle assignments post.`}
      actions={
        postedAt ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> Posted {postedAt}
          </span>
        ) : flagged.length > 0 ? (
          <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
            {flagged.length} {vehicleName}
            {flagged.length === 1 ? "" : "s"} flagged
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">Ready to post</span>
        )
      }
    >
      <ul className="divide-y divide-slate-100">
        {checkRows.map((r) => {
          const res = resolutionOf(r, swaps);
          if (r.projection.verdict === "ok" && !res) return null;
          return (
            <li key={r.assignment.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="text-slate-900">
                  {res === "swap" ? (
                    <>
                      {unitOf(r.originalAssetId)} <ArrowRight className="inline h-3 w-3 text-slate-400" /> {r.asset.unitId}
                    </>
                  ) : (
                    r.asset.unitId
                  )}{" "}
                  <span className="text-slate-400">· {r.location.label.replace("Tso · ", "")}</span>
                </p>
                <p className="truncate text-xs text-slate-500">
                  {res === "swap"
                    ? "Swapped to a spare"
                    : res === "plug_in"
                      ? "Kept on the shift, charging before start"
                      : res === "supercharge"
                        ? "Supercharge session booked before the shift"
                        : r.reason}{" "}
                  · projects {r.projection.endSoc}% at end
                </p>
              </div>
              <VerdictPill verdict={r.projection.verdict} />
            </li>
          );
        })}
        {flagged.length === 0 && changed.length === 0 && (
          <li className="px-5 py-3 text-sm text-emerald-700">Every vehicle is projected to finish above the buffer.</li>
        )}
      </ul>
      {notices.length > 0 && (
        <p className="border-t border-slate-100 px-5 py-2.5 text-xs text-slate-500">
          {notices.length} notification{notices.length === 1 ? "" : "s"} sent to G&C Roman (Christina, George).
        </p>
      )}
    </SectionCard>
  );
}
