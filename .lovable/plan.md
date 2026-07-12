# Convert remaining modules to real DB (Prisma) — hard-delete of mock data

Previous turns finished the SaaS/Super Admin module (Prisma-backed, `src/lib/mock/saas.tsx` deleted). The five remaining mock stores are still in use across ~40 routes/components:

- `src/lib/mock/cms.ts` — CMS pages, blog, menus, themes
- `src/lib/mock/firm.tsx` — firm clients, staff, tasks, engagements, roles, time, docs
- `src/lib/mock/hrm.tsx` — employees, attendance, leaves, tasks, memos, reminders, messages, holidays
- `src/lib/mock/ai.ts` — AI conversations, leads, model routing, usage logs
- `src/lib/mock/audit.tsx` — audit trail
- `src/lib/mock/store.ts` — shared accounting store (invoices, contacts, products, journals, ledger, expenses, reports)

Doing all five in one turn produces a giant unreviewable diff and high risk of type-check regressions. I will convert them **module by module**, one turn each. Each conversion follows the same recipe used for SaaS.

## Per-module recipe (each turn)

1. Extend `prisma/schema.prisma` with the required tables (if not already present), `GRANT`s handled by our current setup, plus tenant scoping via `workspaceId`.
2. Generate a Prisma migration file under `prisma/migrations/`.
3. Add / extend server functions in `src/lib/<module>.functions.ts`:
   - `list*`, `get*` (GET) with tenant filter via `withTenant(userId, ...)`.
   - `upsert*`, `delete*`, action mutations (POST) with role checks + `auditLog.create`.
4. Rewrite each consuming route/component to use `useQuery` + `useServerFn` instead of the mock store.
5. Delete the mock store file and its `Provider` from the shell/root route.
6. Empty-state UI everywhere (no seed fallback).
7. Typecheck.

## Proposed order (one module per turn)

| # | Module | Mock file | Routes / components touched |
|---|--------|-----------|-----------------------------|
| 1 | Firm (clients, staff, tasks, engagements, roles, docs, time, reports) | `mock/firm.tsx` | ~14 files under `src/routes/firm.*` + `FirmShell`, `PlanEntitlementsDrawer` |
| 2 | Accounting core (invoices, contacts, products, journals, ledger, expenses, reports, chart of accounts) | `mock/store.ts` | 8 components under `src/components/accounting/*` |
| 3 | HRM (employees, attendance, leaves, holidays, tasks, memos, reminders, messages) | `mock/hrm.tsx` | 8 routes under `src/routes/client.accounting.*` |
| 4 | AI (conversations, leads, usage logs, model routing, settings) | `mock/ai.ts` | `super.ai.*` routes, `client.ai.chat`, `OcrUploader` |
| 5 | CMS (pages, blog, menus, themes, SEO) | `mock/cms.ts` | `super.cms.*` routes |
| 6 | Audit trail (unified across all above) | `mock/audit.tsx` | `firm.audit`, `super.audit` — largely already writing via `auditLog.create` |

## What ships this turn

**Module 1 — Firm.** Concretely:

- Prisma additions: `FirmClient`, `FirmStaff`, `FirmEngagement`, `FirmTask`, `FirmTimeEntry`, `FirmDocument` (workspace-scoped, RLS via existing `withTenant`). `Role` / `Permission` / `RolePermission` already exist and back `firm.roles`.
- Migration `prisma/migrations/00000000000004_firm_module/migration.sql` with GRANT + RLS statements.
- `src/lib/firm.functions.ts` — list/upsert/delete + assignment mutations for each entity, all guarded by `FIRM_ADMIN` / `SUPER_ADMIN`.
- Rewrites of: `firm.index.tsx`, `firm.clients.tsx`, `firm.clients-new.tsx`, `firm.staff.tsx`, `firm.tasks.tsx`, `firm.engagements.tsx`, `firm.time.tsx`, `firm.documents.tsx`, `firm.reports.tsx`, `firm.invoices.tsx`, `firm.audit.tsx`, `firm.settings.tsx`, `firm.roles.tsx`, `components/firm/FirmShell.tsx`, `components/firm/PlanEntitlementsDrawer.tsx`.
- Delete `src/lib/mock/firm.tsx` and remove the `FirmProvider` from `src/routes/firm.tsx`.
- Typecheck.

Subsequent turns will each carry one more module in the table above using the same recipe. Please confirm this order (or reorder) and I will start immediately with Module 1 — Firm.
