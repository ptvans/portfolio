import type { ID } from "../types/domain";

// The three user types that operate inside a Network Operator account. Each
// carries a permission profile that governs which tasks the user can see and
// which actions they can take. This is the single source of truth used by both
// the mobile (field) app and the Network Operator web UX.
export type NoRole = "manager" | "assistant_manager" | "field_operator";

export interface RolePermissions {
  // Which tasks the user can see within their Network Operator account.
  // "all" = every task for the account; "own" = only tasks assigned to them.
  taskVisibility: "all" | "own";
  // Assign an unassigned task to a field operator.
  canAssignTasks: boolean;
  // Change the field operator on an already-assigned task.
  canReassignTasks: boolean;
  // Move a task into "in progress".
  canStartTasks: boolean;
  // Close a task out as complete.
  canCompleteTasks: boolean;
  // Cancel a task.
  canCancelTasks: boolean;
  // Access the team roster / crew management.
  canManageTeam: boolean;
  // Access the Issues dashboard and act on issues (review / approve / route).
  canReviewIssues: boolean;
  // See the account-wide Live Activity feed. Field operators only see their own
  // work, so the feed is limited to managers / assistant managers.
  canViewActivity: boolean;
}

export interface NoRoleDef {
  id: NoRole;
  label: string;
  description: string;
  permissions: RolePermissions;
}

export const NO_ROLES: NoRoleDef[] = [
  {
    id: "manager",
    label: "Manager",
    description: "Full access across the account",
    permissions: {
      taskVisibility: "all",
      canAssignTasks: true,
      canReassignTasks: true,
      canStartTasks: true,
      canCompleteTasks: true,
      canCancelTasks: true,
      canManageTeam: true,
      canReviewIssues: true,
      canViewActivity: true,
    },
  },
  {
    id: "assistant_manager",
    label: "Assistant Manager",
    description: "Similar to Manager",
    permissions: {
      taskVisibility: "all",
      canAssignTasks: true,
      canReassignTasks: false,
      canStartTasks: true,
      canCompleteTasks: false,
      canCancelTasks: true,
      canManageTeam: true,
      canReviewIssues: true,
      canViewActivity: true,
    },
  },
  {
    id: "field_operator",
    label: "Field Operator",
    description: "Sees only their own assigned tasks",
    permissions: {
      taskVisibility: "own",
      canAssignTasks: false,
      canReassignTasks: false,
      canStartTasks: true,
      canCompleteTasks: true,
      canCancelTasks: false,
      canManageTeam: false,
      canReviewIssues: false,
      canViewActivity: false,
    },
  },
];

const ROLE_MAP = new Map<NoRole, NoRoleDef>(NO_ROLES.map((r) => [r.id, r]));

export function getRoleDef(role: NoRole): NoRoleDef {
  return ROLE_MAP.get(role) ?? NO_ROLES[0];
}

export function getRolePermissions(role: NoRole): RolePermissions {
  return getRoleDef(role).permissions;
}

export const DEFAULT_ROLE: NoRole = "manager";

// Returns the tasks a role in a given account is allowed to see.
export function scopeTasksForRole<T extends { networkOperatorId: ID | null; fieldOperatorId: ID | null }>(
  tasks: T[],
  role: NoRole,
  networkOperatorId: ID,
  actingFieldOperatorId: ID | null,
): T[] {
  const inAccount = tasks.filter((t) => t.networkOperatorId === networkOperatorId);
  if (getRolePermissions(role).taskVisibility === "own") {
    return inAccount.filter((t) => t.fieldOperatorId === actingFieldOperatorId);
  }
  return inAccount;
}
