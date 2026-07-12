// Server-only helpers to resolve the current user + active tenant inside
// server functions. Reads the HttpOnly access cookie, verifies the JWT, and
// resolves the workspace/company the request should be scoped to.
//
// SERVER ONLY — imported lazily from server-function handlers.

import { ACCESS_COOKIE, type AppRole } from "./constants";

export interface SessionContext {
  userId: string;
  role: AppRole;
  email: string;
  name: string;
}

/** Resolve the authenticated user from the access cookie, or null. */
export async function getSession(): Promise<SessionContext | null> {
  const { getCookie } = await import("@tanstack/react-start/server");
  const { verifyAccessToken } = await import("./jwt.server");
  const token = getCookie(ACCESS_COOKIE);
  if (!token) return null;
  const claims = await verifyAccessToken(token);
  if (!claims) return null;
  return {
    userId: claims.sub,
    role: claims.role as AppRole,
    email: claims.email,
    name: claims.name,
  };
}

/** Like getSession but throws a 401-style error when unauthenticated. */
export async function requireSession(): Promise<SessionContext> {
  const s = await getSession();
  if (!s) throw new Error("Unauthorized");
  return s;
}

/**
 * Resolve the workspace the current request should operate in.
 * Order: profile.activeWorkspaceId → first membership → first owned workspace →
 * (super admin) first FIRM workspace. Returns null when none exists.
 */
export async function resolveWorkspaceId(userId: string, role: AppRole): Promise<string | null> {
  const { prisma } = await import("../db.server");

  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (profile?.activeWorkspaceId) return profile.activeWorkspaceId;

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  if (membership) return membership.workspaceId;

  const owned = await prisma.workspace.findFirst({
    where: { ownerId: userId },
    orderBy: { createdAt: "asc" },
  });
  if (owned) return owned.id;

  if (role === "SUPER_ADMIN") {
    const firm = await prisma.workspace.findFirst({
      where: { kind: "FIRM" },
      orderBy: { createdAt: "asc" },
    });
    return firm?.id ?? null;
  }
  return null;
}

/** Resolve the active company for accounting-scoped work. */
export async function resolveCompanyId(userId: string): Promise<string | null> {
  const { prisma } = await import("../db.server");
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (profile?.activeCompanyId) return profile.activeCompanyId;

  const wsId = await resolveWorkspaceId(userId, "CLIENT_OWNER");
  if (!wsId) return null;
  const company = await prisma.company.findFirst({
    where: { workspaceId: wsId },
    orderBy: { createdAt: "asc" },
  });
  return company?.id ?? null;
}
