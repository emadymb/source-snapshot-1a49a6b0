import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, tool, stepCountIs, type UIMessage } from "ai";
import { z } from "zod";

const SYSTEM = `أنت "المساعد المحاسبي الذكي" — مساعد محاسبة يعمل مباشرة على قاعدة بيانات محاسبية حقيقية.

عندك ثلاث أدوات فعلية تكتب في قاعدة البيانات:
- record_expense: تسجّل مصروفاً جديداً (بانتظار مراجعة المحاسب).
- create_journal_entry: تُنشئ قيد دفتر يومية بطرف مدين وطرف دائن (رموز حسابات من دليل الحسابات).
- create_customer: تُنشئ عميلاً جديداً في دفتر العملاء.

قواعد:
- استخدم الأداة المناسبة فور أن يذكر المستخدم معاملة (لا تسأل عن التفاصيل غير الضرورية).
- بعد نجاح الأداة اكتب سطراً واحداً يؤكد ما تم حفظه.
- عند إنشاء قيد يومية، اقترح رموز الحسابات الفنلندية الشائعة (4000 Ostot، 1910 Pankkitili، 3000 Myynti، 7830 Toimistotarvikkeet...).
- العملة الافتراضية EUR.
- رد دائماً بالعربية بجمل قصيرة ومهنية.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as { messages: UIMessage[] };
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-2.5-flash");

        // Import server actions dynamically so this module stays client-safe.
        const { aiCreateExpense, aiCreateJournalEntry, aiCreateCustomer } = await import(
          "@/lib/accounting.functions"
        );

        const result = streamText({
          model,
          system: SYSTEM,
          messages: convertToModelMessages(messages),
          stopWhen: stepCountIs(8),
          tools: {
            record_expense: tool({
              description: "Persist a new expense (draft, pending accountant review) in the accounting database.",
              inputSchema: z.object({
                vendor: z.string().describe("Vendor / supplier name"),
                amount: z.number().describe("Amount, positive"),
                currency: z.string().default("EUR"),
                category: z.string().default("Other").describe("Meals, Travel, Office, Software, Utilities, Marketing, Other"),
                vatRate: z.number().default(24).describe("VAT percent (0, 10, 14, 24)"),
                date: z.string().optional().describe("YYYY-MM-DD (defaults to today)"),
                notes: z.string().optional(),
              }),
              execute: async (input) => {
                try {
                  return await aiCreateExpense({ data: input });
                } catch (e) {
                  return { error: (e as Error).message };
                }
              },
            }),
            create_journal_entry: tool({
              description: "Post a double-entry journal in the accounting ledger. Provide accounts by their chart-of-accounts code.",
              inputSchema: z.object({
                debitAccountCode: z.string().describe("Chart-of-accounts code for the debit side (e.g. 4000)"),
                creditAccountCode: z.string().describe("Chart-of-accounts code for the credit side (e.g. 1910)"),
                amount: z.number().describe("Amount, positive"),
                memo: z.string().optional(),
                date: z.string().optional().describe("YYYY-MM-DD"),
              }),
              execute: async (input) => {
                try {
                  return await aiCreateJournalEntry({ data: input });
                } catch (e) {
                  return { error: (e as Error).message };
                }
              },
            }),
            create_customer: tool({
              description: "Create a new customer in the sales ledger.",
              inputSchema: z.object({
                name: z.string(),
                vatId: z.string().optional(),
                email: z.string().optional(),
                country: z.string().default("FI"),
              }),
              execute: async (input) => {
                try {
                  return await aiCreateCustomer({ data: input });
                } catch (e) {
                  return { error: (e as Error).message };
                }
              },
            }),
          },
        });

        return result.toUIMessageStreamResponse({ originalMessages: messages });
      },
    },
  },
});
