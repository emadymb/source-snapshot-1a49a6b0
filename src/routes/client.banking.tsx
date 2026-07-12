import { createFileRoute } from "@tanstack/react-router";
import { PageGate } from "@/components/entitlements/GateBanner";
import { Landmark, ArrowDownLeft, ArrowUpRight, RefreshCw, Link2 } from "lucide-react";
import { Screen, KpiGrid, DataCard, DataTable, StatusBadge, Toolbar } from "@/components/screens/RichScreen";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/client/banking")({ component: () => (<PageGate feature="banking.feeds" title="Bank feeds"><Page /></PageGate>) });

const accounts = [
  { bank: "Nordea Business", iban: "FI21 1234 5600 0007 85", balance: "€142,830.20", currency: "EUR", status: "active", last: "2m ago" },
  { bank: "OP Yritys", iban: "FI49 5000 1200 0009 21", balance: "€48,120.90", currency: "EUR", status: "active", last: "12m ago" },
  { bank: "Wise EUR", iban: "BE68 5390 0754 7034", balance: "€21,988.10", currency: "EUR", status: "active", last: "1h ago" },
];

const tx = [
  { date: "2026-03-04", desc: "Lindqvist Oy INV-2412", amount: "+€1,240.00", cat: "Sales", match: "matched" },
  { date: "2026-03-04", desc: "K-Supermarket", amount: "-€48.20", cat: "Meals", match: "matched" },
  { date: "2026-03-03", desc: "Google Ads", amount: "-€312.50", cat: "Marketing", match: "pending" },
  { date: "2026-03-03", desc: "Aleksanterinkatu rent", amount: "-€2,400.00", cat: "Rent", match: "matched" },
  { date: "2026-03-02", desc: "Stripe payout", amount: "+€6,182.44", cat: "Sales", match: "matched" },
  { date: "2026-03-01", desc: "Verkkokauppa.com", amount: "-€219.00", cat: "Equipment", match: "pending" },
  { date: "2026-02-28", desc: "Payroll batch Feb", amount: "-€18,442.10", cat: "Payroll", match: "matched" },
];

function Page() {
  return (
    <Screen title="Banking" description="Connected feeds, live balances, and reconciliation." icon={Landmark}
      actions={<>
        <Button variant="outline" className="rounded-xl border-glass-border bg-glass"><RefreshCw className="me-2 size-4" />Sync</Button>
        <Button className="rounded-xl bg-gradient-primary text-primary-foreground"><Link2 className="me-2 size-4" />Connect bank</Button>
      </>}>
      <KpiGrid kpis={[
        { label: "Cash on hand", value: "€212,939.20", delta: "+€8,214 this week", tone: "up" },
        { label: "Incoming (30d)", value: "€64,120", delta: "42 transactions", tone: "up" },
        { label: "Outgoing (30d)", value: "€39,882", delta: "68 transactions", tone: "down" },
        { label: "Unmatched", value: "12", delta: "2 need attention", tone: "flat" },
      ]} />

      <div className="grid gap-4 md:grid-cols-3">
        {accounts.map((a) => (
          <div key={a.iban} className="glass rounded-2xl border-glass-border p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground"><Landmark className="size-5" /></div>
                <div>
                  <p className="font-semibold">{a.bank}</p>
                  <p className="text-xs text-muted-foreground">{a.iban}</p>
                </div>
              </div>
              <StatusBadge status={a.status} />
            </div>
            <p className="mt-4 font-display text-2xl font-semibold">{a.balance}</p>
            <p className="mt-1 text-xs text-muted-foreground">Last sync {a.last}</p>
          </div>
        ))}
      </div>

      <Toolbar tabs={["All", "Incoming", "Outgoing", "Unmatched"]} active="All" />
      <DataCard title="Recent transactions">
        <DataTable rows={tx} columns={[
          { key: "date", label: "Date" },
          { key: "desc", label: "Description", render: (r) => <span className="font-medium">{r.desc}</span> },
          { key: "cat", label: "Category" },
          { key: "match", label: "Match", render: (r) => <StatusBadge status={r.match === "matched" ? "resolved" : "pending"} /> },
          { key: "amount", label: "Amount", className: "text-right", render: (r) => (
            <span className={`inline-flex items-center gap-1 font-medium ${r.amount.startsWith("+") ? "text-emerald-600" : "text-destructive"}`}>
              {r.amount.startsWith("+") ? <ArrowDownLeft className="size-3.5" /> : <ArrowUpRight className="size-3.5" />}{r.amount}
            </span>
          ) },
        ]} />
      </DataCard>
    </Screen>
  );
}