import { createFileRoute } from "@tanstack/react-router";
import { ReportsScreen } from "@/components/accounting/Reports";

export const Route = createFileRoute("/client/accounting/analytics")({ component: ReportsScreen });
