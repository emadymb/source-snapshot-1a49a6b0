import { createFileRoute } from "@tanstack/react-router";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart, Legend } from "recharts";
import { Download, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/super/reports")({ component: ReportsPage });

const REV = Array.from({ length: 12 }).map((_, i) => ({
  m: new Date(2025, i, 1).toLocaleString(undefined, { month: "short" }),
  new: 3200 + i * 480 + Math.round(Math.random() * 800),
  expansion: 900 + i * 220,
  churn: -(300 + Math.round(Math.random() * 400)),
}));

const COHORTS = Array.from({ length: 6 }).map((_, i) => {
  const base = 100 - i * 4;
  return { cohort: `2025-${String(i + 1).padStart(2, "0")}`, m1: base, m2: base - 8, m3: base - 14, m4: base - 18, m5: base - 22, m6: base - 25 };
});

const ARPU = Array.from({ length: 12 }).map((_, i) => ({ m: new Date(2025, i, 1).toLocaleString(undefined, { month: "short" }), v: 78 + i * 3 + Math.round(Math.random() * 6) }));

function ReportsPage() {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t("rep.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("rep.subtitle")}</p>
        </div>
        <Button variant="outline" className="rounded-xl"><Download className="me-2 size-4" />Export CSV</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <MetricTile label="Net new MRR" value="€6,420" delta="+18.4%" />
        <MetricTile label="Gross revenue (YTD)" value="€184,720" delta="+22.1%" />
        <MetricTile label="ARPU" value="€92" delta="+4.6%" />
      </div>

      <div className="rounded-2xl border border-glass-border bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Revenue movement</p><p className="mt-0.5 font-display text-xl font-semibold">New · Expansion · Churn</p></div>
        </div>
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={REV} stackOffset="sign">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="m" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${v/1000}k`} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} formatter={(v: number) => `€${Math.abs(v).toLocaleString()}`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="new" stackId="a" fill="#6366f1" radius={[6,6,0,0]} name="New" />
              <Bar dataKey="expansion" stackId="a" fill="#a78bfa" name="Expansion" />
              <Bar dataKey="churn" stackId="a" fill="#f43f5e" radius={[0,0,6,6]} name="Churn" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-glass-border bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">ARPU trend</p>
          <p className="mt-0.5 font-display text-xl font-semibold">€92</p>
          <div className="mt-3 h-56">
            <ResponsiveContainer>
              <AreaChart data={ARPU}>
                <defs>
                  <linearGradient id="arpu" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="m" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${v}`} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} formatter={(v: number) => `€${v}`} />
                <Area type="monotone" dataKey="v" stroke="#10b981" strokeWidth={2.5} fill="url(#arpu)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-glass-border bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Cohort retention</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground"><tr><th className="px-2 py-2 text-start font-medium">Cohort</th>{["M1","M2","M3","M4","M5","M6"].map((h) => <th key={h} className="px-2 py-2 text-end font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {COHORTS.map((c) => (
                  <tr key={c.cohort} className="border-t border-slate-100">
                    <td className="px-2 py-1.5 font-medium">{c.cohort}</td>
                    {[c.m1,c.m2,c.m3,c.m4,c.m5,c.m6].map((v, i) => (
                      <td key={i} className="px-1 py-1"><div className="h-7 w-full rounded-md text-center leading-7" style={{ background: `oklch(0.85 0.13 265 / ${v/100})`, color: v > 50 ? "#fff" : "#312e81" }}>{v}%</div></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricTile({ label, value, delta }: { label: string; value: string; delta: string }) {
  return (
    <div className="rounded-2xl border border-glass-border bg-white p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
      <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-600"><TrendingUp className="size-3" />{delta}</p>
    </div>
  );
}
