// Prisma client + Postgres driver adapter (edge/Node compatible).
// SERVER ONLY — never import from client code.
//
// Two logical connections:
//   - prisma      : admin connection (DATABASE_URL). Used for authentication
//                   (login, session lookup) and platform/super-admin work.
//   - withTenant(): runs a callback inside a transaction that sets
//                   `app.current_user_id`, so RLS policies (can_access_workspace
//                   / can_access_company) scope every query to that user.
//                   Uses APP_DATABASE_URL (the least-privileged `fiksu_app`
//                   role) when provided, otherwise falls back to DATABASE_URL.

import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";

export type TenantTx = Prisma.TransactionClient;


const ADMIN_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL ?? process.env.DATABASE_URL;

if (!ADMIN_URL) {
  // Do not throw at import time — server-fn modules are analyzed at build.
  console.warn("[db] DATABASE_URL is not set. Database calls will fail.");
}

function makeClient(connectionString?: string) {
  const adapter = new PrismaPg({ connectionString: connectionString ?? "" });
  return new PrismaClient({ adapter });
}

// Reuse across HMR / warm invocations.
const globalForPrisma = globalThis as unknown as {
  __fiksuPrisma?: PrismaClient;
  __fiksuAppPrisma?: PrismaClient;
};

export const prisma: PrismaClient =
  globalForPrisma.__fiksuPrisma ?? makeClient(ADMIN_URL);
const appPrisma: PrismaClient =
  globalForPrisma.__fiksuAppPrisma ?? makeClient(APP_URL);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__fiksuPrisma = prisma;
  globalForPrisma.__fiksuAppPrisma = appPrisma;
}

/**
 * Execute tenant-scoped work with RLS applied for the given user.
 * All queries inside `fn` run in a single transaction with
 * `app.current_user_id` set, so the can_access_* policies apply.
 */
export async function withTenant<T>(
  userId: string,
  fn: (tx: TenantTx) => Promise<T>,
): Promise<T> {
  return appPrisma.$transaction(async (tx: TenantTx) => {
    // set_config(setting, value, is_local=true) → scoped to this transaction.
    await tx.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, true)`;
    return fn(tx);
  });
}
