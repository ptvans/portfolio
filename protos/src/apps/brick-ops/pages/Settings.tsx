// Settings, from the menu's gear: the agent's look and name. Picking a look
// also gives the agent that look's name (Forky for the forklift); the name
// can be edited any time after. Both are used everywhere in Brick Ops (menu
// heading, chat header, tabs, cards).

import { Check, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBrickOps } from "../BrickOpsContext";
import { PageHeader } from "../components/PageHeader";
import { AvatarImage, CARD, PillButton } from "../components/ui";
import { AGENT_AVATARS } from "../data";

export function Settings() {
  const { agentName, renameAgent, agentAvatar, chooseAvatar, reset } = useBrickOps();
  const [draft, setDraft] = useState(agentName);
  const [saved, setSaved] = useState(false);
  const navigate = useNavigate();
  const changed = draft.trim() !== agentName && draft.trim() !== "";

  const save = () => {
    if (!changed) return;
    renameAgent(draft);
    setSaved(true);
  };

  return (
    <div className="relative h-full overflow-clip bg-black text-white">
      <div className="no-scrollbar h-full overflow-y-auto px-4 pb-12 pt-[128px]">
        <section className={CARD}>
          <h2 className="text-sm font-semibold text-white/60">Avatar</h2>
          <div className="mt-3 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Avatar">
            {AGENT_AVATARS.map((a) => {
              const on = a.id === agentAvatar.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => {
                    if (on) return;
                    chooseAvatar(a.id);
                    setDraft(a.name);
                    setSaved(false);
                  }}
                  className={`relative flex flex-col items-center gap-2 rounded-[22px] border px-3 pb-3 pt-4 transition ${
                    on ? "border-[#6ea8ff] bg-[#6ea8ff]/10" : "border-white/10 bg-[#0d0d0f] active:bg-white/5"
                  }`}
                >
                  <AvatarImage avatar={a} className="h-20 w-20" />
                  <span className="text-base font-medium">{a.name}</span>
                  {on && (
                    <span className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#6ea8ff]">
                      <Check className="h-4 w-4 text-black" strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <label className="mt-5 block text-sm font-semibold text-white/60" htmlFor="agent-name">
            Name
          </label>
          <input
            id="agent-name"
            value={draft}
            maxLength={24}
            onChange={(e) => {
              setDraft(e.target.value);
              setSaved(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && save()}
            className="mt-2 h-[52px] w-full rounded-[18px] border border-white/15 bg-[#0d0d0f] px-4 text-lg text-white focus:border-[#6ea8ff] focus:outline-none"
          />
          <p className="mt-2 text-sm leading-snug text-white/45">
            What you call your agent across Build Ops. Picking an avatar sets its name; change it any time.
          </p>
          <div className="mt-4 flex">
            <PillButton primary disabled={!changed} onClick={save}>
              {saved ? (
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-5 w-5" strokeWidth={3} /> Saved
                </span>
              ) : (
                "Save name"
              )}
            </PillButton>
          </div>
        </section>

        <button
          type="button"
          onClick={() => {
            reset();
            navigate("/brick-ops");
          }}
          className={`${CARD} mt-4 flex w-full items-center gap-3 text-left text-base`}
        >
          <RotateCcw className="h-5 w-5 text-white/60" />
          Restart demo
        </button>
      </div>
      <PageHeader title="Settings" />
    </div>
  );
}
