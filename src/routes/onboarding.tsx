import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Globe2, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Onboarding — Fiksu" }] }),
  component: OnboardingPage,
});

const COUNTRIES = [
  { code: "FI", name_en: "Finland", name_ar: "فنلندا", currency: "EUR", locale: "fi", standard: "FAS", timezone: "Europe/Helsinki", vat: 25.5, authority: "Verohallinto" },
  { code: "SA", name_en: "Saudi Arabia", name_ar: "المملكة العربية السعودية", currency: "SAR", locale: "ar", standard: "IFRS", timezone: "Asia/Riyadh", vat: 15, authority: "ZATCA" },
  { code: "AE", name_en: "United Arab Emirates", name_ar: "الإمارات", currency: "AED", locale: "ar", standard: "IFRS", timezone: "Asia/Dubai", vat: 5, authority: "FTA" },
  { code: "EG", name_en: "Egypt", name_ar: "مصر", currency: "EGP", locale: "ar", standard: "EAS", timezone: "Africa/Cairo", vat: 14, authority: "ETA" },
  { code: "US", name_en: "United States", name_ar: "الولايات المتحدة", currency: "USD", locale: "en", standard: "US GAAP", timezone: "America/New_York", vat: 0, authority: "IRS" },
];

function OnboardingPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState<string>("");
  const selected = COUNTRIES.find((c) => c.code === code) || null;

  const confirm = () => {
    if (!selected) return;
    toast.success(`Country set to ${selected.name_en}`);
    navigate({ to: "/client" });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold">Welcome to Fiksu</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick your country — we'll configure currency, tax rates, accounting standard and language.
        </p>
      </div>

      <div className="glass space-y-5 rounded-2xl border-glass-border p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Globe2 className="h-4 w-4" /> Step 1 of 1 — Country & Locale
        </div>

        <Select value={code} onValueChange={setCode}>
          <SelectTrigger><SelectValue placeholder="Select a country" /></SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.name_en} · {c.name_ar}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selected && (
          <div className="rounded-lg border border-border bg-card/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{selected.name_en} · {selected.name_ar}</p>
                <p className="text-xs text-muted-foreground">
                  {selected.authority} · {selected.timezone}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge>{selected.currency}</Badge>
                <Badge variant="outline">{selected.standard}</Badge>
                <Badge variant="outline">{selected.locale.toUpperCase()}</Badge>
              </div>
            </div>
            <div className="mt-3 rounded-md bg-muted/50 p-3 text-xs">
              <p className="font-medium text-foreground">Tax preview on 1,000 {selected.currency}</p>
              <p className="text-muted-foreground">
                Rate {selected.vat}% → Net {(1000 / (1 + selected.vat / 100)).toFixed(2)} · Tax {(1000 - 1000 / (1 + selected.vat / 100)).toFixed(2)}
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={confirm} disabled={!selected}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Confirm & continue <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
