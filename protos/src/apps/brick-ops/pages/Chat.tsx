// Brick Ops home: a chat with the agent, after Meta's Muse. The avatar and
// name pill sit at the top centre over the conversation, the menu at the
// left and a "more" button at the right. The agent's messages are charcoal
// bubbles; cards it puts in the chat carry their own actions. The composer
// floats above the tab bar.
//
// The same screen draws a side chat (`chatId`): a blank conversation kept
// apart from the main thread, with no cards and no tab bar beneath it.

import { ArrowUp, Check, LayoutGrid, Loader2, Menu, Mic, MoreHorizontal, Plus, RotateCcw } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { INITIAL_COUNT, useBrickOps, type Entry } from "../BrickOpsContext";
import { AttentionCard, SuggestionCard } from "../components/ChatCards";
import { SopSheet } from "../components/SopSheet";
import { AvatarImage, CircleButton, TOP_FADE } from "../components/ui";

export function Chat({ chatId }: { chatId?: string }) {
  const { agentName, agentAvatar, entries: mainEntries, sideChats, busy, send, reset, setDrawerOpen } = useBrickOps();
  const side = chatId ? sideChats.find((c) => c.id === chatId) : undefined;
  const entries = side ? side.entries : mainEntries;
  const [draft, setDraft] = useState("");
  const [sopOpen, setSopOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const seen = useRef(entries.length);

  // Coming back to a chat that has moved on (an item opened from the list,
  // a side chat with history), land on its latest entry.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && entries.length > (chatId ? 1 : INITIAL_COUNT)) el.scrollTop = el.scrollHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow the conversation as it grows, but open at the top so the first
  // thing seen is the agent's opening, not the end of the chat.
  useEffect(() => {
    if (entries.length > seen.current) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
    seen.current = entries.length;
  }, [entries]);

  if (chatId && !side) return <Navigate to="/brick-ops" replace />;

  const submit = () => {
    if (!draft.trim() || busy) return;
    send(draft, chatId);
    setDraft("");
  };

  // The main chat sits over the tab bar; a side chat has none.
  const overTabBar = !chatId;

  return (
    <div className="relative h-full overflow-clip bg-black text-white">
      <div
        ref={scrollRef}
        className={`no-scrollbar h-full overflow-y-auto px-4 pt-[180px] ${overTabBar ? "pb-[210px]" : "pb-32"}`}
      >
        <div className="flex flex-col gap-3">
          {entries.map((e) => (
            <EntryView key={e.id} entry={e} onReview={() => setSopOpen(true)} onReply={() => inputRef.current?.focus()} />
          ))}
        </div>
      </div>

      {/* Header: floats over the chat, which fades out beneath it. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[205px]" style={{ background: TOP_FADE(140, 205) }} />
      <header className="absolute inset-x-0 top-0 z-30 flex items-start justify-between px-4 pt-[62px]">
        <CircleButton icon={Menu} label="Menu" onClick={() => setDrawerOpen(true)} />
        {/* Centred on the screen, whatever the widths either side. */}
        <div className="absolute left-1/2 top-[54px] flex -translate-x-1/2 flex-col items-center">
          <AvatarImage avatar={agentAvatar} className="h-[80px] w-[80px] ring-2 ring-black" />
          <span className="relative -mt-3 rounded-full border border-white/10 bg-[#1c1c1f]/90 px-5 py-1.5 text-md font-semibold leading-tight shadow-[0_8px_20px_-8px_rgb(0_0_0/0.7)] backdrop-blur-xl">
            {agentName}
          </span>
        </div>
        <CircleButton icon={MoreHorizontal} label="More" onClick={() => setMoreOpen(!moreOpen)} />
      </header>

      {moreOpen && (
        <>
          <button type="button" aria-label="Close menu" onClick={() => setMoreOpen(false)} className="absolute inset-0 z-30" />
          <div className="absolute right-4 top-[118px] z-40 w-[230px] overflow-hidden rounded-[22px] bg-[#2a2a2e]/95 py-1.5 shadow-[0_18px_40px_-10px_rgb(0_0_0/0.8)] backdrop-blur-xl">
            <button
              type="button"
              onClick={() => {
                reset();
                setMoreOpen(false);
                scrollRef.current?.scrollTo({ top: 0 });
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-base text-white transition active:bg-white/10"
            >
              <RotateCcw className="h-5 w-5 text-white/70" />
              Restart demo
            </button>
            <a href="../" className="flex items-center gap-3 px-4 py-3 text-base text-white transition active:bg-white/10">
              <LayoutGrid className="h-5 w-5 text-white/70" />
              Back to portfolio
            </a>
          </div>
        </>
      )}

      {/* Content passing under the composer (and tab bar) fades out. */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10"
        style={{
          height: overTabBar ? 200 : 120,
          background: "linear-gradient(to top, #000 0, #000 55%, rgb(0 0 0 / 0) 100%)",
        }}
      />

      {/* Composer */}
      <div
        className={`absolute inset-x-0 z-20 px-4 pt-6 ${overTabBar ? "bottom-[104px]" : "bottom-0 pb-8"}`}
      >
        <div className="flex h-[56px] items-center gap-2 rounded-full border border-white/15 bg-black/70 pl-3 pr-2 backdrop-blur-xl">
          <button type="button" aria-label="Attach" className="flex h-10 w-10 shrink-0 items-center justify-center text-white/85">
            <Plus className="h-6 w-6" strokeWidth={1.75} />
          </button>
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Message"
            className="min-w-0 flex-1 bg-transparent text-lg text-white placeholder:text-white/40 focus:outline-none"
          />
          {draft.trim() ? (
            <button
              type="button"
              aria-label="Send"
              onClick={submit}
              disabled={busy}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-r from-[#2563eb] to-[#5b4fe6] text-white disabled:opacity-50"
            >
              <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
            </button>
          ) : (
            <button type="button" aria-label="Voice" className="flex h-10 w-10 shrink-0 items-center justify-center text-white/85">
              <Mic className="h-6 w-6" strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>

      <SopSheet open={sopOpen} onClose={() => setSopOpen(false)} />
    </div>
  );
}

function EntryView({ entry, onReview, onReply }: { entry: Entry; onReview: () => void; onReply: () => void }) {
  switch (entry.kind) {
    case "day":
      return <p className="py-1 text-center text-sm text-white/40">{entry.text}</p>;
    case "stella":
      return <Bubble>{entry.text}</Bubble>;
    case "user":
      return (
        <p className="ml-auto max-w-[80%] rounded-[24px] bg-[#3D38B8] px-4 py-2.5 text-lg leading-snug text-white">
          {entry.text}
        </p>
      );
    case "status":
      return (
        <p className="flex items-center gap-2 px-2 text-sm text-white/50">
          {entry.done ? <Check className="h-4 w-4 text-[#30d158]" strokeWidth={3} /> : <Loader2 className="h-4 w-4 animate-spin" />}
          {entry.text}
          {!entry.done && "…"}
        </p>
      );
    case "suggestion":
      return <SuggestionCard onReview={onReview} />;
    case "attention":
      return <AttentionCard messageId={entry.messageId} onReply={onReply} />;
  }
}

/** The agent's message: a charcoal bubble, as in Muse. */
function Bubble({ children }: { children: ReactNode }) {
  return (
    <p className="mr-auto max-w-[92%] rounded-[28px] bg-[#1c1c1f] px-4 py-3 text-base leading-snug text-white">{children}</p>
  );
}
