export * from "./regions";
export * from "./skills";
export * from "./catalog";
export * from "./brands";
export * from "./network";
export * from "./customers";
export * from "./work";
export * from "./inventory";
export * from "./messages";
export * from "./activity";
export * from "./issues";
export * from "./alerts";
export * from "./roles";
export * from "./projects";
export * from "./sops";
export * from "./sopStates";
export * from "./sopActivity";

import { regions } from "./regions";
import { skills } from "./skills";
import { orderKinds, taskKinds } from "./catalog";
import { brands } from "./brands";
import {
  DEMO_NETWORK_OPERATOR_IDS,
  fieldOperators,
  networkOperators,
  trips,
  vehicles,
  warehouses,
} from "./network";
import { customers } from "./customers";
import { tasks, workOrders } from "./work";
import { deployments, inventoryItems } from "./inventory";
import { messageThreads, messages } from "./messages";
import { liveActivityEvents } from "./activity";
import { issues } from "./issues";
import { projects } from "./projects";
import { sopNodeRuns, sopRuns, sops } from "./sops";
import type { ResolvedTaskItem, Sop, Task } from "../types/domain";

function byId<T extends { id: string }>(items: T[]) {
  const map = new Map(items.map((item) => [item.id, item]));
  return (id: string | null | undefined) => (id ? map.get(id) : undefined);
}

// The NO accounts shown in the role/account switchers, alphabetical by name.
// Derived here rather than in each switcher so the mobile Emulator tab and the
// NO web header stay in step, and so DEMO_NETWORK_OPERATOR_IDS can keep its
// grouped-by-market ordering as documentation.
export const demoNetworkOperators = networkOperators
  .filter((n) => DEMO_NETWORK_OPERATOR_IDS.includes(n.id))
  .sort((a, b) => a.name.localeCompare(b.name));

export const getRegion = byId(regions);

export function regionsForBrand(brandId: string) {
  const brand = brands.find((b) => b.id === brandId);
  if (!brand) return [];
  return brand.regionIds
    .map((id) => getRegion(id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));
}
export const getSkill = byId(skills);
export const getOrderKind = byId(orderKinds);
export const getTaskKind = byId(taskKinds);
export const getBrand = byId(brands);
export const getNetworkOperator = byId(networkOperators);
export const getWarehouse = byId(warehouses);
export const getFieldOperator = byId(fieldOperators);
export const getVehicle = byId(vehicles);
export const getTrip = byId(trips);
export const getCustomer = byId(customers);
export const getWorkOrder = byId(workOrders);
export const getTask = byId(tasks);
export const getInventoryItem = byId(inventoryItems);
export const getDeployment = byId(deployments);
export const getMessageThread = byId(messageThreads);

// Resolves a task's items against their inventory kinds for display. Prefers the
// quantified `items` refs and falls back to bare `assignedInventoryIds` (older
// sample rows carry only ids). Shared by the mobile task detail, the NO task
// page, and the NO dashboard inspection panel so they can't drift.
export function resolveTaskItems(task: Task): ResolvedTaskItem[] {
  const refs =
    task.items && task.items.length > 0
      ? task.items.map((ref) => ({ id: ref.inventoryItemId, quantity: ref.quantity as number | null }))
      : task.assignedInventoryIds.map((id) => ({ id, quantity: null }));
  return refs.map((ref) => {
    const inv = getInventoryItem(ref.id);
    return { ...ref, name: inv?.name ?? "Item", image: inv?.image };
  });
}

export function tasksForNetworkOperator(networkOperatorId: string) {
  return tasks.filter((t) => t.networkOperatorId === networkOperatorId);
}

export function tasksForFieldOperator(fieldOperatorId: string) {
  return tasks.filter((t) => t.fieldOperatorId === fieldOperatorId);
}

export function tasksForBrand(brandId: string) {
  const woIds = new Set(workOrders.filter((wo) => wo.brandId === brandId).map((wo) => wo.id));
  return tasks.filter((t) => woIds.has(t.workOrderId));
}

export function workOrdersForBrand(brandId: string) {
  return workOrders.filter((wo) => wo.brandId === brandId);
}

export function inventoryForBrand(brandId: string) {
  return inventoryItems.filter((i) => i.brandId === brandId);
}

export function issuesForBrand(brandId: string) {
  return issues.filter((i) => i.brandId === brandId);
}

export const getProject = byId(projects);

export function projectsForBrand(brandId: string) {
  return projects.filter((p) => p.brandId === brandId);
}

export function workOrdersForProject(projectId: string) {
  return workOrders.filter((wo) => wo.projectId === projectId);
}

export function deploymentsForBrand(brandId: string) {
  return deployments.filter((d) => d.brandId === brandId);
}

export function messagesForThread(threadId: string) {
  return messages
    .filter((m) => m.threadId === threadId)
    .sort((a, b) => a.sentAt.localeCompare(b.sentAt));
}

export function activityForNetworkOperator(networkOperatorId: string) {
  return liveActivityEvents
    .filter((e) => e.networkOperatorId === networkOperatorId)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

export function activityForBrand(brandId: string) {
  return liveActivityEvents
    .filter((e) => e.brandId === brandId)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

export function allActivity() {
  return [...liveActivityEvents].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

// --- SOPs -------------------------------------------------------------------

export const getSop = byId(sops);

export function sopsForBrand(brandId: string) {
  return sops.filter((s) => s.brandId === brandId);
}

export function runsForSop(sopId: string) {
  return sopRuns.filter((r) => r.sopId === sopId).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

// The most recent execution of a node, across every run of its SOP.
export function latestNodeRun(nodeId: string) {
  return sopNodeRuns
    .filter((r) => r.nodeId === nodeId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
}

export function nodeRunsForRun(sopRunId: string) {
  return sopNodeRuns.filter((r) => r.sopRunId === sopRunId).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

export const getSopRun = byId(sopRuns);

export function nodeRunForRun(sopRunId: string, nodeId: string) {
  return sopNodeRuns.find((r) => r.sopRunId === sopRunId && r.nodeId === nodeId);
}

// The document and nodes of an SOP as they stood at a given version. The
// current version is the SOP itself; older versions come from their snapshot.
export function sopAtVersion(sop: Sop, version: number): { blocks: Sop["blocks"]; nodes: Sop["nodes"] } {
  if (version >= sop.version) return { blocks: sop.blocks, nodes: sop.nodes };
  const v = sop.versions.find((x) => x.version === version);
  return v?.snapshot ?? { blocks: sop.blocks, nodes: sop.nodes };
}
