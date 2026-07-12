import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Shield, Plus, Trash2, Copy, Check, Search, Crown, Users, UserCog, Briefcase, User, UserPlus, CloudUpload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { listRoles, seedRolesCatalog } from "@/lib/roles.functions";

export const Route = createFileRoute("/super/roles")({ component: RolesPage });

type RoleId = "super_admin" | "firm_admin" | "accountant" | "client_owner" | "client_employee" | "client_team";
type Scope = "system" | "firm" | "accounting" | "client" | "hrm" | "finvoice" | "developer";
type ActionKey = "create" | "read" | "update" | "delete" | "approve" | "export";

interface Perm {
  id: string;
  scope: Scope;
  label: string;
  actions: ActionKey[];
}

interface Role {
  id: RoleId | string;
  name: string;
  arabic: string;
  color: string;
  icon: typeof Crown;
  system: boolean;
  users: number;
  desc: string;
  grants: Record<string, ActionKey[]>; // perm.id -> allowed actions
}

const PERMS: Perm[] = [
  { id: "sys.overview", scope: "system", label: "Platform overview dashboard", actions: ["read"] },
  { id: "sys.plans", scope: "system", label: "Plans & subscriptions", actions: ["create", "read", "update", "delete"] },
  { id: "sys.gateways", scope: "system", label: "Payment gateways", actions: ["read", "update"] },
  { id: "sys.settings", scope: "system", label: "System settings & API keys", actions: ["read", "update"] },
  { id: "sys.audit", scope: "system", label: "Audit log & system events", actions: ["read", "export"] },
  { id: "firm.dashboard", scope: "firm", label: "Firm dashboard", actions: ["read"] },
  { id: "firm.staff", scope: "firm", label: "Firm staff (hire/fire)", actions: ["create", "read", "update", "delete"] },
  { id: "firm.clients", scope: "firm", label: "Client companies", actions: ["create", "read", "update", "delete"] },
  { id: "firm.assign", scope: "firm", label: "Assign accountants to clients", actions: ["update"] },
  { id: "acc.queue", scope: "accounting", label: "OCR review queue", actions: ["read", "approve"] },
  { id: "acc.receipts", scope: "accounting", label: "Receipts & documents", actions: ["read", "update", "approve"] },
  { id: "acc.reports", scope: "accounting", label: "Financial reports", actions: ["read", "export"] },
  { id: "acc.export", scope: "accounting", label: "Excel / KATI export", actions: ["export"] },
  { id: "cli.upload", scope: "client", label: "Upload receipts (OCR)", actions: ["create"] },
  { id: "cli.expenses", scope: "client", label: "Expense history", actions: ["read"] },
  { id: "cli.chat", scope: "client", label: "AI accounting chat", actions: ["read", "create"] },
  { id: "cli.payroll", scope: "client", label: "Payroll slips", actions: ["read"] },
  { id: "cli.team", scope: "client", label: "Client team management", actions: ["create", "read", "update", "delete"] },
  { id: "hrm.employees", scope: "hrm", label: "Firm employees & payroll", actions: ["create", "read", "update", "delete"] },
  { id: "hrm.leave", scope: "hrm", label: "Leave requests", actions: ["create", "read", "approve"] },
  { id: "hrm.profile", scope: "hrm", label: "My own profile", actions: ["read", "update"] },
  { id: "fin.create", scope: "finvoice", label: "Create Finvoice", actions: ["create"] },
  { id: "fin.read", scope: "finvoice", label: "Read Finvoice", actions: ["read"] },
  { id: "fin.send", scope: "finvoice", label: "Send via PEPPOL", actions: ["create"] },
  { id: "dev.dashboard", scope: "developer", label: "Developer console", actions: ["read"] },
  { id: "dev.logs", scope: "developer", label: "System / audit logs", actions: ["read", "export"] },
  { id: "dev.queues", scope: "developer", label: "Queues & jobs", actions: ["read", "update"] },
];

const SCOPE_META: Record<Scope, { label: string; color: string }> = {
  system: { label: "System", color: "bg-violet-500" },
  firm: { label: "Firm", color: "bg-indigo-500" },
  accounting: { label: "Accounting", color: "bg-emerald-500" },
  client: { label: "Client", color: "bg-sky-500" },
  hrm: { label: "HRM & Payroll", color: "bg-amber-500" },
  finvoice: { label: "Finvoice", color: "bg-rose-500" },
  developer: { label: "Developer", color: "bg-slate-700" },
};

const SEED_ROLES: Role[] = [
  {
    id: "super_admin", name: "Super Admin", arabic: "المالك", color: "from-violet-600 to-fuchsia-600",
    icon: Crown, system: true, users: 3, desc: "Absolute control across the entire platform.",
    grants: Object.fromEntries(PERMS.map((p) => [p.id, [...p.actions]])),
  },
  {
    id: "firm_admin", name: "Firm Admin", arabic: "مدير المكتب", color: "from-indigo-600 to-blue-600",
    icon: Briefcase, system: true, users: 12, desc: "Runs an accounting firm workspace.",
    grants: {
      "firm.dashboard": ["read"], "firm.staff": ["create","read","update","delete"], "firm.clients": ["create","read","update","delete"],
      "firm.assign": ["update"], "acc.queue": ["read","approve"], "acc.receipts": ["read","update","approve"],
      "acc.reports": ["read","export"], "acc.export": ["export"], "hrm.employees": ["create","read","update","delete"],
      "hrm.leave": ["read","approve"], "hrm.profile": ["read","update"], "fin.create": ["create"], "fin.read": ["read"], "fin.send": ["create"],
    },
  },
  {
    id: "accountant", name: "Accountant", arabic: "محاسب", color: "from-emerald-600 to-teal-600",
    icon: UserCog, system: true, users: 48, desc: "Reviews receipts and manages assigned clients.",
    grants: {
      "acc.queue": ["read","approve"], "acc.receipts": ["read","update","approve"], "acc.reports": ["read","export"],
      "acc.export": ["export"], "hrm.profile": ["read","update"], "hrm.leave": ["create","read"],
      "fin.create": ["create"], "fin.read": ["read"], "fin.send": ["create"],
    },
  },
  {
    id: "client_owner", name: "Client Owner", arabic: "مالك شركة", color: "from-sky-600 to-cyan-600",
    icon: Users, system: true, users: 214, desc: "Owner of a client company using the PWA.",
    grants: {
      "cli.upload": ["create"], "cli.expenses": ["read"], "cli.chat": ["read","create"], "cli.payroll": ["read"],
      "cli.team": ["create","read","update","delete"], "hrm.profile": ["read","update"], "fin.read": ["read"],
    },
  },
  {
    id: "client_employee", name: "Client Employee", arabic: "موظف عميل", color: "from-amber-600 to-orange-600",
    icon: User, system: true, users: 987, desc: "Employee of a client company.",
    grants: {
      "cli.upload": ["create"], "cli.expenses": ["read"], "cli.chat": ["read","create"], "cli.payroll": ["read"],
      "hrm.profile": ["read","update"], "hrm.leave": ["create","read"],
    },
  },
  {
    id: "client_team", name: "Client Team Member", arabic: "عضو فريق العميل", color: "from-slate-500 to-slate-700",
    icon: UserPlus, system: true, users: 156, desc: "Additional client-side user with granular grants.",
    grants: {
      "cli.upload": ["create"], "cli.expenses": ["read"], "cli.chat": ["read","create"], "hrm.profile": ["read","update"],
    },
  },
];

function RolesPage() {
  const [roles, setRoles] = useState<Role[]>(SEED_ROLES);
  const [selectedId, setSelectedId] = useState<string>("super_admin");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const selected = roles.find((r) => r.id === selectedId)!;

  // Load persisted roles from DB and overlay grants onto the local seed catalog.
  const dbRoles = useQuery({ queryKey: ["super", "roles"], queryFn: () => listRoles(), staleTime: 60_000 });
  useEffect(() => {
    if (!dbRoles.data || dbRoles.data.length === 0) return;
    setRoles((rs) => rs.map((r) => {
      const match = dbRoles.data!.find((d) => d.name.toLowerCase() === r.name.toLowerCase());
      if (!match) return r;
      const grants: Record<string, ActionKey[]> = {};
      for (const key of match.permissionKeys) {
        // Permission key convention: "<permId>:<action>"
        const [permId, action] = key.split(":");
        if (!permId || !action) continue;
        (grants[permId] ||= []).push(action as ActionKey);
      }
      return Object.keys(grants).length > 0 ? { ...r, grants } : r;
    }));
  }, [dbRoles.data]);

  const syncMut = useMutation({
    mutationFn: () => {
      // Flatten every (permission, action) pair into a persisted key.
      const permissions = PERMS.flatMap((p) => p.actions.map((a) => ({
        key: `${p.id}:${a}`,
        module: p.scope,
        label: `${p.label} — ${a}`,
      })));
      const payload = {
        permissions,
        roles: roles.map((r) => ({
          name: r.name,
          description: r.desc,
          isSystem: r.system,
          permissionKeys: Object.entries(r.grants).flatMap(([permId, actions]) => actions.map((a) => `${permId}:${a}`)),
        })),
      };
      return seedRolesCatalog({ data: payload });
    },
    onSuccess: (res) => { toast.success(`Synced ${res.roles} roles and ${res.permissions} permissions to database.`); dbRoles.refetch(); },
    onError: (e: Error) => toast.error(e.message || "Sync failed"),
  });

  const filtered = useMemo(
    () => PERMS.filter((p) => !search || p.label.toLowerCase().includes(search.toLowerCase())),
    [search],
  );

  const toggle = (permId: string, action: ActionKey) => {
    if (selected.system && selected.id === "super_admin") {
      toast.error("Super Admin permissions cannot be reduced.");
      return;
    }
    setRoles((rs) => rs.map((r) => {
      if (r.id !== selectedId) return r;
      const cur = r.grants[permId] ?? [];
      const has = cur.includes(action);
      const next = has ? cur.filter((a) => a !== action) : [...cur, action];
      const grants = { ...r.grants };
      if (next.length === 0) delete grants[permId]; else grants[permId] = next;
      return { ...r, grants };
    }));
  };

  const toggleAllInScope = (scope: Scope, on: boolean) => {
    setRoles((rs) => rs.map((r) => {
      if (r.id !== selectedId) return r;
      const grants = { ...r.grants };
      PERMS.filter((p) => p.scope === scope).forEach((p) => {
        if (on) grants[p.id] = [...p.actions]; else delete grants[p.id];
      });
      return { ...r, grants };
    }));
    toast.success(`${on ? "Enabled" : "Cleared"} all ${SCOPE_META[scope].label} permissions.`);
  };

  const duplicate = (r: Role) => {
    const id = `custom_${Date.now()}`;
    setRoles((rs) => [...rs, { ...r, id, name: `${r.name} (Copy)`, arabic: `${r.arabic} (نسخة)`, system: false, users: 0 }]);
    setSelectedId(id);
    toast.success("Role duplicated.");
  };

  const create = () => {
    if (!newName.trim()) return;
    const id = `custom_${Date.now()}`;
    setRoles((rs) => [...rs, { id, name: newName, arabic: newName, color: "from-slate-500 to-slate-700", icon: Shield, system: false, users: 0, desc: "Custom role", grants: {} }]);
    setSelectedId(id);
    setNewName(""); setCreating(false);
    toast.success("Custom role created.");
  };

  const remove = (r: Role) => {
    if (r.system) { toast.error("System roles cannot be deleted."); return; }
    setRoles((rs) => rs.filter((x) => x.id !== r.id));
    setSelectedId("super_admin");
    toast.success("Role deleted.");
  };

  const totalGranted = Object.values(selected.grants).reduce((s, a) => s + a.length, 0);
  const totalPossible = PERMS.reduce((s, p) => s + p.actions.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Roles & Permissions</h1>
          <p className="mt-1 text-sm text-muted-foreground">Fine-grained control across 7 scopes and 6 actions. Custom roles supported.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => syncMut.mutate()} disabled={syncMut.isPending} className="gap-2">
            {syncMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <CloudUpload className="size-4" />} Sync to database
          </Button>
          <Button onClick={() => setCreating(true)} className="gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
            <Plus className="size-4" /> New role
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Role list */}
        <div className="space-y-2 rounded-2xl border border-glass-border bg-white/70 p-3 backdrop-blur">
          {roles.map((r) => {
            const Icon = r.icon;
            const active = r.id === selectedId;
            return (
              <button key={r.id} onClick={() => setSelectedId(r.id)}
                className={cn("w-full rounded-xl border p-3 text-start transition-all",
                  active ? "border-transparent bg-gradient-to-r shadow-lg " + r.color + " text-white" : "border-transparent bg-white hover:bg-slate-50")}>
                <div className="flex items-center gap-3">
                  <div className={cn("flex size-9 items-center justify-center rounded-lg",
                    active ? "bg-white/20" : "bg-gradient-to-br " + r.color + " text-white")}>
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-sm font-semibold", active && "text-white")}>{r.name}</p>
                    <p className={cn("truncate text-[11px]", active ? "text-white/80" : "text-muted-foreground")}>{r.arabic} · {r.users} users</p>
                  </div>
                  {r.system && <Badge variant="secondary" className={cn("text-[10px]", active && "bg-white/20 text-white")}>System</Badge>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail */}
        <div className="space-y-4 rounded-2xl border border-glass-border bg-white/70 p-6 backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-2xl font-semibold">{selected.name}</h2>
                {selected.system && <Badge variant="secondary">System role</Badge>}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{selected.desc}</p>
              <div className="mt-3 flex items-center gap-3 text-xs">
                <span className="rounded-full bg-slate-100 px-3 py-1 font-medium">{selected.users} users assigned</span>
                <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-700">{totalGranted}/{totalPossible} actions granted</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => duplicate(selected)} className="gap-2"><Copy className="size-4" /> Duplicate</Button>
              <Button variant="outline" size="sm" onClick={() => remove(selected)} disabled={selected.system} className="gap-2 text-red-600"><Trash2 className="size-4" /> Delete</Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute start-3 top-2.5 size-4 text-muted-foreground" />
              <Input placeholder="Search permissions…" value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
            </div>
          </div>

          <Tabs defaultValue="all">
            <TabsList className="flex-wrap">
              <TabsTrigger value="all">All</TabsTrigger>
              {(Object.keys(SCOPE_META) as Scope[]).map((s) => (
                <TabsTrigger key={s} value={s}>{SCOPE_META[s].label}</TabsTrigger>
              ))}
            </TabsList>

            {(["all", ...Object.keys(SCOPE_META)] as (Scope | "all")[]).map((tab) => {
              const rows = filtered.filter((p) => tab === "all" || p.scope === tab);
              const grouped = Object.entries(
                rows.reduce<Record<Scope, Perm[]>>((acc, p) => { (acc[p.scope] ||= []).push(p); return acc; }, {} as Record<Scope, Perm[]>),
              );
              return (
                <TabsContent key={tab} value={tab} className="space-y-4 pt-4">
                  {grouped.map(([scope, perms]) => (
                    <div key={scope} className="rounded-xl border">
                      <div className="flex items-center justify-between border-b bg-slate-50/50 px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className={cn("size-2 rounded-full", SCOPE_META[scope as Scope].color)} />
                          <span className="text-sm font-semibold">{SCOPE_META[scope as Scope].label}</span>
                          <Badge variant="secondary" className="text-[10px]">{perms.length}</Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => toggleAllInScope(scope as Scope, true)}>Enable all</Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => toggleAllInScope(scope as Scope, false)}>Clear</Button>
                        </div>
                      </div>
                      <div className="divide-y">
                        {perms.map((p) => {
                          const granted = selected.grants[p.id] ?? [];
                          return (
                            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium">{p.label}</p>
                                <p className="text-[11px] text-muted-foreground">{p.id}</p>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {p.actions.map((a) => {
                                  const on = granted.includes(a);
                                  return (
                                    <button key={a} onClick={() => toggle(p.id, a)}
                                      className={cn("flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-all",
                                        on ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50")}>
                                      {on && <Check className="size-3" />}
                                      {a}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create custom role</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <Label>Role name</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Regional Manager" />
            <p className="text-xs text-muted-foreground">You can start empty and grant permissions after creation, or duplicate an existing role.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
            <Button onClick={create} className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white">Create role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
