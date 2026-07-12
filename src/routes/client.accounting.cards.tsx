import { createFileRoute } from "@tanstack/react-router";
import { IdCard } from "lucide-react";
import { Screen, KpiGrid, DataCard, DataTable, StatusBadge, Toolbar } from "@/components/screens/RichScreen";

export const Route = createFileRoute("/client/accounting/cards")({ component: Cards });

function Cards() {
  const kpis = [
    { label: "Active cards", value: "1,284" },
    { label: "Issued this month", value: "48", tone: "up" as const, delta: "+22%" },
    { label: "Virtual", value: "812" },
    { label: "Physical", value: "472" },
  ];
  const rows = [
    { number: "•••• 4021", holder: "Aino Virtanen",   type: "Virtual",  tier: "Gold",     status: "active" },
    { number: "•••• 8873", holder: "Mikko Laine",     type: "Physical", tier: "Silver",   status: "active" },
    { number: "•••• 1120", holder: "Sofia K.",        type: "Virtual",  tier: "Platinum", status: "pending" },
    { number: "•••• 6650", holder: "Jouni Nieminen",  type: "Physical", tier: "Silver",   status: "closed" },
  ];
  return (
    <Screen title="Membership Cards" description="Physical & virtual card issuing." icon={IdCard}>
      <KpiGrid kpis={kpis} />
      <DataCard title="Issued cards">
        <Toolbar placeholder="Search by holder or number…" tabs={["All", "Virtual", "Physical", "Suspended"]} active="All" />
        <DataTable rows={rows} columns={[
          { key: "number", label: "Card" },
          { key: "holder", label: "Holder" },
          { key: "type", label: "Type" },
          { key: "tier", label: "Tier" },
          { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
        ]} />
      </DataCard>
    </Screen>
  );
}
