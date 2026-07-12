import { createFileRoute } from "@tanstack/react-router";
import { Landmark } from "lucide-react";
import { Screen, KpiGrid, DataCard, DataTable, StatusBadge } from "@/components/screens/RichScreen";

export const Route = createFileRoute("/client/accounting/cash-boxes")({ component: CashBoxes });

function CashBoxes() {
  const kpis = [
    { label: "Open tills", value: "3 / 4" },
    { label: "Cash on hand", value: "€ 4,820" },
    { label: "Today's sales", value: "€ 12,340" },
    { label: "Variance (mo)", value: "€ -18.40", tone: "down" as const },
  ];
  const rows = [
    { name: "Till 01 — Front",  cashier: "Aino V.",   opened: "07:55", counted: "€ 1,200.00", expected: "€ 1,200.00", diff: "€ 0.00",    status: "open" },
    { name: "Till 02 — Café",   cashier: "Elina K.",  opened: "07:00", counted: "€    842.50", expected: "€    850.00", diff: "€ -7.50",  status: "open" },
    { name: "Till 03 — Bar",    cashier: "Mikko L.",  opened: "10:12", counted: "€ 1,975.00", expected: "€ 1,975.00", diff: "€ 0.00",    status: "open" },
    { name: "Till 04 — Kiosk",  cashier: "—",         opened: "—",     counted: "—",           expected: "—",           diff: "—",         status: "closed" },
  ];
  return (
    <Screen title="Cash Boxes" description="Till reconciliation and end-of-day counts." icon={Landmark}>
      <KpiGrid kpis={kpis} />
      <DataCard title="Registers">
        <DataTable rows={rows} columns={[
          { key: "name", label: "Register" },
          { key: "cashier", label: "Cashier" },
          { key: "opened", label: "Opened" },
          { key: "counted", label: "Counted", className: "text-right" },
          { key: "expected", label: "Expected", className: "text-right" },
          { key: "diff", label: "Variance", className: "text-right" },
          { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
        ]} />
      </DataCard>
    </Screen>
  );
}
