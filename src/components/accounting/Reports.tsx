import { useMemo } from "react";
import { BarChart3, Loader2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { useQuery } from "@tanstack/react-query";

import { PageHeading } from "@/components/PagePlaceholder";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { fmt } from "@/lib/format";
import { financialReports, listJournalEntries, vatReport, type TrialBalanceRow, type UiAccountType } from "@/lib/accounting.functions";

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

  // Group rows by account type for balance sheet / income statement views.
  const grouped = useMemo(() => {
    const g: Record<UiAccountType, TrialBalanceRow[]> = {
      asset: [], liability: [], equity: [], income: [], expense: [],
    };
    for (const r of reports?.trialBalance ?? []) g[r.type].push(r);
    return g;
  }, [reports]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeading title="Financial Reports" description="Balance sheet, income statement, VAT report, and trial balance computed live from posted journals." icon={BarChart3} />

      {isLoading && (
        <div className="glass mb-4 flex items-center justify-center gap-2 rounded-2xl border-glass-border p-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Computing reports…
        </div>
      )}

      <div className="mb-4 grid gap-4 md:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="glass rounded-2xl border-glass-border p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{k.label}</p>
            <p className="mt-2 font-display text-2xl font-semibold">{k.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{k.sub}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4 flex w-full flex-wrap gap-1 bg-secondary/50">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="balance">Balance Sheet · الميزانية</TabsTrigger>
          <TabsTrigger value="closing">Income Statement · الحساب الختامي</TabsTrigger>
          <TabsTrigger value="vat">VAT · تقرير الضريبة</TabsTrigger>
          <TabsTrigger value="trial">Trial Balance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
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
          <div className="grid gap-4 md:grid-cols-2">
            <div className="glass rounded-2xl border-glass-border p-6">
              <h3 className="mb-3 font-display text-base font-semibold">Balance Sheet summary</h3>
              <dl className="space-y-2 text-sm">
                <Row label="Total assets" value={fmt.format(assets)} strong />
                <Row label="Total liabilities" value={fmt.format(liabilities)} />
                <Row label="Equity" value={fmt.format(equity)} />
                <Row label="Net (A − L − E)" value={fmt.format(assets - liabilities - equity)} strong />
              </dl>
            </div>
            <div className="glass rounded-2xl border-glass-border p-6">
              <h3 className="mb-3 font-display text-base font-semibold">Profit & Loss summary</h3>
              <dl className="space-y-2 text-sm">
                <Row label="Revenue" value={fmt.format(income)} />
                <Row label="Expenses" value={fmt.format(-expTotal)} />
                <Row label="Net income" value={fmt.format(netIncome)} strong />
              </dl>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="balance">
          <BalanceSheetView
            assets={grouped.asset}
            liabilities={grouped.liability}
            equity={grouped.equity}
            netIncome={netIncome}
          />
        </TabsContent>

        <TabsContent value="closing">
          <IncomeStatementView income={grouped.income} expenses={grouped.expense} />
        </TabsContent>

        <TabsContent value="vat">
          <VatReportView />
        </TabsContent>

        <TabsContent value="trial">
          {reports && (
            <div className="glass rounded-2xl border-glass-border p-6">
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
        </TabsContent>
      </Tabs>
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

function AccountLines({ rows }: { rows: TrialBalanceRow[] }) {
  if (!rows.length) return <p className="px-3 py-2 text-xs text-muted-foreground">No accounts.</p>;
  return (
    <div className="divide-y divide-glass-border/60">
      {rows.map((r) => (
        <div key={r.accountId} className="flex items-center justify-between px-3 py-1.5 text-sm">
          <span className="flex items-baseline gap-2">
            <span className="font-mono text-xs text-muted-foreground">{r.code}</span>
            <span>{r.name}</span>
          </span>
          <span className="font-mono tabular-nums">{fmt.format(r.balance)}</span>
        </div>
      ))}
    </div>
  );
}

function Section({ title, total, children }: { title: string; total: number; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl border-glass-border">
      <div className="flex items-center justify-between border-b border-glass-border px-4 py-3">
        <h4 className="font-display text-sm font-semibold">{title}</h4>
        <span className="font-mono text-sm font-semibold tabular-nums">{fmt.format(total)}</span>
      </div>
      <div className="py-1">{children}</div>
    </div>
  );
}

function sumBalance(rows: TrialBalanceRow[]) {
  return rows.reduce((s, r) => s + r.balance, 0);
}

function BalanceSheetView({
  assets, liabilities, equity, netIncome,
}: { assets: TrialBalanceRow[]; liabilities: TrialBalanceRow[]; equity: TrialBalanceRow[]; netIncome: number }) {
  const A = sumBalance(assets);
  const L = sumBalance(liabilities);
  const E = sumBalance(equity);
  const totalEquity = E + netIncome;
  const totalLE = L + totalEquity;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Assets · الأصول" total={A}>
          <AccountLines rows={assets} />
        </Section>
        <div className="space-y-4">
          <Section title="Liabilities · الخصوم" total={L}>
            <AccountLines rows={liabilities} />
          </Section>
          <Section title="Equity · حقوق الملكية" total={totalEquity}>
            <AccountLines rows={equity} />
            <div className="flex items-center justify-between border-t border-glass-border px-3 py-1.5 text-sm">
              <span className="text-muted-foreground">Net income (period)</span>
              <span className="font-mono tabular-nums">{fmt.format(netIncome)}</span>
            </div>
          </Section>
        </div>
      </div>
      <div className="glass grid gap-3 rounded-2xl border-glass-border p-4 md:grid-cols-3">
        <Row label="Total assets" value={fmt.format(A)} strong />
        <Row label="Total liabilities + equity" value={fmt.format(totalLE)} strong />
        <Row label="Balance check" value={Math.abs(A - totalLE) < 0.01 ? "balanced ✓" : fmt.format(A - totalLE)} strong />
      </div>
    </div>
  );
}

function IncomeStatementView({ income, expenses }: { income: TrialBalanceRow[]; expenses: TrialBalanceRow[] }) {
  const rev = sumBalance(income);
  const exp = sumBalance(expenses);
  const net = rev - exp;
  return (
    <div className="space-y-4">
      <Section title="Revenue · الإيرادات" total={rev}>
        <AccountLines rows={income} />
      </Section>
      <Section title="Expenses · المصروفات" total={exp}>
        <AccountLines rows={expenses} />
      </Section>
      <div className={`glass rounded-2xl border-glass-border p-4 ${net >= 0 ? "bg-emerald-50/50" : "bg-rose-50/50"}`}>
        <div className="flex items-center justify-between">
          <span className="font-display text-base font-semibold">Net income (Tulos) · صافي الربح</span>
          <span className="font-mono text-lg font-semibold tabular-nums">{fmt.format(net)}</span>
        </div>
      </div>
    </div>
  );
}

function VatReportView() {
  const { data, isLoading } = useQuery({
    queryKey: ["accounting", "vat"],
    queryFn: () => vatReport(),
    staleTime: 30_000,
  });
  if (isLoading) {
    return (
      <div className="glass flex items-center justify-center gap-2 rounded-2xl border-glass-border p-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading VAT report…
      </div>
    );
  }
  if (!data) return null;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="glass rounded-2xl border-glass-border p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Output VAT (sales)</p>
          <p className="mt-1 font-display text-xl font-semibold">{fmt.format(data.totals.salesVat)}</p>
        </div>
        <div className="glass rounded-2xl border-glass-border p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Input VAT (purchases)</p>
          <p className="mt-1 font-display text-xl font-semibold">{fmt.format(data.totals.purchasesVat)}</p>
        </div>
        <div className={`rounded-2xl border p-4 ${data.totals.payable >= 0 ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"}`}>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">VAT payable · مستحق الضريبة</p>
          <p className="mt-1 font-display text-xl font-semibold">{fmt.format(data.totals.payable)}</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <VatTable title="Sales · المبيعات" rows={data.sales} totalNet={data.totals.salesNet} totalVat={data.totals.salesVat} />
        <VatTable title="Purchases · المشتريات" rows={data.purchases} totalNet={data.totals.purchasesNet} totalVat={data.totals.purchasesVat} />
      </div>
      {data.periodFrom && (
        <p className="text-xs text-muted-foreground">
          Period: {data.periodFrom} → {data.periodTo}
        </p>
      )}
    </div>
  );
}

function VatTable({ title, rows, totalNet, totalVat }: { title: string; rows: { rate: number; net: number; vat: number }[]; totalNet: number; totalVat: number }) {
  return (
    <div className="glass rounded-2xl border-glass-border p-4">
      <h4 className="mb-2 font-display text-sm font-semibold">{title}</h4>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="py-1 font-medium">Rate</th>
            <th className="py-1 text-right font-medium">Net</th>
            <th className="py-1 text-right font-medium">VAT</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={3} className="py-2 text-xs text-muted-foreground">No data.</td></tr>
          )}
          {rows.map((r) => (
            <tr key={r.rate} className="border-t border-glass-border/60">
              <td className="py-1.5">{r.rate}%</td>
              <td className="py-1.5 text-right font-mono tabular-nums">{fmt.format(r.net)}</td>
              <td className="py-1.5 text-right font-mono tabular-nums">{fmt.format(r.vat)}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-glass-border font-semibold">
            <td className="py-1.5">Total</td>
            <td className="py-1.5 text-right font-mono tabular-nums">{fmt.format(totalNet)}</td>
            <td className="py-1.5 text-right font-mono tabular-nums">{fmt.format(totalVat)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
