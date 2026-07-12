import { createFileRoute } from "@tanstack/react-router";
import { ExpensesScreen } from "@/components/accounting/Expenses";
import { PageGate } from "@/components/entitlements/GateBanner";

export const Route = createFileRoute("/client/accounting/purchases")({
  component: () => (
    <PageGate feature="accounting.purchases" title="Purchases">
      <ExpensesScreen />
    </PageGate>
  ),
});
