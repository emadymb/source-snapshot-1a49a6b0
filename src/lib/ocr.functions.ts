// OCR → Finnish accounting CSV → send to accountant.
//
// The client uploads a receipt image; this server function:
//   1. Sends it to Lovable AI Gateway (google/gemini-2.5-flash, vision-capable)
//      with a strict prompt asking for one row per accounting entry in Finnish
//      bookkeeping shape (Pvm, Tili, Debet, Kredit, Kohdennus, Alv,
//      Asiakas/Toimittaja, Selite).
//   2. Builds a semicolon-separated CSV (Finnish locale; UTF-8 with BOM).
//   3. Persists the extraction in `receipt_extractions` and creates a Message
//      row so the accountant sees a new receipt is waiting.
//   4. Returns both the parsed rows and the CSV string to the client so it
//      can preview and download it.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Public DTOs
// ---------------------------------------------------------------------------
export interface ReceiptRow {
  pvm: string;                   // Date (YYYY-MM-DD)
  tili: string;                  // Account code
  debet: number | null;          // Debit
  kredit: number | null;         // Credit
  kohdennus: string | null;      // Target/cost center
  alv: number | null;            // VAT %
  asiakasToimittaja: string | null; // Customer/Supplier
  selite: string;                // Description
}

export interface ExtractionResult {
  id: string;
  status: "sent_to_accountant" | "draft";
  rows: ReceiptRow[];
  csv: string;
  filename: string;
  supplier: string | null;
  totalAmount: number | null;
  currency: string;
  model: string;
  postedJournalIds: string[];
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------
const inputSchema = z.object({
  // Full data URL (data:image/jpeg;base64,...) so we preserve the real mime.
  imageDataUrl: z.string().min(64).max(15_000_000),
});

const rowSchema = z.object({
  pvm: z.string(),
  tili: z.string(),
  debet: z.number().nullable(),
  kredit: z.number().nullable(),
  kohdennus: z.string().nullable(),
  alv: z.number().nullable(),
  asiakasToimittaja: z.string().nullable(),
  selite: z.string(),
});

const extractionSchema = z.object({
  supplier: z.string().nullable(),
  totalAmount: z.number().nullable(),
  currency: z.string().nullable(),
  rawText: z.string().nullable(),
  rows: z.array(rowSchema).min(1),
});

// ---------------------------------------------------------------------------
// CSV helpers (Finnish standard: `;` delimiter, UTF-8 BOM for Excel FI)
// ---------------------------------------------------------------------------
const CSV_HEADERS = [
  "Pvm",
  "Tili",
  "Debet",
  "Kredit",
  "Kohdennus",
  "Alv",
  "Asiakas/Toimittaja",
  "Selite",
] as const;

function csvEscape(value: string | number | null): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(";") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function formatAmount(n: number | null): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "";
  // Finnish decimal separator is a comma.
  return n.toFixed(2).replace(".", ",");
}

function buildCsv(rows: ReceiptRow[]): string {
  const lines: string[] = [];
  lines.push(CSV_HEADERS.join(";"));
  for (const r of rows) {
    lines.push(
      [
        csvEscape(r.pvm),
        csvEscape(r.tili),
        csvEscape(formatAmount(r.debet)),
        csvEscape(formatAmount(r.kredit)),
        csvEscape(r.kohdennus ?? ""),
        csvEscape(r.alv === null ? "" : `${r.alv}%`),
        csvEscape(r.asiakasToimittaja ?? ""),
        csvEscape(r.selite ?? ""),
      ].join(";"),
    );
  }
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}

// ---------------------------------------------------------------------------
// AI extraction (Lovable AI Gateway, chat/completions with a vision image URL)
// ---------------------------------------------------------------------------
const SYSTEM = `You are a Finnish bookkeeping OCR extractor. The user uploads a receipt or invoice image (any language).
Return one JSON object with the exact shape below and NOTHING else.

Rules:
- Produce one or more accounting entries in Finnish double-entry bookkeeping style.
- Each entry MUST have either "debet" or "kredit" set (not both), the other must be null.
- "pvm" is the receipt/invoice date as YYYY-MM-DD; if unreadable, use today's date.
- "tili" is a plausible Finnish chart-of-accounts code (e.g. 4000 Ostot, 1910 Pankkitili, 2939 Alv-velka, 7830 Toimistotarvikkeet). Choose the best guess based on the receipt content.
- "alv" is the VAT percentage as a number (e.g. 24, 14, 10, 0), or null when not applicable.
- "asiakasToimittaja" is the merchant / supplier name from the receipt.
- "kohdennus" is null unless the receipt clearly names a project / cost centre.
- "selite" is a short human description in the receipt's original language.
- "totalAmount" is the invoice total in the receipt's currency.
- "rawText" is the raw OCR text you read from the image (best effort).

Return exactly this JSON shape:
{
  "supplier": string | null,
  "totalAmount": number | null,
  "currency": string | null,
  "rawText": string | null,
  "rows": [
    {
      "pvm": "YYYY-MM-DD",
      "tili": "4000",
      "debet": 12.34,
      "kredit": null,
      "kohdennus": null,
      "alv": 24,
      "asiakasToimittaja": "K-Market",
      "selite": "Toimistotarvikkeet"
    }
  ]
}`;

async function callGatewayVision(apiKey: string, imageDataUrl: string) {
  const body = {
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Extract every accounting entry from this receipt/invoice. Reply with only the JSON object described in the system message — no code fence, no commentary.",
          },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
  };

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    body: JSON.stringify(body),
  });

  if (res.status === 429) throw new Error("AI rate limit — please retry in a moment.");
  if (res.status === 402)
    throw new Error("AI credits exhausted — please add credits to your workspace.");
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI Gateway error ${res.status}: ${text.slice(0, 400)}`);
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content ?? "";
  return content;
}

function extractJson(content: string): unknown {
  // Strip common ```json fences if the model added them.
  const trimmed = content.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // last-ditch: find the first { and last }
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("AI response was not valid JSON.");
  }
}

function mimeFromDataUrl(dataUrl: string): string {
  const m = dataUrl.match(/^data:([^;]+);base64,/i);
  return m?.[1] ?? "image/jpeg";
}

// ---------------------------------------------------------------------------
// Main server function
// ---------------------------------------------------------------------------
export const extractReceiptToCsv = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<ExtractionResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY — enable Lovable AI first.");

    // 1. Ask the model to extract structured accounting rows.
    const raw = await callGatewayVision(apiKey, data.imageDataUrl);
    const parsed = extractionSchema.parse(extractJson(raw));

    // 2. Build the Finnish accounting CSV.
    const rows: ReceiptRow[] = parsed.rows;
    const csv = buildCsv(rows);
    const filename = `receipt-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;

    // 3. Persist + notify the accountant when the user is signed in.
    let id: string = crypto.randomUUID();
    let status: ExtractionResult["status"] = "draft";
    let postedJournalIds: string[] = [];
    try {
      const { getSession, resolveWorkspaceId, resolveCompanyId } = await import(
        "./auth/session.server"
      );
      const session = await getSession();
      if (session) {
        const workspaceId = await resolveWorkspaceId(session.userId, session.role);
        const companyId = await resolveCompanyId(session.userId);
        if (workspaceId) {
          const { prisma, withTenant } = await import("./db.server");

          const message = await prisma.message.create({
            data: {
              workspaceId,
              senderId: session.userId,
              subject: `New receipt from ${parsed.supplier ?? session.name} — ready to post`,
              body: [
                `A new receipt was extracted and is ready for review.`,
                parsed.supplier ? `Supplier: ${parsed.supplier}` : null,
                parsed.totalAmount !== null
                  ? `Total: ${parsed.totalAmount.toFixed(2)} ${parsed.currency ?? "EUR"}`
                  : null,
                `Lines: ${rows.length}`,
                ``,
                `CSV attached below (Finnish accounting format, ; separator):`,
                ``,
                csv,
              ]
                .filter(Boolean)
                .join("\n"),
              audience: "accountants",
            },
          });

          const record = await prisma.receiptExtraction.create({
            data: {
              workspaceId,
              companyId,
              uploadedBy: session.userId,
              status: "sent_to_accountant",
              model: "google/gemini-2.5-flash",
              imageMime: mimeFromDataUrl(data.imageDataUrl),
              rawText: parsed.rawText ?? null,
              parsedRows: rows as unknown as object,
              csvContent: csv,
              supplier: parsed.supplier ?? null,
              totalAmount:
                parsed.totalAmount !== null && parsed.totalAmount !== undefined
                  ? parsed.totalAmount.toFixed(2)
                  : null,
              currency: parsed.currency ?? "EUR",
              messageId: message.id,
            },
          });
          id = record.id;
          status = "sent_to_accountant";

          // 4. Auto-post double-entry journal entries directly to the ledger.
          if (companyId) {
            try {
              postedJournalIds = await withTenant(session.userId, (tx) =>
                autoPostJournal(tx, companyId, rows, parsed.supplier ?? null),
              );
            } catch (jerr) {
              console.error("[ocr] auto-post journals failed", jerr);
            }
          }
        }
      }
    } catch (err) {
      // Persistence is best-effort — the user still gets rows + CSV back.
      console.error("[ocr] persist failed", err);
    }

    return {
      id,
      status,
      rows,
      csv,
      filename,
      supplier: parsed.supplier ?? null,
      totalAmount: parsed.totalAmount ?? null,
      currency: parsed.currency ?? "EUR",
      model: "google/gemini-2.5-flash",
      postedJournalIds,
    };
  });

// ---------------------------------------------------------------------------
// Auto-post extracted rows as double-entry journal entries.
// Missing chart accounts (by tili code) are created on the fly with a type
// guessed from the Finnish code prefix (1=asset, 2=liability, 3=income,
// 4-8=expense).
// ---------------------------------------------------------------------------
function guessAccountType(code: string): "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE" {
  const c = code.trim();
  if (c.startsWith("1")) return "ASSET";
  if (c.startsWith("2")) return "LIABILITY";
  if (c.startsWith("3")) return "INCOME";
  return "EXPENSE";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function autoPostJournal(
  tx: any,
  companyId: string,
  rows: ReceiptRow[],
  supplier: string | null,
): Promise<string[]> {
  const debits = rows.filter((r) => r.debet !== null && r.debet > 0 && r.tili);
  const credits = rows.filter((r) => r.kredit !== null && r.kredit > 0 && r.tili);
  if (!debits.length || !credits.length) return [];

  const codes = Array.from(new Set([...debits, ...credits].map((r) => r.tili)));
  const existing = await tx.chartOfAccount.findMany({ where: { companyId, code: { in: codes } } });
  const byCode = new Map<string, { id: string; code: string }>(
    existing.map((a: { id: string; code: string }) => [a.code, a]),
  );
  for (const code of codes) {
    if (byCode.has(code)) continue;
    const created = await tx.chartOfAccount.create({
      data: { companyId, code, name: `Auto ${code}`, type: guessAccountType(code) },
    });
    byCode.set(code, created);
  }

  const primaryCredit = byCode.get(credits[0].tili);
  if (!primaryCredit) return [];

  const created: string[] = [];
  for (const d of debits) {
    const debAcc = byCode.get(d.tili);
    if (!debAcc || !d.debet) continue;
    const date = d.pvm ? new Date(d.pvm) : new Date();
    const j = await tx.journalEntry.create({
      data: {
        companyId,
        date: Number.isNaN(date.getTime()) ? new Date() : date,
        memo: `${supplier ?? "Receipt"} — ${d.selite ?? ""}`.slice(0, 400),
        debitAccountId: debAcc.id,
        creditAccountId: primaryCredit.id,
        amountCents: Math.round(d.debet * 100),
      },
    });
    created.push(j.id);
  }
  return created;
}