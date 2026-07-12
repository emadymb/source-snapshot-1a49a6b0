import { createFileRoute } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { Screen, KpiGrid, DataCard, DataTable, StatusBadge } from "@/components/screens/RichScreen";

export const Route = createFileRoute("/client/accounting/locations")({ component: Locations });

function Locations() {
  const kpis = [
    { label: "Locations", value: "5" },
    { label: "Warehouses", value: "2" },
    { label: "SKUs tracked", value: "1,842" },
    { label: "Stock value", value: "€ 214,300" },
  ];
  const rows = [
    { code: "HEL-01", name: "Helsinki Central",  type: "Store",     address: "Aleksanterinkatu 12",  staff: 8, status: "active" },
    { code: "HEL-02", name: "Kamppi",            type: "Store",     address: "Urho Kekkosen katu 1", staff: 5, status: "active" },
    { code: "ESP-01", name: "Espoo Mall",        type: "Store",     address: "Piispansilta 11",      staff: 4, status: "active" },
    { code: "WH-01",  name: "Vantaa Warehouse",  type: "Warehouse", address: "Tikkurilantie 44",     staff: 6, status: "active" },
    { code: "WH-02",  name: "Turku Depot",       type: "Warehouse", address: "Satamakatu 9",         staff: 3, status: "pending" },
  ];
  return (
    <Screen title="Locations" description="Multi-store and warehouse tracking." icon={MapPin}>
      <KpiGrid kpis={kpis} />
      <DataCard title="All locations">
        <DataTable rows={rows} columns={[
          { key: "code", label: "Code" },
          { key: "name", label: "Name" },
          { key: "type", label: "Type" },
          { key: "address", label: "Address" },
          { key: "staff", label: "Staff", className: "text-right" },
          { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
        ]} />
      </DataCard>
    </Screen>
  );
}
