// The bottom tab bar, after Muse's: a dark glass capsule of icons, the
// current tab on a lighter pill. The same four tabs as the menu.

import { Hand, MessageCircle, Target, Workflow, type LucideIcon } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useBrickOps } from "../BrickOpsContext";

export function TabBar() {
  const { agentName, remaining } = useBrickOps();
  const tabs: { to: string; icon: LucideIcon; label: string; badge?: number }[] = [
    { to: "/brick-ops", icon: MessageCircle, label: `Chat with ${agentName}` },
    { to: "/brick-ops/attention", icon: Hand, label: "Needs Your Attention", badge: remaining },
    { to: "/brick-ops/goals", icon: Target, label: "Goals" },
    { to: "/brick-ops/automations", icon: Workflow, label: "Automations" },
  ];
  return (
    <>
    {/* Content passing under the bar fades out. */}
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[120px]"
      style={{ background: "linear-gradient(to top, #000 0, #000 45%, rgb(0 0 0 / 0) 100%)" }}
    />
    <nav
      aria-label="Tabs"
      className="absolute inset-x-4 bottom-7 z-30 flex h-[68px] items-center gap-1 rounded-full border border-white/10 bg-[#1c1c1f]/85 p-1.5 shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_14px_30px_-10px_rgb(0_0_0/0.9)] backdrop-blur-xl"
    >
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end
          aria-label={t.label}
          className={({ isActive }) =>
            `relative flex h-full flex-1 items-center justify-center rounded-full transition ${
              isActive ? "bg-white/12 text-white" : "text-white/80 active:bg-white/5"
            }`
          }
        >
          <t.icon className="h-7 w-7" strokeWidth={1.75} />
          {t.badge ? (
            <span className="absolute right-[10%] top-1 min-w-5 rounded-full bg-[#2563eb] px-1.5 text-center text-xs font-semibold leading-5 text-white">
              {t.badge}
            </span>
          ) : null}
        </NavLink>
      ))}
    </nav>
    </>
  );
}
