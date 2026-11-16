// The simplified message row: the severity edge, a checkbox, what is asked
// and of what, and the brand. No type badge, time or raised count — for lists
// of one type, where those say the same thing on every row (SOP Requests).
// A request still waiting after a couple of days says so.

import { BrandChip } from "../../../../components/BrandChip";
import { getBrand } from "../../../../data";
import { mockNow } from "../../../../lib/format";
import type { InboxMessage } from "../../context/MessagesContext";
import { SEVERITY_BORDER } from "./messageUi";

// Days a request has waited before the row nudges for a response.
const NUDGE_AFTER_DAYS = 2;

export function requestAgeDays(message: InboxMessage): number {
  return Math.floor((mockNow().getTime() - new Date(message.at).getTime()) / 86_400_000);
}

export function SimpleMessageRow({
  message,
  selected,
  checked,
  onCheck,
  onSelect,
}: {
  message: InboxMessage;
  selected: boolean;
  checked: boolean;
  onCheck: (on: boolean) => void;
  onSelect: () => void;
}) {
  const brand = message.brandId ? getBrand(message.brandId) : undefined;
  const settled = message.status === "resolved" || message.status === "archived";
  const age = requestAgeDays(message);
  const nudge = message.status === "needs_input" && (message.severity === "critical" || message.severity === "high") && age >= NUDGE_AFTER_DAYS;

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
      className={`relative flex cursor-pointer items-start gap-3 rounded-md border border-l-4 bg-white py-3.5 pl-4 pr-4 shadow-sm transition-colors hover:z-10 ${
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
        className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-brand-600"
      />
      <div className="min-w-0 flex-1">
        <p className={`truncate text-md leading-snug ${settled ? "text-slate-500" : "text-slate-800"}`} title={message.title}>
          {message.ask && <span>{message.ask} </span>}
          {message.title}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          {brand && <BrandChip name={brand.name} color={brand.color} />}
          {nudge && (
            <span className="inline-flex items-center rounded-md bg-rose-50 px-2.5 py-1 font-medium text-rose-600">
              Request is {age} day{age === 1 ? "" : "s"} old. Respond?
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
