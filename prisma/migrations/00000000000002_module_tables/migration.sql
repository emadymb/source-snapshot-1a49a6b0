-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('PUBLISHED', 'DRAFT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PlanKind" AS ENUM ('FREE', 'PAID', 'PRIVATE');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "PeppolStatus" AS ENUM ('NOT_SENT', 'QUEUED', 'SENT', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'APPROVED', 'PAID');

-- CreateEnum
CREATE TYPE "SettingScope" AS ENUM ('PLATFORM', 'WORKSPACE');

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "workspace_id" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "pages" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "meta_title" TEXT NOT NULL DEFAULT '',
    "meta_description" TEXT NOT NULL DEFAULT '',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_categories" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "featured_image" TEXT,
    "category_id" UUID,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "author_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menus" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT 'header',
    "items" JSONB NOT NULL DEFAULT '[]',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "themes" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "primary_color" TEXT NOT NULL DEFAULT '#6366f1',
    "dark_mode_enabled" BOOLEAN NOT NULL DEFAULT true,
    "rtl_enabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seo_settings" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "path" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "keywords" TEXT NOT NULL DEFAULT '',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seo_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" "PlanKind" NOT NULL DEFAULT 'PAID',
    "interval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY',
    "price_cents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "trial_days" INTEGER NOT NULL DEFAULT 0,
    "max_users" INTEGER,
    "max_companies" INTEGER,
    "max_invoices" INTEGER,
    "entitlements" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "company_id" UUID,
    "plan_id" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMP(3),
    "auto_renew" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_requests" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_gateways" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_gateways_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "subscription_id" UUID,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chart_of_accounts" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "parent_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chart_of_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "vat_id" TEXT,
    "country" TEXT NOT NULL DEFAULT 'FI',
    "email" TEXT,
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "customer_id" UUID,
    "number" TEXT NOT NULL,
    "issue_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3),
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "subtotal_cents" INTEGER NOT NULL DEFAULT 0,
    "tax_cents" INTEGER NOT NULL DEFAULT 0,
    "total_cents" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unit_price_cents" INTEGER NOT NULL,
    "vat_rate" DOUBLE PRECISION NOT NULL DEFAULT 25.5,
    "line_total_cents" INTEGER NOT NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_xml" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'UBL',
    "xml" TEXT NOT NULL,
    "peppol_status" "PeppolStatus" NOT NULL DEFAULT 'NOT_SENT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_xml_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "memo" TEXT,
    "debit_account_id" UUID,
    "credit_account_id" UUID,
    "amount_cents" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_conversations" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "user_id" UUID,
    "title" TEXT NOT NULL DEFAULT 'New chat',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_logs" (
    "id" UUID NOT NULL,
    "workspace_id" UUID,
    "user_id" UUID,
    "model" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'chat',
    "tokens_in" INTEGER NOT NULL DEFAULT 0,
    "tokens_out" INTEGER NOT NULL DEFAULT 0,
    "cost_cents" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "latency_ms" INTEGER NOT NULL DEFAULT 0,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "workspace_id" UUID,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "source" TEXT NOT NULL DEFAULT 'widget',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "company_id" UUID,
    "user_id" UUID,
    "full_name" TEXT NOT NULL,
    "email" TEXT,
    "department" TEXT,
    "position" TEXT,
    "base_salary_cents" INTEGER NOT NULL DEFAULT 0,
    "hire_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "check_in" TIMESTAMP(3),
    "check_out" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_types" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "annual_days" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "leave_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaves" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "leave_type_id" UUID,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leaves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holidays" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payrolls" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "base_cents" INTEGER NOT NULL DEFAULT 0,
    "allowances_cents" INTEGER NOT NULL DEFAULT 0,
    "deductions_cents" INTEGER NOT NULL DEFAULT 0,
    "net_cents" INTEGER NOT NULL DEFAULT 0,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payrolls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_allowances" (
    "id" UUID NOT NULL,
    "payroll_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,

    CONSTRAINT "payroll_allowances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_deductions" (
    "id" UUID NOT NULL,
    "payroll_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,

    CONSTRAINT "payroll_deductions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "todos" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "user_id" UUID,
    "title" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "due_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "todos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memos" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "author_id" UUID,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminders" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "user_id" UUID,
    "title" TEXT NOT NULL,
    "remind_at" TIMESTAMP(3) NOT NULL,
    "recurrence" TEXT NOT NULL DEFAULT 'once',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "sender_id" UUID,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "audience" TEXT NOT NULL DEFAULT 'all',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "company_id" UUID,
    "category" TEXT NOT NULL DEFAULT 'receipts',
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mime" TEXT NOT NULL DEFAULT 'application/octet-stream',
    "size_bytes" INTEGER NOT NULL DEFAULT 0,
    "uploaded_by" UUID,
    "linked_type" TEXT,
    "linked_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_versions" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "path" TEXT NOT NULL,
    "note" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "workspace_id" UUID,
    "user_id" UUID,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "changes" JSONB NOT NULL DEFAULT '{}',
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" UUID NOT NULL,
    "scope" "SettingScope" NOT NULL DEFAULT 'PLATFORM',
    "workspace_id" UUID,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backups" (
    "id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL DEFAULT 0,
    "location" TEXT NOT NULL DEFAULT 'local',
    "status" TEXT NOT NULL DEFAULT 'completed',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "roles_workspace_id_idx" ON "roles"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE INDEX "pages_workspace_id_idx" ON "pages"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "pages_workspace_id_slug_key" ON "pages"("workspace_id", "slug");

-- CreateIndex
CREATE INDEX "blog_categories_workspace_id_idx" ON "blog_categories"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "blog_categories_workspace_id_slug_key" ON "blog_categories"("workspace_id", "slug");

-- CreateIndex
CREATE INDEX "blog_posts_workspace_id_idx" ON "blog_posts"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_workspace_id_slug_key" ON "blog_posts"("workspace_id", "slug");

-- CreateIndex
CREATE INDEX "menus_workspace_id_idx" ON "menus"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "themes_workspace_id_key" ON "themes"("workspace_id");

-- CreateIndex
CREATE INDEX "seo_settings_workspace_id_idx" ON "seo_settings"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "seo_settings_workspace_id_path_key" ON "seo_settings"("workspace_id", "path");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_slug_key" ON "subscription_plans"("slug");

-- CreateIndex
CREATE INDEX "subscriptions_workspace_id_idx" ON "subscriptions"("workspace_id");

-- CreateIndex
CREATE INDEX "subscription_requests_workspace_id_idx" ON "subscription_requests"("workspace_id");

-- CreateIndex
CREATE INDEX "transactions_workspace_id_idx" ON "transactions"("workspace_id");

-- CreateIndex
CREATE INDEX "chart_of_accounts_company_id_idx" ON "chart_of_accounts"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "chart_of_accounts_company_id_code_key" ON "chart_of_accounts"("company_id", "code");

-- CreateIndex
CREATE INDEX "customers_company_id_idx" ON "customers"("company_id");

-- CreateIndex
CREATE INDEX "invoices_company_id_idx" ON "invoices"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_company_id_number_key" ON "invoices"("company_id", "number");

-- CreateIndex
CREATE INDEX "invoice_items_invoice_id_idx" ON "invoice_items"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_xml_invoice_id_key" ON "invoice_xml"("invoice_id");

-- CreateIndex
CREATE INDEX "journal_entries_company_id_idx" ON "journal_entries"("company_id");

-- CreateIndex
CREATE INDEX "ai_conversations_workspace_id_idx" ON "ai_conversations"("workspace_id");

-- CreateIndex
CREATE INDEX "ai_messages_conversation_id_idx" ON "ai_messages"("conversation_id");

-- CreateIndex
CREATE INDEX "ai_usage_logs_workspace_id_idx" ON "ai_usage_logs"("workspace_id");

-- CreateIndex
CREATE INDEX "leads_workspace_id_idx" ON "leads"("workspace_id");

-- CreateIndex
CREATE INDEX "employees_workspace_id_idx" ON "employees"("workspace_id");

-- CreateIndex
CREATE INDEX "attendance_employee_id_idx" ON "attendance"("employee_id");

-- CreateIndex
CREATE INDEX "leave_types_workspace_id_idx" ON "leave_types"("workspace_id");

-- CreateIndex
CREATE INDEX "leaves_workspace_id_idx" ON "leaves"("workspace_id");

-- CreateIndex
CREATE INDEX "holidays_workspace_id_idx" ON "holidays"("workspace_id");

-- CreateIndex
CREATE INDEX "payrolls_workspace_id_idx" ON "payrolls"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "payrolls_employee_id_month_year_key" ON "payrolls"("employee_id", "month", "year");

-- CreateIndex
CREATE INDEX "payroll_allowances_payroll_id_idx" ON "payroll_allowances"("payroll_id");

-- CreateIndex
CREATE INDEX "payroll_deductions_payroll_id_idx" ON "payroll_deductions"("payroll_id");

-- CreateIndex
CREATE INDEX "todos_workspace_id_idx" ON "todos"("workspace_id");

-- CreateIndex
CREATE INDEX "memos_workspace_id_idx" ON "memos"("workspace_id");

-- CreateIndex
CREATE INDEX "reminders_workspace_id_idx" ON "reminders"("workspace_id");

-- CreateIndex
CREATE INDEX "messages_workspace_id_idx" ON "messages"("workspace_id");

-- CreateIndex
CREATE INDEX "documents_workspace_id_idx" ON "documents"("workspace_id");

-- CreateIndex
CREATE INDEX "document_versions_document_id_idx" ON "document_versions"("document_id");

-- CreateIndex
CREATE INDEX "audit_logs_workspace_id_idx" ON "audit_logs"("workspace_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "settings_scope_workspace_id_key_key" ON "settings"("scope", "workspace_id", "key");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_xml" ADD CONSTRAINT "invoice_xml_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_allowances" ADD CONSTRAINT "payroll_allowances_payroll_id_fkey" FOREIGN KEY ("payroll_id") REFERENCES "payrolls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_deductions" ADD CONSTRAINT "payroll_deductions_payroll_id_fkey" FOREIGN KEY ("payroll_id") REFERENCES "payrolls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ============================================================================
-- Fiksu module tables — RLS, tenant isolation & grants (auto-generated)
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public."pages" TO fiksu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."blog_categories" TO fiksu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."blog_posts" TO fiksu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."menus" TO fiksu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."themes" TO fiksu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."seo_settings" TO fiksu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."subscriptions" TO fiksu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."subscription_requests" TO fiksu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."transactions" TO fiksu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."ai_conversations" TO fiksu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."employees" TO fiksu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."leave_types" TO fiksu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."leaves" TO fiksu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."holidays" TO fiksu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."payrolls" TO fiksu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."todos" TO fiksu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."memos" TO fiksu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."reminders" TO fiksu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."messages" TO fiksu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."documents" TO fiksu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."chart_of_accounts" TO fiksu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."customers" TO fiksu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."invoices" TO fiksu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."journal_entries" TO fiksu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."leads" TO fiksu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."ai_usage_logs" TO fiksu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."audit_logs" TO fiksu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."settings" TO fiksu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."roles" TO fiksu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."subscription_plans" TO fiksu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."payment_gateways" TO fiksu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."backups" TO fiksu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."permissions" TO fiksu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."role_permissions" TO fiksu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."invoice_items" TO fiksu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."invoice_xml" TO fiksu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."ai_messages" TO fiksu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."payroll_allowances" TO fiksu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."payroll_deductions" TO fiksu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."document_versions" TO fiksu_app;

ALTER TABLE public."pages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."pages" FORCE ROW LEVEL SECURITY;
CREATE POLICY pages_tenant ON public."pages" FOR ALL USING (public.can_access_workspace(public.current_app_user(), workspace_id)) WITH CHECK (public.can_access_workspace(public.current_app_user(), workspace_id));

ALTER TABLE public."blog_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."blog_categories" FORCE ROW LEVEL SECURITY;
CREATE POLICY blog_categories_tenant ON public."blog_categories" FOR ALL USING (public.can_access_workspace(public.current_app_user(), workspace_id)) WITH CHECK (public.can_access_workspace(public.current_app_user(), workspace_id));

ALTER TABLE public."blog_posts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."blog_posts" FORCE ROW LEVEL SECURITY;
CREATE POLICY blog_posts_tenant ON public."blog_posts" FOR ALL USING (public.can_access_workspace(public.current_app_user(), workspace_id)) WITH CHECK (public.can_access_workspace(public.current_app_user(), workspace_id));

ALTER TABLE public."menus" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."menus" FORCE ROW LEVEL SECURITY;
CREATE POLICY menus_tenant ON public."menus" FOR ALL USING (public.can_access_workspace(public.current_app_user(), workspace_id)) WITH CHECK (public.can_access_workspace(public.current_app_user(), workspace_id));

ALTER TABLE public."themes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."themes" FORCE ROW LEVEL SECURITY;
CREATE POLICY themes_tenant ON public."themes" FOR ALL USING (public.can_access_workspace(public.current_app_user(), workspace_id)) WITH CHECK (public.can_access_workspace(public.current_app_user(), workspace_id));

ALTER TABLE public."seo_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."seo_settings" FORCE ROW LEVEL SECURITY;
CREATE POLICY seo_settings_tenant ON public."seo_settings" FOR ALL USING (public.can_access_workspace(public.current_app_user(), workspace_id)) WITH CHECK (public.can_access_workspace(public.current_app_user(), workspace_id));

ALTER TABLE public."subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."subscriptions" FORCE ROW LEVEL SECURITY;
CREATE POLICY subscriptions_tenant ON public."subscriptions" FOR ALL USING (public.can_access_workspace(public.current_app_user(), workspace_id)) WITH CHECK (public.can_access_workspace(public.current_app_user(), workspace_id));

ALTER TABLE public."subscription_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."subscription_requests" FORCE ROW LEVEL SECURITY;
CREATE POLICY subscription_requests_tenant ON public."subscription_requests" FOR ALL USING (public.can_access_workspace(public.current_app_user(), workspace_id)) WITH CHECK (public.can_access_workspace(public.current_app_user(), workspace_id));

ALTER TABLE public."transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."transactions" FORCE ROW LEVEL SECURITY;
CREATE POLICY transactions_tenant ON public."transactions" FOR ALL USING (public.can_access_workspace(public.current_app_user(), workspace_id)) WITH CHECK (public.can_access_workspace(public.current_app_user(), workspace_id));

ALTER TABLE public."ai_conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ai_conversations" FORCE ROW LEVEL SECURITY;
CREATE POLICY ai_conversations_tenant ON public."ai_conversations" FOR ALL USING (public.can_access_workspace(public.current_app_user(), workspace_id)) WITH CHECK (public.can_access_workspace(public.current_app_user(), workspace_id));

ALTER TABLE public."employees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."employees" FORCE ROW LEVEL SECURITY;
CREATE POLICY employees_tenant ON public."employees" FOR ALL USING (public.can_access_workspace(public.current_app_user(), workspace_id)) WITH CHECK (public.can_access_workspace(public.current_app_user(), workspace_id));

ALTER TABLE public."leave_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."leave_types" FORCE ROW LEVEL SECURITY;
CREATE POLICY leave_types_tenant ON public."leave_types" FOR ALL USING (public.can_access_workspace(public.current_app_user(), workspace_id)) WITH CHECK (public.can_access_workspace(public.current_app_user(), workspace_id));

ALTER TABLE public."leaves" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."leaves" FORCE ROW LEVEL SECURITY;
CREATE POLICY leaves_tenant ON public."leaves" FOR ALL USING (public.can_access_workspace(public.current_app_user(), workspace_id)) WITH CHECK (public.can_access_workspace(public.current_app_user(), workspace_id));

ALTER TABLE public."holidays" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."holidays" FORCE ROW LEVEL SECURITY;
CREATE POLICY holidays_tenant ON public."holidays" FOR ALL USING (public.can_access_workspace(public.current_app_user(), workspace_id)) WITH CHECK (public.can_access_workspace(public.current_app_user(), workspace_id));

ALTER TABLE public."payrolls" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."payrolls" FORCE ROW LEVEL SECURITY;
CREATE POLICY payrolls_tenant ON public."payrolls" FOR ALL USING (public.can_access_workspace(public.current_app_user(), workspace_id)) WITH CHECK (public.can_access_workspace(public.current_app_user(), workspace_id));

ALTER TABLE public."todos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."todos" FORCE ROW LEVEL SECURITY;
CREATE POLICY todos_tenant ON public."todos" FOR ALL USING (public.can_access_workspace(public.current_app_user(), workspace_id)) WITH CHECK (public.can_access_workspace(public.current_app_user(), workspace_id));

ALTER TABLE public."memos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."memos" FORCE ROW LEVEL SECURITY;
CREATE POLICY memos_tenant ON public."memos" FOR ALL USING (public.can_access_workspace(public.current_app_user(), workspace_id)) WITH CHECK (public.can_access_workspace(public.current_app_user(), workspace_id));

ALTER TABLE public."reminders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."reminders" FORCE ROW LEVEL SECURITY;
CREATE POLICY reminders_tenant ON public."reminders" FOR ALL USING (public.can_access_workspace(public.current_app_user(), workspace_id)) WITH CHECK (public.can_access_workspace(public.current_app_user(), workspace_id));

ALTER TABLE public."messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."messages" FORCE ROW LEVEL SECURITY;
CREATE POLICY messages_tenant ON public."messages" FOR ALL USING (public.can_access_workspace(public.current_app_user(), workspace_id)) WITH CHECK (public.can_access_workspace(public.current_app_user(), workspace_id));

ALTER TABLE public."documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."documents" FORCE ROW LEVEL SECURITY;
CREATE POLICY documents_tenant ON public."documents" FOR ALL USING (public.can_access_workspace(public.current_app_user(), workspace_id)) WITH CHECK (public.can_access_workspace(public.current_app_user(), workspace_id));

ALTER TABLE public."chart_of_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."chart_of_accounts" FORCE ROW LEVEL SECURITY;
CREATE POLICY chart_of_accounts_tenant ON public."chart_of_accounts" FOR ALL USING (public.can_access_company(public.current_app_user(), company_id)) WITH CHECK (public.can_access_company(public.current_app_user(), company_id));

ALTER TABLE public."customers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."customers" FORCE ROW LEVEL SECURITY;
CREATE POLICY customers_tenant ON public."customers" FOR ALL USING (public.can_access_company(public.current_app_user(), company_id)) WITH CHECK (public.can_access_company(public.current_app_user(), company_id));

ALTER TABLE public."invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."invoices" FORCE ROW LEVEL SECURITY;
CREATE POLICY invoices_tenant ON public."invoices" FOR ALL USING (public.can_access_company(public.current_app_user(), company_id)) WITH CHECK (public.can_access_company(public.current_app_user(), company_id));

ALTER TABLE public."journal_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."journal_entries" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_entries_tenant ON public."journal_entries" FOR ALL USING (public.can_access_company(public.current_app_user(), company_id)) WITH CHECK (public.can_access_company(public.current_app_user(), company_id));

ALTER TABLE public."leads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."leads" FORCE ROW LEVEL SECURITY;
CREATE POLICY leads_tenant ON public."leads" FOR ALL USING (public.is_super_admin(public.current_app_user()) OR (workspace_id IS NOT NULL AND public.can_access_workspace(public.current_app_user(), workspace_id))) WITH CHECK (public.is_super_admin(public.current_app_user()) OR (workspace_id IS NOT NULL AND public.can_access_workspace(public.current_app_user(), workspace_id)));

ALTER TABLE public."ai_usage_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ai_usage_logs" FORCE ROW LEVEL SECURITY;
CREATE POLICY ai_usage_logs_tenant ON public."ai_usage_logs" FOR ALL USING (public.is_super_admin(public.current_app_user()) OR (workspace_id IS NOT NULL AND public.can_access_workspace(public.current_app_user(), workspace_id))) WITH CHECK (public.is_super_admin(public.current_app_user()) OR (workspace_id IS NOT NULL AND public.can_access_workspace(public.current_app_user(), workspace_id)));

ALTER TABLE public."audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."audit_logs" FORCE ROW LEVEL SECURITY;
CREATE POLICY audit_logs_tenant ON public."audit_logs" FOR ALL USING (public.is_super_admin(public.current_app_user()) OR (workspace_id IS NOT NULL AND public.can_access_workspace(public.current_app_user(), workspace_id))) WITH CHECK (public.is_super_admin(public.current_app_user()) OR (workspace_id IS NOT NULL AND public.can_access_workspace(public.current_app_user(), workspace_id)));

ALTER TABLE public."settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."settings" FORCE ROW LEVEL SECURITY;
CREATE POLICY settings_tenant ON public."settings" FOR ALL USING (public.is_super_admin(public.current_app_user()) OR (workspace_id IS NOT NULL AND public.can_access_workspace(public.current_app_user(), workspace_id))) WITH CHECK (public.is_super_admin(public.current_app_user()) OR (workspace_id IS NOT NULL AND public.can_access_workspace(public.current_app_user(), workspace_id)));

ALTER TABLE public."roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."roles" FORCE ROW LEVEL SECURITY;
CREATE POLICY roles_tenant ON public."roles" FOR ALL USING (public.is_super_admin(public.current_app_user()) OR (workspace_id IS NOT NULL AND public.can_access_workspace(public.current_app_user(), workspace_id))) WITH CHECK (public.is_super_admin(public.current_app_user()) OR (workspace_id IS NOT NULL AND public.can_access_workspace(public.current_app_user(), workspace_id)));

ALTER TABLE public."subscription_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."subscription_plans" FORCE ROW LEVEL SECURITY;
CREATE POLICY subscription_plans_read ON public."subscription_plans" FOR SELECT USING (public.current_app_user() IS NOT NULL);
CREATE POLICY subscription_plans_admin ON public."subscription_plans" FOR ALL USING (public.is_super_admin(public.current_app_user())) WITH CHECK (public.is_super_admin(public.current_app_user()));

ALTER TABLE public."payment_gateways" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."payment_gateways" FORCE ROW LEVEL SECURITY;
CREATE POLICY payment_gateways_admin ON public."payment_gateways" FOR ALL USING (public.is_super_admin(public.current_app_user())) WITH CHECK (public.is_super_admin(public.current_app_user()));

ALTER TABLE public."backups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."backups" FORCE ROW LEVEL SECURITY;
CREATE POLICY backups_admin ON public."backups" FOR ALL USING (public.is_super_admin(public.current_app_user())) WITH CHECK (public.is_super_admin(public.current_app_user()));

ALTER TABLE public."permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."permissions" FORCE ROW LEVEL SECURITY;
CREATE POLICY permissions_read ON public."permissions" FOR SELECT USING (public.current_app_user() IS NOT NULL);
CREATE POLICY permissions_admin ON public."permissions" FOR ALL USING (public.is_super_admin(public.current_app_user())) WITH CHECK (public.is_super_admin(public.current_app_user()));

ALTER TABLE public."role_permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."role_permissions" FORCE ROW LEVEL SECURITY;
CREATE POLICY role_permissions_tenant ON public."role_permissions" FOR ALL USING (public.is_super_admin(public.current_app_user()) OR EXISTS (SELECT 1 FROM public."roles" p WHERE p.id = role_id AND p.workspace_id IS NOT NULL AND public.can_access_workspace(public.current_app_user(), p.workspace_id))) WITH CHECK (public.is_super_admin(public.current_app_user()) OR EXISTS (SELECT 1 FROM public."roles" p WHERE p.id = role_id AND p.workspace_id IS NOT NULL AND public.can_access_workspace(public.current_app_user(), p.workspace_id)));

ALTER TABLE public."invoice_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."invoice_items" FORCE ROW LEVEL SECURITY;
CREATE POLICY invoice_items_tenant ON public."invoice_items" FOR ALL USING (EXISTS (SELECT 1 FROM public."invoices" p WHERE p.id = invoice_id AND public.can_access_company(public.current_app_user(), p.company_id))) WITH CHECK (EXISTS (SELECT 1 FROM public."invoices" p WHERE p.id = invoice_id AND public.can_access_company(public.current_app_user(), p.company_id)));

ALTER TABLE public."invoice_xml" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."invoice_xml" FORCE ROW LEVEL SECURITY;
CREATE POLICY invoice_xml_tenant ON public."invoice_xml" FOR ALL USING (EXISTS (SELECT 1 FROM public."invoices" p WHERE p.id = invoice_id AND public.can_access_company(public.current_app_user(), p.company_id))) WITH CHECK (EXISTS (SELECT 1 FROM public."invoices" p WHERE p.id = invoice_id AND public.can_access_company(public.current_app_user(), p.company_id)));

ALTER TABLE public."ai_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ai_messages" FORCE ROW LEVEL SECURITY;
CREATE POLICY ai_messages_tenant ON public."ai_messages" FOR ALL USING (EXISTS (SELECT 1 FROM public."ai_conversations" p WHERE p.id = conversation_id AND public.can_access_workspace(public.current_app_user(), p.workspace_id))) WITH CHECK (EXISTS (SELECT 1 FROM public."ai_conversations" p WHERE p.id = conversation_id AND public.can_access_workspace(public.current_app_user(), p.workspace_id)));

ALTER TABLE public."payroll_allowances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."payroll_allowances" FORCE ROW LEVEL SECURITY;
CREATE POLICY payroll_allowances_tenant ON public."payroll_allowances" FOR ALL USING (EXISTS (SELECT 1 FROM public."payrolls" p WHERE p.id = payroll_id AND public.can_access_workspace(public.current_app_user(), p.workspace_id))) WITH CHECK (EXISTS (SELECT 1 FROM public."payrolls" p WHERE p.id = payroll_id AND public.can_access_workspace(public.current_app_user(), p.workspace_id)));

ALTER TABLE public."payroll_deductions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."payroll_deductions" FORCE ROW LEVEL SECURITY;
CREATE POLICY payroll_deductions_tenant ON public."payroll_deductions" FOR ALL USING (EXISTS (SELECT 1 FROM public."payrolls" p WHERE p.id = payroll_id AND public.can_access_workspace(public.current_app_user(), p.workspace_id))) WITH CHECK (EXISTS (SELECT 1 FROM public."payrolls" p WHERE p.id = payroll_id AND public.can_access_workspace(public.current_app_user(), p.workspace_id)));

ALTER TABLE public."document_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."document_versions" FORCE ROW LEVEL SECURITY;
CREATE POLICY document_versions_tenant ON public."document_versions" FOR ALL USING (EXISTS (SELECT 1 FROM public."documents" p WHERE p.id = document_id AND public.can_access_workspace(public.current_app_user(), p.workspace_id))) WITH CHECK (EXISTS (SELECT 1 FROM public."documents" p WHERE p.id = document_id AND public.can_access_workspace(public.current_app_user(), p.workspace_id)));
