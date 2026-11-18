// Goals Sol tracks for the Internal Ops prototype: a target on an ops
// metric, per brand or Brick-wide, that she checks in on (the "Goal" messages
// in the inbox come from these). Seed data; the Goals page reads it.

export type GoalStatus = "on_track" | "at_risk" | "behind" | "achieved";

export interface Goal {
  id: string;
  name: string;
  // The metric and the target, as Sol states them.
  metric: string;
  target: string;
  current: string;
  status: GoalStatus;
  brandId: string | null; // null = Brick-wide
  ownerName: string;
  period: string;
  // How often Sol checks in.
  cadence: string;
  updatedAt: string;
}

export const goals: Goal[] = [
  {
    id: "goal-chewy-receiving",
    name: "Chewy on-time receiving",
    metric: "Inbound parcels received on the scheduled day",
    target: "95%",
    current: "86%",
    status: "behind",
    brandId: "brand-chewy",
    ownerName: "Matthew R.",
    period: "Q3 2026",
    cadence: "Every day at 8:00 AM",
    updatedAt: "2026-10-28T08:30:00-07:00",
  },
  {
    id: "goal-promobile-loadin",
    name: "Promobile on-time load-in",
    metric: "Tour stops loaded in by the call time",
    target: "97%",
    current: "100%",
    status: "achieved",
    brandId: "brand-promobile",
    ownerName: "Thom V.",
    period: "October 2026",
    cadence: "After every tour stop",
    updatedAt: "2026-10-27T17:00:00-07:00",
  },
  {
    id: "goal-figs-fill-rate",
    name: "FIGS popup fill rate",
    metric: "Shifts staffed 48 hours before the start",
    target: "98%",
    current: "96%",
    status: "at_risk",
    brandId: "brand-figs",
    ownerName: "Matthew R.",
    period: "Q4 2026",
    cadence: "Every day at 6:00 PM",
    updatedAt: "2026-10-26T18:00:00-07:00",
  },
  {
    id: "goal-no-response",
    name: "Network operator response time",
    metric: "Median time for a network operator to accept a shift request",
    target: "Under 4 hours",
    current: "3h 10m",
    status: "on_track",
    brandId: null,
    ownerName: "Thom V.",
    period: "Q4 2026",
    cadence: "Every Monday at 8:00 AM",
    updatedAt: "2026-10-27T08:00:00-07:00",
  },
  {
    id: "goal-inventory-variance",
    name: "Inventory count variance",
    metric: "Units off between the weekly count and the system of record",
    target: "Under 0.5%",
    current: "0.4%",
    status: "on_track",
    brandId: null,
    ownerName: "Matthew R.",
    period: "Q4 2026",
    cadence: "Every Monday at 8:00 AM",
    updatedAt: "2026-10-27T08:00:00-07:00",
  },
  {
    id: "goal-basepower-install",
    name: "Base Power install completion",
    metric: "Scheduled installs completed in the first visit",
    target: "90%",
    current: "81%",
    status: "behind",
    brandId: "brand-basepower",
    ownerName: "Thom V.",
    period: "Q4 2026",
    cadence: "Every day at 8:00 AM",
    updatedAt: "2026-10-28T08:00:00-07:00",
  },
];
