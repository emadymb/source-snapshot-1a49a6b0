import { createFileRoute } from "@tanstack/react-router";
import { ContactsScreen } from "@/components/accounting/Contacts";

export const Route = createFileRoute("/client/accounting/contacts")({ component: ContactsScreen });
