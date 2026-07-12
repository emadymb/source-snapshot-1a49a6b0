import { useEffect, useRef, useState } from "react";
import { Loader2, Upload, Check, Cpu, Download, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { extractReceiptToCsv, type ExtractionResult } from "@/lib/ocr.functions";

type Phase = "idle" | "extracting" | "done";

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ""));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function OcrUploader({ onResult }: { onResult?: (r: ExtractionResult) => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const run = async (file: File) => {
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setError(null);
    setPhase("extracting");

    try {
      const dataUrl = await fileToDataUrl(file);
      const res = await extractReceiptToCsv({ data: { imageDataUrl: dataUrl } });
      setResult(res);
      setPhase("done");
      onResult?.(res);
      if (res.status === "sent_to_accountant") {
        toast.success("تم استخراج الإيصال وإرسال ملف CSV إلى المحاسب");
      } else {
        toast.success("تم استخراج الإيصال — قم بتحميل ملف CSV");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "فشل استخراج الإيصال";
      setError(msg);
      setPhase("idle");
      toast.error(msg);
    }
  };

  const reset = () => {
    setResult(null);
    setPhase("idle");
    setPreview(null);
    setError(null);
  };

  return (
    <div className="space-y-4">
      {phase === "idle" && (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-indigo-200 bg-gradient-to-br from-indigo-50/60 to-white p-8 text-center transition hover:border-indigo-400"
        >
          <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
            <Upload className="size-6" />
          </div>
          <div>
            <p className="font-display text-base font-semibold">ارفع صورة الإيصال</p>
            <p className="mt-1 text-xs text-muted-foreground">
              يتم استخراج الحقول المحاسبية الفنلندية تلقائياً وإرسال CSV إلى المحاسب
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) run(f);
            }}
          />
        </button>
      )}

      {phase === "extracting" && (
        <div className="rounded-3xl border border-glass-border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Loader2 className="size-5 animate-spin text-indigo-600" />
            <p className="text-sm font-medium">
              جاري استخراج الحقول المحاسبية عبر الذكاء الاصطناعي…
            </p>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-2/3 animate-pulse bg-gradient-to-r from-indigo-600 to-violet-600" />
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4 rounded-3xl border border-glass-border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Check className="size-4" />
            </div>
            <h3 className="text-sm font-semibold">تم الاستخراج</h3>
            <span className="ms-auto inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-medium text-indigo-700">
              <Cpu className="size-3" /> {result.model}
            </span>
          </div>

          {result.status === "sent_to_accountant" && (
            <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
              <Send className="size-3.5" /> تم إرسال ملف CSV إلى المحاسب
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 text-xs">
            <Stat label="Supplier" value={result.supplier ?? "—"} />
            <Stat
              label="Total"
              value={
                result.totalAmount !== null
                  ? `${result.totalAmount.toFixed(2)} ${result.currency}`
                  : "—"
              }
            />
            <Stat label="Rows" value={String(result.rows.length)} />
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[720px] text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <Th>Pvm</Th>
                  <Th>Tili</Th>
                  <Th className="text-right">Debet</Th>
                  <Th className="text-right">Kredit</Th>
                  <Th>Kohdennus</Th>
                  <Th>Alv</Th>
                  <Th>Asiakas/Toimittaja</Th>
                  <Th>Selite</Th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((r, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <Td>{r.pvm}</Td>
                    <Td>{r.tili}</Td>
                    <Td className="text-right tabular-nums">
                      {r.debet !== null ? r.debet.toFixed(2) : ""}
                    </Td>
                    <Td className="text-right tabular-nums">
                      {r.kredit !== null ? r.kredit.toFixed(2) : ""}
                    </Td>
                    <Td>{r.kohdennus ?? ""}</Td>
                    <Td>{r.alv !== null ? `${r.alv}%` : ""}</Td>
                    <Td>{r.asiakasToimittaja ?? ""}</Td>
                    <Td>{r.selite}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              className="rounded-xl"
              onClick={() => downloadCsv(result.csv, result.filename)}
            >
              <Download className="me-2 size-4" /> تحميل CSV
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={reset}>
              رفع إيصال آخر
            </Button>
          </div>
        </div>
      )}

      {preview && phase !== "idle" && (
        <img
          src={preview}
          alt=""
          className="mx-auto max-h-52 rounded-2xl border border-glass-border object-contain"
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-glass-border bg-glass p-2 text-center">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate font-display text-sm font-semibold" title={value}>
        {value}
      </p>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-2 py-2 text-left font-medium ${className}`}>{children}</th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-2 py-1.5 align-top ${className}`}>{children}</td>;
}