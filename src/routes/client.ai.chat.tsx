import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Bot, Plus, Send, Trash2, MessageSquare, Sparkles, Paperclip, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { aiStore, useAiStore, estimateCost, pickRouteOrder } from "@/lib/mock/ai";
import { logAiUsage } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/client/ai/chat")({ component: ChatPage });

function ChatPage() {
  const conversations = useAiStore((s) => s.conversations);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Ensure at least one conversation exists.
  useEffect(() => {
    if (!activeId && conversations.length === 0) {
      const c = aiStore.createConversation("ws_demo", "user_demo", "محادثة جديدة");
      setActiveId(c.id);
    } else if (!activeId && conversations[0]) {
      setActiveId(conversations[0].id);
    }
  }, [activeId, conversations]);

  return (
    <div className="grid h-[calc(100dvh-8rem)] gap-3 lg:grid-cols-[280px_1fr]" dir="rtl">
      <aside className="glass hidden flex-col overflow-hidden rounded-2xl border-glass-border lg:flex">
        <div className="border-b border-glass-border p-3">
          <Button
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
            onClick={() => {
              const c = aiStore.createConversation("ws_demo", "user_demo");
              setActiveId(c.id);
            }}
          >
            <Plus className="me-2 size-4" /> محادثة جديدة
          </Button>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto p-2">
          {conversations.length === 0 && (
            <p className="p-3 text-center text-xs text-muted-foreground">لا توجد محادثات</p>
          )}
          {conversations.map((c) => (
            <div
              key={c.id}
              className={cn(
                "flex items-center gap-2 rounded-xl p-2 text-sm transition-colors",
                activeId === c.id ? "bg-indigo-50 text-indigo-800" : "hover:bg-slate-50",
              )}
            >
              <button
                onClick={() => setActiveId(c.id)}
                className="flex flex-1 items-center gap-2 truncate text-start"
              >
                <MessageSquare className="size-4 shrink-0" />
                <span className="truncate">{c.title}</span>
              </button>
              <button
                onClick={() => {
                  aiStore.deleteConversation(c.id);
                  if (activeId === c.id) setActiveId(null);
                }}
                className="text-slate-400 hover:text-rose-500"
                aria-label="حذف"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      </aside>

      {activeId ? <ChatWindow key={activeId} conversationId={activeId} /> : (
        <div className="glass flex items-center justify-center rounded-2xl border-glass-border text-muted-foreground">
          <p className="text-sm">اختر محادثة أو أنشئ واحدة جديدة</p>
        </div>
      )}
    </div>
  );
}

function ChatWindow({ conversationId }: { conversationId: string }) {
  const stored = useAiStore((s) => s.messages.filter((m) => m.conversationId === conversationId));
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const initialMessages = useMemo(
    () => stored.map((m) => ({ id: m.id, role: m.role, parts: [{ type: "text" as const, text: m.content }] })),
    // Only compute on mount per conversation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conversationId],
  );

  const { messages, sendMessage, status } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (e) => toast.error(e.message),
    onFinish: ({ message }) => {
      const text = message.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
      const outTok = Math.ceil(text.length / 4);
      const inTok = Math.ceil(messages.reduce((a, m) => a + m.parts.reduce((b, p) => b + (p.type === "text" ? p.text.length : 0), 0), 0) / 4);
      const model = pickRouteOrder()[0];
      aiStore.logUsage({
        workspaceId: "ws_demo",
        modelName: model,
        operation: "chat",
        inputTokens: inTok,
        outputTokens: outTok,
        cost: estimateCost(model, inTok, outTok),
        success: true,
        processingTime: 900,
      });
      aiStore.addMessage({ conversationId, role: "assistant", content: text });
      // Persist real telemetry when a database is reachable (no-op in preview).
      void logAiUsage({
        data: {
          modelName: model,
          operation: "chat",
          inputTokens: inTok,
          outputTokens: outTok,
          cost: estimateCost(model, inTok, outTok),
          success: true,
          processingTime: 900,
        },
      }).catch(() => {});
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const busy = status === "submitted" || status === "streaming";

  const submit = () => {
    const t = input.trim();
    if (!t || busy) return;
    aiStore.addMessage({ conversationId, role: "user", content: t });
    // Auto-rename first message.
    const conv = aiStore.getState().conversations.find((c) => c.id === conversationId);
    if (conv && conv.title === "محادثة جديدة") {
      aiStore.renameConversation(conversationId, t.slice(0, 40));
    }
    sendMessage({ text: t });
    setInput("");
  };

  return (
    <div className="glass flex min-h-0 flex-col overflow-hidden rounded-2xl border-glass-border">
      <header className="flex items-center gap-3 border-b border-glass-border bg-white/60 p-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
          <Bot className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Fiksu AI Assistant</p>
          <p className="text-[11px] text-muted-foreground">Router: {pickRouteOrder().slice(0, 3).join(" → ")}</p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Sparkles className="size-8 text-indigo-500" />
            <p className="font-display text-lg font-semibold">اسأل أي شيء</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {["ماهي ضريبة القيمة المضافة في فنلندا؟", "كيف أسجل مصروف سفر؟", "ما نسبة ALV على الطعام؟", "لخص لي المصروفات هذا الشهر"].map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="rounded-xl border border-glass-border bg-white p-3 text-sm hover:bg-slate-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => {
          const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
          return (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
              <div
                className={cn(
                  "max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                  m.role === "user"
                    ? "rounded-bl-md bg-gradient-to-br from-indigo-600 to-violet-600 text-white"
                    : "rounded-br-md bg-secondary/70",
                )}
              >
                {text}
              </div>
            </div>
          );
        })}
        {busy && (
          <div className="flex justify-end">
            <div className="flex items-center gap-2 rounded-2xl bg-secondary/70 px-4 py-2.5 text-xs">
              <Loader2 className="size-3.5 animate-spin" /> يفكر...
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        className="flex items-center gap-2 border-t border-glass-border bg-white/60 p-3"
      >
        <Button type="button" variant="ghost" size="icon" className="size-9 rounded-xl" aria-label="مرفق">
          <Paperclip className="size-4" />
        </Button>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="اكتب سؤالك…"
          className="flex-1 rounded-xl border-glass-border bg-white"
          dir="rtl"
        />
        <Button type="submit" disabled={busy || !input.trim()} className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
          <Send className="me-2 size-4" /> إرسال
        </Button>
      </form>
    </div>
  );
}
