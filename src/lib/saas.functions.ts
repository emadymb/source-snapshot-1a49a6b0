// SaaS / Superadmin server functions — REAL data (Prisma + Postgres RLS).
//
// These are platform-level operations restricted to SUPER_ADMIN. Every handler
// verifies the caller's role from the access cookie, then runs queries through
// withTenant() so the is_super_admin() RLS branch applies. Mutations are audited.
//
// There is NO fallback / seed data — reads return empty arrays when the DB is
// unreachable or the caller is not authorized. Every dataset must originate
// from Postgres.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ---------------------------------------------------------------------------
// DTOs — mirror the shapes the Super Admin UI already consumes.
// ---------------------------------------------------------------------------
export type PlanType = "free" | "paid" | "custom";
export type PlanInterval = "monthly" | "yearly";
export type ModuleKey = "cms" | "accounting" | "ai" | "hrm" | "finvoice" | "documents" | "reports";

export interface PlanDTO {
  id: string;
  name: string;
  type: PlanType;
  interval: PlanInterval;
  price: number; // EUR
  users: number;
  companies: number;
  invoices: number;
  trialDays: number;
  modules: ModuleKey[];
  active: boolean;
}

export interface WorkspaceDTO {
  id: string;
  name: string;
  owner: string;
  ownerEmail: string;
  planId: string;
  planName: string;
  companies: number;
  mrr: number;
  createdAt: string; // YYYY-MM-DD
  status: "active" | "trial" | "suspended";
  country: string;
}

export interface RequestDTO {
  id: string;
  workspaceName: string;
  contact: string;
  email: string;
  planId: string;
  submittedAt: string;
  message: string;
  status: "pending" | "approved" | "rejected";
}

// ---------------------------------------------------------------------------
// Enum mapping helpers
// ---------------------------------------------------------------------------
const ALL_MODULES: ModuleKey[] = ["cms", "accounting", "ai", "hrm", "finvoice", "documents", "reports"];

function typeToKind(t: PlanType): "FREE" | "PAID" | "PRIVATE" {
  return t === "free" ? "FREE" : t === "custom" ? "PRIVATE" : "PAID";
}
function kindToType(k: string): PlanType {
  return k === "FREE" ? "free" : k === "PRIVATE" ? "custom" : "paid";
}
function intervalToDb(i: PlanInterval): "MONTHLY" | "YEARLY" {
  return i === "yearly" ? "YEARLY" : "MONTHLY";
}
function dbToInterval(i: string): PlanInterval {
  return i === "YEARLY" ? "yearly" : "monthly";
}
function readModules(entitlements: unknown): ModuleKey[] {
  const raw = (entitlements as { modules?: unknown } | null)?.modules;
  if (!Array.isArray(raw)) return [];
  return raw.filter((m): m is ModuleKey => ALL_MODULES.includes(m as ModuleKey));
}
const day = (d: Date) => d.toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Shared server-side helpers
// ---------------------------------------------------------------------------
/** Resolve the caller and require the SUPER_ADMIN role. */
async function requireSuperAdmin() {
  const { requireSession } = await import("./auth/session.server");
  const session = await requireSession();
  if (session.role !== "SUPER_ADMIN") throw new Error("Forbidden: super admin only.");
  return session;
}

function dbConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

async function audit(userId: string, action: string, entity: string, entityId: string) {
  try {
    const { withTenant } = await import("./db.server");
    await withTenant(userId, (tx) =>
      tx.auditLog.create({ data: { userId, action, entity, entityId } }),
    );
  } catch {
    /* auditing is best-effort */
  }
}

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------
export const listPlans = createServerFn({ method: "GET" }).handler(async (): Promise<PlanDTO[]> => {
  if (!dbConfigured()) return [];
  try {
    const session = await requireSuperAdmin();
    const { withTenant } = await import("./db.server");
    return await withTenant(session.userId, async (tx) => {
      const rows = await tx.subscriptionPlan.findMany({ orderBy: { priceCents: "asc" } });
      return rows.map((p): PlanDTO => ({
        id: p.id,
        name: p.name,
        type: kindToType(p.kind),
        interval: dbToInterval(p.interval),
        price: Math.round(p.priceCents / 100),
        users: p.maxUsers ?? 0,
        companies: p.maxCompanies ?? 0,
        invoices: p.maxInvoices ?? 0,
        trialDays: p.trialDays,
        modules: readModules(p.entitlements),
        active: p.isActive,
      }));
    });
  } catch {
    return [];
  }
});

const planInput = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(120),
  type: z.enum(["free", "paid", "custom"]),
  interval: z.enum(["monthly", "yearly"]),
  price: z.number().min(0).max(1_000_000),
  users: z.number().int().min(0).max(1_000_000),
  companies: z.number().int().min(0).max(1_000_000),
  invoices: z.number().int().min(0).max(9_999_999),
  trialDays: z.number().int().min(0).max(365),
  modules: z.array(z.enum(["cms", "accounting", "ai", "hrm", "finvoice", "documents", "reports"])).max(7),
  active: z.boolean().default(true),
});

export const upsertPlan = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => planInput.parse(d))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const session = await requireSuperAdmin();
    const { withTenant } = await import("./db.server");
    const { slugify } = await import("./cms.functions");
    const base = {
      name: data.name,
      kind: typeToKind(data.type),
      interval: intervalToDb(data.interval),
      priceCents: Math.round(data.price * 100),
      trialDays: data.trialDays,
      maxUsers: data.users,
      maxCompanies: data.companies,
      maxInvoices: data.invoices,
      entitlements: { modules: data.modules },
      isActive: data.active,
    };
    const id = await withTenant(session.userId, async (tx) => {
      const existing = data.id
        ? await tx.subscriptionPlan.findUnique({ where: { id: data.id } })
        : null;
      if (existing) {
        await tx.subscriptionPlan.update({ where: { id: existing.id }, data: base });
        return existing.id;
      }
      const created = await tx.subscriptionPlan.create({
        data: { ...base, slug: `${slugify(data.name)}-${Date.now().toString(36)}` },
      });
      return created.id;
    });
    await audit(session.userId, data.id ? "update" : "create", "subscription_plan", id);
    return { id };
  });

export const deletePlan = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const session = await requireSuperAdmin();
    const { withTenant } = await import("./db.server");
    await withTenant(session.userId, (tx) => tx.subscriptionPlan.delete({ where: { id: data.id } }));
    await audit(session.userId, "delete", "subscription_plan", data.id);
    return { ok: true };
  });

export const togglePlan = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const session = await requireSuperAdmin();
    const { withTenant } = await import("./db.server");
    const active = await withTenant(session.userId, async (tx) => {
      const p = await tx.subscriptionPlan.findUnique({ where: { id: data.id } });
      if (!p) throw new Error("Plan not found");
      const updated = await tx.subscriptionPlan.update({
        where: { id: data.id },
        data: { isActive: !p.isActive },
      });
      return updated.isActive;
    });
    await audit(session.userId, "toggle", "subscription_plan", data.id);
    return { active };
  });

// ---------------------------------------------------------------------------
// Workspaces (tenants)
// ---------------------------------------------------------------------------
export const listWorkspaces = createServerFn({ method: "GET" }).handler(
  async (): Promise<WorkspaceDTO[]> => {
    if (!dbConfigured()) return [];
    try {
      const session = await requireSuperAdmin();
      const { withTenant } = await import("./db.server");
      return await withTenant(session.userId, async (tx) => {
        const [rows, plans, subs] = await Promise.all([
          tx.workspace.findMany({
            include: { owner: true, companies: true },
            orderBy: { createdAt: "desc" },
          }),
          tx.subscriptionPlan.findMany(),
          tx.subscription.findMany({ orderBy: { createdAt: "desc" } }),
        ]);
        const planById = new Map(plans.map((p) => [p.id, p]));
        return rows.map((w): WorkspaceDTO => {
          const sub = subs.find((s) => s.workspaceId === w.id);
          const plan = sub ? planById.get(sub.planId) : undefined;
          const status: WorkspaceDTO["status"] = !w.isActive
            ? "suspended"
            : sub?.status === "TRIALING"
              ? "trial"
              : "active";
          return {
            id: w.id,
            name: w.name,
            owner: w.owner?.fullName ?? "—",
            ownerEmail: w.owner?.email ?? "",
            planId: plan?.id ?? "",
            planName: plan?.name ?? "—",
            companies: w.companies.length,
            mrr: plan ? Math.round(plan.priceCents / 100) : 0,
            createdAt: day(w.createdAt),
            status,
            country: w.companies[0]?.country ?? "FI",
          };
        });
      });
    } catch {
      return [];
    }
  },
);

export const setWorkspaceActive = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; active: boolean }) => d)
  .handler(async ({ data }) => {
    const session = await requireSuperAdmin();
    const { withTenant } = await import("./db.server");
    await withTenant(session.userId, (tx) =>
      tx.workspace.update({ where: { id: data.id }, data: { isActive: data.active } }),
    );
    await audit(session.userId, data.active ? "activate" : "suspend", "workspace", data.id);
    return { ok: true };
  });

export const deleteWorkspace = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const session = await requireSuperAdmin();
    const { withTenant } = await import("./db.server");
    await withTenant(session.userId, (tx) => tx.workspace.delete({ where: { id: data.id } }));
    await audit(session.userId, "delete", "workspace", data.id);
    return { ok: true };
  });

const createWorkspaceInput = z.object({
  name: z.string().trim().min(1).max(120),
  ownerName: z.string().trim().min(1).max(120),
  ownerEmail: z.string().trim().email().toLowerCase(),
  planId: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  status: z.enum(["active", "trial", "suspended"]).default("active"),
  country: z.string().trim().min(2).max(2).default("FI"),
  companies: z.number().int().min(1).max(50).default(1),
  businessId: z.string().trim().max(32).optional(),
});

export const createWorkspace = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => createWorkspaceInput.parse(d))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const session = await requireSuperAdmin();
    const { withTenant } = await import("./db.server");
    const { slugify } = await import("./cms.functions");
    const { hashPassword } = await import("./auth/password.server");
    // Random provisional password — the invited owner resets it on first login.
    const provisionalPwd = crypto.randomUUID() + crypto.randomUUID();
    const passwordHash = await hashPassword(provisionalPwd);

    const id = await withTenant(session.userId, async (tx) => {
      let user = await tx.user.findUnique({ where: { email: data.ownerEmail } });
      if (!user) {
        user = await tx.user.create({
          data: {
            email: data.ownerEmail,
            fullName: data.ownerName,
            passwordHash,
            role: "CLIENT_OWNER",
          },
        });
      }
      const ws = await tx.workspace.create({
        data: {
          name: data.name,
          slug: `${slugify(data.name)}-${Date.now().toString(36)}`,
          kind: "CLIENT",
          ownerId: user.id,
          isActive: data.status !== "suspended",
        },
      });
      await tx.workspaceMember.create({
        data: { userId: user.id, workspaceId: ws.id, role: "CLIENT_OWNER" },
      });
      // Create one primary company by default
      await tx.company.create({
        data: {
          workspaceId: ws.id,
          name: data.name,
          businessId: data.businessId ?? null,
          country: data.country,
        },
      });
      if (data.planId) {
        await tx.subscription.create({
          data: {
            workspaceId: ws.id,
            planId: data.planId,
            status: data.status === "trial" ? "TRIALING" : "ACTIVE",
          },
        });
      }
      return ws.id;
    });
    await audit(session.userId, "create", "workspace", id);
    return { id };
  });

const updateWorkspaceInput = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(120).optional(),
  planId: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  status: z.enum(["active", "trial", "suspended"]).optional(),
  country: z.string().trim().min(2).max(2).optional(),
});

export const updateWorkspace = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => updateWorkspaceInput.parse(d))
  .handler(async ({ data }) => {
    const session = await requireSuperAdmin();
    const { withTenant } = await import("./db.server");
    await withTenant(session.userId, async (tx) => {
      const patch: { name?: string; isActive?: boolean } = {};
      if (data.name) patch.name = data.name;
      if (data.status) patch.isActive = data.status !== "suspended";
      if (Object.keys(patch).length > 0) {
        await tx.workspace.update({ where: { id: data.id }, data: patch });
      }
      if (data.country) {
        const primary = await tx.company.findFirst({ where: { workspaceId: data.id }, orderBy: { createdAt: "asc" } });
        if (primary) await tx.company.update({ where: { id: primary.id }, data: { country: data.country } });
      }
      if (data.planId || data.status) {
        const sub = await tx.subscription.findFirst({ where: { workspaceId: data.id }, orderBy: { createdAt: "desc" } });
        const desiredStatus: "TRIALING" | "ACTIVE" | "CANCELED" | undefined =
          data.status === "trial" ? "TRIALING" : data.status === "suspended" ? "CANCELED" : data.status === "active" ? "ACTIVE" : undefined;
        if (sub) {
          await tx.subscription.update({
            where: { id: sub.id },
            data: {
              ...(data.planId ? { planId: data.planId } : {}),
              ...(desiredStatus ? { status: desiredStatus } : {}),
            },
          });
        } else if (data.planId) {
          await tx.subscription.create({
            data: { workspaceId: data.id, planId: data.planId, status: desiredStatus ?? "ACTIVE" },
          });
        }
      }
    });
    await audit(session.userId, "update", "workspace", data.id);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Payment gateways
// ---------------------------------------------------------------------------
export interface GatewayDTO {
  id: string;
  name: string;
  provider: string;
  logo: string;
  enabled: boolean;
  mode: "test" | "live";
  fee: string;
  apiKey: string;
}

function readGatewayConfig(config: unknown): { logo: string; mode: "test" | "live"; fee: string; apiKey: string } {
  const c = (config as { logo?: string; mode?: string; fee?: string; apiKey?: string }) ?? {};
  return {
    logo: c.logo ?? "€",
    mode: c.mode === "live" ? "live" : "test",
    fee: c.fee ?? "—",
    apiKey: c.apiKey ?? "",
  };
}

export const listGateways = createServerFn({ method: "GET" }).handler(
  async (): Promise<GatewayDTO[]> => {
    if (!dbConfigured()) return [];
    try {
      const session = await requireSuperAdmin();
      const { withTenant } = await import("./db.server");
      return await withTenant(session.userId, async (tx) => {
        const rows = await tx.paymentGateway.findMany({ orderBy: { createdAt: "asc" } });
        return rows.map((g): GatewayDTO => {
          const cfg = readGatewayConfig(g.config);
          return { id: g.id, name: g.name, provider: g.provider, enabled: g.isActive, ...cfg };
        });
      });
    } catch {
      return [];
    }
  },
);

const gatewayInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(80),
  provider: z.string().trim().min(1).max(40),
  logo: z.string().trim().max(4).default("€"),
  mode: z.enum(["test", "live"]).default("test"),
  fee: z.string().trim().max(40).default("—"),
  apiKey: z.string().trim().max(255).default(""),
  enabled: z.boolean().default(false),
});

export const upsertGateway = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => gatewayInput.parse(d))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const session = await requireSuperAdmin();
    const { withTenant } = await import("./db.server");
    const cfg = { logo: data.logo, mode: data.mode, fee: data.fee, apiKey: data.apiKey };
    const id = await withTenant(session.userId, async (tx) => {
      const existing = data.id ? await tx.paymentGateway.findUnique({ where: { id: data.id } }) : null;
      if (existing) {
        await tx.paymentGateway.update({
          where: { id: existing.id },
          data: { name: data.name, provider: data.provider, isActive: data.enabled, config: cfg },
        });
        return existing.id;
      }
      const created = await tx.paymentGateway.create({
        data: { name: data.name, provider: data.provider, isActive: data.enabled, config: cfg },
      });
      return created.id;
    });
    await audit(session.userId, data.id ? "update" : "create", "payment_gateway", id);
    return { id };
  });

export const toggleGateway = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }): Promise<{ enabled: boolean }> => {
    const session = await requireSuperAdmin();
    const { withTenant } = await import("./db.server");
    const enabled = await withTenant(session.userId, async (tx) => {
      const g = await tx.paymentGateway.findUnique({ where: { id: data.id } });
      if (!g) throw new Error("Gateway not found");
      const u = await tx.paymentGateway.update({
        where: { id: data.id },
        data: { isActive: !g.isActive },
      });
      return u.isActive;
    });
    await audit(session.userId, "toggle", "payment_gateway", data.id);
    return { enabled };
  });

export const setGatewayMode = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; mode: "test" | "live" }) => d)
  .handler(async ({ data }) => {
    const session = await requireSuperAdmin();
    const { withTenant } = await import("./db.server");
    await withTenant(session.userId, async (tx) => {
      const g = await tx.paymentGateway.findUnique({ where: { id: data.id } });
      if (!g) throw new Error("Gateway not found");
      const cfg = { ...readGatewayConfig(g.config), mode: data.mode };
      await tx.paymentGateway.update({ where: { id: data.id }, data: { config: cfg } });
    });
    await audit(session.userId, "mode-change", "payment_gateway", data.id);
    return { ok: true };
  });

export const deleteGateway = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const session = await requireSuperAdmin();
    const { withTenant } = await import("./db.server");
    await withTenant(session.userId, (tx) => tx.paymentGateway.delete({ where: { id: data.id } }));
    await audit(session.userId, "delete", "payment_gateway", data.id);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Subscription requests
// ---------------------------------------------------------------------------
export const listRequests = createServerFn({ method: "GET" }).handler(
  async (): Promise<RequestDTO[]> => {
    if (!dbConfigured()) return [];
    try {
      const session = await requireSuperAdmin();
      const { withTenant } = await import("./db.server");
      return await withTenant(session.userId, async (tx) => {
        const [rows, workspaces] = await Promise.all([
          tx.subscriptionRequest.findMany({ orderBy: { createdAt: "desc" } }),
          tx.workspace.findMany({ include: { owner: true } }),
        ]);
        const wsById = new Map(workspaces.map((w) => [w.id, w]));
        return rows.map((r): RequestDTO => {
          const ws = wsById.get(r.workspaceId);
          return {
            id: r.id,
            workspaceName: ws?.name ?? "—",
            contact: ws?.owner?.fullName ?? "—",
            email: ws?.owner?.email ?? "",
            planId: r.planId,
            submittedAt: day(r.createdAt),
            message: r.note ?? "",
            status:
              r.status === "APPROVED" ? "approved" : r.status === "REJECTED" ? "rejected" : "pending",
          };
        });
      });
    } catch {
      return [];
    }
  },
);

export const resolveRequest = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; approve: boolean }) => d)
  .handler(async ({ data }) => {
    const session = await requireSuperAdmin();
    const { withTenant } = await import("./db.server");
    await withTenant(session.userId, async (tx) => {
      const req = await tx.subscriptionRequest.update({
        where: { id: data.id },
        data: { status: data.approve ? "APPROVED" : "REJECTED" },
      });
      if (data.approve) {
        await tx.subscription.create({
          data: { workspaceId: req.workspaceId, planId: req.planId, status: "ACTIVE" },
        });
        await tx.workspace.update({ where: { id: req.workspaceId }, data: { isActive: true } });
      }
    });
    await audit(session.userId, data.approve ? "approve" : "reject", "subscription_request", data.id);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Audit log (Super Admin)
// ---------------------------------------------------------------------------
export interface AuditEntryDTO {
  id: string;
  when: string; // ISO
  actor: string;
  actorEmail: string;
  action: string;
  entity: string;
  entityId: string | null;
  ip: string | null;
  changes: string; // JSON-encoded
}

export const listAuditLogs = createServerFn({ method: "GET" }).handler(
  async (): Promise<AuditEntryDTO[]> => {
    if (!dbConfigured()) return [];
    try {
      const session = await requireSuperAdmin();
      const { withTenant } = await import("./db.server");
      return await withTenant(session.userId, async (tx) => {
        const rows = await tx.auditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 500,
        });
        const userIds = Array.from(new Set(rows.map((r) => r.userId).filter((v): v is string => !!v)));
        const users = userIds.length
          ? await tx.user.findMany({ where: { id: { in: userIds } } })
          : [];
        const byId = new Map(users.map((u) => [u.id, u]));
        return rows.map((r): AuditEntryDTO => {
          const u = r.userId ? byId.get(r.userId) : null;
          return {
            id: r.id,
            when: r.createdAt.toISOString(),
            actor: u?.fullName ?? "System",
            actorEmail: u?.email ?? "system@fiksu.fi",
            action: r.action,
            entity: r.entity,
            entityId: r.entityId,
            ip: r.ip,
            changes: JSON.stringify(r.changes ?? {}),
          };
        });
      });
    } catch {
      return [];
    }
  },
);

// ---------------------------------------------------------------------------
// Platform health (Super Admin)
// ---------------------------------------------------------------------------
export interface PlatformHealthDTO {
  counts: {
    workspaces: number;
    activeWorkspaces: number;
    companies: number;
    users: number;
    subscriptions: number;
    activeSubscriptions: number;
    invoicesLast30d: number;
    aiCallsLast24h: number;
  };
  aiCostsEurLast30d: number;
  ocr: { totalLast30d: number; avgLatencyMs: number };
  auditLast24h: number;
  dbConfigured: boolean;
  checkedAt: string;
}

export const platformHealth = createServerFn({ method: "GET" }).handler(
  async (): Promise<PlatformHealthDTO> => {
    const base: PlatformHealthDTO = {
      counts: { workspaces: 0, activeWorkspaces: 0, companies: 0, users: 0, subscriptions: 0, activeSubscriptions: 0, invoicesLast30d: 0, aiCallsLast24h: 0 },
      aiCostsEurLast30d: 0,
      ocr: { totalLast30d: 0, avgLatencyMs: 0 },
      auditLast24h: 0,
      dbConfigured: dbConfigured(),
      checkedAt: new Date().toISOString(),
    };
    if (!dbConfigured()) return base;
    try {
      const session = await requireSuperAdmin();
      const { withTenant } = await import("./db.server");
      return await withTenant(session.userId, async (tx) => {
        const now = new Date();
        const day24 = new Date(now.getTime() - 24 * 3600 * 1000);
        const day30 = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
        const [
          workspaces, activeWs, companies, users, subs, activeSubs,
          invoices30, aiCalls24, ocrRows, auditRows, aiCost30,
        ] = await Promise.all([
          tx.workspace.count(),
          tx.workspace.count({ where: { isActive: true } }),
          tx.company.count(),
          tx.user.count(),
          tx.subscription.count(),
          tx.subscription.count({ where: { status: "ACTIVE" } }),
          tx.invoice.count({ where: { createdAt: { gte: day30 } } }),
          tx.aiUsageLog.count({ where: { createdAt: { gte: day24 } } }),
          tx.aiUsageLog.findMany({
            where: { createdAt: { gte: day30 }, kind: "ocr" },
            select: { latencyMs: true },
          }),
          tx.auditLog.count({ where: { createdAt: { gte: day24 } } }),
          tx.aiUsageLog.aggregate({
            _sum: { costCents: true },
            where: { createdAt: { gte: day30 } },
          }),
        ]);
        const totalOcr = ocrRows.length;
        const avgLat = totalOcr ? Math.round(ocrRows.reduce((s, r) => s + (r.latencyMs ?? 0), 0) / totalOcr) : 0;
        return {
          counts: {
            workspaces, activeWorkspaces: activeWs, companies, users,
            subscriptions: subs, activeSubscriptions: activeSubs,
            invoicesLast30d: invoices30, aiCallsLast24h: aiCalls24,
          },
          aiCostsEurLast30d: Math.round(((aiCost30._sum.costCents ?? 0) / 100) * 100) / 100,
          ocr: { totalLast30d: totalOcr, avgLatencyMs: avgLat },
          auditLast24h: auditRows,
          dbConfigured: true,
          checkedAt: new Date().toISOString(),
        };
      });
    } catch {
      return base;
    }
  },
);
