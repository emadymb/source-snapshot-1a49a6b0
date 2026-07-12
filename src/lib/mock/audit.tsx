import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export interface AuditChange {
  featureId: string;
  from: unknown;
  to: unknown;
}

export interface AuditEntry {
  id: string;
  at: string;                                // ISO timestamp
  actorId: string;
  actorName: string;
  actorRole?: string;
  workspaceId: string;
  workspaceName: string;
  kind: "plan.change" | "entitlement.override" | "entitlement.reset";
  planFrom?: string;
  planTo?: string;
  changes: AuditChange[];                    // per-feature overrides
  note?: string;
}

const seed: AuditEntry[] = [
  {
    id: "a_1001",
    at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    actorId: "s_001", actorName: "Aino Virtanen", actorRole: "Firm Owner",
    workspaceId: "w_002", workspaceName: "K-Ryhmä Retail",
    kind: "entitlement.override",
    planFrom: "scale", planTo: "scale",
    changes: [{ featureId: "pos.terminals", from: 5, to: 8 }],
    note: "Requested by client — Black Friday capacity",
  },
  {
    id: "a_1000",
    at: new Date(Date.now() - 1000 * 60 * 60 * 27).toISOString(),
    actorId: "s_002", actorName: "Mikael Nyström", actorRole: "Senior Accountant",
    workspaceId: "w_006", workspaceName: "Turku Tech",
    kind: "plan.change",
    planFrom: "growth", planTo: "starter",
    changes: [],
    note: "Downgraded after account review",
  },
];

interface AuditCtx {
  entries: AuditEntry[];
  log: (e: Omit<AuditEntry, "id" | "at">) => AuditEntry;
  clear: () => void;
}

const Ctx = createContext<AuditCtx | null>(null);

export function AuditProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<AuditEntry[]>(seed);
  const value = useMemo<AuditCtx>(() => ({
    entries,
    log: (e) => {
      const entry: AuditEntry = { ...e, id: `a_${Date.now()}`, at: new Date().toISOString() };
      setEntries((prev) => [entry, ...prev]);
      return entry;
    },
    clear: () => setEntries([]),
  }), [entries]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAudit() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAudit must be used inside AuditProvider");
  return ctx;
}
