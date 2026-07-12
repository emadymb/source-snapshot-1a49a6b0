import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Send, CheckCircle2, FileText, Pencil, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { PageHeading } from "@/components/PagePlaceholder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataToolbar, StatusPill } from "./DataToolbar";
import { fmt } from "@/lib/format";
import {
  listInvoices, listCustomers, upsertInvoice, setInvoiceStatus, deleteInvoice,
  type InvoiceDTO, type InvoiceLineDTO, type CustomerDTO, type UiInvoiceStatus,
} from "@/lib/accounting.functions";

const uid = () => Math.random().toString(36).slice(2, 10);

function statusTone(s: UiInvoiceStatus) {
  return s === "paid" ? "success" : s === "overdue" ? "danger" : s === "draft" ? "muted" : "info";
}

type DraftLine = InvoiceLineDTO & { key: string };
type Draft = {
  id?: string; number?: string; customerId: string; issueDate: string; dueDate: string;
  status: UiInvoiceStatus; notes: string; lines: DraftLine[];
};

export function InvoicesScreen() {
  const qc = useQueryClient();
  const { data: invoices = [], isLoading } = useQuery({ queryKey: ["accounting", "invoices"], queryFn: () => listInvoices(), staleTime: 30_000 });
  const { data: contacts = [] } = useQuery({ queryKey: ["accounting", "customers"], queryFn: () => listCustomers(), staleTime: 30_000 });
  const invalidate = () => { qc.invalidateQueries({ queryKey: ["accounting", "invoices"] }); qc.invalidateQueries({ queryKey: ["accounting", "reports"] }); };
  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: UiInvoiceStatus }) => setInvoiceStatus({ data: v }),
    onSuccess: () => invalidate(),
  });
  const del = useMutation({ mutationFn: (id: string) => deleteInvoice({ data: { id } }), onSuccess: () => { invalidate(); toast("Deleted"); } });

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Draft | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    return invoices.filter((i: InvoiceDTO) => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (!q) return true;
      return (
        i.number.toLowerCase().includes(q.toLowerCase()) ||
        i.customerName.toLowerCase().includes(q.toLowerCase())
      );
    });
  }, [invoices, q, statusFilter]);

  const totals = useMemo(() => {
    let outstanding = 0, paid = 0, overdue = 0;
    for (const i of invoices) {
      const total = i.total;
      if (i.status === "paid") paid += total;
      else if (i.status === "overdue") overdue += total;
      else if (i.status !== "draft") outstanding += total;
    }
    return { outstanding, paid, overdue, count: invoices.length };
  }, [invoices]);

  const trend = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of invoices) {
      const k = i.issueDate.slice(0, 7);
      map.set(k, (map.get(k) ?? 0) + i.total);
    }
    return Array.from(map.entries()).sort().map(([m, v]) => ({ m, v: Math.round(v) }));
  }, [invoices]);

  const newInvoice = (): Draft => ({
    customerId: contacts[0]?.id ?? "",
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    status: "draft",
    notes: "",
    lines: [{ key: uid(), description: "", qty: 1, unitPrice: 0, vatRate: 24 }],
  });

  const editDraft = (i: InvoiceDTO): Draft => ({
    id: i.id, number: i.number, customerId: i.customerId ?? "", issueDate: i.issueDate,
    dueDate: i.dueDate ?? new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    status: i.status, notes: i.notes ?? "",
    lines: i.lines.map((l) => ({ key: l.id ?? uid(), description: l.description, qty: l.qty, unitPrice: l.unitPrice, vatRate: l.vatRate })),
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeading
        title="Invoices"
        description="Live customer invoices from your accounting database."
        icon={FileText}
        actions={
            <Button
              className="rounded-xl bg-gradient-primary text-primary-foreground shadow-[var(--shadow-glow)]"
              onClick={() => { setEditing(newInvoice()); setOpen(true); }}
            >
              <Plus className="me-1.5 size-4" /> New invoice
            </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { l: "Outstanding", v: fmt.format(totals.outstanding), t: "Awaiting payment" },
          { l: "Overdue", v: fmt.format(totals.overdue), t: `${invoices.filter(i=>i.status==="overdue").length} invoices` },
          { l: "Paid this year", v: fmt.format(totals.paid), t: "Settled" },
          { l: "Total issued", v: String(totals.count), t: "All statuses" },
        ].map((k) => (
          <div key={k.l} className="glass rounded-2xl border-glass-border p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{k.l}</p>
            <p className="mt-2 font-display text-2xl font-semibold">{k.v}</p>
            <p className="mt-1 text-xs text-muted-foreground">{k.t}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 glass rounded-2xl border-glass-border p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Invoice value by month</h2>
          <span className="text-xs text-muted-foreground">All time</span>
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <XAxis dataKey="m" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => fmt.format(v)} contentStyle={{ borderRadius: 12, border: "1px solid var(--glass-border)" }} />
              <Line type="monotone" dataKey="v" stroke="oklch(0.58 0.2 264)" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-4 glass rounded-2xl border-glass-border p-6">
        <DataToolbar value={q} onChange={setQ} placeholder="Search by number or customer…">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 w-[160px] rounded-xl border-glass-border bg-glass"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </DataToolbar>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-glass-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Number</th>
                <th className="py-2 pr-4 font-medium">Customer</th>
                <th className="py-2 pr-4 font-medium">Issued</th>
                <th className="py-2 pr-4 font-medium">Due</th>
                <th className="py-2 pr-4 text-right font-medium">Total</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={7} className="py-8 text-center text-muted-foreground"><Loader2 className="mx-auto size-4 animate-spin" /></td></tr>}
              {filtered.map((i) => {
                return (
                  <tr key={i.id} className="border-b border-glass-border/60 last:border-0 hover:bg-secondary/40">
                    <td className="py-3 pr-4 font-mono text-xs">{i.number}</td>
                    <td className="py-3 pr-4">{i.customerName}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{i.issueDate}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{i.dueDate ?? "—"}</td>
                    <td className="py-3 pr-4 text-right font-medium">{fmt.format(i.total)}</td>
                    <td className="py-3 pr-4"><StatusPill tone={statusTone(i.status)}>{i.status}</StatusPill></td>
                    <td className="py-3">
                      <div className="flex items-center justify-end gap-1">
                        {i.status !== "paid" && (
                          <Button size="icon" variant="ghost" className="size-8" title="Mark paid" onClick={() => { setStatus.mutate({ id: i.id, status: "paid" }); toast.success(`${i.number} marked paid`); }}>
                            <CheckCircle2 className="size-4" />
                          </Button>
                        )}
                        {i.status === "draft" && (
                          <Button size="icon" variant="ghost" className="size-8" title="Send" onClick={() => { setStatus.mutate({ id: i.id, status: "sent" }); toast.success(`${i.number} sent`); }}>
                            <Send className="size-4" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="size-8" title="Edit" onClick={() => { setEditing(editDraft(i)); setOpen(true); }}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-8 text-destructive" title="Delete" onClick={() => del.mutate(i.id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">No invoices match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <InvoiceEditor open={open} onOpenChange={setOpen} draft={editing} contacts={contacts} onSaved={invalidate} />
    </div>
  );
}

function InvoiceEditor({ open, onOpenChange, draft: initialDraft, contacts, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; draft: Draft | null; contacts: CustomerDTO[]; onSaved: () => void }) {
  const [draft, setDraft] = useState<Draft | null>(initialDraft);
  useEffect(() => setDraft(initialDraft), [initialDraft]);

  const save = useMutation({
    mutationFn: (d: Draft) => upsertInvoice({
      data: {
        id: d.id, customerId: d.customerId || null, issueDate: d.issueDate, dueDate: d.dueDate || null,
        notes: d.notes || null, currency: "EUR",
        lines: d.lines.map((l) => ({ description: l.description, qty: l.qty, unitPrice: l.unitPrice, vatRate: l.vatRate })),
      },
    }),
    onSuccess: () => { onSaved(); toast.success("Invoice saved"); onOpenChange(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!draft) return null;
  const subtotal = draft.lines.reduce((a, l) => a + l.qty * l.unitPrice, 0);
  const vat = draft.lines.reduce((a, l) => a + l.qty * l.unitPrice * (l.vatRate / 100), 0);
  const total = subtotal + vat;

  const updateLine = (key: string, patch: Partial<DraftLine>) =>
    setDraft({ ...draft, lines: draft.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)) });

  const addLine = () => setDraft({ ...draft, lines: [...draft.lines, { key: uid(), description: "", qty: 1, unitPrice: 0, vatRate: 24 }] });
  const removeLine = (key: string) => setDraft({ ...draft, lines: draft.lines.filter((l) => l.key !== key) });

  const submit = () => {
    if (!draft.lines.length) return toast.error("Add at least one line");
    if (draft.lines.some((l) => !l.description.trim())) return toast.error("Every line needs a description");
    save.mutate(draft);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{draft.id ? `Edit ${draft.number ?? ""}` : "New invoice"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-1">
            <Label>Customer</Label>
            <Select value={draft.customerId} onValueChange={(v) => setDraft({ ...draft, customerId: v })}>
              <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {contacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Issue date</Label>
            <Input type="date" value={draft.issueDate} onChange={(e) => setDraft({ ...draft, issueDate: e.target.value })} className="mt-1.5 rounded-xl" />
          </div>
          <div>
            <Label>Due date</Label>
            <Input type="date" value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} className="mt-1.5 rounded-xl" />
          </div>
        </div>

        <div className="mt-2 rounded-xl border border-glass-border">
          <div className="grid grid-cols-12 gap-2 border-b border-glass-border bg-secondary/40 px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <div className="col-span-5">Description</div>
            <div className="col-span-2 text-right">Qty</div>
            <div className="col-span-2 text-right">Price</div>
            <div className="col-span-2 text-right">VAT %</div>
            <div className="col-span-1"></div>
          </div>
          {draft.lines.map((l) => (
            <div key={l.key} className="grid grid-cols-12 gap-2 border-b border-glass-border px-3 py-2 last:border-0">
              <Input value={l.description} placeholder="Description" onChange={(e) => updateLine(l.key, { description: e.target.value })} className="col-span-5 h-9 rounded-lg" />
              <Input type="number" value={l.qty} onChange={(e) => updateLine(l.key, { qty: +e.target.value })} className="col-span-2 h-9 rounded-lg text-right" />
              <Input type="number" value={l.unitPrice} onChange={(e) => updateLine(l.key, { unitPrice: +e.target.value })} className="col-span-2 h-9 rounded-lg text-right" />
              <Input type="number" value={l.vatRate} onChange={(e) => updateLine(l.key, { vatRate: +e.target.value })} className="col-span-2 h-9 rounded-lg text-right" />
              <Button size="icon" variant="ghost" className="col-span-1 size-9 text-destructive" onClick={() => removeLine(l.key)}><X className="size-4" /></Button>
            </div>
          ))}
          <div className="p-2">
            <Button variant="outline" className="rounded-lg" onClick={addLine}><Plus className="me-1 size-4" /> Add line</Button>
          </div>
        </div>

        <div className="mt-2 grid gap-4 md:grid-cols-2">
          <div>
            <Label>Notes</Label>
            <Textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} className="mt-1.5 rounded-xl" rows={3} />
          </div>
          <div className="rounded-xl bg-secondary/40 p-4 text-sm">
            <div className="flex justify-between py-1"><span className="text-muted-foreground">Subtotal</span><span>{fmt.format(subtotal)}</span></div>
            <div className="flex justify-between py-1"><span className="text-muted-foreground">VAT</span><span>{fmt.format(vat)}</span></div>
            <div className="mt-2 flex justify-between border-t border-glass-border pt-2 font-semibold"><span>Total</span><span>{fmt.format(total)}</span></div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-gradient-primary text-primary-foreground" disabled={save.isPending} onClick={submit}>{save.isPending ? "Saving…" : "Save invoice"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
