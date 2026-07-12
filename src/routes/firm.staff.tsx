import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { UserPlus, Mail, ShieldCheck, MoreVertical, Trash2, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n";
import { useFirm, type FirmStaff } from "@/lib/mock/firm";

export const Route = createFileRoute("/firm/staff")({ component: StaffPage });

function StaffPage() {
  const { t } = useI18n();
  const { staff, roles, clients, upsertStaff, deleteStaff, can } = useFirm();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FirmStaff | null>(null);

  const startNew = () => {
    setDraft({
      id: `s_${Date.now()}`, name: "", email: "", roleId: roles.find(r => !r.system)?.id ?? roles[0].id,
      status: "invited", clientIds: [], billableRate: 60, utilization: 0, avatarSeed: "?",
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t("firm.staff.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("firm.staff.subtitle")}</p>
        </div>
        {can("staff.manage") && (
          <Button onClick={startNew} className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md">
            <UserPlus className="me-1.5 size-4" />Invite teammate
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {staff.map((s) => {
          const role = roles.find(r => r.id === s.roleId)!;
          const assigned = clients.filter(c => s.clientIds.includes(c.id));
          return (
            <article key={s.id} className="rounded-2xl border border-glass-border bg-white p-5 shadow-sm">
              <header className="flex items-start gap-3">
                <Avatar className="size-11"><AvatarFallback className="bg-slate-900 text-white">{s.avatarSeed}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-base font-semibold">{s.name || "—"}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.email}</p>
                </div>
                {can("staff.manage") && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8"><MoreVertical className="size-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {s.status === "active" ? (
                        <DropdownMenuItem onClick={() => { upsertStaff({ ...s, status: "suspended" }); toast.success(`${s.name} suspended`); }}><Pause className="me-2 size-4" />Suspend</DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => { upsertStaff({ ...s, status: "active" }); toast.success(`${s.name} reactivated`); }}><Play className="me-2 size-4" />Reactivate</DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => toast.info(`Reminder sent to ${s.email}`)}><Mail className="me-2 size-4" />Send reminder</DropdownMenuItem>
                      <DropdownMenuItem className="text-rose-600" onClick={() => { deleteStaff(s.id); toast.success("Removed"); }}><Trash2 className="me-2 size-4" />Remove</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </header>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-lg"><ShieldCheck className="me-1 size-3" />{role.name}</Badge>
                <Badge variant="outline" className={`rounded-lg capitalize ${s.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : s.status === "invited" ? "border-sky-200 bg-sky-50 text-sky-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}>{s.status}</Badge>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Utilization</span><span className="font-medium tabular-nums">{s.utilization}%</span></div>
                <Progress value={s.utilization} className="h-1.5" />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-center">
                <div><p className="text-xs text-muted-foreground">Rate</p><p className="font-display text-lg font-semibold">€{s.billableRate}</p></div>
                <div><p className="text-xs text-muted-foreground">Clients</p><p className="font-display text-lg font-semibold">{assigned.length}</p></div>
              </div>

              {assigned.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {assigned.slice(0, 4).map(c => <Badge key={c.id} variant="secondary" className="rounded-lg text-[10px] font-normal">{c.name}</Badge>)}
                  {assigned.length > 4 && <Badge variant="secondary" className="rounded-lg text-[10px]">+{assigned.length - 4}</Badge>}
                </div>
              )}
            </article>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Invite teammate</DialogTitle></DialogHeader>
          {draft && (
            <div className="space-y-3">
              <div><Label>Full name</Label><Input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value, avatarSeed: e.target.value.split(" ").map(x => x[0]).join("").slice(0, 2).toUpperCase() || "?" })} /></div>
              <div><Label>Email</Label><Input type="email" value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })} /></div>
              <div>
                <Label>Role</Label>
                <Select value={draft.roleId} onValueChange={v => setDraft({ ...draft, roleId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Billable rate (€/h)</Label><Input type="number" value={draft.billableRate} onChange={e => setDraft({ ...draft, billableRate: Number(e.target.value) })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white" onClick={() => { if (draft) { upsertStaff(draft); toast.success("Invitation sent"); setOpen(false); } }}>Send invite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
