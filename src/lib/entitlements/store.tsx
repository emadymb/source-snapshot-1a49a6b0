import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  CATALOG_PLANS, FEATURES, featureById, planById,
  type CatalogPlan, type EntitlementMap, type FeatureDef,
} from "./catalog";

// Snapshot of plan entitlements — mutable so Plan Builder edits propagate live.
const PLAN_OVERRIDES: Record<string, EntitlementMap> = {};
function resolvePlan(id: string): CatalogPlan | undefined {
  const p = planById(id);
  if (!p) return undefined;
  const override = PLAN_OVERRIDES[id];
  return override ? { ...p, entitlements: { ...p.entitlements, ...override } } : p;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  planId: string;
  status: "active" | "suspended" | "trial";
  addons?: EntitlementMap; // overrides on top of plan
}

const seedWorkspaces: WorkspaceSummary[] = [
  { id: "w_001", name: "Lindqvist Oy",       planId: "growth",     status: "active" },
  { id: "w_002", name: "K-Ryhmä Retail",     planId: "scale",      status: "active", addons: { "pos.terminals": 8 } },
  { id: "w_003", name: "Aalto Design",       planId: "starter",    status: "trial"  },
  { id: "w_004", name: "Café Regatta",       planId: "starter",    status: "active" },
  { id: "w_005", name: "Verkkokauppa Oy",    planId: "scale",      status: "active" },
  { id: "w_006", name: "Turku Tech",         planId: "growth",     status: "suspended" },
  { id: "w_007", name: "Malmö AB",           planId: "enterprise", status: "active" },
];

interface EntitlementsCtx {
  workspaces: WorkspaceSummary[];
  plans: CatalogPlan[];
  currentWorkspaceId: string;
  setCurrentWorkspaceId: (id: string) => void;
  entitlements: EntitlementMap;
  isOn: (id: string) => boolean;
  quotaOf: (id: string) => number;
  valueOf: (id: string) => boolean | number | string | undefined;
  entitlementsForWorkspace: (workspaceId: string) => EntitlementMap;
  planForWorkspace: (workspaceId: string) => CatalogPlan;
  setPlanForWorkspace: (workspaceId: string, planId: string) => void;
  toggleWorkspaceStatus: (workspaceId: string) => void;
  updateAddon: (workspaceId: string, featureId: string, value: boolean | number | string) => void;
  resetAddons: (workspaceId: string) => void;
  addWorkspace: (w: Omit<WorkspaceSummary, "id">) => WorkspaceSummary;
  /** Overwrite a plan's entitlements (persists in-memory). Used by Plan Builder Publish. */
  overwritePlanEntitlements: (planId: string, ent: EntitlementMap) => void;
  planRevision: number;
}

const Ctx = createContext<EntitlementsCtx | null>(null);

export function EntitlementsProvider({ children, initialWorkspaceId }: { children: ReactNode; initialWorkspaceId?: string }) {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>(seedWorkspaces);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>(initialWorkspaceId ?? seedWorkspaces[0].id);
  const [planRevision, setPlanRevision] = useState(0);

  const value = useMemo<EntitlementsCtx>(() => {
    const empty: EntitlementMap = {};
    for (const f of FEATURES) empty[f.id] = f.kind === "toggle" ? false : f.kind === "quota" ? 0 : "";

    const entForWs = (ws: WorkspaceSummary): EntitlementMap => {
      const plan = resolvePlan(ws.planId) ?? CATALOG_PLANS[0];
      return ws.status === "suspended" ? empty : { ...plan.entitlements, ...(ws.addons ?? {}) };
    };

    const ws = workspaces.find((w) => w.id === currentWorkspaceId) ?? workspaces[0];
    const entitlements = entForWs(ws);

    const isOn = (id: string) => {
      const v = entitlements[id];
      return typeof v === "boolean" ? v : typeof v === "number" ? v > 0 : Boolean(v);
    };
    const quotaOf = (id: string) => (typeof entitlements[id] === "number" ? (entitlements[id] as number) : 0);
    const valueOf = (id: string) => entitlements[id];

    return {
      workspaces, plans: CATALOG_PLANS.map((p) => resolvePlan(p.id) ?? p),
      currentWorkspaceId, setCurrentWorkspaceId,
      entitlements, isOn, quotaOf, valueOf,
      entitlementsForWorkspace: (workspaceId) => {
        const target = workspaces.find((w) => w.id === workspaceId);
        return target ? entForWs(target) : empty;
      },
      planForWorkspace: (workspaceId) => {
        const target = workspaces.find((w) => w.id === workspaceId);
        return (target && resolvePlan(target.planId)) ?? CATALOG_PLANS[0];
      },
      setPlanForWorkspace: (workspaceId, planId) =>
        setWorkspaces((prev) => prev.map((w) => (w.id === workspaceId ? { ...w, planId, addons: {} } : w))),
      toggleWorkspaceStatus: (workspaceId) =>
        setWorkspaces((prev) => prev.map((w) =>
          w.id === workspaceId ? { ...w, status: w.status === "active" ? "suspended" : "active" } : w
        )),
      updateAddon: (workspaceId, featureId, v) =>
        setWorkspaces((prev) => prev.map((w) =>
          w.id === workspaceId ? { ...w, addons: { ...(w.addons ?? {}), [featureId]: v } } : w
        )),
      resetAddons: (workspaceId) =>
        setWorkspaces((prev) => prev.map((w) => (w.id === workspaceId ? { ...w, addons: {} } : w))),
      addWorkspace: (partial) => {
        const created: WorkspaceSummary = { id: `w_${Date.now()}`, ...partial };
        setWorkspaces((prev) => [created, ...prev]);
        return created;
      },
      overwritePlanEntitlements: (planId, ent) => {
        PLAN_OVERRIDES[planId] = { ...(PLAN_OVERRIDES[planId] ?? {}), ...ent };
        setPlanRevision((n) => n + 1);
      },
      planRevision,
    };
  }, [workspaces, currentWorkspaceId, planRevision]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEntitlements() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useEntitlements must be used inside EntitlementsProvider");
  return ctx;
}

/** Convenience for a single feature. */
export function useEntitlement(id: string) {
  const { isOn, quotaOf, valueOf } = useEntitlements();
  return { on: isOn(id), quota: quotaOf(id), value: valueOf(id), def: featureById(id) };
}

/** Renders children only if the feature is enabled for the current workspace. */
export function Gate({
  feature,
  fallback = null,
  children,
}: {
  feature: string;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { on } = useEntitlement(feature);
  return <>{on ? children : fallback}</>;
}

export type { FeatureDef, EntitlementMap };
