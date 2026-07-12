import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, Plus, Trash2 } from "lucide-react";
import { Screen, DataCard, DataTable } from "@/components/screens/RichScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { hrmStore, useHrmStore, type Reminder } from "@/lib/mock/hrm";
import { toast } from "sonner";

export const Route = createFileRoute("/client/accounting/reminders")({ component: RemindersPage });

const REPEAT: Reminder["repeat"][] = ["once", "daily", "weekly", "monthly"];

function RemindersPage() {
  const reminders = useHrmStore((s) => s.reminders);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Omit<Reminder, "id">>({
    title: "", date: new Date().toISOString().slice(0, 10), time: "09:00", repeat: "once",
  });

  return (
    <div dir="rtl">
    <Screen
      title="التذكيرات"
      description="أضف تذكيرات لمرة واحدة أو متكررة."
      icon={Bell}
      actions={<Button onClick={() => setOpen(true)} className="rounded-xl bg-gradient-to-r from-lime-500 to-green-600 text-white"><Plus className="me-2 size-4" /> تذكير جديد</Button>}
    >
      <DataCard title="جميع التذكيرات">
        <DataTable<Reminder>
          empty="لا توجد تذكيرات."
          rows={reminders}
          columns={[
            { key: "title", label: "الحدث", render: (r) => <span className="font-medium">{r.title}</span> },
            { key: "date", label: "التاريخ" },
            { key: "time", label: "الوقت" },
            { key: "repeat", label: "التكرار" },
            { key: "actions", label: "", className: "text-end", render: (r) => (
              <button onClick={() => { hrmStore.removeReminder(r.id); toast.success("تم الحذف"); }} className="text-muted-foreground hover:text-rose-500"><Trash2 className="size-4" /></button>
            ) },
          ]}
        />
      </DataCard>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>تذكير جديد</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>الحدث</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div><Label>التاريخ</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label>الوقت</Label><Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></div>
            </div>
            <div>
              <Label>التكرار</Label>
              <Select value={form.repeat} onValueChange={(v) => setForm({ ...form, repeat: v as Reminder["repeat"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REPEAT.map((r) => <SelectItem key={r} value={r}>{r === "once" ? "مرة واحدة" : r === "daily" ? "يومي" : r === "weekly" ? "أسبوعي" : "شهري"}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={() => { if (!form.title.trim()) return; hrmStore.addReminder(form); setForm({ title: "", date: new Date().toISOString().slice(0,10), time: "09:00", repeat: "once" }); setOpen(false); toast.success("تمت الإضافة"); }}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Screen>
    </div>
  );
}