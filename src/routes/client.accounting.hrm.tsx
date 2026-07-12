import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Users, Clock, CalendarDays, Wallet, ClipboardList, Bell, FileText, MessageSquare, ArrowLeft, StickyNote } from "lucide-react";
import { Screen, KpiGrid, DataCard } from "@/components/screens/RichScreen";
import { hrmSummary, listLeaves } from "@/lib/hrm.functions";
import { useHrmStore } from "@/lib/mock/hrm";

export const Route = createFileRoute("/client/accounting/hrm")({ component: HrmDashboard });

const eur = (n: number) => n.toLocaleString("fi-FI", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

function HrmDashboard() {
  const sumFn = useServerFn(hrmSummary);
  const leavesFn = useServerFn(listLeaves);
  const { data: summary } = useQuery({ queryKey: ["hrm", "summary"], queryFn: () => sumFn() });
  const { data: leaves = [] } = useQuery({ queryKey: ["hrm", "leaves"], queryFn: () => leavesFn() });
  const tasks = useHrmStore((s) => s.tasks);
  const reminders = useHrmStore((s) => s.reminders);

  const openTasks = tasks.filter((t) => !t.done).length;
  const pendingLeaves = summary?.pendingLeaves ?? leaves.filter((l) => l.status === "pending").length;

  const kpis = [
    { label: "الموظفون", value: String(summary?.employees ?? "—") },
    { label: "النشطون", value: String(summary?.activeEmployees ?? "—") },
    { label: "طلبات إجازة معلّقة", value: String(pendingLeaves) },
    { label: "رواتب هذا الشهر", value: summary ? eur(summary.monthlyPayroll) : "—" },
  ];

  const cards: { to: string; icon: React.ComponentType<{ className?: string }>; label: string; sub: string; tone: string }[] = [
    { to: "/client/accounting/employees", icon: Users, label: "الموظفون", sub: "قائمة، إضافة، تعديل", tone: "from-emerald-500 to-teal-600" },
    { to: "/client/accounting/attendance", icon: Clock, label: "الحضور", sub: "دخول/خروج، تقارير", tone: "from-blue-500 to-indigo-600" },
    { to: "/client/accounting/leaves", icon: CalendarDays, label: "الإجازات", sub: "طلبات، موافقات", tone: "from-amber-500 to-orange-600" },
    { to: "/client/accounting/payroll", icon: Wallet, label: "الرواتب", sub: "توليد وصرف", tone: "from-rose-500 to-fuchsia-600" },
    { to: "/client/accounting/holidays", icon: CalendarDays, label: "العطل الرسمية", sub: "تقويم الأعياد", tone: "from-cyan-500 to-sky-600" },
    { to: "/client/accounting/tasks", icon: ClipboardList, label: "قائمة المهام", sub: "إضافة وإكمال", tone: "from-violet-500 to-purple-600" },
    { to: "/client/accounting/reminders", icon: Bell, label: "التذكيرات", sub: "مرة أو متكررة", tone: "from-lime-500 to-green-600" },
    { to: "/client/accounting/memos", icon: StickyNote, label: "المذكرات", sub: "مشاركة داخلية", tone: "from-slate-500 to-slate-700" },
    { to: "/client/accounting/messages", icon: MessageSquare, label: "المراسلات الداخلية", sub: "رسائل الفريق", tone: "from-pink-500 to-rose-600" },
    { to: "/client/documents", icon: FileText, label: "المستندات", sub: "رفع ومشاركة", tone: "from-indigo-500 to-blue-600" },
  ];

  return (
    <div dir="rtl">
    <Screen title="لوحة الموارد البشرية" description="نظرة شاملة على الموظفين، الحضور، الإجازات والرواتب." icon={Users}>
      <KpiGrid kpis={kpis} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.to} to={c.to} className="glass group flex items-start gap-3 rounded-2xl border-glass-border p-4 transition-all hover:shadow-lg">
            <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${c.tone} text-white shadow`}>
              <c.icon className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{c.label}</p>
              <p className="truncate text-xs text-muted-foreground">{c.sub}</p>
            </div>
            <ArrowLeft className="mt-2 size-4 text-muted-foreground transition-transform group-hover:-translate-x-1" />
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DataCard title="مهام مفتوحة">
          {tasks.filter((t) => !t.done).slice(0, 6).length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">لا توجد مهام معلّقة.</p>
          )}
          <ul className="space-y-2 text-sm">
            {tasks.filter((t) => !t.done).slice(0, 6).map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2">
                <span>{t.title}</span>
                <span className="text-xs text-muted-foreground">{t.date}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">{openTasks} مهمة مفتوحة</p>
        </DataCard>

        <DataCard title="تذكيرات قادمة">
          {reminders.slice(0, 6).length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">لا توجد تذكيرات.</p>
          )}
          <ul className="space-y-2 text-sm">
            {reminders.slice(0, 6).map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2">
                <span>{r.title}</span>
                <span className="text-xs text-muted-foreground">{r.date} · {r.time} · {r.repeat}</span>
              </li>
            ))}
          </ul>
        </DataCard>
      </div>
    </Screen>
    </div>
  );
}
