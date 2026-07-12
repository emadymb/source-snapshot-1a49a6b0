import { useMemo, useState } from "react";
import { Plus, Trash2, Pencil, BookOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { PageHeading } from "@/components/PagePlaceholder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataToolbar, StatusPill } from "./DataToolbar";
import { fmt } from "@/lib/mock/store";
import {
  listAccounts, upsertAccount, deleteAccount, financialReports,
  type AccountDTO,
} from "@/lib/accounting.functions";

type UiType = AccountDTO["type"];
const TYPES: UiType[] = ["asset", "liability", "equity", "income", "expense"];
const COLORS = ["oklch(0.58 0.2 264)", "oklch(0.66 0.17 230)", "oklch(0.65 0.18 150)", "oklch(0.78 0.17 80)", "oklch(0.62 0.22 20)"];

interface Draft { id?: string; code: string; name: string; type: UiType; parentId: string | null }
const emptyDraft = (): Draft => ({ code: "", name: "", type: "asset", parentId: null });

export function ChartOfAccountsScreen() {
  const qc = useQueryClient();
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["accounting", "accounts"],
    queryFn: () => listAccounts(),
    staleTime: 30_000,
  });
  const { data: reports } = useQuery({
    queryKey: ["accounting", "reports"],
    queryFn: () => financialReports(),
    staleTime: 30_000,
  });
  const balanceOf = (accountId: string) => reports?.trialBalance.find((r) => r.accountId === accountId)?.balance ?? 0;

  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<UiType | "all">("all");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());

  const filtered = useMemo(() => accounts.filter((a) => {
    if (typeFilter !== "all" && a.type !== typeFilter) return false;
    if (!q) return true;
    return a.name.toLowerCase().includes(q.toLowerCase()) || a.code.includes(q);
  }), [accounts, q, typeFilter]);

  const byType = useMemo(() => TYPES.map((t) => ({
    name: t,
    value: accounts.filter((a) => a.type === t).reduce((s, a) => s + Math.abs(balanceOf(a.id)), 0),
  })).filter((r) => r.value > 0), [accounts, reports]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["accounting", "accounts"] });
    qc.invalidateQueries({ queryKey: ["accounting", "reports"] });
    qc.invalidateQueries({ queryKey: ["accounting", "journals"] });
  };

  const saveMut = useMutation({
    mutationFn: (d: Draft) => upsertAccount({
      data: { id: d.id, code: d.code, name: d.name, type: d.type, parentId: d.parentId ?? null },
    }),
    onSuccess: () => { toast.success(draft.id ? "Account updated" : "Account created"); setOpen(false); invalidate(); },
    onError: (e: Error) => toast.error(e.message || "Failed to save account"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteAccount({ data: { id } }),
    onSuccess: () => { toast("Account removed"); invalidate(); },
    onError: (e: Error) => toast.error(e.message || "Failed to delete"),
  });

  const save = () => {
    if (!draft.code || !draft.name) return toast.error("Code and name are required");
    saveMut.mutate(draft);
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeading title="Chart of Accounts" description="General ledger structure." icon={BookOpen}
        actions={<Button className="rounded-xl bg-gradient-primary text-primary-foreground shadow-[var(--shadow-glow)]" onClick={() => { setDraft(emptyDraft()); setOpen(true); }}><Plus className="me-1.5 size-4" /> New account</Button>} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass rounded-2xl border-glass-border p-6 lg:col-span-2">
          <h2 className="mb-3 font-display text-lg font-semibold">Balance by type</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byType} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt.format(v)} contentStyle={{ borderRadius: 12, border: "1px solid var(--glass-border)" }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass rounded-2xl border-glass-border p-6">
          <h2 className="mb-3 font-display text-lg font-semibold">Totals</h2>
          <ul className="space-y-2 text-sm">
            {TYPES.map((t) => {
              const sum = accounts.filter((a) => a.type === t).reduce((s, a) => s + balanceOf(a.id), 0);
              return (
                <li key={t} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
                  <span className="capitalize">{t}</span>
                  <span className="font-medium">{fmt.format(sum)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="mt-4 glass rounded-2xl border-glass-border p-6">
        <DataToolbar value={q} onChange={setQ} placeholder="Search by code or name…">
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as UiType | "all")}>
            <SelectTrigger className="h-10 w-[160px] rounded-xl border-glass-border bg-glass"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </DataToolbar>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-glass-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Code</th>
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Type</th>
                <th className="py-2 pr-4 text-right font-medium">Balance</th>
                <th className="py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground"><Loader2 className="mx-auto size-4 animate-spin" /></td></tr>}
              {!isLoading && filtered.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No accounts yet.</td></tr>}
              {filtered.slice().sort((a, b) => a.code.localeCompare(b.code)).map((a) => (
                <tr key={a.id} className="border-b border-glass-border/60 last:border-0 hover:bg-secondary/40">
                  <td className="py-3 pr-4 font-mono text-xs">{a.code}</td>
                  <td className="py-3 pr-4 font-medium">{a.name}</td>
                  <td className="py-3 pr-4"><StatusPill tone="muted">{a.type}</StatusPill></td>
                  <td className="py-3 pr-4 text-right font-medium">{fmt.format(balanceOf(a.id))}</td>
                  <td className="py-3">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="size-8" onClick={() => { setDraft({ id: a.id, code: a.code, name: a.name, type: a.type, parentId: a.parentId ?? null }); setOpen(true); }}><Pencil className="size-4" /></Button>
                      <Button size="icon" variant="ghost" className="size-8 text-destructive" disabled={delMut.isPending} onClick={() => delMut.mutate(a.id)}><Trash2 className="size-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{draft.id ? "Edit account" : "New account"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label>Code</Label><Input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} className="mt-1.5 rounded-xl" /></div>
            <div><Label>Type</Label>
              <Select value={draft.type} onValueChange={(v: UiType) => setDraft({ ...draft, type: v })}>
                <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2"><Label>Name</Label><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="mt-1.5 rounded-xl" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-gradient-primary text-primary-foreground" onClick={save} disabled={saveMut.isPending}>
              {saveMut.isPending && <Loader2 className="me-1.5 size-4 animate-spin" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
