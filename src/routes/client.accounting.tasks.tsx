import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ClipboardList, Plus, Trash2 } from "lucide-react";
import { Screen, DataCard } from "@/components/screens/RichScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { hrmStore, useHrmStore } from "@/lib/mock/hrm";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/client/accounting/tasks")({ component: TasksPage });

function TasksPage() {
  const tasks = useHrmStore((s) => s.tasks);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [filter, setFilter] = useState<"all" | "open" | "done">("open");

  const groups = useMemo(() => {
    const list = tasks.filter((t) => filter === "all" || (filter === "open" ? !t.done : t.done));
    const byDate: Record<string, typeof list> = {};
    for (const t of list) (byDate[t.date] ??= []).push(t);
    return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b));
  }, [tasks, filter]);

  const add = () => {
    if (!title.trim()) return;
    hrmStore.addTask({ title: title.trim(), date });
    setTitle("");
  };

  return (
    <div dir="rtl">
    <Screen title="قائمة المهام" description="إدارة المهام اليومية للفريق." icon={ClipboardList}>
      <DataCard title="مهمة جديدة">
        <form onSubmit={(e) => { e.preventDefault(); add(); }} className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[220px]">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثل: مراجعة الفواتير" className="rounded-xl" />
          </div>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44 rounded-xl" />
          <Button type="submit" className="rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white">
            <Plus className="me-2 size-4" /> إضافة
          </Button>
        </form>
      </DataCard>

      <DataCard
        title="المهام"
        action={
          <div className="flex gap-1 rounded-xl bg-muted p-1 text-xs">
            {(["open", "done", "all"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={cn("rounded-lg px-3 py-1.5", filter === f ? "bg-white shadow" : "text-muted-foreground")}>
                {f === "open" ? "المفتوحة" : f === "done" ? "المكتملة" : "الكل"}
              </button>
            ))}
          </div>
        }
      >
        {groups.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">لا توجد مهام.</p>}
        <div className="space-y-4">
          {groups.map(([d, items]) => (
            <div key={d}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{d}</p>
              <ul className="space-y-1">
                {items.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 rounded-xl bg-secondary/40 px-3 py-2 text-sm">
                    <Checkbox checked={t.done} onCheckedChange={() => hrmStore.toggleTask(t.id)} />
                    <span className={cn("flex-1", t.done && "line-through text-muted-foreground")}>{t.title}</span>
                    {t.assignee && <span className="text-xs text-muted-foreground">{t.assignee}</span>}
                    <button onClick={() => hrmStore.removeTask(t.id)} className="text-muted-foreground hover:text-rose-500">
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DataCard>
    </Screen>
    </div>
  );
}