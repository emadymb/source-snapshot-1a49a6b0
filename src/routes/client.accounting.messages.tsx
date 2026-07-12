import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { Screen, DataCard } from "@/components/screens/RichScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hrmStore, useHrmStore, type InternalMessage } from "@/lib/mock/hrm";
import { toast } from "sonner";

export const Route = createFileRoute("/client/accounting/messages")({ component: MessagesPage });

function MessagesPage() {
  const messages = useHrmStore((s) => s.messages);
  const [form, setForm] = useState<Omit<InternalMessage, "id" | "createdAt" | "from">>({ to: "all", subject: "", body: "" });

  const send = () => {
    if (!form.subject.trim() || !form.body.trim()) { toast.error("الرجاء إدخال الموضوع والمحتوى"); return; }
    hrmStore.sendMessage({ from: "You", ...form });
    setForm({ to: form.to, subject: "", body: "" });
    toast.success("تم الإرسال");
  };

  return (
    <div dir="rtl">
    <Screen title="المراسلات الداخلية" description="إرسال رسائل للجميع أو لموقع محدد." icon={MessageSquare}>
      <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
        <DataCard title="رسالة جديدة">
          <div className="grid gap-3">
            <div>
              <Label>إلى</Label>
              <Select value={form.to} onValueChange={(v) => setForm({ ...form, to: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الجميع</SelectItem>
                  <SelectItem value="firm">فريق المكتب</SelectItem>
                  <SelectItem value="clients">العملاء</SelectItem>
                  <SelectItem value="employees">الموظفون</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>الموضوع</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
            <div><Label>المحتوى</Label><Textarea rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
            <Button onClick={send} className="rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white"><Send className="me-2 size-4" /> إرسال</Button>
          </div>
        </DataCard>
        <DataCard title={`الصندوق الوارد (${messages.length})`}>
          {messages.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">لا توجد رسائل.</p>}
          <div className="space-y-2">
            {messages.map((m) => (
              <div key={m.id} className="glass rounded-xl border-glass-border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{m.subject}</p>
                    <p className="text-xs text-muted-foreground">{m.from} → {m.to} · {new Date(m.createdAt).toLocaleString()}</p>
                  </div>
                  <button onClick={() => { hrmStore.removeMessage(m.id); toast.success("تم الحذف"); }} className="text-muted-foreground hover:text-rose-500"><Trash2 className="size-4" /></button>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm">{m.body}</p>
              </div>
            ))}
          </div>
        </DataCard>
      </div>
    </Screen>
    </div>
  );
}