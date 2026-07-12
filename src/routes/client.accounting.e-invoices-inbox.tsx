import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Inbox, CheckCircle2, XCircle, CircleDollarSign, Download } from "lucide-react";
import { toast } from "sonner";
import { Screen, DataCard, DataTable, StatusBadge, Toolbar } from "@/components/screens/RichScreen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  listInboundEInvoices,
  updateInboundEInvoiceStatus,
  getInboundEInvoiceXml,
  type InboundEInvoiceDTO,
} from "@/lib/accounting.functions";

export const Route = createFileRoute("/client/accounting/e-invoices-inbox")({
  component: Inbox_,
  head: () => ({
    meta: [
      { title: "E-invoice inbox — Fiksu" },
      { name: "description", content: "Received Finvoice, UBL and CII e-invoices from partners." },
    ],
  }),
});

const eur = (n: number, cur = "EUR") =>
  new Intl.NumberFormat("fi-FI", { style: "currency", currency: cur }).format(n);

function Inbox_() {
  const qc = useQueryClient();
  const listFn = useServerFn(listInboundEInvoices);
  const updateFn = useServerFn(updateInboundEInvoiceStatus);
  const xmlFn = useServerFn(getInboundEInvoiceXml);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["einvoice", "inbound"],
    queryFn: () => listFn(),
  });

  const setStatus = async (r: InboundEInvoiceDTO, status: "APPROVED" | "REJECTED" | "PAID") => {
    try {
      await updateFn({ data: { id: r.id, status } });
      toast.success(`${r.invoiceNumber} → ${status.toLowerCase()}`);
      qc.invalidateQueries({ queryKey: ["einvoice", "inbound"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const download = async (r: InboundEInvoiceDTO) => {
    try {
      const res = await xmlFn({ data: { id: r.id } });
      if (!res) return toast.error("XML not found");
      const blob = new Blob([res.xml], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${r.invoiceNumber}.${res.format.toLowerCase()}.xml`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Screen
      title="E-invoice inbox"
      description="Received Finvoice / UBL / CII invoices. Approve for payment or reject."
      icon={Inbox}
      actions={<span />}
    >
      <DataCard title={`Received (${rows.length})`}>
        <Toolbar placeholder="Search seller or invoice…" tabs={["All"]} active="All" />
        <DataTable<InboundEInvoiceDTO>
          rows={rows}
          empty={isLoading ? "Loading…" : "No inbound e-invoices yet"}
          columns={[
            { key: "invoiceNumber", label: "Invoice #" },
            { key: "sellerName", label: "Seller" },
            {
              key: "format",
              label: "Format",
              render: (r) => <Badge variant="outline" className="rounded-full">{r.format}</Badge>,
            },
            { key: "issueDate", label: "Issued" },
            { key: "dueDate", label: "Due", render: (r) => r.dueDate ?? "—" },
            { key: "total", label: "Amount", className: "text-right", render: (r) => eur(r.total, r.currency) },
            { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status.toLowerCase()} /> },
            {
              key: "actions",
              label: "",
              className: "text-right",
              render: (r) => (
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" title="Download XML" onClick={() => download(r)}>
                    <Download className="size-4" />
                  </Button>
                  <Button size="sm" variant="ghost" title="Approve" onClick={() => setStatus(r, "APPROVED")}>
                    <CheckCircle2 className="size-4" />
                  </Button>
                  <Button size="sm" variant="ghost" title="Mark paid" onClick={() => setStatus(r, "PAID")}>
                    <CircleDollarSign className="size-4" />
                  </Button>
                  <Button size="sm" variant="ghost" title="Reject" onClick={() => setStatus(r, "REJECTED")}>
                    <XCircle className="size-4" />
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </DataCard>
    </Screen>
  );
}
