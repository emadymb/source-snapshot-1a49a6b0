import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Download, FileText, CheckCircle2, Clock, XCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/super/invoices")({ component: InvoicesPage });

type Status = "paid" | "open" | "overdue" | "refunded";

interface Invoice {
  id: string;
  number: string;
  workspace: string;
  plan: string;
  amount: number;
  currency: "EUR";
  issued: string;
  due: string;
  status: Status;
  gateway: "Stripe" | "PayPal" | "Bank";
}

const SEED: Invoice[] = [
  { id: "i1", number: "FIK-2026-0421", workspace: "K-Ryhmä Retail", plan: "Scale", amount: 249, currency: "EUR", issued: "2026-07-01", due: "2026-07-15", status: "paid", gateway: "Stripe" },
  { id: "i2", number: "FIK-2026-0420", workspace: "Lindqvist Oy", plan: "Growth", amount: 89, currency: "EUR", issued: "2026-07-01", due: "2026-07-15", status: "paid", gateway: "Stripe" },
  { id: "i3", number: "FIK-2026-0419", workspace: "Malmö AB", plan: "Enterprise", amount: 832, currency: "EUR", issued: "2026-07-01", due: "2026-07-30", status: "open", gateway: "Bank" },
  { id: "i4", number: "FIK-2026-0418", workspace: "Verkkokauppa Oy", plan: "Scale", amount: 249, currency: "EUR", issued: "2026-06-01", due: "2026-06-15", status: "overdue", gateway: "Stripe" },
  { id: "i5", number: "FIK-2026-0417", workspace: "Aalto Design", plan: "Growth", amount: 89, currency: "EUR", issued: "2026-06-30", due: "2026-07-14", status: "paid", gateway: "PayPal" },
  { id: "i6", number: "FIK-2026-0416", workspace: "Café Regatta", plan: "Starter", amount: 29, currency: "EUR", issued: "2026-06-28", due: "2026-07-12", status: "paid", gateway: "Stripe" },
  { id: "i7", number: "FIK-2026-0415", workspace: "Tallinn Digital", plan: "Starter", amount: 29, currency: "EUR", issued: "2026-06-15", due: "2026-06-29", status: "refunded", gateway: "Stripe" },
  { id: "i8", number: "FIK-2026-0414", workspace: "Nordea Consulting", plan: "Growth", amount: 89, currency: "EUR", issued: "2026-06-14", due: "2026-06-28", status: "paid", gateway: "Stripe" },
];

const statusMeta: Record<Status, { label: string; tone: string; icon: React.ComponentType<{ className?: string }> }> = {
  paid: { label: "Paid", tone: "bg-emerald-500/15 text-emerald-700", icon: CheckCircle2 },
  open: { label: "Open", tone: "bg-sky-500/15 text-sky-700", icon: Clock },
  overdue: { label: "Overdue", tone: "bg-red-500/15 text-red-700", icon: XCircle },
  refunded: { label: "Refunded", tone: "bg-slate-500/15 text-slate-700", icon: RefreshCw },
};

function InvoicesPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState(SEED);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Status | "all">("all");

  const filtered = useMemo(() => rows.filter((r) =>
    (status === "all" || r.status === status) &&
    (!q || `${r.number} ${r.workspace} ${r.plan}`.toLowerCase().includes(q.toLowerCase()))
  ), [rows, q, status]);

  const totals = useMemo(() => ({
    collected: filtered.filter((r) => r.status === "paid").reduce((s, r) => s + r.amount, 0),
    outstanding: filtered.filter((r) => r.status === "open" || r.status === "overdue").reduce((s, r) => s + r.amount, 0),
    overdue: filtered.filter((r) => r.status === "overdue").reduce((s, r) => s + r.amount, 0),
    count: filtered.length,
  }), [filtered]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t("nav.invoices")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Invoices Fiksu bills its tenants — automatic, dunning, refunds.</p>
        </div>
        <Button variant="outline" className="rounded-xl" onClick={() => toast.success(`Exported ${filtered.length} invoices`)}><Download className="me-1.5 size-4" />Export</Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Collected (30d)" value={`€${totals.collected.toLocaleString()}`} tone="emerald" />
        <Stat label="Outstanding" value={`€${totals.outstanding.toLocaleString()}`} tone="sky" />
        <Stat label="Overdue" value={`€${totals.overdue.toLocaleString()}`} tone="red" />
        <Stat label="Invoices" value={String(totals.count)} tone="slate" />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-glass-border bg-white p-3 shadow-sm">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("common.search")} className="rounded-lg border-slate-200 ps-10" />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as Status | "all")}>
          <SelectTrigger className="w-40 rounded-lg"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-glass-border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-start">Invoice</th>
              <th className="px-4 py-3 text-start">Workspace</th>
              <th className="px-4 py-3 text-start">Plan</th>
              <th className="px-4 py-3 text-end">Amount</th>
              <th className="px-4 py-3 text-start">Issued</th>
              <th className="px-4 py-3 text-start">Due</th>
              <th className="px-4 py-3 text-start">Gateway</th>
              <th className="px-4 py-3 text-start">Status</th>
              <th className="w-32" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((r) => {
              const meta = statusMeta[r.status];
              return (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{r.number}</td>
                  <td className="px-4 py-3 font-medium">{r.workspace}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.plan}</td>
                  <td className="px-4 py-3 text-end font-semibold tabular-nums">€{r.amount}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.issued}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.due}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.gateway}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${meta.tone}`}><meta.icon className="size-3" />{meta.label}</span>
                  </td>
                  <td className="px-4 py-3 text-end">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={() => toast.success(`PDF for ${r.number} downloaded`)}><FileText className="size-3.5" />PDF</Button>
                      {r.status === "overdue" && <Button size="sm" className="h-7 gap-1 bg-indigo-600 px-2 text-xs text-white hover:bg-indigo-700" onClick={() => { setRows((p) => p.map((x) => x.id === r.id ? { ...x, status: "paid" } : x)); toast.success(`Retry charge succeeded for ${r.workspace}`); }}><RefreshCw className="size-3.5" />Retry</Button>}
                      {r.status === "paid" && <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => { setRows((p) => p.map((x) => x.id === r.id ? { ...x, status: "refunded" } : x)); toast.success("Refund issued"); }}>Refund</Button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "emerald" | "sky" | "red" | "slate" }) {
  const tones = {
    emerald: "text-emerald-700",
    sky: "text-sky-700",
    red: "text-red-700",
    slate: "text-slate-700",
  };
  return (
    <div className="rounded-2xl border border-glass-border bg-white p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-2 font-display text-2xl font-semibold tabular-nums ${tones[tone]}`}>{value}</p>
    </div>
  );
}
