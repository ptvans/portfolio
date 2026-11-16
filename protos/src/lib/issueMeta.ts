import { Boxes, ClipboardCheck, GitPullRequestArrow, MessageCircleQuestion } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { IssueType } from "../types/domain";

export interface IssueTypeMeta {
  label: string;
  icon: LucideIcon;
  // Whether an "Approve" action applies to this issue type.
  approvable: boolean;
  // Whether this type can be routed to the Brand.
  routableToBrand: boolean;
}

export const ISSUE_TYPE_META: Record<IssueType, IssueTypeMeta> = {
  task_review: { label: "Task for Review", icon: ClipboardCheck, approvable: true, routableToBrand: false },
  inventory_id: { label: "Inventory ID", icon: Boxes, approvable: true, routableToBrand: true },
  scope_escalation: { label: "Change Order", icon: GitPullRequestArrow, approvable: true, routableToBrand: true },
  task_request: { label: "Task Request", icon: MessageCircleQuestion, approvable: false, routableToBrand: false },
};

// Filter tabs shown on the Issues dashboard. Values map to issue types (or "all").
export const ISSUE_FILTERS: { label: string; value: IssueType | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Completed Tasks", value: "task_review" },
  { label: "Messages", value: "task_request" },
  { label: "Inventory", value: "inventory_id" },
  { label: "Change Order", value: "scope_escalation" },
];
