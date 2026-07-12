-- Expense tracking (separate from full Invoice/InvoiceItem)
CREATE TYPE "ExpenseStatus" AS ENUM ('PENDING', 'APPROVED', 'REIMBURSED', 'REJECTED');

CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "created_by" UUID,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vendor" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Other',
    "amount_cents" INTEGER NOT NULL,
    "vat_rate" DOUBLE PRECISION NOT NULL DEFAULT 24,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "notes" TEXT,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'PENDING',
    "receipt_extraction_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "expenses_receipt_extraction_id_key" ON "expenses"("receipt_extraction_id");
CREATE INDEX "expenses_company_id_idx" ON "expenses"("company_id");

GRANT SELECT, INSERT, UPDATE, DELETE ON public."expenses" TO fiksu_app;

ALTER TABLE public."expenses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."expenses" FORCE ROW LEVEL SECURITY;
CREATE POLICY expenses_tenant ON public."expenses"
  FOR ALL USING (public.can_access_company(public.current_app_user(), company_id))
  WITH CHECK (public.can_access_company(public.current_app_user(), company_id));