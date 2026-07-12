import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Lock, Trash2, ShieldCheck, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { useFirm, ALL_PERMISSIONS, type FirmPermission, type FirmRole } from "@/lib/mock/firm";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/firm/roles")({ component: RolesPage });

const PERM_GROUPS: { label: string; perms: FirmPermission[] }[] = [
  { label: "Clients", perms: ["clients.view", "clients.manage"] },
  { label: "Engagements", perms: ["engagements.view", "engagements.manage"] },
  { label: "Tasks", perms: ["tasks.view", "tasks.assign", "tasks.complete"] },
  { label: "Invoices", perms: ["invoices.view", "invoices.issue"] },
  { label: "Reports", perms: ["reports.view"] },
  { label: "Administration", perms: ["staff.manage", "roles.manage", "settings.manage"] },
];

const PERM_LABEL: Record<FirmPermission, string> = {
  "clients.view": "View clients",
  "clients.manage": "Create / edit / delete clients",
  "engagements.view": "View engagements",
  "engagements.manage": "Create / edit engagements",
  "tasks.view": "View tasks",
  "tasks.assign": "Assign tasks",
  "tasks.complete": "Complete tasks",
  "invoices.view": "View invoices",
  "invoices.issue": "Issue invoices",
  "reports.view": "View reports",
  "staff.manage": "Manage staff",
  "roles.manage": "Manage roles",
  "settings.manage": "Change firm settings",
};

function RolesPage() {
  const { t } = useI18n();
  const { roles, staff, togglePermission, upsertRole, deleteRole, can } = useFirm();
  const [selected, setSelected] = useState<string>(roles[0].id);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ name: string; description: string; color: string }>({ name: "", description: "", color: "sky" });

  const role = roles.find(r => r.id === selected) ?? roles[0];
  const staffCount = staff.filter(s => s.roleId === role.id).length;
  const readOnly = !can("roles.manage") || role.system;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t("firm.roles.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("firm.roles.subtitle")}</p>
        </div>
        {can("roles.manage") && (
          <Button onClick={() => setOpen(true)} className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md">
            <Plus className="me-1.5 size-4" />New role
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-2">
          {roles.map(r => {
            const count = staff.filter(s => s.roleId === r.id).length;
            const active = r.id === selected;
            return (
              <button key={r.id} onClick={() => setSelected(r.id)} className={cn(
                "flex w-full items-start gap-3 rounded-2xl border p-3 text-start transition",
                active ? "border-emerald-500 bg-emerald-50/40 shadow-sm" : "border-glass-border bg-white hover:border-slate-300"
              )}>
                <div className={cn("mt-0.5 flex size-9 items-center justify-center rounded-xl text-white",
                  r.color === "violet" && "bg-violet-600",
                  r.color === "indigo" && "bg-indigo-600",
                  r.color === "emerald" && "bg-emerald-600",
                  r.color === "sky" && "bg-sky-600",
                  r.color === "amber" && "bg-amber-600",
                )}><ShieldCheck className="size-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-semibold">{r.name}</p>
                    {r.system && <Lock className="size-3 text-slate-400" />}
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{r.description}</p>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{count} {count === 1 ? "seat" : "seats"}</span>
                    <span>·</span>
                    <span>{r.permissions.length} perms</span>
                  </div>
                </div>
              </button>
            );
          })}
        </aside>

        <section className="rounded-2xl border border-glass-border bg-white p-6 shadow-sm">
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl font-semibold">{role.name}</h2>
                {role.system && <Badge variant="outline" className="rounded-lg"><Lock className="me-1 size-3" />System</Badge>}
                <Badge variant="secondary" className="rounded-lg">{staffCount} assigned</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{role.description}</p>
            </div>
            {!role.system && can("roles.manage") && (
              <Button variant="outline" size="sm" className="rounded-xl text-rose-600" onClick={() => { deleteRole(role.id); setSelected(roles[0].id); toast.success("Role removed"); }}>
                <Trash2 className="me-1.5 size-3.5" />Delete role
              </Button>
            )}
          </header>

          <div className="mt-5 space-y-5">
            {PERM_GROUPS.map(group => (
              <div key={group.label}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{group.label}</p>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {group.perms.map(perm => {
                    const has = role.permissions.includes(perm);
                    return (
                      <label key={perm} className={cn(
                        "flex items-center gap-3 rounded-xl border p-3 transition",
                        has ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200 bg-white",
                        readOnly && "opacity-70"
                      )}>
                        <Checkbox checked={has} disabled={readOnly} onCheckedChange={() => togglePermission(role.id, perm)} />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{PERM_LABEL[perm]}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">{perm}</p>
                        </div>
                        {has && <Check className="size-4 text-emerald-600" />}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {role.system && (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <Lock className="me-1.5 inline size-3" />
              System roles cannot be edited — clone this role to customize its permissions.
            </div>
          )}
        </section>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New role</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Payroll Specialist" /></div>
            <div><Label>Description</Label><Input value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></div>
            <div>
              <Label>Color</Label>
              <div className="mt-1.5 flex gap-2">
                {["violet","indigo","emerald","sky","amber"].map(c => (
                  <button key={c} onClick={() => setDraft({ ...draft, color: c })} className={cn(
                    "size-8 rounded-lg border-2 transition",
                    c === "violet" && "bg-violet-500",
                    c === "indigo" && "bg-indigo-500",
                    c === "emerald" && "bg-emerald-500",
                    c === "sky" && "bg-sky-500",
                    c === "amber" && "bg-amber-500",
                    draft.color === c ? "border-slate-900 scale-110" : "border-transparent"
                  )} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white" onClick={() => {
              if (!draft.name) return;
              const id = `r_${Date.now()}`;
              upsertRole({ id, name: draft.name, description: draft.description || "Custom role", color: draft.color, permissions: ["clients.view","tasks.view"], system: false });
              setSelected(id); setOpen(false); setDraft({ name: "", description: "", color: "sky" });
              toast.success("Role created");
            }}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
