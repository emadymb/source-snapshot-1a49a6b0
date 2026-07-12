import { createFileRoute } from "@tanstack/react-router";
import { Cpu, Database, HardDrive, Zap, Activity, RefreshCw, PlayCircle, PauseCircle, AlertTriangle, CheckCircle2, Clock, Terminal, Server, Layers, Gauge, Download } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/super/developer")({ component: DeveloperPage });

type Queue = { name: string; pending: number; failed: number; processed24h: number; workers: number; avgMs: number; status: "healthy" | "backpressure" | "paused" };
type Cron = { name: string; schedule: string; lastRun: string; nextRun: string; status: "ok" | "warn" | "fail"; durationMs: number };
type Backup = { id: string; type: "database" | "storage"; size: string; startedAt: string; duration: string; status: "ok" | "running" | "failed" };
type SlowQ = { query: string; avgMs: number; calls: number; rows: number };

const QUEUES: Queue[] = [
  { name: "ocr:process",         pending: 12,  failed: 0, processed24h: 4820, workers: 8, avgMs: 1240, status: "healthy" },
  { name: "ai:route",            pending: 3,   failed: 1, processed24h: 1284, workers: 4, avgMs: 890,  status: "healthy" },
  { name: "einvoice:dispatch",   pending: 0,   failed: 0, processed24h: 342,  workers: 2, avgMs: 420,  status: "healthy" },
  { name: "reports:export",      pending: 47,  failed: 2, processed24h: 128,  workers: 2, avgMs: 3200, status: "backpressure" },
  { name: "email:send",          pending: 0,   failed: 0, processed24h: 942,  workers: 4, avgMs: 180,  status: "healthy" },
  { name: "webhooks:deliver",    pending: 8,   failed: 3, processed24h: 512,  workers: 4, avgMs: 340,  status: "healthy" },
  { name: "backups:snapshot",    pending: 0,   failed: 0, processed24h: 4,    workers: 1, avgMs: 42000, status: "paused" },
];
const CRONS: Cron[] = [
  { name: "subscriptions:renew",  schedule: "0 * * * *",   lastRun: "2026-07-10 12:00", nextRun: "13:00", status: "ok",   durationMs: 4200 },
  { name: "ai:cost-rollup",       schedule: "*/15 * * * *", lastRun: "2026-07-10 12:45", nextRun: "13:00", status: "ok",   durationMs: 820 },
  { name: "einvoice:poll-inbox",  schedule: "*/5 * * * *",  lastRun: "2026-07-10 12:55", nextRun: "13:00", status: "ok",   durationMs: 1240 },
  { name: "payroll:month-close",  schedule: "0 3 1 * *",    lastRun: "2026-07-01 03:00", nextRun: "Aug 1", status: "ok",   durationMs: 18000 },
  { name: "backups:daily",        schedule: "0 2 * * *",    lastRun: "2026-07-10 02:00", nextRun: "Tomorrow 02:00", status: "ok", durationMs: 42000 },
  { name: "reports:refresh-mv",   schedule: "0 * * * *",    lastRun: "2026-07-10 12:00", nextRun: "13:00", status: "warn", durationMs: 12400 },
];
const BACKUPS: Backup[] = [
  { id: "bk_842", type: "database", size: "4.2 GB",  startedAt: "2026-07-10 02:00", duration: "42s",  status: "ok" },
  { id: "bk_841", type: "storage",  size: "128.4 GB", startedAt: "2026-07-10 02:01", duration: "6m 12s", status: "ok" },
  { id: "bk_840", type: "database", size: "4.2 GB",  startedAt: "2026-07-09 02:00", duration: "40s",  status: "ok" },
  { id: "bk_839", type: "storage",  size: "127.8 GB", startedAt: "2026-07-09 02:01", duration: "5m 58s", status: "ok" },
];
const SLOW: SlowQ[] = [
  { query: "SELECT * FROM ai_usage_logs WHERE workspace_id=$1 AND created_at > $2", avgMs: 1240, calls: 4200, rows: 84000 },
  { query: "SELECT ... FROM invoices JOIN customers ON ... WHERE company_id=$1",     avgMs: 820,  calls: 8420, rows: 12400 },
  { query: "SELECT COUNT(*) FROM audit_logs WHERE created_at > NOW() - INTERVAL '7 days'", avgMs: 680, calls: 240, rows: 1 },
];

function DeveloperPage() {
  const [tab, setTab] = useState<"overview" | "queues" | "cron" | "database" | "cache" | "backups" | "logs">("overview");
  const [logFilter, setLogFilter] = useState<"all" | "info" | "warn" | "error">("all");
  const logs = useMemo(() => generateLogs(), []);
  const filtered = logs.filter((l) => logFilter === "all" || l.level === logFilter);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
            <Terminal className="size-3" /> Developer Console
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Platform internals</h1>
          <p className="mt-1 text-sm text-muted-foreground">Deep observability into queues, cron, DB, cache, backups, and system logs.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl"><RefreshCw className="me-2 size-4" />Refresh</Button>
          <Button variant="outline" className="rounded-xl"><Download className="me-2 size-4" />Diagnostics</Button>
        </div>
      </header>

      {/* System KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiTile icon={Cpu}      label="CPU load"    value="34%"    tone="ok"   sub="8 cores · 1.2 avg" />
        <KpiTile icon={Server}   label="Memory"      value="6.4 GB" tone="ok"   sub="of 16 GB" />
        <KpiTile icon={HardDrive} label="Storage"    value="284 GB" tone="warn" sub="of 500 GB (57%)" />
        <KpiTile icon={Zap}      label="Uptime"      value="47d 12h" tone="ok" sub="Since last deploy" />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-glass-border">
        {[
          { id: "overview", label: "Overview", icon: Activity },
          { id: "queues",   label: "Queues",   icon: Layers },
          { id: "cron",     label: "Cron",     icon: Clock },
          { id: "database", label: "Database", icon: Database },
          { id: "cache",    label: "Cache",    icon: Gauge },
          { id: "backups",  label: "Backups",  icon: HardDrive },
          { id: "logs",     label: "Logs",     icon: Terminal },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
            className={`inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition ${tab === t.id ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-600 hover:text-slate-900"}`}>
            <t.icon className="size-4" />{t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Panel title="Queue snapshot" icon={Layers}>
            <ul className="space-y-2">
              {QUEUES.slice(0, 5).map((q) => (
                <li key={q.name} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                  <div>
                    <p className="font-mono text-xs font-medium">{q.name}</p>
                    <p className="text-[11px] text-muted-foreground">{q.workers} workers · {q.avgMs}ms avg</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${q.status === "healthy" ? "bg-emerald-500/15 text-emerald-700" : q.status === "backpressure" ? "bg-amber-500/15 text-amber-700" : "bg-slate-300/50 text-slate-700"}`}>{q.pending} pending</span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Next cron runs" icon={Clock}>
            <ul className="space-y-2">
              {CRONS.slice(0, 5).map((c) => (
                <li key={c.name} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                  <div>
                    <p className="font-mono text-xs font-medium">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground">{c.schedule} · {(c.durationMs / 1000).toFixed(1)}s</p>
                  </div>
                  <p className="text-xs font-semibold text-indigo-700">{c.nextRun}</p>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Cache hit rate" icon={Gauge}>
            <div className="flex items-center gap-6 p-2">
              <RingGauge value={94.2} />
              <div className="space-y-1 text-sm">
                <p><b className="tabular-nums">1.24M</b> hits (24h)</p>
                <p><b className="tabular-nums">76K</b> misses</p>
                <p><b className="tabular-nums">4.2 GB</b> used / 8 GB</p>
                <p className="text-xs text-muted-foreground">Redis 7.2 · eu-north-1</p>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {tab === "queues" && (
        <Panel title="Worker queues" icon={Layers}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr><Th>Queue</Th><Th className="text-end">Pending</Th><Th className="text-end">Failed</Th><Th className="text-end">24h</Th><Th className="text-end">Workers</Th><Th className="text-end">Avg</Th><Th>Status</Th><Th></Th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {QUEUES.map((q) => (
                  <tr key={q.name}>
                    <Td className="font-mono text-xs">{q.name}</Td>
                    <Td className="text-end tabular-nums">{q.pending}</Td>
                    <Td className={`text-end tabular-nums ${q.failed > 0 ? "text-red-600 font-semibold" : ""}`}>{q.failed}</Td>
                    <Td className="text-end tabular-nums">{q.processed24h.toLocaleString()}</Td>
                    <Td className="text-end tabular-nums">{q.workers}</Td>
                    <Td className="text-end tabular-nums">{q.avgMs}ms</Td>
                    <Td><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${q.status === "healthy" ? "bg-emerald-500/15 text-emerald-700" : q.status === "backpressure" ? "bg-amber-500/15 text-amber-700" : "bg-slate-300/50 text-slate-700"}`}>{q.status}</span></Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        {q.status === "paused"
                          ? <Button size="icon" variant="ghost" className="size-8"><PlayCircle className="size-4 text-emerald-600" /></Button>
                          : <Button size="icon" variant="ghost" className="size-8"><PauseCircle className="size-4 text-amber-600" /></Button>}
                        <Button size="icon" variant="ghost" className="size-8"><RefreshCw className="size-4" /></Button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {tab === "cron" && (
        <Panel title="Scheduled tasks" icon={Clock}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr><Th>Task</Th><Th>Schedule</Th><Th>Last run</Th><Th>Duration</Th><Th>Next</Th><Th>Status</Th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {CRONS.map((c) => (
                  <tr key={c.name}>
                    <Td className="font-mono text-xs">{c.name}</Td>
                    <Td className="font-mono text-xs">{c.schedule}</Td>
                    <Td className="text-xs text-muted-foreground">{c.lastRun}</Td>
                    <Td className="tabular-nums">{(c.durationMs / 1000).toFixed(1)}s</Td>
                    <Td className="text-xs font-semibold text-indigo-700">{c.nextRun}</Td>
                    <Td>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.status === "ok" ? "bg-emerald-500/15 text-emerald-700" : c.status === "warn" ? "bg-amber-500/15 text-amber-700" : "bg-red-500/15 text-red-700"}`}>
                        {c.status === "ok" ? <CheckCircle2 className="size-3" /> : <AlertTriangle className="size-3" />}{c.status}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {tab === "database" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Cluster" icon={Database}>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <Stat label="Engine">PostgreSQL 16.2</Stat>
              <Stat label="Size">4.2 GB</Stat>
              <Stat label="Tables">142</Stat>
              <Stat label="Rows">28.4M</Stat>
              <Stat label="Connections">42 / 200</Stat>
              <Stat label="Replication lag">18 ms</Stat>
            </dl>
          </Panel>
          <Panel title="Slow queries (24h)" icon={AlertTriangle}>
            <ul className="space-y-2">
              {SLOW.map((s, i) => (
                <li key={i} className="rounded-xl bg-slate-50 p-3">
                  <p className="font-mono text-[11px] leading-snug text-slate-700">{s.query}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground"><b className="tabular-nums">{s.avgMs}ms</b> avg · {s.calls.toLocaleString()} calls · {s.rows.toLocaleString()} rows</p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}

      {tab === "cache" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panel title="Hit rate (7d)" icon={Gauge}><div className="flex items-center justify-center py-6"><RingGauge value={94.2} /></div></Panel>
          <Panel title="Keys" icon={Database}>
            <dl className="space-y-2 text-sm">
              <Stat label="Total keys">184,204</Stat>
              <Stat label="Expiring">12,840</Stat>
              <Stat label="Memory">4.2 GB / 8 GB</Stat>
              <Stat label="Evictions (24h)">0</Stat>
            </dl>
          </Panel>
          <Panel title="Top keyspaces" icon={Layers}>
            <ul className="space-y-2 text-sm">
              {[
                { k: "session:*", size: "1.8 GB", hit: 98.4 },
                { k: "ai:route:*", size: "820 MB", hit: 91.2 },
                { k: "report:mv:*", size: "640 MB", hit: 88.5 },
                { k: "ocr:idem:*", size: "412 MB", hit: 74.8 },
              ].map((r) => (
                <li key={r.k} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span className="font-mono text-xs">{r.k}</span>
                  <span className="text-[11px] text-muted-foreground"><b>{r.hit}%</b> · {r.size}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}

      {tab === "backups" && (
        <Panel title="Backup snapshots" icon={HardDrive}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground"><tr><Th>ID</Th><Th>Type</Th><Th>Size</Th><Th>Started</Th><Th>Duration</Th><Th>Status</Th><Th></Th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {BACKUPS.map((b) => (
                  <tr key={b.id}>
                    <Td className="font-mono text-xs">{b.id}</Td>
                    <Td className="capitalize">{b.type}</Td>
                    <Td className="tabular-nums">{b.size}</Td>
                    <Td className="text-xs text-muted-foreground">{b.startedAt}</Td>
                    <Td className="tabular-nums">{b.duration}</Td>
                    <Td><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${b.status === "ok" ? "bg-emerald-500/15 text-emerald-700" : b.status === "running" ? "bg-sky-500/15 text-sky-700" : "bg-red-500/15 text-red-700"}`}>{b.status}</span></Td>
                    <Td className="text-end"><Button size="sm" variant="ghost" className="rounded-lg"><Download className="me-1 size-3.5" />Download</Button></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {tab === "logs" && (
        <Panel title="System logs (live tail)" icon={Terminal}>
          <div className="mb-3 flex gap-2">
            {(["all", "info", "warn", "error"] as const).map((lvl) => (
              <button key={lvl} onClick={() => setLogFilter(lvl)}
                className={`rounded-lg border px-3 py-1 text-xs font-medium capitalize transition ${logFilter === lvl ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-700"}`}>
                {lvl}
              </button>
            ))}
          </div>
          <div className="max-h-[520px] overflow-y-auto rounded-xl bg-slate-950 p-3 font-mono text-[11px] leading-snug text-slate-200">
            {filtered.map((l, i) => (
              <div key={i} className="flex gap-3 py-0.5">
                <span className="text-slate-500">{l.time}</span>
                <span className={`w-12 font-semibold uppercase ${l.level === "error" ? "text-red-400" : l.level === "warn" ? "text-amber-400" : "text-emerald-400"}`}>{l.level}</span>
                <span className="text-sky-300">{l.svc}</span>
                <span className="flex-1 truncate text-slate-200">{l.msg}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-glass-border bg-white p-5 shadow-sm">
      <header className="mb-4 flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-slate-900 text-white"><Icon className="size-4" /></div>
        <h3 className="font-display text-sm font-semibold">{title}</h3>
      </header>
      {children}
    </section>
  );
}
function KpiTile({ icon: Icon, label, value, sub, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub: string; tone: "ok" | "warn" | "err" }) {
  const tones = { ok: "text-emerald-700 bg-emerald-500/15", warn: "text-amber-700 bg-amber-500/15", err: "text-red-700 bg-red-500/15" } as const;
  return (
    <div className="rounded-2xl border border-glass-border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <span className={`flex size-8 items-center justify-center rounded-lg ${tones[tone]}`}><Icon className="size-4" /></span>
      </div>
      <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) { return <th className={`px-3 py-2 text-start font-semibold ${className}`}>{children}</th>; }
function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) { return <td className={`px-3 py-2 ${className}`}>{children}</td>; }
function Stat({ label, children }: { label: string; children: React.ReactNode }) { return (<div><dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-0.5 font-display text-lg font-semibold tabular-nums">{children}</dd></div>); }
function RingGauge({ value }: { value: number }) {
  const r = 44, C = 2 * Math.PI * r, off = C - (value / 100) * C;
  return (
    <svg viewBox="0 0 120 120" className="size-32">
      <circle cx="60" cy="60" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
      <circle cx="60" cy="60" r={r} fill="none" stroke="url(#gauge)" strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={off} transform="rotate(-90 60 60)" />
      <defs><linearGradient id="gauge" x1="0" x2="1"><stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient></defs>
      <text x="60" y="66" textAnchor="middle" className="fill-slate-900 font-display text-xl font-semibold">{value.toFixed(1)}%</text>
    </svg>
  );
}
function generateLogs() {
  const svcs = ["api", "worker", "ocr", "ai-router", "einvoice", "webhooks", "cron"];
  const info = ["request completed", "job processed", "cache hit", "auth ok", "webhook delivered", "cron scheduled"];
  const warn = ["slow query >1s", "retrying after 429", "queue backpressure", "cache eviction skipped"];
  const err  = ["upstream 502 from provider", "webhook signature mismatch", "job failed after 3 retries"];
  const now = new Date();
  return Array.from({ length: 80 }, (_, i) => {
    const d = new Date(now.getTime() - i * 12_000);
    const r = Math.random();
    const level: "info" | "warn" | "error" = r > 0.92 ? "error" : r > 0.78 ? "warn" : "info";
    const pool = level === "error" ? err : level === "warn" ? warn : info;
    return {
      time: d.toISOString().slice(11, 19),
      level,
      svc: svcs[i % svcs.length],
      msg: pool[i % pool.length] + `  ctx=req_${Math.random().toString(36).slice(2, 8)}`,
    };
  });
}