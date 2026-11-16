// SOP text as people read it. The compiled text the agent runs is full of
// prefixed record ids (taskkind_7c2a0824-…) and Slack markup (<#C0C7R1G0B43|
// channel>, <@U0B9UFQC1U7>). Ids render as short monospace chips with the full
// id on hover (a click copies it); Slack tokens render as #channel and @user.

import { useState, type ReactNode } from "react";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const ID_RE = new RegExp(`^([a-z][a-z0-9]*)_(${UUID})$`);
const CHANNEL_RE = /^<#(C[A-Z0-9]+)(?:\|([^>]+))?>$/;
const USER_RE = /^<@(U[A-Z0-9]+)(?:\|([^>]+))?>$/;

// Special tokens first (so an id or a Slack token is never split), then runs
// of whitespace, words, and single other characters.
const TOKEN_RE = new RegExp(
  `<#C[A-Z0-9]+(?:\\|[^>]+)?>|<@U[A-Z0-9]+(?:\\|[^>]+)?>|[a-z][a-z0-9]*_${UUID}|\\s+|[\\p{L}\\p{N}_'’-]+|[^\\s]`,
  "gu",
);

function tokenize(text: string): string[] {
  return text.match(TOKEN_RE) ?? [];
}

// "taskkind_7c2a0824-…-7fd0a6a3584d" → "taskkind_7c2a…584d"
function shortId(id: string): string {
  const m = id.match(ID_RE);
  return m ? `${m[1]}_${m[2].slice(0, 4)}…${m[2].slice(-4)}` : id;
}

function IdChip({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title={copied ? "Copied" : `${id}\nClick to copy`}
      aria-label={`${id}, copy`}
      onClick={() => {
        void navigator.clipboard?.writeText(id).catch(() => {});
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      }}
      className="inline rounded border border-slate-200 bg-slate-50 px-1 align-baseline font-mono text-[0.82em] whitespace-nowrap text-slate-600 hover:border-brand-300 hover:text-brand-700"
    >
      {copied ? "copied" : shortId(id)}
    </button>
  );
}

function renderToken(token: string, key: number): ReactNode {
  if (ID_RE.test(token)) return <IdChip key={key} id={token} />;
  const channel = token.match(CHANNEL_RE);
  if (channel) {
    return (
      <span key={key} title={`Slack channel ${channel[1]}`} className="whitespace-nowrap rounded bg-brand-50 px-0.5 text-brand-700">
        #{channel[2] ?? channel[1]}
      </span>
    );
  }
  const user = token.match(USER_RE);
  if (user) {
    return (
      <span key={key} title={`Slack user ${user[1]}`} className="whitespace-nowrap rounded bg-brand-50 px-0.5 text-brand-700">
        @{user[2] ?? user[1]}
      </span>
    );
  }
  return token;
}

// One run of text with its ids and Slack tokens rendered.
export function RichText({ text }: { text: string }) {
  return <>{tokenize(text).map(renderToken)}</>;
}
