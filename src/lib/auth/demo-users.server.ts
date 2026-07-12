// Single source of truth for the built-in role accounts.
// SERVER ONLY — contains demo passwords, never import from client code.
//
// These accounts are:
//   1. Written to Postgres by `prisma/seed.ts` (production / self-hosted).
//   2. Used as an in-memory login fallback when DATABASE_URL is not set
//      (e.g. the Lovable preview has no database), so every role can be
//      exercised without infrastructure.

import type { AppRole } from "./constants";

export interface DemoUser {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  password: string;
}

export const DEMO_USERS: DemoUser[] = [
  { id: "00000000-0000-0000-0000-000000000001", email: "super@fiksu.dev", fullName: "Sofia Super", role: "SUPER_ADMIN", password: "Super#Fiksu2026" },
  { id: "00000000-0000-0000-0000-000000000002", email: "firm@fiksu.dev", fullName: "Frida Firm", role: "FIRM_ADMIN", password: "Firm#Fiksu2026" },
  { id: "00000000-0000-0000-0000-000000000003", email: "accountant@fiksu.dev", fullName: "Aaro Accountant", role: "ACCOUNTANT", password: "Acct#Fiksu2026" },
  { id: "00000000-0000-0000-0000-000000000004", email: "owner@fiksu.dev", fullName: "Olli Owner", role: "CLIENT_OWNER", password: "Owner#Fiksu2026" },
  { id: "00000000-0000-0000-0000-000000000005", email: "employee@fiksu.dev", fullName: "Emma Employee", role: "CLIENT_EMPLOYEE", password: "Emp#Fiksu2026" },
  { id: "00000000-0000-0000-0000-000000000006", email: "team@fiksu.dev", fullName: "Teo Team", role: "CLIENT_TEAM_MEMBER", password: "Team#Fiksu2026" },
];

/** True when a real database connection is configured. */
export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
