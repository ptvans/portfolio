import type { LiveActivityEvent } from "../types/domain";

export const liveActivityEvents: LiveActivityEvent[] = [
  { id: "act-1", kind: "task_started", message: "Marcus Lee started delivery task-1 for Harold Jennings.", networkOperatorId: "no-golojix", brandId: "brand-stackmoves", occurredAt: "2026-10-13T09:02:00-07:00" },
  { id: "act-2", kind: "trip_delayed", message: "Trip trip-2 delayed by ~1hr due to Bay Bridge closure.", networkOperatorId: "no-golojix", brandId: "brand-stackmoves", occurredAt: "2026-10-13T10:40:00-07:00" },
  { id: "act-3", kind: "trip_delayed", message: "task-3 delivery rerouting after Bay Bridge closure — ETA delayed.", networkOperatorId: "no-golojix", brandId: "brand-stackmoves", occurredAt: "2026-10-13T10:41:00-07:00" },
  { id: "act-4", kind: "task_started", message: "Ana Delgado started on-site setup task-12 at Nova Hall.", networkOperatorId: "no-lonestar", brandId: "brand-crateco", occurredAt: "2026-10-13T08:03:00-05:00" },
  { id: "act-5", kind: "task_completed", message: "Cole Whitfield completed delivery task-11 at Nova Hall.", networkOperatorId: "no-lonestar", brandId: "brand-crateco", occurredAt: "2026-10-12T08:10:00-05:00" },
  { id: "act-6", kind: "inventory_low", message: "XL Moving Box inventory at Oakland dropped below reorder threshold.", networkOperatorId: "no-golojix", brandId: "brand-stackmoves", occurredAt: "2026-10-13T06:30:00-07:00" },
  { id: "act-7", kind: "inventory_low", message: "Standard Moving Box inventory at Seattle hit zero.", networkOperatorId: "no-raincity", brandId: "brand-stackmoves", occurredAt: "2026-10-12T18:00:00-07:00" },
  { id: "act-8", kind: "deployment_delivered", message: "Deployment dep-4 (Display Rail Kit x20) delivered to Austin warehouse.", networkOperatorId: "no-lonestar", brandId: "brand-crateco", occurredAt: "2026-10-05T10:00:00-05:00" },
  { id: "act-9", kind: "task_completed", message: "Grace Kim's crew confirmed ready for task-9 delivery this afternoon.", networkOperatorId: "no-midwest", brandId: "brand-stackmoves", occurredAt: "2026-10-13T07:15:00-05:00" },
  { id: "act-10", kind: "task_completed", message: "Tyler Brooks completed pickup task-8 for Meredith Tan.", networkOperatorId: "no-golojix", brandId: "brand-stackmoves", occurredAt: "2026-09-28T09:30:00-07:00" },
];
