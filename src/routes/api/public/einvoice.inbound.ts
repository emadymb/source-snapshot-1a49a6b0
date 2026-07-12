// Inbound e-invoice receiver.
//
// External senders POST a UBL / Finvoice / CII XML here. Auth = HMAC-SHA256
// over the raw body with FIKSU_EINVOICE_WEBHOOK_SECRET, hex, in
// X-Fiksu-Signature. The target company is resolved from either
// X-Fiksu-Company-Id or the buyer's VAT ID in the XML.

import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";

export const Route = createFileRoute("/api/public/einvoice/inbound")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.FIKSU_EINVOICE_WEBHOOK_SECRET;
        if (!secret) return new Response("Webhook not configured", { status: 503 });

        const raw = await request.text();
        const sig = request.headers.get("x-fiksu-signature") ?? "";
        const expected = createHmac("sha256", secret).update(raw).digest("hex");
        const a = Buffer.from(sig, "hex");
        const b = Buffer.from(expected, "hex");
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const { parseEInvoiceXml } = await import("@/lib/einvoice/parse.server");
        const parsed = parseEInvoiceXml(raw);
        if (parsed.format === "UNKNOWN") {
          return new Response("Unrecognized e-invoice format", { status: 415 });
        }

        const { prisma } = await import("@/lib/db.server");

        let companyId = request.headers.get("x-fiksu-company-id") ?? undefined;
        if (!companyId && parsed.buyerVatId) {
          const co = await prisma.company.findFirst({
            where: { businessId: parsed.buyerVatId },
            select: { id: true },
          });
          companyId = co?.id;
        }
        if (!companyId) {
          return new Response("Recipient company not found", { status: 404 });
        }

        const record = await prisma.inboundEInvoice.create({
          data: {
            companyId,
            format: parsed.format,
            sourceRef: request.headers.get("x-fiksu-source-ref") ?? undefined,
            sellerName: parsed.sellerName,
            sellerVatId: parsed.sellerVatId,
            invoiceNumber: parsed.invoiceNumber,
            issueDate: new Date(parsed.issueDate),
            dueDate: parsed.dueDate ? new Date(parsed.dueDate) : undefined,
            currency: parsed.currency,
            totalCents: parsed.totalCents,
            taxCents: parsed.taxCents,
            xml: raw,
          },
        });

        return Response.json({ ok: true, id: record.id, format: parsed.format });
      },
    },
  },
});
