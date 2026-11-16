// The two cards the agent puts in the chat: the automation it learned, and a
// Needs Your Attention item. Both read their state from the context, so a
// card further up the chat stays current.

import { Check, ChevronDown, ChevronRight, Clock, FileText, Hand, Info, Repeat, Workflow } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { getBrand } from "../../../data";
import { useBrickOps } from "../BrickOpsContext";
import { LEARNED_SOP, attentionById } from "../data";
import { CARD, PillButton, WELL, WellDivider, WellRow } from "./ui";

/** The round mark at a card's top right: the brand, or Brick for Brick-wide. */
export function BrandMark({ brandId, size = 48 }: { brandId: string | null; size?: number }) {
  const brand = brandId ? getBrand(brandId) : undefined;
  const style = { width: size, height: size };
  if (!brand) {
    return <img src="./logo.svg" alt="Brick" style={style} className="shrink-0 rounded-full" />;
  }
  return (
    <span
      style={style}
      className="flex shrink-0 items-center justify-center rounded-full bg-white text-lg font-bold text-[#3D38B8]"
      aria-label={brand.name}
    >
      {brand.name.slice(0, 1)}
    </span>
  );
}

function Resolved({ label, note }: { label: string; note: string }) {
  return (
    <div className="mt-4 flex items-center gap-2.5 rounded-full bg-white/5 px-4 py-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#30d158]">
        <Check className="h-4 w-4 text-black" strokeWidth={3} />
      </span>
      <span className="truncate text-base font-medium text-white">{label}</span>
      <span className="ml-auto shrink-0 text-sm text-white/50">{note}</span>
    </div>
  );
}

export function SuggestionCard({ onReview }: { onReview: () => void }) {
  const { agentName, suggestion, dismissSuggestion, busy } = useBrickOps();
  return (
    <div className={CARD}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-sm font-semibold text-[#6ea8ff]">{agentName} learned an automation</p>
          <h3 className="text-md font-semibold leading-snug text-white">
            Hold Robot deployments when bot counts don't match
          </h3>
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#5b4fe6] to-[#3D38B8]">
          <Workflow className="h-6 w-6 text-white" strokeWidth={2} />
        </span>
      </div>
      <p className="mt-2 text-base leading-snug text-white/55">
        Review the Automation before it runs. Nothing changes until you turn it on.
      </p>

      <div className={`${WELL} mt-4`}>
        <WellRow icon={Repeat} label="Learned from" value={`${LEARNED_SOP.timesSeen} manual holds`} />
        <WellDivider />
        <WellRow icon={Clock} label="Saves you" value={LEARNED_SOP.saves} />
        <WellDivider />
        <WellRow
          icon={FileText}
          onClick={onReview}
          label={
            <span className="block">
              <span className="block truncate">{LEARNED_SOP.name}</span>
              <span className="block text-sm text-white/50">
                Draft Automation · {LEARNED_SOP.steps.length} steps
              </span>
            </span>
          }
          trailing={<ChevronRight className="h-6 w-6 shrink-0 text-white/40" />}
        />
      </div>

      {suggestion === "open" && (
        <div className="mt-4 flex gap-3">
          <PillButton onClick={dismissSuggestion} disabled={busy}>
            Not now
          </PillButton>
          <PillButton primary onClick={onReview}>
            Review Automation
          </PillButton>
        </div>
      )}
      {suggestion === "enabled" && <Resolved label="Turned on" note="Runs on every Robot deployment" />}
      {suggestion === "dismissed" && (
        <div className="mt-4 flex items-center justify-between gap-3 px-1">
          <span className="text-sm text-white/50">Not now · Draft kept</span>
          <button type="button" onClick={onReview} className="text-sm font-semibold text-[#6ea8ff]">
            Review anyway
          </button>
        </div>
      )}
    </div>
  );
}

export function AttentionCard({ messageId, onReply }: { messageId: string; onReply: () => void }) {
  const { settled, act, skip, busy, remaining } = useBrickOps();
  const [showWhy, setShowWhy] = useState(false);
  const item = attentionById(messageId);
  if (!item) return null;
  const done = settled[messageId];
  const [primary, secondary] = item.actions;
  const why = item.sections[0];

  return (
    <div>
      <div className={CARD}>
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-[#6ea8ff]">
              <Hand className="h-4 w-4" strokeWidth={2.25} />
              Needs Your Attention
            </p>
            <h3 className="text-md font-semibold leading-snug text-white">{item.title}</h3>
          </div>
          <BrandMark brandId={item.group.brandId} />
        </div>
        <p className="mt-2 text-base leading-snug text-white/55">{item.ask}</p>

        {/* The record it's about; the agent's reasoning stays one tap away. */}
        <div className={`${WELL} mt-4`}>
          {item.record && (
            <>
              <WellRow
                icon={FileText}
                label={
                  <span className="block">
                    <span className="block truncate">{item.record.label}</span>
                    {item.record.detail && (
                      <span className="block truncate text-sm text-white/50">{item.record.detail}</span>
                    )}
                  </span>
                }
              />
              {why && <WellDivider />}
            </>
          )}
          {why && (
            <WellRow
              icon={Info}
              onClick={() => setShowWhy(!showWhy)}
              label={
                <span className="block">
                  <span className="block">{why.heading}</span>
                  {showWhy && <span className="mt-0.5 block text-sm leading-snug text-white/50">{why.body}</span>}
                </span>
              }
              trailing={
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-white/40 transition-transform ${showWhy ? "rotate-180" : ""}`}
                />
              }
            />
          )}
        </div>

        {done ? (
          <Resolved label={done.label} note="Done" />
        ) : (
          <div className="mt-4 flex gap-3">
            {secondary ? (
              <PillButton onClick={() => act(messageId, secondary)} disabled={busy}>
                {secondary.label}
              </PillButton>
            ) : (
              <PillButton onClick={() => skip(messageId)} disabled={busy}>
                Skip
              </PillButton>
            )}
            {primary ? (
              <PillButton primary onClick={() => act(messageId, primary)} disabled={busy}>
                {primary.label}
              </PillButton>
            ) : (
              <PillButton primary onClick={onReply}>
                Reply
              </PillButton>
            )}
          </div>
        )}
      </div>

      {!done && remaining > 1 && (
        <Link
          to="/brick-ops/attention"
          className="mt-2.5 flex items-center justify-center gap-1 py-1.5 text-base font-medium text-[#6ea8ff]"
        >
          See all {remaining} in Needs Your Attention
          <ChevronRight className="h-5 w-5" />
        </Link>
      )}
    </div>
  );
}
