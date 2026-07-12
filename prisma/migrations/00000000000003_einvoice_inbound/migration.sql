-- Fiksu e-invoice extensions: inbound invoices + per-company settings.

CREATE TABLE IF NOT EXISTS "inbound_einvoices" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id"     UUID NOT NULL,
  "format"         TEXT NOT NULL DEFAULT 'UBL',
  "source_ref"     TEXT,
  "seller_name"    TEXT NOT NULL,
  "seller_vat_id"  TEXT,
  "invoice_number" TEXT NOT NULL,
  "issue_date"     TIMESTAMP(3) NOT NULL,
  "due_date"       TIMESTAMP(3),
  "currency"       TEXT NOT NULL DEFAULT 'EUR',
  "total_cents"    INTEGER NOT NULL DEFAULT 0,
  "tax_cents"      INTEGER NOT NULL DEFAULT 0,
  "status"         TEXT NOT NULL DEFAULT 'RECEIVED',
  "xml"            TEXT NOT NULL,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "inbound_einvoices_company_id_idx" ON "inbound_einvoices" ("company_id");
CREATE INDEX IF NOT EXISTS "inbound_einvoices_company_number_idx" ON "inbound_einvoices" ("company_id", "invoice_number");
ALTER TABLE "inbound_einvoices" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "inbound_einvoices";
CREATE POLICY "tenant_isolation" ON "inbound_einvoices"
  USING (company_id::text = current_setting('app.current_company_id', true))
  WITH CHECK (company_id::text = current_setting('app.current_company_id', true));

CREATE TABLE IF NOT EXISTS "einvoice_settings" (
  "company_id"     UUID PRIMARY KEY,
  "webhook_url"    TEXT,
  "default_format" TEXT NOT NULL DEFAULT 'FINVOICE',
  "auto_send"      BOOLEAN NOT NULL DEFAULT FALSE,
  "updated_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "einvoice_settings" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON "einvoice_settings";
CREATE POLICY "tenant_isolation" ON "einvoice_settings"
  USING (company_id::text = current_setting('app.current_company_id', true))
  WITH CHECK (company_id::text = current_setting('app.current_company_id', true));
