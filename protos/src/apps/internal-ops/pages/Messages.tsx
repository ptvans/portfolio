// Messages: one surface for everything that wants Internal Ops' attention —
// alerts raised by rules, SOP runs that stopped and need a person, and the
// threads with brands and network operators. Filters on the left, the list in
// the middle, and the picked message in an inspection pane on the right.
//
// The filter rail narrows from 260px to 220px below the xl breakpoint
// (1280px). Below lg (1024px) there is no room for three columns at all: the
// filters move into a panel under the search field, and the pane becomes a
// drawer of fixed width laid over the right of the list, which stays in view
// and in reach beneath it.
//
// The URL carries the open message (?item=) and, on the way in, any filter a
// link wants to land on (?status=, ?severity=, ?type=, ?brand=, comma
// separated), so other pages can deep-link here. A link that names filters
// lands on everyone's messages; with none, the page opens on yours, critical
// and high, still open.

import { ChevronDown, MessagesSquare, Settings, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BrandChip } from "../../../components/BrandChip";
import { EmptyState } from "../../../components/EmptyState";
import { getBrand, getNetworkOperator, getProject, getSop, getWorkOrder } from "../../../data";
import { formatDateTime } from "../../../lib/format";
import { linkAlertText } from "../components/alerts/AlertCard";
import { FilterSidebar, type FilterRow, type FilterSection } from "../components/FilterSidebar";
import { MessageDetail } from "../components/messages/MessageDetail";
import { RaisedChip } from "../components/messages/MessageMeta";
import { ResolveDialog } from "../components/messages/ResolveDialog";
import { MESSAGE_TYPES, MessageTypeBadge, SEVERITY_BORDER, messageWhen } from "../components/messages/messageUi";
import { useAlerts } from "../context/AlertsContext";
import {
  DEFAULT_FILTERS,
  EMPTY_FILTERS,
  FACETS,
  SEVERITY_LABEL,
  STATUS_LABEL,
  TOPICS,
  TYPE_LABEL,
  applyFilters,
  facetValue,
  sameFilters,
  useMessages,
  type FacetKey,
  type InboxMessage,
  type MessageFilters,
  type MessageSeverity,
  type MessageStatus,
  type MessageType,
} from "../context/MessagesContext";

// Read and Archived sit behind "Show more".
const STATUS_ORDER: MessageStatus[] = ["needs_input", "unread", "snoozed", "resolved", "read", "archived"];
const STATUS_COLOR: Record<MessageStatus, string> = {
  needs_input: "#fcd27a",
  unread: "#8ee0b9",
  snoozed: "#c4b5fd",
  resolved: "#9ccaf5",
  read: "#cbd5e1",
  archived: "#94a3b8",
};
const SEVERITY_ORDER: MessageSeverity[] = ["critical", "high", "medium", "normal", "low"];
const SEVERITY_COLOR: Record<MessageSeverity, string> = {
  critical: "#dc3550",
  high: "#f07b38",
  medium: "#f5c518",
  normal: "#2f86e6",
  low: "#a13fe0",
};

const list = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);

export function Messages() {
  const { messages, markRead, saved, saveFilter, resolve } = useMessages();
  const { alerts, getRule } = useAlerts();
  const [params, setParams] = useSearchParams();

  // Filters a link asked for win over the default open view.
  const [filters, setFilters] = useState<MessageFilters>(() => {
    const asked = {
      ...EMPTY_FILTERS,
      status: list(params.get("status")),
      severity: list(params.get("severity")),
      type: list(params.get("type")),
      brand: list(params.get("brand")),
      ids: list(params.get("ids")),
    };
    return sameFilters(asked, EMPTY_FILTERS) ? DEFAULT_FILTERS : asked;
  });

  // What a link that named its messages called them (?from=), for the chip.
  const [idsLabel] = useState(() => (params.get("from") === "stella" ? "Stella's incoming requests" : "Linked messages"));

  const rows = useMemo(
    () => applyFilters(messages, filters).sort((a, b) => b.at.localeCompare(a.at)),
    [messages, filters],
  );

  // The open message lives in the URL. With none named the pane stays
  // closed: the page opens on the list, and nothing is read until clicked.
  const selectedId = params.get("item");
  const selected = messages.find((m) => m.id === selectedId);
  const select = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set("item", id);
    else next.delete("item");
    setParams(next, { replace: true });
  };

  // Inbound filter params have been read into state; drop them so a refresh
  // starts from what's on screen rather than replaying the link.
  useEffect(() => {
    const next = new URLSearchParams(params);
    const had = ["status", "severity", "type", "brand", "ids", "from"].some((k) => next.has(k));
    if (!had) return;
    ["status", "severity", "type", "brand", "ids", "from"].forEach((k) => next.delete(k));
    setParams(next, { replace: true });
  }, [params, setParams]);

  // Opening a thread or a note reads it.
  useEffect(() => {
    if ((selected?.kind === "thread" || selected?.kind === "note") && selected.status === "unread") markRead(selected.id);
  }, [selected, markRead]);

  // ---- Facets -------------------------------------------------------------

  const counts = useMemo(() => {
    const out = {} as Record<FacetKey, Map<string, number>>;
    FACETS.forEach((k) => {
      const m = new Map<string, number>();
      applyFilters(messages, filters, k).forEach((msg) => {
        const v = facetValue(msg, k);
        if (v) m.set(v, (m.get(v) ?? 0) + 1);
      });
      out[k] = m;
    });
    return out;
  }, [messages, filters]);

  // Every value a facet can take among the owner's messages, so a row doesn't
  // vanish when another filter takes its count to zero.
  const scoped = useMemo(() => messages.filter((m) => filters.owner !== "me" || m.mine), [messages, filters.owner]);
  const values = (k: FacetKey) => [...new Set(scoped.map((m) => facetValue(m, k)).filter((v): v is string => Boolean(v)))];
  const byCount = (k: FacetKey) => (a: string, b: string) => (counts[k].get(b) ?? 0) - (counts[k].get(a) ?? 0);

  const toggle = (k: FacetKey, v: string) =>
    setFilters((f) => ({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] }));

  const row = (k: FacetKey, v: string, label: string, color: string | undefined, extra?: Partial<FilterRow>): FilterRow => ({
    key: v,
    label,
    color,
    count: counts[k].get(v) ?? 0,
    active: filters[k].includes(v),
    onToggle: () => toggle(k, v),
    ...extra,
  });

  // The mockup's groups first — Status, Severity, Topics, Brands — open; the
  // rest start folded shut.
  const sections: FilterSection[] = [
    {
      id: "status",
      title: "Status",
      limit: 3,
      rows: STATUS_ORDER.filter((s) => values("status").includes(s)).map((s) =>
        row("status", s, STATUS_LABEL[s], STATUS_COLOR[s], { variant: "dot", count: undefined }),
      ),
    },
    {
      id: "severity",
      title: "Severity",
      rows: SEVERITY_ORDER.filter((s) => values("severity").includes(s)).map((s) =>
        row("severity", s, SEVERITY_LABEL[s], SEVERITY_COLOR[s]),
      ),
    },
    {
      id: "topic",
      title: "Topics",
      rows: TOPICS.filter((t) => values("topic").includes(t.id)).map((t) =>
        row("topic", t.id, t.label, undefined, { variant: "orb", colors: t.colors, count: undefined }),
      ),
    },
    {
      id: "brand",
      title: "Brands",
      limit: 6,
      rows: values("brand")
        .sort(byCount("brand"))
        .map((id) => {
          const b = getBrand(id);
          return row("brand", id, b?.name ?? id, b?.color, { variant: "chip" });
        }),
    },
    {
      id: "type",
      title: "Type",
      collapsed: true,
      rows: MESSAGE_TYPES.filter((t) => values("type").includes(t)).map((t) =>
        row("type", t, TYPE_LABEL[t], undefined, { icon: <MessageTypeBadge type={t} size={18} /> }),
      ),
    },
    {
      id: "networkOperator",
      title: "Network operators",
      limit: 6,
      collapsed: true,
      rows: values("networkOperator")
        .sort(byCount("networkOperator"))
        .map((id) => row("networkOperator", id, getNetworkOperator(id)?.name ?? id, "#14b8a6", { variant: "chip" })),
    },
    {
      id: "saved",
      title: "Saved filters",
      collapsed: true,
      rows: saved.map((s) => {
        const on = sameFilters(filters, s.filters);
        return {
          key: s.id,
          label: s.name,
          color: "#a855f7",
          count: applyFilters(messages, s.filters).length,
          active: on,
          onToggle: () => setFilters(on ? DEFAULT_FILTERS : s.filters),
        };
      }),
    },
    {
      id: "rule",
      title: "Alert Automations",
      limit: 5,
      collapsed: true,
      rows: values("rule")
        .sort(byCount("rule"))
        .map((id) => {
          const rule = getRule(id);
          return row("rule", id, rule?.name ?? id, rule ? getBrand(rule.brandId)?.color : undefined);
        }),
    },
    {
      id: "sop",
      title: "Standard Automations",
      collapsed: true,
      rows: values("sop")
        .sort(byCount("sop"))
        .map((id) => row("sop", id, getSop(id)?.name ?? id, "#8b5cf6")),
    },
    {
      id: "project",
      title: "Projects",
      limit: 5,
      collapsed: true,
      rows: values("project")
        .sort(byCount("project"))
        .map((id) => {
          const p = getProject(id);
          return row("project", id, p?.name ?? id, p ? (p.brandColor ?? getBrand(p.brandId)?.color) : undefined, { variant: "flag" });
        }),
    },
    {
      id: "workOrder",
      title: "Work orders",
      limit: 5,
      collapsed: true,
      rows: values("workOrder")
        .sort(byCount("workOrder"))
        .map((id) => {
          const wo = getWorkOrder(id);
          return row("workOrder", id, wo?.title ?? id, wo ? getBrand(wo.brandId)?.color : undefined);
        }),
    },
  ];

  // ---- Selection and bulk dismiss -----------------------------------------

  const [checked, setChecked] = useState<Set<string>>(new Set());
  const checkedRows = rows.filter((m) => checked.has(m.id) && m.status !== "archived" && m.status !== "resolved");
  const allChecked = rows.length > 0 && rows.every((m) => checked.has(m.id));
  const someChecked = checkedRows.length > 0 && !allChecked;
  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someChecked;
  }, [someChecked]);
  // Resolving the selection asks for the one reason, then records it on each.
  const [resolving, setResolving] = useState(false);
  const resolveChecked = (reason: string) => {
    for (const m of checkedRows) resolve(m.id, reason);
    setChecked(new Set());
    setResolving(false);
  };

  const filtered = !sameFilters(filters, DEFAULT_FILTERS);
  // The filter panel under the search field, on viewports too narrow for
  // the rail. Escape closes it.
  const [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => {
    if (!filtersOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFiltersOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtersOpen]);
  const activeFilters = FACETS.reduce((n, k) => n + filters[k].length, 0) + (filters.owner === "me" ? 1 : 0);

  const filterSidebar = (
    <FilterSidebar
      toggle={{
        title: "Owner",
        options: [
          { key: "me", label: "Me" },
          { key: "all", label: "All" },
        ],
        value: filters.owner,
        onChange: (owner) => setFilters((f) => ({ ...f, owner: owner as MessageFilters["owner"] })),
      }}
      sections={sections}
    />
  );

  return (
    <div className="relative flex h-full min-h-0 bg-slate-50">
      {/* Filters and list browse together. With the pane closed they sit
          centred at a reading width; with it open they give the pane room and
          run from the left edge. */}
      <div
        className={`grid min-h-0 min-w-0 flex-1 grid-cols-1 px-6 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)] ${
          selected ? "lg:px-0" : "mx-auto max-w-[1240px] lg:gap-8 lg:px-8"
        }`}
      >
      {/* ---------------- Filters (rail) ---------------- */}
      <div className={`no-scrollbar hidden min-h-0 overflow-y-auto lg:block ${selected ? "px-4 pt-7 xl:px-5" : "px-2 pt-[4.5rem]"}`}>
        {filterSidebar}
      </div>

      {/* ---------------- List ---------------- */}
      <section className={`flex min-h-0 min-w-0 flex-col pt-6 ${selected ? "lg:px-4" : "lg:px-1"}`}>
        <div className="mb-4 flex items-center gap-2">
          <h1 className="text-xl text-slate-600">Messages</h1>
          <Link
            to="/internal-ops/sops/list"
            title="Manage Alert Automations"
            aria-label="Manage Alert Automations"
            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <Settings className="h-4 w-4" strokeWidth={1.75} />
          </Link>
        </div>

        <div className="relative mb-3 flex items-center gap-4">
          <input
            type="search"
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            placeholder="Search for Brand, NO, status…"
            className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-base text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          {/* Below lg the rail is gone; this opens the same filters in a
              panel under the search field. */}
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            aria-haspopup="dialog"
            className={`inline-flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium shadow-sm transition-colors lg:hidden ${
              filtersOpen || activeFilters > 0
                ? "border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" strokeWidth={2} aria-hidden />
            Filters
            {activeFilters > 0 && (
              <span className="rounded-full bg-brand-600 px-1.5 text-xs font-semibold text-white">{activeFilters}</span>
            )}
          </button>
          <SaveFilter
            disabled={!filtered || saved.some((s) => sameFilters(s.filters, filters))}
            suggestedName={describe(filters, getRule)}
            onSave={(name) => saveFilter(name, filters)}
          />
          {filtersOpen && (
            <>
              <div className="fixed inset-0 z-30 lg:hidden" onMouseDown={() => setFiltersOpen(false)} aria-hidden />
              <div
                role="dialog"
                aria-label="Filters"
                className="no-scrollbar absolute left-0 right-0 top-full z-40 mt-2 max-h-[min(70vh,40rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white px-3 pt-4 shadow-xl lg:hidden"
              >
                <div className="mb-3 flex items-center justify-between px-2">
                  <h2 className="text-base font-semibold text-slate-800">Filters</h2>
                  <div className="flex items-center gap-3">
                    {filtered && (
                      <button
                        type="button"
                        onClick={() => setFilters(DEFAULT_FILTERS)}
                        className="text-sm font-medium text-brand-600 hover:text-brand-700"
                      >
                        Reset
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setFiltersOpen(false)}
                      aria-label="Close filters"
                      className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    >
                      <X className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </div>
                </div>
                {filterSidebar}
              </div>
            </>
          )}
        </div>

        {filters.ids.length > 0 && (
          <div className="mb-3 flex items-center gap-2 text-sm text-slate-600">
            <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 py-1 pl-3 pr-1.5 font-medium text-violet-800 ring-1 ring-violet-200">
              {idsLabel} ({filters.ids.length})
              <button
                type="button"
                onClick={() => setFilters((f) => ({ ...f, ids: [] }))}
                aria-label="Show all messages"
                className="rounded-full p-0.5 text-violet-500 hover:bg-violet-100 hover:text-violet-800"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.25} />
              </button>
            </span>
          </div>
        )}

        {rows.length > 0 && (
          <div className="mb-2 flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2.5 py-1.5 pl-[18px] text-base text-slate-700">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allChecked}
                onChange={() => setChecked(allChecked ? new Set() : new Set(rows.map((m) => m.id)))}
                aria-label="Select all visible messages"
                className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-brand-600"
              />
              {checkedRows.length > 0 ? `${checkedRows.length} selected` : "Select all"}
              <button
                type="button"
                onClick={() => setResolving(true)}
                disabled={checkedRows.length === 0}
                className="ml-1 rounded border border-brand-200 px-2 py-0.5 text-sm text-brand-600 transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 disabled:hover:bg-transparent"
              >
                Dismiss selected
              </button>
            </label>
            <span className="ml-auto text-sm text-slate-400">
              {rows.length} message{rows.length === 1 ? "" : "s"}
            </span>
          </div>
        )}

        <div className="no-scrollbar -mx-1 min-h-0 flex-1 overflow-y-auto px-1 pb-6 pt-1">
          {rows.length === 0 ? (
            <EmptyState
              icon={MessagesSquare}
              title={filters.q.trim() ? `No messages match "${filters.q.trim()}"` : "No messages match these filters"}
              action={
                filtered ? (
                  <button
                    type="button"
                    onClick={() => setFilters(DEFAULT_FILTERS)}
                    className="text-sm font-medium text-brand-600 hover:text-brand-700"
                  >
                    Reset filters
                  </button>
                ) : undefined
              }
            />
          ) : (
            <ul className="-space-y-px">
              {/* Rows touch: each overlaps the one above by its 1px border,
                  so there is one line between them rather than two. */}
              {rows.map((m) => (
                <li key={m.id}>
                  <MessageRow
                    message={m}
                    title={
                      m.kind === "alert"
                        ? (() => {
                            const a = alerts.find((x) => x.id === m.refId);
                            return a ? linkAlertText(a).title : m.title;
                          })()
                        : m.title
                    }
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
      </div>

      {/* ---------------- Detail ---------------- */}
      {/* A column at lg and up; below that, a drawer of fixed width over the
          right of the page, with the list still showing (and clickable) to
          its left. */}
      {selected && (
        <div className="absolute inset-y-0 right-0 z-20 w-[480px] max-w-[calc(100%-3rem)] shadow-[-12px_0_32px_-16px_rgba(15,23,42,0.35)] lg:static lg:w-[34%] lg:min-w-[420px] lg:max-w-[640px] lg:shrink-0 lg:shadow-none">
          <MessageDetail message={selected} onClose={() => select(null)} />
        </div>
      )}

      {resolving && checkedRows.length > 0 && (
        <ResolveDialog
          titles={checkedRows.map((m) => m.title)}
          onResolve={resolveChecked}
          onCancel={() => setResolving(false)}
        />
      )}
    </div>
  );
}

// One message in the list. Also the SOP page's Messages tab.
export function MessageRow({
  message,
  title,
  selected,
  checked,
  onCheck,
  onSelect,
}: {
  message: InboxMessage;
  title: ReactNode;
  selected: boolean;
  checked: boolean;
  onCheck: (on: boolean) => void;
  onSelect: () => void;
}) {
  const brand = message.brandId ? getBrand(message.brandId) : undefined;
  const no = message.networkOperatorId ? getNetworkOperator(message.networkOperatorId) : undefined;
  const settled =
    message.status === "resolved" || message.status === "archived" || message.status === "snoozed" || message.status === "read";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-current={selected || undefined}
      className={`relative flex cursor-pointer items-start gap-3 rounded-md border border-l-4 bg-white py-3 pl-4 pr-4 shadow-sm transition-colors hover:z-10 ${
        SEVERITY_BORDER[message.severity]
      } ${
        selected
          ? "z-10 border-y-brand-300 border-r-brand-300 ring-1 ring-brand-200"
          : "border-y-slate-200 border-r-slate-200 hover:border-y-slate-300 hover:border-r-slate-300"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onCheck(e.target.checked)}
        aria-label={`Select "${message.title}"`}
        className="mt-1.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-brand-600"
      />
      <MessageTypeBadge type={message.type} className="-mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className={`text-md leading-snug ${settled ? "text-slate-500" : "text-slate-800"} ${message.status === "unread" ? "font-medium" : ""}`}>
          {message.ask && <span>{message.ask} </span>}
          {title}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-slate-400">
          <span title={formatDateTime(message.at)}>{messageWhen(message.at)}</span>
          {brand && <BrandChip name={brand.name} color={brand.color} />}
          {no && (
            <span className="inline-flex items-center rounded-md bg-op-50 px-2 py-1 text-sm font-medium text-op-700">{no.name}</span>
          )}
          {message.raised.length > 1 && <RaisedChip count={message.raised.length} />}
          {settled && message.status !== "read" && (
            <span className="ml-auto text-slate-400">{STATUS_LABEL[message.status]}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// "Save" names the filter as it stands; the name is editable before it saves.
function SaveFilter({
  disabled,
  suggestedName,
  onSave,
}: {
  disabled: boolean;
  suggestedName: string;
  onSave: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(suggestedName);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setName(suggestedName);
          setOpen((v) => !v);
        }}
        title={disabled ? "Change the filters to save them" : "Save these filters"}
        className="inline-flex items-center gap-1.5 text-base text-brand-500 transition-colors hover:text-brand-700 disabled:cursor-not-allowed disabled:text-slate-300"
      >
        Save
        <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      {open && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            onSave(name.trim());
            setOpen(false);
          }}
          className="absolute right-0 top-full z-30 mt-2 w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-lg"
        >
          <label className="text-sm font-medium text-slate-600" htmlFor="saved-filter-name">
            Save as a filter
          </label>
          <input
            id="saved-filter-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-base text-slate-700 focus:border-brand-300 focus:outline-none"
          />
          <div className="mt-2.5 flex justify-end">
            <button
              type="submit"
              disabled={!name.trim()}
              className="rounded-md bg-brand-500 px-3 py-1 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-40"
            >
              Save filter
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// A readable name for a set of filters, as the default for "Save".
function describe(f: MessageFilters, getRule: (id: string) => { name: string } | undefined) {
  const parts = [
    ...(f.owner === "me" ? ["Mine"] : []),
    ...f.brand.map((id) => getBrand(id)?.name ?? id),
    ...f.networkOperator.map((id) => getNetworkOperator(id)?.name ?? id),
    ...f.type.map((t) => TYPE_LABEL[t as MessageType] ?? t),
    ...f.severity.map((s) => SEVERITY_LABEL[s as MessageSeverity]?.toLowerCase() ?? s),
    ...f.topic.map((id) => TOPICS.find((t) => t.id === id)?.label ?? id),
    ...f.rule.map((id) => getRule(id)?.name ?? id),
    ...f.sop.map((id) => getSop(id)?.name ?? id),
    ...f.project.map((id) => getProject(id)?.name ?? id),
    ...f.workOrder.map((id) => getWorkOrder(id)?.title ?? id),
    ...f.status.map((s) => STATUS_LABEL[s as MessageStatus]?.toLowerCase() ?? s),
  ];
  if (f.q.trim()) parts.push(`"${f.q.trim()}"`);
  return parts.slice(0, 4).join(" · ") || "Everything";
}
