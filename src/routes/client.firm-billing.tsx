import { createFileRoute } from "@tanstack/react-router";
import { CreditCard } from "lucide-react";
import { Screen, KpiGrid, DataCard, DataTable, StatusBadge } from "@/components/screens/RichScreen";
import { ExportMenu } from "@/components/client/ExportMenu";

export const Route = createFileRoute("/client/firm-billing")({ component: FirmBilling });

const rows = [
  { id: "AF-2026-004", period: "Mar 2026",  due: "2026-04-05", amount: "€ 1,240.00", status: "open" },
  { id: "AF-2026-003", period: "Feb 2026",  due: "2026-03-05", amount: "€ 1,240.00", status: "paid" },
  { id: "AF-2026-002", period: "Jan 2026",  due: "2026-02-05", amount: "€ 1,240.00", status: "paid" },
  { id: "AF-2025-012", period: "Dec 2025",  due: "2026-01-05", amount: "€ 1,180.00", status: "paid" },
];

function FirmBilling() {
  const kpis = [
    { label: "Outstanding", value: "€ 1,240.00", tone: "down" as const },
    { label: "Paid YTD", value: "€ 9,680.00" },
    { label: "Next invoice", value: "Apr 1" },
    { label: "Plan", value: "Full-Service" },
  ];
  return (
    <Screen title="Firm Billing" description="What your accounting firm has billed you." icon={CreditCard}
      actions={
        <ExportMenu title="Firm billing statement" filenameBase="firm-billing" rows={rows} columns={[
          { key: "id", label: "Invoice #" },
          { key: "period", label: "Period" },
          { key: "due", label: "Due" },
          { key: "amount", label: "Amount" },
          { key: "status", label: "Status" },
        ]} />
      }
    >
      <KpiGrid kpis={kpis} />
      <DataCard title="Invoices from your accountant">
        <DataTable rows={rows} columns={[
          { key: "id", label: "Invoice #" },
          { key: "period", label: "Period" },
          { key: "due", label: "Due" },
          { key: "amount", label: "Amount", className: "text-right" },
          { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
        ]} />
      </DataCard>
    </Screen>
  );
}
