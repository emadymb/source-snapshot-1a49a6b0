import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { Screen, DataCard } from "@/components/screens/RichScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { hrmStore, useHrmStore } from "@/lib/mock/hrm";
import { toast } from "sonner";

export const Route = createFileRoute("/client/accounting/holidays")({ component: HolidaysPage });

const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

function HolidaysPage() {
  const holidays = useHrmStore((s) => s.holidays);
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), label: "" });

  const byMonth = useMemo(() => {
    const map: Record<number, { id: string; date: string; label: string; day: number }[]> = {};
    for (let m = 0; m < 12; m++) map[m] = [];
    for (const h of holidays) {
      const d = new Date(h.date);
      if (d.getFullYear() !== year) continue;
      map[d.getMonth()].push({ ...h, day: d.getDate() });
    }
    return map;
  }, [holidays, year]);

  return (
    <div dir="rtl">
    <Screen
      title="العطل الرسمية"
      description="أضف واعرض العطل حسب الشهر."
      icon={CalendarDays}
      actions={
        <div className="flex items-center gap-2">
          <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value) || year)} className="w-24 rounded-xl" />
          <Button onClick={() => setOpen(true)} className="rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 text-white">
            <Plus className="me-2 size-4" /> عطلة جديدة
          </Button>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {MONTHS_AR.map((name, i) => (
          <DataCard key={i} title={`${name} ${year}`}>
            {byMonth[i].length === 0 ? (
              <p className="py-3 text-center text-xs text-muted-foreground">لا توجد عطل.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {byMonth[i].sort((a, b) => a.day - b.day).map((h) => (
                  <li key={h.id} className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2">
                    <span>
                      <span className="inline-flex size-7 items-center justify-center rounded-lg bg-white text-xs font-semibold shadow-sm">{h.day}</span>
                      <span className="ms-2">{h.label}</span>
                    </span>
                    <button onClick={() => { hrmStore.removeHoliday(h.id); toast.success("تم الحذف"); }} className="text-muted-foreground hover:text-rose-500">
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </DataCard>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>عطلة رسمية جديدة</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>التاريخ</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            <div><Label>الاسم</Label><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={() => { if (!form.label.trim()) return; hrmStore.addHoliday(form); setForm({ date: new Date().toISOString().slice(0,10), label: "" }); setOpen(false); toast.success("تمت الإضافة"); }}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Screen>
    </div>
  );
}