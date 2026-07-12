import { createFileRoute, Link } from "@tanstack/react-router";
import { ScanLine, ReceiptText, Bot, Wallet, TrendingUp, TrendingDown, ArrowUpRight, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useEntitlements, Gate } from "@/lib/entitlements/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/client/")({ component: ClientHome });

const spark = (vals: number[], up = true) => {
  const max = Math.max(...vals);
  return (
    <svg viewBox="0 0 100 30" className="h-6 w-full" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke={up ? "rgb(16 185 129)" : "rgb(244 63 94)"}
        strokeWidth="2"
        points={vals.map((v, i) => `${(i / (vals.length - 1)) * 100},${30 - (v / max) * 26}`).join(" ")}
      />
    </svg>
  );
};

function ClientHome() {
  const { t, lang } = useI18n();
  const { workspaces, currentWorkspaceId } = useEntitlements();
  const ws = workspaces.find((w) => w.id === currentWorkspaceId)!;

  const fmt = (n: number) => new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en-FI", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

  const activity = [
    { t: "e-Invoice sent",     s: "Lindqvist Oy · €1,240", tone: "success" },
    { t: "Receipt scanned",    s: "K-Supermarket · €48.20", tone: "info" },
    { t: "Payroll drafted",    s: "March 2026 · 12 emp",   tone: "warning" },
    { t: "Bank feed reconciled", s: "Nordea · 34 tx",       tone: "success" },
  ];

  const quicks = [
    { to: "/client/scan",                label: t("client.tab.scan"),    icon: ScanLine,     tone: "from-indigo-500 to-violet-600", feature: "ai.ocr" },
    { to: "/client/accounting/expenses", label: t("client.tab.expenses"),icon: ReceiptText,  tone: "from-rose-500 to-orange-500",   feature: "accounting.expenses" },
    { to: "/client/ai-chat",             label: t("client.tab.ai"),      icon: Bot,          tone: "from-cyan-500 to-blue-600",     feature: "ai.chat" },
    { to: "/client/accounting/payroll",  label: t("client.tab.payroll"), icon: Wallet,       tone: "from-emerald-500 to-teal-600",  feature: "hrm.payroll" },
  ];

  return (
    <div className="space-y-4">
      {/* Greeting card */}
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-5 text-white shadow-lg shadow-indigo-500/25">
        <p className="text-xs opacity-80">{t("client.home.hello")}, Erik</p>
        <p className="mt-0.5 text-lg font-semibold">{ws.name}</p>
        <div className="mt-4">
          <p className="text-xs opacity-80">{t("client.home.balance")}</p>
          <p className="mt-0.5 font-display text-3xl font-bold tracking-tight">{fmt(48620)}</p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs opacity-90">
            <TrendingUp className="size-3.5" /> +8.4% MoM
          </p>
        </div>
      </section>

      {/* Income / Expenses */}
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-glass-border bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{t("client.home.income")}</p>
          <p className="mt-1 font-display text-xl font-semibold">{fmt(24800)}</p>
          {spark([2, 4, 3, 6, 5, 8, 7, 9, 12], true)}
          <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-emerald-600">
            <TrendingUp className="size-3" /> +12%
          </p>
        </div>
        <div className="rounded-2xl border border-glass-border bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{t("client.home.expenses")}</p>
          <p className="mt-1 font-display text-xl font-semibold">{fmt(17100)}</p>
          {spark([8, 6, 9, 7, 5, 6, 4, 5, 3], false)}
          <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-rose-600">
            <TrendingDown className="size-3" /> -6%
          </p>
        </div>
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="mb-2 px-1 text-sm font-semibold">{t("client.home.quick")}</h2>
        <div className="grid grid-cols-4 gap-2">
          {quicks.map((q) => (
            <Gate key={q.to} feature={q.feature} fallback={<DisabledTile label={q.label} icon={q.icon} />}>
              <Link to={q.to} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white p-3 shadow-sm active:scale-95">
                <div className={cn("flex size-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md", q.tone)}>
                  <q.icon className="size-5" />
                </div>
                <span className="text-[11px] font-medium text-center leading-tight">{q.label}</span>
              </Link>
            </Gate>
          ))}
        </div>
      </section>

      {/* AI insights */}
      <Gate feature="ai.insights">
        <section className="rounded-2xl border border-glass-border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white"><Sparkles className="size-3.5" /></div>
            <h2 className="text-sm font-semibold">{t("client.home.insights")}</h2>
          </div>
          <ul className="space-y-2 text-sm">
            <li className="rounded-xl bg-amber-50 p-3">
              <p className="font-semibold text-amber-900">Cashflow warning</p>
              <p className="text-xs text-amber-800/80">You'll dip below €30k in 18 days at current run-rate.</p>
            </li>
            <li className="rounded-xl bg-emerald-50 p-3">
              <p className="font-semibold text-emerald-900">3 clients paid early</p>
              <p className="text-xs text-emerald-800/80">Auto-reconciled to sales invoices.</p>
            </li>
          </ul>
        </section>
      </Gate>

      {/* Recent activity */}
      <section className="rounded-2xl border border-glass-border bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t("client.home.recent")}</h2>
          <button className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600">View all <ArrowUpRight className="size-3" /></button>
        </div>
        <ul className="divide-y divide-slate-100">
          {activity.map((r) => (
            <li key={r.t} className="flex items-center justify-between py-2.5 text-sm">
              <div className="min-w-0 pe-3">
                <p className="truncate font-medium">{r.t}</p>
                <p className="truncate text-xs text-muted-foreground">{r.s}</p>
              </div>
              <span className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                r.tone === "success" && "bg-emerald-100 text-emerald-700",
                r.tone === "warning" && "bg-amber-100 text-amber-700",
                r.tone === "info"    && "bg-indigo-100 text-indigo-700",
              )}>{r.tone}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function DisabledTile({ label, icon: Icon }: { label: string; icon: typeof ScanLine }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-slate-50 p-3 opacity-60">
      <div className="flex size-11 items-center justify-center rounded-xl bg-slate-200 text-slate-400"><Icon className="size-5" /></div>
      <span className="text-[11px] font-medium text-center text-slate-400">{label}</span>
    </div>
  );
}
