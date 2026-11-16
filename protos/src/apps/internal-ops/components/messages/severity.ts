// The order of severities, most serious first, and what a set of them comes
// to. Used to colour a group's raised hand and to list groups most severe
// first.

import type { MessageSeverity } from "../../context/MessagesContext";

const SEVERITY_ORDER: MessageSeverity[] = ["critical", "high", "medium", "normal", "low"];

// The most serious of a set of severities, or undefined for none.
export function topSeverity(severities: (MessageSeverity | undefined)[]): MessageSeverity | undefined {
  return SEVERITY_ORDER.find((s) => severities.includes(s));
}

// A severity's place in that order, for sorting most serious first; none
// sorts last.
export function severityRank(severity: MessageSeverity | undefined): number {
  return severity ? SEVERITY_ORDER.indexOf(severity) : SEVERITY_ORDER.length;
}
