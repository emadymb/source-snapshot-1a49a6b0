import { useState, type DragEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Flame, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { useFirm, type FirmTask } from "@/lib/mock/firm";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/firm/tasks")({ component: TasksPage });

const COLUMNS: { id: FirmTask["status"]; label: string; tone: string }[] = [
  { id: "todo", label: "To do", tone: "bg-slate-100 text-slate-700" },
  { id: "in-progress", label: "In progress", tone: "bg-indigo-100 text-indigo-700" },
  { id: "review", label: "Review", tone: "bg-amber-100 text-amber-700" },
  { id: "done", label: "Done", tone: "bg-emerald-100 text-emerald-700" },
];

const PRIORITY_ICON: Record<FirmTask["priority"], { icon: typeof Flame; color: string }> = {
  urgent: { icon: Flame, color: "text-rose-600" },
  high: { icon: AlertCircle, color: "text-amber-600" },
  med: { icon: Clock, color: "text-sky-600" },
  low: { icon: Clock, color: "text-slate-400" },
};

function TasksPage() {
  const { t } = useI18n();
  const { tasks, clients, staff, moveTask, can } = useFirm();
  const [assignee, setAssignee] = useState<string>("all");
  const [client, setClient] = useState<string>("all");
  const [dragging, setDragging] = useState<string | null>(null);

  const filtered = tasks.filter(t => (assignee === "all" || t.assigneeId === assignee) && (client === "all" || t.clientId === client));

  const onDrop = (status: FirmTask["status"]) => (e: DragEvent) => {
    e.preventDefault();
    if (!dragging) return;
    if (!can("tasks.assign") && !can("tasks.complete")) { toast.error("You don't have permission to move tasks"); return; }
    moveTask(dragging, status);
    setDragging(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t("firm.tasks.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("firm.tasks.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Select value={assignee} onValueChange={setAssignee}>
            <SelectTrigger className="w-44 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assignees</SelectItem>
              {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={client} onValueChange={setClient}>
            <SelectTrigger className="w-52 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All clients</SelectItem>
              {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map(col => {
          const items = filtered.filter(t => t.status === col.id);
          return (
            <div key={col.id} onDragOver={(e) => e.preventDefault()} onDrop={onDrop(col.id)} className="flex flex-col rounded-2xl bg-slate-50/70 p-3">
              <header className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", col.tone)}>{col.label}</span>
                  <span className="text-xs text-muted-foreground">{items.length}</span>
                </div>
              </header>
              <div className="space-y-2">
                {items.map(t => {
                  const c = clients.find(x => x.id === t.clientId);
                  const a = staff.find(x => x.id === t.assigneeId);
                  const overdue = new Date(t.dueDate) < new Date() && t.status !== "done";
                  const P = PRIORITY_ICON[t.priority];
                  return (
                    <article key={t.id}
                      draggable
                      onDragStart={() => setDragging(t.id)}
                      onDragEnd={() => setDragging(null)}
                      className={cn(
                        "cursor-grab rounded-xl border border-glass-border bg-white p-3 shadow-sm transition active:cursor-grabbing",
                        dragging === t.id && "opacity-40",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <P.icon className={cn("mt-0.5 size-4 shrink-0", P.color)} />
                        <p className="text-sm font-medium leading-snug">{t.title}</p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{c?.name}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Avatar className="size-6"><AvatarFallback className="bg-slate-900 text-[10px] text-white">{a?.avatarSeed}</AvatarFallback></Avatar>
                          <span className="text-xs text-muted-foreground">{t.hours}h</span>
                        </div>
                        <Badge variant="outline" className={cn("rounded-md text-[10px] font-normal", overdue ? "border-rose-200 bg-rose-50 text-rose-700" : "text-muted-foreground")}>{t.dueDate}</Badge>
                      </div>
                    </article>
                  );
                })}
                {items.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-xs text-muted-foreground">Drop tasks here</p>}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">Drag cards between columns to change status.</p>
    </div>
  );
}
