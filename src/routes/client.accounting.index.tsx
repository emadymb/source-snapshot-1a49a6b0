import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, ArrowRight, ReceiptText, ScanLine, Wallet, FileText } from "lucide-react";
import { Screen, KpiGrid, DataCard, DataTable, StatusBadge } from "@/components/screens/RichScreen";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/client/accounting/")({ component: Overview });

function Overview() {
  const kpis = [
    { label: "Revenue (MTD)", value: "€ 48,320", delta: "+12.4%", tone: "up" as const },
    { label: "Expenses (MTD)", value: "€ 21,190", delta: "+3.1%", tone: "flat" as const },
    { label: "Cash Balance", value: "€ 84,500", delta: "+€ 6.1k", tone: "up" as const },
    { label: "Drafts Pending", value: "7", delta: "3 receipts, 4 journals", tone: "flat" as const },
  ];
  const drafts = [
    { id: "D-241", type: "Receipt", vendor: "K-Supermarket", amount: "€ 48.20", status: "pending" },
    { id: "D-240", type: "Invoice", vendor: "Acme Oy",       amount: "€ 1,240.00", status: "draft" },
    { id: "D-239", type: "Journal", vendor: "Payroll March", amount: "€ 12,850.00", status: "pending" },
    { id: "D-238", type: "Receipt", vendor: "Teboil",        amount: "€ 62.10", status: "pending" },
  ];
  return (
    <Screen title="Accounting Overview" description="Ledger health, month-end status, and drafts pending review." icon={BookOpen}
      actions={<Button className="rounded-xl bg-gradient-primary text-primary-foreground shadow-[var(--shadow-glow)]">Close Period</Button>}
    >
      <KpiGrid kpis={kpis} />
      <div className="grid gap-6 lg:grid-cols-3">
        <DataCard title="Quick Actions">
          <div className="grid grid-cols-2 gap-3">
            {[
              { to: "/client/scan", icon: ScanLine, label: "Scan Receipt" },
              { to: "/client/accounting/expenses", icon: ReceiptText, label: "Add Expense" },
              { to: "/client/accounting/sales", icon: FileText, label: "New Invoice" },
              { to: "/client/banking", icon: Wallet, label: "Reconcile" },
            ].map((a) => (
              <Link key={a.to} to={a.to} className="glass flex flex-col items-start gap-2 rounded-xl border-glass-border p-4 hover:bg-secondary/50">
                <a.icon className="size-5 text-primary" />
                <span className="text-sm font-medium">{a.label}</span>
                <ArrowRight className="ms-auto size-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </DataCard>
        <div className="lg:col-span-2">
          <DataCard title="Drafts pending review">
            <DataTable rows={drafts} columns={[
              { key: "id", label: "Ref" },
              { key: "type", label: "Type" },
              { key: "vendor", label: "Party" },
              { key: "amount", label: "Amount", className: "text-right" },
              { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
            ]} />
          </DataCard>
        </div>
      </div>
    </Screen>
  );
}
