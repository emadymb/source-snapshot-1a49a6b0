import { useMemo } from "react";
import { BarChart3, Loader2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { useQuery } from "@tanstack/react-query";

import { PageHeading } from "@/components/PagePlaceholder";
import { fmt } from "@/lib/mock/store";
import { financialReports, listJournalEntries } from "@/lib/accounting.functions";

const COLORS = ["oklch(0.58 0.2 264)", "oklch(0.66 0.17 230)", "oklch(0.65 0.18 150)", "oklch(0.78 0.17 80)", "oklch(0.62 0.22 20)"];

export function ReportsScreen() {
  const { data: reports, isLoading } = useQuery({
    queryKey: ["accounting", "reports"],
    queryFn: () => financialReports(),
    staleTime: 30_000,
  });
  const { data: journals = [] } = useQuery({
    queryKey: ["accounting", "journals"],
    queryFn: () => listJournalEntries(),
    staleTime: 30_000,
  });

  const income = reports?.pnl.revenue ?? 0;
  const expTotal = reports?.pnl.expenses ?? 0;
  const netIncome = reports?.pnl.netIncome ?? 0;
  const assets = reports?.balanceSheet.assets ?? 0;
  const liabilities = reports?.balanceSheet.liabilities ?? 0;
  const equity = reports?.balanceSheet.equity ?? 0;

  const monthly = useMemo(() => {
    if (!reports) return [];
    const byId = new Map(reports.trialBalance.map((r) => [r.accountId, r]));
    const m = new Map<string, { month: string; revenue: number; expenses: number }>();
    for (const j of journals) {
      const key = j.date.slice(0, 7);
      const t = m.get(key) ?? { month: key, revenue: 0, expenses: 0 };
      const cr = j.creditAccountId ? byId.get(j.creditAccountId) : null;
      const dr = j.debitAccountId ? byId.get(j.debitAccountId) : null;
      if (cr?.type === "income") t.revenue += j.amount;
      if (dr?.type === "expense") t.expenses += j.amount;
      m.set(key, t);
    }
    return Array.from(m.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [reports, journals]);

  const expenseBreakdown = (reports?.trialBalance ?? [])
    .filter((r) => r.type === "expense" && Math.abs(r.balance) > 0.005)
    .map((r) => ({ name: r.name, value: Math.abs(r.balance) }));

  const kpis = [
    { label: "Total revenue", value: fmt.format(income), sub: "This period" },
    { label: "Total expenses", value: fmt.format(expTotal), sub: "This period" },
    { label: "Net income", value: fmt.format(netIncome), sub: income > 0 ? `${((netIncome / income) * 100).toFixed(1)}% margin` : "—" },
    { label: "Assets", value: fmt.format(assets), sub: `${fmt.format(liabilities)} liabilities` },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeading title="Financial Reports" description="Trial balance, P&L, and balance sheet computed live from posted journals." icon={BarChart3} />

      {isLoading && (
        <div className="glass mb-4 flex items-center justify-center gap-2 rounded-2xl border-glass-border p-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Computing reports…
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="glass rounded-2xl border-glass-border p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{k.label}</p>
            <p className="mt-2 font-display text-2xl font-semibold">{k.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="glass rounded-2xl border-glass-border p-6 lg:col-span-2">
          <h2 className="mb-2 font-display text-lg font-semibold">Revenue vs Expenses</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="oklch(0.58 0.2 264)" stopOpacity={0.5} /><stop offset="95%" stopColor="oklch(0.58 0.2 264)" stopOpacity={0} /></linearGradient>
                  <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="oklch(0.62 0.22 20)" stopOpacity={0.5} /><stop offset="95%" stopColor="oklch(0.62 0.22 20)" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" />
                <XAxis dataKey="month" stroke="oklch(0.55 0 0)" fontSize={12} />
                <YAxis stroke="oklch(0.55 0 0)" fontSize={12} />
                <Tooltip formatter={(v: number) => fmt.format(v)} contentStyle={{ borderRadius: 12, border: "1px solid var(--glass-border)" }} />
                <Area type="monotone" dataKey="revenue" stroke="oklch(0.58 0.2 264)" fill="url(#rev)" strokeWidth={2} />
                <Area type="monotone" dataKey="expenses" stroke="oklch(0.62 0.22 20)" fill="url(#exp)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass rounded-2xl border-glass-border p-6">
          <h2 className="mb-2 font-display text-lg font-semibold">Expense mix</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={expenseBreakdown} dataKey="value" nameKey="name" innerRadius={40} outerRadius={80} paddingAngle={2}>
                  {expenseBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt.format(v)} contentStyle={{ borderRadius: 12, border: "1px solid var(--glass-border)" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="glass rounded-2xl border-glass-border p-6">
          <h3 className="mb-3 font-display text-base font-semibold">Balance Sheet</h3>
          <dl className="space-y-2 text-sm">
            <Row label="Total assets" value={fmt.format(assets)} strong />
            <Row label="Total liabilities" value={fmt.format(liabilities)} />
            <Row label="Equity" value={fmt.format(equity)} />
            <Row label="Net (A − L − E)" value={fmt.format(assets - liabilities - equity)} strong />
          </dl>
        </div>
        <div className="glass rounded-2xl border-glass-border p-6">
          <h3 className="mb-3 font-display text-base font-semibold">Profit & Loss</h3>
          <dl className="space-y-2 text-sm">
            <Row label="Revenue" value={fmt.format(income)} />
            <Row label="Expenses" value={fmt.format(-expTotal)} />
            <Row label="Net income" value={fmt.format(netIncome)} strong />
          </dl>
        </div>
      </div>

      {reports && (
        <div className="mt-4 glass rounded-2xl border-glass-border p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold">Trial Balance</h3>
            <span className="text-xs text-muted-foreground">
              Debit {fmt.format(reports.totals.debit)} · Credit {fmt.format(reports.totals.credit)}
              {Math.abs(reports.totals.debit - reports.totals.credit) < 0.01
                ? " · balanced"
                : ` · off by ${fmt.format(reports.totals.debit - reports.totals.credit)}`}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-glass-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Code</th>
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Type</th>
                  <th className="py-2 pr-4 text-right font-medium">Debit</th>
                  <th className="py-2 pr-4 text-right font-medium">Credit</th>
                  <th className="py-2 text-right font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {reports.trialBalance.map((r) => (
                  <tr key={r.accountId} className="border-b border-glass-border/60 last:border-0">
                    <td className="py-2 pr-4 font-mono text-xs">{r.code}</td>
                    <td className="py-2 pr-4">{r.name}</td>
                    <td className="py-2 pr-4 capitalize text-muted-foreground">{r.type}</td>
                    <td className="py-2 pr-4 text-right">{r.debit ? fmt.format(r.debit) : "—"}</td>
                    <td className="py-2 pr-4 text-right">{r.credit ? fmt.format(r.credit) : "—"}</td>
                    <td className="py-2 text-right font-medium">{fmt.format(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${strong ? "bg-secondary/70 font-semibold" : "bg-secondary/30"}`}>
      <dt>{label}</dt>
      <dd className="font-mono">{value}</dd>
    </div>
  );
}
