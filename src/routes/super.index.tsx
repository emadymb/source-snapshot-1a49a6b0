import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
  BarChart, Bar, Legend, PieChart, Pie, Cell,
} from "recharts";
import { TrendingUp, TrendingDown, Users, Building2, Sparkles, Percent, ArrowUpRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { listWorkspaces, listPlans, listRequests } from "@/lib/saas.functions";

export const Route = createFileRoute("/super/")({ component: Dashboard });

const REV_DATA = [
  { m: "Sep", mrr: 14200, new: 1200 }, { m: "Oct", mrr: 15900, new: 1700 },
  { m: "Nov", mrr: 17600, new: 1900 }, { m: "Dec", mrr: 18900, new: 1500 },
  { m: "Jan", mrr: 20200, new: 1800 }, { m: "Feb", mrr: 21800, new: 2100 },
  { m: "Mar", mrr: 23400, new: 2400 },
];

const SIGNUPS = [
  { d: "Mon", v: 8 }, { d: "Tue", v: 12 }, { d: "Wed", v: 6 }, { d: "Thu", v: 15 },
  { d: "Fri", v: 22 }, { d: "Sat", v: 4 }, { d: "Sun", v: 3 },
];

const PIE_COLORS = ["#818cf8", "#6366f1", "#4f46e5", "#312e81", "#a78bfa"];

function Dashboard() {
  const { t } = useI18n();
  const listWsFn = useServerFn(listWorkspaces);
  const listPlansFn = useServerFn(listPlans);
  const listReqFn = useServerFn(listRequests);
  const { data: workspaces = [] } = useQuery({ queryKey: ["saas", "workspaces"], queryFn: () => listWsFn() });
  const { data: plans = [] } = useQuery({ queryKey: ["saas", "plans"], queryFn: () => listPlansFn() });
  const { data: requests = [] } = useQuery({ queryKey: ["saas", "requests"], queryFn: () => listReqFn() });

  const stats = useMemo(() => {
    const mrr = workspaces.filter((w) => w.status === "active").reduce((s, w) => s + w.mrr, 0);
    const trials = workspaces.filter((w) => w.status === "trial").length;
    const companies = workspaces.reduce((s, w) => s + w.companies, 0);
    return { mrr, trials, companies, active: workspaces.filter((w) => w.status === "active").length };
  }, [workspaces]);

  const planMix = useMemo(
    () => plans.filter((p) => p.active).map((p) => ({
      name: p.name,
      value: workspaces.filter((w) => w.planId === p.id).length,
    })).filter((x) => x.value > 0),
    [plans, workspaces],
  );

  const topClients = [...workspaces].sort((a, b) => b.mrr - a.mrr).slice(0, 5);
  const pendingRequests = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t("dash.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("dash.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-glass-border bg-white px-3 py-2 text-sm shadow-sm">
          <span className="inline-flex size-2 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-slate-600">Live · {new Date().toLocaleDateString(undefined, { dateStyle: "medium" })}</span>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label={t("dash.mrr")} value={`€${stats.mrr.toLocaleString()}`} delta="+12.4%" positive icon={TrendingUp} accent="from-indigo-500 to-violet-500" />
        <Kpi label={t("dash.arr")} value={`€${(stats.mrr * 12).toLocaleString()}`} delta="+18.1%" positive icon={ArrowUpRight} accent="from-emerald-500 to-teal-500" />
        <Kpi label={t("dash.workspaces")} value={`${stats.active}`} delta={`+${pendingRequests} pending`} positive icon={Building2} accent="from-sky-500 to-cyan-500" />
        <Kpi label={t("dash.churn")} value="1.8%" delta="-0.4%" positive icon={Percent} accent="from-amber-500 to-orange-500" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Revenue */}
        <div className="xl:col-span-2 rounded-2xl border border-glass-border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("dash.revenueTrend")}</p>
              <p className="mt-0.5 font-display text-xl font-semibold">€{stats.mrr.toLocaleString()}<span className="ms-2 text-xs font-medium text-emerald-600">+12.4% MoM</span></p>
            </div>
            <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 text-xs">
              {["7d","30d","90d","1y"].map((k, i) => (
                <button key={k} className={`rounded-md px-2.5 py-1 ${i===3?"bg-white shadow-sm font-medium":"text-slate-500"}`}>{k}</button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={REV_DATA}>
                <defs>
                  <linearGradient id="mrr" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `€${v/1000}k`} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} formatter={(v: number) => `€${v.toLocaleString()}`} />
                <Area type="monotone" dataKey="mrr" stroke="#6366f1" strokeWidth={2.5} fill="url(#mrr)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Plan mix pie */}
        <div className="rounded-2xl border border-glass-border bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("dash.planMix")}</p>
          <div className="mt-2 h-52">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={planMix} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {planMix.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-1.5 text-sm">
            {planMix.map((p, i) => (
              <li key={p.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2"><span className="size-2.5 rounded-sm" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} /><span className="text-slate-600">{p.name}</span></span>
                <span className="font-medium">{p.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Signups bar */}
        <div className="rounded-2xl border border-glass-border bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("dash.recentSignups")}</p>
          <p className="mt-0.5 font-display text-xl font-semibold">70<span className="ms-2 text-xs font-medium text-emerald-600">+22% WoW</span></p>
          <div className="mt-3 h-40">
            <ResponsiveContainer>
              <BarChart data={SIGNUPS}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="d" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="v" fill="#6366f1" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top clients */}
        <div className="xl:col-span-2 rounded-2xl border border-glass-border bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("dash.topClients")}</p>
            <span className="text-xs text-muted-foreground">by MRR</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {topClients.map((w) => {
              const plan = plans.find((p) => p.id === w.planId);
              return (
                <li key={w.id} className="flex items-center gap-3 py-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-semibold text-white">
                    {w.name.slice(0,2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{w.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{w.owner} · {plan?.name}</p>
                  </div>
                  <div className="text-end">
                    <p className="text-sm font-semibold">€{w.mrr}</p>
                    <p className="text-[11px] text-emerald-600">+{Math.floor(Math.random()*20)+2}%</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, delta, positive, icon: Icon, accent }: { label: string; value: string; delta: string; positive?: boolean; icon: React.ComponentType<{ className?: string }>; accent: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-glass-border bg-white p-5 shadow-sm">
      <div className={`absolute -end-8 -top-8 size-24 rounded-full bg-gradient-to-br ${accent} opacity-10`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-2xl font-semibold tracking-tight">{value}</p>
          <p className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${positive ? "text-emerald-600" : "text-red-600"}`}>
            {positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}{delta}
          </p>
        </div>
        <div className={`flex size-10 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white`}>
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}
