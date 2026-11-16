// The filter rail on the left of a list page: an optional two-way toggle at
// the top (Owner: Me | All), then collapsible facet sections whose rows
// toggle a filter on and off.
//
// It only draws. The page owns the filter state and passes each row in with
// whether it is on and what pressing it does, so the same rail can sit over
// any list.

import { ChevronUp, Flag } from "lucide-react";
import { useState, type ReactNode } from "react";

export interface FilterRow {
  key: string;
  label: string;
  // The swatch before the label. Ignored when `icon` is set.
  color?: string;
  // "chip" draws the label as a brand chip; "flag" draws a coloured flag (for
  // projects); "dot" a small circle; "orb" a circle filled with `colors` as a
  // gradient; "swatch" (the default) a small square.
  variant?: "swatch" | "chip" | "flag" | "dot" | "orb";
  colors?: string[];
  // Drawn in place of the swatch.
  icon?: ReactNode;
  // Left out, the row shows no count.
  count?: number;
  active: boolean;
  onToggle: () => void;
}

export interface FilterSection {
  id: string;
  title: string;
  rows: FilterRow[];
  // Rows past this are behind "Show more".
  limit?: number;
  // Starts folded shut.
  collapsed?: boolean;
}

export interface FilterToggle {
  title: string;
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}

export function FilterSidebar({
  toggle,
  sections,
  footer,
}: {
  toggle?: FilterToggle;
  sections: FilterSection[];
  footer?: ReactNode;
}) {
  return (
    <nav aria-label="Filters" className="flex flex-col gap-6 pb-8">
      {toggle && <Toggle toggle={toggle} />}

      {sections
        .filter((s) => s.rows.length > 0)
        .map((s) => (
          <Section key={s.id} section={s} />
        ))}

      {footer}
    </nav>
  );
}

// Two (or a few) options side by side; the picked one is a raised white key.
function Toggle({ toggle }: { toggle: FilterToggle }) {
  return (
    <section>
      <h2 className="px-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{toggle.title}</h2>
      <div role="radiogroup" aria-label={toggle.title} className="mx-2 mt-2 flex rounded-md bg-slate-200/60">
        {toggle.options.map((o) => {
          const on = o.key === toggle.value;
          return (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => toggle.onChange(o.key)}
              className={`flex-1 rounded-md py-1 text-md transition-colors ${
                on
                  ? "bg-white font-medium text-slate-800 shadow-sm ring-1 ring-slate-400"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Section({ section }: { section: FilterSection }) {
  const [open, setOpen] = useState(!section.collapsed);
  const [expanded, setExpanded] = useState(false);
  const limit = section.limit ?? Infinity;
  // A row that is on always shows, even past the limit.
  const visible = expanded ? section.rows : section.rows.filter((r, i) => i < limit || r.active);
  const hidden = section.rows.length - visible.length;

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-2 text-sm font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700"
      >
        {section.title}
        <ChevronUp className={`h-4 w-4 text-slate-400 transition-transform ${open ? "" : "rotate-180"}`} strokeWidth={2} />
      </button>
      {open && (
        <ul className="mt-2 space-y-0.5">
          {visible.map((r) => (
            <li key={r.key}>
              <Row row={r} />
            </li>
          ))}
          {(hidden > 0 || expanded) && section.rows.length > limit && (
            <li>
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="px-2 py-1 text-sm font-medium text-slate-400 hover:text-slate-600"
              >
                {expanded ? "Show less" : `Show ${hidden} more`}
              </button>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

function Row({ row }: { row: FilterRow }) {
  const variant = row.variant ?? "swatch";
  return (
    <button
      type="button"
      onClick={row.onToggle}
      aria-pressed={row.active}
      title={row.label}
      className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1 text-left text-md transition-colors ${
        row.active ? "bg-brand-50 text-brand-800 ring-1 ring-brand-200" : "text-slate-600 hover:bg-slate-100"
      } ${row.count === 0 && !row.active ? "opacity-50" : ""}`}
    >
      {variant === "chip" ? (
        <span className="inline-flex min-w-0 items-center gap-1.5 rounded-md bg-white px-2 py-0.5 text-base shadow-[0_0_0_1px_rgb(226_232_240)]">
          <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: row.color ?? "#64748b" }} aria-hidden />
          <span className="truncate">{row.label}</span>
        </span>
      ) : (
        <>
          {row.icon ? (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">{row.icon}</span>
          ) : variant === "flag" ? (
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
              style={{ background: `${row.color ?? "#64748b"}22`, color: row.color ?? "#64748b" }}
              aria-hidden
            >
              <Flag className="h-3 w-3" strokeWidth={2.25} />
            </span>
          ) : variant === "dot" ? (
            <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: row.color ?? "#94a3b8" }} aria-hidden />
          ) : variant === "orb" ? (
            <Orb colors={row.colors ?? [row.color ?? "#94a3b8"]} />
          ) : (
            <Swatch color={row.color ?? "#94a3b8"} />
          )}
          <span className="min-w-0 flex-1 truncate">{row.label}</span>
        </>
      )}
      {row.count !== undefined && (
        <span className="ml-auto shrink-0 pl-2 text-sm tabular-nums text-slate-400">{row.count}</span>
      )}
    </button>
  );
}

// A small sphere: the colours as a diagonal gradient under a soft highlight,
// like the mockup's auto-generated topic swatches.
function Orb({ colors }: { colors: string[] }) {
  const fill = colors.length > 1 ? `linear-gradient(135deg, ${colors.join(", ")})` : colors[0];
  return (
    <span
      className="h-3.5 w-3.5 shrink-0 rounded-full"
      style={{ background: `radial-gradient(circle at 30% 30%, #ffffffb3, #ffffff00 55%), ${fill}` }}
      aria-hidden
    />
  );
}

// A small square with a soft top-left highlight, like the mockup's glossy
// swatches, from one colour.
function Swatch({ color }: { color: string }) {
  return (
    <span
      className="h-3.5 w-3.5 shrink-0 rounded-[3px]"
      style={{ background: `linear-gradient(135deg, ${color}99, ${color})` }}
      aria-hidden
    />
  );
}
