import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Download, TrendingUp, Users, Briefcase, Receipt, FileText, CalendarRange } from "lucide-react";
import { toast } from "sonner";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  AreaChart, Area,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n";
import { useFirm } from "@/lib/mock/firm";
import { PageGate } from "@/components/entitlements/GateBanner";

export const Route = createFileRoute("/firm/reports")({
  component: () => (
    <PageGate feature="firm.reports" title="Practice analytics" description="Available on Scale and Enterprise plans.">
      <ReportsPage />
    </PageGate>
  ),
});

function ReportsPage() {
  const { t } = useI18n();
  const { clients, staff, engagements, tasks, invoices, roles } = useFirm();

  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const [range, setRange] = useState("90");
  const [from, setFrom] = useState(iso(new Date(today.getFullYear(), today.getMonth() - 3, 1)));
  const [to, setTo] = useState(iso(today));

  const applyRangePreset = (v: string) => {
    setRange(v);
    const end = new Date();
    let start = new Date();
    if (v === "30") start.setDate(end.getDate() - 30);
    else if (v === "90") start.setDate(end.getDate() - 90);
    else if (v === "365") start.setDate(end.getDate() - 365);
    else if (v === "ytd") start = new Date(end.getFullYear(), 0, 1);
    else return;
    setFrom(iso(start));
    setTo(iso(end));
  };

  const stats = useMemo(() => {
    const activeClients = clients.filter((c) => c.status === "active");
    const mrr = activeClients.reduce((s, c) => s + c.mrr, 0);
    const arr = mrr * 12;
    const paid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
    const outstanding = invoices.filter((i) => i.status !== "paid" && i.status !== "draft").reduce((s, i) => s + i.amount, 0);
    const overdue = invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + i.amount, 0);
    const doneTasks = tasks.filter((t) => t.status === "done").length;
    const completion = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0;
    const activeStaff = staff.filter((s) => s.status === "active");
    const utilization = activeStaff.length
      ? Math.round(activeStaff.reduce((s, x) => s + x.utilization, 0) / activeStaff.length)
      : 0;
    const revenueByPlan = ["Starter", "Growth", "Scale", "Enterprise"].map((p) => ({
      plan: p,
      revenue: activeClients.filter((c) => c.plan === p).reduce((s, c) => s + c.mrr, 0),
      count: activeClients.filter((c) => c.plan === p).length,
    }));
    const totalPlanRev = revenueByPlan.reduce((s, x) => s + x.revenue, 0) || 1;
    const revenueByIndustry = Array.from(new Set(activeClients.map((c) => c.industry))).map((ind) => ({
      industry: ind,
      revenue: activeClients.filter((c) => c.industry === ind).reduce((s, c) => s + c.mrr, 0),
      clients: activeClients.filter((c) => c.industry === ind).length,
    })).sort((a, b) => b.revenue - a.revenue);
    return { mrr, arr, paid, outstanding, overdue, completion, utilization, revenueByPlan, totalPlanRev, revenueByIndustry };
  }, [clients, staff, tasks, invoices]);

  // Monthly trend series (mocked around real MRR)
  const monthly = useMemo(() => {
    const months = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    return months.map((m, i) => ({
      month: m,
      revenue: Math.round(stats.mrr * (0.72 + i * 0.045)),
      collected: Math.round(stats.mrr * (0.68 + i * 0.042)),
      outstanding: Math.round(stats.mrr * (0.05 + (i % 3) * 0.02)),
    }));
  }, [stats.mrr]);

  const staffPerf = staff.filter((s) => s.status === "active").map((s) => {
    const role = roles.find((r) => r.id === s.roleId);
    const hoursSpent = engagements.filter((e) => e.leadStaffId === s.id).reduce((sum, e) => sum + e.spentHours, 0);
    const revenue = hoursSpent * s.billableRate;
    const done = tasks.filter((tk) => tk.assigneeId === s.id && tk.status === "done").length;
    return { ...s, roleName: role?.name ?? "—", hoursSpent, revenue, done };
  }).sort((a, b) => b.revenue - a.revenue);

  const clientHealth = clients.map((c) => {
    const clientTasks = tasks.filter((tk) => tk.clientId === c.id);
    const openTasks = clientTasks.filter((tk) => tk.status !== "done").length;
    const overdueTasks = clientTasks.filter((tk) => new Date(tk.dueDate) < new Date() && tk.status !== "done").length;
    const revenue = invoices.filter((i) => i.clientId === c.id && i.status === "paid").reduce((s, i) => s + i.amount, 0);
    const score = Math.max(0, Math.min(100, 100 - overdueTasks * 15 - Math.max(0, openTasks - 5) * 3));
    return { ...c, openTasks, overdueTasks, revenue, score };
  }).sort((a, b) => a.score - b.score).slice(0, 6);

  const kpis = [
    { label: "MRR", value: `€${stats.mrr.toLocaleString()}`, delta: "+8.4% MoM", icon: TrendingUp, tone: "from-emerald-500 to-teal-600" },
    { label: "ARR", value: `€${stats.arr.toLocaleString()}`, delta: "annualized", icon: BarChart3, tone: "from-indigo-500 to-violet-600" },
    { label: "Collected", value: `€${stats.paid.toLocaleString()}`, delta: `€${stats.outstanding.toLocaleString()} pending`, icon: Receipt, tone: "from-sky-500 to-cyan-600" },
    { label: "Overdue A/R", value: `€${stats.overdue.toLocaleString()}`, delta: stats.overdue > 0 ? "at risk" : "clean", icon: Receipt, tone: "from-rose-500 to-red-600" },
    { label: "Team utilization", value: `${stats.utilization}%`, delta: `${staff.filter((s) => s.status === "active").length} seats`, icon: Users, tone: "from-amber-500 to-orange-600" },
    { label: "Task completion", value: `${stats.completion}%`, delta: `${tasks.length} total`, icon: Briefcase, tone: "from-violet-500 to-fuchsia-600" },
  ];

  const downloadBlob = (name: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    const rows: (string | number)[][] = [
      [`Fiksu Firm — Practice Report`],
      [`Range`, from, "→", to],
      [],
      ["KPI", "Value"],
      ...kpis.map((k) => [k.label, k.value]),
      [],
      ["Revenue by plan", "Clients", "Revenue (EUR)"],
      ...stats.revenueByPlan.map((p) => [p.plan, p.count, p.revenue]),
      [],
      ["Revenue by industry", "Clients", "Revenue (EUR)"],
      ...stats.revenueByIndustry.map((r) => [r.industry, r.clients, r.revenue]),
      [],
      ["Monthly trend", "Revenue", "Collected", "Outstanding"],
      ...monthly.map((m) => [m.month, m.revenue, m.collected, m.outstanding]),
      [],
      ["Staff", "Role", "Utilization %", "Hours", "Tasks done", "Revenue (EUR)"],
      ...staffPerf.map((s) => [s.name, s.roleName, s.utilization, s.hoursSpent, s.done, s.revenue]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    downloadBlob(`firm-report-${from}_${to}.csv`, csv, "text/csv;charset=utf-8");
    toast.success("CSV report exported");
  };

  const exportPdf = () => {
    // Lightweight HTML → print handoff. Users pick "Save as PDF" in the print dialog.
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Fiksu Firm Report ${from} — ${to}</title>
<style>
  body{font:14px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#0f172a;padding:32px}
  h1{font-size:24px;margin:0 0 4px}h2{font-size:16px;margin:24px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
  table{width:100%;border-collapse:collapse;margin-top:6px}th,td{padding:6px 10px;text-align:left;border-bottom:1px solid #f1f5f9;font-size:12px}
  th{background:#f8fafc;color:#475569;font-weight:600;text-transform:uppercase;letter-spacing:.03em;font-size:10px}
  .kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:12px}
  .kpi{border:1px solid #e2e8f0;border-radius:12px;padding:12px}
  .kpi-label{font-size:10px;color:#64748b;text-transform:uppercase}
  .kpi-value{font-size:20px;font-weight:600;margin-top:4px}
  .kpi-delta{font-size:11px;color:#64748b;margin-top:2px}
  .num{text-align:right;font-variant-numeric:tabular-nums}
  @media print{@page{margin:16mm}}
</style></head><body>
<h1>Fiksu Firm — Practice Report</h1>
<p style="color:#64748b;margin:0">${from} → ${to}</p>
<h2>Key metrics</h2>
<div class="kpi-grid">${kpis.map((k) => `<div class="kpi"><div class="kpi-label">${k.label}</div><div class="kpi-value">${k.value}</div><div class="kpi-delta">${k.delta}</div></div>`).join("")}</div>
<h2>Revenue by plan</h2>
<table><thead><tr><th>Plan</th><th class="num">Clients</th><th class="num">Revenue (EUR)</th></tr></thead><tbody>
${stats.revenueByPlan.map((p) => `<tr><td>${p.plan}</td><td class="num">${p.count}</td><td class="num">€${p.revenue.toLocaleString()}</td></tr>`).join("")}
</tbody></table>
<h2>Revenue by industry</h2>
<table><thead><tr><th>Industry</th><th class="num">Clients</th><th class="num">Revenue (EUR)</th></tr></thead><tbody>
${stats.revenueByIndustry.map((r) => `<tr><td>${r.industry}</td><td class="num">${r.clients}</td><td class="num">€${r.revenue.toLocaleString()}</td></tr>`).join("")}
</tbody></table>
<h2>Staff performance</h2>
<table><thead><tr><th>Member</th><th>Role</th><th class="num">Utilization</th><th class="num">Hours</th><th class="num">Tasks done</th><th class="num">Revenue</th></tr></thead><tbody>
${staffPerf.map((s) => `<tr><td>${s.name}</td><td>${s.roleName}</td><td class="num">${s.utilization}%</td><td class="num">${s.hoursSpent}h</td><td class="num">${s.done}</td><td class="num">€${s.revenue.toLocaleString()}</td></tr>`).join("")}
</tbody></table>
<script>window.onload=()=>setTimeout(()=>window.print(),150)</script>
</body></html>`;
    const w = window.open("", "_blank");
    if (!w) { toast.error("Please allow pop-ups to export PDF"); return; }
    w.document.open(); w.document.write(html); w.document.close();
    toast.success("Opened print dialog — choose 'Save as PDF'");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t("firm.reports.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("firm.reports.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={range} onValueChange={applyRangePreset}>
            <SelectTrigger className="w-40 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last 12 months</SelectItem>
              <SelectItem value="ytd">Year to date</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs">
            <CalendarRange className="size-3.5 text-slate-400" />
            <Input
              type="date"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setRange("custom"); }}
              className="h-7 w-32 border-0 bg-transparent p-1 text-xs shadow-none focus-visible:ring-0"
            />
            <span className="text-slate-400">→</span>
            <Input
              type="date"
              value={to}
              onChange={(e) => { setTo(e.target.value); setRange("custom"); }}
              className="h-7 w-32 border-0 bg-transparent p-1 text-xs shadow-none focus-visible:ring-0"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl"><Download className="me-1.5 size-4" />Export</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportCsv}><FileText className="me-2 size-4" />Export CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={exportPdf}><FileText className="me-2 size-4" />Export PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <article key={k.label} className="relative overflow-hidden rounded-2xl border border-glass-border bg-white p-5 shadow-sm">
            <div className={`absolute end-3 top-3 flex size-9 items-center justify-center rounded-xl bg-gradient-to-br ${k.tone} text-white`}>
              <k.icon className="size-4" />
            </div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{k.label}</p>
            <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{k.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{k.delta}</p>
          </article>
        ))}
      </div>

      {/* Trend chart */}
      <section className="rounded-2xl border border-glass-border bg-white p-5 shadow-sm">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold">Revenue trend</h3>
            <p className="text-xs text-muted-foreground">Revenue vs. collected cash, last 9 months</p>
          </div>
          <span className="text-xs text-muted-foreground">EUR · monthly</span>
        </header>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthly} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="col" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                formatter={(v: number) => `€${v.toLocaleString()}`}
              />
              <Area type="monotone" dataKey="revenue" stroke="#059669" strokeWidth={2} fill="url(#rev)" name="Revenue" />
              <Area type="monotone" dataKey="collected" stroke="#0ea5e9" strokeWidth={2} fill="url(#col)" name="Collected" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Breakdown charts */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-glass-border bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-display text-lg font-semibold">Revenue by plan</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.revenueByPlan} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="plan" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                  formatter={(v: number) => `€${v.toLocaleString()}`}
                />
                <Bar dataKey="revenue" fill="#059669" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 space-y-2">
            {stats.revenueByPlan.map((p) => {
              const pct = Math.round((p.revenue / stats.totalPlanRev) * 100);
              return (
                <li key={p.plan} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">{p.plan}</span>
                    <span className="tabular-nums text-muted-foreground">€{p.revenue.toLocaleString()} · {p.count} clients · {pct}%</span>
                  </div>
                  <Progress value={pct} className="h-1" />
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-2xl border border-glass-border bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-display text-lg font-semibold">Revenue by industry</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.revenueByIndustry} layout="vertical" margin={{ top: 6, right: 12, left: 12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="industry" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={110} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                  formatter={(v: number) => `€${v.toLocaleString()}`}
                />
                <Bar dataKey="revenue" fill="#6366f1" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-glass-border bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-display text-lg font-semibold">Staff performance</h3>
        <div className="overflow-hidden rounded-xl border border-slate-100">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 text-start font-medium">Member</th>
                <th className="px-3 py-2 text-start font-medium">Role</th>
                <th className="px-3 py-2 text-end font-medium">Utilization</th>
                <th className="px-3 py-2 text-end font-medium">Hours</th>
                <th className="px-3 py-2 text-end font-medium">Tasks done</th>
                <th className="px-3 py-2 text-end font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staffPerf.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50">
                  <td className="px-3 py-2 font-medium">{s.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{s.roleName}</td>
                  <td className="px-3 py-2 text-end tabular-nums">{s.utilization}%</td>
                  <td className="px-3 py-2 text-end tabular-nums">{s.hoursSpent}h</td>
                  <td className="px-3 py-2 text-end tabular-nums">{s.done}</td>
                  <td className="px-3 py-2 text-end font-semibold tabular-nums">€{s.revenue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-glass-border bg-white p-5 shadow-sm">
        <header className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Clients needing attention</h3>
          <span className="text-xs text-muted-foreground">Sorted by health score</span>
        </header>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {clientHealth.map((c) => (
            <article key={c.id} className="rounded-xl border border-slate-100 bg-slate-50/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.plan} · {c.industry}</p>
                </div>
                <div className={`shrink-0 rounded-lg px-2 py-1 text-xs font-semibold tabular-nums ${c.score < 50 ? "bg-rose-100 text-rose-700" : c.score < 75 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{c.score}</div>
              </div>
              <div className="mt-3 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Open tasks</span><span className="font-medium tabular-nums">{c.openTasks}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Overdue</span><span className={`font-medium tabular-nums ${c.overdueTasks ? "text-rose-600" : ""}`}>{c.overdueTasks}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Revenue YTD</span><span className="font-semibold tabular-nums">€{c.revenue.toLocaleString()}</span></div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
