import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Save, Copy, Trash2, Plus, Package, Sparkles, Zap, ShieldCheck, Users, Building2, FileText, Bot, Wallet, HardDrive, BarChart3, Layers } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listPlans } from "@/lib/saas.functions";
import { useEntitlements } from "@/lib/entitlements/store";
import type { EntitlementMap } from "@/lib/entitlements/catalog";

/** Map Plan Builder's group.feature ids → canonical entitlements catalog ids. */
const PB_TO_CATALOG: Record<string, string> = {
  "core.users": "core.users",
  "core.companies": "core.companies",
  "core.storage": "documents.storage",
  "accounting.invoices": "accounting.invoices",
  "accounting.quotes": "accounting.quotations",
  "accounting.purchases": "accounting.purchases",
  "accounting.journals": "accounting.journals",
  "accounting.multi_currency": "core.multiCurrency",
  "hrm.employees": "hrm.employees",
  "hrm.payroll": "hrm.payroll",
  "hrm.attendance": "hrm.attendance",
  "hrm.commissions": "hrm.commissions",
  "hrm.loyalty_cards": "loyalty.enabled",
  "ai.ai_chat": "ai.chat",
  "ai.ai_ocr": "ai.ocr",
  "ai.ai_drafting": "ai.drafts",
  "ai.ai_model": "ai.model",
  "finvoice.einv_send": "finvoice.send",
  "finvoice.einv_receive": "finvoice.receive",
  "finvoice.peppol": "finvoice.procountor",
  "billing.bank_import": "banking.feeds",
  "reports.reports": "reports.standard",
  "reports.custom_reports": "reports.custom",
  "reports.api_read": "core.api",
};
const AI_MODEL_MAP: Record<string, string> = { Fast: "flash", Balanced: "pro", Frontier: "ultra" };
const CANONICAL_PLAN_IDS = ["starter", "growth", "scale", "enterprise"] as const;

export const Route = createFileRoute("/super/plan-builder")({ component: PlanBuilderPage });

/* ---------- Granular feature catalog ---------- */

interface Feature {
  id: string;
  label: string;
  kind: "toggle" | "quota" | "select";
  options?: string[];
  unit?: string;
  hint?: string;
}
interface FeatureGroup {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  features: Feature[];
}

const CATALOG: FeatureGroup[] = [
  { id: "core", label: "Core & limits", icon: Layers, color: "from-slate-500 to-slate-700", features: [
    { id: "users", label: "Team members", kind: "quota", unit: "seats" },
    { id: "companies", label: "Companies per workspace", kind: "quota", unit: "orgs" },
    { id: "storage", label: "Document storage", kind: "quota", unit: "GB" },
    { id: "trialDays", label: "Trial length", kind: "quota", unit: "days" },
  ]},
  { id: "accounting", label: "Accounting", icon: FileText, color: "from-indigo-500 to-violet-600", features: [
    { id: "invoices", label: "Sales invoices / month", kind: "quota", unit: "invoices" },
    { id: "quotes", label: "Quotations", kind: "toggle" },
    { id: "purchases", label: "Purchase invoices", kind: "toggle" },
    { id: "journals", label: "Manual journals", kind: "toggle" },
    { id: "vat_report", label: "VAT return (ALV)", kind: "toggle" },
    { id: "multi_currency", label: "Multi-currency", kind: "toggle" },
  ]},
  { id: "hrm", label: "HR & Payroll", icon: Users, color: "from-emerald-500 to-teal-600", features: [
    { id: "employees", label: "Employees", kind: "quota", unit: "people" },
    { id: "payroll", label: "Payroll runs", kind: "toggle" },
    { id: "attendance", label: "Attendance tracking", kind: "toggle" },
    { id: "commissions", label: "Sales commissions", kind: "toggle" },
    { id: "loyalty_cards", label: "Loyalty cards", kind: "toggle" },
  ]},
  { id: "ai", label: "AI & Automation", icon: Bot, color: "from-fuchsia-500 to-pink-600", features: [
    { id: "ai_chat", label: "AI chat", kind: "toggle" },
    { id: "ai_ocr", label: "OCR receipts / month", kind: "quota", unit: "docs" },
    { id: "ai_drafting", label: "Draft invoices from email", kind: "toggle" },
    { id: "ai_model", label: "Model tier", kind: "select", options: ["Fast", "Balanced", "Frontier"] },
  ]},
  { id: "finvoice", label: "E-Invoicing (Finvoice / PEPPOL)", icon: Sparkles, color: "from-sky-500 to-cyan-600", features: [
    { id: "einv_send", label: "Send Finvoice 3.0", kind: "toggle" },
    { id: "einv_receive", label: "Receive Finvoice", kind: "toggle" },
    { id: "peppol", label: "PEPPOL access-point", kind: "toggle" },
    { id: "einv_volume", label: "E-invoices / month", kind: "quota", unit: "docs" },
  ]},
  { id: "billing", label: "Billing & Payments", icon: Wallet, color: "from-amber-500 to-orange-600", features: [
    { id: "stripe", label: "Stripe collection", kind: "toggle" },
    { id: "bank_import", label: "Bank feed import", kind: "toggle" },
    { id: "sepa", label: "SEPA credit transfer", kind: "toggle" },
    { id: "gateways", label: "Enabled gateways", kind: "quota", unit: "gateways" },
  ]},
  { id: "reports", label: "Reports & BI", icon: BarChart3, color: "from-rose-500 to-red-600", features: [
    { id: "reports", label: "Standard reports", kind: "toggle" },
    { id: "custom_reports", label: "Custom reports", kind: "toggle" },
    { id: "api_read", label: "Public read API", kind: "toggle" },
    { id: "export", label: "Data export", kind: "toggle" },
  ]},
  { id: "security", label: "Security & Compliance", icon: ShieldCheck, color: "from-lime-500 to-green-600", features: [
    { id: "mfa", label: "MFA required", kind: "toggle" },
    { id: "sso", label: "SSO (SAML/OIDC)", kind: "toggle" },
    { id: "audit_log", label: "Audit log", kind: "toggle" },
    { id: "retention", label: "Log retention", kind: "quota", unit: "days" },
    { id: "ip_allow", label: "IP allowlist", kind: "toggle" },
  ]},
  { id: "support", label: "Support & SLA", icon: HardDrive, color: "from-blue-500 to-indigo-600", features: [
    { id: "sla", label: "SLA tier", kind: "select", options: ["Community", "Standard", "Premium", "Enterprise"] },
    { id: "csm", label: "Dedicated CSM", kind: "toggle" },
    { id: "whitelabel", label: "Whitelabel domain", kind: "toggle" },
  ]},
];

type Entitlements = Record<string, Record<string, string | number | boolean>>;

interface DraftPlan {
  id: string;
  name: string;
  color: string;
  price: number;
  interval: "monthly" | "yearly";
  billing: "flat" | "per_seat" | "metered";
  visible: boolean;
  entitlements: Entitlements;
  addons: Array<{ id: string; label: string; price: number; unit: string }>;
}

const TEMPLATES: Record<string, Partial<Entitlements>> = {
  Starter: { core: { users: 5, companies: 1, storage: 5, trialDays: 14 }, accounting: { invoices: 200, quotes: true, purchases: true, journals: true, vat_report: true, multi_currency: false }, ai: { ai_chat: false, ai_ocr: 25, ai_drafting: false, ai_model: "Fast" }, hrm: { employees: 3, payroll: false, attendance: false, commissions: false, loyalty_cards: false }, security: { mfa: false, sso: false, audit_log: true, retention: 30 }, support: { sla: "Standard", csm: false, whitelabel: false } },
  Growth: { core: { users: 15, companies: 3, storage: 50, trialDays: 14 }, accounting: { invoices: 2000, quotes: true, purchases: true, journals: true, vat_report: true, multi_currency: true }, ai: { ai_chat: true, ai_ocr: 500, ai_drafting: true, ai_model: "Balanced" }, hrm: { employees: 25, payroll: true, attendance: true, commissions: true }, finvoice: { einv_send: true, einv_receive: true, einv_volume: 500 }, security: { mfa: true, audit_log: true, retention: 90 }, support: { sla: "Premium", csm: false } },
  Scale: { core: { users: 50, companies: 10, storage: 500, trialDays: 30 }, accounting: { invoices: 20000, quotes: true, purchases: true, journals: true, vat_report: true, multi_currency: true }, ai: { ai_chat: true, ai_ocr: 5000, ai_drafting: true, ai_model: "Frontier" }, hrm: { employees: 200, payroll: true, attendance: true, commissions: true, loyalty_cards: true }, finvoice: { einv_send: true, einv_receive: true, peppol: true, einv_volume: 10000 }, billing: { stripe: true, bank_import: true, sepa: true, gateways: 5 }, reports: { reports: true, custom_reports: true, api_read: true, export: true }, security: { mfa: true, sso: true, audit_log: true, retention: 365, ip_allow: true }, support: { sla: "Enterprise", csm: true, whitelabel: true } },
};

function seedFromTemplate(name: string, price: number): DraftPlan {
  const base: Entitlements = {};
  CATALOG.forEach((g) => {
    base[g.id] = {};
    g.features.forEach((f) => {
      base[g.id][f.id] = f.kind === "toggle" ? false : f.kind === "select" ? (f.options?.[0] ?? "") : 0;
    });
  });
  const tpl = TEMPLATES[name];
  if (tpl) for (const gid of Object.keys(tpl)) Object.assign(base[gid], tpl[gid]);
  return {
    id: `pb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name, color: "indigo", price, interval: "monthly", billing: "flat", visible: true,
    entitlements: base,
    addons: [
      { id: "a_extra_seat", label: "Extra user seat", price: 9, unit: "seat / mo" },
      { id: "a_extra_ocr", label: "OCR pack (500 docs)", price: 19, unit: "pack" },
    ],
  };


}

function PlanBuilderPage() {
  const { t } = useI18n();
  const listPlansFn = useServerFn(listPlans);
  const { data: plans = [] } = useQuery({ queryKey: ["saas", "plans"], queryFn: () => listPlansFn() });
  const { overwritePlanEntitlements, workspaces } = useEntitlements();
  const [drafts, setDrafts] = useState<DraftPlan[]>(() => [seedFromTemplate("Growth", 89)]);
  const [activeId, setActiveId] = useState(drafts[0].id);
  const active = drafts.find((d) => d.id === activeId) ?? drafts[0];

  const enabledCount = useMemo(() => {
    let on = 0, total = 0;
    for (const g of CATALOG) for (const f of g.features) {
      total++;
      const v = active.entitlements[g.id]?.[f.id];
      if (f.kind === "toggle" ? v === true : Boolean(v)) on++;
    }
    return { on, total };
  }, [active]);

  const update = (gid: string, fid: string, val: string | number | boolean) =>
    setDrafts((prev) => prev.map((d) => d.id !== active.id ? d : ({
      ...d, entitlements: { ...d.entitlements, [gid]: { ...d.entitlements[gid], [fid]: val } },
    })));

  const patchDraft = (patch: Partial<DraftPlan>) =>
    setDrafts((prev) => prev.map((d) => d.id === active.id ? { ...d, ...patch } : d));

  const addDraft = (tpl: string) => {
    const price = tpl === "Starter" ? 29 : tpl === "Growth" ? 89 : tpl === "Scale" ? 249 : 0;
    const n = seedFromTemplate(tpl, price);
    setDrafts((p) => [...p, n]); setActiveId(n.id);
    toast.success(`Draft "${tpl}" created`);
  };
  const cloneDraft = () => {
    const n = { ...active, id: `pb_${Date.now()}`, name: `${active.name} (copy)`, entitlements: JSON.parse(JSON.stringify(active.entitlements)) };
    setDrafts((p) => [...p, n]); setActiveId(n.id);
  };
  const removeDraft = () => {
    if (drafts.length === 1) return toast.error("Keep at least one draft");
    const rest = drafts.filter((d) => d.id !== active.id);
    setDrafts(rest); setActiveId(rest[0].id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t("pb.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("pb.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {["Starter", "Growth", "Scale", "Custom"].map((k) => (
            <Button key={k} size="sm" variant="outline" onClick={() => addDraft(k)} className="gap-1.5">
              <Plus className="size-3.5" /> {k}
            </Button>
          ))}
        </div>
      </div>

      {/* Draft tabs */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-glass-border bg-white p-2 shadow-sm">
        {drafts.map((d) => (
          <button key={d.id} onClick={() => setActiveId(d.id)}
            className={cn("flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors",
              d.id === active.id ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white" : "text-slate-600 hover:bg-slate-100")}>
            <Package className="size-3.5" />
            {d.name}
            <span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", d.id === active.id ? "bg-white/20" : "bg-slate-200")}>€{d.price}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        {/* Main editor */}
        <div className="space-y-4">
          {/* Header card */}
          <div className="rounded-2xl border border-glass-border bg-white p-5 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div><Label>Plan name</Label><Input value={active.name} onChange={(e) => patchDraft({ name: e.target.value })} className="mt-1.5" /></div>
              <div><Label>Price (€)</Label><Input type="number" value={active.price} onChange={(e) => patchDraft({ price: Number(e.target.value) })} className="mt-1.5" /></div>
              <div>
                <Label>Billing model</Label>
                <Select value={active.billing} onValueChange={(v: DraftPlan["billing"]) => patchDraft({ billing: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">Flat monthly fee</SelectItem>
                    <SelectItem value="per_seat">Per seat</SelectItem>
                    <SelectItem value="metered">Metered (usage)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Interval</Label>
                <Select value={active.interval} onValueChange={(v: DraftPlan["interval"]) => patchDraft({ interval: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
              <div className="flex items-center gap-3">
                <Switch checked={active.visible} onCheckedChange={(v) => patchDraft({ visible: v })} />
                <span className="text-sm">Visible on public pricing page</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline"><Zap className="me-1 size-3 text-indigo-500" />{enabledCount.on}/{enabledCount.total} features</Badge>
                <Button size="sm" variant="ghost" onClick={cloneDraft}><Copy className="size-4" /></Button>
                <Button size="sm" variant="ghost" onClick={removeDraft} className="text-red-600 hover:bg-red-50"><Trash2 className="size-4" /></Button>
                <Button size="sm" onClick={() => {
                  // Map draft entitlements → canonical ids and push to entitlements engine.
                  const map: EntitlementMap = {};
                  for (const gid of Object.keys(active.entitlements)) {
                    for (const fid of Object.keys(active.entitlements[gid])) {
                      const canonical = PB_TO_CATALOG[`${gid}.${fid}`];
                      if (!canonical) continue;
                      let v = active.entitlements[gid][fid];
                      if (canonical === "ai.model" && typeof v === "string") v = AI_MODEL_MAP[v] ?? v;
                      map[canonical] = v;
                    }
                  }
                  const planId = (CANONICAL_PLAN_IDS as readonly string[]).includes(active.name.toLowerCase())
                    ? active.name.toLowerCase()
                    : "growth";
                  overwritePlanEntitlements(planId, map);
                  const affected = workspaces.filter((w) => w.planId === planId).length;
                  toast.success(`${t("pb.publishedTo")} · ${affected}`);
                }} className="gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
                  <Save className="size-4" /> Publish
                </Button>
              </div>
            </div>
          </div>

          {/* Feature groups */}
          {CATALOG.map((g) => {
            const Icon = g.icon;
            const ent = active.entitlements[g.id] ?? {};
            return (
              <div key={g.id} className="rounded-2xl border border-glass-border bg-white shadow-sm">
                <header className={cn("flex items-center gap-3 rounded-t-2xl bg-gradient-to-r p-4 text-white", g.color)}>
                  <div className="flex size-9 items-center justify-center rounded-lg bg-white/20 backdrop-blur"><Icon className="size-5" /></div>
                  <div>
                    <h3 className="font-display text-base font-semibold">{g.label}</h3>
                    <p className="text-xs text-white/80">{g.features.length} configurable options</p>
                  </div>
                </header>
                <div className="divide-y divide-slate-100">
                  {g.features.map((f) => (
                    <div key={f.id} className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-3">
                      <div>
                        <p className="text-sm font-medium">{f.label}</p>
                        {f.hint && <p className="text-[11px] text-muted-foreground">{f.hint}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {f.kind === "toggle" && (
                          <Switch checked={Boolean(ent[f.id])} onCheckedChange={(v) => update(g.id, f.id, v)} />
                        )}
                        {f.kind === "quota" && (
                          <div className="flex items-center gap-2">
                            <Input type="number" value={Number(ent[f.id] ?? 0)}
                              onChange={(e) => update(g.id, f.id, Number(e.target.value))}
                              className="h-8 w-24 text-end font-mono text-sm" />
                            <span className="w-14 text-xs text-muted-foreground">{f.unit}</span>
                          </div>
                        )}
                        {f.kind === "select" && (
                          <Select value={String(ent[f.id] ?? f.options?.[0] ?? "")} onValueChange={(v) => update(g.id, f.id, v)}>
                            <SelectTrigger className="h-8 w-40 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>{f.options?.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Add-ons */}
          <div className="rounded-2xl border border-glass-border bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold">Metered add-ons</h3>
                <p className="text-xs text-muted-foreground">Charged on top of the base plan.</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => patchDraft({ addons: [...active.addons, { id: `a_${Date.now()}`, label: "New add-on", price: 0, unit: "unit" }] })} className="gap-1.5">
                <Plus className="size-3.5" /> Add-on
              </Button>
            </div>
            <div className="space-y-2">
              {active.addons.map((a, i) => (
                <div key={a.id} className="grid grid-cols-[1fr_120px_120px_36px] items-center gap-2">
                  <Input value={a.label} onChange={(e) => patchDraft({ addons: active.addons.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} />
                  <Input type="number" value={a.price} onChange={(e) => patchDraft({ addons: active.addons.map((x, j) => j === i ? { ...x, price: Number(e.target.value) } : x) })} />
                  <Input value={a.unit} onChange={(e) => patchDraft({ addons: active.addons.map((x, j) => j === i ? { ...x, unit: e.target.value } : x) })} />
                  <Button size="icon" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => patchDraft({ addons: active.addons.filter((_, j) => j !== i) })}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live preview */}
        <aside className="space-y-4">
          <div className="sticky top-4 space-y-4">
            <div className="overflow-hidden rounded-3xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-xl">
              <div className="p-6">
                <Badge className="mb-3 bg-white/20 text-white">Live preview</Badge>
                <h3 className="font-display text-2xl font-semibold">{active.name || "Untitled plan"}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-bold">€{active.price}</span>
                  <span className="text-sm opacity-80">/ {active.interval}</span>
                </div>
                <p className="mt-1 text-xs opacity-80 capitalize">{active.billing.replace("_", " ")} billing</p>
              </div>
              <div className="space-y-1 bg-white/10 p-4 text-xs backdrop-blur">
                {CATALOG.map((g) => {
                  const on = g.features.filter((f) => {
                    const v = active.entitlements[g.id]?.[f.id];
                    return f.kind === "toggle" ? v === true : Boolean(v);
                  }).length;
                  return (
                    <div key={g.id} className="flex items-center justify-between">
                      <span className="opacity-90">{g.label}</span>
                      <span className="font-mono">{on}/{g.features.length}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Existing plans</p>
              <div className="mt-2 space-y-1.5">
                {plans.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span>{p.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">€{p.price}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
