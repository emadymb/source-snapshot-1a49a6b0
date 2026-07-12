// Shared e-invoice dispatch logic. Called by both the sendEInvoice server
// function and the auto-send hook on invoice status changes. Keeping this in a
// .server.ts helper means we never call one createServerFn from inside another
// (which would leave the callee out of the worker's server-fn manifest).

import type { PrismaClient } from "@prisma/client";
import { createHmac } from "crypto";
import { generateEInvoiceXml, type EInvoiceFormat } from "./einvoice.server";

export type DispatchResult = {
  ok: boolean;
  status: "QUEUED" | "SENT" | "DELIVERED" | "FAILED";
  message: string;
  format: string;
};

type Tx = Pick<
  PrismaClient,
  "invoice" | "invoiceXml" | "eInvoiceSettings" | "company" | "customer"
>;

export async function dispatchEInvoice(
  tx: Tx,
  companyId: string,
  invoiceId: string,
  requestedFormat?: EInvoiceFormat,
): Promise<DispatchResult> {
  const inv = await tx.invoice.findFirst({
    where: { id: invoiceId, companyId },
    include: { xml: true, items: true },
  });
  if (!inv) throw new Error("Invoice not found.");

  const settings = await tx.eInvoiceSettings.findUnique({ where: { companyId } });
  const targetFormat: EInvoiceFormat =
    requestedFormat ?? ((settings?.defaultFormat as EInvoiceFormat | undefined) ?? "FINVOICE");
  const webhookUrl = settings?.webhookUrl || process.env.FIKSU_EINVOICE_WEBHOOK_URL;

  let xmlRow = inv.xml;
  if (!xmlRow || xmlRow.format !== targetFormat) {
    const company = await tx.company.findUnique({ where: { id: companyId } });
    const customer = inv.customerId
      ? await tx.customer.findUnique({ where: { id: inv.customerId } })
      : null;
    const doc = {
      number: inv.number,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      currency: inv.currency,
      subtotalCents: inv.subtotalCents,
      taxCents: inv.taxCents,
      totalCents: inv.totalCents,
      notes: inv.notes,
      seller: {
        name: company?.name ?? "Seller",
        vatId: company?.businessId,
        country: company?.country ?? "FI",
      },
      buyer: {
        name: customer?.name ?? "Customer",
        vatId: customer?.vatId,
        country: customer?.country ?? "FI",
        address: customer?.address,
      },
      lines: inv.items.map((it) => ({
        description: it.description,
        qty: it.qty,
        unitPriceCents: it.unitPriceCents,
        vatRate: it.vatRate,
        lineTotalCents: it.lineTotalCents,
      })),
    };
    const xml = await generateEInvoiceXml(doc, targetFormat);
    xmlRow = await tx.invoiceXml.upsert({
      where: { invoiceId: inv.id },
      create: { invoiceId: inv.id, format: targetFormat, xml, peppolStatus: "NOT_SENT" },
      update: { format: targetFormat, xml },
    });
  }

  let status: DispatchResult["status"] = "SENT";
  let message = `E-invoice queued as ${xmlRow.format} in Fiksu outbound ledger.`;

  if (webhookUrl) {
    try {
      const secret = process.env.FIKSU_EINVOICE_WEBHOOK_SECRET;
      const headers: Record<string, string> = {
        "Content-Type": "application/xml",
        "X-Fiksu-Invoice-Id": inv.id,
        "X-Fiksu-Invoice-Number": inv.number,
        "X-Fiksu-Format": xmlRow.format,
        "X-Fiksu-Company-Id": companyId,
      };
      if (secret) {
        headers["X-Fiksu-Signature"] = createHmac("sha256", secret)
          .update(xmlRow.xml)
          .digest("hex");
      }
      const res = await fetch(webhookUrl, { method: "POST", headers, body: xmlRow.xml });
      status = res.ok ? "SENT" : "FAILED";
      message = res.ok
        ? `E-invoice delivered as ${xmlRow.format} to configured receiver.`
        : `Receiver returned ${res.status}.`;
    } catch (e) {
      status = "FAILED";
      message = `Receiver unreachable: ${(e as Error).message}`;
    }
  }

  await tx.invoiceXml.update({
    where: { invoiceId: inv.id },
    data: { peppolStatus: status },
  });
  if (status === "SENT" && inv.status === "DRAFT") {
    await tx.invoice.update({ where: { id: inv.id }, data: { status: "SENT" } });
  }
  return { ok: status !== "FAILED", status, message, format: xmlRow.format };
}
