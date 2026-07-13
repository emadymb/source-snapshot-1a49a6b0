// Accounting & E-Invoicing server functions — REAL data (Prisma + Postgres RLS).
//
// Every handler resolves the authenticated user + active company from the access
// cookie and runs queries through withTenant(), so RLS scopes reads/writes to
// the caller's company. Mutations are audited into audit_logs.
//
// E-invoicing: invoices can be rendered to UBL (PEPPOL BIS 3.0) or Finvoice XML
// and dispatched through a PEPPOL access point. The access point call is mocked
// unless PEPPOL_API_URL + PEPPOL_API_KEY are configured, so the flow works in
// every environment.
//
// Preview safety: when no database is reachable (the Lovable preview has no
// Postgres) reads fall back to a bundled demo dataset so the UI stays usable.
// Writes require a real database.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ---------------------------------------------------------------------------
// DTOs — mirror the shapes the accounting UI consumes.
// ---------------------------------------------------------------------------
export type UiInvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "canceled";
export type UiPeppolStatus = "not_sent" | "queued" | "sent" | "delivered" | "failed";
export type UiAccountType = "asset" | "liability" | "equity" | "income" | "expense";

export interface AccountDTO {
  id: string;
  code: string;
  name: string;
  type: UiAccountType;
  parentId?: string | null;
}

export interface CustomerDTO {
  id: string;
  name: string;
  vatId?: string | null;
  country: string;
  email?: string | null;
}

export interface InvoiceLineDTO {
  id?: string;
  description: string;
  qty: number;
  unitPrice: number; // EUR
  vatRate: number; // percent
}

export interface InvoiceDTO {
  id: string;
  number: string;
  customerId?: string | null;
  customerName: string;
  issueDate: string; // YYYY-MM-DD
  dueDate?: string | null;
  status: UiInvoiceStatus;
  currency: string;
  subtotal: number; // EUR
  tax: number;
  total: number;
  channel: "Finvoice" | "PEPPOL" | "None";
  peppolStatus: UiPeppolStatus;
  notes?: string | null;
  lines: InvoiceLineDTO[];
}

export interface AccountingSummary {
  revenue: number;
  outstanding: number;
  overdue: number;
  paid: number;
  invoiceCount: number;
}

// ---------------------------------------------------------------------------
// Enum mapping
// ---------------------------------------------------------------------------
const toDbStatus = (s: UiInvoiceStatus) =>
  ({ draft: "DRAFT", sent: "SENT", paid: "PAID", overdue: "OVERDUE", canceled: "CANCELED" } as const)[s];
const fromDbStatus = (s: string): UiInvoiceStatus =>
  (({ DRAFT: "draft", SENT: "sent", PAID: "paid", OVERDUE: "overdue", CANCELED: "canceled" } as const)[
    s as "DRAFT"
  ] ?? "draft");
const fromDbAccount = (t: string): UiAccountType =>
  (({ ASSET: "asset", LIABILITY: "liability", EQUITY: "equity", INCOME: "income", EXPENSE: "expense" } as const)[
    t as "ASSET"
  ] ?? "asset");
const toDbAccount = (t: UiAccountType) =>
  ({ asset: "ASSET", liability: "LIABILITY", equity: "EQUITY", income: "INCOME", expense: "EXPENSE" } as const)[t];
const fromDbPeppol = (s: string): UiPeppolStatus =>
  (({ NOT_SENT: "not_sent", QUEUED: "queued", SENT: "sent", DELIVERED: "delivered", FAILED: "failed" } as const)[
    s as "NOT_SENT"
  ] ?? "not_sent");
const day = (d: Date) => d.toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Preview fallback dataset
// ---------------------------------------------------------------------------
const FALLBACK_ACCOUNTS: AccountDTO[] = [
  { id: "a1", code: "1000", name: "Cash", type: "asset" },
  { id: "a2", code: "1100", name: "Accounts Receivable", type: "asset" },
  { id: "a3", code: "2000", name: "Accounts Payable", type: "liability" },
  { id: "a4", code: "3000", name: "Equity", type: "equity" },
  { id: "a5", code: "4000", name: "Sales Revenue", type: "income" },
  { id: "a6", code: "5000", name: "Operating Expenses", type: "expense" },
];
const FALLBACK_CUSTOMERS: CustomerDTO[] = [
  { id: "c1", name: "Nordic Retail Oy", vatId: "FI98765432", country: "FI", email: "billing@nordicretail.fi" },
  { id: "c2", name: "Acme Oy", vatId: "FI12345678", country: "FI", email: "ap@acme.fi" },
];
const FALLBACK_INVOICES: InvoiceDTO[] = [
  {
    id: "i1", number: "INV-2026-0001", customerId: "c1", customerName: "Nordic Retail Oy",
    issueDate: "2026-06-01", dueDate: "2026-06-15", status: "sent", currency: "EUR",
    subtotal: 1000, tax: 255, total: 1255, channel: "PEPPOL", peppolStatus: "delivered", notes: null,
    lines: [{ description: "Consulting", qty: 10, unitPrice: 100, vatRate: 25.5 }],
  },
  {
    id: "i2", number: "INV-2026-0002", customerId: "c2", customerName: "Acme Oy",
    issueDate: "2026-05-20", dueDate: "2026-06-03", status: "paid", currency: "EUR",
    subtotal: 620, tax: 158.1, total: 778.1, channel: "Finvoice", peppolStatus: "delivered", notes: null,
    lines: [{ description: "Software license", qty: 1, unitPrice: 620, vatRate: 25.5 }],
  },
  {
    id: "i3", number: "INV-2026-0003", customerId: "c1", customerName: "Nordic Retail Oy",
    issueDate: "2026-04-10", dueDate: "2026-04-24", status: "overdue", currency: "EUR",
    subtotal: 3840, tax: 979.2, total: 4819.2, channel: "PEPPOL", peppolStatus: "sent", notes: null,
    lines: [{ description: "Retainer Q2", qty: 1, unitPrice: 3840, vatRate: 25.5 }],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function dbConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

async function companyCtx() {
  const { requireSession, resolveCompanyId } = await import("./auth/session.server");
  const session = await requireSession();
  const companyId = await resolveCompanyId(session.userId);
  if (!companyId) throw new Error("No active company for this user.");
  return { session, companyId };
}

async function audit(userId: string, action: string, entity: string, entityId: string) {
  try {
    const { withTenant } = await import("./db.server");
    await withTenant(userId, (tx) => tx.auditLog.create({ data: { userId, action, entity, entityId } }));
  } catch {
    /* best-effort */
  }
}

function lineCents(l: InvoiceLineDTO) {
  const net = Math.round(l.qty * l.unitPrice * 100);
  const tax = Math.round(net * (l.vatRate / 100));
  return { net, tax };
}
function totalsFor(lines: InvoiceLineDTO[]) {
  let subtotalCents = 0;
  let taxCents = 0;
  for (const l of lines) {
    const { net, tax } = lineCents(l);
    subtotalCents += net;
    taxCents += tax;
  }
  return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}

// ---------------------------------------------------------------------------
// Chart of accounts
// ---------------------------------------------------------------------------
export const listAccounts = createServerFn({ method: "GET" }).handler(async (): Promise<AccountDTO[]> => {
  if (!dbConfigured()) return FALLBACK_ACCOUNTS;
  try {
    const { companyId, session } = await companyCtx();
    const { withTenant } = await import("./db.server");
    return await withTenant(session.userId, async (tx) => {
      const rows = await tx.chartOfAccount.findMany({ where: { companyId }, orderBy: { code: "asc" } });
      return rows.map((a) => ({ id: a.id, code: a.code, name: a.name, type: fromDbAccount(a.type), parentId: a.parentId }));
    });
  } catch {
    return FALLBACK_ACCOUNTS;
  }
});

const accountInput = z.object({
  id: z.string().optional(),
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(160),
  type: z.enum(["asset", "liability", "equity", "income", "expense"]),
  parentId: z.string().nullable().optional(),
});

export const upsertAccount = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => accountInput.parse(d))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { companyId, session } = await companyCtx();
    const { withTenant } = await import("./db.server");
    const id = await withTenant(session.userId, async (tx) => {
      const base = { code: data.code, name: data.name, type: toDbAccount(data.type), parentId: data.parentId ?? null };
      if (data.id) {
        await tx.chartOfAccount.update({ where: { id: data.id }, data: base });
        return data.id;
      }
      const created = await tx.chartOfAccount.create({ data: { ...base, companyId } });
      return created.id;
    });
    await audit(session.userId, data.id ? "update" : "create", "chart_of_account", id);
    return { id };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { session } = await companyCtx();
    const { withTenant } = await import("./db.server");
    await withTenant(session.userId, (tx) => tx.chartOfAccount.delete({ where: { id: data.id } }));
    await audit(session.userId, "delete", "chart_of_account", data.id);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------
export const listCustomers = createServerFn({ method: "GET" }).handler(async (): Promise<CustomerDTO[]> => {
  if (!dbConfigured()) return FALLBACK_CUSTOMERS;
  try {
    const { companyId, session } = await companyCtx();
    const { withTenant } = await import("./db.server");
    return await withTenant(session.userId, async (tx) => {
      const rows = await tx.customer.findMany({ where: { companyId }, orderBy: { name: "asc" } });
      return rows.map((c) => ({ id: c.id, name: c.name, vatId: c.vatId, country: c.country, email: c.email }));
    });
  } catch {
    return FALLBACK_CUSTOMERS;
  }
});

const customerInput = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(200),
  vatId: z.string().trim().max(40).nullable().optional(),
  country: z.string().trim().min(2).max(2).default("FI"),
  email: z.string().trim().email().max(255).nullable().optional(),
});

export const upsertCustomer = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => customerInput.parse(d))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { companyId, session } = await companyCtx();
    const { withTenant } = await import("./db.server");
    const id = await withTenant(session.userId, async (tx) => {
      const base = { name: data.name, vatId: data.vatId ?? null, country: data.country, email: data.email ?? null };
      if (data.id) {
        await tx.customer.update({ where: { id: data.id }, data: base });
        return data.id;
      }
      const created = await tx.customer.create({ data: { ...base, companyId } });
      return created.id;
    });
    await audit(session.userId, data.id ? "update" : "create", "customer", id);
    return { id };
  });

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------
function channelOf(xml: { format: string } | null | undefined): InvoiceDTO["channel"] {
  if (!xml) return "None";
  return xml.format === "FINVOICE" ? "Finvoice" : "PEPPOL";
}

export const listInvoices = createServerFn({ method: "GET" }).handler(async (): Promise<InvoiceDTO[]> => {
  if (!dbConfigured()) return FALLBACK_INVOICES;
  try {
    const { companyId, session } = await companyCtx();
    const { withTenant } = await import("./db.server");
    return await withTenant(session.userId, async (tx) => {
      const rows = await tx.invoice.findMany({
        where: { companyId },
        orderBy: { issueDate: "desc" },
        include: { items: true, xml: true },
      });
      const custIds = [...new Set(rows.map((r) => r.customerId).filter(Boolean) as string[])];
      const custs = custIds.length
        ? await tx.customer.findMany({ where: { id: { in: custIds } } })
        : [];
      const nameById = new Map(custs.map((c) => [c.id, c.name]));
      return rows.map((r): InvoiceDTO => ({
        id: r.id,
        number: r.number,
        customerId: r.customerId,
        customerName: (r.customerId && nameById.get(r.customerId)) || "—",
        issueDate: day(r.issueDate),
        dueDate: r.dueDate ? day(r.dueDate) : null,
        status: fromDbStatus(r.status),
        currency: r.currency,
        subtotal: r.subtotalCents / 100,
        tax: r.taxCents / 100,
        total: r.totalCents / 100,
        channel: channelOf(r.xml),
        peppolStatus: r.xml ? fromDbPeppol(r.xml.peppolStatus) : "not_sent",
        notes: r.notes,
        lines: r.items.map((it) => ({
          id: it.id,
          description: it.description,
          qty: it.qty,
          unitPrice: it.unitPriceCents / 100,
          vatRate: it.vatRate,
        })),
      }));
    });
  } catch {
    return FALLBACK_INVOICES;
  }
});

const invoiceInput = z.object({
  id: z.string().optional(),
  number: z.string().trim().min(1).max(40).optional(),
  customerId: z.string().nullable().optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().nullable().optional(),
  currency: z.string().trim().min(3).max(3).default("EUR"),
  notes: z.string().trim().max(2000).nullable().optional(),
  lines: z
    .array(
      z.object({
        description: z.string().trim().min(1).max(300),
        qty: z.number().min(0).max(1_000_000),
        unitPrice: z.number().min(0).max(10_000_000),
        vatRate: z.number().min(0).max(100),
      }),
    )
    .min(1)
    .max(200),
});

export const upsertInvoice = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => invoiceInput.parse(d))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { companyId, session } = await companyCtx();
    const { withTenant } = await import("./db.server");
    const { subtotalCents, taxCents, totalCents } = totalsFor(data.lines);
    const id = await withTenant(session.userId, async (tx) => {
      if (data.id) {
        await tx.invoiceItem.deleteMany({ where: { invoiceId: data.id } });
        await tx.invoice.update({
          where: { id: data.id },
          data: {
            customerId: data.customerId ?? null,
            issueDate: data.issueDate ? new Date(data.issueDate) : undefined,
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
            currency: data.currency,
            notes: data.notes ?? null,
            subtotalCents,
            taxCents,
            totalCents,
            items: {
              create: data.lines.map((l) => {
                const { net } = lineCents(l);
                return {
                  description: l.description,
                  qty: l.qty,
                  unitPriceCents: Math.round(l.unitPrice * 100),
                  vatRate: l.vatRate,
                  lineTotalCents: net,
                };
              }),
            },
          },
        });
        return data.id;
      }
      // Generate the next sequential number for this company.
      const count = await tx.invoice.count({ where: { companyId } });
      const number = data.number ?? `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
      const created = await tx.invoice.create({
        data: {
          companyId,
          customerId: data.customerId ?? null,
          number,
          issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          currency: data.currency,
          notes: data.notes ?? null,
          status: "DRAFT",
          subtotalCents,
          taxCents,
          totalCents,
          items: {
            create: data.lines.map((l) => {
              const { net } = lineCents(l);
              return {
                description: l.description,
                qty: l.qty,
                unitPriceCents: Math.round(l.unitPrice * 100),
                vatRate: l.vatRate,
                lineTotalCents: net,
              };
            }),
          },
        },
      });
      return created.id;
    });
    await audit(session.userId, data.id ? "update" : "create", "invoice", id);
    return { id };
  });

export const setInvoiceStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: UiInvoiceStatus }) => d)
  .handler(async ({ data }): Promise<{ ok: true; autoSent?: boolean; message?: string }> => {
    const { companyId, session } = await companyCtx();
    const { withTenant } = await import("./db.server");
    const result = await withTenant(session.userId, async (tx) => {
      await tx.invoice.update({ where: { id: data.id }, data: { status: toDbStatus(data.status) } });
      if (data.status !== "sent") return null;
      const s = await tx.eInvoiceSettings.findUnique({ where: { companyId } });
      if (!s?.autoSend) return null;
      const { dispatchEInvoice } = await import("./einvoice/dispatch.server");
      return dispatchEInvoice(tx, companyId, data.id);
    });
    await audit(session.userId, `status:${data.status}`, "invoice", data.id);
    if (result) {
      await audit(session.userId, `einvoice:autosend:${result.status}`, "invoice", data.id);
      return { ok: true, autoSent: result.ok, message: result.message };
    }
    return { ok: true };
  });

export const deleteInvoice = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { session } = await companyCtx();
    const { withTenant } = await import("./db.server");
    await withTenant(session.userId, (tx) => tx.invoice.delete({ where: { id: data.id } }));
    await audit(session.userId, "delete", "invoice", data.id);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// E-invoicing: XML generation + PEPPOL dispatch
// ---------------------------------------------------------------------------
export const listEInvoiceFormatsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { listEInvoiceFormats } = await import("./einvoice/einvoice.server");
  return listEInvoiceFormats();
});

export const generateInvoiceXml = createServerFn({ method: "POST" })
  .inputValidator((d: {
    id: string;
    format?: "UBL" | "FINVOICE" | "XRECHNUNG-UBL" | "XRECHNUNG-CII" | "CII";
  }) => d)
  .handler(async ({ data }): Promise<{ xml: string; format: string; valid: boolean; error?: string }> => {
    const format = data.format ?? "UBL";
    const { companyId, session } = await companyCtx();
    const { withTenant } = await import("./db.server");
    const { generateEInvoiceXml } = await import("./einvoice/einvoice.server");
    const { validateXml } = await import("./accounting/xml.server");

    return await withTenant(session.userId, async (tx) => {
      const inv = await tx.invoice.findFirst({ where: { id: data.id, companyId }, include: { items: true } });
      if (!inv) throw new Error("Invoice not found.");
      const company = await tx.company.findUnique({ where: { id: companyId } });
      const customer = inv.customerId ? await tx.customer.findUnique({ where: { id: inv.customerId } }) : null;

      const doc = {
        number: inv.number,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        currency: inv.currency,
        subtotalCents: inv.subtotalCents,
        taxCents: inv.taxCents,
        totalCents: inv.totalCents,
        notes: inv.notes,
        seller: { name: company?.name ?? "Seller", vatId: company?.businessId, country: company?.country ?? "FI" },
        buyer: { name: customer?.name ?? "Customer", vatId: customer?.vatId, country: customer?.country ?? "FI", address: customer?.address },
        lines: inv.items.map((it) => ({
          description: it.description,
          qty: it.qty,
          unitPriceCents: it.unitPriceCents,
          vatRate: it.vatRate,
          lineTotalCents: it.lineTotalCents,
        })),
      };

      let xml = "";
      let error: string | undefined;
      try {
        xml = await generateEInvoiceXml(doc, format);
      } catch (e) {
        error = (e as Error).message;
        // fall back to internal builder so the UI still gets something usable
        const { buildUbl, buildFinvoice } = await import("./accounting/xml.server");
        xml = format === "FINVOICE" ? buildFinvoice(doc) : buildUbl(doc);
      }
      const check = validateXml(xml);

      await tx.invoiceXml.upsert({
        where: { invoiceId: inv.id },
        create: { invoiceId: inv.id, format, xml, peppolStatus: "NOT_SENT" },
        update: { format, xml },
      });
      await audit(session.userId, `einvoice:xml:${format}`, "invoice", inv.id);
      return { xml, format, valid: check.valid && !error, error: error ?? check.error };
    });
  });

/**
 * Fiksu-native e-invoice dispatch. No third-party access point (Maventa/PEPPOL
 * external SaaS) — we own the delivery ledger. If FIKSU_EINVOICE_WEBHOOK_URL
 * is set, we POST the signed XML there (customer's own receiver / partner
 * gateway); otherwise the dispatch is recorded locally as SENT.
 * Status callbacks come back via /api/public/einvoice/status (HMAC-signed).
 */
export const sendViaPeppol = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; format?: "UBL" | "FINVOICE" | "XRECHNUNG-UBL" | "XRECHNUNG-CII" | "CII" }) => d)
  .handler(async ({ data }): Promise<{ ok: boolean; status: UiPeppolStatus; message: string; format: string }> => {
    const { companyId, session } = await companyCtx();
    const { withTenant } = await import("./db.server");
    const { dispatchEInvoice } = await import("./einvoice/dispatch.server");
    const result = await withTenant(session.userId, (tx) =>
      dispatchEInvoice(tx, companyId, data.id, data.format),
    );
    await audit(session.userId, `einvoice:dispatch:${result.status}`, "invoice", data.id);
    return { ok: result.ok, status: fromDbPeppol(result.status), message: result.message, format: result.format };
  });

// Alias with the intended name; keeps `sendViaPeppol` for backward-compat.
export const sendEInvoice = sendViaPeppol;

export const getOutboundEInvoiceXml = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }): Promise<{ xml: string; format: string; status: string } | null> => {
    const { companyId, session } = await companyCtx();
    const { withTenant } = await import("./db.server");
    return await withTenant(session.userId, async (tx) => {
      const inv = await tx.invoice.findFirst({ where: { id: data.id, companyId }, include: { xml: true } });
      if (!inv?.xml) return null;
      return { xml: inv.xml.xml, format: inv.xml.format, status: inv.xml.peppolStatus };
    });
  });

export const getInboundEInvoiceXml = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }): Promise<{ xml: string; format: string } | null> => {
    const { companyId, session } = await companyCtx();
    const { withTenant } = await import("./db.server");
    return await withTenant(session.userId, async (tx) => {
      const row = await tx.inboundEInvoice.findFirst({ where: { id: data.id, companyId } });
      if (!row) return null;
      return { xml: row.xml, format: row.format };
    });
  });

// ---------------------------------------------------------------------------
// E-invoice: inbound inbox + settings
// ---------------------------------------------------------------------------
export interface InboundEInvoiceDTO {
  id: string;
  format: string;
  sellerName: string;
  sellerVatId?: string | null;
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string | null;
  currency: string;
  total: number;
  tax: number;
  status: string;
  receivedAt: string;
}

export const listInboundEInvoices = createServerFn({ method: "GET" }).handler(
  async (): Promise<InboundEInvoiceDTO[]> => {
    const { companyId, session } = await companyCtx();
    const { withTenant } = await import("./db.server");
    return await withTenant(session.userId, async (tx) => {
      const rows = await tx.inboundEInvoice.findMany({
        where: { companyId },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      return rows.map((r) => ({
        id: r.id,
        format: r.format,
        sellerName: r.sellerName,
        sellerVatId: r.sellerVatId,
        invoiceNumber: r.invoiceNumber,
        issueDate: day(r.issueDate),
        dueDate: r.dueDate ? day(r.dueDate) : null,
        currency: r.currency,
        total: r.totalCents / 100,
        tax: r.taxCents / 100,
        status: r.status,
        receivedAt: r.createdAt.toISOString(),
      }));
    });
  },
);

// ---------------------------------------------------------------------------
// Expenses (out-of-pocket & vendor spend)
// ---------------------------------------------------------------------------
export type UiExpenseStatus = "pending" | "approved" | "reimbursed" | "rejected";

export interface ExpenseDTO {
  id: string;
  date: string; // YYYY-MM-DD
  vendor: string;
  category: string;
  amount: number; // EUR
  vatRate: number;
  currency: string;
  notes: string | null;
  status: UiExpenseStatus;
  receiptExtractionId: string | null;
}

const toDbExpStatus = (s: UiExpenseStatus) =>
  ({ pending: "PENDING", approved: "APPROVED", reimbursed: "REIMBURSED", rejected: "REJECTED" } as const)[s];
const fromDbExpStatus = (s: string): UiExpenseStatus =>
  (({ PENDING: "pending", APPROVED: "approved", REIMBURSED: "reimbursed", REJECTED: "rejected" } as const)[
    s as "PENDING"
  ] ?? "pending");

const FALLBACK_EXPENSES: ExpenseDTO[] = [
  { id: "e1", date: "2026-03-08", vendor: "K-Supermarket", category: "Groceries", amount: 48.2, vatRate: 14, currency: "EUR", notes: null, status: "approved", receiptExtractionId: null },
  { id: "e2", date: "2026-03-05", vendor: "Verkkokauppa.com", category: "Software", amount: 249, vatRate: 24, currency: "EUR", notes: null, status: "pending", receiptExtractionId: null },
];

export const listExpenses = createServerFn({ method: "GET" }).handler(async (): Promise<ExpenseDTO[]> => {
  if (!dbConfigured()) return FALLBACK_EXPENSES;
  try {
    const { companyId, session } = await companyCtx();
    const { withTenant } = await import("./db.server");
    return await withTenant(session.userId, async (tx) => {
      const rows = await tx.expense.findMany({ where: { companyId }, orderBy: { date: "desc" }, take: 500 });
      return rows.map((e) => ({
        id: e.id, date: day(e.date), vendor: e.vendor, category: e.category,
        amount: e.amountCents / 100, vatRate: e.vatRate, currency: e.currency,
        notes: e.notes, status: fromDbExpStatus(e.status), receiptExtractionId: e.receiptExtractionId,
      }));
    });
  } catch { return FALLBACK_EXPENSES; }
});

const expenseInput = z.object({
  id: z.string().optional(),
  date: z.string().min(1),
  vendor: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(80).default("Other"),
  amount: z.number().positive().max(10_000_000),
  vatRate: z.number().min(0).max(100).default(24),
  currency: z.string().length(3).default("EUR"),
  notes: z.string().max(1000).nullable().optional(),
  status: z.enum(["pending", "approved", "reimbursed", "rejected"]).default("pending"),
  receiptExtractionId: z.string().uuid().nullable().optional(),
});

export const upsertExpense = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => expenseInput.parse(d))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { companyId, session } = await companyCtx();
    const { withTenant } = await import("./db.server");
    const id = await withTenant(session.userId, async (tx) => {
      const base = {
        date: new Date(data.date),
        vendor: data.vendor,
        category: data.category,
        amountCents: Math.round(data.amount * 100),
        vatRate: data.vatRate,
        currency: data.currency,
        notes: data.notes ?? null,
        status: toDbExpStatus(data.status),
        receiptExtractionId: data.receiptExtractionId ?? null,
      };
      if (data.id) {
        await tx.expense.update({ where: { id: data.id }, data: base });
        return data.id;
      }
      const created = await tx.expense.create({ data: { ...base, companyId, createdBy: session.userId } });
      return created.id;
    });
    await audit(session.userId, data.id ? "update" : "create", "expense", id);
    return { id };
  });

export const setExpenseStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: UiExpenseStatus }) => d)
  .handler(async ({ data }) => {
    const { session } = await companyCtx();
    const { withTenant } = await import("./db.server");
    await withTenant(session.userId, (tx) =>
      tx.expense.update({ where: { id: data.id }, data: { status: toDbExpStatus(data.status) } }),
    );
    await audit(session.userId, `status:${data.status}`, "expense", data.id);
    return { ok: true as const };
  });

export const deleteExpense = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { session } = await companyCtx();
    const { withTenant } = await import("./db.server");
    await withTenant(session.userId, (tx) => tx.expense.delete({ where: { id: data.id } }));
    await audit(session.userId, "delete", "expense", data.id);
    return { ok: true as const };
  });

// ---------------------------------------------------------------------------
// Receipt extractions (OCR history)
// ---------------------------------------------------------------------------
export interface ReceiptExtractionRow {
  pvm?: string;
  tili?: string;
  debet?: number | null;
  kredit?: number | null;
  kohdennus?: string | null;
  alv?: number | null;
  asiakasToimittaja?: string | null;
  selite?: string;
}
export interface ReceiptExtractionDTO {
  id: string;
  status: string;
  supplier: string | null;
  totalAmount: number | null;
  currency: string;
  model: string;
  csvContent: string;
  parsedRows: ReceiptExtractionRow[];
  rowCount: number;
  createdAt: string;
  expenseId: string | null;
}

export const listReceiptExtractions = createServerFn({ method: "GET" }).handler(
  async (): Promise<ReceiptExtractionDTO[]> => {
    if (!dbConfigured()) return [];
    try {
      const { companyId, session } = await companyCtx();
      const { withTenant } = await import("./db.server");
      return await withTenant(session.userId, async (tx) => {
        const rows = await tx.receiptExtraction.findMany({
          where: { OR: [{ companyId }, { companyId: null }] },
          orderBy: { createdAt: "desc" },
          take: 200,
        });
        const ids = rows.map((r) => r.id);
        const linked = ids.length
          ? await tx.expense.findMany({ where: { receiptExtractionId: { in: ids } }, select: { id: true, receiptExtractionId: true } })
          : [];
        const expByExt = new Map<string, string>(linked.map((e) => [e.receiptExtractionId!, e.id]));
        return rows.map((r) => {
          const parsed = (Array.isArray(r.parsedRows) ? r.parsedRows : []) as ReceiptExtractionRow[];
          return {
            id: r.id,
            status: r.status,
            supplier: r.supplier,
            totalAmount: r.totalAmount ? Number(r.totalAmount) : null,
            currency: r.currency,
            model: r.model,
            csvContent: r.csvContent,
            parsedRows: parsed,
            rowCount: parsed.length,
            createdAt: r.createdAt.toISOString(),
            expenseId: expByExt.get(r.id) ?? null,
          };
        });
      });
    } catch { return []; }
  },
);

// Post a receipt extraction as an Expense row (accountant one-click action).
export const postReceiptAsExpense = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; accountCode?: string }) => d)
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { companyId, session } = await companyCtx();
    const { withTenant } = await import("./db.server");
    const id = await withTenant(session.userId, async (tx) => {
      const rec = await tx.receiptExtraction.findFirst({ where: { id: data.id } });
      if (!rec) throw new Error("Receipt not found.");
      const existing = await tx.expense.findFirst({ where: { receiptExtractionId: rec.id } });
      if (existing) return existing.id;
      const rows = Array.isArray(rec.parsedRows) ? (rec.parsedRows as Array<{ pvm?: string; asiakasToimittaja?: string | null; selite?: string; alv?: number | null; debet?: number | null }>) : [];
      const firstDate = rows.find((r) => r.pvm)?.pvm ?? new Date().toISOString().slice(0, 10);
      const supplier = rec.supplier ?? rows.find((r) => r.asiakasToimittaja)?.asiakasToimittaja ?? "Unknown";
      const total = rec.totalAmount ? Number(rec.totalAmount) : rows.reduce((s, r) => s + (r.debet ?? 0), 0);
      const vat = rows.find((r) => typeof r.alv === "number")?.alv ?? 24;
      const notes = rows.map((r) => r.selite).filter(Boolean).join(" · ");
      const created = await tx.expense.create({
        data: {
          companyId, createdBy: session.userId,
          date: new Date(firstDate), vendor: supplier, category: "Receipt",
          amountCents: Math.round(total * 100), vatRate: vat as number, currency: rec.currency,
          notes: notes || null, status: "PENDING", receiptExtractionId: rec.id,
        },
      });
      await tx.receiptExtraction.update({ where: { id: rec.id }, data: { status: "posted" } });
      return created.id;
    });
    await audit(session.userId, "post_receipt", "expense", id);
    return { id };
  });

// ---------------------------------------------------------------------------
// AI-callable actions — return plain JSON, log an audit row.
// Wrapped as authenticated server functions so tool `execute` handlers can
// persist directly through the same tenant guard as the UI.
// ---------------------------------------------------------------------------
export const aiCreateExpense = createServerFn({ method: "POST" })
  .inputValidator((d: {
    date?: string; vendor: string; category?: string;
    amount: number; vatRate?: number; currency?: string; notes?: string | null;
  }) => d)
  .handler(async ({ data }): Promise<{ id: string; message: string }> => {
    const { companyId, session } = await companyCtx();
    const { withTenant } = await import("./db.server");
    const created = await withTenant(session.userId, (tx) =>
      tx.expense.create({
        data: {
          companyId, createdBy: session.userId,
          date: data.date ? new Date(data.date) : new Date(),
          vendor: data.vendor.trim() || "Unknown",
          category: data.category ?? "Other",
          amountCents: Math.round(Math.abs(data.amount) * 100),
          vatRate: data.vatRate ?? 24,
          currency: data.currency ?? "EUR",
          notes: data.notes ?? null,
          status: "PENDING",
        },
      }),
    );
    await audit(session.userId, "ai:create", "expense", created.id);
    return { id: created.id, message: `Expense saved as draft #${created.id.slice(0, 8)} — pending accountant review.` };
  });

export const aiCreateJournalEntry = createServerFn({ method: "POST" })
  .inputValidator((d: { date?: string; memo?: string; debitAccountCode: string; creditAccountCode: string; amount: number }) => d)
  .handler(async ({ data }): Promise<{ id: string; message: string }> => {
    const { companyId, session } = await companyCtx();
    const { withTenant } = await import("./db.server");
    const result = await withTenant(session.userId, async (tx) => {
      const [deb, cred] = await Promise.all([
        tx.chartOfAccount.findFirst({ where: { companyId, code: data.debitAccountCode } }),
        tx.chartOfAccount.findFirst({ where: { companyId, code: data.creditAccountCode } }),
      ]);
      if (!deb || !cred) throw new Error(`Account not found (debit=${data.debitAccountCode}, credit=${data.creditAccountCode}).`);
      const j = await tx.journalEntry.create({
        data: {
          companyId, date: data.date ? new Date(data.date) : new Date(),
          memo: data.memo ?? null,
          debitAccountId: deb.id, creditAccountId: cred.id,
          amountCents: Math.round(Math.abs(data.amount) * 100),
        },
      });
      return j.id;
    });
    await audit(session.userId, "ai:create", "journal_entry", result);
    return { id: result, message: `Journal entry posted (debit ${data.debitAccountCode} / credit ${data.creditAccountCode}).` };
  });

export const aiCreateCustomer = createServerFn({ method: "POST" })
  .inputValidator((d: { name: string; vatId?: string | null; email?: string | null; country?: string }) => d)
  .handler(async ({ data }): Promise<{ id: string; message: string }> => {
    const { companyId, session } = await companyCtx();
    const { withTenant } = await import("./db.server");
    const created = await withTenant(session.userId, (tx) =>
      tx.customer.create({
        data: {
          companyId, name: data.name.trim(),
          vatId: data.vatId ?? null, email: data.email ?? null,
          country: data.country ?? "FI",
        },
      }),
    );
    await audit(session.userId, "ai:create", "customer", created.id);
    return { id: created.id, message: `Customer "${data.name}" created.` };
  });

export const updateInboundEInvoiceStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: "RECEIVED" | "APPROVED" | "REJECTED" | "PAID" }) => d)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { companyId, session } = await companyCtx();
    const { withTenant } = await import("./db.server");
    await withTenant(session.userId, (tx) =>
      tx.inboundEInvoice.updateMany({ where: { id: data.id, companyId }, data: { status: data.status } }),
    );
    await audit(session.userId, `einvoice:inbound:${data.status}`, "inbound_einvoice", data.id);
    return { ok: true };
  });

export const getEInvoiceSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { companyId, session } = await companyCtx();
  const { withTenant } = await import("./db.server");
  return await withTenant(session.userId, async (tx) => {
    const row = await tx.eInvoiceSettings.findUnique({ where: { companyId } });
    return {
      webhookUrl: row?.webhookUrl ?? "",
      defaultFormat: row?.defaultFormat ?? "FINVOICE",
      autoSend: row?.autoSend ?? false,
    };
  });
});

export const saveEInvoiceSettings = createServerFn({ method: "POST" })
  .inputValidator((d: { webhookUrl?: string; defaultFormat?: string; autoSend?: boolean }) => d)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { companyId, session } = await companyCtx();
    const { withTenant } = await import("./db.server");
    await withTenant(session.userId, (tx) =>
      tx.eInvoiceSettings.upsert({
        where: { companyId },
        create: {
          companyId,
          webhookUrl: data.webhookUrl || null,
          defaultFormat: data.defaultFormat ?? "FINVOICE",
          autoSend: data.autoSend ?? false,
        },
        update: {
          webhookUrl: data.webhookUrl || null,
          defaultFormat: data.defaultFormat ?? "FINVOICE",
          autoSend: data.autoSend ?? false,
        },
      }),
    );
    await audit(session.userId, "einvoice:settings:save", "company", companyId);
    return { ok: true };
  });

export const validateEInvoiceXml = createServerFn({ method: "POST" })
  .inputValidator((d: { xml: string }) => d)
  .handler(async ({ data }) => {
    const { parseEInvoiceXml } = await import("./einvoice/parse.server");
    const { validateXml } = await import("./accounting/xml.server");
    const check = validateXml(data.xml);
    const parsed = parseEInvoiceXml(data.xml);
    return { wellFormed: check.valid, error: check.error, parsed };
  });




// ---------------------------------------------------------------------------
// Summary / KPIs
// ---------------------------------------------------------------------------
export const accountingSummary = createServerFn({ method: "GET" }).handler(async (): Promise<AccountingSummary> => {
  const compute = (invoices: InvoiceDTO[]): AccountingSummary => {
    let revenue = 0, outstanding = 0, overdue = 0, paid = 0;
    for (const i of invoices) {
      if (i.status === "paid") { paid += i.total; revenue += i.total; }
      else if (i.status === "overdue") overdue += i.total;
      else if (i.status === "sent") outstanding += i.total;
    }
    return { revenue, outstanding, overdue, paid, invoiceCount: invoices.length };
  };
  if (!dbConfigured()) return compute(FALLBACK_INVOICES);
  try {
    const { companyId, session } = await companyCtx();
    const { withTenant } = await import("./db.server");
    return await withTenant(session.userId, async (tx) => {
      const rows = await tx.invoice.findMany({ where: { companyId }, select: { status: true, totalCents: true } });
      const mapped = rows.map((r) => ({ status: fromDbStatus(r.status), total: r.totalCents / 100 } as InvoiceDTO));
      return compute(mapped);
    });
  } catch {
    return compute(FALLBACK_INVOICES);
  }
});

// ---------------------------------------------------------------------------
// Journal entries (double-entry)
// ---------------------------------------------------------------------------
export interface JournalEntryDTO {
  id: string;
  date: string; // YYYY-MM-DD
  memo: string | null;
  debitAccountId: string | null;
  creditAccountId: string | null;
  amount: number; // EUR
}

const FALLBACK_JOURNAL: JournalEntryDTO[] = [
  { id: "j1", date: "2026-06-01", memo: "Sales — consulting", debitAccountId: "a2", creditAccountId: "a5", amount: 1000 },
  { id: "j2", date: "2026-06-05", memo: "Payment received", debitAccountId: "a1", creditAccountId: "a2", amount: 1255 },
  { id: "j3", date: "2026-06-10", memo: "Office rent", debitAccountId: "a6", creditAccountId: "a1", amount: 850 },
  { id: "j4", date: "2026-06-15", memo: "SaaS subscription", debitAccountId: "a6", creditAccountId: "a1", amount: 129 },
];

export const listJournalEntries = createServerFn({ method: "GET" }).handler(
  async (): Promise<JournalEntryDTO[]> => {
    if (!dbConfigured()) return FALLBACK_JOURNAL;
    try {
      const { companyId, session } = await companyCtx();
      const { withTenant } = await import("./db.server");
      return await withTenant(session.userId, async (tx) => {
        const rows = await tx.journalEntry.findMany({
          where: { companyId },
          orderBy: { date: "desc" },
          take: 500,
        });
        return rows.map((j) => ({
          id: j.id,
          date: day(j.date),
          memo: j.memo,
          debitAccountId: j.debitAccountId,
          creditAccountId: j.creditAccountId,
          amount: Math.round(j.amountCents) / 100,
        }));
      });
    } catch {
      return FALLBACK_JOURNAL;
    }
  },
);

const journalInput = z.object({
  id: z.string().optional(),
  date: z.string().min(1),
  memo: z.string().max(400).optional().nullable(),
  debitAccountId: z.string().uuid(),
  creditAccountId: z.string().uuid(),
  amount: z.number().positive().max(1_000_000_000),
});

export const upsertJournalEntry = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => journalInput.parse(d))
  .handler(async ({ data }): Promise<{ id: string }> => {
    if (data.debitAccountId === data.creditAccountId) {
      throw new Error("Debit and credit accounts must differ.");
    }
    const { companyId, session } = await companyCtx();
    const { withTenant } = await import("./db.server");
    const id = await withTenant(session.userId, async (tx) => {
      const base = {
        date: new Date(data.date),
        memo: data.memo ?? null,
        debitAccountId: data.debitAccountId,
        creditAccountId: data.creditAccountId,
        amountCents: Math.round(data.amount * 100),
      };
      if (data.id) {
        await tx.journalEntry.update({ where: { id: data.id }, data: base });
        return data.id;
      }
      const created = await tx.journalEntry.create({ data: { ...base, companyId } });
      return created.id;
    });
    await audit(session.userId, data.id ? "update" : "create", "journal_entry", id);
    return { id };
  });

export const deleteJournalEntry = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { session } = await companyCtx();
    const { withTenant } = await import("./db.server");
    await withTenant(session.userId, (tx) => tx.journalEntry.delete({ where: { id: data.id } }));
    await audit(session.userId, "delete", "journal_entry", data.id);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Financial reports (Trial Balance, P&L, Balance Sheet) — computed live from journals
// ---------------------------------------------------------------------------
export interface TrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  type: UiAccountType;
  debit: number;
  credit: number;
  balance: number; // signed; asset/expense positive on debit, others on credit
}
export interface FinancialReports {
  asOf: string;
  trialBalance: TrialBalanceRow[];
  totals: { debit: number; credit: number };
  pnl: { revenue: number; expenses: number; netIncome: number };
  balanceSheet: { assets: number; liabilities: number; equity: number };
}

export interface VatBreakdownRow { rate: number; net: number; vat: number; }
export interface VatReportDTO {
  asOf: string;
  periodFrom: string | null;
  periodTo: string | null;
  sales: VatBreakdownRow[];      // output VAT (from invoices)
  purchases: VatBreakdownRow[];  // input VAT (from expenses)
  totals: {
    salesNet: number; salesVat: number;
    purchasesNet: number; purchasesVat: number;
    payable: number; // salesVat - purchasesVat
  };
}

async function computeReports(
  accounts: AccountDTO[],
  journals: JournalEntryDTO[],
): Promise<FinancialReports> {
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const debitByAcc = new Map<string, number>();
  const creditByAcc = new Map<string, number>();
  for (const j of journals) {
    if (j.debitAccountId) debitByAcc.set(j.debitAccountId, (debitByAcc.get(j.debitAccountId) ?? 0) + j.amount);
    if (j.creditAccountId) creditByAcc.set(j.creditAccountId, (creditByAcc.get(j.creditAccountId) ?? 0) + j.amount);
  }
  const rows: TrialBalanceRow[] = accounts.map((a) => {
    const debit = debitByAcc.get(a.id) ?? 0;
    const credit = creditByAcc.get(a.id) ?? 0;
    const positiveOnDebit = a.type === "asset" || a.type === "expense";
    const balance = positiveOnDebit ? debit - credit : credit - debit;
    return { accountId: a.id, code: a.code, name: a.name, type: a.type, debit, credit, balance };
  });
  const totals = rows.reduce(
    (acc, r) => ({ debit: acc.debit + r.debit, credit: acc.credit + r.credit }),
    { debit: 0, credit: 0 },
  );
  const sum = (type: UiAccountType) => rows.filter((r) => r.type === type).reduce((s, r) => s + r.balance, 0);
  const revenue = sum("income");
  const expenses = sum("expense");
  return {
    asOf: new Date().toISOString().slice(0, 10),
    trialBalance: rows.sort((a, b) => a.code.localeCompare(b.code)),
    totals: { debit: Math.round(totals.debit * 100) / 100, credit: Math.round(totals.credit * 100) / 100 },
    pnl: { revenue, expenses, netIncome: revenue - expenses },
    balanceSheet: {
      assets: sum("asset"),
      liabilities: sum("liability"),
      equity: sum("equity"),
    },
  };
}

// ---------------------------------------------------------------------------
// VAT report (تقرير الضريبة) — output VAT from sales invoices, input VAT from
// expenses, grouped by VAT rate. Net payable = salesVat - purchasesVat.
// ---------------------------------------------------------------------------
function groupVat(rows: Array<{ rate: number; net: number; vat: number }>): VatBreakdownRow[] {
  const m = new Map<number, VatBreakdownRow>();
  for (const r of rows) {
    const g = m.get(r.rate) ?? { rate: r.rate, net: 0, vat: 0 };
    g.net += r.net;
    g.vat += r.vat;
    m.set(r.rate, g);
  }
  return Array.from(m.values())
    .map((g) => ({ rate: g.rate, net: Math.round(g.net * 100) / 100, vat: Math.round(g.vat * 100) / 100 }))
    .sort((a, b) => b.rate - a.rate);
}

export const vatReport = createServerFn({ method: "GET" }).handler(async (): Promise<VatReportDTO> => {
  const emptyTotals = { salesNet: 0, salesVat: 0, purchasesNet: 0, purchasesVat: 0, payable: 0 };
  const emptyReport: VatReportDTO = {
    asOf: new Date().toISOString().slice(0, 10),
    periodFrom: null, periodTo: null, sales: [], purchases: [], totals: emptyTotals,
  };
  if (!dbConfigured()) return emptyReport;
  try {
    const { companyId, session } = await companyCtx();
    const { withTenant } = await import("./db.server");
    return await withTenant(session.userId, async (tx) => {
      const [invoices, expenses] = await Promise.all([
        tx.invoice.findMany({
          where: { companyId, status: { in: ["SENT", "PAID", "OVERDUE"] } },
          include: { items: true },
        }),
        tx.expense.findMany({ where: { companyId } }),
      ]);
      // Sales (output) VAT — from invoice items
      const salesRows = invoices.flatMap((inv) =>
        inv.items.map((it) => {
          const net = (it.qty * it.unitPriceCents) / 100;
          const vat = net * (it.vatRate / 100);
          return { rate: it.vatRate, net, vat };
        }),
      );
      // Purchases (input) VAT — from expenses (gross amounts stored)
      const purchaseRows = expenses.map((e) => {
        const gross = e.amountCents / 100;
        const rate = e.vatRate;
        const net = rate > 0 ? gross / (1 + rate / 100) : gross;
        const vat = gross - net;
        return { rate, net, vat };
      });
      const sales = groupVat(salesRows);
      const purchases = groupVat(purchaseRows);
      const salesNet = sales.reduce((s, r) => s + r.net, 0);
      const salesVat = sales.reduce((s, r) => s + r.vat, 0);
      const purchasesNet = purchases.reduce((s, r) => s + r.net, 0);
      const purchasesVat = purchases.reduce((s, r) => s + r.vat, 0);
      const dates = [
        ...invoices.map((i) => i.issueDate.getTime()),
        ...expenses.map((e) => e.date.getTime()),
      ];
      return {
        asOf: new Date().toISOString().slice(0, 10),
        periodFrom: dates.length ? new Date(Math.min(...dates)).toISOString().slice(0, 10) : null,
        periodTo: dates.length ? new Date(Math.max(...dates)).toISOString().slice(0, 10) : null,
        sales, purchases,
        totals: {
          salesNet: Math.round(salesNet * 100) / 100,
          salesVat: Math.round(salesVat * 100) / 100,
          purchasesNet: Math.round(purchasesNet * 100) / 100,
          purchasesVat: Math.round(purchasesVat * 100) / 100,
          payable: Math.round((salesVat - purchasesVat) * 100) / 100,
        },
      };
    });
  } catch {
    return emptyReport;
  }
});

export const financialReports = createServerFn({ method: "GET" }).handler(
  async (): Promise<FinancialReports> => {
    if (!dbConfigured()) return computeReports(FALLBACK_ACCOUNTS, FALLBACK_JOURNAL);
    try {
      const { companyId, session } = await companyCtx();
      const { withTenant } = await import("./db.server");
      return await withTenant(session.userId, async (tx) => {
        const [accs, jrn] = await Promise.all([
          tx.chartOfAccount.findMany({ where: { companyId }, orderBy: { code: "asc" } }),
          tx.journalEntry.findMany({ where: { companyId }, orderBy: { date: "desc" }, take: 5000 }),
        ]);
        const accounts: AccountDTO[] = accs.map((a) => ({
          id: a.id, code: a.code, name: a.name, type: fromDbAccount(a.type), parentId: a.parentId,
        }));
        const journals: JournalEntryDTO[] = jrn.map((j) => ({
          id: j.id, date: day(j.date), memo: j.memo,
          debitAccountId: j.debitAccountId, creditAccountId: j.creditAccountId,
          amount: j.amountCents / 100,
        }));
        return computeReports(accounts, journals);
      });
    } catch {
      return computeReports(FALLBACK_ACCOUNTS, FALLBACK_JOURNAL);
    }
  },
);
