// Review SOP: the draft the agent wrote from watching the same work done by
// hand, as a bottom sheet over the chat. Turning it on (or not) is answered
// from here and reported back in the chat.

import { Check, Workflow, X } from "lucide-react";
import type { ReactNode } from "react";
import { useBrickOps } from "../BrickOpsContext";
import { LEARNED_SOP } from "../data";
import { PillButton, WELL } from "./ui";

export function SopSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { agentName, suggestion, enableSuggestion, dismissSuggestion } = useBrickOps();

  return (
    <div
      className={`absolute inset-0 z-40 transition-[visibility] duration-300 ${open ? "pointer-events-auto visible" : "pointer-events-none invisible"}`}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Close"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
      />
      <div
        className={`absolute inset-x-0 bottom-0 flex max-h-[90%] flex-col rounded-t-[34px] bg-[#1c1c1f] transition-transform duration-300 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto mt-2.5 h-[5px] w-10 shrink-0 rounded-full bg-white/25" />
        <div className="flex shrink-0 items-start gap-3 px-6 pb-3 pt-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#5b4fe6] to-[#3D38B8]">
            <Workflow className="h-6 w-6 text-white" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-md font-semibold leading-snug text-white">{LEARNED_SOP.name}</h2>
            <p className="text-sm text-white/50">
              Draft SOP · {LEARNED_SOP.brand} · Written by {agentName}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            tabIndex={open ? 0 : -1}
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/70"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-6 pb-4">
          <Section title="When it runs">
            <p className="text-base leading-snug text-white">{LEARNED_SOP.trigger}</p>
          </Section>

          <Section title="What it does">
            <ol className={`${WELL} divide-y divide-white/10`}>
              {LEARNED_SOP.steps.map((step, i) => (
                <li key={step} className="flex gap-3 px-4 py-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
                    {i + 1}
                  </span>
                  <span className="text-base leading-snug text-white">{step}</span>
                </li>
              ))}
            </ol>
          </Section>

          <Section title={`Learned from ${LEARNED_SOP.timesSeen} times you did this`}>
            <ul className={`${WELL} divide-y divide-white/10`}>
              {LEARNED_SOP.learnedFrom.map((r) => (
                <li key={r.when + r.what} className="flex gap-3 px-4 py-3">
                  <span className="w-14 shrink-0 text-sm text-white/50">{r.when}</span>
                  <span className="text-sm leading-snug text-white">{r.what}</span>
                </li>
              ))}
            </ul>
          </Section>

          <p className="mt-4 text-sm leading-snug text-white/45">
            {agentName} notes each hold in Needs Your Attention, so you can flag any that were wrong. Turn it off any
            time.
          </p>
        </div>

        <div className="shrink-0 border-t border-white/10 px-6 pb-9 pt-4">
          {suggestion === "enabled" ? (
            <div className="flex items-center justify-center gap-2 py-3 text-base font-medium text-white">
              <Check className="h-5 w-5 text-[#30d158]" strokeWidth={3} />
              On for every Coco daily deployment
            </div>
          ) : (
            <div className="flex gap-3">
              <PillButton
                onClick={() => {
                  if (suggestion === "open") dismissSuggestion();
                  onClose();
                }}
              >
                Not now
              </PillButton>
              <PillButton
                primary
                onClick={() => {
                  enableSuggestion();
                  onClose();
                }}
              >
                Turn on
              </PillButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5 first:mt-2">
      <h3 className="mb-2 text-sm font-semibold text-white/50">{title}</h3>
      {children}
    </section>
  );
}
