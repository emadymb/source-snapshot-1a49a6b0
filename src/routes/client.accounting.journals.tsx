import { createFileRoute } from "@tanstack/react-router";
import { JournalsScreen } from "@/components/accounting/Journals";

export const Route = createFileRoute("/client/accounting/journals")({ component: JournalsScreen });
