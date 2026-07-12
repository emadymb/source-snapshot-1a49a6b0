// Authentication server functions (self-hosted JWT, no Supabase).
//
//   auth.login    — email/password → verify user, issue tokens, persist refresh
//                   session, set HttpOnly cookies.
//   auth.me       — current user + resolved permissions from the access cookie.
//   auth.refresh  — rotate an access token using the refresh cookie + session row.
//   auth.logout   — revoke the refresh session and clear cookies.
//
// All server-only modules are dynamically imported inside handlers so they
// never leak into the client bundle.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  ACCESS_COOKIE,
  ACCESS_TTL_SECONDS,
  REFRESH_COOKIE,
  REFRESH_TTL_SECONDS,
  ROLE_PERMISSIONS,
  type AppRole,
  type Permission,
  type SessionUser,
} from "./auth/constants";

export interface MeResult {
  user: SessionUser;
  permissions: Permission[];
}

const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(200),
});

async function setAuthCookies(userId: string, email: string, name: string, role: AppRole) {
  const { setCookie } = await import("@tanstack/react-start/server");
  const { signAccessToken, generateRefreshToken, hashRefreshToken } = await import("./auth/jwt.server");
  const { isDbConfigured } = await import("./auth/demo-users.server");

  const accessToken = await signAccessToken({ sub: userId, email, name, role });
  const refreshToken = generateRefreshToken();

  // Persist the refresh session only when a real database is configured.
  // In demo mode (no DATABASE_URL) the access token alone drives the session.
  if (isDbConfigured()) {
    const refreshHash = await hashRefreshToken(refreshToken);

    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const { prisma } = await import("./db.server");
    const userAgent = getRequestHeader("user-agent") ?? null;
    await prisma.session.create({
      data: {
        userId,
        refreshTokenHash: refreshHash,
        userAgent,
        expiresAt: new Date(Date.now() + REFRESH_TTL_SECONDS * 1000),
      },
    });
  }

  const secure = process.env.NODE_ENV === "production";
  setCookie(ACCESS_COOKIE, accessToken, {
    httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: ACCESS_TTL_SECONDS,
  });
  setCookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: REFRESH_TTL_SECONDS,
  });
}


export const login = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => loginSchema.parse(data))
  .handler(async ({ data }): Promise<MeResult> => {
    const { isDbConfigured, DEMO_USERS } = await import("./auth/demo-users.server");
    const email = data.email.toLowerCase();

    // Demo mode: no database configured (e.g. Lovable preview). Authenticate
    // against the built-in role accounts so every role can be exercised.
    if (!isDbConfigured()) {
      const demo = DEMO_USERS.find((u) => u.email === email);
      if (!demo || demo.password !== data.password) {
        throw new Error("Invalid email or password.");
      }
      await setAuthCookies(demo.id, demo.email, demo.fullName, demo.role);
      return {
        user: { id: demo.id, email: demo.email, fullName: demo.fullName, role: demo.role },
        permissions: ROLE_PERMISSIONS[demo.role] ?? [],
      };
    }

    const { prisma } = await import("./db.server");
    const { verifyPassword } = await import("./auth/password.server");

    const user = await prisma.user.findUnique({ where: { email } });
    // Verify against a dummy hash even when the user is missing to avoid timing leaks.
    const ok = user
      ? await verifyPassword(data.password, user.passwordHash)
      : await verifyPassword(data.password, "pbkdf2$210000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");

    if (!user || !ok) {
      throw new Error("Invalid email or password.");
    }
    if (!user.isActive) {
      throw new Error("This account is disabled.");
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await setAuthCookies(user.id, user.email, user.fullName, user.role as AppRole);

    return {
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role as AppRole },
      permissions: ROLE_PERMISSIONS[user.role as AppRole] ?? [],
    };
  });


export const me = createServerFn({ method: "GET" }).handler(async (): Promise<MeResult | null> => {
  const { getCookie } = await import("@tanstack/react-start/server");
  const { verifyAccessToken } = await import("./auth/jwt.server");

  const token = getCookie(ACCESS_COOKIE);
  if (!token) return null;
  const claims = await verifyAccessToken(token);
  if (!claims) return null;

  const role = claims.role as AppRole;
  return {
    user: { id: claims.sub, email: claims.email, fullName: claims.name, role },
    permissions: ROLE_PERMISSIONS[role] ?? [],
  };
});

export const refresh = createServerFn({ method: "POST" }).handler(async (): Promise<MeResult | null> => {
  const { getCookie, setCookie } = await import("@tanstack/react-start/server");
  const { hashRefreshToken, signAccessToken } = await import("./auth/jwt.server");
  const { prisma } = await import("./db.server");

  const refreshToken = getCookie(REFRESH_COOKIE);
  if (!refreshToken) return null;

  const hash = await hashRefreshToken(refreshToken);
  const session = await prisma.session.findUnique({ where: { refreshTokenHash: hash }, include: { user: true } });
  if (!session || session.revokedAt || session.expiresAt < new Date() || !session.user.isActive) {
    return null;
  }

  const { user } = session;
  const role = user.role as AppRole;
  const accessToken = await signAccessToken({ sub: user.id, email: user.email, name: user.fullName, role });
  setCookie(ACCESS_COOKIE, accessToken, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: ACCESS_TTL_SECONDS,
  });

  return {
    user: { id: user.id, email: user.email, fullName: user.fullName, role },
    permissions: ROLE_PERMISSIONS[role] ?? [],
  };
});

export const logout = createServerFn({ method: "POST" }).handler(async (): Promise<{ ok: true }> => {
  const { getCookie, deleteCookie } = await import("@tanstack/react-start/server");
  const { hashRefreshToken } = await import("./auth/jwt.server");
  const { prisma } = await import("./db.server");

  const refreshToken = getCookie(REFRESH_COOKIE);
  if (refreshToken) {
    const hash = await hashRefreshToken(refreshToken);
    await prisma.session.deleteMany({ where: { refreshTokenHash: hash } });
  }
  deleteCookie(ACCESS_COOKIE, { path: "/" });
  deleteCookie(REFRESH_COOKIE, { path: "/" });
  return { ok: true };
});
