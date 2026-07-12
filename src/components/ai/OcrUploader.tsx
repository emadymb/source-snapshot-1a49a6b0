import { useEffect, useRef, useState } from "react";
import { Loader2, Upload, Sparkles, Check, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { aiStore, pickRouteOrder, type AiModelName } from "@/lib/mock/ai";
import { ocrFallback } from "@/lib/ai.functions";

type OcrResult = {
  text: string;
  model: AiModelName;
  confidence: number;
  totalCost: number;
  attempts: { model: AiModelName; success: boolean; ms: number; cost: number }[];
};

export function OcrUploader({ onResult, workspaceId = "ws_demo" }: { onResult?: (r: OcrResult) => void; workspaceId?: string }) {
  const [phase, setPhase] = useState<"idle" | "local" | "fallback" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<OcrResult | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result ?? ""));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });

  const run = async (file: File) => {
    setPreview(URL.createObjectURL(file));
    setPhase("local");
    setProgress(0);
    setResult(null);

    const t0 = performance.now();
    let localText = "";
    let confidence = 0;

    try {
      const { default: Tesseract } = await import("tesseract.js");
      const res = await Tesseract.recognize(file, "eng+fin", {
        logger: (m) => {
          if (m.status === "recognizing text") setProgress(Math.round(m.progress * 100));
        },
      });
      localText = res.data.text ?? "";
      confidence = res.data.confidence ?? 0;
    } catch (e) {
      confidence = 0;
      localText = "";
      console.error(e);
    }

    const localMs = performance.now() - t0;
    aiStore.logUsage({
      workspaceId,
      modelName: "tesseract",
      operation: "ocr",
      inputTokens: 0,
      outputTokens: Math.ceil(localText.length / 4),
      cost: 0,
      success: confidence >= 85,
      processingTime: Math.floor(localMs),
    });

    if (confidence >= 85 && localText.trim().length > 20) {
      const r: OcrResult = {
        text: localText,
        model: "tesseract",
        confidence,
        totalCost: 0,
        attempts: [{ model: "tesseract" as AiModelName, success: true, ms: Math.floor(localMs), cost: 0 }],
      };
      setResult(r);
      setPhase("done");
      onResult?.(r);
      toast.success(`OCR بواسطة Tesseract — ثقة ${confidence.toFixed(0)}%`);
      return;
    }

    // Fallback cascade via server function — send the actual image bytes.
    setPhase("fallback");
    try {
      const imageBase64 = await fileToDataUrl(file);
      const order = pickRouteOrder().filter((m) => m !== "tesseract") as ("deepseek" | "gemini" | "claude" | "gpt")[];
      const server = await ocrFallback({ data: { imageBase64, workspaceId, order } });
      let totalCost = 0;
      for (const a of server.attempts) {
        aiStore.logUsage({
          workspaceId,
          modelName: a.model,
          operation: "ocr",
          inputTokens: a.inputTokens,
          outputTokens: a.outputTokens,
          cost: a.cost,
          success: a.success,
          processingTime: a.processingTime,
        });
        totalCost += a.cost;
      }
      const r: OcrResult = {
        text: server.text ?? "",
        model: server.model,
        confidence: 95,
        totalCost,
        attempts: server.attempts.map((a) => ({ model: a.model, success: a.success, ms: a.processingTime, cost: a.cost })),
      };
      setResult(r);
      setPhase("done");
      onResult?.(r);
      toast.success(`OCR fallback نجح عبر ${r.model.toUpperCase()}`);
    } catch (e) {
      toast.error("فشل استخراج النص");
      setPhase("idle");
    }
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
            <p className="mt-1 text-xs text-muted-foreground">Hybrid OCR: Tesseract محلي → Fallback عبر Cloud</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) run(f); }}
          />
        </button>
      )}

      {(phase === "local" || phase === "fallback") && (
        <div className="rounded-3xl border border-glass-border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Loader2 className="size-5 animate-spin text-indigo-600" />
            <p className="text-sm font-medium">
              {phase === "local" ? `Tesseract.js — ${progress}%` : "Cloud fallback — DeepSeek → Gemini → Claude → GPT"}
            </p>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-gradient-to-r from-indigo-600 to-violet-600 transition-all"
              style={{ width: phase === "local" ? `${progress}%` : "70%" }}
            />
          </div>
        </div>
      )}

      {result && (
        <div className="rounded-3xl border border-glass-border bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><Check className="size-4" /></div>
            <h3 className="text-sm font-semibold">تم الاستخراج</h3>
            <span className="ms-auto inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-medium text-indigo-700">
              <Cpu className="size-3" /> {result.model.toUpperCase()}
            </span>
          </div>
          <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs text-slate-800">{result.text}</pre>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <Stat label="Confidence" value={`${result.confidence.toFixed(0)}%`} />
            <Stat label="Cost" value={`$${result.totalCost.toFixed(4)}`} />
            <Stat label="Attempts" value={String(result.attempts.length)} />
          </div>
          {result.attempts.length > 1 && (
            <div className="rounded-xl border border-glass-border bg-glass p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cascade trace</p>
              <ul className="space-y-1 text-xs">
                {result.attempts.map((a, i) => (
                  <li key={i} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Sparkles className={`size-3 ${a.success ? "text-emerald-600" : "text-rose-500"}`} />
                      {a.model.toUpperCase()}
                    </span>
                    <span className="text-muted-foreground">{a.ms}ms · ${a.cost.toFixed(4)} · {a.success ? "OK" : "fail"}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Button variant="outline" className="w-full rounded-xl" onClick={() => { setResult(null); setPhase("idle"); setPreview(null); }}>مسح ورفع آخر</Button>
        </div>
      )}
      {preview && phase !== "idle" && (
        <img src={preview} alt="" className="mx-auto max-h-52 rounded-2xl border border-glass-border object-contain" />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-glass-border bg-glass p-2 text-center">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-sm font-semibold">{value}</p>
    </div>
  );
}
