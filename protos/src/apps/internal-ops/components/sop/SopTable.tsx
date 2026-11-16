// The SOP list, shared by the SOPs index and the SOP section of a Brand page.
//
// An SOP is one of two types. A Standard SOP (the default) is a document Stella
// reads and runs step by step. An Alert (formerly an alert rule) is a prompt
// Stella keeps evaluating against the ops data; when it matches it raises a
// message. Both list here with the same columns: what it is, who owns it, how
// it stands, how many messages it has open, and when it last ran and runs
// next.

import { Link } from "react-router-dom";
import { getBrand, runsForSop } from "../../../../data";
import { formatRelative } from "../../../../lib/format";
import type { AlertRule, AlertRuleStatus, Sop } from "../../../../types/domain";
import { useMessages, type InboxMessage } from "../../context/MessagesContext";
import { SOP_STATUS_STYLE } from "./sopFormat";
import { formatStamp, scheduleForRule, scheduleForSop } from "./sopSchedule";

// Steps a human still owns (autonomy level 1) out of the steps that do work —
// the "steps a human owns" figure from docs/Executable SOP.pdf.
export function humanOwnedSummary(sop: Sop): string {
  const working = sop.nodes.filter((n) => n.kind === "step" || n.kind === "decision");
  if (working.length === 0) return "—";
  const human = working.filter((n) => n.autonomy === 1).length;
  return `${human} of ${working.length}`;
}

// An Alert's rule status in SOP terms, so both types share one status column.
export const ALERT_SOP_STATUS: Record<AlertRuleStatus, Sop["status"]> = {
  active: "active",
  draft: "draft",
  inactive: "paused",
};

export type SopSort = "name" | "edited" | "status" | "messages" | "last";

export const SOP_SORTS: { key: SopSort; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "edited", label: "Last edited" },
  { key: "status", label: "Status" },
  { key: "messages", label: "Messages" },
  { key: "last", label: "Last run" },
];

// Messages an SOP still has open: anything not dismissed, archived or snoozed.
export function openMessagesFor(messages: InboxMessage[], ref: { sopId?: string; ruleId?: string }) {
  return messages.filter(
    (m) =>
      (ref.sopId ? m.sopId === ref.sopId : m.ruleId === ref.ruleId) &&
      m.status !== "resolved" &&
      m.status !== "archived" &&
      m.status !== "snoozed",
  ).length;
}

interface Row {
  key: string;
  to: string;
  name: string;
  type: "Standard" | "Alert";
  scope: string;
  owner: string;
  editedAt: string;
  status: Sop["status"];
  messages: number;
  last: string | null;
  next: Date | null;
}

const STATUS_ORDER: Record<Sop["status"], number> = { active: 0, draft: 1, paused: 2, archived: 3 };

export function SopTable({
  sops,
  alerts = [],
  sort = "name",
}: {
  sops: Sop[];
  alerts?: AlertRule[];
  sort?: SopSort;
}) {
  const { messages } = useMessages();

  const rows: Row[] = [
    ...sops.map<Row>((sop) => ({
      key: sop.id,
      to: `/internal-ops/sops/${sop.id}`,
      name: sop.name,
      type: "Standard",
      scope: sop.brandId ? (getBrand(sop.brandId)?.name ?? "Build-wide") : "Build-wide",
      owner: sop.ownerName,
      editedAt: sop.updatedAt,
      status: sop.status,
      messages: openMessagesFor(messages, { sopId: sop.id }),
      last: runsForSop(sop.id)[0]?.startedAt ?? null,
      next: scheduleForSop(sop).next,
    })),
    ...alerts.map<Row>((rule) => ({
      key: rule.id,
      to: `/internal-ops/alerts/${rule.id}`,
      name: rule.name,
      type: "Alert",
      scope: getBrand(rule.brandId)?.name ?? "Build-wide",
      owner: rule.ownerName,
      editedAt: rule.updatedAt,
      status: ALERT_SOP_STATUS[rule.status],
      messages: openMessagesFor(messages, { ruleId: rule.id }),
      last: rule.lastTriggeredAt ?? null,
      next: scheduleForRule(rule).next,
    })),
  ].sort((a, b) => {
    switch (sort) {
      case "edited":
        return b.editedAt.localeCompare(a.editedAt);
      case "status":
        return STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.name.localeCompare(b.name);
      case "messages":
        return b.messages - a.messages || a.name.localeCompare(b.name);
      case "last":
        return (b.last ?? "").localeCompare(a.last ?? "") || a.name.localeCompare(b.name);
      default:
        return a.name.localeCompare(b.name);
    }
  });

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-slate-700">
          <tr>
            <th className="px-4 py-3.5 font-medium">Name</th>
            <th className="px-3 py-3.5 font-medium">Type</th>
            <th className="px-3 py-3.5 font-medium">Scope</th>
            <th className="px-3 py-3.5 font-medium">Owner</th>
            <th className="px-3 py-3.5 font-medium">Edited</th>
            <th className="px-3 py-3.5 text-center font-medium">Status</th>
            <th className="px-3 py-3.5 text-center font-medium">Messages</th>
            <th className="px-3 py-3.5 text-right font-medium">Last</th>
            <th className="px-4 py-3.5 text-right font-medium">Next</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
              <td className="max-w-[26rem] px-4 py-2.5">
                <Link to={r.to} className="block truncate font-medium text-slate-900 hover:text-brand-600" title={r.name}>
                  {r.name}
                </Link>
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{r.type}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{r.scope}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-slate-400">{r.owner}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-slate-400">{formatRelative(r.editedAt)}</td>
              <td className="px-3 py-2.5 text-center">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${SOP_STATUS_STYLE[r.status]}`}>
                  {r.status}
                </span>
              </td>
              <td className="px-3 py-2.5 text-center">
                <MessageCount count={r.messages} />
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right">
                {r.last ? (
                  <Link to={`${r.to}?tab=log`} className="text-brand-600 hover:underline">
                    {formatStamp(r.last)}
                  </Link>
                ) : (
                  <span className="text-slate-400">Never</span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right text-slate-400">{formatStamp(r.next)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Open messages, as the amber count the index and the SOP page's tab share.
export function MessageCount({ count, className = "" }: { count: number; className?: string }) {
  if (count === 0) return <span className="text-slate-300">0</span>;
  return (
    <span className={`inline-flex min-w-[2.25rem] justify-center rounded-full bg-amber-50 px-2 py-0.5 text-sm font-semibold text-amber-700 ${className}`}>
      {count}
    </span>
  );
}

export function TypePill({ type }: { type: "Standard" | "Alert" }) {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
        type === "Alert" ? "bg-orange-50 text-orange-700" : "bg-violet-50 text-violet-700"
      }`}
    >
      {type}
    </span>
  );
}
