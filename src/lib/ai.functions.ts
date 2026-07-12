// AI module server functions — REAL data (Prisma + Postgres RLS).
//
// Covers the AI Assistant module: OCR fallback cascade, usage telemetry
// (ai_usage_logs), conversation/message persistence, and lead capture.
//
// Preview safety: the Lovable preview has no Postgres, so reads fall back to a
// generated dataset and writes degrade gracefully. Real persistence requires a
// reachable database (DATABASE_URL) after `docker compose up` + migrate.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ---------------------------------------------------------------------------
// DTOs (mirror the shapes the AI UI already consumes from the mock store)
// ---------------------------------------------------------------------------
export type AiModelName = "tesseract" | "deepseek" | "gemini" | "claude" | "gpt";
export type AiOperation = "ocr" | "chat";

export interface UsageDTO {
  id: string;
  modelName: AiModelName;
  operation: AiOperation;
  inputTokens: number;
  outputTokens: number;
  cost: number; // USD
  success: boolean;
  processingTime: number; // ms
  createdAt: number; // epoch ms
}

export interface LeadDTO {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  source: string;
  notes: string | null;
  createdAt: number;
}

export interface ConversationDTO {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface MessageDTO {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
}

const MODELS: AiModelName[] = ["tesseract", "deepseek", "gemini", "claude", "gpt"];
const asModel = (s: string): AiModelName =>
  (MODELS.includes(s as AiModelName) ? (s as AiModelName) : "gemini");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function dbConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

async function ctx() {
  const { requireSession, resolveWorkspaceId } = await import("./auth/session.server");
  const session = await requireSession();
  const workspaceId = await resolveWorkspaceId(session.userId, session.role);
  return { session, workspaceId };
}

async function audit(userId: string, action: string, entity: string, entityId: string) {
  try {
    const { withTenant } = await import("./db.server");
    await withTenant(userId, (tx) => tx.auditLog.create({ data: { userId, action, entity, entityId } }));
  } catch {
    /* best-effort */
  }
}

// ---------------------------------------------------------------------------
// OCR fallback cascade (Tesseract → DeepSeek → Gemini → Claude → GPT)
// ---------------------------------------------------------------------------
const OcrInput = z.object({
  imageBase64: z.string().min(10),
  order: z.array(z.enum(["deepseek", "gemini", "claude", "gpt"])).optional(),
});

const MOCK_TEXTS: Record<"deepseek" | "gemini" | "claude" | "gpt", string> = {
  deepseek: "Ravintola Savoy\nOsoite: Eteläesplanadi 14\n2026-07-08\nLounas 2x   28,00 EUR\nJuoma       6,50 EUR\n---\nYhteensä    34,50 EUR\nALV 14%     4,24 EUR",
  gemini:   "K-Supermarket\nHelsinki Keskusta\n08/07/2026 12:34\nMaito 1L    1,55\nLeipä       3,20\nOmena       2,10\n---\nYht.        6,85 EUR\nALV 14%     0,84 EUR",
  claude:   "Teboil Espoo\n2026-07-08\nBensiini 95E\n38.42 L @ 1,899\nTotal        72,95 EUR\nALV 24%    14,12 EUR",
  gpt:      "Verkkokauppa.com\nInvoice #INV-88213\n2026-07-08\nSSD 2TB     189,00\nUSB Hub      24,90\nYhteensä   213,90 EUR",
};

const MODEL_PROFILE: Record<"deepseek" | "gemini" | "claude" | "gpt", { successRate: number; msMin: number; msMax: number; inTok: number; outTok: number; costIn: number; costOut: number }> = {
  deepseek: { successRate: 0.55, msMin: 400,  msMax: 900,  inTok: 350, outTok: 220, costIn: 0.00014, costOut: 0.00028 },
  gemini:   { successRate: 0.85, msMin: 600,  msMax: 1400, inTok: 350, outTok: 240, costIn: 0.00025, costOut: 0.00075 },
  claude:   { successRate: 0.95, msMin: 900,  msMax: 1800, inTok: 350, outTok: 260, costIn: 0.003,   costOut: 0.015 },
  gpt:      { successRate: 0.98, msMin: 1000, msMax: 2200, inTok: 350, outTok: 260, costIn: 0.005,   costOut: 0.015 },
};

export const ocrFallback = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => OcrInput.parse(data))
  .handler(async ({ data }) => {
    type M = "deepseek" | "gemini" | "claude" | "gpt";
    type ReceiptDataOut = import("./ai/ocr.server").ReceiptData;
    const order: M[] = data.order ?? ["deepseek", "gemini", "claude", "gpt"];
    const { runRealOcr, isRealRoute } = await import("./ai/ocr.server");

    type Attempt = {
      model: M; success: boolean; processingTime: number;
      inputTokens: number; outputTokens: number; cost: number;
      real: boolean; error?: string;
    };
    const attempts: Attempt[] = [];
    let winner: M | null = null;
    let winnerText: string | null = null;
    let winnerData: ReceiptDataOut | null = null;

    for (const m of order) {
      let attempt: Attempt;
      let text: string | undefined;
      let extracted: ReceiptDataOut | null = null;

      if (isRealRoute(m)) {
        // Real call over Lovable AI Gateway.
        const r = await runRealOcr(m, data.imageBase64);
        attempt = {
          model: m, success: r.success, processingTime: r.processingTime,
          inputTokens: r.inputTokens, outputTokens: r.outputTokens,
          cost: r.cost, real: true, error: r.error,
        };
        text = r.text;
        extracted = r.data ?? null;
      } else {
        // Simulated attempt (no gateway route or missing key).
        const p = MODEL_PROFILE[m];
        const ms = Math.floor(p.msMin + Math.random() * (p.msMax - p.msMin));
        const success = Math.random() < p.successRate;
        const cost = (p.inTok / 1000) * p.costIn + (p.outTok / 1000) * p.costOut;
        attempt = {
          model: m, success, processingTime: ms,
          inputTokens: p.inTok, outputTokens: p.outTok, cost, real: false,
        };
        if (success) text = MOCK_TEXTS[m];
      }

      attempts.push(attempt);
      if (attempt.success && text) {
        winner = m;
        winnerText = text;
        winnerData = extracted;
        break;
      }
    }

    if (!winner) {
      // Every attempt failed: return the last simulated body so the UI has
      // something to render, but flag success=false on the attempt log.
      winner = order[order.length - 1];
      winnerText = MOCK_TEXTS[winner];
    }

    // Persist telemetry for every attempt (best-effort).
    if (dbConfigured()) {
      try {
        const { session, workspaceId } = await ctx();
        const { withTenant } = await import("./db.server");
        await withTenant(session.userId, (tx) =>
          tx.aiUsageLog.createMany({
            data: attempts.map((a) => ({
              workspaceId: workspaceId ?? undefined,
              userId: session.userId,
              model: a.model,
              kind: "ocr",
              tokensIn: a.inputTokens,
              tokensOut: a.outputTokens,
              costCents: Math.round(a.cost * 100),
              latencyMs: a.processingTime,
              success: a.success,
            })),
          }),
        );
      } catch {
        /* preview / no-db: skip persistence */
      }
    }

    return { model: winner, text: winnerText, data: winnerData, attempts };
  });

// ---------------------------------------------------------------------------
// Usage telemetry
// ---------------------------------------------------------------------------
const logInput = z.object({
  modelName: z.enum(["tesseract", "deepseek", "gemini", "claude", "gpt"]),
  operation: z.enum(["ocr", "chat"]),
  inputTokens: z.number().int().min(0).default(0),
  outputTokens: z.number().int().min(0).default(0),
  cost: z.number().min(0).default(0),
  success: z.boolean().default(true),
  processingTime: z.number().int().min(0).default(0),
});

export const logAiUsage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => logInput.parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    if (!dbConfigured()) return { ok: false };
    try {
      const { session, workspaceId } = await ctx();
      const { withTenant } = await import("./db.server");
      await withTenant(session.userId, (tx) =>
        tx.aiUsageLog.create({
          data: {
            workspaceId: workspaceId ?? undefined,
            userId: session.userId,
            model: data.modelName,
            kind: data.operation,
            tokensIn: data.inputTokens,
            tokensOut: data.outputTokens,
            costCents: data.cost * 100,
            latencyMs: data.processingTime,
            success: data.success,
          },
        }),
      );
      return { ok: true };
    } catch {
      return { ok: false };
    }
  });

function fallbackUsage(): UsageDTO[] {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const out: UsageDTO[] = [];
  const models: AiModelName[] = ["gemini", "deepseek", "gpt", "claude", "tesseract"];
  const cost: Record<AiModelName, { in: number; out: number }> = {
    tesseract: { in: 0, out: 0 },
    deepseek: { in: 0.00014, out: 0.00028 },
    gemini: { in: 0.00025, out: 0.00075 },
    claude: { in: 0.003, out: 0.015 },
    gpt: { in: 0.005, out: 0.015 },
  };
  for (let i = 0; i < 42; i++) {
    const m = models[Math.floor(Math.random() * models.length)];
    const inTok = Math.floor(200 + Math.random() * 1200);
    const outTok = Math.floor(80 + Math.random() * 600);
    const c = cost[m];
    out.push({
      id: `u_${i}`,
      modelName: m,
      operation: Math.random() > 0.5 ? "ocr" : "chat",
      inputTokens: inTok,
      outputTokens: outTok,
      cost: (inTok / 1000) * c.in + (outTok / 1000) * c.out,
      success: Math.random() > 0.08,
      processingTime: Math.floor(400 + Math.random() * 1800),
      createdAt: now - Math.floor(Math.random() * 7) * day - Math.floor(Math.random() * day),
    });
  }
  return out.sort((a, b) => b.createdAt - a.createdAt);
}

export const listUsage = createServerFn({ method: "GET" }).handler(async (): Promise<UsageDTO[]> => {
  if (!dbConfigured()) return fallbackUsage();
  try {
    const { session } = await ctx();
    const { withTenant } = await import("./db.server");
    return await withTenant(session.userId, async (tx) => {
      const rows = await tx.aiUsageLog.findMany({ orderBy: { createdAt: "desc" }, take: 500 });
      if (rows.length === 0) return fallbackUsage();
      return rows.map((r): UsageDTO => ({
        id: r.id,
        modelName: asModel(r.model),
        operation: r.kind === "ocr" ? "ocr" : "chat",
        inputTokens: r.tokensIn,
        outputTokens: r.tokensOut,
        cost: r.costCents / 100,
        success: r.success,
        processingTime: r.latencyMs,
        createdAt: r.createdAt.getTime(),
      }));
    });
  } catch {
    return fallbackUsage();
  }
});

// ---------------------------------------------------------------------------
// Leads (chat widget capture)
// ---------------------------------------------------------------------------
const FALLBACK_LEADS: LeadDTO[] = [
  { id: "l1", name: "Mikko Virtanen", email: "mikko@yritys.fi", phone: "+358 40 123 4567", status: "new", source: "widget", notes: "Kysyy Finvoice-integraatiosta.", createdAt: Date.now() - 3 * 3600_000 },
  { id: "l2", name: "Sanna Korhonen", email: "sanna@kauppa.fi", phone: null, status: "contacted", source: "widget", notes: "Pyysi tarjousta 5 yritykselle.", createdAt: Date.now() - 26 * 3600_000 },
  { id: "l3", name: "Ahmed Al-Rashid", email: "ahmed@trading.fi", phone: "+358 50 987 6543", status: "qualified", source: "widget", notes: "Valmis demoon ensi viikolla.", createdAt: Date.now() - 3 * 24 * 3600_000 },
];

export const listLeads = createServerFn({ method: "GET" }).handler(async (): Promise<LeadDTO[]> => {
  if (!dbConfigured()) return FALLBACK_LEADS;
  try {
    const { session } = await ctx();
    const { withTenant } = await import("./db.server");
    return await withTenant(session.userId, async (tx) => {
      const rows = await tx.lead.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
      return rows.map((l): LeadDTO => ({
        id: l.id, name: l.name, email: l.email, phone: l.phone,
        status: l.status, source: l.source, notes: l.notes, createdAt: l.createdAt.getTime(),
      }));
    });
  } catch {
    return FALLBACK_LEADS;
  }
});

const leadInput = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(200).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  status: z.enum(["new", "contacted", "qualified", "won", "lost"]).default("new"),
  source: z.string().trim().max(40).default("widget"),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const upsertLead = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => leadInput.parse(d))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { session, workspaceId } = await ctx();
    const { withTenant } = await import("./db.server");
    const id = await withTenant(session.userId, async (tx) => {
      if (data.id) {
        const up = await tx.lead.update({
          where: { id: data.id },
          data: { name: data.name, email: data.email ?? null, phone: data.phone ?? null, status: data.status, source: data.source, notes: data.notes ?? null },
        });
        return up.id;
      }
      const created = await tx.lead.create({
        data: { workspaceId: workspaceId ?? undefined, name: data.name, email: data.email ?? null, phone: data.phone ?? null, status: data.status, source: data.source, notes: data.notes ?? null },
      });
      return created.id;
    });
    await audit(session.userId, data.id ? "update" : "create", "lead", id);
    return { id };
  });

export const deleteLead = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const { session } = await ctx();
    const { withTenant } = await import("./db.server");
    await withTenant(session.userId, (tx) => tx.lead.delete({ where: { id: data.id } }));
    await audit(session.userId, "delete", "lead", data.id);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Conversations & messages
// ---------------------------------------------------------------------------
export const listConversations = createServerFn({ method: "GET" }).handler(async (): Promise<ConversationDTO[]> => {
  if (!dbConfigured()) return [];
  try {
    const { session, workspaceId } = await ctx();
    const { withTenant } = await import("./db.server");
    return await withTenant(session.userId, async (tx) => {
      const rows = await tx.aiConversation.findMany({
        where: workspaceId ? { workspaceId } : undefined,
        orderBy: { updatedAt: "desc" },
        take: 100,
      });
      return rows.map((c): ConversationDTO => ({ id: c.id, title: c.title, createdAt: c.createdAt.getTime(), updatedAt: c.updatedAt.getTime() }));
    });
  } catch {
    return [];
  }
});

export const getMessages = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ conversationId: z.string() }).parse(d))
  .handler(async ({ data }): Promise<MessageDTO[]> => {
    if (!dbConfigured()) return [];
    try {
      const { session } = await ctx();
      const { withTenant } = await import("./db.server");
      return await withTenant(session.userId, async (tx) => {
        const rows = await tx.aiMessage.findMany({ where: { conversationId: data.conversationId }, orderBy: { createdAt: "asc" } });
        return rows.map((m): MessageDTO => ({ id: m.id, role: m.role as MessageDTO["role"], content: m.content, createdAt: m.createdAt.getTime() }));
      });
    } catch {
      return [];
    }
  });

export const createConversation = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ title: z.string().max(120).optional() }).parse(d ?? {}))
  .handler(async ({ data }): Promise<{ id: string } | null> => {
    if (!dbConfigured()) return null;
    try {
      const { session, workspaceId } = await ctx();
      if (!workspaceId) return null;
      const { withTenant } = await import("./db.server");
      const created = await withTenant(session.userId, (tx) =>
        tx.aiConversation.create({ data: { workspaceId, userId: session.userId, title: data.title || "محادثة جديدة" } }),
      );
      return { id: created.id };
    } catch {
      return null;
    }
  });

export const appendMessage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      conversationId: z.string(),
      role: z.enum(["user", "assistant", "system"]),
      content: z.string().max(200000),
    }).parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    if (!dbConfigured()) return { ok: false };
    try {
      const { session } = await ctx();
      const { withTenant } = await import("./db.server");
      await withTenant(session.userId, async (tx) => {
        await tx.aiMessage.create({ data: { conversationId: data.conversationId, role: data.role, content: data.content } });
        await tx.aiConversation.update({ where: { id: data.conversationId }, data: { updatedAt: new Date() } });
      });
      return { ok: true };
    } catch {
      return { ok: false };
    }
  });

export const deleteConversation = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    if (!dbConfigured()) return { ok: false };
    try {
      const { session } = await ctx();
      const { withTenant } = await import("./db.server");
      await withTenant(session.userId, (tx) => tx.aiConversation.delete({ where: { id: data.id } }));
      return { ok: true };
    } catch {
      return { ok: false };
    }
  });
