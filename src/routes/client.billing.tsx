import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, Download, Check, Sparkles } from "lucide-react";
import { Screen, KpiGrid, DataCard, DataTable, StatusBadge } from "@/components/screens/RichScreen";
import { Button } from "@/components/ui/button";
import { ExportMenu } from "@/components/client/ExportMenu";
import { downloadPDF } from "@/lib/client/export";
import { useClientRole } from "@/lib/client-role";
import { toast } from "sonner";

export const Route = createFileRoute("/client/billing")({ component: Page });

const invoices = [
  { number: "FIK-2026-03", date: "2026-03-01", plan: "Growth", amount: "€89.00", status: "paid" },
  { number: "FIK-2026-02", date: "2026-02-01", plan: "Growth", amount: "€89.00", status: "paid" },
  { number: "FIK-2026-01", date: "2026-01-01", plan: "Growth", amount: "€89.00", status: "paid" },
  { number: "FIK-2025-12", date: "2025-12-01", plan: "Starter", amount: "€29.00", status: "paid" },
];

const plans = [
  { name: "Starter", price: "€29", tag: "Sole traders", features: ["Up to 25 invoices / mo", "OCR receipts", "Email support"] },
  { name: "Growth", price: "€89", tag: "Current plan", current: true, features: ["Unlimited invoices", "AI drafts + insights", "Priority support", "3 users"] },
  { name: "Scale", price: "€249", tag: "Multi-entity", features: ["Multi-currency", "Advanced payroll", "SLA support", "Unlimited users"] },
];

function Page() {
  const { can } = useClientRole();
  const downloadInvoice = (row: (typeof invoices)[number]) => {
    downloadPDF(`Invoice ${row.number}`, [row], [
      { key: "number", label: "Number" },
      { key: "date", label: "Date" },
      { key: "plan", label: "Plan" },
      { key: "amount", label: "Amount" },
      { key: "status", label: "Status" },
    ], { subtitle: `Issued ${row.date}` });
    toast.success(`Opening ${row.number}`);
  };
  return (
    <Screen title="Billing" description="Manage your subscription, payment method, and invoice history." icon={CreditCard}
      actions={
        <ExportMenu title="Invoice history" filenameBase="billing-invoices" rows={invoices} columns={[
          { key: "number", label: "Number" },
          { key: "date", label: "Date" },
          { key: "plan", label: "Plan" },
          { key: "amount", label: "Amount" },
          { key: "status", label: "Status" },
        ]} />
      }>
      <KpiGrid kpis={[
        { label: "Current plan", value: "Growth", delta: "€89 / month" },
        { label: "Next renewal", value: "Apr 1, 2026", delta: "Auto-renew on" },
        { label: "Seats used", value: "2 / 3", delta: "1 available" },
        { label: "Lifetime spend", value: "€1,247", delta: "Since Jun 2024", tone: "up" },
      ]} />

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => (
          <div key={p.name} className={`glass rounded-2xl border p-6 ${p.current ? "border-primary shadow-[var(--shadow-glow)]" : "border-glass-border"}`}>
            <div className="flex items-center justify-between">
              <p className="font-display text-xl font-semibold">{p.name}</p>
              {p.current && <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">Current</span>}
            </div>
            <p className="text-xs text-muted-foreground">{p.tag}</p>
            <p className="mt-4"><span className="font-display text-3xl font-semibold">{p.price}</span><span className="text-sm text-muted-foreground"> / mo</span></p>
            <ul className="mt-4 space-y-2 text-sm">
              {p.features.map((f) => <li key={f} className="flex items-center gap-2"><Check className="size-4 text-emerald-600" />{f}</li>)}
            </ul>
            <Button className={`mt-6 w-full rounded-xl ${p.current ? "bg-secondary text-foreground" : "bg-gradient-primary text-primary-foreground"}`} disabled={p.current || !can("billing.manage")}>
              {p.current ? "Current plan" : can("billing.manage") ? "Upgrade" : "Owner only"}
            </Button>
          </div>
        ))}
      </div>

      <DataCard title="Payment method" action={<Button variant="outline" size="sm" className="rounded-xl border-glass-border bg-glass" disabled={!can("billing.manage")}>Update</Button>}>
        <div className="flex items-center gap-4 p-2">
          <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground"><CreditCard className="size-5" /></div>
          <div>
            <p className="font-medium">Visa •••• 4242</p>
            <p className="text-xs text-muted-foreground">Expires 08 / 2028 · Billing to erik@lindqvist-oy.fi</p>
          </div>
        </div>
      </DataCard>

      <DataCard title="Invoice history">
        <DataTable rows={invoices} columns={[
          { key: "number", label: "Number", render: (r) => <span className="font-medium">{r.number}</span> },
          { key: "date", label: "Date" },
          { key: "plan", label: "Plan" },
          { key: "amount", label: "Amount" },
          { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
          { key: "dl", label: "", render: (r) => <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => downloadInvoice(r)}><Download className="me-1.5 size-4" />PDF</Button> },
        ]} />
      </DataCard>

      <div className="glass rounded-2xl border-glass-border p-5">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 size-5 text-primary" />
          <div>
            <p className="font-semibold">Save 20% with annual billing</p>
            <p className="text-sm text-muted-foreground">Switch to annual on the Growth plan and get 2 months free.</p>
          </div>
          <Button className="ms-auto rounded-xl bg-gradient-primary text-primary-foreground" disabled={!can("billing.manage")}>Switch to annual</Button>
        </div>
      </div>
    </Screen>
  );
}