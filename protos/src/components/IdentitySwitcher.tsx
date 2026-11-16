import { Check, ChevronsUpDown, UserCog } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NO_ROLES, type NoRole } from "../data/roles";
import { isBetaAccount } from "../lib/release";
import type { NetworkOperator } from "../types/domain";

function initials(name: string): string {
  const parts = name.replace(/[^a-zA-Z0-9& ]/g, "").trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Exported so the mobile Emulator page can show the same account avatars.
export function Avatar({ label, size = 30 }: { label: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-md bg-op-600 font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(label)}
    </span>
  );
}

// Combined Network Operator account + user-role switcher, used to demo how the
// experience changes across NO accounts (different Brands / customer data) and
// user types (Manager, Assistant Manager, Field Operator). Presentational only —
// state lives in each app's context.
export function IdentitySwitcher({
  networkOperators,
  activeNetworkOperatorId,
  onSelectNetworkOperator,
  role,
  onSelectRole,
  compact = false,
  align = "right",
}: {
  networkOperators: NetworkOperator[];
  activeNetworkOperatorId: string;
  onSelectNetworkOperator: (id: string) => void;
  role: NoRole;
  onSelectRole: (role: NoRole) => void;
  compact?: boolean;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const activeNo = networkOperators.find((n) => n.id === activeNetworkOperatorId);
  const activeRole = NO_ROLES.find((r) => r.id === role) ?? NO_ROLES[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Switch account or role"
        className={`flex items-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 ${
          compact ? "gap-1.5 p-1.5" : "gap-2.5 px-2.5 py-1.5"
        }`}
      >
        <Avatar label={activeNo?.name ?? "?"} size={compact ? 26 : 28} />
        {!compact && (
          <span className="flex flex-col items-start leading-tight">
            <span className="max-w-[10rem] truncate text-sm font-semibold text-slate-800">
              {activeNo?.name ?? "Select account"}
            </span>
            <span className="text-[11px] font-medium text-op-600">{activeRole.label}</span>
          </span>
        )}
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={2} />
      </button>

      {open && (
        <div
          className={`absolute top-[calc(100%+0.35rem)] z-50 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <p className="px-2 pb-1 pt-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
            NO account
          </p>
          {networkOperators.map((no) => (
            <button
              key={no.id}
              type="button"
              onClick={() => {
                onSelectNetworkOperator(no.id);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-slate-50"
            >
              <Avatar label={no.name} size={26} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
                {no.name}
              </span>
              {isBetaAccount(no.id) && (
                <span className="shrink-0 text-xs font-semibold text-op-600">(Beta)</span>
              )}
              {no.id === activeNetworkOperatorId && (
                <Check className="h-4 w-4 text-op-600" strokeWidth={2.5} />
              )}
            </button>
          ))}

          <div className="my-1.5 border-t border-slate-100" />

          <p className="flex items-center gap-1.5 px-2 pb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
            <UserCog className="h-3.5 w-3.5" /> User type
          </p>
          {NO_ROLES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                onSelectRole(r.id);
                setOpen(false);
              }}
              className="flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left hover:bg-slate-50"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-slate-700">{r.label}</span>
                <span className="block text-xs text-slate-400">{r.description}</span>
              </span>
              {r.id === role && (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-op-600" strokeWidth={2.5} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
