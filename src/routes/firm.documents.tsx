import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import * as XLSX from "xlsx";
import {
  FileText, Upload, Download, Search, Folder, FileSpreadsheet, FileImage, FileArchive,
  Eye, Trash2, Sparkles, CheckCircle2, X, Lock, UploadCloud, Tag,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n";
import { useFirm } from "@/lib/mock/firm";
import { PageGate } from "@/components/entitlements/GateBanner";
import { useEntitlement } from "@/lib/entitlements/store";

export const Route = createFileRoute("/firm/documents")({
  component: () => (
    <PageGate feature="firm.documents" title="Client documents vault" description="Enable the Documents vault feature on the workspace plan.">
      <DocumentsPage />
    </PageGate>
  ),
});

type Kind = "invoice" | "bank" | "contract" | "tax" | "payroll" | "report" | "other";

interface ExtractedField { label: string; value: string; confidence: number }
interface ExtractedTableRow { [k: string]: string | number }

interface Doc {
  id: string;
  name: string;
  clientId: string;
  kind: Kind;
  ext: "pdf" | "xlsx" | "png" | "zip" | "docx";
  size: string;
  uploadedBy: string;
  uploadedAt: string;
  confidential: boolean;
  extracted?: {
    summary: string;
    fields: ExtractedField[];
    lineItems?: { columns: string[]; rows: ExtractedTableRow[] };
  };
}

const KIND_TONE: Record<Kind, string> = {
  invoice: "border-emerald-200 bg-emerald-50 text-emerald-700",
  bank: "border-sky-200 bg-sky-50 text-sky-700",
  contract: "border-violet-200 bg-violet-50 text-violet-700",
  tax: "border-amber-200 bg-amber-50 text-amber-700",
  payroll: "border-indigo-200 bg-indigo-50 text-indigo-700",
  report: "border-rose-200 bg-rose-50 text-rose-700",
  other: "border-slate-200 bg-slate-100 text-slate-600",
};

const EXT_ICON = {
  pdf: FileText, xlsx: FileSpreadsheet, docx: FileText, png: FileImage, zip: FileArchive,
} as const;

const SEED: Doc[] = [
  {
    id: "d_01", name: "Lindqvist_VAT_Q1_2026.pdf", clientId: "c_001", kind: "tax", ext: "pdf",
    size: "412 KB", uploadedBy: "s_003", uploadedAt: "2026-03-08", confidential: true,
    extracted: {
      summary: "Q1 2026 VAT return summary — €4,820 payable to Vero.fi, due 12 May 2026.",
      fields: [
        { label: "Filing period", value: "Q1 2026", confidence: 0.99 },
        { label: "Business ID", value: "FI12345678", confidence: 0.98 },
        { label: "Sales VAT 24%", value: "€6,410.00", confidence: 0.96 },
        { label: "Sales VAT 14%", value: "€820.00", confidence: 0.95 },
        { label: "Deductible VAT", value: "€2,410.00", confidence: 0.94 },
        { label: "Net payable", value: "€4,820.00", confidence: 0.97 },
        { label: "Due date", value: "2026-05-12", confidence: 0.99 },
      ],
      lineItems: {
        columns: ["Category", "Base", "Rate", "VAT"],
        rows: [
          { Category: "Standard sales", Base: "€26,708", Rate: "24%", VAT: "€6,410" },
          { Category: "Reduced sales", Base: "€5,857", Rate: "14%", VAT: "€820" },
          { Category: "Purchases deductible", Base: "€10,041", Rate: "24%", VAT: "-€2,410" },
        ],
      },
    },
  },
  {
    id: "d_02", name: "K-Ryhma_Annual_Close_2025.xlsx", clientId: "c_003", kind: "report", ext: "xlsx",
    size: "1.8 MB", uploadedBy: "s_004", uploadedAt: "2026-03-07", confidential: true,
    extracted: {
      summary: "2025 statutory close — Revenue €4.82M, Net income €612K, Assets €3.19M.",
      fields: [
        { label: "Fiscal year", value: "2025", confidence: 0.99 },
        { label: "Revenue", value: "€4,820,000", confidence: 0.96 },
        { label: "COGS", value: "€2,984,000", confidence: 0.94 },
        { label: "Operating income", value: "€784,000", confidence: 0.93 },
        { label: "Net income", value: "€612,000", confidence: 0.95 },
        { label: "Total assets", value: "€3,190,000", confidence: 0.96 },
        { label: "Total equity", value: "€1,842,000", confidence: 0.94 },
      ],
    },
  },
  {
    id: "d_03", name: "Verkkokauppa_Payroll_Feb.pdf", clientId: "c_004", kind: "payroll", ext: "pdf",
    size: "298 KB", uploadedBy: "s_005", uploadedAt: "2026-03-06", confidential: true,
    extracted: {
      summary: "February 2026 payroll — 14 employees, gross €48,200, net €31,984 paid 28 Feb.",
      fields: [
        { label: "Pay period", value: "Feb 2026", confidence: 0.99 },
        { label: "Employees", value: "14", confidence: 0.99 },
        { label: "Gross pay", value: "€48,200.00", confidence: 0.97 },
        { label: "Withholding tax", value: "€10,940.00", confidence: 0.96 },
        { label: "TyEL pension", value: "€3,568.00", confidence: 0.95 },
        { label: "Net paid", value: "€31,984.00", confidence: 0.97 },
        { label: "Payment date", value: "2026-02-28", confidence: 0.99 },
      ],
      lineItems: {
        columns: ["Employee", "Gross", "Tax", "Net"],
        rows: [
          { Employee: "A. Virta", Gross: "€4,200", Tax: "€1,050", Net: "€2,760" },
          { Employee: "M. Salo", Gross: "€3,800", Tax: "€912", Net: "€2,528" },
          { Employee: "S. Koski", Gross: "€3,600", Tax: "€864", Net: "€2,394" },
          { Employee: "+ 11 others", Gross: "€36,600", Tax: "€8,114", Net: "€24,302" },
        ],
      },
    },
  },
  {
    id: "d_04", name: "Aalto_Engagement_Letter.docx", clientId: "c_002", kind: "contract", ext: "docx",
    size: "88 KB", uploadedBy: "s_002", uploadedAt: "2026-02-28", confidential: false,
    extracted: {
      summary: "Advisory retainer — €300/month, 12-month term starting Nov 2025.",
      fields: [
        { label: "Counterparty", value: "Aalto Design Oy", confidence: 0.99 },
        { label: "Effective date", value: "2025-11-01", confidence: 0.98 },
        { label: "Term", value: "12 months", confidence: 0.97 },
        { label: "Monthly fee", value: "€300.00", confidence: 0.98 },
        { label: "Notice period", value: "30 days", confidence: 0.94 },
      ],
    },
  },
  {
    id: "d_05", name: "Lindqvist_Bank_Feb.pdf", clientId: "c_001", kind: "bank", ext: "pdf",
    size: "156 KB", uploadedBy: "s_005", uploadedAt: "2026-02-27", confidential: true,
    extracted: {
      summary: "Nordea statement Feb 2026 — 87 transactions, opening €12,410, closing €18,240.",
      fields: [
        { label: "Account", value: "FI21 1234 5600 0007 85", confidence: 0.99 },
        { label: "Statement period", value: "01–29 Feb 2026", confidence: 0.98 },
        { label: "Opening balance", value: "€12,410.00", confidence: 0.99 },
        { label: "Closing balance", value: "€18,240.00", confidence: 0.99 },
        { label: "Credits", value: "€24,860.00", confidence: 0.96 },
        { label: "Debits", value: "€19,030.00", confidence: 0.96 },
        { label: "Transactions", value: "87", confidence: 0.99 },
      ],
    },
  },
  { id: "d_06", name: "Cafe_Regatta_CoA.xlsx", clientId: "c_005", kind: "other", ext: "xlsx", size: "42 KB", uploadedBy: "s_003", uploadedAt: "2026-02-25", confidential: false },
  { id: "d_07", name: "Turku_Tech_2024_archive.zip", clientId: "c_006", kind: "other", ext: "zip", size: "24 MB", uploadedBy: "s_004", uploadedAt: "2026-02-20", confidential: false },
  {
    id: "d_08", name: "K-Ryhma_Receipt_scan_142.png", clientId: "c_003", kind: "invoice", ext: "png",
    size: "1.2 MB", uploadedBy: "s_005", uploadedAt: "2026-02-19", confidential: false,
    extracted: {
      summary: "Supplier invoice #142 — Kesko Oyj, €1,284.60 including €248.60 VAT.",
      fields: [
        { label: "Supplier", value: "Kesko Oyj", confidence: 0.97 },
        { label: "Invoice #", value: "142", confidence: 0.99 },
        { label: "Invoice date", value: "2026-02-15", confidence: 0.98 },
        { label: "Due date", value: "2026-03-01", confidence: 0.97 },
        { label: "Net", value: "€1,036.00", confidence: 0.96 },
        { label: "VAT 24%", value: "€248.60", confidence: 0.95 },
        { label: "Total", value: "€1,284.60", confidence: 0.98 },
      ],
    },
  },
];

function DocumentsPage() {
  const { t } = useI18n();
  const { clients, staff } = useFirm();
  const ocr = useEntitlement("firm.documents.ocr");
  const exportEnt = useEntitlement("firm.documents.export");
  const [docs, setDocs] = useState<Doc[]>(SEED);
  const [q, setQ] = useState("");
  const [clientId, setClientId] = useState("all");
  const [kind, setKind] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const filtered = useMemo(() => docs.filter(d =>
    (clientId === "all" || d.clientId === clientId) &&
    (kind === "all" || d.kind === kind) &&
    (!q || d.name.toLowerCase().includes(q.toLowerCase()))
  ), [docs, clientId, kind, q]);

  const byClient = useMemo(() => {
    const map = new Map<string, number>();
    docs.forEach(d => map.set(d.clientId, (map.get(d.clientId) ?? 0) + 1));
    return clients.map(c => ({ ...c, count: map.get(c.id) ?? 0 })).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [docs, clients]);

  const openDoc = docs.find(d => d.id === openId) ?? null;

  const exportOne = (doc: Doc) => {
    if (!exportEnt.on) { toast.error("Excel export not in current plan"); return; }
    if (!doc.extracted) { toast.error("Nothing extracted from this file"); return; }
    const wb = XLSX.utils.book_new();
    const fields = doc.extracted.fields.map(f => ({ Field: f.label, Value: f.value, Confidence: f.confidence }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fields), "Extracted");
    if (doc.extracted.lineItems) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(doc.extracted.lineItems.rows, { header: doc.extracted.lineItems.columns }), "Line items");
    }
    const meta = [{
      File: doc.name, Client: clients.find(c => c.id === doc.clientId)?.name ?? "",
      Kind: doc.kind, Uploaded: doc.uploadedAt, Summary: doc.extracted.summary,
    }];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(meta), "Meta");
    XLSX.writeFile(wb, doc.name.replace(/\.[^.]+$/, "") + "_extracted.xlsx");
    toast.success("Excel exported");
  };

  const exportAll = () => {
    if (!exportEnt.on) { toast.error("Excel export not in current plan"); return; }
    const targets = filtered.filter(d => d.extracted);
    if (!targets.length) { toast.error("No extracted data to export"); return; }
    const wb = XLSX.utils.book_new();
    const flat = targets.flatMap(d => d.extracted!.fields.map(f => ({
      File: d.name,
      Client: clients.find(c => c.id === d.clientId)?.name ?? "",
      Kind: d.kind,
      Uploaded: d.uploadedAt,
      Field: f.label,
      Value: f.value,
      Confidence: f.confidence,
    })));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(flat), "All fields");
    const summary = targets.map(d => ({
      File: d.name,
      Client: clients.find(c => c.id === d.clientId)?.name ?? "",
      Kind: d.kind,
      Uploaded: d.uploadedAt,
      Summary: d.extracted!.summary,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), "Summaries");
    XLSX.writeFile(wb, `firm_extracted_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`Exported ${targets.length} documents`);
  };

  const totalSize = docs.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t("firm.documents.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("firm.documents.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={!exportEnt.on}
            onClick={exportAll}
            title={exportEnt.on ? "" : "Not in current plan"}
          >
            {exportEnt.on ? <FileSpreadsheet className="me-1.5 size-4" /> : <Lock className="me-1.5 size-4" />}
            Export all to Excel
          </Button>
          <Button onClick={() => setUploadOpen(true)} className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md">
            <Upload className="me-1.5 size-4" />Upload
          </Button>
        </div>
      </div>

      {!ocr.on && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <Sparkles className="mt-0.5 size-4 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">OCR & data extraction is not in this workspace's plan.</p>
            <p className="text-xs">Files upload and preview normally, but extracted fields and Excel export require the Scale plan or higher.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Documents" value={String(totalSize)} icon={FileText} tone="text-emerald-600" />
        <Kpi label="Clients with files" value={String(new Set(docs.map(d => d.clientId)).size)} icon={Folder} tone="text-indigo-600" />
        <Kpi label="Extracted" value={ocr.on ? String(docs.filter(d => d.extracted).length) : "—"} icon={Sparkles} tone="text-violet-600" />
        <Kpi label="This month" value={String(docs.filter(d => d.uploadedAt.startsWith("2026-03")).length)} icon={Upload} tone="text-amber-600" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_1fr]">
        <aside className="space-y-3">
          <section className="rounded-2xl border border-glass-border bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top folders</h3>
            <ul className="space-y-1">
              <li>
                <button onClick={() => setClientId("all")} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition ${clientId === "all" ? "bg-emerald-50 text-emerald-700" : "hover:bg-slate-100"}`}>
                  <Folder className="size-4" /><span className="flex-1 text-start">All clients</span>
                  <span className="text-xs text-muted-foreground">{docs.length}</span>
                </button>
              </li>
              {byClient.map(c => (
                <li key={c.id}>
                  <button onClick={() => setClientId(c.id)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition ${clientId === c.id ? "bg-emerald-50 text-emerald-700" : "hover:bg-slate-100"}`}>
                    <Folder className="size-4 opacity-70" /><span className="flex-1 truncate text-start">{c.name}</span>
                    <span className="text-xs text-muted-foreground">{c.count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-glass-border bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Filter by type</h3>
            <div className="flex flex-wrap gap-1.5">
              {(["all", "invoice", "bank", "contract", "tax", "payroll", "report", "other"] as const).map(k => (
                <button key={k} onClick={() => setKind(k)} className={`rounded-lg border px-2.5 py-1 text-xs capitalize transition ${kind === k ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"}`}>
                  {k}
                </button>
              ))}
            </div>
          </section>
        </aside>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search file name…" className="rounded-xl ps-10" />
            </div>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger className="w-36 rounded-xl xl:hidden"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {(["invoice", "bank", "contract", "tax", "payroll", "report", "other"] as Kind[]).map(k => (
                  <SelectItem key={k} value={k} className="capitalize">{k}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-hidden rounded-2xl border border-glass-border bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">File</th>
                  <th className="px-4 py-3 text-start font-medium">Client</th>
                  <th className="px-4 py-3 text-start font-medium">Type</th>
                  <th className="px-4 py-3 text-start font-medium">Uploaded</th>
                  <th className="px-4 py-3 text-start font-medium">Extraction</th>
                  <th className="px-4 py-3 text-end font-medium">Size</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(d => {
                  const Icon = EXT_ICON[d.ext] ?? FileText;
                  const c = clients.find(x => x.id === d.clientId);
                  const u = staff.find(x => x.id === d.uploadedBy);
                  const hasExtract = ocr.on && !!d.extracted;
                  return (
                    <tr key={d.id} className="cursor-pointer hover:bg-slate-50/50" onClick={() => setOpenId(d.id)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Icon className="size-4" /></div>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{d.name}</p>
                            {d.confidential && <p className="text-[10px] font-medium uppercase text-rose-600">Confidential</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{c?.name}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`rounded-lg capitalize ${KIND_TONE[d.kind]}`}>{d.kind}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        <p>{d.uploadedAt}</p>
                        <p>by {u?.name.split(" ")[0]}</p>
                      </td>
                      <td className="px-4 py-3">
                        {hasExtract ? (
                          <Badge variant="outline" className="rounded-lg border-violet-200 bg-violet-50 text-violet-700">
                            <CheckCircle2 className="me-1 size-3" />Ready
                          </Badge>
                        ) : d.extracted && !ocr.on ? (
                          <Badge variant="outline" className="rounded-lg border-slate-200 bg-slate-100 text-slate-500">
                            <Lock className="me-1 size-3" />Locked
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-end tabular-nums text-muted-foreground">{d.size}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" className="rounded-lg" onClick={() => setOpenId(d.id)}><Eye className="size-4" /></Button>
                          <Button size="icon" variant="ghost" className="rounded-lg" disabled={!hasExtract || !exportEnt.on} onClick={() => exportOne(d)} title={!hasExtract ? "No extracted data" : exportEnt.on ? "Export extracted data" : "Excel export not in plan"}>
                            {exportEnt.on ? <FileSpreadsheet className="size-4" /> : <Lock className="size-4" />}
                          </Button>
                          <Button size="icon" variant="ghost" className="rounded-lg" onClick={() => toast.success("Download started")}><Download className="size-4" /></Button>
                          <Button size="icon" variant="ghost" className="rounded-lg text-slate-400 hover:text-rose-600" onClick={() => { setDocs(p => p.filter(x => x.id !== d.id)); toast.success("Deleted"); }}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground"><FileText className="mx-auto mb-2 size-6 opacity-40" />No documents match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Sheet open={!!openDoc} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
          {openDoc && (
            <DocPreview
              doc={openDoc}
              clientName={clients.find(c => c.id === openDoc.clientId)?.name ?? ""}
              ocrOn={ocr.on}
              exportOn={exportEnt.on}
              onExport={() => exportOne(openDoc)}
              onClose={() => setOpenId(null)}
            />
          )}
        </SheetContent>
      </Sheet>

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        clients={clients}
        onUpload={(newDocs) => setDocs((prev) => [...newDocs, ...prev])}
      />
    </div>
  );
}

type ClientOpt = { id: string; name: string };

function inferKind(filename: string): Kind {
  const n = filename.toLowerCase();
  if (n.includes("payroll") || n.includes("palkka")) return "payroll";
  if (n.includes("vat") || n.includes("tax") || n.includes("alv") || n.includes("vero")) return "tax";
  if (n.includes("bank") || n.includes("nordea") || n.includes("op") || n.includes("statement")) return "bank";
  if (n.includes("contract") || n.includes("sopimus") || n.includes("engagement")) return "contract";
  if (n.includes("report") || n.includes("close") || n.includes("annual")) return "report";
  if (n.includes("invoice") || n.includes("receipt") || n.includes("lasku")) return "invoice";
  return "other";
}
function inferExt(filename: string): Doc["ext"] {
  const e = filename.split(".").pop()?.toLowerCase();
  if (e === "pdf" || e === "xlsx" || e === "docx" || e === "png" || e === "zip") return e;
  if (e === "jpg" || e === "jpeg" || e === "webp") return "png";
  if (e === "xls" || e === "csv") return "xlsx";
  return "pdf";
}
function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function UploadDialog({
  open, onOpenChange, clients, onUpload,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clients: ClientOpt[];
  onUpload: (docs: Doc[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [clientId, setClientId] = useState<string>(clients[0]?.id ?? "");
  const [kind, setKind] = useState<Kind>("invoice");
  const [confidential, setConfidential] = useState(true);
  const [dragging, setDragging] = useState(false);

  const addFiles = (list: FileList | File[]) => {
    setFiles((prev) => [...prev, ...Array.from(list)]);
  };
  const removeAt = (i: number) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const submit = () => {
    if (!files.length) { toast.error("Pick at least one file"); return; }
    if (!clientId) { toast.error("Assign a client"); return; }
    const today = new Date().toISOString().slice(0, 10);
    const newDocs: Doc[] = files.map((f, i) => ({
      id: `d_new_${Date.now()}_${i}`,
      name: f.name,
      clientId,
      kind: kind === ("auto" as Kind) ? inferKind(f.name) : kind,
      ext: inferExt(f.name),
      size: humanSize(f.size),
      uploadedBy: "s_001",
      uploadedAt: today,
      confidential,
    }));
    onUpload(newDocs);
    toast.success(`${files.length} file${files.length > 1 ? "s" : ""} uploaded`);
    setFiles([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <UploadCloud className="size-5 text-emerald-600" />Upload documents
          </DialogTitle>
          <DialogDescription>Attach files to a client, tag them, and (on Scale) let OCR extract structured fields.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition ${dragging ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-slate-50/60 hover:border-emerald-300 hover:bg-emerald-50/40"}`}
          >
            <div className="flex size-11 items-center justify-center rounded-xl bg-white shadow-sm">
              <UploadCloud className="size-5 text-emerald-600" />
            </div>
            <p className="text-sm font-medium">Drop files here or click to browse</p>
            <p className="text-xs text-muted-foreground">PDF, XLSX, DOCX, PNG, JPG, ZIP · up to 50 MB each</p>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
          </div>

          {files.length > 0 && (
            <ul className="max-h-40 space-y-1.5 overflow-y-auto rounded-xl border border-slate-100 bg-white p-2">
              {files.map((f, i) => (
                <li key={i} className="flex items-center gap-2 rounded-lg bg-slate-50/70 px-2.5 py-1.5 text-sm">
                  <FileText className="size-4 shrink-0 text-slate-500" />
                  <span className="flex-1 truncate">{f.name}</span>
                  <span className="text-xs text-muted-foreground">{humanSize(f.size)}</span>
                  <button onClick={() => removeAt(i)} className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-rose-600" aria-label="Remove">
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Tag</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
                <SelectTrigger className="rounded-xl">
                  <span className="flex items-center gap-1.5"><Tag className="size-3.5" /><SelectValue /></span>
                </SelectTrigger>
                <SelectContent>
                  {(["invoice", "bank", "contract", "tax", "payroll", "report", "other"] as Kind[]).map((k) => (
                    <SelectItem key={k} value={k} className="capitalize">{k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-3">
            <div>
              <Label className="text-sm font-medium">Confidential</Label>
              <p className="text-xs text-muted-foreground">Only firm staff assigned to this client can preview.</p>
            </div>
            <Switch checked={confidential} onCheckedChange={setConfidential} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancel</Button>
          <Button onClick={submit} className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
            <Upload className="me-1.5 size-4" />Upload {files.length ? `(${files.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function DocPreview({ doc, clientName, ocrOn, exportOn, onExport, onClose }: {
  doc: Doc; clientName: string; ocrOn: boolean; exportOn: boolean; onExport: () => void; onClose: () => void;
}) {
  const Icon = EXT_ICON[doc.ext] ?? FileText;
  return (
    <>
      <SheetHeader className="text-start">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 text-white">
              <Icon className="size-5" />
            </div>
            <div>
              <SheetTitle className="font-display text-lg">{doc.name}</SheetTitle>
              <SheetDescription className="text-xs">
                {clientName} · <span className="capitalize">{doc.kind}</span> · {doc.size} · uploaded {doc.uploadedAt}
              </SheetDescription>
            </div>
          </div>
          <Button size="icon" variant="ghost" className="rounded-lg" onClick={onClose}><X className="size-4" /></Button>
        </div>
      </SheetHeader>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-[1fr_1.2fr]">
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-white shadow-sm"><Icon className="size-7 text-slate-500" /></div>
          <p className="mt-3 text-sm font-medium">{doc.name}</p>
          <p className="text-xs text-muted-foreground">Preview rendering — {doc.ext.toUpperCase()} · {doc.size}</p>
          <Button variant="outline" size="sm" className="mt-4 rounded-lg" onClick={() => toast.success("Download started")}>
            <Download className="me-1.5 size-3.5" />Download original
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="flex items-center gap-1.5 font-display text-base font-semibold">
              <Sparkles className="size-4 text-violet-600" />Extracted data
            </h4>
            <Button size="sm" variant="outline" className="rounded-lg" disabled={!doc.extracted || !ocrOn || !exportOn} onClick={onExport}>
              {exportOn ? <FileSpreadsheet className="me-1.5 size-3.5" /> : <Lock className="me-1.5 size-3.5" />}
              Export .xlsx
            </Button>
          </div>

          {!doc.extracted ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-muted-foreground">
              No structured data was extracted from this file.
            </div>
          ) : !ocrOn ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="flex items-center gap-1.5 font-medium"><Lock className="size-4" />OCR extraction locked</p>
              <p className="mt-1 text-xs">Upgrade the workspace to the Scale plan to unlock the extracted fields and Excel export.</p>
            </div>
          ) : (
            <>
              <p className="rounded-xl bg-violet-50 p-3 text-xs leading-relaxed text-violet-900">{doc.extracted.summary}</p>
              <dl className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {doc.extracted.fields.map(f => (
                  <div key={f.label} className="flex items-baseline justify-between gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2">
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{f.label}</dt>
                    <dd className="text-end">
                      <p className="text-sm font-semibold tabular-nums">{f.value}</p>
                      <p className={`text-[10px] ${f.confidence > 0.95 ? "text-emerald-600" : f.confidence > 0.9 ? "text-amber-600" : "text-rose-600"}`}>
                        {Math.round(f.confidence * 100)}% conf.
                      </p>
                    </dd>
                  </div>
                ))}
              </dl>

              {doc.extracted.lineItems && (
                <div className="overflow-hidden rounded-xl border border-slate-100">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                      <tr>
                        {doc.extracted.lineItems.columns.map(c => (
                          <th key={c} className="px-3 py-2 text-start font-medium">{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {doc.extracted.lineItems.rows.map((r, i) => (
                        <tr key={i}>
                          {doc.extracted!.lineItems!.columns.map(c => (
                            <td key={c} className="px-3 py-2 tabular-nums">{r[c]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function Kpi({ label, value, icon: Icon, tone }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; tone: string }) {
  return (
    <article className="rounded-2xl border border-glass-border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <Icon className={`size-4 ${tone}`} />
      </div>
      <p className={`mt-1 font-display text-2xl font-semibold tabular-nums ${tone}`}>{value}</p>
    </article>
  );
}
