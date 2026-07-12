-- CreateTable
CREATE TABLE "receipt_extractions" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "company_id" UUID,
    "uploaded_by" UUID,
    "status" TEXT NOT NULL DEFAULT 'sent_to_accountant',
    "model" TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
    "image_mime" TEXT NOT NULL DEFAULT 'image/jpeg',
    "raw_text" TEXT,
    "parsed_rows" JSONB NOT NULL,
    "csv_content" TEXT NOT NULL,
    "supplier" TEXT,
    "total_amount" DECIMAL(14, 2),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "message_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipt_extractions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "receipt_extractions_workspace_id_idx" ON "receipt_extractions"("workspace_id");
CREATE INDEX "receipt_extractions_company_id_idx" ON "receipt_extractions"("company_id");

-- Grants for the least-privileged app role (matches other module tables).
GRANT SELECT, INSERT, UPDATE, DELETE ON public."receipt_extractions" TO fiksu_app;

-- Row Level Security: scope by workspace via can_access_workspace.
ALTER TABLE public."receipt_extractions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."receipt_extractions" FORCE ROW LEVEL SECURITY;
CREATE POLICY receipt_extractions_access ON public."receipt_extractions"
  FOR SELECT USING (public.can_access_workspace(public.current_app_user(), workspace_id));
CREATE POLICY receipt_extractions_write ON public."receipt_extractions"
  FOR ALL USING (public.can_access_workspace(public.current_app_user(), workspace_id))
  WITH CHECK (public.can_access_workspace(public.current_app_user(), workspace_id));