// Automations: the SOPs the agent runs. What it learned and drafted for you
// comes first (the same draft the chat offers, opening the same review
// sheet), then the SOPs already running, then the other drafts.

import { ChevronRight, Workflow } from "lucide-react";
import { useState, type ReactNode } from "react";
import { getBrand } from "../../../data";
import { sops } from "../../../data/sops";
import type { Sop } from "../../../types/domain";
import { useBrickOps } from "../BrickOpsContext";
import { PageHeader } from "../components/PageHeader";
import { SopSheet } from "../components/SopSheet";
import { CARD } from "../components/ui";
import { LEARNED_SOP } from "../data";

const LEARNED_STATE = {
  open: { label: "Draft · Review", className: "text-[#6ea8ff]" },
  dismissed: { label: "Draft · Not now", className: "text-white/45" },
  enabled: { label: "On", className: "text-[#4cd964]" },
};

export function Automations() {
  const { agentName, suggestion } = useBrickOps();
  const [reviewing, setReviewing] = useState(false);
  const running = sops.filter((s) => s.status === "active");
  const drafts = sops.filter((s) => s.status === "draft");
  const learned = LEARNED_STATE[suggestion];

  return (
    <div className="relative h-full overflow-clip bg-black text-white">
      <div className="no-scrollbar h-full overflow-y-auto px-4 pb-[120px] pt-[128px]">
        <Section title={`Learned by ${agentName}`}>
          <button type="button" onClick={() => setReviewing(true)} className={`${CARD} flex w-full items-center gap-3 text-left`}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#5b4fe6] to-[#3D38B8]">
              <Workflow className="h-5 w-5" strokeWidth={2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-semibold leading-snug">{LEARNED_SOP.name}</span>
              <span className={`block text-sm ${learned.className}`}>
                {learned.label} · from {LEARNED_SOP.timesSeen} manual holds
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-white/30" />
          </button>
        </Section>

        <Section title={`Running · ${running.length}`}>
          <SopList sops={running} />
        </Section>

        <Section title={`Drafts · ${drafts.length}`}>
          <SopList sops={drafts} />
        </Section>
      </div>
      <PageHeader title="Automations" subtitle={`${running.length + (suggestion === "enabled" ? 1 : 0)} running`} />
      <SopSheet open={reviewing} onClose={() => setReviewing(false)} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 px-1 text-sm font-semibold text-white/60">{title}</h2>
      {children}
    </section>
  );
}

function SopList({ sops }: { sops: Sop[] }) {
  return (
    <ul className={`${CARD} !p-0 divide-y divide-white/10 overflow-hidden`}>
      {sops.map((s) => (
        <li key={s.id} className="px-4 py-3.5">
          <p className="text-base leading-snug">{s.name}</p>
          <p className="mt-0.5 text-sm text-white/45">{s.brandId ? (getBrand(s.brandId)?.name ?? "Brand") : "Build-wide"}</p>
          <p className="mt-1 line-clamp-2 text-sm leading-snug text-white/55">{s.trigger}</p>
        </li>
      ))}
    </ul>
  );
}
