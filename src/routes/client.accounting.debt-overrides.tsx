import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ShieldAlert, Plus, Check, X, FileDown } from "lucide-react";
import { toast } from "sonner";
import { Screen, KpiGrid, DataTable, StatusBadge } from "@/components/screens/RichScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RangeFilterBar, emptyFilter, type RangeFilterValue } from "@/components/client/RangeFilterBar";
import { useClientRole } from "@/lib/client-role";
import { downloadCSV } from "@/lib/client/export";

type Override = {
  id: string;
  contact: string;
  invoice: string;
  original: number;
  adjusted: number;
  reason: string;
  reasonCode: "write_off" | "discount" | "dispute" | "correction";
  approver: string;
  date: string;
  status: "pending" | "approved" | "rejected";
};

const SEED: Override[] = [
  { id: "DO-1042", contact: "Kanava Oy",       invoice: "INV-2041", original: 4200, adjusted: 3900, reason: "Volume discount agreed by phone", reasonCode: "discount",   approver: "Aino V.",   date: "2026-06-28", status: "approved" },
  { id: "DO-1041", contact: "Metsä Studio",    invoice: "INV-2038", original: 1580, adjusted:  980, reason: "Damaged goods write-off",         reasonCode: "write_off",  approver: "Aino V.",   date: "2026-06-24", status: "approved" },
  { id: "DO-1040", contact: "Nordica Retail",  invoice: "INV-2033", original: 8900, adjusted: 8900, reason: "Disputed line item — under review", reasonCode: "dispute",  approver: "—",          date: "2026-06-21", status: "pending"  },
  { id: "DO-1039", contact: "Aalto Print",     invoice: "INV-2027", original:  620, adjusted:  620, reason: "Duplicate invoice claim",          reasonCode: "dispute",    approver: "Mikko L.",  date: "2026-06-18", status: "rejected" },
  { id: "DO-1038", contact: "Suomi Cafe",      invoice: "INV-2022", original: 2450, adjusted: 2250, reason: "Loyalty rebate correction",        reasonCode: "correction", approver: "Aino V.",   date: "2026-06-12", status: "approved" },
  { id: "DO-1037", contact: "Sisu Logistics",  invoice: "INV-2018", original: 3300, adjusted: 3000, reason: "Late-delivery credit",             reasonCode: "discount",   approver: "Aino V.",   date: "2026-06-05", status: "approved" },
];

const REASON_LABEL: Record<Override["reasonCode"], string> = {
  write_off: "Write-off",
  discount: "Discount",
  dispute: "Dispute",
  correction: "Correction",
};

export const Route = createFileRoute("/client/accounting/debt-overrides")({
  head: () => ({ meta: [{ title: "Debt Overrides — Fiksu" }] }),
  component: DebtOverridesPage,
});

function DebtOverridesPage() {
  const { can } = useClientRole();
  const canApprove = can("expense.approve");
  const canCreate = can("expense.create");

  const [rows, setRows] = useState<Override[]>(SEED);
  const [filter, setFilter] = useState<RangeFilterValue>(emptyFilter);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ contact: "", invoice: "", original: "", adjusted: "", reason: "", reasonCode: "discount" as Override["reasonCode"] });

  const filtered = useMemo(() => rows.filter(r => {
    if (filter.status !== "all" && r.status !== filter.status) return false;
    if (filter.from && r.date < filter.from) return false;
    if (filter.to && r.date > filter.to) return false;
    if (!filter.q) return true;
    const hay = `${r.id} ${r.contact} ${r.invoice} ${r.reason}`.toLowerCase();
    return hay.includes(filter.q.toLowerCase());
  }), [rows, filter]);

  const totalAdjusted = rows.filter(r => r.status === "approved").reduce((s, r) => s + (r.original - r.adjusted), 0);
  const pendingCount = rows.filter(r => r.status === "pending").length;

  const decide = (id: string, next: "approved" | "rejected") => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, status: next, approver: next === "approved" ? "You" : r.approver } : r));
    toast.success(next === "approved" ? "Override approved" : "Override rejected");
  };

  const submitDraft = () => {
    if (!draft.contact || !draft.invoice || !draft.original || !draft.adjusted || !draft.reason) {
      toast.error("Fill in all fields");
      return;
    }
    const id = `DO-${1043 + rows.length}`;
    setRows(prev => [{
      id,
      contact: draft.contact,
      invoice: draft.invoice,
      original: Number(draft.original),
      adjusted: Number(draft.adjusted),
      reason: draft.reason,
      reasonCode: draft.reasonCode,
      approver: "—",
      date: new Date().toISOString().slice(0, 10),
      status: "pending",
    }, ...prev]);
    setDraft({ contact: "", invoice: "", original: "", adjusted: "", reason: "", reasonCode: "discount" });
    setOpen(false);
    toast.success(`Override ${id} submitted for approval`);
  };

  const doExport = () => {
    downloadCSV("debt-overrides", filtered, [
      { key: "id", label: "Ref" },
      { key: "contact", label: "Contact" },
      { key: "invoice", label: "Invoice" },
      { key: "reasonCode", label: "Reason code" },
      { key: "original", label: "Original" },
      { key: "adjusted", label: "Adjusted" },
      { key: "delta", label: "Delta", get: (r) => r.original - r.adjusted },
      { key: "reason", label: "Reason" },
      { key: "approver", label: "Approver" },
      { key: "date", label: "Date" },
      { key: "status", label: "Status" },
    ]);
  };

  return (
    <Screen
      title="Debt Overrides"
      description="Manually adjust receivable balances with a full audit trail."
      icon={ShieldAlert}
      actions={
        <>
          <Button variant="outline" className="rounded-xl border-glass-border bg-glass" onClick={doExport}>
            <FileDown className="me-1.5 size-4" />Export
          </Button>
          {canCreate && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-xl bg-gradient-primary text-primary-foreground shadow-[var(--shadow-glow)]">
                  <Plus className="me-1.5 size-4" />New override
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Request debt override</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><Label>Contact</Label><Input value={draft.contact} onChange={e => setDraft({ ...draft, contact: e.target.value })} placeholder="e.g. Kanava Oy" /></div>
                  <div><Label>Invoice</Label><Input value={draft.invoice} onChange={e => setDraft({ ...draft, invoice: e.target.value })} placeholder="INV-…" /></div>
                  <div>
                    <Label>Reason code</Label>
                    <Select value={draft.reasonCode} onValueChange={(v) => setDraft({ ...draft, reasonCode: v as Override["reasonCode"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="discount">Discount</SelectItem>
                        <SelectItem value="write_off">Write-off</SelectItem>
                        <SelectItem value="dispute">Dispute</SelectItem>
                        <SelectItem value="correction">Correction</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Original (€)</Label><Input type="number" value={draft.original} onChange={e => setDraft({ ...draft, original: e.target.value })} /></div>
                  <div><Label>Adjusted (€)</Label><Input type="number" value={draft.adjusted} onChange={e => setDraft({ ...draft, adjusted: e.target.value })} /></div>
                  <div className="col-span-2"><Label>Reason</Label><Textarea value={draft.reason} onChange={e => setDraft({ ...draft, reason: e.target.value })} rows={3} /></div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={submitDraft} className="rounded-xl bg-gradient-primary text-primary-foreground">Submit for approval</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </>
      }
    >
      <KpiGrid kpis={[
        { label: "Total adjusted (approved)", value: `€${totalAdjusted.toLocaleString()}`, delta: "YTD", tone: "flat" },
        { label: "Pending approval", value: String(pendingCount), delta: pendingCount ? "needs review" : "clear", tone: pendingCount ? "down" : "up" },
        { label: "Overrides this month", value: String(rows.filter(r => r.date.startsWith("2026-06")).length), delta: "Jun 2026", tone: "flat" },
        { label: "Approval rate", value: `${Math.round(rows.filter(r => r.status === "approved").length / rows.length * 100)}%`, delta: "trailing 30d", tone: "up" },
      ]} />

      <RangeFilterBar
        value={filter}
        onChange={setFilter}
        placeholder="Search by ref, contact, invoice…"
        statuses={[
          { value: "all", label: "All statuses" },
          { value: "pending", label: "Pending" },
          { value: "approved", label: "Approved" },
          { value: "rejected", label: "Rejected" },
        ]}
      />

      <div className="glass rounded-2xl border-glass-border p-4">
        <DataTable
          rows={filtered}
          columns={[
            { key: "id", label: "Ref", render: r => <span className="font-mono text-xs">{r.id}</span> },
            { key: "contact", label: "Contact" },
            { key: "invoice", label: "Invoice", render: r => <span className="font-mono text-xs">{r.invoice}</span> },
            { key: "reasonCode", label: "Reason", render: r => REASON_LABEL[r.reasonCode] },
            { key: "original", label: "Original", render: r => `€${r.original.toLocaleString()}` },
            { key: "adjusted", label: "Adjusted", render: r => `€${r.adjusted.toLocaleString()}` },
            { key: "delta", label: "Δ", render: r => <span className={r.original - r.adjusted > 0 ? "text-rose-600" : "text-muted-foreground"}>-€{(r.original - r.adjusted).toLocaleString()}</span> },
            { key: "approver", label: "Approver" },
            { key: "date", label: "Date" },
            { key: "status", label: "Status", render: r => <StatusBadge status={r.status} /> },
            {
              key: "actions", label: "", render: r => (
                canApprove && r.status === "pending" ? (
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-7 rounded-lg" onClick={() => decide(r.id, "approved")}><Check className="size-3.5 text-emerald-600" /></Button>
                    <Button size="sm" variant="outline" className="h-7 rounded-lg" onClick={() => decide(r.id, "rejected")}><X className="size-3.5 text-rose-600" /></Button>
                  </div>
                ) : null
              ),
            },
          ]}
        />
      </div>
    </Screen>
  );
}
