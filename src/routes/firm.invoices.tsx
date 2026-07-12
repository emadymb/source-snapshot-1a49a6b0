import { createFileRoute } from "@tanstack/react-router";
import { Receipt, Download, Send, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { useFirm, type FirmInvoice } from "@/lib/mock/firm";

export const Route = createFileRoute("/firm/invoices")({ component: InvoicesPage });

const STATUS: Record<FirmInvoice["status"], string> = {
  draft: "border-slate-200 bg-slate-100 text-slate-600",
  sent: "border-sky-200 bg-sky-50 text-sky-700",
  paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
  overdue: "border-rose-200 bg-rose-50 text-rose-700",
};

function InvoicesPage() {
  const { t } = useI18n();
  const { invoices, clients, upsertInvoice, can } = useFirm();

  const totals = {
    paid: invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0),
    outstanding: invoices.filter(i => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + i.amount, 0),
    overdue: invoices.filter(i => i.status === "overdue").reduce((s, i) => s + i.amount, 0),
    draft: invoices.filter(i => i.status === "draft").reduce((s, i) => s + i.amount, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t("firm.invoices.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("firm.invoices.subtitle")}</p>
        </div>
        {can("invoices.issue") && (
          <Button onClick={() => toast.info("Invoice composer coming soon")} className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md">
            <Receipt className="me-1.5 size-4" />New invoice
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Paid (30d)", value: totals.paid, tone: "text-emerald-600", icon: CheckCircle2 },
          { label: "Outstanding", value: totals.outstanding, tone: "text-sky-600", icon: Send },
          { label: "Overdue", value: totals.overdue, tone: "text-rose-600", icon: AlertTriangle },
          { label: "Drafts", value: totals.draft, tone: "text-slate-500", icon: Receipt },
        ].map(k => (
          <article key={k.label} className="rounded-2xl border border-glass-border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{k.label}</p>
              <k.icon className={`size-4 ${k.tone}`} />
            </div>
            <p className={`mt-1 font-display text-2xl font-semibold tabular-nums ${k.tone}`}>€{k.value.toLocaleString()}</p>
          </article>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-glass-border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-start font-medium">Invoice</th>
              <th className="px-4 py-3 text-start font-medium">Client</th>
              <th className="px-4 py-3 text-start font-medium">Issued</th>
              <th className="px-4 py-3 text-start font-medium">Due</th>
              <th className="px-4 py-3 text-end font-medium">Amount</th>
              <th className="px-4 py-3 text-start font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.map(i => {
              const c = clients.find(x => x.id === i.clientId);
              return (
                <tr key={i.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-mono text-xs">{i.number}</td>
                  <td className="px-4 py-3 font-medium">{c?.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{i.issued}</td>
                  <td className="px-4 py-3 text-muted-foreground">{i.due}</td>
                  <td className="px-4 py-3 text-end font-semibold tabular-nums">€{i.amount.toLocaleString()}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className={`rounded-lg capitalize ${STATUS[i.status]}`}>{i.status}</Badge></td>
                  <td className="px-4 py-3 text-end">
                    <div className="flex justify-end gap-1">
                      {can("invoices.issue") && i.status === "draft" && (
                        <Button size="sm" variant="outline" className="rounded-lg" onClick={() => { upsertInvoice({ ...i, status: "sent" }); toast.success("Invoice sent"); }}>
                          <Send className="me-1 size-3" />Send
                        </Button>
                      )}
                      {can("invoices.issue") && (i.status === "sent" || i.status === "overdue") && (
                        <Button size="sm" variant="outline" className="rounded-lg text-emerald-700" onClick={() => { upsertInvoice({ ...i, status: "paid" }); toast.success("Marked as paid"); }}>
                          <CheckCircle2 className="me-1 size-3" />Mark paid
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => toast.info("Downloading PDF…")}><Download className="size-3.5" /></Button>
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
