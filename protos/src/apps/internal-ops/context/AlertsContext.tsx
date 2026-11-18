import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { alerts as seedAlerts, alertRules as seedRules } from "../../../data";
import { MOCK_NOW_ISO } from "../../../lib/format";
import type { Alert, AlertRule, AlertRuleStatus } from "../../../types/domain";

// In-memory store for the Alerts section: rules can be created, edited and
// switched on/off, and alerts dismissed (and un-dismissed) for the session.

// Who "you" are in the prototype when dismissing or authoring.
export const CURRENT_USER_NAME = "Thom V.";

export type RuleDraft = Pick<AlertRule, "brandId" | "name" | "prompt" | "severity" | "schedule">;

interface AlertsState {
  rules: AlertRule[];
  alerts: Alert[];
  getRule: (id: string | undefined) => AlertRule | undefined;
  alertsForRule: (ruleId: string) => Alert[];
  activeCountForRule: (ruleId: string) => number;
  // Both accept one id or several (bulk dismiss from the Alerts list).
  dismiss: (alertIds: string | string[]) => void;
  undoDismiss: (alertIds: string | string[]) => void;
  // Settled by acting on it (a response picked in Sol), not dismissed.
  resolve: (alertId: string) => void;
  // Takes a resolve back (an undo in Sol): the alert is active again.
  reopen: (alertId: string) => void;
  createRule: (draft: RuleDraft, status: AlertRuleStatus) => string;
  updateRule: (id: string, draft: RuleDraft, status?: AlertRuleStatus) => void;
  setRuleStatus: (id: string, status: AlertRuleStatus) => void;
}

const AlertsContext = createContext<AlertsState | null>(null);

export function AlertsProvider({ children }: { children: ReactNode }) {
  const [rules, setRules] = useState<AlertRule[]>(seedRules);
  const [alerts, setAlerts] = useState<Alert[]>(seedAlerts);

  const dismiss = useCallback((alertIds: string | string[]) => {
    const ids = new Set(typeof alertIds === "string" ? [alertIds] : alertIds);
    setAlerts((prev) =>
      prev.map((a) =>
        ids.has(a.id)
          ? { ...a, status: "dismissed", dismissedAt: MOCK_NOW_ISO, dismissedByName: CURRENT_USER_NAME }
          : a,
      ),
    );
  }, []);

  const undoDismiss = useCallback((alertIds: string | string[]) => {
    const ids = new Set(typeof alertIds === "string" ? [alertIds] : alertIds);
    setAlerts((prev) =>
      prev.map((a) =>
        ids.has(a.id) ? { ...a, status: "active", dismissedAt: null, dismissedByName: null } : a,
      ),
    );
  }, []);

  const resolve = useCallback((alertId: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, status: "resolved", resolvedAt: MOCK_NOW_ISO } : a)));
  }, []);

  const reopen = useCallback((alertId: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, status: "active", resolvedAt: null } : a)));
  }, []);

  const createRule = useCallback((draft: RuleDraft, status: AlertRuleStatus) => {
    const id = `rule-new-${Date.now().toString(36)}`;
    setRules((prev) => [
      ...prev,
      {
        ...draft,
        id,
        status,
        ownerName: CURRENT_USER_NAME,
        createdAt: MOCK_NOW_ISO,
        updatedAt: MOCK_NOW_ISO,
        lastTriggeredAt: null,
      },
    ]);
    return id;
  }, []);

  const updateRule = useCallback((id: string, draft: RuleDraft, status?: AlertRuleStatus) => {
    setRules((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, ...draft, status: status ?? r.status, updatedAt: MOCK_NOW_ISO } : r,
      ),
    );
  }, []);

  const setRuleStatus = useCallback((id: string, status: AlertRuleStatus) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, status, updatedAt: MOCK_NOW_ISO } : r)));
  }, []);

  const value = useMemo<AlertsState>(() => {
    const ruleMap = new Map(rules.map((r) => [r.id, r]));
    return {
      rules,
      alerts,
      getRule: (id) => (id ? ruleMap.get(id) : undefined),
      alertsForRule: (ruleId) => alerts.filter((a) => a.ruleId === ruleId),
      activeCountForRule: (ruleId) => alerts.filter((a) => a.ruleId === ruleId && a.status === "active").length,
      dismiss,
      undoDismiss,
      resolve,
      reopen,
      createRule,
      updateRule,
      setRuleStatus,
    };
  }, [rules, alerts, dismiss, undoDismiss, resolve, reopen, createRule, updateRule, setRuleStatus]);

  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
}

export function useAlerts() {
  const ctx = useContext(AlertsContext);
  if (!ctx) throw new Error("useAlerts must be used within AlertsProvider");
  return ctx;
}
