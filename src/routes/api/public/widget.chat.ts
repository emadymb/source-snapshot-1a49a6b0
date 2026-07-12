// Public chat endpoint for the embeddable Fiksu AI widget.
//
// External sites POST { messages: [{role,content}], workspaceId? } and get
// back { reply, capturedLead? }. CORS is wide-open (allow *) — the endpoint
// is stateless and never returns private data.
//
// The system prompt instructs the model to answer briefly in the visitor's
// language and, when the visitor volunteers contact info, to also emit a
// small JSON block <LEAD>{...}</LEAD>. The block is stripped from the reply
// and, when a DB is reachable, the lead is persisted to `leads`.

import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { z } from "zod";

const Body = z.object({
  workspaceId: z.string().uuid().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(40),
});

const SYSTEM = `You are the Fiksu AI concierge embedded on a customer's marketing site.
Answer questions about Fiksu (a Finnish accounting SaaS with OCR, e-invoicing, HRM and an AI assistant) briefly and helpfully.
Always reply in the same language the visitor used.
If a visitor volunteers their name, email or phone (or asks to be contacted / requests a demo), append a single line at the very end of your reply:
<LEAD>{"name":"...","email":"...","phone":"...","notes":"one-line summary"}</LEAD>
Use empty strings for fields the visitor did not share. Never invent contact details. Never mention the LEAD block itself.`;

const LEAD_RE = /<LEAD>([\s\S]*?)<\/LEAD>/i;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Max-Age": "86400",
};

export const Route = createFileRoute("/api/public/widget/chat")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        let body: z.infer<typeof Body>;
        try {
          body = Body.parse(await request.json());
        } catch {
          return Response.json({ error: "invalid_body" }, { status: 400, headers: CORS });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return Response.json(
            { reply: "المساعد غير متاح حالياً. رجاءً حاول لاحقاً." },
            { status: 200, headers: CORS },
          );
        }

        const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        let reply = "";
        try {
          const result = await generateText({
            model,
            system: SYSTEM,
            messages: body.messages.map((m) => ({ role: m.role, content: m.content })),
          });
          reply = result.text ?? "";
        } catch (e) {
          return Response.json(
            { error: "upstream_failed", detail: (e as Error).message },
            { status: 502, headers: CORS },
          );
        }

        // Extract + strip any <LEAD>...</LEAD> block.
        let capturedLead: { name: string; email: string; phone: string; notes: string } | null = null;
        const match = reply.match(LEAD_RE);
        if (match) {
          try {
            const parsed = JSON.parse(match[1]) as Record<string, unknown>;
            const name = String(parsed.name ?? "").trim();
            const email = String(parsed.email ?? "").trim();
            const phone = String(parsed.phone ?? "").trim();
            const notes = String(parsed.notes ?? "").trim();
            if (name || email || phone) {
              capturedLead = { name: name || "Visitor", email, phone, notes };
            }
          } catch {
            /* ignore malformed block */
          }
          reply = reply.replace(LEAD_RE, "").trim();
        }

        // Best-effort persistence — silently skip if the DB isn't wired.
        if (capturedLead && process.env.DATABASE_URL) {
          try {
            const { prisma } = await import("@/lib/db.server");
            await prisma.lead.create({
              data: {
                workspaceId: body.workspaceId ?? null,
                name: capturedLead.name,
                email: capturedLead.email || null,
                phone: capturedLead.phone || null,
                status: "new",
                source: "widget",
                notes: capturedLead.notes || null,
              },
            });
          } catch {
            /* no-op */
          }
        }

        return Response.json({ reply, capturedLead }, { headers: CORS });
      },
    },
  },
});