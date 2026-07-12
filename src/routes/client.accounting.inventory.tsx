import { createFileRoute } from "@tanstack/react-router";
import { ProductsScreen } from "@/components/accounting/Products";

export const Route = createFileRoute("/client/accounting/inventory")({ component: ProductsScreen });
