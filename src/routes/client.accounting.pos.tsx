import { createFileRoute } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { Screen, KpiGrid, DataCard, DataTable, StatusBadge } from "@/components/screens/RichScreen";

export const Route = createFileRoute("/client/accounting/pos")({ component: Pos });

function Pos() {
  const kpis = [
    { label: "Sales today", value: "€ 12,340", tone: "up" as const, delta: "+8%" },
    { label: "Transactions", value: "184" },
    { label: "Avg ticket", value: "€ 67.05" },
    { label: "Refunds", value: "€ 42.10" },
  ];
  const rows = [
    { time: "14:22", ref: "TX-9124", items: 3, tender: "Card",  amount: "€ 42.90",  status: "paid" },
    { time: "14:18", ref: "TX-9123", items: 7, tender: "Cash",  amount: "€ 124.50", status: "paid" },
    { time: "14:11", ref: "TX-9122", items: 1, tender: "Card",  amount: "€ 8.90",   status: "paid" },
    { time: "14:03", ref: "TX-9121", items: 2, tender: "Card",  amount: "€ 32.00",  status: "failed" },
    { time: "13:58", ref: "TX-9120", items: 5, tender: "Mobile",amount: "€ 88.10",  status: "paid" },
  ];
  return (
    <Screen title="POS" description="Barcode + QR checkout with cash-box reconciliation." icon={ShoppingCart}>
      <KpiGrid kpis={kpis} />
      <DataCard title="Latest transactions">
        <DataTable rows={rows} columns={[
          { key: "time", label: "Time" },
          { key: "ref", label: "Ref" },
          { key: "items", label: "Items", className: "text-right" },
          { key: "tender", label: "Tender" },
          { key: "amount", label: "Amount", className: "text-right" },
          { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
        ]} />
      </DataCard>
    </Screen>
  );
}
