// Real hybrid-OCR cascade over Lovable AI Gateway. Called by ocrFallback.
// When LOVABLE_API_KEY is missing the caller falls back to a deterministic
// mock cascade, so previews keep working. Models we can route to the gateway
// are executed for real (vision-capable chat completions); the rest simulate.

import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

export type OcrModel = "deepseek" | "gemini" | "claude" | "gpt";

export interface OcrAttemptResult {
  model: OcrModel;
  success: boolean;
  processingTime: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  text?: string;
  data?: ReceiptData | null;
  error?: string;
  real: boolean;
}

export interface ReceiptData {
  vendor?: string;
  date?: string;
  currency?: string;
  subtotal?: number;
  vat?: number;
  total?: number;
  lines?: Array<{ description: string; qty?: number; unitPrice?: number; vatRate?: number; lineTotal?: number }>;
}

// Model routing: our internal ID → Lovable AI Gateway chat model.
// Undefined = no real route (caller simulates the attempt).
const ROUTE: Record<OcrModel, string | undefined> = {
  deepseek: undefined,
  gemini: "google/gemini-2.5-flash-lite",
  claude: undefined,
  gpt: "openai/gpt-5-mini",
};

// Approximate USD prices per 1K tokens (input / output).
const PRICE: Record<string, { in: number; out: number }> = {
  "google/gemini-2.5-flash-lite": { in: 0.0001, out: 0.0004 },
  "openai/gpt-5-mini": { in: 0.00025, out: 0.002 },
};

const SYSTEM_PROMPT = `You are an OCR + information-extraction engine for accounting receipts.
Given a receipt image return ONLY a JSON object matching this exact TypeScript type:
{ "vendor": string, "date": "YYYY-MM-DD", "currency": string, "subtotal": number, "vat": number, "total": number,
  "lines": [{ "description": string, "qty": number, "unitPrice": number, "vatRate": number, "lineTotal": number }] }
No markdown, no commentary — JSON only. Amounts are numbers, not strings. Use ISO date format.
If a field is missing set it to null (or omit "lines" if none).`;

function stripFences(s: string) {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

function parseReceipt(text: string): ReceiptData | null {
  try {
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first === -1 || last === -1) return null;
    const json = stripFences(text.slice(first, last + 1));
    return JSON.parse(json) as ReceiptData;
  } catch {
    return null;
  }
}

export async function runRealOcr(
  model: OcrModel,
  imageBase64: string,
): Promise<OcrAttemptResult> {
  const started = Date.now();
  const modelId = ROUTE[model];
  const key = process.env.LOVABLE_API_KEY;

  // No routing or no key → let caller fall back to simulation.
  if (!modelId || !key) {
    return {
      model,
      success: false,
      processingTime: 0,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
      real: false,
      error: modelId ? "LOVABLE_API_KEY missing" : "model not routed",
    };
  }

  try {
    // Normalize a data URL if the caller only sent raw base64.
    const dataUrl = imageBase64.startsWith("data:")
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

    const gateway = createLovableAiGatewayProvider(key);
    const result = await generateText({
      model: gateway(modelId),
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract the receipt as JSON." },
            { type: "image", image: dataUrl },
          ],
        },
      ],
    });

    const price = PRICE[modelId] ?? { in: 0.0002, out: 0.001 };
    const inTok = result.usage?.inputTokens ?? 400;
    const outTok = result.usage?.outputTokens ?? 220;
    const cost = (inTok / 1000) * price.in + (outTok / 1000) * price.out;
    const text = result.text ?? "";
    const data = parseReceipt(text);

    return {
      model,
      success: Boolean(text.trim()),
      processingTime: Date.now() - started,
      inputTokens: inTok,
      outputTokens: outTok,
      cost,
      text,
      data,
      real: true,
    };
  } catch (e) {
    return {
      model,
      success: false,
      processingTime: Date.now() - started,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
      real: true,
      error: (e as Error).message,
    };
  }
}

export function isRealRoute(model: OcrModel): boolean {
  return Boolean(ROUTE[model] && process.env.LOVABLE_API_KEY);
}
