import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageGate } from "@/components/entitlements/GateBanner";
import { useEntitlement } from "@/lib/entitlements/store";
import { OcrUploader } from "@/components/ai/OcrUploader";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/client/scan")({ component: () => (
  <PageGate feature="ai.ocr" title="OCR receipt scanning" description="Upgrade your plan to unlock automatic receipt extraction.">
    <ScanPage />
  </PageGate>
)});

type Extraction = { vendor: string; date: string; amount: number; vatRate: number; category: string };
const CATEGORIES = ["Groceries", "Fuel", "Meals", "Office supplies", "Software", "Travel"];

function parseReceipt(text: string): Extraction {
  const vendor = (text.split("\n")[0] || "Vendor").trim();
  const amountMatch = text.match(/([\d]+[.,]\d{2})\s*(?:EUR|€)?/gi);
  const amountRaw = amountMatch ? amountMatch[amountMatch.length - 1].replace(",", ".") : "0";
  const amount = parseFloat(amountRaw) || 0;
  const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})|(\d{2}\/\d{2}\/\d{4})/);
  let date = new Date().toISOString().slice(0, 10);
  if (dateMatch) {
    const raw = dateMatch[0];
    date = raw.includes("/")
      ? raw.split("/").reverse().join("-")
      : raw;
  }
  const vatMatch = text.match(/ALV\s*(\d+)\s*%/i);
  const vatRate = vatMatch ? Number(vatMatch[1]) : 24;
  const lower = text.toLowerCase();
  const category =
    lower.includes("bensiini") || lower.includes("teboil") ? "Fuel"
    : lower.includes("ravintola") || lower.includes("lounas") ? "Meals"
    : lower.includes("k-super") || lower.includes("maito") ? "Groceries"
    : "Office supplies";
  return { vendor, date, amount, vatRate, category };
}

function ScanPage() {
  const { t } = useI18n();
  const [data, setData] = useState<Extraction | null>(null);
  const { quota } = useEntitlement("ai.ocr");
  const [usedThisMonth] = useState(42);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{t("client.scan.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Hybrid OCR — Tesseract في المتصفح + fallback ذكي</p>
        <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-medium text-indigo-700">
          <Sparkles className="size-3" /> {usedThisMonth} / {quota} {t("ent.used").toLowerCase()}
        </div>
      </header>

      {!data && (
        <OcrUploader
          onResult={(r) => {
            const first = r.rows[0];
            if (!first) return;
            setData({
              vendor: r.supplier ?? first.asiakasToimittaja ?? "",
              date: first.pvm,
              amount:
                r.totalAmount ??
                r.rows.reduce((s, x) => s + (x.debet ?? x.kredit ?? 0), 0),
              vatRate: first.alv ?? 24,
              category: first.selite || "Office supplies",
            });
          }}
        />
      )}

      {data && (
        <section className="rounded-3xl border border-glass-border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><Check className="size-4" /></div>
            <h2 className="text-sm font-semibold">Extracted fields</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Vendor"><Input value={data.vendor} onChange={(e) => setData({ ...data, vendor: e.target.value })} /></Field>
            <Field label="Date"><Input type="date" value={data.date} onChange={(e) => setData({ ...data, date: e.target.value })} /></Field>
            <Field label="Amount"><Input type="number" step="0.01" value={data.amount} onChange={(e) => setData({ ...data, amount: Number(e.target.value) })} /></Field>
            <Field label="VAT">
              <Select value={String(data.vatRate)} onValueChange={(v) => setData({ ...data, vatRate: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[0, 10, 14, 24].map((r) => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <div className="col-span-2">
              <Field label="Category">
                <Select value={data.category} onValueChange={(v) => setData({ ...data, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-2">
            <Button
              className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
              onClick={() => { toast.success(`Saved €${data.amount.toFixed(2)} · ${data.vendor}`); setData(null); }}
            >
              <Check className={cn("size-4", "me-2")} /> Save expense
            </Button>
            <Button variant="outline" className="w-full rounded-xl" onClick={() => setData(null)}>
              <RotateCcw className="me-2 size-4" /> Rescan
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
