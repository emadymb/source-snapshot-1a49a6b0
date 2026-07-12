// Roles & Permissions server functions — REAL data (Prisma).
// Backed by Role / Permission / RolePermission tables. Reads fall back to an
// empty catalog when the DB is unreachable so the console keeps rendering.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface RoleDTO {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  workspaceId: string | null;
  permissionKeys: string[];
}
export interface PermissionDTO {
  id: string;
  key: string;
  module: string;
  label: string;
}

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
    await withTenant(userId, (tx) => tx.auditLog.create({ data: { userId, action, entity, entityId } }));
  } catch { /* best-effort */ }
}

// ---------------------------------------------------------------------------
// Permissions catalog
// ---------------------------------------------------------------------------
export const listPermissions = createServerFn({ method: "GET" }).handler(
  async (): Promise<PermissionDTO[]> => {
    if (!dbConfigured()) return [];
    try {
      const session = await requireSuperAdmin();
      const { withTenant } = await import("./db.server");
      return await withTenant(session.userId, async (tx) => {
        const rows = await tx.permission.findMany({ orderBy: [{ module: "asc" }, { key: "asc" }] });
        return rows.map((p) => ({ id: p.id, key: p.key, module: p.module, label: p.label }));
      });
    } catch { return []; }
  },
);

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------
export const listRoles = createServerFn({ method: "GET" }).handler(
  async (): Promise<RoleDTO[]> => {
    if (!dbConfigured()) return [];
    try {
      const session = await requireSuperAdmin();
      const { withTenant } = await import("./db.server");
      return await withTenant(session.userId, async (tx) => {
        const roles = await tx.role.findMany({
          orderBy: [{ isSystem: "desc" }, { name: "asc" }],
          include: { rolePermissions: { include: { permission: true } } },
        });
        return roles.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          isSystem: r.isSystem,
          workspaceId: r.workspaceId,
          permissionKeys: r.rolePermissions.map((rp) => rp.permission.key),
        }));
      });
    } catch { return []; }
  },
);

const upsertRoleInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  description: z.string().max(500).nullable().optional(),
  workspaceId: z.string().uuid().nullable().optional(),
  permissionKeys: z.array(z.string().min(1)),
});

export const upsertRole = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => upsertRoleInput.parse(d))
  .handler(async ({ data }): Promise<{ id: string }> => {
    if (!dbConfigured()) throw new Error("Database not configured.");
    const session = await requireSuperAdmin();
    const { withTenant } = await import("./db.server");
    const id = await withTenant(session.userId, async (tx) => {
      const base = {
        name: data.name,
        description: data.description ?? null,
        workspaceId: data.workspaceId ?? null,
      };
      const role = data.id
        ? await tx.role.update({ where: { id: data.id }, data: base })
        : await tx.role.create({ data: { ...base, isSystem: false } });

      // Reconcile permissions
      const perms = data.permissionKeys.length
        ? await tx.permission.findMany({ where: { key: { in: data.permissionKeys } } })
        : [];
      const targetIds = new Set(perms.map((p) => p.id));
      const existing = await tx.rolePermission.findMany({ where: { roleId: role.id } });
      const existingIds = new Set(existing.map((r) => r.permissionId));
      const toAdd = [...targetIds].filter((pid) => !existingIds.has(pid));
      const toRemove = [...existingIds].filter((pid) => !targetIds.has(pid));
      if (toRemove.length) {
        await tx.rolePermission.deleteMany({
          where: { roleId: role.id, permissionId: { in: toRemove } },
        });
      }
      if (toAdd.length) {
        await tx.rolePermission.createMany({
          data: toAdd.map((permissionId) => ({ roleId: role.id, permissionId })),
          skipDuplicates: true,
        });
      }
      return role.id;
    });
    await audit(session.userId, data.id ? "update" : "create", "role", id);
    return { id };
  });

export const deleteRole = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    if (!dbConfigured()) throw new Error("Database not configured.");
    const session = await requireSuperAdmin();
    const { withTenant } = await import("./db.server");
    await withTenant(session.userId, async (tx) => {
      const r = await tx.role.findUnique({ where: { id: data.id } });
      if (!r) return;
      if (r.isSystem) throw new Error("System roles cannot be deleted.");
      await tx.role.delete({ where: { id: data.id } });
    });
    await audit(session.userId, "delete", "role", data.id);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Bulk seed / sync — one-shot to persist a UI-provided catalog into DB.
// Idempotent: upserts permissions by key, upserts roles by name.
// ---------------------------------------------------------------------------
const seedInput = z.object({
  permissions: z.array(z.object({
    key: z.string().min(1),
    module: z.string().min(1),
    label: z.string().min(1),
  })),
  roles: z.array(z.object({
    name: z.string().min(1),
    description: z.string().optional().nullable(),
    isSystem: z.boolean().default(false),
    permissionKeys: z.array(z.string()),
  })),
});

export const seedRolesCatalog = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => seedInput.parse(d))
  .handler(async ({ data }): Promise<{ permissions: number; roles: number }> => {
    if (!dbConfigured()) throw new Error("Database not configured.");
    const session = await requireSuperAdmin();
    const { withTenant } = await import("./db.server");
    return await withTenant(session.userId, async (tx) => {
      // Upsert permissions
      for (const p of data.permissions) {
        await tx.permission.upsert({
          where: { key: p.key },
          create: { key: p.key, module: p.module, label: p.label },
          update: { module: p.module, label: p.label },
        });
      }
      const allPerms = await tx.permission.findMany();
      const permByKey = new Map(allPerms.map((p) => [p.key, p.id]));

      // Upsert roles by (workspaceId=null, name) — platform-level roles
      for (const r of data.roles) {
        const existing = await tx.role.findFirst({ where: { workspaceId: null, name: r.name } });
        const base = { name: r.name, description: r.description ?? null, isSystem: r.isSystem };
        const role = existing
          ? await tx.role.update({ where: { id: existing.id }, data: base })
          : await tx.role.create({ data: { ...base, workspaceId: null } });

        const wanted = new Set(r.permissionKeys.map((k) => permByKey.get(k)).filter((v): v is string => !!v));
        const current = await tx.rolePermission.findMany({ where: { roleId: role.id } });
        const curSet = new Set(current.map((c) => c.permissionId));
        const add = [...wanted].filter((pid) => !curSet.has(pid));
        const rem = [...curSet].filter((pid) => !wanted.has(pid));
        if (rem.length) {
          await tx.rolePermission.deleteMany({ where: { roleId: role.id, permissionId: { in: rem } } });
        }
        if (add.length) {
          await tx.rolePermission.createMany({
            data: add.map((permissionId) => ({ roleId: role.id, permissionId })),
            skipDuplicates: true,
          });
        }
      }
      return { permissions: data.permissions.length, roles: data.roles.length };
    });
  });
