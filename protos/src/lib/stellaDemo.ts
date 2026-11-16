// The scripted Stella chat engine, shared by the mobile app and the Network
// Operator web app. Each surface creates its own store (so the two keep
// separate conversations) and drives it through `useStellaDemo`.
//
// The scripts themselves live in ./stellaScripts. This file only plays them:
// it keeps the conversation, paces Stella's replies, and pauses at a beat that
// waits for the user's text or photo.

import { useEffect, useSyncExternalStore } from "react";
import { STELLA_SCRIPTS, type StellaScript } from "./stellaScripts";

export interface StellaChatMessage {
  id: number;
  from: "stella" | "me";
  text?: string;
  taskId?: string;
  // Status the card showed when Stella sent it; the card is a snapshot, not live.
  taskStatus?: string;
  photo?: string;
}

interface Session {
  noId: string | null; // the account the conversation belongs to
  messages: StellaChatMessage[];
  thinking: boolean;
  active: StellaScript | null; // the script currently playing (or paused)
  title: string | null; // history title, from the first script played
  next: number; // index of the next beat to play
  waiting: "text" | "photo" | null; // what the paused script is waiting for
}

const EMPTY: Omit<Session, "noId"> = {
  messages: [],
  thinking: false,
  active: null,
  title: null,
  next: 0,
  waiting: null,
};

const STUB_REPLY =
  "I'm still learning the ropes here, but soon I'll be able to help with that.";

// Closes `taskId` for the calling surface, with the uploaded photo if any.
export type CompleteFn = (taskId: string, photoUrl: string | null) => void;

export type StellaDemoStore = ReturnType<typeof createStellaDemoStore>;

// A conversation outlives the screen that shows it (navigating away unmounts
// the page), so it lives in a store rather than component state. Reloading the
// prototype resets it.
export function createStellaDemoStore() {
  let session: Session = { noId: null, ...EMPTY };
  let nextId = 1;
  // Bumped on reset so a reply still "thinking" for the old chat is dropped.
  let epoch = 0;
  const listeners = new Set<() => void>();

  const update = (patch: Partial<Session>) => {
    session = { ...session, ...patch };
    listeners.forEach((l) => l());
  };

  const push = (message: Omit<StellaChatMessage, "id">) =>
    update({ messages: [...session.messages, { ...message, id: nextId++ }] });

  // Stella "thinks" for `ms`, then runs `then` (unless the chat was reset).
  const reply = (ms: number, then: () => void) => {
    const mine = epoch;
    update({ thinking: true });
    window.setTimeout(() => {
      if (mine !== epoch) return;
      update({ thinking: false });
      then();
    }, ms);
  };

  // Plays the script's beats from `from`, pausing at the first beat that waits.
  // `onComplete` runs when a `complete` beat is sent (it closes the task);
  // `photo` is the image the user uploaded, if the script collected one.
  const playBeats = (
    script: StellaScript,
    from: number,
    photo: string | null,
    onComplete: CompleteFn,
  ) => {
    if (from >= script.beats.length) return;
    const beat = script.beats[from];
    reply(from === 0 ? 1000 : 900, () => {
      if (beat.complete) onComplete(script.taskId, photo);
      push({
        from: "stella",
        text: beat.text,
        taskId: beat.card ? script.taskId : undefined,
        taskStatus: beat.card,
      });
      if (beat.wait) update({ waiting: beat.wait, next: from + 1 });
      else if (from + 1 >= script.beats.length) update({ active: null, next: 0, waiting: null });
      else {
        update({ next: from + 1 });
        playBeats(script, from + 1, photo, onComplete);
      }
    });
  };

  return {
    subscribe: (l: () => void) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    getSnapshot: () => session,

    // Starts a fresh conversation. Task state is app-wide and is left as it is.
    reset: (noId: string) => {
      epoch++;
      update({ noId, ...EMPTY });
    },

    send(text: string, scripts: StellaScript[], onComplete: CompleteFn) {
      const body = text.trim();
      if (!body || session.thinking) return;
      push({ from: "me", text: body });

      const { active, waiting, next } = session;
      const trigger = active ? null : scripts.find((sc) => sc.match.test(body));
      if (active && waiting === "text") {
        update({ waiting: null });
        playBeats(active, next, null, onComplete);
      } else if (waiting === "photo") {
        reply(800, () =>
          push({ from: "stella", text: "I still need a photo to close this task. Add one and I'll finish up." }),
        );
      } else if (trigger) {
        update({ active: trigger, title: session.title ?? trigger.historyTitle });
        playBeats(trigger, 0, null, onComplete);
      } else {
        reply(900, () => push({ from: "stella", text: STUB_REPLY }));
      }
    },

    sendPhoto(file: File | undefined, onComplete: CompleteFn) {
      const { active, waiting, next, thinking } = session;
      if (!file || !active || waiting !== "photo" || thinking) return;
      const url = URL.createObjectURL(file);
      push({ from: "me", photo: url });
      update({ waiting: null });
      playBeats(active, next, url, onComplete);
    },
  };
}

// Binds a store to the selected account: its scripts, and a reset whenever the
// account changes (the old conversation no longer applies).
export function useStellaDemo(
  store: StellaDemoStore,
  networkOperatorId: string,
  // Closes the task for this surface (each app has its own task actions).
  completeWithPhoto: CompleteFn,
) {
  const session = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const scripts = STELLA_SCRIPTS[networkOperatorId] ?? [];

  useEffect(() => {
    if (store.getSnapshot().noId !== networkOperatorId) store.reset(networkOperatorId);
  }, [store, networkOperatorId]);

  return {
    ...session,
    scripts,
    awaitingPhoto: session.waiting === "photo" && !session.thinking,
    send: (text: string) => store.send(text, scripts, completeWithPhoto),
    sendPhoto: (file: File | undefined) => store.sendPhoto(file, completeWithPhoto),
    newChat: () => store.reset(networkOperatorId),
  };
}
