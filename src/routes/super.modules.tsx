import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileText, Calculator, Sparkles, Users, FileCheck, FolderOpen, BarChart3, TrendingUp, Check } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/super/modules")({ component: ModulesPage });

interface Module {
  id: string;
  name: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  addOnPrice: number;
  activeIn: number;
  features: string[];
}

const MODULES: Module[] = [
  { id: "cms", name: "CMS Core", desc: "Multi-tenant foundation, users, and workspace switcher.", icon: FolderOpen, color: "from-slate-500 to-slate-700", addOnPrice: 0, activeIn: 214, features: ["Multi-tenant isolation", "Role-based access", "Workspace switcher", "Localization (EN/AR/FI)"] },
  { id: "accounting", name: "Accounting", desc: "Full double-entry books, invoicing, and cashflow.", icon: Calculator, color: "from-emerald-500 to-teal-600", addOnPrice: 19, activeIn: 198, features: ["Chart of accounts", "Journals & ledger", "Multi-currency", "VAT & tax reports"] },
  { id: "ai", name: "AI Assistant", desc: "Hybrid LLM for drafting, extraction, and insights.", icon: Sparkles, color: "from-violet-500 to-fuchsia-600", addOnPrice: 29, activeIn: 127, features: ["Expense OCR", "Voice-to-invoice", "Report summaries", "Anomaly detection"] },
  { id: "hrm", name: "HRM & Payroll", desc: "Employees, attendance, and Nordic-compliant payroll.", icon: Users, color: "from-orange-500 to-red-500", addOnPrice: 39, activeIn: 84, features: ["Employee database", "Attendance & shifts", "Payroll (FI, SE, EE)", "Vacation tracking"] },
  { id: "finvoice", name: "Finvoice 3.0", desc: "Finnish electronic invoicing standard.", icon: FileCheck, color: "from-blue-500 to-indigo-600", addOnPrice: 15, activeIn: 62, features: ["Finvoice 3.0 export", "Verkkolasku routing", "Bank operator integration", "Peppol"] },
  { id: "documents", name: "Documents & OCR", desc: "Scan, extract, and archive with searchable OCR.", icon: FileText, color: "from-cyan-500 to-sky-600", addOnPrice: 12, activeIn: 156, features: ["OCR (12 languages)", "Auto-categorization", "Full-text search", "S3-compatible storage"] },
  { id: "reports", name: "Reports & BI", desc: "Custom dashboards and scheduled exports.", icon: BarChart3, color: "from-pink-500 to-rose-600", addOnPrice: 25, activeIn: 108, features: ["Custom KPI builder", "Scheduled email reports", "CSV/PDF exports", "Compare periods"] },
  { id: "insights", name: "AI Insights", desc: "Predictive forecasting and business advice.", icon: TrendingUp, color: "from-amber-500 to-orange-600", addOnPrice: 49, activeIn: 41, features: ["Cashflow forecast", "Growth advisor", "Benchmarking", "Weekly summary email"] },
];

function ModulesPage() {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState<Record<string, boolean>>(Object.fromEntries(MODULES.map((m) => [m.id, true])));
  const [prices, setPrices] = useState<Record<string, number>>(Object.fromEntries(MODULES.map((m) => [m.id, m.addOnPrice])));

  const totals = useMemo(() => ({
    enabled: Object.values(enabled).filter(Boolean).length,
    addonMrr: MODULES.reduce((s, m) => s + (enabled[m.id] ? prices[m.id] * m.activeIn * 0.35 : 0), 0),
    installs: MODULES.reduce((s, m) => s + m.activeIn, 0),
  }), [enabled, prices]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t("nav.modules")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every feature module — pricing, availability, and adoption.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KPI label="Modules enabled" value={`${totals.enabled} / ${MODULES.length}`} />
        <KPI label="Add-on MRR (est.)" value={`€${Math.round(totals.addonMrr).toLocaleString()}`} accent />
        <KPI label="Total installs" value={totals.installs.toLocaleString()} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {MODULES.map((m) => {
          const on = enabled[m.id];
          return (
            <article key={m.id} className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${on ? "border-glass-border" : "border-dashed border-slate-300 opacity-70"}`}>
              <div className={`h-1.5 bg-gradient-to-r ${m.color}`} />
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ${m.color} text-white shadow-md`}><m.icon className="size-5" /></div>
                    <div>
                      <h3 className="font-display text-lg font-semibold">{m.name}</h3>
                      <p className="text-xs text-muted-foreground">{m.activeIn} workspaces</p>
                    </div>
                  </div>
                  <Switch checked={on} onCheckedChange={(v) => { setEnabled((p) => ({ ...p, [m.id]: v })); toast.success(`${m.name} ${v ? "enabled" : "disabled"} platform-wide`); }} />
                </div>
                <p className="mt-3 text-sm text-slate-600">{m.desc}</p>

                <ul className="mt-3 space-y-1.5">
                  {m.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-slate-600"><Check className="size-3.5 shrink-0 text-emerald-600" />{f}</li>
                  ))}
                </ul>

                <div className={`mt-4 flex items-end gap-2 border-t border-slate-100 pt-3 ${on ? "" : "pointer-events-none opacity-50"}`}>
                  <div className="flex-1">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Add-on price</Label>
                    <div className="mt-1 flex items-center gap-1">
                      <span className="text-sm text-slate-500">€</span>
                      <Input type="number" value={prices[m.id]} onChange={(e) => setPrices((p) => ({ ...p, [m.id]: Number(e.target.value) || 0 }))} className="h-9 w-24 text-sm" />
                      <span className="text-xs text-muted-foreground">/mo</span>
                    </div>
                  </div>
                  <div className="text-end">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Adoption</p>
                    <p className="font-display text-lg font-semibold tabular-nums">{Math.round((m.activeIn / 214) * 100)}%</p>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function KPI({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border border-glass-border p-5 shadow-sm ${accent ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white" : "bg-white"}`}>
      <p className={`text-xs uppercase tracking-wide ${accent ? "text-white/80" : "text-muted-foreground"}`}>{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
