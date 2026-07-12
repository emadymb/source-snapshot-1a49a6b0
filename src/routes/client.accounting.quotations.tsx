import { createFileRoute } from "@tanstack/react-router";
import { InvoicesScreen } from "@/components/accounting/Invoices";

export const Route = createFileRoute("/client/accounting/quotations")({ component: InvoicesScreen });
