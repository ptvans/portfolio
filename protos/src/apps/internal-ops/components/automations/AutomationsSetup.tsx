// The Automations Setup page: what Stella runs on its own, in two tabs —
// SOPs (the step-by-step documents and, as SOPs of type Alert, the prompts
// she keeps evaluating) and Goals (targets she tracks). Each tab is its own
// route, so the index pages render inside this frame and keep their URLs.

import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

export type AutomationsTab = "sops" | "goals";

export const AUTOMATIONS_TABS: { key: AutomationsTab; label: string; to: string }[] = [
  { key: "sops", label: "Automations", to: "/internal-ops/sops/list" },
  { key: "goals", label: "Goals", to: "/internal-ops/goals" },
];

export function AutomationsSetup({ tab, actions, children }: { tab: AutomationsTab; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900">Automations Setup</h1>
        {actions}
      </div>

      <nav role="tablist" aria-label="Automations" className="mb-5 flex gap-1 border-b border-slate-200">
        {AUTOMATIONS_TABS.map((t) => (
          <NavLink
            key={t.key}
            to={t.to}
            end
            role="tab"
            aria-selected={t.key === tab}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              t.key === tab ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
            }`}
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      {children}
    </div>
  );
}
