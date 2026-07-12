import { createFileRoute } from "@tanstack/react-router";
import { LedgerScreen } from "@/components/accounting/Ledger";

export const Route = createFileRoute("/client/accounting/ledger")({ component: LedgerScreen });
