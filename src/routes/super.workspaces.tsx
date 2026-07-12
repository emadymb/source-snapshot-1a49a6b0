import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, MoreHorizontal, Trash2, Edit2, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n";
import {
  listWorkspaces,
  listPlans,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  setWorkspaceActive,
  type WorkspaceDTO,
  type PlanDTO,
} from "@/lib/saas.functions";

export const Route = createFileRoute("/super/workspaces")({ component: WorkspacesPage });

const STATUS_STYLES: Record<WorkspaceDTO["status"], string> = {
  active: "bg-emerald-500/15 text-emerald-700",
  trial: "bg-sky-500/15 text-sky-700",
  suspended: "bg-red-500/15 text-red-700",
};

interface WorkspaceDraft {
  id: string;
  name: string;
  owner: string;
  ownerEmail: string;
  planId: string;
  status: WorkspaceDTO["status"];
  country: string;
  companies: number;
}

const emptyWs = (): WorkspaceDraft => ({ id: "", name: "", owner: "", ownerEmail: "", planId: "", status: "trial", country: "FI", companies: 1 });
const fromDTO = (w: WorkspaceDTO): WorkspaceDraft => ({
  id: w.id, name: w.name, owner: w.owner, ownerEmail: w.ownerEmail,
  planId: w.planId, status: w.status, country: w.country, companies: w.companies,
});

function WorkspacesPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const listWsFn = useServerFn(listWorkspaces);
  const listPlansFn = useServerFn(listPlans);
  const createFn = useServerFn(createWorkspace);
  const updateFn = useServerFn(updateWorkspace);
  const deleteFn = useServerFn(deleteWorkspace);
  const toggleFn = useServerFn(setWorkspaceActive);

  const { data: workspaces = [], isLoading } = useQuery({ queryKey: ["saas", "workspaces"], queryFn: () => listWsFn() });
  const { data: plans = [] } = useQuery({ queryKey: ["saas", "plans"], queryFn: () => listPlansFn() });
  const refresh = () => qc.invalidateQueries({ queryKey: ["saas", "workspaces"] });

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | WorkspaceDTO["status"]>("all");
  const [editing, setEditing] = useState<WorkspaceDraft | null>(null);
  const [detail, setDetail] = useState<WorkspaceDTO | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => workspaces.filter((w) => {
    if (filter !== "all" && w.status !== filter) return false;
    if (q && !`${w.name} ${w.owner} ${w.ownerEmail}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [workspaces, q, filter]);

  const totalMrr = filtered.reduce((s, w) => s + w.mrr, 0);

  async function handleSave(d: WorkspaceDraft) {
    setSaving(true);
    try {
      if (d.id) {
        await updateFn({ data: { id: d.id, name: d.name, planId: d.planId || undefined, status: d.status, country: d.country } });
      } else {
        await createFn({ data: {
          name: d.name,
          ownerName: d.owner || d.name,
          ownerEmail: d.ownerEmail,
          planId: d.planId || undefined,
          status: d.status,
          country: d.country,
          companies: d.companies,
        }});
      }
      toast.success("Saved");
      setEditing(null);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try { await deleteFn({ data: { id } }); toast.success("Workspace removed"); refresh(); }
    catch { toast.error("Could not delete"); }
  }

  async function handleToggle(w: WorkspaceDTO) {
    try {
      await toggleFn({ data: { id: w.id, active: w.status === "suspended" } });
      toast.success(w.status === "suspended" ? "Reactivated" : "Suspended");
      refresh();
    } catch { toast.error("Failed"); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t("ws.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("ws.subtitle")}</p>
        </div>
        <Button onClick={() => setEditing(emptyWs())} className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md hover:opacity-95">
          <Plus className="me-2 size-4" />{t("ws.new")}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-glass-border bg-white p-3 shadow-sm">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("common.search")} className="rounded-lg border-slate-200 ps-10" />
        </div>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 text-xs">
          {(["all","active","trial","suspended"] as const).map((k) => (
            <button key={k} onClick={() => setFilter(k)} className={`rounded-md px-3 py-1.5 capitalize ${filter === k ? "bg-white shadow-sm font-medium" : "text-slate-600"}`}>{k}</button>
          ))}
        </div>
        <div className="ms-auto text-sm text-muted-foreground">
          {filtered.length} workspaces · <span className="font-semibold text-foreground">€{totalMrr.toLocaleString()}</span> MRR
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-glass-border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/50 text-start text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-start">{t("common.name")}</th>
                <th className="px-4 py-3 text-start">{t("ws.owner")}</th>
                <th className="px-4 py-3 text-start">{t("ws.plan")}</th>
                <th className="px-4 py-3 text-end">{t("ws.companies")}</th>
                <th className="px-4 py-3 text-end">{t("ws.mrr")}</th>
                <th className="px-4 py-3 text-start">{t("common.status")}</th>
                <th className="px-4 py-3 text-start">{t("ws.created")}</th>
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  <Loader2 className="me-2 inline size-4 animate-spin" />Loading workspaces…
                </td></tr>
              )}
              {!isLoading && filtered.map((w) => {
                const plan = plans.find((p) => p.id === w.planId);
                return (
                  <tr key={w.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <button onClick={() => setDetail(w)} className="flex items-center gap-3 text-start">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-semibold text-white">{w.name.slice(0,2).toUpperCase()}</div>
                        <div><p className="font-medium">{w.name}</p><p className="text-xs text-muted-foreground">{w.country} · {w.id.slice(0,8)}</p></div>
                      </button>
                    </td>
                    <td className="px-4 py-3"><p>{w.owner}</p><p className="text-xs text-muted-foreground">{w.ownerEmail}</p></td>
                    <td className="px-4 py-3"><span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">{plan?.name ?? "—"}</span></td>
                    <td className="px-4 py-3 text-end tabular-nums">{w.companies}</td>
                    <td className="px-4 py-3 text-end font-semibold tabular-nums">€{w.mrr}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[w.status]}`}>{w.status}</span></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{w.createdAt}</td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setDetail(w)}><Eye className="me-2 size-4" />View</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditing(fromDTO(w))}><Edit2 className="me-2 size-4" />{t("common.edit")}</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggle(w)}>{w.status === "suspended" ? "Activate" : "Suspend"}</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(w.id)}><Trash2 className="me-2 size-4" />{t("common.delete")}</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">No workspaces yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <Dialog open onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing.id ? `Edit ${editing.name}` : t("ws.new")}</DialogTitle></DialogHeader>
            <WorkspaceForm draft={editing} plans={plans} saving={saving} onSubmit={handleSave} onCancel={() => setEditing(null)} />
          </DialogContent>
        </Dialog>
      )}

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent side="right" className="w-[420px] sm:max-w-[420px]">
          {detail && <WorkspaceDetail w={detail} plans={plans} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function WorkspaceForm({ draft, plans, saving, onSubmit, onCancel }: { draft: WorkspaceDraft; plans: PlanDTO[]; saving: boolean; onSubmit: (w: WorkspaceDraft) => void; onCancel: () => void }) {
  const { t } = useI18n();
  const [d, setD] = useState<WorkspaceDraft>(draft);
  const isNew = !d.id;
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Field className="col-span-2" label={t("common.name")}><Input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></Field>
        <Field label={t("ws.owner")}><Input value={d.owner} onChange={(e) => setD({ ...d, owner: e.target.value })} disabled={!isNew} /></Field>
        <Field label="Email"><Input type="email" value={d.ownerEmail} onChange={(e) => setD({ ...d, ownerEmail: e.target.value })} disabled={!isNew} /></Field>
        <Field label={t("ws.plan")}>
          <Select value={d.planId} onValueChange={(v) => setD({ ...d, planId: v })}>
            <SelectTrigger><SelectValue placeholder="Select plan…" /></SelectTrigger>
            <SelectContent>{plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} · €{p.price}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label={t("common.status")}>
          <Select value={d.status} onValueChange={(v) => setD({ ...d, status: v as WorkspaceDTO["status"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="trial">Trial</SelectItem><SelectItem value="suspended">Suspended</SelectItem></SelectContent>
          </Select>
        </Field>
        <Field label="Country"><Input value={d.country} onChange={(e) => setD({ ...d, country: e.target.value.toUpperCase().slice(0, 2) })} /></Field>
      </div>
      <DialogFooter className="mt-4">
        <Button variant="outline" onClick={onCancel}>{t("common.cancel")}</Button>
        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => onSubmit(d)} disabled={saving || !d.name || (isNew && (!d.owner || !d.ownerEmail))}>
          {saving && <Loader2 className="me-2 size-4 animate-spin" />}{t("common.save")}
        </Button>
      </DialogFooter>
    </>
  );
}

function WorkspaceDetail({ w, plans }: { w: WorkspaceDTO; plans: PlanDTO[] }) {
  const plan = plans.find((p) => p.id === w.planId);
  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-semibold text-white">{w.name.slice(0,2).toUpperCase()}</div>
          <div><p>{w.name}</p><p className="text-xs font-normal text-muted-foreground">{w.id}</p></div>
        </SheetTitle>
      </SheetHeader>
      <div className="mt-6 space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Plan" value={plan?.name ?? "—"} />
          <Stat label="MRR" value={`€${w.mrr}`} />
          <Stat label="Companies" value={String(w.companies)} />
          <Stat label="Status" value={w.status} />
        </div>
        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Owner</p>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm">
            <p className="font-medium">{w.owner}</p><p className="text-muted-foreground">{w.ownerEmail}</p>
          </div>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-lg font-semibold capitalize">{value}</p>
    </div>
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