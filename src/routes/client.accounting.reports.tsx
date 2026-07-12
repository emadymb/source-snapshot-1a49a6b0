import { createFileRoute } from "@tanstack/react-router";
import { ReportsScreen } from "@/components/accounting/Reports";
import { PageGate } from "@/components/entitlements/GateBanner";

export const Route = createFileRoute("/client/accounting/reports")({
  component: () => (
    <PageGate feature="reports.standard" title="Reports">
      <ReportsScreen />
    </PageGate>
  ),
});
