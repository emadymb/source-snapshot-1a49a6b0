// Firm module server functions — REAL data via Prisma with workspace RLS.
// No mock/seed fallback. Reads return empty snapshots when unauthenticated
// or when the DB is unreachable so the UI keeps rendering.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ---------------------------------------------------------------------------
// DTOs — mirror the shapes used by the firm UI (from src/lib/mock/firm.tsx).
// ---------------------------------------------------------------------------
export type FirmPermission =
  | "clients.view" | "clients.manage"
  | "engagements.view" | "engagements.manage"
  | "tasks.view" | "tasks.assign" | "tasks.complete"
  | "invoices.view" | "invoices.issue"
  | "reports.view"
  | "staff.manage" | "roles.manage" | "settings.manage";

export interface FirmRoleDTO {
  id: string; name: string; color: string; description: string;
  permissions: FirmPermission[]; system: boolean;
}
export interface FirmStaffDTO {
  id: string; name: string; email: string; roleId: string;
  status: "active" | "invited" | "suspended";
  clientIds: string[]; billableRate: number; utilization: number; avatarSeed: string;
}
export interface FirmClientDTO {
  id: string; name: string; contact: string; email: string; vatId: string;
  industry: string; plan: "Starter" | "Growth" | "Scale" | "Enterprise";
  mrr: number; status: "active" | "onboarding" | "paused" | "churned";
  openTasks: number; overdue: number; createdAt: string; primaryStaffId: string;
}
export interface FirmEngagementDTO {
  id: string; clientId: string; title: string;
  type: "monthly-bookkeeping" | "annual-close" | "vat-return" | "payroll" | "advisory";
  status: "draft" | "active" | "on-hold" | "completed";
  startDate: string; endDate?: string;
  budgetHours: number; spentHours: number; fee: number; leadStaffId: string;
}
export interface FirmTaskDTO {
  id: string; title: string; clientId: string; engagementId?: string;
  assigneeId: string; status: "todo" | "in-progress" | "review" | "done";
  priority: "low" | "med" | "high" | "urgent"; dueDate: string; hours: number;
}
export interface FirmInvoiceDTO {
  id: string; number: string; clientId: string; amount: number;
  issued: string; due: string; status: "draft" | "sent" | "paid" | "overdue";
}

export interface FirmSnapshotDTO {
  roles: FirmRoleDTO[];
  staff: FirmStaffDTO[];
  clients: FirmClientDTO[];
  engagements: FirmEngagementDTO[];
  tasks: FirmTaskDTO[];
  invoices: FirmInvoiceDTO[];
  workspaceId: string | null;
}

const EMPTY: FirmSnapshotDTO = {
  roles: [], staff: [], clients: [], engagements: [], tasks: [], invoices: [], workspaceId: null,
};

// ---------------------------------------------------------------------------
// Enum helpers
// ---------------------------------------------------------------------------
const clientStatusToDb: Record<FirmClientDTO["status"], string> = {
  active: "ACTIVE", onboarding: "ONBOARDING", paused: "PAUSED", churned: "CHURNED",
};
const dbToClientStatus: Record<string, FirmClientDTO["status"]> = {
  ACTIVE: "active", ONBOARDING: "onboarding", PAUSED: "paused", CHURNED: "churned",
};
const staffStatusToDb: Record<FirmStaffDTO["status"], string> = {
  active: "ACTIVE", invited: "INVITED", suspended: "SUSPENDED",
};
const dbToStaffStatus: Record<string, FirmStaffDTO["status"]> = {
  ACTIVE: "active", INVITED: "invited", SUSPENDED: "suspended",
};
const engTypeToDb: Record<FirmEngagementDTO["type"], string> = {
  "monthly-bookkeeping": "MONTHLY_BOOKKEEPING", "annual-close": "ANNUAL_CLOSE",
  "vat-return": "VAT_RETURN", "payroll": "PAYROLL", "advisory": "ADVISORY",
};
const dbToEngType: Record<string, FirmEngagementDTO["type"]> = {
  MONTHLY_BOOKKEEPING: "monthly-bookkeeping", ANNUAL_CLOSE: "annual-close",
  VAT_RETURN: "vat-return", PAYROLL: "payroll", ADVISORY: "advisory",
};
const engStatusToDb: Record<FirmEngagementDTO["status"], string> = {
  draft: "DRAFT", active: "ACTIVE", "on-hold": "ON_HOLD", completed: "COMPLETED",
};
const dbToEngStatus: Record<string, FirmEngagementDTO["status"]> = {
  DRAFT: "draft", ACTIVE: "active", ON_HOLD: "on-hold", COMPLETED: "completed",
};
const taskStatusToDb: Record<FirmTaskDTO["status"], string> = {
  todo: "TODO", "in-progress": "IN_PROGRESS", review: "REVIEW", done: "DONE",
};
const dbToTaskStatus: Record<string, FirmTaskDTO["status"]> = {
  TODO: "todo", IN_PROGRESS: "in-progress", REVIEW: "review", DONE: "done",
};
const taskPriorityToDb: Record<FirmTaskDTO["priority"], string> = {
  low: "LOW", med: "MED", high: "HIGH", urgent: "URGENT",
};
const dbToTaskPriority: Record<string, FirmTaskDTO["priority"]> = {
  LOW: "low", MED: "med", HIGH: "high", URGENT: "urgent",
};
const invStatusToDb: Record<FirmInvoiceDTO["status"], string> = {
  draft: "DRAFT", sent: "SENT", paid: "PAID", overdue: "OVERDUE",
};
const dbToInvStatus: Record<string, FirmInvoiceDTO["status"]> = {
  DRAFT: "draft", SENT: "sent", PAID: "paid", OVERDUE: "overdue",
};
const iso = (d: Date | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : "");

function dbConfigured() { return Boolean(process.env.DATABASE_URL); }

async function requireFirmSession() {
  const { requireSession, resolveWorkspaceId } = await import("./auth/session.server");
  const session = await requireSession();
  if (!["SUPER_ADMIN", "FIRM_ADMIN", "ACCOUNTANT"].includes(session.role)) {
    throw new Error("Forbidden: firm access required.");
  }
  const workspaceId = await resolveWorkspaceId(session.userId, session.role);
  if (!workspaceId) throw new Error("No firm workspace resolved for this user.");
  return { session, workspaceId };
}

async function audit(userId: string, action: string, entity: string, entityId: string) {
  try {
    const { withTenant } = await import("./db.server");
    await withTenant(userId, (tx) => tx.auditLog.create({ data: { userId, action, entity, entityId } }));
  } catch { /* best effort */ }
}

// ---------------------------------------------------------------------------
// Snapshot loader — one call, everything the FirmProvider needs.
// ---------------------------------------------------------------------------
export const loadFirmSnapshot = createServerFn({ method: "GET" }).handler(
  async (): Promise<FirmSnapshotDTO> => {
    if (!dbConfigured()) return EMPTY;
    try {
      const { session, workspaceId } = await requireFirmSession();
      const { withTenant } = await import("./db.server");
      return await withTenant(session.userId, async (tx) => {
        const [roles, staff, clients, engagements, tasks, invoices] = await Promise.all([
          tx.firmRoleDef.findMany({ where: { workspaceId }, orderBy: [{ isSystem: "desc" }, { name: "asc" }] }),
          tx.firmStaff.findMany({ where: { workspaceId }, orderBy: [{ name: "asc" }] }),
          tx.firmClientCo.findMany({ where: { workspaceId }, orderBy: [{ name: "asc" }] }),
          tx.firmEngagement.findMany({ where: { workspaceId }, orderBy: [{ startDate: "desc" }] }),
          tx.firmTask.findMany({ where: { workspaceId }, orderBy: [{ dueDate: "asc" }] }),
          tx.firmBillingInvoice.findMany({ where: { workspaceId }, orderBy: [{ issued: "desc" }] }),
        ]);
        return {
          workspaceId,
          roles: roles.map((r) => ({
            id: r.id, name: r.name, color: r.color, description: r.description,
            permissions: (r.permissions ?? []) as FirmPermission[], system: r.isSystem,
          })),
          staff: staff.map((s) => ({
            id: s.id, name: s.name, email: s.email, roleId: s.roleId ?? "",
            status: dbToStaffStatus[s.status] ?? "active",
            clientIds: s.clientIds ?? [], billableRate: s.billableRate,
            utilization: s.utilization, avatarSeed: s.avatarSeed,
          })),
          clients: clients.map((c) => ({
            id: c.id, name: c.name, contact: c.contact, email: c.email, vatId: c.vatId,
            industry: c.industry,
            plan: (["Starter", "Growth", "Scale", "Enterprise"].includes(c.plan) ? c.plan : "Starter") as FirmClientDTO["plan"],
            mrr: c.mrr,
            status: dbToClientStatus[c.status] ?? "active",
            openTasks: c.openTasks, overdue: c.overdue,
            createdAt: iso(c.createdAt),
            primaryStaffId: c.primaryStaffId ?? "",
          })),
          engagements: engagements.map((e) => ({
            id: e.id, clientId: e.clientId, title: e.title,
            type: dbToEngType[e.type] ?? "monthly-bookkeeping",
            status: dbToEngStatus[e.status] ?? "draft",
            startDate: iso(e.startDate), endDate: e.endDate ? iso(e.endDate) : undefined,
            budgetHours: e.budgetHours, spentHours: e.spentHours, fee: e.fee,
            leadStaffId: e.leadStaffId ?? "",
          })),
          tasks: tasks.map((t) => ({
            id: t.id, title: t.title, clientId: t.clientId,
            engagementId: t.engagementId ?? undefined,
            assigneeId: t.assigneeId ?? "",
            status: dbToTaskStatus[t.status] ?? "todo",
            priority: dbToTaskPriority[t.priority] ?? "med",
            dueDate: iso(t.dueDate), hours: t.hours,
          })),
          invoices: invoices.map((i) => ({
            id: i.id, number: i.number, clientId: i.clientId, amount: i.amount,
            issued: iso(i.issued), due: iso(i.due),
            status: dbToInvStatus[i.status] ?? "draft",
          })),
        };
      });
    } catch { return EMPTY; }
  },
);

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------
const clientIn = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  contact: z.string().default(""),
  email: z.string().default(""),
  vatId: z.string().default(""),
  industry: z.string().default(""),
  plan: z.enum(["Starter", "Growth", "Scale", "Enterprise"]).default("Starter"),
  mrr: z.number().default(0),
  status: z.enum(["active", "onboarding", "paused", "churned"]).default("active"),
  openTasks: z.number().int().default(0),
  overdue: z.number().int().default(0),
  primaryStaffId: z.string().uuid().nullable().optional(),
});

export const upsertFirmClient = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => clientIn.parse(d))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { session, workspaceId } = await requireFirmSession();
    const { withTenant } = await import("./db.server");
    const row = await withTenant(session.userId, async (tx) => {
      const base = {
        workspaceId, name: data.name, contact: data.contact, email: data.email,
        vatId: data.vatId, industry: data.industry, plan: data.plan, mrr: data.mrr,
        status: clientStatusToDb[data.status] as any,
        openTasks: data.openTasks, overdue: data.overdue,
        primaryStaffId: data.primaryStaffId ?? null,
      };
      return data.id
        ? await tx.firmClientCo.update({ where: { id: data.id }, data: base })
        : await tx.firmClientCo.create({ data: base });
    });
    await audit(session.userId, data.id ? "update" : "create", "firm.client", row.id);
    return { id: row.id };
  });

export const deleteFirmClient = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { session } = await requireFirmSession();
    const { withTenant } = await import("./db.server");
    await withTenant(session.userId, (tx) => tx.firmClientCo.delete({ where: { id: data.id } }));
    await audit(session.userId, "delete", "firm.client", data.id);
    return { ok: true };
  });

const staffIn = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  email: z.string().email(),
  roleId: z.string().uuid().nullable().optional(),
  status: z.enum(["active", "invited", "suspended"]).default("active"),
  clientIds: z.array(z.string().uuid()).default([]),
  billableRate: z.number().default(0),
  utilization: z.number().int().min(0).max(100).default(0),
  avatarSeed: z.string().default(""),
});

export const upsertFirmStaff = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => staffIn.parse(d))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { session, workspaceId } = await requireFirmSession();
    const { withTenant } = await import("./db.server");
    const row = await withTenant(session.userId, async (tx) => {
      const base = {
        workspaceId, name: data.name, email: data.email,
        roleId: data.roleId ?? null,
        status: staffStatusToDb[data.status] as any,
        clientIds: data.clientIds, billableRate: data.billableRate,
        utilization: data.utilization, avatarSeed: data.avatarSeed,
      };
      return data.id
        ? await tx.firmStaff.update({ where: { id: data.id }, data: base })
        : await tx.firmStaff.create({ data: base });
    });
    await audit(session.userId, data.id ? "update" : "create", "firm.staff", row.id);
    return { id: row.id };
  });

export const deleteFirmStaff = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { session } = await requireFirmSession();
    const { withTenant } = await import("./db.server");
    await withTenant(session.userId, (tx) => tx.firmStaff.delete({ where: { id: data.id } }));
    await audit(session.userId, "delete", "firm.staff", data.id);
    return { ok: true };
  });

const roleIn = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  color: z.string().default("sky"),
  description: z.string().default(""),
  permissions: z.array(z.string()).default([]),
});

export const upsertFirmRole = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => roleIn.parse(d))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { session, workspaceId } = await requireFirmSession();
    const { withTenant } = await import("./db.server");
    const row = await withTenant(session.userId, async (tx) => {
      const base = {
        workspaceId, name: data.name, color: data.color,
        description: data.description, permissions: data.permissions,
      };
      return data.id
        ? await tx.firmRoleDef.update({ where: { id: data.id }, data: base })
        : await tx.firmRoleDef.create({ data: base });
    });
    await audit(session.userId, data.id ? "update" : "create", "firm.role", row.id);
    return { id: row.id };
  });

export const deleteFirmRole = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { session } = await requireFirmSession();
    const { withTenant } = await import("./db.server");
    await withTenant(session.userId, async (tx) => {
      const r = await tx.firmRoleDef.findUnique({ where: { id: data.id } });
      if (!r || r.isSystem) return;
      await tx.firmRoleDef.delete({ where: { id: data.id } });
    });
    await audit(session.userId, "delete", "firm.role", data.id);
    return { ok: true };
  });

const engagementIn = z.object({
  id: z.string().uuid().optional(),
  clientId: z.string().uuid(),
  title: z.string().min(1),
  type: z.enum(["monthly-bookkeeping","annual-close","vat-return","payroll","advisory"]),
  status: z.enum(["draft","active","on-hold","completed"]).default("draft"),
  startDate: z.string(),
  endDate: z.string().optional().nullable(),
  budgetHours: z.number().int().default(0),
  spentHours: z.number().int().default(0),
  fee: z.number().default(0),
  leadStaffId: z.string().uuid().nullable().optional(),
});

export const upsertFirmEngagement = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => engagementIn.parse(d))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { session, workspaceId } = await requireFirmSession();
    const { withTenant } = await import("./db.server");
    const row = await withTenant(session.userId, async (tx) => {
      const base = {
        workspaceId, clientId: data.clientId, title: data.title,
        type: engTypeToDb[data.type] as any, status: engStatusToDb[data.status] as any,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        budgetHours: data.budgetHours, spentHours: data.spentHours, fee: data.fee,
        leadStaffId: data.leadStaffId ?? null,
      };
      return data.id
        ? await tx.firmEngagement.update({ where: { id: data.id }, data: base })
        : await tx.firmEngagement.create({ data: base });
    });
    await audit(session.userId, data.id ? "update" : "create", "firm.engagement", row.id);
    return { id: row.id };
  });

const taskUpsertIn = z.object({
  id: z.string().uuid().optional(),
  clientId: z.string().uuid(),
  engagementId: z.string().uuid().nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  title: z.string().min(1),
  status: z.enum(["todo","in-progress","review","done"]).default("todo"),
  priority: z.enum(["low","med","high","urgent"]).default("med"),
  dueDate: z.string().optional().nullable(),
  hours: z.number().default(0),
});

export const upsertFirmTask = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => taskUpsertIn.parse(d))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { session, workspaceId } = await requireFirmSession();
    const { withTenant } = await import("./db.server");
    const row = await withTenant(session.userId, async (tx) => {
      const base = {
        workspaceId, clientId: data.clientId,
        engagementId: data.engagementId ?? null,
        assigneeId: data.assigneeId ?? null,
        title: data.title,
        status: taskStatusToDb[data.status] as any,
        priority: taskPriorityToDb[data.priority] as any,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        hours: data.hours,
      };
      return data.id
        ? await tx.firmTask.update({ where: { id: data.id }, data: base })
        : await tx.firmTask.create({ data: base });
    });
    await audit(session.userId, data.id ? "update" : "create", "firm.task", row.id);
    return { id: row.id };
  });

export const moveFirmTask = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: "todo"|"in-progress"|"review"|"done" }) => d)
  .handler(async ({ data }) => {
    const { session } = await requireFirmSession();
    const { withTenant } = await import("./db.server");
    await withTenant(session.userId, (tx) => tx.firmTask.update({
      where: { id: data.id },
      data: { status: taskStatusToDb[data.status] as any },
    }));
    await audit(session.userId, "move", "firm.task", data.id);
    return { ok: true };
  });

export const assignFirmTask = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; assigneeId: string }) => d)
  .handler(async ({ data }) => {
    const { session } = await requireFirmSession();
    const { withTenant } = await import("./db.server");
    await withTenant(session.userId, (tx) => tx.firmTask.update({
      where: { id: data.id }, data: { assigneeId: data.assigneeId || null },
    }));
    await audit(session.userId, "assign", "firm.task", data.id);
    return { ok: true };
  });

const invoiceIn = z.object({
  id: z.string().uuid().optional(),
  number: z.string().min(1),
  clientId: z.string().uuid(),
  amount: z.number().default(0),
  issued: z.string(),
  due: z.string(),
  status: z.enum(["draft","sent","paid","overdue"]).default("draft"),
});

export const upsertFirmInvoice = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => invoiceIn.parse(d))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { session, workspaceId } = await requireFirmSession();
    const { withTenant } = await import("./db.server");
    const row = await withTenant(session.userId, async (tx) => {
      const base = {
        workspaceId, number: data.number, clientId: data.clientId, amount: data.amount,
        issued: new Date(data.issued), due: new Date(data.due),
        status: invStatusToDb[data.status] as any,
      };
      return data.id
        ? await tx.firmBillingInvoice.update({ where: { id: data.id }, data: base })
        : await tx.firmBillingInvoice.create({ data: base });
    });
    await audit(session.userId, data.id ? "update" : "create", "firm.invoice", row.id);
    return { id: row.id };
  });

// ---------------------------------------------------------------------------
// Firm audit trail (plan / entitlement changes) — persisted to AuditLog.
// ---------------------------------------------------------------------------
export type FirmAuditValue = string | number | boolean | null;
export interface FirmAuditChangeDTO { featureId: string; from: FirmAuditValue; to: FirmAuditValue }
export interface FirmAuditEntryDTO {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  actorRole?: string;
  workspaceId: string;
  workspaceName: string;
  kind: "plan.change" | "entitlement.override" | "entitlement.reset";
  planFrom?: string;
  planTo?: string;
  changes: FirmAuditChangeDTO[];
  note?: string;
}

const KIND_TO_ACTION: Record<FirmAuditEntryDTO["kind"], string> = {
  "plan.change": "firm.plan.change",
  "entitlement.override": "firm.entitlement.override",
  "entitlement.reset": "firm.entitlement.reset",
};
const ACTION_TO_KIND: Record<string, FirmAuditEntryDTO["kind"]> = {
  "firm.plan.change": "plan.change",
  "firm.entitlement.override": "entitlement.override",
  "firm.entitlement.reset": "entitlement.reset",
};

export const listFirmAuditEntries = createServerFn({ method: "GET" }).handler(
  async (): Promise<FirmAuditEntryDTO[]> => {
    if (!dbConfigured()) return [];
    try {
      const { session } = await requireFirmSession();
      const { withTenant } = await import("./db.server");
      return await withTenant(session.userId, async (tx) => {
        const rows = await tx.auditLog.findMany({
          where: { action: { in: Object.keys(ACTION_TO_KIND) } },
          orderBy: { createdAt: "desc" },
          take: 300,
        });
        return rows.map((r) => {
          const c = (r.changes ?? {}) as Record<string, unknown>;
          return {
            id: r.id,
            at: r.createdAt.toISOString(),
            actorId: r.userId ?? "",
            actorName: String(c.actorName ?? ""),
            actorRole: c.actorRole ? String(c.actorRole) : undefined,
            workspaceId: r.entityId ?? r.workspaceId ?? "",
            workspaceName: String(c.workspaceName ?? ""),
            kind: ACTION_TO_KIND[r.action] ?? "entitlement.override",
            planFrom: c.planFrom ? String(c.planFrom) : undefined,
            planTo: c.planTo ? String(c.planTo) : undefined,
            changes: Array.isArray(c.changes)
              ? (c.changes as unknown[]).map((x) => {
                  const o = (x ?? {}) as Record<string, unknown>;
                  const norm = (v: unknown): FirmAuditValue =>
                    typeof v === "string" || typeof v === "number" || typeof v === "boolean" ? v : v == null ? null : String(v);
                  return { featureId: String(o.featureId ?? ""), from: norm(o.from), to: norm(o.to) };
                })
              : [],
            note: c.note ? String(c.note) : undefined,
          };
        });
      });
    } catch { return []; }
  },
);

const firmAuditIn = z.object({
  workspaceId: z.string().uuid(),
  workspaceName: z.string().default(""),
  actorName: z.string().default(""),
  actorRole: z.string().optional(),
  kind: z.enum(["plan.change", "entitlement.override", "entitlement.reset"]),
  planFrom: z.string().optional(),
  planTo: z.string().optional(),
  changes: z.array(z.object({
    featureId: z.string(),
    from: z.union([z.string(), z.number(), z.boolean(), z.null()]),
    to: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  })).default([]),
  note: z.string().optional(),
});

export const logFirmAuditEntry = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => firmAuditIn.parse(d))
  .handler(async ({ data }): Promise<FirmAuditEntryDTO> => {
    const { session } = await requireFirmSession();
    const { withTenant } = await import("./db.server");
    const row = await withTenant(session.userId, (tx) => tx.auditLog.create({
      data: {
        userId: session.userId,
        workspaceId: data.workspaceId,
        action: KIND_TO_ACTION[data.kind],
        entity: "workspace",
        entityId: data.workspaceId,
        changes: {
          workspaceName: data.workspaceName,
          actorName: data.actorName,
          actorRole: data.actorRole,
          planFrom: data.planFrom,
          planTo: data.planTo,
          changes: data.changes,
          note: data.note,
        } as any,
      },
    }));
    return {
      id: row.id,
      at: row.createdAt.toISOString(),
      actorId: session.userId,
      actorName: data.actorName,
      actorRole: data.actorRole,
      workspaceId: data.workspaceId,
      workspaceName: data.workspaceName,
      kind: data.kind,
      planFrom: data.planFrom,
      planTo: data.planTo,
      changes: data.changes,
      note: data.note,
    };
  });