import { createFileRoute } from "@tanstack/react-router";
import { Building2, Users, Briefcase, Receipt, TrendingUp, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useFirm } from "@/lib/mock/firm";

export const Route = createFileRoute("/firm/")({ component: FirmDashboard });

function FirmDashboard() {
  const { t } = useI18n();
  const { clients, staff, engagements, tasks, invoices } = useFirm();

  const mrr = clients.reduce((s, c) => s + c.mrr, 0);
  const activeEng = engagements.filter(e => e.status === "active").length;
  const overdueTasks = tasks.filter(t => new Date(t.dueDate) < new Date() && t.status !== "done").length;
  const utilization = Math.round(staff.filter(s => s.status === "active").reduce((s, x) => s + x.utilization, 0) / staff.filter(s => s.status === "active").length);
  const outstanding = invoices.filter(i => i.status === "overdue" || i.status === "sent").reduce((s, i) => s + i.amount, 0);

  const kpis = [
    { label: "MRR", value: `€${mrr.toLocaleString()}`, delta: "+8.4%", icon: TrendingUp, tone: "emerald" },
    { label: "Active clients", value: clients.filter(c => c.status === "active").length, delta: `${clients.length} total`, icon: Building2, tone: "indigo" },
    { label: "Active engagements", value: activeEng, delta: `${engagements.length} total`, icon: Briefcase, tone: "violet" },
    { label: "Team utilization", value: `${utilization}%`, delta: `${staff.filter(s => s.status === "active").length} seats`, icon: Users, tone: "sky" },
    { label: "Overdue tasks", value: overdueTasks, delta: overdueTasks > 0 ? "needs attention" : "on track", icon: AlertTriangle, tone: overdueTasks > 0 ? "amber" : "emerald" },
    { label: "Outstanding A/R", value: `€${outstanding.toLocaleString()}`, delta: "receivable", icon: Receipt, tone: "rose" },
  ];

  const toneMap: Record<string, string> = {
    emerald: "from-emerald-500 to-teal-600 text-white",
    indigo: "from-indigo-500 to-violet-600 text-white",
    violet: "from-violet-500 to-fuchsia-600 text-white",
    sky: "from-sky-500 to-cyan-600 text-white",
    amber: "from-amber-500 to-orange-600 text-white",
    rose: "from-rose-500 to-red-600 text-white",
  };

  const recentTasks = [...tasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 6);
  const topClients = [...clients].sort((a, b) => b.mrr - a.mrr).slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t("firm.dash.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("firm.dash.subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <article key={k.label} className="relative overflow-hidden rounded-2xl border border-glass-border bg-white p-5 shadow-sm">
            <div className={`absolute end-3 top-3 flex size-9 items-center justify-center rounded-xl bg-gradient-to-br ${toneMap[k.tone]}`}><k.icon className="size-4" /></div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{k.label}</p>
            <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{k.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{k.delta}</p>
          </article>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <section className="rounded-2xl border border-glass-border bg-white p-5 shadow-sm xl:col-span-2">
          <header className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Upcoming tasks</h3>
            <span className="text-xs text-muted-foreground">{tasks.filter(t => t.status !== "done").length} open</span>
          </header>
          <ul className="divide-y divide-slate-100">
            {recentTasks.map((t) => {
              const client = clients.find(c => c.id === t.clientId);
              const assignee = staff.find(s => s.id === t.assigneeId);
              const overdue = new Date(t.dueDate) < new Date() && t.status !== "done";
              return (
                <li key={t.id} className="flex items-center gap-3 py-3">
                  <div className={`flex size-9 items-center justify-center rounded-xl ${t.status === "done" ? "bg-emerald-50 text-emerald-600" : overdue ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-600"}`}>
                    {t.status === "done" ? <CheckCircle2 className="size-4" /> : <Clock className="size-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{client?.name} · {assignee?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-medium ${overdue ? "text-rose-600" : "text-slate-600"}`}>{t.dueDate}</p>
                    <p className="text-[10px] uppercase text-muted-foreground">{t.priority}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-2xl border border-glass-border bg-white p-5 shadow-sm">
          <header className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Top clients by MRR</h3>
          </header>
          <ul className="space-y-3">
            {topClients.map((c, i) => (
              <li key={c.id} className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white">{i + 1}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.plan} · {c.industry}</p>
                </div>
                <p className="text-sm font-semibold tabular-nums">€{c.mrr}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
