// JWT (access token) + refresh-token helpers. SERVER ONLY.
// Uses `jose` (pure JS, edge-compatible). Access tokens are stateless JWTs;
// refresh tokens are opaque random strings whose SHA-256 hash is stored in the
// `sessions` table for rotation/revocation.

import { SignJWT, jwtVerify } from "jose";
import type { AccessClaims } from "./constants";
import { ACCESS_TTL_SECONDS } from "./constants";

function secretKey(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s) {
    console.warn("[auth] JWT_SECRET is not set — using an insecure dev fallback.");
    return new TextEncoder().encode("fiksu-dev-insecure-secret-change-me");
  }
  return new TextEncoder().encode(s);
}

export async function signAccessToken(claims: AccessClaims): Promise<string> {
  return new SignJWT({ email: claims.email, name: claims.name, role: claims.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function verifyAccessToken(token: string): Promise<AccessClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub || typeof payload.role !== "string") return null;
    return {
      sub: payload.sub,
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
      role: payload.role as AccessClaims["role"],
    };
  } catch {
    return null;
  }
}

/** Generate an opaque refresh token (returned to the client as a cookie). */
export function generateRefreshToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** SHA-256 hash (hex) of a refresh token — what we persist in `sessions`. */
export async function hashRefreshToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
