// Release gating for the prototype.
//
// The prototype currently represents the **Beta** release, so anything not in
// the Beta cut is hidden by default. Each gated piece of UI gets a named flag
// below rather than an inline `if (isBeta)` check, so the Beta scope is
// readable in one place and un-gating a feature is a one-line change.
//
// Usage:
//   import { isFeatureEnabled } from "../../../lib/release";
//   {isFeatureEnabled("mobile.customerFilter") && <CustomerSelect … />}

export type ReleaseStage = "beta" | "full";

/** What the prototype is currently representing. Flip to "full" to preview
 *  everything, including post-Beta features. */
export const RELEASE_STAGE: ReleaseStage = "beta";

/** Features that differ between releases, and the stages each ships in.
 *  A feature absent from this map is always shown — only list gated UI. */
const FEATURES = {
  // My Tasks "Select Customer" dropdown (filters the queue by brand). Out of
  // Beta for every role: Beta operators work a single brand's queue, so the
  // filter has nothing meaningful to switch between.
  "mobile.customerFilter": { beta: false, full: true },

  // Issues / Live Activity / Messages tabs in the mobile bottom bar. Out of
  // Beta, which navigates between My Tasks and the Emulator only. The bar
  // itself is always shown — the Emulator tab is the only way to reach the
  // account / role switchers, so hiding the bar would strand them.
  // Those three screens stay routed, so they remain reachable by URL.
  "mobile.secondaryNavTabs": { beta: false, full: true },

  // The brand + work-order reference line at the foot of each task card in the
  // My Tasks list. Out of Beta: a Beta operator's queue is one brand's work, so
  // the line is the same on every card. The owner chip that shares that row is
  // a separate concern and still shows for managers.
  "mobile.taskCardBrandLine": { beta: false, full: true },
} as const satisfies Record<string, Record<ReleaseStage, boolean>>;

export type FeatureKey = keyof typeof FEATURES;

/** Is this feature part of the current release? */
export function isFeatureEnabled(feature: FeatureKey): boolean {
  return FEATURES[feature][RELEASE_STAGE];
}

/** True when the prototype is standing in for the Beta release. Prefer a named
 *  feature flag over this — reach for it only for copy (badges, labels) that
 *  isn't a specific gated component. */
export const isBeta = RELEASE_STAGE === "beta";

/** NO accounts that are live on the Beta release. Surfaced as a "(Beta)" label
 *  beside the account name in the account switchers (mobile Emulator tab and
 *  the NO web header). Presentation only — it does not gate anything, and the
 *  operators' `name` stays the real business name for every other surface. */
export const BETA_NETWORK_OPERATOR_IDS: readonly string[] = [
  "no-onehourmaids", // Anthony Ramirez — Chicago
  "no-tera", // Enrique Saavedra — Houston
  "no-elitephx", // Sarah Maldonado — Phoenix
];

export function isBetaAccount(networkOperatorId: string): boolean {
  return BETA_NETWORK_OPERATOR_IDS.includes(networkOperatorId);
}
