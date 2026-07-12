import { createFileRoute } from "@tanstack/react-router";
import { PageGate } from "@/components/entitlements/GateBanner";
import { LineChart as LineIcon, TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { Screen, KpiGrid, DataCard } from "@/components/screens/RichScreen";

export const Route = createFileRoute("/client/insights")({ component: () => (<PageGate feature="ai.insights" title="AI insights"><Page /></PageGate>) });

const cashflow = [
  { m: "Sep", in: 42, out: 28 }, { m: "Oct", in: 51, out: 32 }, { m: "Nov", in: 47, out: 34 },
  { m: "Dec", in: 62, out: 41 }, { m: "Jan", in: 55, out: 36 }, { m: "Feb", in: 64, out: 39 }, { m: "Mar", in: 71, out: 42 },
];
const spend = [
  { name: "Payroll", value: 18442, color: "hsl(var(--primary))" },
  { name: "Rent", value: 4800, color: "#22c55e" },
  { name: "Marketing", value: 3120, color: "#f59e0b" },
  { name: "Software", value: 1980, color: "#06b6d4" },
  { name: "Meals", value: 812, color: "#a855f7" },
];
const customers = [
  { name: "Lindqvist Oy", rev: 24800 }, { name: "Nordea Fi", rev: 18400 },
  { name: "K-Ryhmä", rev: 12200 }, { name: "Aalto Design", rev: 9600 }, { name: "Verkkokauppa", rev: 6800 },
];

function Page() {
  return (
    <Screen title="Insights" description="AI-powered analysis of your business performance." icon={LineIcon}>
      <KpiGrid kpis={[
        { label: "Net profit MTD", value: "€31,900", delta: "+21% vs last month", tone: "up" },
        { label: "Runway", value: "14.2 months", delta: "at current burn", tone: "flat" },
        { label: "Gross margin", value: "62.4%", delta: "+2.1pp", tone: "up" },
        { label: "AR days", value: "18d", delta: "-3d improvement", tone: "up" },
      ]} />

      <div className="glass rounded-2xl border-glass-border p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground"><Sparkles className="size-4" /></div>
          <div>
            <p className="font-semibold">Fiksu AI insight</p>
            <p className="text-sm text-muted-foreground">Marketing spend up 34% MoM with no matching revenue lift. Consider pausing the Google Ads "Q1 Bundle" campaign — CAC is now €412 vs €178 baseline.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DataCard title="Cashflow (last 7 months)">
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={cashflow}>
                <defs>
                  <linearGradient id="gi" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0}/></linearGradient>
                </defs>
                <XAxis dataKey="m" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Area dataKey="in" stroke="hsl(var(--primary))" fill="url(#gi)" />
                <Area dataKey="out" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </DataCard>
        <DataCard title="Spend by category">
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={spend} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                  {spend.map((s) => <Cell key={s.name} fill={s.color} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </DataCard>
      </div>

      <DataCard title="Top customers by revenue">
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={customers}>
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
              <Bar dataKey="rev" fill="hsl(var(--primary))" radius={[8,8,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </DataCard>
    </Screen>
  );
}