import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { StickyNote, Plus, Trash2 } from "lucide-react";
import { Screen, DataCard } from "@/components/screens/RichScreen";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hrmStore, useHrmStore } from "@/lib/mock/hrm";
import { toast } from "sonner";

export const Route = createFileRoute("/client/accounting/memos")({ component: MemosPage });

function MemosPage() {
  const memos = useHrmStore((s) => s.memos);
  const [body, setBody] = useState("");
  const [sharedWith, setSharedWith] = useState("all");

  const add = () => {
    if (!body.trim()) return;
    hrmStore.addMemo({ author: "You", body: body.trim(), sharedWith });
    setBody("");
    toast.success("تمت الإضافة");
  };

  return (
    <div dir="rtl">
    <Screen title="المذكرات" description="مذكرات وملاحظات داخلية قابلة للمشاركة." icon={StickyNote}>
      <DataCard title="مذكرة جديدة">
        <div className="grid gap-3">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="اكتب مذكرة…" rows={3} />
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-52">
              <Label>المشاركة مع</Label>
              <Select value={sharedWith} onValueChange={setSharedWith}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الجميع</SelectItem>
                  <SelectItem value="admins">المدراء</SelectItem>
                  <SelectItem value="accountants">المحاسبون</SelectItem>
                  <SelectItem value="employees">الموظفون</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={add} className="rounded-xl bg-gradient-to-r from-slate-600 to-slate-800 text-white"><Plus className="me-2 size-4" /> نشر</Button>
          </div>
        </div>
      </DataCard>
      <DataCard title={`المذكرات (${memos.length})`}>
        {memos.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">لا توجد مذكرات.</p>}
        <div className="space-y-2">
          {memos.map((m) => (
            <div key={m.id} className="glass flex items-start justify-between gap-3 rounded-xl border-glass-border p-4">
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">{m.author} · {new Date(m.createdAt).toLocaleString()} · {m.sharedWith}</p>
              </div>
              <button onClick={() => { hrmStore.removeMemo(m.id); toast.success("تم الحذف"); }} className="text-muted-foreground hover:text-rose-500"><Trash2 className="size-4" /></button>
            </div>
          ))}
        </div>
      </DataCard>
    </Screen>
    </div>
  );
}