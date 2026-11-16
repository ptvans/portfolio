// The SOPs landing page: Needs Your Attention (was Requests) — every message an SOP raised (alerts and
// runs that stopped for a person), as a simplified list with the inspection
// pane on the right, as on Messages. Owner and Status narrow it; the
// selection can be resolved (with a reason) or dismissed. The SOP index
// itself is behind "View Automations".
//
// The open message lives in the URL (?item=), as on Messages, so a row's
// pane survives a refresh and the two pages can link to each other's items.

import { Workflow } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EmptyState } from "../../../components/EmptyState";
import { MessageDetail } from "../components/messages/MessageDetail";
import { ResolveDialog } from "../components/messages/ResolveDialog";
import { SimpleMessageRow } from "../components/messages/SimpleMessageRow";
import { EMPTY_FILTERS, applyFilters, useMessages, type MessageFilters, type MessageStatus } from "../context/MessagesContext";

type Owner = MessageFilters["owner"];
type StatusView = "action" | "resolved" | "dismissed" | "all";

const OWNERS: { key: Owner; label: string }[] = [
  { key: "me", label: "Me" },
  { key: "all", label: "All" },
];

// Resolve marks a request done (with why); Dismiss puts it away unanswered.
const STATUS_VIEWS: { key: StatusView; label: string; statuses: MessageStatus[] }[] = [
  { key: "action", label: "Action Required", statuses: ["needs_input"] },
  { key: "resolved", label: "Resolved", statuses: ["resolved"] },
  { key: "dismissed", label: "Dismissed", statuses: ["archived"] },
  { key: "all", label: "All", statuses: [] },
];

export function SopRequests() {
  const { messages, resolve, archive } = useMessages();
  const [params, setParams] = useSearchParams();
  const [owner, setOwner] = useState<Owner>("me");
  const [view, setView] = useState<StatusView>("action");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const statuses = STATUS_VIEWS.find((v) => v.key === view)?.statuses ?? [];
    const filters: MessageFilters = { ...EMPTY_FILTERS, owner, type: ["sop"], status: statuses, q };
    return applyFilters(messages, filters).sort((a, b) => b.at.localeCompare(a.at));
  }, [messages, owner, view, q]);

  const selectedId = params.get("item");
  const selected = messages.find((m) => m.id === selectedId);
  const select = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set("item", id);
    else next.delete("item");
    setParams(next, { replace: true });
  };

  // ---- Selection and bulk actions ----------------------------------------

  const [checked, setChecked] = useState<Set<string>>(new Set());
  const checkedRows = rows.filter((m) => checked.has(m.id) && m.status !== "archived" && m.status !== "resolved");
  const allChecked = rows.length > 0 && rows.every((m) => checked.has(m.id));
  const someChecked = checkedRows.length > 0 && !allChecked;
  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someChecked;
  }, [someChecked]);

  const [resolving, setResolving] = useState(false);
  const resolveChecked = (reason: string) => {
    for (const m of checkedRows) resolve(m.id, reason);
    setChecked(new Set());
    setResolving(false);
  };
  const dismissChecked = () => {
    archive(checkedRows.map((m) => m.id));
    setChecked(new Set());
  };

  const segment = (on: boolean) =>
    `px-4 py-2 text-base font-medium transition-colors first:rounded-l-lg last:rounded-r-lg ${
      on ? "z-10 bg-white text-brand-600 ring-1 ring-brand-500" : "bg-white text-slate-700 hover:bg-slate-50"
    }`;
  const bulk =
    "rounded-lg border border-slate-200 bg-white px-5 py-1.5 text-base font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white";

  return (
    <div className="relative flex h-full min-h-0 bg-slate-50">
      <section
        className={`flex min-h-0 min-w-0 flex-1 flex-col px-6 pt-6 ${selected ? "lg:px-8" : "mx-auto max-w-[1240px] lg:px-8"}`}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold text-slate-900">Needs Your Attention</h1>
          <Link
            to="/internal-ops/sops/list"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-base font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            View Automations
          </Link>
        </div>

        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="mb-4 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />

        <div className="mb-5 flex flex-wrap items-center gap-x-8 gap-y-3 text-base text-slate-500">
          <div className="flex items-center gap-3">
            <span>Owner</span>
            <div className="inline-flex rounded-lg border border-slate-200 shadow-sm" role="group" aria-label="Owner">
              {OWNERS.map((o) => (
                <button key={o.key} type="button" onClick={() => setOwner(o.key)} aria-pressed={owner === o.key} className={segment(owner === o.key)}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span>Status</span>
            <div className="inline-flex rounded-lg border border-slate-200 shadow-sm" role="group" aria-label="Status">
              {STATUS_VIEWS.map((v) => (
                <button key={v.key} type="button" onClick={() => setView(v.key)} aria-pressed={view === v.key} className={segment(view === v.key)}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-3 flex items-center gap-4 pl-[18px]">
          <label className="flex cursor-pointer items-center gap-3 py-1 text-base text-slate-700">
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={allChecked}
              disabled={rows.length === 0}
              onChange={() => setChecked(allChecked ? new Set() : new Set(rows.map((m) => m.id)))}
              aria-label="Select all visible requests"
              className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-brand-600"
            />
            {checkedRows.length > 0 ? `${checkedRows.length} selected` : "Select All"}
          </label>
          <button type="button" onClick={() => setResolving(true)} disabled={checkedRows.length === 0} className={bulk}>
            Resolve
          </button>
          <button type="button" onClick={dismissChecked} disabled={checkedRows.length === 0} className={bulk}>
            Dismiss
          </button>
          <span className="ml-auto text-sm text-slate-400">
            {rows.length} request{rows.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="no-scrollbar -mx-1 min-h-0 flex-1 overflow-y-auto px-1 pb-6 pt-1">
          {rows.length === 0 ? (
            <EmptyState
              icon={Workflow}
              title={q.trim() ? `No requests match "${q.trim()}"` : "No requests here"}
              description={view === "action" ? "Nothing an Automation raised is waiting on you." : undefined}
            />
          ) : (
            <ul className="space-y-2.5">
              {rows.map((m) => (
                <li key={m.id}>
                  <SimpleMessageRow
                    message={m}
                    selected={m.id === selectedId}
                    checked={checked.has(m.id)}
                    onCheck={(on) =>
                      setChecked((prev) => {
                        const next = new Set(prev);
                        if (on) next.add(m.id);
                        else next.delete(m.id);
                        return next;
                      })
                    }
                    onSelect={() => select(m.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* The inspection pane, as on Messages: a column at lg and up, a
          drawer over the right of the list below that. */}
      {selected && (
        <div className="absolute inset-y-0 right-0 z-20 w-[480px] max-w-[calc(100%-3rem)] shadow-[-12px_0_32px_-16px_rgba(15,23,42,0.35)] lg:static lg:w-[34%] lg:min-w-[420px] lg:max-w-[640px] lg:shrink-0 lg:shadow-none">
          <MessageDetail message={selected} onClose={() => select(null)} />
        </div>
      )}

      {resolving && checkedRows.length > 0 && (
        <ResolveDialog verb="Resolve" titles={checkedRows.map((m) => m.title)} onResolve={resolveChecked} onCancel={() => setResolving(false)} />
      )}
    </div>
  );
}
