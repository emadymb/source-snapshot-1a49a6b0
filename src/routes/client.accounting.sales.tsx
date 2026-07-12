import { createFileRoute } from "@tanstack/react-router";
import { InvoicesScreen } from "@/components/accounting/Invoices";
import { PageGate } from "@/components/entitlements/GateBanner";
import { ExportMenu } from "@/components/client/ExportMenu";
import { UploadReceiptsDialog } from "@/components/client/UploadReceiptsDialog";
import { useStore, invoiceTotal } from "@/lib/mock/store";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { useClientRole } from "@/lib/client-role";

export const Route = createFileRoute("/client/accounting/sales")({
  component: () => (
    <PageGate feature="accounting.invoices" title="Sales invoices">
      <SalesWrapper />
    </PageGate>
  ),
});

function SalesWrapper() {
  const invoices = useStore((s) => s.invoices);
  const contacts = useStore((s) => s.contacts);
  const { can } = useClientRole();
  const rows = invoices.map((i) => ({
    number: i.number,
    customer: contacts.find((c) => c.id === i.contactId)?.name ?? "—",
    issued: i.issueDate,
    due: i.dueDate,
    status: i.status,
    total: invoiceTotal(i).total.toFixed(2),
  }));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <UploadReceiptsDialog
          defaultDocType="invoice"
          trigger={
            <Button variant="outline" className="rounded-xl border-glass-border bg-glass" disabled={!can("docs.upload")}>
              <Upload className="me-1.5 size-4" /> Upload invoice
            </Button>
          }
        />
        <ExportMenu
          title="Sales invoices"
          filenameBase="invoices"
          rows={rows}
          columns={[
            { key: "number", label: "Number" },
            { key: "customer", label: "Customer" },
            { key: "issued", label: "Issued" },
            { key: "due", label: "Due" },
            { key: "total", label: "Total (€)" },
            { key: "status", label: "Status" },
          ]}
        />
      </div>
      <InvoicesScreen />
    </div>
  );
}
