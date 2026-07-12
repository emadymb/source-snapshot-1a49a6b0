import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type ClientRole = "owner" | "employee" | "team";

export const ROLE_META: Record<ClientRole, { label: string; short: string; tone: string }> = {
  owner:    { label: "Client Owner",       short: "Owner",    tone: "bg-indigo-600 text-white" },
  employee: { label: "Client Employee",    short: "Employee", tone: "bg-emerald-600 text-white" },
  team:     { label: "Client Team Member", short: "Team",     tone: "bg-slate-700 text-white" },
};

// Capability matrix — deliberately conservative, mirrors the RBAC contract in the spec.
const CAPS = {
  // create / mutate primary records
  "invoice.create":   ["owner", "employee"],
  "invoice.delete":   ["owner"],
  "invoice.send":     ["owner", "employee"],
  "expense.create":   ["owner", "employee", "team"],
  "expense.approve":  ["owner"],
  "expense.delete":   ["owner"],
  "payroll.approve":  ["owner"],
  "payroll.view":     ["owner", "employee"],
  "docs.upload":      ["owner", "employee", "team"],
  "docs.delete":      ["owner"],
  "reports.export":   ["owner", "employee"],
  "billing.manage":   ["owner"],
  "settings.write":   ["owner"],
  "banking.reconcile":["owner", "employee"],
} satisfies Record<string, ClientRole[]>;

export type Capability = keyof typeof CAPS;

interface Ctx {
  role: ClientRole;
  setRole: (r: ClientRole) => void;
  can: (cap: Capability) => boolean;
}

const RoleCtx = createContext<Ctx | null>(null);

export function ClientRoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<ClientRole>("owner");
  const value = useMemo<Ctx>(() => ({
    role,
    setRole,
    can: (cap) => (CAPS[cap] as readonly ClientRole[]).includes(role),
  }), [role]);
  return <RoleCtx.Provider value={value}>{children}</RoleCtx.Provider>;
}

export function useClientRole(): Ctx {
  const c = useContext(RoleCtx);
  if (!c) throw new Error("useClientRole must be used inside <ClientRoleProvider>");
  return c;
}

/** Convenience — render `children` only if the role has the capability. */
export function Can({ cap, children, fallback = null }: { cap: Capability; children: ReactNode; fallback?: ReactNode }) {
  const { can } = useClientRole();
  return <>{can(cap) ? children : fallback}</>;
}
