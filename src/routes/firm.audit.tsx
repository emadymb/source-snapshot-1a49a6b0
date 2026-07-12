import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { History, Filter, Download, RotateCcw, ArrowRight, Building2, User, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { useAudit, type AuditEntry } from "@/lib/mock/audit";
import { featureById } from "@/lib/entitlements/catalog";

export const Route = createFileRoute("/firm/audit")({ component: FirmAuditPage });

const KIND_STYLES: Record<AuditEntry["kind"], { label: string; tone: string; icon: typeof ShieldCheck }> = {
  "plan.change":           { label: "Plan change",       tone: "bg-violet-50 text-violet-700 border-violet-200",   icon: ShieldCheck },
  "entitlement.override":  { label: "Entitlement edit",  tone: "bg-amber-50 text-amber-700 border-amber-200",      icon: SlidersHorizontal },
  "entitlement.reset":     { label: "Overrides reset",   tone: "bg-slate-100 text-slate-700 border-slate-200",     icon: RotateCcw },
};

function fmtValue(v: unknown) {
  if (typeof v === "boolean") return v ? "ON" : "OFF";
  if (v === undefined || v === null || v === "") return "—";
  return String(v);
}

function relTime(iso: string, lang: "en" | "ar") {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1)   return lang === "ar" ? "الآن" : "just now";
  if (m < 60)  return lang === "ar" ? `منذ ${m} د` : `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24)  return lang === "ar" ? `منذ ${h} س` : `${h}h ago`;
  const d = Math.round(h / 24);
  return lang === "ar" ? `منذ ${d} ي` : `${d}d ago`;
}

function FirmAuditPage() {
  const { t, lang } = useI18n();
  const { entries } = useAudit();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<string>("all");

  const workspaces = useMemo(() => Array.from(new Set(entries.map((e) => e.workspaceName))), [entries]);
  const [ws, setWs] = useState<string>("all");

  const filtered = entries.filter((e) =>
    (kind === "all" || e.kind === kind) &&
    (ws === "all" || e.workspaceName === ws) &&
    (q === "" ||
      e.actorName.toLowerCase().includes(q.toLowerCase()) ||
      e.workspaceName.toLowerCase().includes(q.toLowerCase()) ||
      e.changes.some((c) => c.featureId.includes(q.toLowerCase())))
  );

  const exportCsv = () => {
    const rows = [
      ["timestamp", "actor", "role", "workspace", "kind", "planFrom", "planTo", "changes"],
      ...filtered.map((e) => [
        e.at, e.actorName, e.actorRole ?? "", e.workspaceName, e.kind,
        e.planFrom ?? "", e.planTo ?? "",
        e.changes.map((c) => `${c.featureId}:${fmtValue(c.from)}→${fmtValue(c.to)}`).join(" | "),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `firm-audit-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(t("firm.audit.exported"));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t("firm.audit.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("firm.audit.subtitle")}</p>
        </div>
        <Button onClick={exportCsv} variant="outline" className="gap-1.5 rounded-xl">
          <Download className="size-4" />{t("firm.audit.export")}
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: t("firm.audit.total"),         value: entries.length,                                                icon: History,         tone: "text-emerald-600 bg-emerald-500/10" },
          { label: t("firm.audit.planChanges"),   value: entries.filter((e) => e.kind === "plan.change").length,        icon: ShieldCheck,     tone: "text-violet-600 bg-violet-500/10" },
          { label: t("firm.audit.overrides"),     value: entries.filter((e) => e.kind === "entitlement.override").length, icon: SlidersHorizontal, tone: "text-amber-600 bg-amber-500/10" },
          { label: t("firm.audit.uniqueActors"),  value: new Set(entries.map((e) => e.actorId)).size,                   icon: User,            tone: "text-sky-600 bg-sky-500/10" },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-glass-border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <div className={`flex size-8 items-center justify-center rounded-lg ${k.tone}`}><k.icon className="size-4" /></div>
            </div>
            <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-glass-border bg-white p-3 shadow-sm">
        <Filter className="ms-1 size-4 text-slate-400" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("firm.audit.searchPlaceholder")} className="max-w-xs rounded-xl" />
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="w-48 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("firm.audit.allKinds")}</SelectItem>
            {Object.entries(KIND_STYLES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={ws} onValueChange={setWs}>
          <SelectTrigger className="w-56 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("firm.audit.allWorkspaces")}</SelectItem>
            {workspaces.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="ms-auto text-xs text-muted-foreground">{filtered.length} / {entries.length}</span>
      </div>

      {/* Timeline */}
      <div className="rounded-2xl border border-glass-border bg-white shadow-sm">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">{t("firm.audit.empty")}</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((e) => {
              const K = KIND_STYLES[e.kind];
              const initials = e.actorName.split(" ").map((s) => s[0]).slice(0, 2).join("");
              return (
                <li key={e.id} className="flex gap-4 p-4">
                  <Avatar className="size-9 shrink-0">
                    <AvatarFallback className="bg-slate-900 text-[11px] text-white">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{e.actorName}</p>
                      {e.actorRole && <span className="text-xs text-muted-foreground">· {e.actorRole}</span>}
                      <Badge variant="outline" className={`rounded-lg font-normal ${K.tone}`}>
                        <K.icon className="me-1 size-3" />{K.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">· {relTime(e.at, lang)}</span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-700">
                      <Building2 className="size-3.5 text-slate-400" />
                      <span className="font-medium">{e.workspaceName}</span>
                      {e.planFrom && e.planTo && e.planFrom !== e.planTo && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-mono">
                          {e.planFrom}<ArrowRight className="size-3" />{e.planTo}
                        </span>
                      )}
                    </div>

                    {e.changes.length > 0 && (
                      <div className="mt-2 space-y-1 rounded-xl border border-slate-100 bg-slate-50/60 p-2.5">
                        {e.changes.map((c, i) => {
                          const feat = featureById(c.featureId);
                          const name = feat ? feat.label[lang] : c.featureId;
                          return (
                            <div key={i} className="flex items-center justify-between gap-2 text-xs">
                              <span className="truncate font-medium text-slate-700">{name}</span>
                              <span className="flex shrink-0 items-center gap-1.5 font-mono">
                                <span className="rounded bg-rose-100 px-1.5 py-0.5 text-rose-700">{fmtValue(c.from)}</span>
                                <ArrowRight className="size-3 text-slate-400" />
                                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-700">{fmtValue(c.to)}</span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {e.note && <p className="mt-1.5 text-xs italic text-muted-foreground">"{e.note}"</p>}
                  </div>

                  <div className="shrink-0 text-end text-[11px] font-mono text-muted-foreground">
                    {new Date(e.at).toLocaleString(lang === "ar" ? "ar-EG" : "en-GB", { dateStyle: "short", timeStyle: "short" })}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
