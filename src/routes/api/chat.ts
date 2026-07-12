import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, tool, stepCountIs, type UIMessage } from "ai";
import { z } from "zod";

const SYSTEM = `أنت "المساعد المحاسبي الذكي" — مساعد محاسبة ذكي يتحدث العربية.
مهمتك مساعدة أصحاب الأعمال الصغيرة في تسجيل المصروفات والإيرادات والفواتير.

عندما يذكر المستخدم مصروفاً أو دخلاً أو معاملة مالية:
1. استخرج التفاصيل (المبلغ، العملة، الفئة، الوصف).
2. استدعِ الأداة record_expense فوراً لإنشاء مسودة.
3. بعد استدعاء الأداة، أرسل رسالة قصيرة تؤكد الحفظ وتذكر أن المسودة بانتظار مراجعة المحاسب.

اقتراحات الفئات: Meals, Travel, Office, Software, Utilities, Marketing, Other.
العملة الافتراضية: SAR.
كن مختصراً ومهنياً. رد دائماً بالعربية.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as { messages: UIMessage[] };
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-2.5-flash");

        const result = streamText({
          model,
          system: SYSTEM,
          messages: convertToModelMessages(messages),
          stopWhen: stepCountIs(5),
          tools: {
            record_expense: tool({
              description: "سجّل مسودة مصروف أو معاملة مالية للمراجعة من قبل المحاسب.",
              inputSchema: z.object({
                type: z.enum(["expense", "income"]).describe("نوع المعاملة"),
                amount: z.number().describe("المبلغ الرقمي"),
                currency: z.string().describe("رمز العملة، مثل SAR أو EUR"),
                category: z.string().describe("الفئة، مثل Meals أو Travel"),
                description: z.string().describe("وصف مختصر بالعربية"),
              }),
              execute: async (input) => ({
                ...input,
                id: `DR-${Date.now().toString(36).toUpperCase()}`,
                status: "pending_review",
                createdAt: new Date().toISOString(),
              }),
            }),
          },
        });

        return result.toUIMessageStreamResponse({ originalMessages: messages });
      },
    },
  },
});
