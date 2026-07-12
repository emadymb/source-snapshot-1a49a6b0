import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { InvoicesScreen } from "@/components/accounting/Invoices";
import { PageGate } from "@/components/entitlements/GateBanner";
import { ExportMenu } from "@/components/client/ExportMenu";
import { UploadReceiptsDialog } from "@/components/client/UploadReceiptsDialog";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { useClientRole } from "@/lib/client-role";
import { listInvoices } from "@/lib/accounting.functions";

export const Route = createFileRoute("/client/accounting/sales")({
  component: () => (
    <PageGate feature="accounting.invoices" title="Sales invoices">
      <SalesWrapper />
    </PageGate>
  ),
});

function SalesWrapper() {
  const { data: invoices = [] } = useQuery({ queryKey: ["accounting", "invoices"], queryFn: () => listInvoices(), staleTime: 30_000 });
  const { can } = useClientRole();
  const rows = invoices.map((i) => ({
    number: i.number,
    customer: i.customerName,
    issued: i.issueDate,
    due: i.dueDate ?? "",
    status: i.status,
    total: i.total.toFixed(2),
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
