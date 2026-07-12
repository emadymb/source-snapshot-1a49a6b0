-- Firm module: workspace-scoped clients, staff, roles, engagements, tasks, invoices.

CREATE TYPE "FirmStaffStatus" AS ENUM ('ACTIVE','INVITED','SUSPENDED');
CREATE TYPE "FirmClientStatus" AS ENUM ('ACTIVE','ONBOARDING','PAUSED','CHURNED');
CREATE TYPE "FirmEngagementType" AS ENUM ('MONTHLY_BOOKKEEPING','ANNUAL_CLOSE','VAT_RETURN','PAYROLL','ADVISORY');
CREATE TYPE "FirmEngagementStatus" AS ENUM ('DRAFT','ACTIVE','ON_HOLD','COMPLETED');
CREATE TYPE "FirmTaskStatus" AS ENUM ('TODO','IN_PROGRESS','REVIEW','DONE');
CREATE TYPE "FirmTaskPriority" AS ENUM ('LOW','MED','HIGH','URGENT');
CREATE TYPE "FirmInvoiceStatus" AS ENUM ('DRAFT','SENT','PAID','OVERDUE');

CREATE TABLE "firm_role_defs" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL,
  "name"         TEXT NOT NULL,
  "color"        TEXT NOT NULL DEFAULT 'sky',
  "description"  TEXT NOT NULL DEFAULT '',
  "permissions"  TEXT[] NOT NULL DEFAULT '{}',
  "is_system"    BOOLEAN NOT NULL DEFAULT false,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL
);
CREATE INDEX ON "firm_role_defs" ("workspace_id");

CREATE TABLE "firm_staff" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id"  UUID NOT NULL,
  "name"          TEXT NOT NULL,
  "email"         TEXT NOT NULL,
  "role_id"       UUID,
  "status"        "FirmStaffStatus" NOT NULL DEFAULT 'ACTIVE',
  "client_ids"    UUID[] NOT NULL DEFAULT '{}',
  "billable_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "utilization"   INTEGER NOT NULL DEFAULT 0,
  "avatar_seed"   TEXT NOT NULL DEFAULT '',
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX ON "firm_staff" ("workspace_id","email");
CREATE INDEX ON "firm_staff" ("workspace_id");

CREATE TABLE "firm_client_cos" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id"     UUID NOT NULL,
  "name"             TEXT NOT NULL,
  "contact"          TEXT NOT NULL DEFAULT '',
  "email"            TEXT NOT NULL DEFAULT '',
  "vat_id"           TEXT NOT NULL DEFAULT '',
  "industry"         TEXT NOT NULL DEFAULT '',
  "plan"             TEXT NOT NULL DEFAULT 'Starter',
  "mrr"              DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status"           "FirmClientStatus" NOT NULL DEFAULT 'ACTIVE',
  "open_tasks"       INTEGER NOT NULL DEFAULT 0,
  "overdue"          INTEGER NOT NULL DEFAULT 0,
  "primary_staff_id" UUID,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3) NOT NULL
);
CREATE INDEX ON "firm_client_cos" ("workspace_id");

CREATE TABLE "firm_engagements" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id"  UUID NOT NULL,
  "client_id"     UUID NOT NULL,
  "title"         TEXT NOT NULL,
  "type"          "FirmEngagementType" NOT NULL DEFAULT 'MONTHLY_BOOKKEEPING',
  "status"        "FirmEngagementStatus" NOT NULL DEFAULT 'DRAFT',
  "start_date"    DATE NOT NULL,
  "end_date"      DATE,
  "budget_hours"  INTEGER NOT NULL DEFAULT 0,
  "spent_hours"   INTEGER NOT NULL DEFAULT 0,
  "fee"           DOUBLE PRECISION NOT NULL DEFAULT 0,
  "lead_staff_id" UUID,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3) NOT NULL
);
CREATE INDEX ON "firm_engagements" ("workspace_id");
CREATE INDEX ON "firm_engagements" ("workspace_id","client_id");

CREATE TABLE "firm_tasks" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id"  UUID NOT NULL,
  "client_id"     UUID NOT NULL,
  "engagement_id" UUID,
  "assignee_id"   UUID,
  "title"         TEXT NOT NULL,
  "status"        "FirmTaskStatus" NOT NULL DEFAULT 'TODO',
  "priority"      "FirmTaskPriority" NOT NULL DEFAULT 'MED',
  "due_date"      DATE,
  "hours"         DOUBLE PRECISION NOT NULL DEFAULT 0,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3) NOT NULL
);
CREATE INDEX ON "firm_tasks" ("workspace_id");
CREATE INDEX ON "firm_tasks" ("workspace_id","assignee_id");

CREATE TABLE "firm_billing_invoices" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL,
  "number"       TEXT NOT NULL,
  "client_id"    UUID NOT NULL,
  "amount"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  "issued"       DATE NOT NULL,
  "due"          DATE NOT NULL,
  "status"       "FirmInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX ON "firm_billing_invoices" ("workspace_id","number");
CREATE INDEX ON "firm_billing_invoices" ("workspace_id");

-- Enable RLS + tenant policies via existing can_access_workspace helper.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['firm_role_defs','firm_staff','firm_client_cos','firm_engagements','firm_tasks','firm_billing_invoices'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation" ON %I', t);
    EXECUTE format($f$CREATE POLICY "tenant_isolation" ON %I
      USING (public.can_access_workspace(public.current_app_user(), workspace_id))
      WITH CHECK (public.can_access_workspace(public.current_app_user(), workspace_id))$f$, t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO fiksu_app', t);
  END LOOP;
END $$;