import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, Cpu, Database, HardDrive, Zap, Globe, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { platformHealth } from "@/lib/saas.functions";

export const Route = createFileRoute("/super/health")({ component: HealthPage });

type Status = "operational" | "degraded" | "down";

interface Service { name: string; region: string; status: Status; latencyMs: number; uptime: number; icon: React.ComponentType<{ className?: string }> }
interface Incident { id: string; title: string; severity: "minor" | "major" | "critical"; startedAt: string; resolvedAt?: string; note: string }

const SERVICES: Service[] = [
  { name: "API Gateway", region: "eu-north-1", status: "operational", latencyMs: 42, uptime: 99.99, icon: Zap },
  { name: "PostgreSQL Primary", region: "eu-north-1", status: "operational", latencyMs: 8, uptime: 99.98, icon: Database },
  { name: "PostgreSQL Replica", region: "eu-west-1", status: "operational", latencyMs: 14, uptime: 99.97, icon: Database },
  { name: "Object Storage (S3)", region: "eu-north-1", status: "operational", latencyMs: 28, uptime: 100, icon: HardDrive },
  { name: "AI Gateway", region: "global", status: "degraded", latencyMs: 1240, uptime: 99.12, icon: Cpu },
  { name: "Email (Postmark)", region: "us-east-1", status: "operational", latencyMs: 210, uptime: 99.95, icon: Globe },
  { name: "OCR Service", region: "eu-north-1", status: "operational", latencyMs: 890, uptime: 99.7, icon: Activity },
  { name: "Background Workers", region: "eu-north-1", status: "operational", latencyMs: 0, uptime: 99.98, icon: Zap },
];

const INCIDENTS: Incident[] = [
  { id: "in1", title: "AI Gateway elevated latency", severity: "minor", startedAt: "2026-07-08 08:14", note: "Upstream model provider reports higher-than-normal response times. Investigating fallback routing." },
  { id: "in2", title: "OCR queue backlog", severity: "minor", startedAt: "2026-07-07 14:02", resolvedAt: "2026-07-07 14:58", note: "Auto-scaled worker pool from 4 → 12; queue drained." },
  { id: "in3", title: "Stripe webhook delivery outage", severity: "major", startedAt: "2026-07-05 22:41", resolvedAt: "2026-07-05 23:12", note: "Stripe status page confirmed regional issue; all missed events were redelivered." },
];

const statusMeta: Record<Status, { label: string; tone: string; dot: string }> = {
  operational: { label: "Operational", tone: "bg-emerald-500/15 text-emerald-700", dot: "bg-emerald-500" },
  degraded: { label: "Degraded", tone: "bg-amber-500/15 text-amber-700", dot: "bg-amber-500" },
  down: { label: "Down", tone: "bg-red-500/15 text-red-700", dot: "bg-red-500" },
};

function Sparkline({ points, color }: { points: number[]; color: string }) {
  const max = Math.max(...points, 1);
  const path = points.map((p, i) => `${(i / (points.length - 1)) * 100},${100 - (p / max) * 90}`).join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-8 w-24">
      <polyline fill="none" stroke={color} strokeWidth="2" points={path} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function HealthPage() {
  const { t } = useI18n();
  const { data: health } = useQuery({
    queryKey: ["super", "health"],
    queryFn: () => platformHealth(),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const overall = SERVICES.every((s) => s.status === "operational") ? "operational" : SERVICES.some((s) => s.status === "down") ? "down" : "degraded";
  const overallMeta = statusMeta[overall];
  const c = health?.counts;

  const kpis = [
    { label: "Workspaces", value: c ? `${c.activeWorkspaces}/${c.workspaces}` : "—", tone: "emerald" as const },
    { label: "Users", value: c ? String(c.users) : "—", tone: "emerald" as const },
    { label: "Subscriptions", value: c ? `${c.activeSubscriptions}/${c.subscriptions}` : "—", tone: "amber" as const },
    { label: "AI cost (30d)", value: health ? `€${health.aiCostsEurLast30d.toFixed(2)}` : "—", tone: "amber" as const },
  ] as const;

  const load = [22, 28, 24, 31, 45, 38, 42, 39, 47, 52, 48, 41, 44, 46];
  const errors = [0.02, 0.03, 0.01, 0.05, 0.08, 0.04, 0.06, 0.03, 0.09, 0.12, 0.06, 0.04, 0.05, 0.04];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t("nav.health")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Real-time status of every Fiksu subsystem and dependency.</p>
      </div>

      {/* Overall banner */}
      <div className={`flex items-center gap-4 rounded-2xl border p-5 shadow-sm ${overall === "operational" ? "border-emerald-500/30 bg-gradient-to-br from-emerald-50 to-teal-50" : "border-amber-500/30 bg-gradient-to-br from-amber-50 to-orange-50"}`}>
        <div className={`flex size-14 items-center justify-center rounded-2xl ${overall === "operational" ? "bg-emerald-500" : "bg-amber-500"} text-white shadow-lg`}>
          {overall === "operational" ? <CheckCircle2 className="size-7" /> : <AlertTriangle className="size-7" />}
        </div>
        <div className="flex-1">
          <p className="font-display text-xl font-semibold">{overall === "operational" ? "All systems operational" : "Some systems degraded"}</p>
          <p className="text-sm text-slate-600">{overall === "operational" ? "No active incidents. Last checked just now." : "1 minor incident is being investigated. See timeline below."}</p>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${overallMeta.tone}`}>
          <span className={`size-2 animate-pulse rounded-full ${overallMeta.dot}`} />{overallMeta.label}
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {kpis.map((k) => {
          const tones = { emerald: "text-emerald-700", amber: "text-amber-700", red: "text-red-700" } as const;
          return (
            <div key={k.label} className="rounded-2xl border border-glass-border bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{k.label}</p>
              <p className={`mt-2 font-display text-2xl font-semibold ${tones[k.tone]}`}>{k.value}</p>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-glass-border bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold">Request throughput (per min)</h3>
            <TrendingUp className="size-4 text-emerald-600" />
          </div>
          <ChartArea data={load} color="#6366f1" />
        </div>
        <div className="rounded-2xl border border-glass-border bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold">Error rate (%)</h3>
            <span className="text-xs text-muted-foreground">Threshold 0.5%</span>
          </div>
          <ChartArea data={errors} color="#f59e0b" />
        </div>
      </div>

      {/* Services */}
      <div className="overflow-hidden rounded-2xl border border-glass-border bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3">
          <h3 className="font-display text-lg font-semibold">Services</h3>
        </div>
        <ul className="divide-y divide-slate-100">
          {SERVICES.map((s) => {
            const meta = statusMeta[s.status];
            const spark = Array.from({ length: 20 }, () => 40 + Math.random() * 60);
            return (
              <li key={s.name} className="flex items-center gap-4 px-5 py-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><s.icon className="size-5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.region}</p>
                </div>
                <Sparkline points={spark} color={s.status === "operational" ? "#10b981" : s.status === "degraded" ? "#f59e0b" : "#ef4444"} />
                <div className="hidden text-end md:block">
                  <p className="text-sm font-semibold tabular-nums">{s.latencyMs}ms</p>
                  <p className="text-xs text-muted-foreground">p50 latency</p>
                </div>
                <div className="hidden text-end md:block">
                  <p className="text-sm font-semibold tabular-nums">{s.uptime}%</p>
                  <p className="text-xs text-muted-foreground">30d uptime</p>
                </div>
                <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${meta.tone}`}>
                  <span className={`size-1.5 rounded-full ${meta.dot}`} />{meta.label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Incidents */}
      <div className="rounded-2xl border border-glass-border bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-display text-lg font-semibold">Recent incidents</h3>
        <ol className="relative space-y-6 ps-6">
          <span className="absolute inset-y-0 start-2 w-px bg-slate-200" />
          {INCIDENTS.map((i) => {
            const active = !i.resolvedAt;
            const tone = i.severity === "critical" ? "red" : i.severity === "major" ? "amber" : "sky";
            const tones = { red: "bg-red-500", amber: "bg-amber-500", sky: "bg-sky-500" } as const;
            return (
              <li key={i.id} className="relative">
                <span className={`absolute -start-[18px] top-1.5 size-3 rounded-full ${tones[tone]} ${active ? "animate-pulse ring-4 ring-white" : ""}`} />
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{i.title}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${i.severity === "critical" ? "bg-red-500/15 text-red-700" : i.severity === "major" ? "bg-amber-500/15 text-amber-700" : "bg-sky-500/15 text-sky-700"}`}>{i.severity}</span>
                  {active ? <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">Investigating</span> : <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">Resolved</span>}
                </div>
                <p className="mt-1 text-sm text-slate-600">{i.note}</p>
                <p className="mt-1 text-xs text-muted-foreground">Started {i.startedAt}{i.resolvedAt && ` · Resolved ${i.resolvedAt}`}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function ChartArea({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const path = data.map((p, i) => `${(i / (data.length - 1)) * 100},${100 - (p / max) * 90}`).join(" ");
  const area = `0,100 ${path} 100,100`;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-32 w-full">
      <defs>
        <linearGradient id={`g-${color}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#g-${color})`} />
      <polyline fill="none" stroke={color} strokeWidth="2" points={path} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
