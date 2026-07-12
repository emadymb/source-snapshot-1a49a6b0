import { createFileRoute } from "@tanstack/react-router";
import { ChartOfAccountsScreen } from "@/components/accounting/ChartOfAccounts";

export const Route = createFileRoute("/client/accounting/accounts")({ component: ChartOfAccountsScreen });
