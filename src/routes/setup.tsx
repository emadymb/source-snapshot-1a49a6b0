import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, Coins, Wallet, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/setup")({
  head: () => ({ meta: [{ title: "Tenant Setup — Fiksu" }] }),
  component: SetupWizard,
});

const CURRENCIES = [
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  { code: "EGP", name: "Egyptian Pound", symbol: "£" },
];

function SetupWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [countryCode, setCountryCode] = useState("FI");
  const [baseCurrency, setBaseCurrency] = useState("EUR");
  const [cashBoxName, setCashBoxName] = useState("Main Cash Box");
  const [cashBoxCurrency, setCashBoxCurrency] = useState("EUR");
  const [openingBalance, setOpeningBalance] = useState("0");

  const finish = () => {
    toast.success("Tenant ready");
    navigate({ to: "/client" });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold">Set Up Your Tenant</h1>
        <p className="mt-1 text-sm text-muted-foreground">Three quick steps to start using Fiksu.</p>
      </div>

      <div className="mb-6 flex items-center justify-center gap-3 text-xs">
        {[1, 2, 3].map((n) => (
          <div key={n} className={`flex items-center gap-2 ${step >= n ? "text-primary" : "text-muted-foreground"}`}>
            <div className={`flex h-7 w-7 items-center justify-center rounded-full border ${step >= n ? "border-primary bg-primary/10" : "border-border"}`}>
              {step > n ? <CheckCircle2 className="h-4 w-4" /> : n}
            </div>
            <span className="hidden sm:inline">{["Company", "Currency", "Cash Box"][n - 1]}</span>
          </div>
        ))}
      </div>

      <div className="glass space-y-5 rounded-2xl border-glass-border p-6">
        {step === 1 && (
          <>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" /> Step 1 — Company
            </div>
            <div className="space-y-2">
              <Label>Company name *</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Oy" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Business ID</Label>
                <Input value={businessId} onChange={(e) => setBusinessId(e.target.value)} placeholder="1234567-8" />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FI">Finland</SelectItem>
                    <SelectItem value="SA">Saudi Arabia</SelectItem>
                    <SelectItem value="AE">UAE</SelectItem>
                    <SelectItem value="EG">Egypt</SelectItem>
                    <SelectItem value="US">United States</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!companyName.trim()}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Coins className="h-4 w-4" /> Step 2 — Base Currency
            </div>
            <div className="space-y-2">
              <Label>Base currency *</Label>
              <Select value={baseCurrency} onValueChange={(v) => { setBaseCurrency(v); setCashBoxCurrency(v); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.code} — {c.name} ({c.symbol})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Cash boxes can use any currency; FX conversions go through this base.
              </p>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)}>Next <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wallet className="h-4 w-4" /> Step 3 — First Cash Box
            </div>
            <div className="space-y-2">
              <Label>Cash box name *</Label>
              <Input value={cashBoxName} onChange={(e) => setCashBoxName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={cashBoxCurrency} onValueChange={setCashBoxCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Opening balance</Label>
                <Input type="number" step="0.01" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={finish} disabled={!cashBoxName.trim()}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Finish Setup
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
