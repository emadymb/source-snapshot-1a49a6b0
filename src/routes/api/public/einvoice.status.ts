// Inbound e-invoice status webhook.
//
// Any external receiver / partner gateway can POST here to update the
// dispatch status of a Fiksu-issued e-invoice. Auth: HMAC-SHA256 over the
// raw request body using FIKSU_EINVOICE_WEBHOOK_SECRET, sent in the
// X-Fiksu-Signature header (hex encoded).
//
// Body:
//   { "invoiceId": "<uuid>", "status": "QUEUED"|"SENT"|"DELIVERED"|"FAILED",
//     "message"?: string, "receivedAt"?: "ISO-8601" }

import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const Body = z.object({
  invoiceId: z.string().min(1),
  status: z.enum(["QUEUED", "SENT", "DELIVERED", "FAILED"]),
  message: z.string().optional(),
  receivedAt: z.string().optional(),
});

export const Route = createFileRoute("/api/public/einvoice/status")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.FIKSU_EINVOICE_WEBHOOK_SECRET;
        if (!secret) {
          return new Response("Webhook not configured", { status: 503 });
        }
        const raw = await request.text();
        const sig = request.headers.get("x-fiksu-signature") ?? "";
        const expected = createHmac("sha256", secret).update(raw).digest("hex");
        const a = Buffer.from(sig, "hex");
        const b = Buffer.from(expected, "hex");
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let parsed: z.infer<typeof Body>;
        try {
          parsed = Body.parse(JSON.parse(raw));
        } catch {
          return new Response("Bad request", { status: 400 });
        }

        const { prisma } = await import("@/lib/db.server");
        const xml = await prisma.invoiceXml.findUnique({
          where: { invoiceId: parsed.invoiceId },
          include: { invoice: true },
        });
        if (!xml) return new Response("Unknown invoice", { status: 404 });

        await prisma.invoiceXml.update({
          where: { invoiceId: parsed.invoiceId },
          data: { peppolStatus: parsed.status },
        });
        await prisma.auditLog.create({
          data: {
            action: `einvoice:status:${parsed.status}`,
            entity: "invoice",
            entityId: xml.invoice.id,
            changes: { status: parsed.status, message: parsed.message ?? null },
          },
        }).catch(() => {});


        return Response.json({ ok: true, invoiceId: parsed.invoiceId, status: parsed.status });
      },
    },
  },
});
