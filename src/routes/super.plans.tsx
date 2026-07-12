import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Edit2, Trash2, Package, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useI18n } from "@/lib/i18n";
import { listPlans, upsertPlan, deletePlan, togglePlan, type PlanDTO, type ModuleKey, type PlanType, type PlanInterval } from "@/lib/saas.functions";

export const Route = createFileRoute("/super/plans")({ component: PlansPage });

const ALL_MODULES: ModuleKey[] = ["cms", "accounting", "ai", "hrm", "finvoice", "documents", "reports"];

function emptyPlan(): PlanDTO {
  return { id: "", name: "", type: "paid", interval: "monthly", price: 0, users: 5, companies: 1, invoices: 100, trialDays: 14, modules: ["cms"], active: true };
}

function PlansPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const listFn = useServerFn(listPlans);
  const upsertFn = useServerFn(upsertPlan);
  const deleteFn = useServerFn(deletePlan);
  const toggleFn = useServerFn(togglePlan);

  const { data: plans = [], isLoading } = useQuery({ queryKey: ["saas", "plans"], queryFn: () => listFn() });
  const refresh = () => qc.invalidateQueries({ queryKey: ["saas", "plans"] });

  const [editing, setEditing] = useState<PlanDTO | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PlanDTO | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave(p: PlanDTO) {
    setSaving(true);
    try {
      await upsertFn({ data: { ...p, id: p.id || undefined } });
      toast.success("Plan saved");
      setEditing(null);
      refresh();
    } catch {
      toast.error("Could not save plan");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(p: PlanDTO) {
    try {
      await toggleFn({ data: { id: p.id } });
      toast.success(`${p.name} ${p.active ? "disabled" : "enabled"}`);
      refresh();
    } catch {
      toast.error("Could not update plan");
    }
  }

  async function handleDelete(p: PlanDTO) {
    try {
      await deleteFn({ data: { id: p.id } });
      toast.success("Plan deleted");
      setConfirmDelete(null);
      refresh();
    } catch {
      toast.error("Could not delete plan");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t("plans.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("plans.subtitle")}</p>
        </div>
        <Button onClick={() => setEditing(emptyPlan())} className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md hover:opacity-95">
          <Plus className="me-2 size-4" />{t("plans.new")}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="me-2 size-5 animate-spin" /> Loading plans…
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((p) => (
            <article key={p.id} className={`group relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition ${p.active ? "border-glass-border hover:shadow-md" : "border-dashed border-slate-300 opacity-70"}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex size-10 items-center justify-center rounded-xl ${p.type === "free" ? "bg-emerald-500/15 text-emerald-600" : p.type === "custom" ? "bg-amber-500/15 text-amber-600" : "bg-indigo-500/15 text-indigo-600"}`}>
                    <Package className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold">{p.name || "—"}</h3>
                    <p className="text-xs capitalize text-muted-foreground">{p.type} · {p.interval}</p>
                  </div>
                </div>
                <Switch checked={p.active} onCheckedChange={() => handleToggle(p)} />
              </div>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-display text-3xl font-bold">{p.price === 0 ? "Free" : `€${p.price}`}</span>
                {p.price > 0 && <span className="text-sm text-muted-foreground">/{p.interval === "monthly" ? "mo" : "yr"}</span>}
              </div>

              <ul className="mt-4 space-y-1.5 text-sm">
                <Row label={t("plans.users")} value={p.users.toLocaleString()} />
                <Row label={t("plans.companies")} value={p.companies.toLocaleString()} />
                <Row label={t("plans.invoices")} value={p.invoices.toLocaleString()} />
                <Row label={t("plans.trial")} value={`${p.trialDays}d`} />
              </ul>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {p.modules.map((m) => (
                  <span key={m} className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium capitalize text-indigo-700">{m}</span>
                ))}
              </div>

              <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4">
                <Button variant="outline" size="sm" className="flex-1 rounded-lg" onClick={() => setEditing(p)}>
                  <Edit2 className="me-1.5 size-3.5" />{t("common.edit")}
                </Button>
                <Button variant="ghost" size="sm" className="rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setConfirmDelete(p)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing && <PlanEditor plan={editing} saving={saving} onClose={() => setEditing(null)} onSave={handleSave} />}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirmDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the plan. Existing subscribers keep it until renewal.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => { if (confirmDelete) handleDelete(confirmDelete); }}>{t("common.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </li>
  );
}

function PlanEditor({ plan, saving, onClose, onSave }: { plan: PlanDTO; saving: boolean; onClose: () => void; onSave: (p: PlanDTO) => void }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<PlanDTO>(plan);
  const toggleModule = (m: ModuleKey) => setDraft((d) => ({ ...d, modules: d.modules.includes(m) ? d.modules.filter((x) => x !== m) : [...d.modules, m] }));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{plan.name ? `Edit ${plan.name}` : t("plans.new")}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <Field className="col-span-2" label={t("common.name")}>
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Growth" />
          </Field>
          <Field label={t("plans.type")}>
            <Select value={draft.type} onValueChange={(v) => setDraft({ ...draft, type: v as PlanType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="free">Free</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field label={t("plans.interval")}>
            <Select value={draft.interval} onValueChange={(v) => setDraft({ ...draft, interval: v as PlanInterval })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="yearly">Yearly</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field label={`${t("plans.price")} (€)`}><Input type="number" value={draft.price} onChange={(e) => setDraft({ ...draft, price: +e.target.value })} /></Field>
          <Field label={t("plans.trial")}><Input type="number" value={draft.trialDays} onChange={(e) => setDraft({ ...draft, trialDays: +e.target.value })} /></Field>
          <Field label={t("plans.users")}><Input type="number" value={draft.users} onChange={(e) => setDraft({ ...draft, users: +e.target.value })} /></Field>
          <Field label={t("plans.companies")}><Input type="number" value={draft.companies} onChange={(e) => setDraft({ ...draft, companies: +e.target.value })} /></Field>
          <Field className="col-span-2" label={t("plans.invoices")}><Input type="number" value={draft.invoices} onChange={(e) => setDraft({ ...draft, invoices: +e.target.value })} /></Field>
          <div className="col-span-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("plans.modules")}</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {ALL_MODULES.map((m) => {
                const on = draft.modules.includes(m);
                return (
                  <button key={m} type="button" onClick={() => toggleModule(m)} className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition ${on ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    {on && <Check className="size-3" />}<span className="capitalize">{m}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => onSave(draft)} disabled={!draft.name || saving}>
            {saving && <Loader2 className="me-2 size-4 animate-spin" />}{t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
