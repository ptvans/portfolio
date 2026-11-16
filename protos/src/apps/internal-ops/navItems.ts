import { Briefcase, Package, Settings2, Zap } from "lucide-react";
import { StellaIcon } from "./components/stella/StellaIcon";
import type { NavItem } from "../../components/layout/AppShell";

// The header nav shows Stella — the home — with her orb, and everything else
// as a word. A section with sub-pages opens a dropdown of them. The icons
// stay on the items for the sidebar layout's collapsed rail.
//
// Order: Stella, then what she raises for you (Automation), then the day's
// work, the stock and fleets it moves, and last the setup of who Brick works
// with.
export const internalOpsNavItems: NavItem[] = [
  { label: "Stella", to: "/internal-ops", icon: StellaIcon, end: true },
  // What Stella runs on its own. The menu lists Needs Your Attention (the
  // messages her automations raised, at /sops); Automations Setup — the SOPs
  // (step-by-step documents and, as SOPs of type Alert, prompts she keeps
  // evaluating) and Goals (targets she tracks) — is reached from that page,
  // so it isn't listed, but the group stays lit on its pages.
  {
    label: "Automation",
    to: "/internal-ops/sops",
    icon: Zap,
    show: "label",
    children: [{ label: "Needs Your Attention", to: "/internal-ops/sops", end: true }],
    match: ["/internal-ops/sops/", "/internal-ops/alerts", "/internal-ops/goals"],
  },
  // The day's work: Messages (alerts, SOP messages and brand / NO threads in
  // one place), Projects and All Tasks. The project list is reached from the
  // Projects page, so it isn't listed here.
  {
    label: "Work",
    to: "/internal-ops/messages",
    icon: Briefcase,
    show: "label",
    children: [
      { label: "Messages", to: "/internal-ops/messages" },
      { label: "Projects", to: "/internal-ops/projects" },
      { label: "All Tasks", to: "/internal-ops/tasks" },
    ],
  },
  // Stock across every brand and warehouse, and the tracked fleets (vehicles
  // and robots) every network operator runs.
  {
    label: "Inventory",
    to: "/internal-ops/inventory",
    icon: Package,
    show: "label",
    children: [
      { label: "Inventory", to: "/internal-ops/inventory" },
      { label: "Assets", to: "/internal-ops/assets" },
    ],
  },
  // Who Brick works with: the brands it runs jobs for and the network
  // operators who do the work.
  {
    label: "Setup",
    to: "/internal-ops/brands",
    icon: Settings2,
    show: "label",
    children: [
      { label: "Brands", to: "/internal-ops/brands" },
      { label: "Network Operators", to: "/internal-ops/network-operators" },
    ],
  },
];
