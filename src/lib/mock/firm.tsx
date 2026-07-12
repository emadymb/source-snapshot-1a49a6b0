// DB-backed firm store. Public API is the drop-in replacement for the previous
// mock provider so existing pages under /firm/* keep working unchanged.
// All data now originates from Postgres via src/lib/firm.functions.ts.

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  loadFirmSnapshot,
  upsertFirmClient, deleteFirmClient,
  upsertFirmStaff, deleteFirmStaff,
  upsertFirmRole, deleteFirmRole,
  upsertFirmEngagement,
  upsertFirmTask, moveFirmTask, assignFirmTask,
  upsertFirmInvoice,
  type FirmPermission,
  type FirmClientDTO, type FirmStaffDTO, type FirmRoleDTO,
  type FirmEngagementDTO, type FirmTaskDTO, type FirmInvoiceDTO,
} from "@/lib/firm.functions";

export type { FirmPermission } from "@/lib/firm.functions";
export type FirmRole = FirmRoleDTO;
export type FirmStaff = FirmStaffDTO;
export type FirmClient = FirmClientDTO;
export type Engagement = FirmEngagementDTO;
export type FirmTask = FirmTaskDTO;
export type FirmInvoice = FirmInvoiceDTO;

export const ALL_PERMISSIONS: FirmPermission[] = [
  "clients.view", "clients.manage",
  "engagements.view", "engagements.manage",
  "tasks.view", "tasks.assign", "tasks.complete",
  "invoices.view", "invoices.issue",
  "reports.view",
  "staff.manage", "roles.manage", "settings.manage",
];

interface FirmCtx {
  roles: FirmRole[];
  staff: FirmStaff[];
  clients: FirmClient[];
  engagements: Engagement[];
  tasks: FirmTask[];
  invoices: FirmInvoice[];
  currentStaffId: string;
  setCurrentStaff: (id: string) => void;
  can: (perm: FirmPermission) => boolean;
  upsertClient: (c: FirmClient) => void;
  deleteClient: (id: string) => void;
  upsertStaff: (s: FirmStaff) => void;
  deleteStaff: (id: string) => void;
  upsertRole: (r: FirmRole) => void;
  deleteRole: (id: string) => void;
  togglePermission: (roleId: string, perm: FirmPermission) => void;
  upsertEngagement: (e: Engagement) => void;
  moveTask: (id: string, status: FirmTask["status"]) => void;
  assignTask: (id: string, staffId: string) => void;
  upsertInvoice: (i: FirmInvoice) => void;
  isLoading: boolean;
}

const Ctx = createContext<FirmCtx | null>(null);

const QK = ["firm", "snapshot"] as const;

export function FirmProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const load = useServerFn(loadFirmSnapshot);
  const { data, isLoading } = useQuery({
    queryKey: QK,
    queryFn: () => load(),
    staleTime: 30_000,
  });

  const upsertClientFn = useServerFn(upsertFirmClient);
  const deleteClientFn = useServerFn(deleteFirmClient);
  const upsertStaffFn = useServerFn(upsertFirmStaff);
  const deleteStaffFn = useServerFn(deleteFirmStaff);
  const upsertRoleFn = useServerFn(upsertFirmRole);
  const deleteRoleFn = useServerFn(deleteFirmRole);
  const upsertEngagementFn = useServerFn(upsertFirmEngagement);
  const upsertTaskFn = useServerFn(upsertFirmTask);
  const moveTaskFn = useServerFn(moveFirmTask);
  const assignTaskFn = useServerFn(assignFirmTask);
  const upsertInvoiceFn = useServerFn(upsertFirmInvoice);

  const [currentStaffId, setCurrentStaffId] = useState<string>("");

  const value = useMemo<FirmCtx>(() => {
    const roles = data?.roles ?? [];
    const staff = data?.staff ?? [];
    const clients = data?.clients ?? [];
    const engagements = data?.engagements ?? [];
    const tasks = data?.tasks ?? [];
    const invoices = data?.invoices ?? [];

    const currentId = currentStaffId || staff[0]?.id || "";
    const current = staff.find((s) => s.id === currentId);
    const currentRole = roles.find((r) => r.id === current?.roleId);
    const can = (perm: FirmPermission) =>
      currentRole?.permissions.includes(perm) ??
      // Fall back to full access when there are no staff yet (initial setup).
      staff.length === 0;

    const invalidate = () => qc.invalidateQueries({ queryKey: QK });
    const isUuid = (v: unknown): v is string =>
      typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

    return {
      roles, staff, clients, engagements, tasks, invoices,
      currentStaffId: currentId, setCurrentStaff: setCurrentStaffId, can,
      isLoading,
      upsertClient: (c) => {
        upsertClientFn({ data: {
          id: isUuid(c.id) ? c.id : undefined,
          name: c.name, contact: c.contact, email: c.email, vatId: c.vatId,
          industry: c.industry, plan: c.plan, mrr: c.mrr, status: c.status,
          openTasks: c.openTasks, overdue: c.overdue,
          primaryStaffId: isUuid(c.primaryStaffId) ? c.primaryStaffId : null,
        } }).then(invalidate).catch(() => {});
      },
      deleteClient: (id) => {
        if (!isUuid(id)) return;
        deleteClientFn({ data: { id } }).then(invalidate).catch(() => {});
      },
      upsertStaff: (s) => {
        upsertStaffFn({ data: {
          id: isUuid(s.id) ? s.id : undefined,
          name: s.name, email: s.email,
          roleId: isUuid(s.roleId) ? s.roleId : null,
          status: s.status,
          clientIds: s.clientIds.filter(isUuid),
          billableRate: s.billableRate, utilization: s.utilization, avatarSeed: s.avatarSeed,
        } }).then(invalidate).catch(() => {});
      },
      deleteStaff: (id) => {
        if (!isUuid(id)) return;
        deleteStaffFn({ data: { id } }).then(invalidate).catch(() => {});
      },
      upsertRole: (r) => {
        upsertRoleFn({ data: {
          id: isUuid(r.id) ? r.id : undefined,
          name: r.name, color: r.color, description: r.description,
          permissions: r.permissions,
        } }).then(invalidate).catch(() => {});
      },
      deleteRole: (id) => {
        if (!isUuid(id)) return;
        deleteRoleFn({ data: { id } }).then(invalidate).catch(() => {});
      },
      togglePermission: (roleId, perm) => {
        const role = roles.find((r) => r.id === roleId);
        if (!role || role.system || !isUuid(roleId)) return;
        const has = role.permissions.includes(perm);
        const next = has ? role.permissions.filter((x) => x !== perm) : [...role.permissions, perm];
        upsertRoleFn({ data: {
          id: roleId, name: role.name, color: role.color,
          description: role.description, permissions: next,
        } }).then(invalidate).catch(() => {});
      },
      upsertEngagement: (e) => {
        if (!isUuid(e.clientId)) return;
        upsertEngagementFn({ data: {
          id: isUuid(e.id) ? e.id : undefined,
          clientId: e.clientId, title: e.title, type: e.type, status: e.status,
          startDate: e.startDate, endDate: e.endDate ?? null,
          budgetHours: e.budgetHours, spentHours: e.spentHours, fee: e.fee,
          leadStaffId: isUuid(e.leadStaffId) ? e.leadStaffId : null,
        } }).then(invalidate).catch(() => {});
      },
      moveTask: (id, status) => {
        if (!isUuid(id)) return;
        moveTaskFn({ data: { id, status } }).then(invalidate).catch(() => {});
      },
      assignTask: (id, staffId) => {
        if (!isUuid(id)) return;
        assignTaskFn({ data: { id, assigneeId: isUuid(staffId) ? staffId : "" } }).then(invalidate).catch(() => {});
      },
      upsertInvoice: (i) => {
        if (!isUuid(i.clientId)) return;
        upsertInvoiceFn({ data: {
          id: isUuid(i.id) ? i.id : undefined,
          number: i.number, clientId: i.clientId, amount: i.amount,
          issued: i.issued, due: i.due, status: i.status,
        } }).then(invalidate).catch(() => {});
      },
    };
  }, [data, isLoading, currentStaffId, qc,
      upsertClientFn, deleteClientFn, upsertStaffFn, deleteStaffFn,
      upsertRoleFn, deleteRoleFn, upsertEngagementFn,
      upsertTaskFn, moveTaskFn, assignTaskFn, upsertInvoiceFn]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFirm() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFirm must be used inside FirmProvider");
  return ctx;
}
