// Needs Your Attention: every open request, in the agent's groups and ranking.
// Tapping a row takes it back to the chat as a card; a group whose items all
// take the same response (the summary groups) can be answered in one press.

import { Check, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { WORK_GROUPS } from "../../internal-ops/data/myWork";
import { useBrickOps } from "../BrickOpsContext";
import { BrandMark } from "../components/ChatCards";
import { PageHeader } from "../components/PageHeader";
import { CARD, PillButton } from "../components/ui";
import { ATTENTION, groupTitle } from "../data";

export function Attention() {
  const { settled, remaining, focus, actAll, busy } = useBrickOps();
  const navigate = useNavigate();

  const open = (messageId: string) => {
    focus(messageId);
    navigate("/brick-ops");
  };

  return (
    <div className="relative h-full overflow-clip bg-black text-white">
      <div className="no-scrollbar h-full overflow-y-auto px-4 pb-[120px] pt-[128px]">
        <div className="flex flex-col gap-6">
          {WORK_GROUPS.map((group) => {
            const items = ATTENTION.filter((i) => i.group.id === group.id);
            const open_ = items.filter((i) => !settled[i.messageId]);
            return (
              <section key={group.id}>
                <div className="mb-2 flex items-center gap-2.5 px-1">
                  <BrandMark brandId={group.brandId} size={26} />
                  <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-white/60">{groupTitle(group)}</h2>
                  <span className="text-sm text-white/40">{open_.length || <Check className="h-4 w-4 text-[#30d158]" />}</span>
                </div>
                <div className={`${CARD} !p-0 overflow-hidden`}>
                  {group.summary && open_.length > 1 && (
                    <div className="border-b border-white/10 p-4">
                      <p className="text-base leading-snug text-white/70">{group.summary.text}</p>
                      <div className="mt-3 flex">
                        <PillButton primary disabled={busy} onClick={() => actAll(group.id)}>
                          {open_[0].actions[0].label} all {open_.length}
                        </PillButton>
                      </div>
                    </div>
                  )}
                  <ul className="divide-y divide-white/10">
                    {items.map((item) => {
                      const done = settled[item.messageId];
                      return (
                        <li key={item.messageId}>
                          <button
                            type="button"
                            onClick={() => open(item.messageId)}
                            className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition active:bg-white/5"
                          >
                            <span className="min-w-0 flex-1">
                              <span className={`block text-base leading-snug ${done ? "text-white/40" : "text-white"}`}>
                                {item.title}
                              </span>
                              <span className="mt-0.5 block truncate text-sm text-white/45">
                                {done ? `${done.label} · Done` : (item.record?.label ?? item.ask)}
                              </span>
                            </span>
                            {done ? (
                              <Check className="h-5 w-5 shrink-0 text-[#30d158]" strokeWidth={3} />
                            ) : (
                              <ChevronRight className="h-5 w-5 shrink-0 text-white/30" />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <PageHeader title="Needs Your Attention" subtitle={remaining > 0 ? `${remaining} open` : "All caught up"} />
    </div>
  );
}
