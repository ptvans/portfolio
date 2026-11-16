// The menu, after Muse's: the current screen slides right and the menu sits
// beneath it on the left. The agent's name heads it; then the tabs, the side
// chats, and a bottom row of settings, search and new message. Typing in
// search swaps the lists for matches across everything the menu reaches.

import { Hand, MessageCircle, MessageSquare, Search, Settings, SquarePen, Target, Workflow, X, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { sops } from "../../../data/sops";
import { goals } from "../../internal-ops/data/goals";
import { useBrickOps } from "../BrickOpsContext";
import { ATTENTION, LEARNED_SOP } from "../data";

interface Row {
  key: string;
  icon: LucideIcon;
  label: string;
  sub?: string;
  badge?: number;
  active?: boolean;
  onClick: () => void;
}

export function Drawer() {
  const { agentName, sideChats, newSideChat, setDrawerOpen, focus } = useBrickOps();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [query, setQuery] = useState("");

  const go = (path: string) => {
    navigate(path);
    setDrawerOpen(false);
    setQuery("");
  };

  const tabs: Row[] = [
    { key: "chat", icon: MessageCircle, label: `Chat with ${agentName}`, path: "/brick-ops" },
    { key: "attention", icon: Hand, label: "Needs Your Attention", path: "/brick-ops/attention" },
    { key: "goals", icon: Target, label: "Goals", path: "/brick-ops/goals" },
    { key: "automations", icon: Workflow, label: "Automations", path: "/brick-ops/automations" },
  ].map(({ path, ...t }) => ({ ...t, active: pathname === path, onClick: () => go(path) }));

  const chats: Row[] = sideChats.map((c) => ({
    key: c.id,
    icon: MessageSquare,
    label: c.title ?? "New chat",
    active: pathname === `/brick-ops/chat/${c.id}`,
    onClick: () => go(`/brick-ops/chat/${c.id}`),
  }));

  const q = query.trim().toLowerCase();
  const results: Row[] = q
    ? [
        ...tabs.filter((t) => t.label.toLowerCase().includes(q)),
        ...chats.filter((c) => c.label.toLowerCase().includes(q)),
        ...ATTENTION.filter((i) => `${i.title} ${i.record?.label ?? ""}`.toLowerCase().includes(q)).map((i) => ({
          key: i.messageId,
          icon: Hand,
          label: i.title,
          sub: "Needs Your Attention",
          onClick: () => {
            focus(i.messageId);
            go("/brick-ops");
          },
        })),
        ...goals
          .filter((g) => g.name.toLowerCase().includes(q))
          .map((g) => ({ key: g.id, icon: Target, label: g.name, sub: "Goal", onClick: () => go("/brick-ops/goals") })),
        ...[LEARNED_SOP.name, ...sops.map((s) => s.name)]
          .filter((name) => name.toLowerCase().includes(q))
          .map((name) => ({ key: name, icon: Workflow, label: name, sub: "Automation", onClick: () => go("/brick-ops/automations") })),
      ]
    : [];

  return (
    <nav className="absolute inset-y-0 left-0 flex w-[82%] flex-col bg-black pb-8 pt-[78px] text-white">
      <h1 className="truncate px-6 text-2xl font-bold tracking-tight">{agentName}</h1>

      <div className="no-scrollbar mt-6 min-h-0 flex-1 overflow-y-auto px-3">
        {q ? (
          results.length ? (
            <List rows={results.slice(0, 30)} />
          ) : (
            <p className="px-3 text-sm text-white/45">Nothing matches “{query.trim()}”.</p>
          )
        ) : (
          <>
            <Label>Tabs</Label>
            <List rows={tabs} />
            <hr className="mx-3 my-5 border-white/12" />
            <Label>Side Chats</Label>
            {chats.length ? (
              <List rows={chats} />
            ) : (
              <p className="px-3 text-sm leading-snug text-white/45">Will appear here if you start one</p>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-3 px-5 pt-4">
        <RoundButton icon={Settings} label="Settings" onClick={() => go("/brick-ops/settings")} />
        <label className="flex h-14 min-w-0 flex-1 items-center gap-2 rounded-full border border-white/15 bg-[#121214] px-4">
          <Search className="h-5 w-5 shrink-0 text-white/45" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="min-w-0 flex-1 bg-transparent text-base text-white placeholder:text-white/45 focus:outline-none"
          />
          {query && (
            <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="text-white/50">
              <X className="h-5 w-5" />
            </button>
          )}
        </label>
        <RoundButton icon={SquarePen} label="New message" onClick={() => go(`/brick-ops/chat/${newSideChat()}`)} />
      </div>
    </nav>
  );
}

function Label({ children }: { children: string }) {
  return <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wide text-white/45">{children}</p>;
}

function List({ rows }: { rows: Row[] }) {
  return (
    <ul className="flex flex-col gap-0.5">
      {rows.map((r) => (
        <li key={r.key}>
          <button
            type="button"
            onClick={r.onClick}
            className={`flex w-full items-center gap-4 rounded-full px-4 py-2.5 text-left transition active:bg-white/10 ${
              r.active ? "bg-[#2a2a2e]" : ""
            }`}
          >
            <r.icon className="h-6 w-6 shrink-0" strokeWidth={1.75} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base">{r.label}</span>
              {r.sub && <span className="block text-xs text-white/45">{r.sub}</span>}
            </span>
            {r.badge ? (
              <span className="shrink-0 rounded-full bg-[#2563eb] px-2 py-0.5 text-sm font-semibold leading-tight">
                {r.badge}
              </span>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}

function RoundButton({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/15 bg-[#121214] transition active:scale-90"
    >
      <Icon className="h-[22px] w-[22px]" strokeWidth={1.75} />
    </button>
  );
}
