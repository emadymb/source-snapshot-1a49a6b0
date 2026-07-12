import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { Screen, KpiGrid, DataCard, DataTable, StatusBadge } from "@/components/screens/RichScreen";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/client/accounting/loyalty")({ component: Loyalty });

function Loyalty() {
  const kpis = [
    { label: "Members", value: "12,480", tone: "up" as const, delta: "+312 mo" },
    { label: "Points issued (mo)", value: "482,100" },
    { label: "Redeemed (mo)", value: "148,320" },
    { label: "Redemption rate", value: "30.8%" },
  ];
  const tiers = [
    { tier: "Bronze",   members: 8420, threshold: "€ 0",       reward: "1% cashback",  status: "active" },
    { tier: "Silver",   members: 2810, threshold: "€ 250",     reward: "3% cashback",  status: "active" },
    { tier: "Gold",     members:  980, threshold: "€ 1,000",   reward: "5% + perks",   status: "active" },
    { tier: "Platinum", members:  270, threshold: "€ 5,000",   reward: "8% + VIP",     status: "active" },
  ];
  return (
    <Screen title="Loyalty" description="Membership tiers, points, and redemption rules." icon={Sparkles}>
      <KpiGrid kpis={kpis} />
      <DataCard title="Tiers">
        <DataTable rows={tiers} columns={[
          { key: "tier", label: "Tier", render: (r) => <Badge variant="outline" className="rounded-full">{r.tier}</Badge> },
          { key: "members", label: "Members", className: "text-right" },
          { key: "threshold", label: "Spend threshold" },
          { key: "reward", label: "Reward" },
          { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
        ]} />
      </DataCard>
    </Screen>
  );
}
