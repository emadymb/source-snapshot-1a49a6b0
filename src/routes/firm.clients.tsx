import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, Plus, Search, MoreVertical, Mail, Trash2, Pencil, PauseCircle, PlayCircle, ExternalLink, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n";
import { useFirm, type FirmClient } from "@/lib/mock/firm";
import { useEntitlements } from "@/lib/entitlements/store";
import { PlanEntitlementsDrawer } from "@/components/firm/PlanEntitlementsDrawer";

export const Route = createFileRoute("/firm/clients")({ component: ClientsPage });

const STATUS_STYLES: Record<FirmClient["status"], string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  onboarding: "bg-sky-50 text-sky-700 border-sky-200",
  paused: "bg-amber-50 text-amber-700 border-amber-200",
  churned: "bg-rose-50 text-rose-700 border-rose-200",
};

function ClientsPage() {
  const { t } = useI18n();
  const { clients, staff, upsertClient, deleteClient, can } = useFirm();
  const { workspaces, toggleWorkspaceStatus, setCurrentWorkspaceId, addWorkspace } = useEntitlements();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [editing, setEditing] = useState<FirmClient | null>(null);
  const [open, setOpen] = useState(false);
  const [planDrawerWs, setPlanDrawerWs] = useState<string | null>(null);

  const wsFor = (c: FirmClient) => workspaces.find((w) => w.name === c.name);
  const planIdFor = (planName: string) => planName.toLowerCase() as "starter" | "growth" | "scale" | "enterprise";
  const ensureWs = (c: FirmClient) => wsFor(c) ?? addWorkspace({ name: c.name, planId: planIdFor(c.plan), status: "active" });

  const filtered = clients.filter(c =>
    (status === "all" || c.status === status) &&
    (c.name.toLowerCase().includes(q.toLowerCase()) || c.contact.toLowerCase().includes(q.toLowerCase()))
  );

  const startNew = () => {
    setEditing({
      id: `c_${Date.now()}`, name: "", contact: "", email: "", vatId: "", industry: "Services",
      plan: "Starter", mrr: 290, status: "onboarding", openTasks: 0, overdue: 0,
      createdAt: new Date().toISOString().slice(0, 10), primaryStaffId: staff[0]?.id ?? "",
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t("firm.clients.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("firm.clients.subtitle")}</p>
        </div>
        {can("clients.manage") && (
          <Button onClick={startNew} className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md">
            <Plus className="me-1.5 size-4" />New client
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search clients…" className="rounded-xl ps-10" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="onboarding">Onboarding</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="churned">Churned</SelectItem>
          </SelectContent>
        </Select>
        <span className="ms-auto text-xs text-muted-foreground">{filtered.length} of {clients.length}</span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-glass-border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-start font-medium">Client</th>
              <th className="px-4 py-3 text-start font-medium">Plan</th>
              <th className="px-4 py-3 text-start font-medium">Lead</th>
              <th className="px-4 py-3 text-end font-medium">MRR</th>
              <th className="px-4 py-3 text-end font-medium">Open · Overdue</th>
              <th className="px-4 py-3 text-start font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((c) => {
              const lead = staff.find(s => s.id === c.primaryStaffId);
              return (
                <tr key={c.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white"><Building2 className="size-4" /></div>
                      <div>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.contact} · {c.industry}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge variant="outline" className="rounded-lg font-normal">{c.plan}</Badge></td>
                  <td className="px-4 py-3">
                    {lead && <div className="flex items-center gap-2"><Avatar className="size-6"><AvatarFallback className="bg-slate-900 text-[10px] text-white">{lead.avatarSeed}</AvatarFallback></Avatar><span className="text-xs">{lead.name}</span></div>}
                  </td>
                  <td className="px-4 py-3 text-end font-medium tabular-nums">€{c.mrr}</td>
                  <td className="px-4 py-3 text-end tabular-nums">
                    <span className="text-slate-700">{c.openTasks}</span>
                    <span className="mx-1 text-slate-300">·</span>
                    <span className={c.overdue > 0 ? "text-rose-600 font-medium" : "text-slate-400"}>{c.overdue}</span>
                  </td>
                  <td className="px-4 py-3"><Badge variant="outline" className={`rounded-lg font-normal capitalize ${STATUS_STYLES[c.status]}`}>{c.status}</Badge></td>
                  <td className="px-4 py-3 text-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8 rounded-lg"><MoreVertical className="size-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled={!can("clients.manage")} onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="me-2 size-4" />{t("common.edit")}</DropdownMenuItem>
                        <DropdownMenuItem disabled={!can("clients.manage")} onClick={() => { const ws = ensureWs(c); setPlanDrawerWs(ws.id); }}><SlidersHorizontal className="me-2 size-4" />{t("firm.clients.managePlan")}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast.info(`Email drafted to ${c.email}`)}><Mail className="me-2 size-4" />Email contact</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => {
                          let ws = wsFor(c);
                          if (!ws) ws = addWorkspace({ name: c.name, planId: planIdFor(c.plan), status: "active" });
                          setCurrentWorkspaceId(ws.id);
                          toast.success(`Opened ${c.name}`);
                          window.location.assign("/client");
                        }}><ExternalLink className="me-2 size-4" />{t("firm.clients.impersonate")}</DropdownMenuItem>
                        {(() => {
                          const ws = wsFor(c);
                          const suspended = ws?.status === "suspended";
                          return (
                            <DropdownMenuItem onClick={() => {
                              const target = ws ?? addWorkspace({ name: c.name, planId: planIdFor(c.plan), status: "active" });
                              toggleWorkspaceStatus(target.id);
                              toast.success(suspended ? "Activated" : "Suspended");
                            }}>
                              {suspended
                                ? <><PlayCircle className="me-2 size-4" />{t("firm.clients.activate")}</>
                                : <><PauseCircle className="me-2 size-4" />{t("firm.clients.suspend")}</>}
                            </DropdownMenuItem>
                          );
                        })()}
                        <DropdownMenuItem disabled={!can("clients.manage")} className="text-rose-600" onClick={() => { deleteClient(c.id); toast.success(`${c.name} removed`); }}><Trash2 className="me-2 size-4" />{t("common.delete")}</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing && clients.some(c => c.id === editing.id) ? "Edit client" : "New client"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Name</Label><Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>Contact</Label><Input value={editing.contact} onChange={e => setEditing({ ...editing, contact: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={editing.email} onChange={e => setEditing({ ...editing, email: e.target.value })} /></div>
              <div><Label>VAT ID</Label><Input value={editing.vatId} onChange={e => setEditing({ ...editing, vatId: e.target.value })} /></div>
              <div><Label>Industry</Label><Input value={editing.industry} onChange={e => setEditing({ ...editing, industry: e.target.value })} /></div>
              <div>
                <Label>Plan</Label>
                <Select value={editing.plan} onValueChange={(v: FirmClient["plan"]) => setEditing({ ...editing, plan: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Starter","Growth","Scale","Enterprise"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>MRR (€)</Label>
                <Input type="number" value={editing.mrr} onChange={e => setEditing({ ...editing, mrr: Number(e.target.value) })} />
              </div>
              <div className="col-span-2">
                <Label>Lead accountant</Label>
                <Select value={editing.primaryStaffId} onValueChange={(v) => setEditing({ ...editing, primaryStaffId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white" onClick={() => { if (editing) { upsertClient(editing); toast.success("Saved"); setOpen(false); } }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PlanEntitlementsDrawer
        workspaceId={planDrawerWs}
        open={!!planDrawerWs}
        onOpenChange={(v) => !v && setPlanDrawerWs(null)}
      />
    </div>
  );
}
