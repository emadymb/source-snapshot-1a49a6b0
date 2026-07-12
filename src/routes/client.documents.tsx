import { createFileRoute, Link } from "@tanstack/react-router";
import { PageGate } from "@/components/entitlements/GateBanner";
import { Upload, FileText, Image as ImageIcon, ScanLine, Folder, MoreHorizontal } from "lucide-react";
import { Screen, KpiGrid, DataCard, DataTable, StatusBadge } from "@/components/screens/RichScreen";
import { Button } from "@/components/ui/button";
import { RangeFilterBar, matchesRangeFilter, useRangeFilter } from "@/components/client/RangeFilterBar";
import { UploadReceiptsDialog } from "@/components/client/UploadReceiptsDialog";
import { ExportMenu } from "@/components/client/ExportMenu";
import { useClientRole } from "@/lib/client-role";

export const Route = createFileRoute("/client/documents")({ component: () => (<PageGate feature="documents.enabled" title="Documents vault"><Page /></PageGate>) });

type Doc = { name: string; kind: "Receipt" | "Invoice" | "Contract" | "Statement"; size: string; date: string; ocr: "done" | "pending" | "failed"; folder: string };

const docs: Doc[] = [
  { name: "K-Supermarket_2026-03-04.pdf", kind: "Receipt", size: "182 KB", date: "2026-03-04", ocr: "done", folder: "Groceries" },
  { name: "Nordea_statement_Feb.pdf", kind: "Statement", size: "1.4 MB", date: "2026-03-01", ocr: "done", folder: "Banking" },
  { name: "Lindqvist_agreement.pdf", kind: "Contract", size: "620 KB", date: "2026-02-27", ocr: "pending", folder: "Legal" },
  { name: "INV-2412_Lindqvist.pdf", kind: "Invoice", size: "94 KB", date: "2026-02-25", ocr: "done", folder: "Sales" },
  { name: "R-Kioski_receipt.jpg", kind: "Receipt", size: "1.1 MB", date: "2026-02-22", ocr: "failed", folder: "Meals" },
  { name: "Aleksanterinkatu_rent.pdf", kind: "Invoice", size: "76 KB", date: "2026-02-01", ocr: "done", folder: "Rent" },
];

function Page() {
  const { can } = useClientRole();
  const [filter, setFilter] = useRangeFilter();
  const filtered = docs.filter((d) =>
    matchesRangeFilter(d, filter, {
      text: (r) => `${r.name} ${r.folder}`,
      date: (r) => r.date,
      status: (r) => r.kind.toLowerCase(),
    })
  );
  return (
    <Screen title="Documents" description="Drop receipts, contracts, and statements. OCR runs on upload." icon={Upload}
      actions={
        <>
          <ExportMenu
            title="Documents"
            filenameBase="documents"
            rows={filtered}
            columns={[
              { key: "name", label: "Name" },
              { key: "kind", label: "Type" },
              { key: "folder", label: "Folder" },
              { key: "size", label: "Size" },
              { key: "date", label: "Date" },
              { key: "ocr", label: "OCR" },
            ]}
          />
          <UploadReceiptsDialog />
        </>
      }
    >
      <KpiGrid kpis={[
        { label: "Total files", value: "1,284", delta: "+42 this week", tone: "up" },
        { label: "OCR processed", value: "1,206", delta: "94% success", tone: "up" },
        { label: "Pending review", value: "18", delta: "3 need attention", tone: "flat" },
        { label: "Storage used", value: "3.2 GB", delta: "of 25 GB plan", tone: "flat" },
      ]} />

      <div className="glass rounded-2xl border-glass-border p-6">
        <div className="rounded-2xl border-2 border-dashed border-glass-border bg-secondary/30 p-8 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground">
            <Upload className="size-6" />
          </div>
          <p className="mt-3 font-display text-lg font-semibold">Drop files or scan a receipt</p>
          <p className="mt-1 text-sm text-muted-foreground">PDF, JPG, PNG · up to 20 MB. AI extracts vendor, VAT, and category.</p>
          <div className="mt-4 flex justify-center gap-2">
            <UploadReceiptsDialog
              trigger={
                <Button className="rounded-xl bg-gradient-primary text-primary-foreground" disabled={!can("docs.upload")}>
                  <Upload className="me-2 size-4" />Upload
                </Button>
              }
            />
            <Button asChild variant="outline" className="rounded-xl border-glass-border bg-glass">
              <Link to="/client/scan"><ScanLine className="me-2 size-4" />Scan</Link>
            </Button>
          </div>
        </div>
      </div>

      <RangeFilterBar
        value={filter}
        onChange={setFilter}
        placeholder="Search filename or folder…"
        statuses={[
          { value: "receipt",   label: "Receipts" },
          { value: "invoice",   label: "Invoices" },
          { value: "contract",  label: "Contracts" },
          { value: "statement", label: "Statements" },
        ]}
      />

      <DataCard title={`${filtered.length} documents`}>
        <DataTable
          rows={filtered}
          columns={[
            { key: "name", label: "Name", render: (r) => (
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-secondary">
                  {r.name.endsWith(".jpg") ? <ImageIcon className="size-4" /> : <FileText className="size-4" />}
                </div>
                <span className="font-medium">{r.name}</span>
              </div>
            ) },
            { key: "kind", label: "Type" },
            { key: "folder", label: "Folder", render: (r) => <span className="inline-flex items-center gap-1.5"><Folder className="size-3.5 text-muted-foreground" />{r.folder}</span> },
            { key: "size", label: "Size" },
            { key: "date", label: "Date" },
            { key: "ocr", label: "OCR", render: (r) => <StatusBadge status={r.ocr === "done" ? "resolved" : r.ocr} /> },
            { key: "actions", label: "", render: () => <Button variant="ghost" size="icon" className="size-8" disabled={!can("docs.delete")}><MoreHorizontal className="size-4" /></Button> },
          ]}
        />
      </DataCard>
    </Screen>
  );
}
