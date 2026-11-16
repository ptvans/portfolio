// Goals: the targets the agent checks in on, the same goals the web's Goals
// page lists, as dark cards: where the metric stands against its target.

import { goals, type GoalStatus } from "../../internal-ops/data/goals";
import { BrandMark } from "../components/ChatCards";
import { PageHeader } from "../components/PageHeader";
import { CARD } from "../components/ui";

const STATUS: Record<GoalStatus, { label: string; className: string }> = {
  behind: { label: "Behind", className: "bg-[#ff453a]/15 text-[#ff6961]" },
  at_risk: { label: "At risk", className: "bg-[#ff9f0a]/15 text-[#ffb340]" },
  on_track: { label: "On track", className: "bg-[#30d158]/15 text-[#4cd964]" },
  achieved: { label: "Achieved", className: "bg-[#6ea8ff]/15 text-[#6ea8ff]" },
};

// Most in need of a look first.
const ORDER: GoalStatus[] = ["behind", "at_risk", "on_track", "achieved"];

export function Goals() {
  const sorted = [...goals].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));
  const needLook = goals.filter((g) => g.status === "behind" || g.status === "at_risk").length;

  return (
    <div className="relative h-full overflow-clip bg-black text-white">
      <div className="no-scrollbar h-full overflow-y-auto px-4 pb-[120px] pt-[128px]">
        <div className="flex flex-col gap-3">
          {sorted.map((g) => {
            const status = STATUS[g.status];
            return (
              <article key={g.id} className={CARD}>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <span className={`mb-1.5 inline-block rounded-full px-2.5 py-0.5 text-sm font-semibold ${status.className}`}>
                      {status.label}
                    </span>
                    <h2 className="text-md font-semibold leading-snug">{g.name}</h2>
                  </div>
                  <BrandMark brandId={g.brandId} size={40} />
                </div>
                <p className="mt-1.5 text-base leading-snug text-white/55">{g.metric}</p>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold">{g.current}</span>
                  <span className="text-base text-white/50">of {g.target} target</span>
                </div>
                <p className="mt-2 text-sm text-white/40">
                  {g.period} · {g.ownerName} · {g.cadence}
                </p>
              </article>
            );
          })}
        </div>
      </div>
      <PageHeader title="Goals" subtitle={needLook ? `${needLook} need a look` : "All on track"} />
    </div>
  );
}
