import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAiStore } from "@/lib/mock/ai";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, Search, MessageSquare, Bot, User } from "lucide-react";
import { AiScreen } from "@/components/ai/AiScreen";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/super/ai/conversations")({ component: ConversationsPage });

function ConversationsPage() {
  const conversations = useAiStore((s) => s.conversations);
  const messages = useAiStore((s) => s.messages);
  const [q, setQ] = useState("");
  const [range, setRange] = useState<"all" | "24h" | "7d" | "30d">("all");
  const [activeId, setActiveId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const now = Date.now();
    const spans: Record<typeof range, number> = { all: Infinity, "24h": 864e5, "7d": 7 * 864e5, "30d": 30 * 864e5 };
    return conversations
      .filter((c) => now - c.updatedAt <= spans[range])
      .filter((c) => {
        if (!q.trim()) return true;
        const inTitle = c.title.toLowerCase().includes(q.toLowerCase());
        const inMsg = messages.some(
          (m) => m.conversationId === c.id && m.content.toLowerCase().includes(q.toLowerCase()),
        );
        return inTitle || inMsg;
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [conversations, messages, q, range]);

  const active = filtered.find((c) => c.id === activeId) ?? filtered[0] ?? null;
  const activeMessages = active ? messages.filter((m) => m.conversationId === active.id) : [];

  const exportAll = () => {
    const rows = [["conversation_id", "title", "created_at", "role", "content"]];
    for (const c of filtered) {
      for (const m of messages.filter((x) => x.conversationId === c.id)) {
        rows.push([c.id, c.title, new Date(m.createdAt).toISOString(), m.role, m.content.replace(/\n/g, " ")]);
      }
    }
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-conversations-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportOne = (id: string) => {
    const c = conversations.find((x) => x.id === id);
    if (!c) return;
    const msgs = messages.filter((m) => m.conversationId === id);
    const text = `# ${c.title}\n\n` + msgs.map((m) => `**${m.role}** (${new Date(m.createdAt).toLocaleString()})\n\n${m.content}\n`).join("\n---\n");
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${c.title.replace(/[^\w\-]+/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div dir="rtl">
    <AiScreen
      title="سجل المحادثات"
      description="استعرض، ابحث، وصدّر محادثات المساعد الذكي."
      icon={MessageSquare}
      actions={
        <Button onClick={exportAll} className="rounded-xl bg-white text-indigo-700 hover:bg-white/90">
          <Download className="me-2 size-4" /> تصدير CSV
        </Button>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث في العناوين والرسائل…" className="rounded-xl pe-9" />
        </div>
        <div className="flex gap-1 rounded-xl bg-muted p-1 text-xs">
          {(["24h", "7d", "30d", "all"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn("rounded-lg px-3 py-1.5 transition-colors", range === r ? "bg-white shadow" : "text-muted-foreground")}
            >
              {r === "all" ? "الكل" : r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[320px_1fr]">
        <aside className="glass max-h-[70vh] overflow-y-auto rounded-2xl border-glass-border p-2">
          {filtered.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">لا توجد محادثات مطابقة.</p>
          )}
          {filtered.map((c) => {
            const count = messages.filter((m) => m.conversationId === c.id).length;
            return (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={cn(
                  "flex w-full flex-col items-start gap-1 rounded-xl p-3 text-start transition-colors",
                  active?.id === c.id ? "bg-indigo-50" : "hover:bg-slate-50",
                )}
              >
                <div className="flex w-full items-center gap-2">
                  <MessageSquare className="size-4 text-indigo-500" />
                  <span className="flex-1 truncate text-sm font-medium">{c.title}</span>
                  <span className="text-[10px] text-muted-foreground">{count}</span>
                </div>
                <span className="text-[11px] text-muted-foreground">{new Date(c.updatedAt).toLocaleString()}</span>
              </button>
            );
          })}
        </aside>

        <section className="glass min-h-[400px] rounded-2xl border-glass-border">
          {active ? (
            <>
              <header className="flex items-center justify-between gap-2 border-b border-glass-border p-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{active.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {activeMessages.length} رسالة · workspace: {active.workspaceId}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => exportOne(active.id)} className="rounded-xl">
                    <Download className="me-1 size-3.5" /> تصدير
                  </Button>
                </div>
              </header>
              <div className="space-y-3 p-4">
                {activeMessages.length === 0 && (
                  <p className="py-10 text-center text-sm text-muted-foreground">لا توجد رسائل في هذه المحادثة.</p>
                )}
                {activeMessages.map((m) => (
                  <div key={m.id} className={cn("flex gap-2", m.role === "user" ? "justify-start" : "justify-end")}>
                    <div className={cn("flex max-w-[80%] gap-2 rounded-2xl px-3 py-2 text-sm", m.role === "user" ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white" : "bg-secondary/70")}>
                      {m.role === "user" ? <User className="size-4 shrink-0" /> : <Bot className="size-4 shrink-0" />}
                      <span className="whitespace-pre-wrap">{m.content}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center p-10 text-sm text-muted-foreground">
              اختر محادثة لعرض تفاصيلها.
            </div>
          )}
        </section>
      </div>
    </AiScreen>
    </div>
  );
}
