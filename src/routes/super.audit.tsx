import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search, Download, ShieldAlert, User, Settings2, CreditCard, Package,
  Building2, LogIn, KeyRound, RefreshCw, Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { listAuditLogs, type AuditEntryDTO } from "@/lib/saas.functions";

export const Route = createFileRoute("/super/audit")({ component: AuditPage });

type Severity = "info" | "warn" | "critical";
type Category = "auth" | "billing" | "plan" | "workspace" | "settings" | "security" | "other";

const ICONS: Record<Category, React.ComponentType<{ className?: string }>> = {
  auth: LogIn, billing: CreditCard, plan: Package, workspace: Building2,
  settings: Settings2, security: KeyRound, other: Settings2,
};

function categorize(entity: string, action: string): Category {
  const e = (entity || "").toLowerCase();
  const a = (action || "").toLowerCase();
  if (e.includes("session") || e.includes("user") || a.includes("login") || a.includes("auth")) return "auth";
  if (e.includes("invoice") || e.includes("transaction") || e.includes("gateway") || e.includes("payment")) return "billing";
  if (e.includes("plan") || e.includes("subscription")) return "plan";
  if (e.includes("workspace") || e.includes("company")) return "workspace";
  if (e.includes("role") || e.includes("permission") || e.includes("key") || a.includes("rotate")) return "security";
  if (e.includes("setting") || e.includes("backup")) return "settings";
  return "other";
}

function severityFor(action: string, category: Category): Severity {
  const a = action.toLowerCase();
  if (category === "security") return "critical";
  if (a.includes("delete") || a.includes("suspend") || a.includes("fail")) return "warn";
  if (a.includes("update") || a.includes("rotate")) return "warn";
  return "info";
}

function sevStyle(s: Severity) {
  if (s === "critical") return "bg-red-500/15 text-red-700 ring-1 ring-red-500/30";
  if (s === "warn") return "bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/30";
  return "bg-slate-500/10 text-slate-700 ring-1 ring-slate-500/20";
}

function formatWhen(iso: string) {
  try { return new Date(iso).toISOString().slice(0, 16).replace("T", " "); }
  catch { return iso; }
}

function toCsv(rows: AuditEntryDTO[]) {
  const header = ["when", "actor", "email", "action", "entity", "entityId", "ip"];
  const esc = (v: string | null) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push([r.when, r.actor, r.actorEmail, r.action, r.entity, r.entityId ?? "", r.ip ?? ""].map((v) => esc(v as string)).join(","));
  }
  return lines.join("\n");
}

function AuditPage() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "all">("all");
  const [sev, setSev] = useState<Severity | "all">("all");

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["super", "audit"],
    queryFn: () => listAuditLogs(),
    staleTime: 30_000,
  });

  const enriched = useMemo(() => (data ?? []).map((r) => {
    const category = categorize(r.entity, r.action);
    const severity = severityFor(r.action, category);
    return { ...r, category, severity };
  }), [data]);

  const rows = useMemo(() => enriched.filter((r) =>
    (cat === "all" || r.category === cat) &&
    (sev === "all" || r.severity === sev) &&
    (!q || `${r.actor} ${r.actorEmail} ${r.action} ${r.entity} ${r.entityId ?? ""} ${r.ip ?? ""}`.toLowerCase().includes(q.toLowerCase()))
  ), [enriched, q, cat, sev]);

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const counts = {
    total: enriched.length,
    critical: enriched.filter((s) => s.severity === "critical").length,
    warn: enriched.filter((s) => s.severity === "warn").length,
    today: enriched.filter((s) => s.when.slice(0, 10) === todayStr).length,
  };

  const doExport = () => {
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${todayStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} entries to CSV`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t("nav.audit")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Immutable timeline of every privileged action on the platform.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="me-1.5 size-4 animate-spin" /> : <RefreshCw className="me-1.5 size-4" />}
            Refresh
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={doExport} disabled={rows.length === 0}>
            <Download className="me-1.5 size-4" />Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Total events" value={counts.total} tone="slate" />
        <Stat label="Critical" value={counts.critical} tone="red" />
        <Stat label="Warnings" value={counts.warn} tone="amber" />
        <Stat label="Today" value={counts.today} tone="indigo" />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-glass-border bg-white p-3 shadow-sm">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("common.search")} className="rounded-lg border-slate-200 ps-10" />
        </div>
        <Select value={cat} onValueChange={(v) => setCat(v as Category | "all")}>
          <SelectTrigger className="w-40 rounded-lg"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            <SelectItem value="auth">Authentication</SelectItem>
            <SelectItem value="billing">Billing</SelectItem>
            <SelectItem value="plan">Plan</SelectItem>
            <SelectItem value="workspace">Workspace</SelectItem>
            <SelectItem value="settings">Settings</SelectItem>
            <SelectItem value="security">Security</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sev} onValueChange={(v) => setSev(v as Severity | "all")}>
          <SelectTrigger className="w-36 rounded-lg"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warn">Warn</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-glass-border bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading audit trail…
          </div>
        ) : (
        <ol className="divide-y divide-slate-100">
          {rows.map((e) => {
            const Icon = ICONS[e.category];
            return (
              <li key={e.id} className="flex items-start gap-4 p-4 hover:bg-slate-50/60">
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${e.severity === "critical" ? "bg-red-500/10 text-red-600" : e.severity === "warn" ? "bg-amber-500/10 text-amber-600" : "bg-slate-500/10 text-slate-600"}`}>
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{e.action}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${sevStyle(e.severity)}`}>{e.severity}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium capitalize text-slate-600">{e.category}</span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-slate-600">{e.entity}{e.entityId ? ` · ${e.entityId}` : ""}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><User className="size-3" />{e.actor} · {e.actorEmail}</span>
                    {e.ip && <span>IP {e.ip}</span>}
                    <span>{formatWhen(e.when)}</span>
                  </p>
                </div>
                {e.severity === "critical" && <ShieldAlert className="size-4 shrink-0 text-red-500" />}
              </li>
            );
          })}
          {rows.length === 0 && <li className="p-10 text-center text-sm text-muted-foreground">No entries match your filters.</li>}
        </ol>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "slate" | "red" | "amber" | "indigo" }) {
  const tones = {
    slate: "from-slate-500/10 to-slate-500/5 text-slate-700",
    red: "from-red-500/10 to-red-500/5 text-red-700",
    amber: "from-amber-500/10 to-amber-500/5 text-amber-700",
    indigo: "from-indigo-500/10 to-indigo-500/5 text-indigo-700",
  };
  return (
    <div className={`rounded-2xl border border-glass-border bg-gradient-to-br ${tones[tone]} p-5 shadow-sm`}>
      <p className="text-xs uppercase tracking-wide">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
