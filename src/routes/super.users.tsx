import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, UserPlus, MoreHorizontal, Shield, Mail, Ban, KeyRound, Trash2, Download, Filter } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/super/users")({ component: UsersPage });

type Role = "Super Admin" | "Firm Admin" | "Accountant" | "Client Owner" | "Client Employee" | "Client Team";
type Status = "active" | "invited" | "disabled" | "locked";

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  workspace: string;
  status: Status;
  twoFA: boolean;
  lastActive: string;
  createdAt: string;
  country: string;
  avatarColor: string;
}

const ROLE_STYLE: Record<Role, string> = {
  "Super Admin": "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white",
  "Firm Admin": "bg-indigo-100 text-indigo-700",
  "Accountant": "bg-emerald-100 text-emerald-700",
  "Client Owner": "bg-sky-100 text-sky-700",
  "Client Employee": "bg-amber-100 text-amber-700",
  "Client Team": "bg-slate-100 text-slate-700",
};

const STATUS_STYLE: Record<Status, string> = {
  active: "bg-emerald-500/15 text-emerald-700",
  invited: "bg-sky-500/15 text-sky-700",
  disabled: "bg-slate-500/15 text-slate-700",
  locked: "bg-red-500/15 text-red-700",
};

const AVATAR_COLORS = ["bg-indigo-500", "bg-emerald-500", "bg-amber-500", "bg-sky-500", "bg-rose-500", "bg-violet-500", "bg-teal-500", "bg-orange-500"];

const SEED: User[] = [
  { id: "u1", name: "Erik Lindqvist", email: "erik@lindqvist.fi", role: "Firm Admin", workspace: "Lindqvist Oy", status: "active", twoFA: true, lastActive: "3 min ago", createdAt: "2024-03-12", country: "FI", avatarColor: "bg-indigo-500" },
  { id: "u2", name: "Mikael Salo", email: "mikael@kryhma.fi", role: "Firm Admin", workspace: "K-Ryhmä Retail", status: "active", twoFA: true, lastActive: "1h ago", createdAt: "2023-11-04", country: "FI", avatarColor: "bg-emerald-500" },
  { id: "u3", name: "Sara Koski", email: "sara@aalto.design", role: "Accountant", workspace: "Lindqvist Oy", status: "active", twoFA: false, lastActive: "22 min ago", createdAt: "2024-05-14", country: "FI", avatarColor: "bg-amber-500" },
  { id: "u4", name: "Antti Virta", email: "antti@vk.fi", role: "Client Owner", workspace: "Verkkokauppa Oy", status: "active", twoFA: true, lastActive: "Yesterday", createdAt: "2024-08-19", country: "FI", avatarColor: "bg-sky-500" },
  { id: "u5", name: "Riikka Peltola", email: "riikka@nordea-c.fi", role: "Client Owner", workspace: "Nordea Consulting", status: "invited", twoFA: false, lastActive: "Never", createdAt: "2025-02-14", country: "FI", avatarColor: "bg-rose-500" },
  { id: "u6", name: "Ossi Laine", email: "ossi@regatta.fi", role: "Client Employee", workspace: "Café Regatta", status: "active", twoFA: false, lastActive: "5 min ago", createdAt: "2024-06-08", country: "FI", avatarColor: "bg-violet-500" },
  { id: "u7", name: "Astrid Berg", email: "astrid@malmoab.se", role: "Firm Admin", workspace: "Malmö AB", status: "active", twoFA: true, lastActive: "2h ago", createdAt: "2023-05-30", country: "SE", avatarColor: "bg-teal-500" },
  { id: "u8", name: "Kaisa Tamm", email: "kaisa@tld.ee", role: "Client Owner", workspace: "Tallinn Digital", status: "locked", twoFA: false, lastActive: "3 days ago", createdAt: "2025-02-01", country: "EE", avatarColor: "bg-orange-500" },
  { id: "u9", name: "Ville Aho", email: "ville@hbakery.fi", role: "Accountant", workspace: "K-Ryhmä Retail", status: "active", twoFA: true, lastActive: "12 min ago", createdAt: "2024-09-01", country: "FI", avatarColor: "bg-indigo-500" },
  { id: "u10", name: "Elina Peltola", email: "elina@turkustudios.fi", role: "Client Team", workspace: "Verkkokauppa Oy", status: "active", twoFA: false, lastActive: "6h ago", createdAt: "2025-01-20", country: "FI", avatarColor: "bg-emerald-500" },
  { id: "u11", name: "Jari Mäki", email: "jari@oulutech.fi", role: "Client Employee", workspace: "K-Ryhmä Retail", status: "disabled", twoFA: false, lastActive: "45 days ago", createdAt: "2024-02-11", country: "FI", avatarColor: "bg-amber-500" },
  { id: "u12", name: "Hanna Nieminen", email: "hanna@espoo-adv.fi", role: "Super Admin", workspace: "Platform HQ", status: "active", twoFA: true, lastActive: "Active now", createdAt: "2023-01-05", country: "FI", avatarColor: "bg-violet-500" },
];

const ROLES: Role[] = ["Super Admin", "Firm Admin", "Accountant", "Client Owner", "Client Employee", "Client Team"];

function UsersPage() {
  const [users, setUsers] = useState<User[]>(SEED);
  const [q, setQ] = useState("");
  const [roleF, setRoleF] = useState<string>("all");
  const [statusF, setStatusF] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [inviting, setInviting] = useState(false);
  const [invEmail, setInvEmail] = useState("");
  const [invRole, setInvRole] = useState<Role>("Client Owner");
  const [invWorkspace, setInvWorkspace] = useState("Lindqvist Oy");

  const rows = useMemo(() => users.filter((u) =>
    (!q || `${u.name} ${u.email} ${u.workspace}`.toLowerCase().includes(q.toLowerCase())) &&
    (roleF === "all" || u.role === roleF) &&
    (statusF === "all" || u.status === statusF),
  ), [users, q, roleF, statusF]);

  const toggleAll = () => setSelected(selected.size === rows.length ? new Set() : new Set(rows.map((r) => r.id)));
  const toggleOne = (id: string) => {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelected(s);
  };

  const bulk = (fn: (u: User) => User, msg: string) => {
    setUsers((us) => us.map((u) => selected.has(u.id) ? fn(u) : u));
    setSelected(new Set());
    toast.success(msg);
  };

  const invite = () => {
    if (!invEmail) return;
    const u: User = {
      id: `u_${Date.now()}`, name: invEmail.split("@")[0], email: invEmail, role: invRole,
      workspace: invWorkspace, status: "invited", twoFA: false, lastActive: "Never",
      createdAt: new Date().toISOString().slice(0, 10), country: "FI",
      avatarColor: AVATAR_COLORS[users.length % AVATAR_COLORS.length],
    };
    setUsers((us) => [u, ...us]);
    setInvEmail(""); setInviting(false);
    toast.success(`Invitation sent to ${invEmail}`);
  };

  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === "active").length,
    invited: users.filter((u) => u.status === "invited").length,
    locked: users.filter((u) => u.status === "locked").length,
    twoFA: Math.round((users.filter((u) => u.twoFA).length / users.length) * 100),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">All Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">Every human across every workspace on the platform.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2"><Download className="size-4" /> Export CSV</Button>
          <Button onClick={() => setInviting(true)} className="gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
            <UserPlus className="size-4" /> Invite user
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {[
          { label: "Total users", value: stats.total, sub: "across 8 workspaces" },
          { label: "Active", value: stats.active, sub: `${Math.round(stats.active/stats.total*100)}%`, tint: "emerald" },
          { label: "Pending invites", value: stats.invited, sub: "awaiting acceptance", tint: "sky" },
          { label: "Locked", value: stats.locked, sub: "attention needed", tint: "red" },
          { label: "2FA coverage", value: `${stats.twoFA}%`, sub: "target: 90%", tint: "violet" },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-glass-border bg-white/70 p-4 backdrop-blur">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="mt-1 font-display text-2xl font-semibold">{k.value}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="rounded-2xl border border-glass-border bg-white/70 p-4 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute start-3 top-2.5 size-4 text-muted-foreground" />
            <Input placeholder="Search name, email, workspace…" value={q} onChange={(e) => setQ(e.target.value)} className="ps-9" />
          </div>
          <Select value={roleF} onValueChange={setRoleF}>
            <SelectTrigger className="w-48"><Filter className="me-2 size-3.5" /><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusF} onValueChange={setStatusF}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="invited">Invited</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
              <SelectItem value="locked">Locked</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selected.size > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-indigo-50 p-3 text-sm">
            <span className="font-medium text-indigo-900">{selected.size} selected</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => bulk((u) => ({ ...u, status: "active" }), "Users activated.")}>Activate</Button>
              <Button size="sm" variant="outline" onClick={() => bulk((u) => ({ ...u, status: "disabled" }), "Users disabled.")}>Disable</Button>
              <Button size="sm" variant="outline" onClick={() => bulk((u) => ({ ...u, twoFA: true }), "2FA enforced.")}>Enforce 2FA</Button>
              <Button size="sm" variant="outline" onClick={() => { toast.success(`Password reset emailed to ${selected.size} users.`); setSelected(new Set()); }}>Reset password</Button>
              <Button size="sm" variant="destructive" onClick={() => { setUsers((us) => us.filter((u) => !selected.has(u.id))); setSelected(new Set()); toast.success("Users deleted."); }}>Delete</Button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-glass-border bg-white/70 backdrop-blur">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/70 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="w-10 px-4 py-3"><Checkbox checked={selected.size === rows.length && rows.length > 0} onCheckedChange={toggleAll} /></th>
                <th className="px-4 py-3 text-start">User</th>
                <th className="px-4 py-3 text-start">Role</th>
                <th className="px-4 py-3 text-start">Workspace</th>
                <th className="px-4 py-3 text-start">Status</th>
                <th className="px-4 py-3 text-start">2FA</th>
                <th className="px-4 py-3 text-start">Last active</th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-slate-50/50">
                  <td className="px-4 py-3"><Checkbox checked={selected.has(u.id)} onCheckedChange={() => toggleOne(u.id)} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9">
                        <AvatarFallback className={cn(u.avatarColor, "text-white text-xs font-semibold")}>
                          {u.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", ROLE_STYLE[u.role])}>{u.role}</span></td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{u.workspace}</p>
                    <p className="text-[11px] text-muted-foreground">{u.country}</p>
                  </td>
                  <td className="px-4 py-3"><span className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium capitalize", STATUS_STYLE[u.status])}>{u.status}</span></td>
                  <td className="px-4 py-3">
                    {u.twoFA
                      ? <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">Enabled</Badge>
                      : <Badge variant="secondary" className="text-muted-foreground">Off</Badge>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.lastActive}</td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button size="sm" variant="ghost" className="size-8 p-0"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toast.success("Impersonating " + u.name)}><Shield className="me-2 size-4" /> Impersonate</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast.success("Password reset sent")}><KeyRound className="me-2 size-4" /> Reset password</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast.success("Magic link emailed")}><Mail className="me-2 size-4" /> Send magic link</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setUsers((us) => us.map((x) => x.id === u.id ? { ...x, status: x.status === "disabled" ? "active" : "disabled" } : x))}>
                          <Ban className="me-2 size-4" /> {u.status === "disabled" ? "Reactivate" : "Disable"}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => { setUsers((us) => us.filter((x) => x.id !== u.id)); toast.success("User deleted."); }}>
                          <Trash2 className="me-2 size-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-sm text-muted-foreground">No users match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
          <span>Showing {rows.length} of {users.length}</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" disabled>Previous</Button>
            <Button variant="ghost" size="sm" disabled>Next</Button>
          </div>
        </div>
      </div>

      <Dialog open={inviting} onOpenChange={setInviting}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invite a user</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="name@company.fi" value={invEmail} onChange={(e) => setInvEmail(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={invRole} onValueChange={(v) => setInvRole(v as Role)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Workspace</Label>
                <Select value={invWorkspace} onValueChange={setInvWorkspace}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Lindqvist Oy", "K-Ryhmä Retail", "Verkkokauppa Oy", "Malmö AB", "Café Regatta"].map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">The user will receive an email with a magic link to accept the invitation.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviting(false)}>Cancel</Button>
            <Button onClick={invite} className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white">Send invitation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
