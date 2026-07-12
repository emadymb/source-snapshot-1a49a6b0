import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ReceiptText, FileCode2, Send, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { Screen, KpiGrid, DataCard, DataTable, StatusBadge, Toolbar } from "@/components/screens/RichScreen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  listInvoices,
  accountingSummary,
  generateInvoiceXml,
  sendEInvoice,
  listEInvoiceFormatsFn,
  type InvoiceDTO,
} from "@/lib/accounting.functions";

type FormatId = "UBL" | "FINVOICE" | "XRECHNUNG-UBL" | "XRECHNUNG-CII" | "CII";

export const Route = createFileRoute("/client/accounting/e-invoices")({ component: EInvoices });

const eur = (n: number, cur = "EUR") =>
  new Intl.NumberFormat("fi-FI", { style: "currency", currency: cur }).format(n);

function EInvoices() {
  const qc = useQueryClient();
  const listFn = useServerFn(listInvoices);
  const summaryFn = useServerFn(accountingSummary);
  const xmlFn = useServerFn(generateInvoiceXml);
  const sendFn = useServerFn(sendEInvoice);
  const formatsFn = useServerFn(listEInvoiceFormatsFn);

  const { data: invoices = [], isLoading } = useQuery({ queryKey: ["acc", "invoices"], queryFn: () => listFn() });
  const { data: summary } = useQuery({ queryKey: ["acc", "summary"], queryFn: () => summaryFn() });
  const { data: formats = [] } = useQuery({ queryKey: ["einvoice", "formats"], queryFn: () => formatsFn() });

  const [busyId, setBusyId] = useState<string | null>(null);
  const [format, setFormat] = useState<FormatId>("FINVOICE");
  const [xmlView, setXmlView] = useState<{ number: string; xml: string } | null>(null);

  const kpis = [
    { label: "Revenue (paid)", value: summary ? eur(summary.paid) : "—", tone: "up" as const },
    { label: "Outstanding", value: summary ? eur(summary.outstanding) : "—" },
    { label: "Overdue", value: summary ? eur(summary.overdue) : "—", tone: "down" as const },
    { label: "Invoices", value: summary ? String(summary.invoiceCount) : "—" },
  ];

  const generate = async (inv: InvoiceDTO) => {
    setBusyId(inv.id);
    try {
      const res = await xmlFn({ data: { id: inv.id, format } });
      if (!res.valid) toast.warning(`XML generated with warnings: ${res.error ?? "invalid"}`);
      else toast.success(`${format} XML generated for ${inv.number}`);
      setXmlView({ number: inv.number, xml: res.xml });
      qc.invalidateQueries({ queryKey: ["acc", "invoices"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };


  const send = async (inv: InvoiceDTO) => {
    setBusyId(inv.id);
    try {
      const res = await sendFn({ data: { id: inv.id } });
      res.ok ? toast.success(res.message) : toast.error(res.message);
      qc.invalidateQueries({ queryKey: ["acc", "invoices"] });
      qc.invalidateQueries({ queryKey: ["acc", "summary"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const downloadXml = () => {
    if (!xmlView) return;
    const blob = new Blob([xmlView.xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${xmlView.number}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Screen
      title="e-Invoices"
      description="Fiksu-native e-invoicing — EN 16931 / Finvoice 3.0 / PEPPOL BIS 3.0 / XRechnung. No third-party access point."
      icon={ReceiptText}
      actions={
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Format</span>
          <Select value={format} onValueChange={(v) => setFormat(v as FormatId)}>
            <SelectTrigger className="h-9 w-[240px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(formats.length ? formats : [{ id: format, label: format, description: "" }]).map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      <KpiGrid kpis={kpis} />
      <DataCard title="Outbound queue">
        <Toolbar placeholder="Search invoice or customer…" tabs={["All"]} active="All" />

        <DataTable<InvoiceDTO>
          rows={invoices}
          empty={isLoading ? "Loading…" : "No invoices yet"}
          columns={[
            { key: "number", label: "Invoice #" },
            { key: "customerName", label: "Customer" },
            {
              key: "channel",
              label: "Channel",
              render: (r) => <Badge variant="outline" className="rounded-full">{r.channel}</Badge>,
            },
            { key: "total", label: "Amount", className: "text-right", render: (r) => eur(r.total, r.currency) },
            { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
            { key: "peppolStatus", label: "E-invoice", render: (r) => <StatusBadge status={r.peppolStatus.replace("_", " ")} /> },
            {
              key: "actions",
              label: "",
              className: "text-right",
              render: (r) => (
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" disabled={busyId === r.id} onClick={() => generate(r)}>

                    {busyId === r.id ? <Loader2 className="size-4 animate-spin" /> : <FileCode2 className="size-4" />}
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busyId === r.id} onClick={() => send(r)}>
                    <Send className="size-4" />
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </DataCard>

      <Dialog open={!!xmlView} onOpenChange={(o) => !o && setXmlView(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-4">
              <span>XML — {xmlView?.number}</span>
              <Button size="sm" variant="outline" onClick={downloadXml}><Download className="me-1.5 size-4" />Download</Button>
            </DialogTitle>
          </DialogHeader>
          <pre className="max-h-[60vh] overflow-auto rounded-xl bg-secondary/40 p-4 text-xs">{xmlView?.xml}</pre>
        </DialogContent>
      </Dialog>
    </Screen>
  );
}
