// The dot at the right of a row in the Stella sidebar, by what the
// conversation needs from you: Stella is waiting on an answer, or she has
// written since you last looked. A conversation that needs nothing has no
// dot. The digest uses the waiting dot for its group count, since every
// group there is waiting on you.
export const SESSION_DOTS = {
  waiting: { color: "#f5a623", label: "Stella needs your response" },
  unread: { color: "var(--color-brand-500)", label: "New activity" },
} as const;

export type SessionDot = keyof typeof SESSION_DOTS;

// The drifting dashed underline under a row says what the conversation is
// doing: a short pulse of the waiting colour while Stella is waiting on you,
// of the accent while she is thinking. The rest of the line is transparent,
// so only the pulse is seen tracing along under the title.
export const WAITING_LINE = "linear-gradient(90deg, transparent 0%, transparent 44%, #f5a623 50%, transparent 56%, transparent 100%)";
export const THINKING_LINE =
  "linear-gradient(90deg, transparent 0%, transparent 44%, var(--color-brand-500) 50%, transparent 56%, transparent 100%)";

// What a conversation row shows for its state, in order of what matters
// most: thinking (the accent tracer, no dot), waiting on you (the waiting
// tracer and dot), new activity since you last looked (the accent dot), or
// nothing.
export function sessionIndicator(s: { busy: boolean; status: string; unread: boolean }): { line: string | null; dot: SessionDot | null } {
  if (s.busy) return { line: THINKING_LINE, dot: null };
  if (s.status === "waiting") return { line: WAITING_LINE, dot: "waiting" };
  if (s.unread) return { line: null, dot: "unread" };
  return { line: null, dot: null };
}
