import { createFileRoute } from "@tanstack/react-router";
import { DollarSign } from "lucide-react";
import { Screen, KpiGrid, DataCard, DataTable, StatusBadge } from "@/components/screens/RichScreen";

export const Route = createFileRoute("/client/accounting/commissions")({ component: Commissions });

function Commissions() {
  const kpis = [
    { label: "Payable (mo)", value: "€ 4,820", tone: "up" as const, delta: "+11%" },
    { label: "Reps active", value: "8" },
    { label: "Deals closed", value: "42" },
    { label: "Avg rate", value: "6.5%" },
  ];
  const rows = [
    { rep: "Aino V.",   deals: 12, revenue: "€ 24,120", rate: "7.0%", commission: "€ 1,688.40", status: "pending" },
    { rep: "Mikko L.",  deals:  9, revenue: "€ 18,940", rate: "6.5%", commission: "€ 1,231.10", status: "pending" },
    { rep: "Sofia K.",  deals: 11, revenue: "€ 21,300", rate: "6.0%", commission: "€ 1,278.00", status: "paid" },
    { rep: "Jouni N.",  deals: 10, revenue: "€ 17,850", rate: "5.5%", commission: "€    981.75", status: "paid" },
  ];
  return (
    <Screen title="Commissions" description="Sales commissions and bonus schemes." icon={DollarSign}>
      <KpiGrid kpis={kpis} />
      <DataCard title="Commissions this month">
        <DataTable rows={rows} columns={[
          { key: "rep", label: "Rep" },
          { key: "deals", label: "Deals" },
          { key: "revenue", label: "Revenue", className: "text-right" },
          { key: "rate", label: "Rate", className: "text-right" },
          { key: "commission", label: "Commission", className: "text-right" },
          { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
        ]} />
      </DataCard>
    </Screen>
  );
}
