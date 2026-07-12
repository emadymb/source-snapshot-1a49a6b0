import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { downloadCSV, downloadPDF, type ExportColumn } from "@/lib/client/export";
import { useClientRole } from "@/lib/client-role";
import { toast } from "sonner";

/** Split-menu Export button. Emits CSV or PDF using mock rows. Hidden when the
 *  active client role can't export reports. */
export function ExportMenu<T extends Record<string, unknown>>({
  title,
  filenameBase,
  rows,
  columns,
  subtitle,
  variant = "outline",
}: {
  title: string;
  filenameBase: string;
  rows: T[];
  columns: ExportColumn<T>[];
  subtitle?: string;
  variant?: "outline" | "default";
}) {
  const { can } = useClientRole();
  if (!can("reports.export")) return null;
  const stamp = new Date().toISOString().slice(0, 10);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} className="rounded-xl border-glass-border bg-glass">
          <Download className="me-2 size-4" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => { downloadCSV(`${filenameBase}-${stamp}`, rows, columns); toast.success("CSV downloaded"); }}>
          <FileSpreadsheet className="me-2 size-4" /> CSV (.csv)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { downloadPDF(title, rows, columns, { subtitle: subtitle ?? `${rows.length} rows · ${stamp}` }); toast.success("Opening print dialog"); }}>
          <FileText className="me-2 size-4" /> PDF (print)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
