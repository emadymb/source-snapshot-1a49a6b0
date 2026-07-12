import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Save } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useEntitlements } from "@/lib/entitlements/store";
import { useFirm } from "@/lib/mock/firm";
import { useAudit } from "@/lib/mock/audit";
import { FEATURES, MODULES, type EntitlementMap } from "@/lib/entitlements/catalog";
import { cn } from "@/lib/utils";

/** Firm-Admin editor: pick plan + fine-tune every feature for one workspace. */
export function PlanEntitlementsDrawer({
  workspaceId, open, onOpenChange,
}: { workspaceId: string | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t, lang, dir } = useI18n();
  const {
    workspaces, plans, planForWorkspace, entitlementsForWorkspace,
    setPlanForWorkspace, updateAddon, resetAddons,
  } = useEntitlements();
  const { staff, roles, currentStaffId } = useFirm();
  const { log } = useAudit();

  const ws = workspaces.find((w) => w.id === workspaceId) ?? null;
  const currentPlan = ws ? planForWorkspace(ws.id) : plans[0];
  const currentEnt = ws ? entitlementsForWorkspace(ws.id) : {};

  const [selectedPlanId, setSelectedPlanId] = useState(currentPlan.id);
  const [draft, setDraft] = useState<EntitlementMap>(currentEnt);

  useEffect(() => {
    if (!ws) return;
    setSelectedPlanId(currentPlan.id);
    setDraft(currentEnt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, open]);

  const planPreset = useMemo(() => plans.find((p) => p.id === selectedPlanId)?.entitlements ?? {}, [plans, selectedPlanId]);
  const merged: EntitlementMap = useMemo(() => ({ ...planPreset, ...draft }), [planPreset, draft]);

  const onSave = () => {
    if (!ws) return;
    const planChanged = selectedPlanId !== ws.planId;
    if (planChanged) setPlanForWorkspace(ws.id, selectedPlanId);
    // Diff addons from plan preset
    const overrides: EntitlementMap = {};
    const changes: { featureId: string; from: unknown; to: unknown }[] = [];
    for (const f of FEATURES) {
      const base = planPreset[f.id];
      const val = merged[f.id];
      if (val !== base) {
        overrides[f.id] = val;
        changes.push({ featureId: f.id, from: base, to: val });
      }
    }
    // Reset then set each override
    resetAddons(ws.id);
    for (const [fid, v] of Object.entries(overrides)) updateAddon(ws.id, fid, v);

    // Audit log
    const actor = staff.find((s) => s.id === currentStaffId);
    const actorRole = actor ? roles.find((r) => r.id === actor.roleId)?.name : undefined;
    if (planChanged || changes.length > 0) {
      log({
        actorId: actor?.id ?? "unknown",
        actorName: actor?.name ?? "Unknown",
        actorRole,
        workspaceId: ws.id,
        workspaceName: ws.name,
        kind: planChanged && changes.length === 0 ? "plan.change" : "entitlement.override",
        planFrom: ws.planId,
        planTo: selectedPlanId,
        changes,
      });
    }

    toast.success(t("firm.plan.saved"));
    onOpenChange(false);
  };

  const setValue = (fid: string, v: boolean | number | string) => setDraft((d) => ({ ...d, [fid]: v }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={lang === "ar" ? "left" : "right"} dir={dir} className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-xl">{t("firm.plan.title")}</SheetTitle>
          <SheetDescription>{ws?.name ?? ""} — {t("firm.plan.subtitle")}</SheetDescription>
        </SheetHeader>

        {ws && (
          <div className="mt-4 space-y-5">
            {/* Plan tier picker */}
            <div className="rounded-2xl border bg-slate-50 p-4">
              <Label className="text-xs uppercase tracking-wide text-slate-500">{t("firm.plan.tier")}</Label>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {plans.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedPlanId(p.id); setDraft({}); }}
                    className={cn(
                      "rounded-xl border-2 p-3 text-start transition-all",
                      selectedPlanId === p.id
                        ? "border-emerald-500 bg-white shadow-md"
                        : "border-transparent bg-white/60 hover:border-slate-200",
                    )}
                  >
                    <p className="font-display text-sm font-semibold">{p.name}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">€{p.price}/mo</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Feature groups by module */}
            {MODULES.map((mod) => {
              const modFeatures = FEATURES.filter((f) => f.module === mod.id);
              if (modFeatures.length === 0) return null;
              return (
                <div key={mod.id} className="rounded-2xl border bg-white">
                  <div className="flex items-center justify-between border-b bg-slate-50/60 px-4 py-2.5">
                    <p className="font-display text-sm font-semibold">{mod.label[lang]}</p>
                    <Badge variant="outline" className="text-[10px]">{modFeatures.length}</Badge>
                  </div>
                  <div className="divide-y">
                    {modFeatures.map((f) => {
                      const v = merged[f.id];
                      const overridden = draft[f.id] !== undefined && draft[f.id] !== planPreset[f.id];
                      return (
                        <div key={f.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">
                              {f.label[lang]}
                              {overridden && <span className="ms-2 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">{t("firm.plan.override")}</span>}
                            </p>
                            <p className="text-[11px] text-muted-foreground font-mono">{f.id}</p>
                          </div>
                          <div className="shrink-0">
                            {f.kind === "toggle" && (
                              <Switch checked={Boolean(v)} onCheckedChange={(nv) => setValue(f.id, nv)} />
                            )}
                            {f.kind === "quota" && (
                              <div className="flex items-center gap-1.5">
                                <Input type="number" value={Number(v ?? 0)} onChange={(e) => setValue(f.id, Number(e.target.value))} className="h-8 w-24 text-end font-mono text-sm" />
                                <span className="w-14 text-[10px] text-muted-foreground">{f.unit}</span>
                              </div>
                            )}
                            {f.kind === "select" && (
                              <Select value={String(v ?? "")} onValueChange={(nv) => setValue(f.id, nv)}>
                                <SelectTrigger className="h-8 w-40 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {f.options?.map((o) => <SelectItem key={o.value} value={o.value}>{o.label[lang]}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <SheetFooter className="mt-6 gap-2">
          <Button variant="outline" onClick={() => setDraft({})} className="gap-1.5">
            <RotateCcw className="size-4" />{t("firm.plan.resetOverrides")}
          </Button>
          <Button onClick={onSave} className="gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
            <Save className="size-4" />{t("common.save")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
