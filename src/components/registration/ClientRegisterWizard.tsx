import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Search, Building2, Check, Loader2, ChevronRight, ChevronLeft, Rocket, MapPin, Users, Package, Shield, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { listPlans, createWorkspace } from "@/lib/saas.functions";
import { useI18n } from "@/lib/i18n";

export interface CompanyLookup {
  businessId: string;
  name: string;
  legalForm: string;
  registrationDate: string;
  status: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  industry: string;
  vatRegistered: boolean;
  employerRegistered: boolean;
  prepaymentRegistered: boolean;
  source: "prh" | "mock" | "manual";
}

interface Props {
  variant?: "signup" | "internal"; // signup = 4 steps incl. owner+plan, internal = 3 steps (skip password, allow plan)
  onCreated?: (payload: { workspaceId: string; company: CompanyLookup }) => void;
  compact?: boolean;
}

export function ClientRegisterWizard({ variant = "internal", onCreated, compact }: Props) {
  const listPlansFn = useServerFn(listPlans);
  const createWsFn = useServerFn(createWorkspace);
  const { data: plans = [] } = useQuery({ queryKey: ["saas", "plans"], queryFn: () => listPlansFn() });
  const { t } = useI18n();
  const [step, setStep] = useState(1);
  const [businessId, setBusinessId] = useState("");
  const [looking, setLooking] = useState(false);
  const [company, setCompany] = useState<CompanyLookup | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manual, setManual] = useState<CompanyLookup>({
    businessId: "", name: "", legalForm: "Oy", registrationDate: "", status: "Active",
    street: "", postalCode: "", city: "", country: "FI", industry: "",
    vatRegistered: false, employerRegistered: false, prepaymentRegistered: false, source: "manual",
  });

  const [owner, setOwner] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "" });
  const [workspace, setWorkspace] = useState({ name: "", subdomain: "" });
  const [planId, setPlanId] = useState(plans[1]?.id ?? plans[0]?.id ?? "");

  const totalSteps = variant === "signup" ? 4 : 3;
  const stepsMeta = variant === "signup"
    ? [
        { n: 1, label: t("reg.step.company") },
        { n: 2, label: t("reg.step.owner") },
        { n: 3, label: t("reg.step.workspace") },
        { n: 4, label: t("reg.step.plan") },
      ]
    : [
        { n: 1, label: t("reg.step.company") },
        { n: 2, label: t("reg.step.workspace") },
        { n: 3, label: t("reg.step.plan") },
      ];

  const activeCompany = company ?? (manualMode ? manual : null);

  const lookup = async () => {
    setLooking(true); setCompany(null);
    try {
      const res = await fetch(`/api/public/ytj/${encodeURIComponent(businessId.trim())}`);
      if (res.ok) {
        const data = (await res.json()) as CompanyLookup;
        setCompany(data);
        setWorkspace({
          name: data.name,
          subdomain: data.name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20),
        });
        toast.success(data.source === "prh" ? t("reg.lookup.foundPrh") : t("reg.lookup.foundDemo"));
      } else if (res.status === 400) {
        toast.error(t("reg.lookup.invalidFormat"));
      } else {
        toast.error(t("reg.lookup.notFound"));
      }
    } catch {
      toast.error(t("reg.lookup.network"));
    } finally {
      setLooking(false);
    }
  };

  const submit = async () => {
    const c = activeCompany;
    if (!c) return;
    try {
      const res = await createWsFn({ data: {
        name: workspace.name,
        ownerName: `${owner.firstName || "Owner"} ${owner.lastName || ""}`.trim() || c.name,
        ownerEmail: owner.email || `contact@${workspace.subdomain}.fi`,
        planId: planId || undefined,
        status: variant === "signup" ? "trial" : "active",
        country: (c.country || "FI").slice(0, 2).toUpperCase(),
        companies: 1,
        businessId: c.businessId || undefined,
      }});
      toast.success(t("reg.created"));
      onCreated?.({ workspaceId: res.id, company: c });
      setStep(1); setBusinessId(""); setCompany(null); setManualMode(false);
      setOwner({ firstName: "", lastName: "", email: "", phone: "", password: "" });
      setWorkspace({ name: "", subdomain: "" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create workspace");
    }
  };

  const stepIdx = variant === "signup" ? step : step;
  const canCompany = !!activeCompany;
  const canOwner = owner.firstName && owner.lastName && owner.email && owner.password.length >= 8;
  const canWorkspace = !!workspace.name && !!workspace.subdomain;

  const canNext = () => {
    if (variant === "signup") {
      if (step === 1) return canCompany;
      if (step === 2) return canOwner;
      if (step === 3) return canWorkspace;
    } else {
      if (step === 1) return canCompany;
      if (step === 2) return canWorkspace;
    }
    return true;
  };

  return (
    <div className={cn("space-y-6", compact ? "" : "")}>
      {/* Stepper */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {stepsMeta.map((s, i) => (
          <div key={s.n} className="flex items-center">
            <div className="flex items-center gap-2">
              <div className={cn("flex size-8 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                stepIdx >= s.n ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white" : "bg-slate-200 text-slate-500")}>
                {stepIdx > s.n ? <Check className="size-4" /> : s.n}
              </div>
              <span className={cn("hidden text-xs font-medium sm:inline", stepIdx >= s.n ? "text-slate-900" : "text-muted-foreground")}>{s.label}</span>
            </div>
            {i < stepsMeta.length - 1 && <div className={cn("mx-3 h-px w-8 transition-colors", stepIdx > s.n ? "bg-indigo-500" : "bg-slate-200")} />}
          </div>
        ))}
      </div>

      {/* Step 1: company */}
      {step === 1 && (
        <div className="space-y-5">
          <div className="text-center">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
              <Building2 className="size-6" />
            </div>
            <h2 className="font-display text-xl font-semibold">{t("reg.company.title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("reg.company.subtitle")}</p>
          </div>
          <div className="mx-auto max-w-xl">
            <Label>{t("reg.company.businessId")}</Label>
            <div className="mt-1.5 flex gap-2">
              <Input placeholder="e.g. 2417581-8" value={businessId}
                onChange={(e) => setBusinessId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !looking && lookup()} className="font-mono" />
              <Button onClick={lookup} disabled={!businessId || looking} className="gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
                {looking ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                {t("reg.company.lookup")}
              </Button>
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {t("reg.company.tryDemo")}: {" "}
              {["2417581-8", "1927400-1", "1234567-8"].map((id, i) => (
                <span key={id}>
                  {i > 0 && " · "}
                  <button type="button" className="font-mono text-indigo-600 hover:underline" onClick={() => setBusinessId(id)}>{id}</button>
                </span>
              ))}
            </p>
          </div>

          {company && (
            <div className="mx-auto max-w-2xl animate-in fade-in slide-in-from-bottom-2 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
              <div className="flex items-start gap-4">
                <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-500 text-white">
                  <Check className="size-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-lg font-semibold">{company.name}</h3>
                    <Badge className="bg-emerald-500">{company.status || "Active"}</Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {company.source === "prh" ? "PRH / YTJ (live)" : "Demo data"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{company.legalForm} · {company.registrationDate}</p>
                  <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                    <div><span className="text-muted-foreground">Y-tunnus:</span> <span className="font-mono ms-1">{company.businessId}</span></div>
                    {company.industry && <div><span className="text-muted-foreground">Industry:</span> {company.industry}</div>}
                    <div className="sm:col-span-2 inline-flex items-center gap-1.5"><MapPin className="size-3 text-muted-foreground" />{[company.street, company.postalCode, company.city].filter(Boolean).join(", ")}</div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {company.vatRegistered && <Badge variant="secondary" className="bg-white text-emerald-700">VAT (ALV)</Badge>}
                    {company.employerRegistered && <Badge variant="secondary" className="bg-white text-emerald-700">Employer register</Badge>}
                    {company.prepaymentRegistered && <Badge variant="secondary" className="bg-white text-emerald-700">Prepayment register</Badge>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {manualMode && !company && (
            <div className="mx-auto grid max-w-2xl gap-3 rounded-2xl border bg-white p-5 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Company name</Label><Input value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} className="mt-1.5" /></div>
              <div><Label>Business ID</Label><Input value={manual.businessId} onChange={(e) => setManual({ ...manual, businessId: e.target.value })} className="mt-1.5 font-mono" /></div>
              <div><Label>Legal form</Label><Input value={manual.legalForm} onChange={(e) => setManual({ ...manual, legalForm: e.target.value })} className="mt-1.5" /></div>
              <div><Label>Street</Label><Input value={manual.street} onChange={(e) => setManual({ ...manual, street: e.target.value })} className="mt-1.5" /></div>
              <div><Label>City</Label><Input value={manual.city} onChange={(e) => setManual({ ...manual, city: e.target.value })} className="mt-1.5" /></div>
              <div><Label>Postal code</Label><Input value={manual.postalCode} onChange={(e) => setManual({ ...manual, postalCode: e.target.value })} className="mt-1.5" /></div>
              <div><Label>Country</Label><Input value={manual.country} onChange={(e) => setManual({ ...manual, country: e.target.value })} className="mt-1.5" /></div>
            </div>
          )}

          <div className="text-center">
            <button type="button" onClick={() => { setManualMode((v) => !v); setCompany(null); }} className="text-xs text-muted-foreground underline-offset-4 hover:text-slate-900 hover:underline">
              {manualMode ? "← Back to YTJ lookup" : "Not a Finnish company? Enter manually →"}
            </button>
          </div>
        </div>
      )}

      {/* Owner step (signup only) */}
      {variant === "signup" && step === 2 && (
        <div className="mx-auto max-w-xl space-y-4">
          <div className="text-center">
            <h2 className="font-display text-xl font-semibold">{t("reg.owner.title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("reg.owner.subtitle")}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>First name</Label><Input value={owner.firstName} onChange={(e) => setOwner({ ...owner, firstName: e.target.value })} className="mt-1.5" /></div>
            <div><Label>Last name</Label><Input value={owner.lastName} onChange={(e) => setOwner({ ...owner, lastName: e.target.value })} className="mt-1.5" /></div>
          </div>
          <div><Label>Email</Label><Input type="email" value={owner.email} onChange={(e) => setOwner({ ...owner, email: e.target.value })} className="mt-1.5" /></div>
          <div><Label>Phone (optional)</Label><Input value={owner.phone} onChange={(e) => setOwner({ ...owner, phone: e.target.value })} className="mt-1.5" placeholder="+358 40 123 4567" /></div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={owner.password} onChange={(e) => setOwner({ ...owner, password: e.target.value })} className="mt-1.5" placeholder="At least 8 characters" />
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-xs text-muted-foreground">
            <Shield className="me-1 inline size-3.5 text-emerald-600" /> AES-256 at rest · EU-hosted (Frankfurt)
          </div>
        </div>
      )}

      {/* Workspace step */}
      {((variant === "signup" && step === 3) || (variant === "internal" && step === 2)) && (
        <div className="mx-auto max-w-xl space-y-4">
          <div className="text-center">
            <h2 className="font-display text-xl font-semibold">{t("reg.workspace.title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("reg.workspace.subtitle")}</p>
          </div>
          <div><Label>Workspace name</Label><Input value={workspace.name} onChange={(e) => setWorkspace({ ...workspace, name: e.target.value })} className="mt-1.5" /></div>
          <div>
            <Label>Subdomain</Label>
            <div className="mt-1.5 flex overflow-hidden rounded-md border">
              <Input value={workspace.subdomain} onChange={(e) => setWorkspace({ ...workspace, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "") })} className="border-0 rounded-none focus-visible:ring-0" placeholder="mycompany" />
              <span className="flex items-center bg-slate-50 px-3 text-xs text-muted-foreground border-s">.fiksu.fi</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-xl border p-4 text-center">
              <div className="mx-auto mb-2 flex size-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600"><Users className="size-4" /></div>
              <p className="text-xs text-muted-foreground">Team members</p>
              <p className="font-display text-2xl font-semibold">1</p>
            </div>
            <div className="rounded-xl border p-4 text-center">
              <div className="mx-auto mb-2 flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600"><Package className="size-4" /></div>
              <p className="text-xs text-muted-foreground">Companies</p>
              <p className="font-display text-2xl font-semibold">1</p>
            </div>
          </div>
        </div>
      )}

      {/* Plan step */}
      {((variant === "signup" && step === 4) || (variant === "internal" && step === 3)) && (
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="font-display text-xl font-semibold">{t("reg.plan.title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("reg.plan.subtitle")}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {plans.filter((p) => p.active).map((p) => (
              <button key={p.id} type="button" onClick={() => setPlanId(p.id)}
                className={cn("group relative rounded-2xl border-2 p-5 text-start transition-all hover:-translate-y-0.5 hover:shadow-lg",
                  planId === p.id ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/30" : "border-slate-200 bg-white")}>
                {p.name.toLowerCase().includes("growth") && <Badge className="absolute -top-2 end-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white">Popular</Badge>}
                <p className="text-sm font-semibold">{p.name}</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-display text-3xl font-bold">€{p.price}</span>
                  <span className="text-xs text-muted-foreground">/ {p.interval}</span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">{p.users} users · {p.companies} co · {p.invoices.toLocaleString()} inv</p>
                <ul className="mt-3 space-y-1">
                  {p.modules.slice(0, 5).map((m) => (
                    <li key={m} className="flex items-center gap-1.5 text-[11px]">
                      <Check className="size-3 text-emerald-500" /><span className="capitalize">{m}</span>
                    </li>
                  ))}
                </ul>
              </button>
            ))}
          </div>
          {variant === "internal" && (
            <div className="mx-auto max-w-md rounded-xl border bg-white p-4">
              <Label className="text-xs">Contact email (invitation will be sent here)</Label>
              <Input value={owner.email} onChange={(e) => setOwner({ ...owner, email: e.target.value })} className="mt-1.5" placeholder="owner@company.fi" />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Input value={owner.firstName} onChange={(e) => setOwner({ ...owner, firstName: e.target.value })} placeholder="First name" />
                <Input value={owner.lastName} onChange={(e) => setOwner({ ...owner, lastName: e.target.value })} placeholder="Last name" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Nav */}
      <div className="flex items-center justify-between border-t pt-5">
        <Button variant="ghost" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1} className="gap-1">
          <ChevronLeft className="size-4" /> Back
        </Button>
        {step < totalSteps ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canNext()}
            className="gap-1 bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
            Continue <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button onClick={submit} disabled={!activeCompany || !workspace.name}
            className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
            <Rocket className="size-4" /> {t("reg.create")}
          </Button>
        )}
      </div>

      {variant === "signup" && (
        <p className="pt-2 text-center text-[11px] text-muted-foreground">
          <Sparkles className="me-1 inline size-3 text-indigo-500" />
          Powered by Finnish Business Information System (YTJ / PRH avoindata)
        </p>
      )}
    </div>
  );
}
