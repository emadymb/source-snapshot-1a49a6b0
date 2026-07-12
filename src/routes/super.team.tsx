import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { UserPlus, Shield, Mail, MoreHorizontal, Trash2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/super/team")({ component: TeamPage });

type Role = "owner" | "admin" | "support" | "billing" | "readonly";

interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  twoFA: boolean;
  lastActive: string;
  status: "active" | "invited" | "disabled";
}

const roleMeta: Record<Role, { label: string; color: string; perms: string[] }> = {
  owner: { label: "Owner", color: "bg-gradient-to-r from-indigo-600 to-violet-600 text-white", perms: ["Full access", "Billing", "Delete workspaces"] },
  admin: { label: "Admin", color: "bg-indigo-500/15 text-indigo-700", perms: ["Manage plans", "Manage workspaces", "View reports"] },
  support: { label: "Support", color: "bg-emerald-500/15 text-emerald-700", perms: ["Impersonate (read)", "Handle requests"] },
  billing: { label: "Billing", color: "bg-amber-500/15 text-amber-700", perms: ["Invoices", "Gateways", "Refunds"] },
  readonly: { label: "Read-only", color: "bg-slate-500/15 text-slate-700", perms: ["View only"] },
};

const SEED: Member[] = [
  { id: "u1", name: "Erik Owner", email: "owner@fiksu.fi", role: "owner", twoFA: true, lastActive: "2m ago", status: "active" },
  { id: "u2", name: "Sara Admin", email: "sara@fiksu.fi", role: "admin", twoFA: true, lastActive: "1h ago", status: "active" },
  { id: "u3", name: "Ana Support", email: "ana@fiksu.fi", role: "support", twoFA: true, lastActive: "3h ago", status: "active" },
  { id: "u4", name: "Petri Billing", email: "petri@fiksu.fi", role: "billing", twoFA: false, lastActive: "Yesterday", status: "active" },
  { id: "u5", name: "Liisa Ranta", email: "liisa@fiksu.fi", role: "readonly", twoFA: true, lastActive: "3 days ago", status: "active" },
  { id: "u6", name: "New hire", email: "hire@fiksu.fi", role: "support", twoFA: false, lastActive: "—", status: "invited" },
];

function TeamPage() {
  const { t } = useI18n();
  const [members, setMembers] = useState<Member[]>(SEED);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "support" as Role });

  const invite = () => {
    if (!form.name || !form.email) return toast.error("Name and email are required");
    setMembers((m) => [...m, { id: `u${Date.now()}`, name: form.name, email: form.email, role: form.role, twoFA: false, lastActive: "—", status: "invited" }]);
    toast.success(`Invitation sent to ${form.email}`);
    setForm({ name: "", email: "", role: "support" });
    setOpen(false);
  };

  const setRole = (id: string, role: Role) => {
    setMembers((m) => m.map((x) => (x.id === id ? { ...x, role } : x)));
    toast.success(`Role updated to ${roleMeta[role].label}`);
  };

  const remove = (id: string) => {
    setMembers((m) => m.filter((x) => x.id !== id));
    toast("Member removed");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t("nav.team")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">People with access to the Fiksu Super Admin console.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md"><UserPlus className="me-1.5 size-4" />Invite member</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Invite team member</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div><Label>Full name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" className="mt-1.5" /></div>
              <div><Label>Work email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@fiksu.fi" className="mt-1.5" /></div>
              <div>
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.keys(roleMeta) as Role[]).filter((r) => r !== "owner").map((r) => <SelectItem key={r} value={r}>{roleMeta[r].label}</SelectItem>)}</SelectContent>
                </Select>
                <p className="mt-2 text-xs text-muted-foreground">Grants: {roleMeta[form.role].perms.join(" · ")}</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
              <Button onClick={invite} className="bg-indigo-600 text-white hover:bg-indigo-700">Send invite</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr,320px]">
        <div className="overflow-hidden rounded-2xl border border-glass-border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-start">Member</th>
                <th className="px-4 py-3 text-start">Role</th>
                <th className="px-4 py-3 text-start">2FA</th>
                <th className="px-4 py-3 text-start">Last active</th>
                <th className="px-4 py-3 text-start">{t("common.status")}</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9"><AvatarFallback className="bg-slate-900 text-xs text-white">{m.name.split(" ").map((w) => w[0]).slice(0,2).join("")}</AvatarFallback></Avatar>
                      <div><p className="font-medium">{m.name}</p><p className="text-xs text-muted-foreground">{m.email}</p></div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {m.role === "owner" ? (
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleMeta.owner.color}`}>Owner</span>
                    ) : (
                      <Select value={m.role} onValueChange={(v) => setRole(m.id, v as Role)}>
                        <SelectTrigger className="h-8 w-32 rounded-md text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{(Object.keys(roleMeta) as Role[]).filter((r) => r !== "owner").map((r) => <SelectItem key={r} value={r}>{roleMeta[r].label}</SelectItem>)}</SelectContent>
                      </Select>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Switch checked={m.twoFA} onCheckedChange={(v) => setMembers((prev) => prev.map((x) => x.id === m.id ? { ...x, twoFA: v } : x))} />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{m.lastActive}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${m.status === "active" ? "bg-emerald-500/15 text-emerald-700" : m.status === "invited" ? "bg-sky-500/15 text-sky-700" : "bg-slate-500/15 text-slate-700"}`}>{m.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="size-8"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toast.success("Password reset email sent")}><Mail className="me-2 size-4" />Send reset</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast.success("2FA reset")}><KeyRound className="me-2 size-4" />Reset 2FA</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => remove(m.id)} className="text-red-600 focus:text-red-700" disabled={m.role === "owner"}><Trash2 className="me-2 size-4" />Remove</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-glass-border bg-white p-5 shadow-sm">
            <h3 className="flex items-center gap-2 font-display text-lg font-semibold"><Shield className="size-4 text-indigo-600" />Role permissions</h3>
            <ul className="mt-3 space-y-3 text-sm">
              {(Object.keys(roleMeta) as Role[]).map((r) => (
                <li key={r} className="rounded-xl border border-slate-100 p-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${roleMeta[r].color}`}>{roleMeta[r].label}</span>
                  <ul className="mt-2 space-y-1 text-xs text-slate-600">
                    {roleMeta[r].perms.map((p) => <li key={p}>· {p}</li>)}
                  </ul>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
