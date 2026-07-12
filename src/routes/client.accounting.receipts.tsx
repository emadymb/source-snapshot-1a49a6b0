import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ScanText, Download, Send, FileText, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/PagePlaceholder";
import { StatusPill } from "@/components/accounting/DataToolbar";
import { fmt } from "@/lib/format";
import {
  listReceiptExtractions, postReceiptAsExpense,
  type ReceiptExtractionDTO,
} from "@/lib/accounting.functions";

export const Route = createFileRoute("/client/accounting/receipts")({ component: ReceiptsPage });

function downloadCsv(name: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function ReceiptsPage() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["accounting", "receipts"],
    queryFn: () => listReceiptExtractions(),
    staleTime: 15_000,
  });
  const post = useMutation({
    mutationFn: (id: string) => postReceiptAsExpense({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounting", "receipts"] });
      qc.invalidateQueries({ queryKey: ["accounting", "expenses"] });
      toast.success("Posted to Expenses");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const statusTone = (s: string) =>
    s === "posted" ? "success" : s === "sent_to_accountant" ? "info" : "muted";

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeading
        title="Receipt extractions"
        description="Every receipt scanned by AI, with the CSV that was sent to your accountant."
        icon={ScanText}
      />

      <div className="glass rounded-2xl border-glass-border p-6">
        {isLoading && (
          <div className="py-10 text-center text-muted-foreground"><Loader2 className="mx-auto size-4 animate-spin" /></div>
        )}
        {!isLoading && items.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No receipts extracted yet. Use the Scan tool to send your first receipt.
          </div>
        )}
        <div className="space-y-2">
          {items.map((r: ReceiptExtractionDTO) => (
            <div key={r.id} className="rounded-xl border border-glass-border bg-secondary/30">
              <div className="flex flex-wrap items-center gap-3 p-3">
                <button onClick={() => toggle(r.id)} className="flex size-8 items-center justify-center rounded-lg hover:bg-secondary" aria-label="Toggle">
                  {expanded[r.id] ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.supplier ?? "Unknown supplier"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString()} · {r.rowCount} entries · model {r.model}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-sm font-semibold tabular-nums">
                    {r.totalAmount !== null ? fmt.format(r.totalAmount) : "—"}
                  </p>
                  <StatusPill tone={statusTone(r.status)}>{r.status.replace(/_/g, " ")}</StatusPill>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" className="rounded-lg" onClick={() => downloadCsv(`receipt-${r.id.slice(0,8)}.csv`, r.csvContent)}>
                    <Download className="me-1.5 size-4" /> CSV
                  </Button>
                  {r.expenseId ? (
                    <StatusPill tone="success">Posted</StatusPill>
                  ) : (
                    <Button size="sm" className="rounded-lg bg-gradient-primary text-primary-foreground" disabled={post.isPending} onClick={() => post.mutate(r.id)}>
                      <Send className="me-1.5 size-4" /> Post as expense
                    </Button>
                  )}
                </div>
              </div>
              {expanded[r.id] && (
                <div className="border-t border-glass-border p-3">
                  <div className="mb-3 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left uppercase tracking-wider text-muted-foreground">
                          <th className="py-1 pr-2">Pvm</th>
                          <th className="py-1 pr-2">Tili</th>
                          <th className="py-1 pr-2 text-right">Debet</th>
                          <th className="py-1 pr-2 text-right">Kredit</th>
                          <th className="py-1 pr-2">Kohdennus</th>
                          <th className="py-1 pr-2">Alv</th>
                          <th className="py-1 pr-2">Toimittaja</th>
                          <th className="py-1">Selite</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.parsedRows.map((row, i) => (
                          <tr key={i} className="border-t border-glass-border/40">
                            <td className="py-1 pr-2">{row.pvm ?? ""}</td>
                            <td className="py-1 pr-2 font-mono">{row.tili ?? ""}</td>
                            <td className="py-1 pr-2 text-right">{row.debet ?? ""}</td>
                            <td className="py-1 pr-2 text-right">{row.kredit ?? ""}</td>
                            <td className="py-1 pr-2">{row.kohdennus ?? ""}</td>
                            <td className="py-1 pr-2">{row.alv != null ? `${row.alv}%` : ""}</td>
                            <td className="py-1 pr-2">{row.asiakasToimittaja ?? ""}</td>
                            <td className="py-1">{row.selite ?? ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <details className="rounded-lg border border-glass-border bg-white p-2 text-xs">
                    <summary className="cursor-pointer text-muted-foreground"><FileText className="me-1 inline size-3.5" /> CSV sent to accountant</summary>
                    <pre className="mt-2 whitespace-pre-wrap break-all font-mono text-[11px]">{r.csvContent}</pre>
                  </details>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}