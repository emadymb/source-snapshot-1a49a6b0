import { useMemo, useState } from "react";
import { Plus, Trash2, Pencil, Receipt } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

import { PageHeading } from "@/components/PagePlaceholder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataToolbar, StatusPill } from "./DataToolbar";
import { store, useStore, fmt, type Expense } from "@/lib/mock/store";

const empty = (): Expense => ({ id: "", date: new Date().toISOString().slice(0, 10), vendor: "", category: "Other", amount: 0, vatRate: 24, status: "pending" });
const CATS = ["Travel", "Software", "Utilities", "Telecom", "Groceries", "Marketing", "Other"];

export function ExpensesScreen() {
  const expenses = useStore((s) => s.expenses);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Expense>(empty());

  const filtered = useMemo(() => expenses.filter((e) => {
    if (status !== "all" && e.status !== status) return false;
    if (!q) return true;
    return e.vendor.toLowerCase().includes(q.toLowerCase()) || e.category.toLowerCase().includes(q.toLowerCase());
  }), [expenses, q, status]);

  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of expenses) m.set(e.category, (m.get(e.category) ?? 0) + e.amount);
    return Array.from(m, ([category, amount]) => ({ category, amount }));
  }, [expenses]);

  const save = () => {
    if (!draft.vendor.trim() || draft.amount <= 0) return toast.error("Vendor and amount are required");
    store.upsertExpense(draft);
    toast.success(draft.id ? "Expense updated" : "Expense captured");
    setOpen(false);
  };

  const tone = (s: Expense["status"]) => s === "reimbursed" ? "success" : s === "approved" ? "info" : "warning";

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeading title="Expenses" description="Receipts, reimbursements, and category spend." icon={Receipt}
        actions={<Button className="rounded-xl bg-gradient-primary text-primary-foreground shadow-[var(--shadow-glow)]" onClick={() => { setDraft(empty()); setOpen(true); }}><Plus className="me-1.5 size-4" /> Add expense</Button>} />

      <div className="mb-4 glass rounded-2xl border-glass-border p-6">
        <h2 className="mb-2 font-display text-lg font-semibold">Spend by category</h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byCategory}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" />
              <XAxis dataKey="category" stroke="oklch(0.55 0 0)" fontSize={12} />
              <YAxis stroke="oklch(0.55 0 0)" fontSize={12} />
              <Tooltip formatter={(v: number) => fmt.format(v)} contentStyle={{ borderRadius: 12, border: "1px solid var(--glass-border)" }} />
              <Bar dataKey="amount" fill="oklch(0.58 0.2 264)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass rounded-2xl border-glass-border p-6">
        <DataToolbar value={q} onChange={setQ} placeholder="Search vendor or category…">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-10 w-[160px] rounded-xl border-glass-border bg-glass"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="reimbursed">Reimbursed</SelectItem>
            </SelectContent>
          </Select>
        </DataToolbar>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-glass-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Vendor</th>
                <th className="py-2 pr-4 font-medium">Category</th>
                <th className="py-2 pr-4 text-right font-medium">Amount</th>
                <th className="py-2 pr-4 font-medium">VAT</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-b border-glass-border/60 last:border-0 hover:bg-secondary/40">
                  <td className="py-3 pr-4 text-muted-foreground">{e.date}</td>
                  <td className="py-3 pr-4 font-medium">{e.vendor}</td>
                  <td className="py-3 pr-4">{e.category}</td>
                  <td className="py-3 pr-4 text-right">{fmt.format(e.amount)}</td>
                  <td className="py-3 pr-4"><StatusPill tone="muted">{e.vatRate}%</StatusPill></td>
                  <td className="py-3 pr-4"><StatusPill tone={tone(e.status)}>{e.status}</StatusPill></td>
                  <td className="py-3">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="size-8" onClick={() => { setDraft(e); setOpen(true); }}><Pencil className="size-4" /></Button>
                      <Button size="icon" variant="ghost" className="size-8 text-destructive" onClick={() => { store.deleteExpense(e.id); toast("Removed"); }}><Trash2 className="size-4" /></Button>
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
          <DialogHeader><DialogTitle>{draft.id ? "Edit expense" : "New expense"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label>Date</Label><Input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="mt-1.5 rounded-xl" /></div>
            <div><Label>Vendor</Label><Input value={draft.vendor} onChange={(e) => setDraft({ ...draft, vendor: e.target.value })} className="mt-1.5 rounded-xl" /></div>
            <div><Label>Category</Label>
              <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v })}>
                <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Status</Label>
              <Select value={draft.status} onValueChange={(v: Expense["status"]) => setDraft({ ...draft, status: v })}>
                <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="reimbursed">Reimbursed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Amount (€)</Label><Input type="number" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: +e.target.value })} className="mt-1.5 rounded-xl" /></div>
            <div><Label>VAT %</Label><Input type="number" value={draft.vatRate} onChange={(e) => setDraft({ ...draft, vatRate: +e.target.value })} className="mt-1.5 rounded-xl" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-gradient-primary text-primary-foreground" onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}