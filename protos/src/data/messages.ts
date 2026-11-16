import type { Message, MessageThread } from "../types/domain";

export const messageThreads: MessageThread[] = [
  {
    id: "thread-1",
    subject: "Bridge closure delaying task-3 delivery",
    participants: ["network_operator", "internal_ops"],
    brandId: null,
    networkOperatorId: "no-golojix",
    relatedTaskId: "task-3",
    lastMessageAt: "2026-10-13T10:45:00-07:00",
    unread: true,
  },
  {
    id: "thread-2",
    subject: "Low stock on XL boxes — Oakland",
    participants: ["brand", "internal_ops"],
    brandId: "brand-stackmoves",
    networkOperatorId: null,
    relatedTaskId: null,
    lastMessageAt: "2026-10-13T08:15:00-07:00",
    unread: true,
  },
  {
    id: "thread-3",
    subject: "Need updated venue access instructions",
    participants: ["network_operator", "brand", "internal_ops"],
    brandId: "brand-crateco",
    networkOperatorId: "no-lonestar",
    relatedTaskId: "task-12",
    lastMessageAt: "2026-10-13T07:50:00-05:00",
    unread: false,
  },
  {
    id: "thread-4",
    subject: "Rain City onboarding — go-live checklist",
    participants: ["network_operator", "internal_ops"],
    brandId: null,
    networkOperatorId: "no-raincity",
    relatedTaskId: null,
    lastMessageAt: "2026-10-12T16:00:00-07:00",
    unread: false,
  },
  {
    id: "thread-5",
    subject: "Question about Extended Rental audit step",
    participants: ["brand", "internal_ops"],
    brandId: "brand-stackmoves",
    networkOperatorId: null,
    relatedTaskId: "task-5",
    lastMessageAt: "2026-10-11T15:30:00-07:00",
    unread: false,
  },
];

export const messages: Message[] = [
  { id: "msg-1", threadId: "thread-1", author: "Priya Anand", authorRole: "network_operator", body: "Heads up — Bay Bridge is closed for an incident, task-3 delivery to SF is going to run about an hour late.", sentAt: "2026-10-13T10:40:00-07:00" },
  { id: "msg-2", threadId: "thread-1", author: "Internal Ops", authorRole: "internal_ops", body: "Got it, I'll flag the customer proactively. Let us know once you're rolling again.", sentAt: "2026-10-13T10:45:00-07:00" },

  { id: "msg-3", threadId: "thread-2", author: "Stack Ops", authorRole: "brand", body: "We're seeing XL boxes dip below threshold in Oakland — can we get eyes on a restock?", sentAt: "2026-10-13T08:10:00-07:00" },
  { id: "msg-4", threadId: "thread-2", author: "Internal Ops", authorRole: "internal_ops", body: "Deployment dep-1 is already in transit with 150 units, ETA October 15.", sentAt: "2026-10-13T08:15:00-07:00" },

  { id: "msg-5", threadId: "thread-3", author: "Marisol Reyes", authorRole: "network_operator", body: "Our crew is on-site at Nova Hall but the loading dock code from the venue doesn't match what's on the task.", sentAt: "2026-10-13T07:40:00-05:00" },
  { id: "msg-6", threadId: "thread-3", author: "CrateCo Ops", authorRole: "brand", body: "Sorry about that — new code is 4471#, venue changed it yesterday.", sentAt: "2026-10-13T07:47:00-05:00" },
  { id: "msg-7", threadId: "thread-3", author: "Internal Ops", authorRole: "internal_ops", body: "Updating the task notes now so it's on record for the crew.", sentAt: "2026-10-13T07:50:00-05:00" },

  { id: "msg-8", threadId: "thread-4", author: "Sam Okafor", authorRole: "network_operator", body: "Vehicles and warehouse are staffed, just waiting on our first inventory transfer to go live.", sentAt: "2026-10-12T15:50:00-07:00" },
  { id: "msg-9", threadId: "thread-4", author: "Internal Ops", authorRole: "internal_ops", body: "dep-3 covers that — 300 units ETA October 21, then you're clear to go live.", sentAt: "2026-10-12T16:00:00-07:00" },

  { id: "msg-10", threadId: "thread-5", author: "Stack Ops", authorRole: "brand", body: "Can the mid-rental audit be done without the customer present?", sentAt: "2026-10-11T15:20:00-07:00" },
  { id: "msg-11", threadId: "thread-5", author: "Internal Ops", authorRole: "internal_ops", body: "Yes, it's a warehouse-side count against assigned inventory — no customer needed.", sentAt: "2026-10-11T15:30:00-07:00" },
];
