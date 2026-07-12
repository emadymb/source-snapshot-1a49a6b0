import { type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, ScanLine, ReceiptText, Bot, Wallet, MoreHorizontal, Bell, Languages, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useEntitlements, useEntitlement } from "@/lib/entitlements/store";
import { ClientRoleSwitcher } from "@/components/client/ClientRoleSwitcher";
import { cn } from "@/lib/utils";

/**
 * Mobile-first PWA shell for the Client workspace.
 * - Top app bar with brand, workspace picker, language toggle, notifications.
 * - Bottom tab bar (5 primary destinations) with entitlement gating.
 * - "More" sheet exposes secondary destinations & sign-out.
 * - Works both LTR & RTL; safe-area padding for iOS.
 */
export function ClientMobileShell({ children }: { children: ReactNode }) {
  const { t, lang, toggle, dir } = useI18n();
  const { workspaces, currentWorkspaceId, setCurrentWorkspaceId } = useEntitlements();
  const current = workspaces.find((w) => w.id === currentWorkspaceId) ?? workspaces[0];
  const path = useRouterState({ select: (s) => s.location.pathname });

  const tabs: { to: string; label: string; icon: typeof LayoutDashboard; feature?: string }[] = [
    { to: "/client",                     label: t("client.tab.home"),    icon: LayoutDashboard },
    { to: "/client/scan",                label: t("client.tab.scan"),    icon: ScanLine,     feature: "ai.ocr" },
    { to: "/client/accounting/expenses", label: t("client.tab.expenses"),icon: ReceiptText,  feature: "accounting.expenses" },
    { to: "/client/ai/chat",             label: t("client.tab.ai"),      icon: Bot,          feature: "ai.chat" },
    { to: "/client/accounting/payroll",  label: t("client.tab.payroll"), icon: Wallet,       feature: "hrm.payroll" },
  ];

  return (
    <div
      dir={dir}
      className="min-h-dvh bg-[oklch(0.98_0.006_240)] pb-[calc(env(safe-area-inset-bottom)+72px)] text-foreground"
    >
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-glass-border bg-white/80 px-4 backdrop-blur">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white font-display text-sm font-bold">
          F
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-semibold leading-tight">{current.name}</p>
          <p className="truncate text-[11px] text-muted-foreground">{t("client.workspace")}</p>
        </div>
        <ClientRoleSwitcher />
        <Button variant="ghost" size="sm" onClick={toggle} className="h-9 gap-1 rounded-xl px-2">
          <Languages className="size-4" /><span className="text-[11px] font-semibold uppercase">{lang === "en" ? "AR" : "EN"}</span>
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" aria-label={t("client.notifications")}>
          <Bell className="size-4" />
        </Button>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" aria-label={t("client.menu")}>
              <Menu className="size-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side={lang === "ar" ? "left" : "right"} className="w-[300px] p-0">
            <MoreDrawer />
          </SheetContent>
        </Sheet>
      </header>

      {/* Workspace picker chip row */}
      {workspaces.length > 1 && (
        <div className="scrollbar-none flex gap-2 overflow-x-auto border-b border-glass-border bg-white/60 px-4 py-2 backdrop-blur">
          {workspaces.map((w) => (
            <button
              key={w.id}
              onClick={() => setCurrentWorkspaceId(w.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                w.id === currentWorkspaceId
                  ? "border-indigo-600 bg-indigo-600 text-white shadow"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
              )}
            >
              {w.name}
              {w.status !== "active" && (
                <span className={cn(
                  "ms-2 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase",
                  w.status === "trial" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700",
                )}>
                  {w.status}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <main className="px-4 py-4">{children}</main>

      {/* Bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-glass-border bg-white/95 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto grid max-w-md grid-cols-5">
          {tabs.map((tab) => (
            <TabButton key={tab.to} tab={tab} active={isActive(path, tab.to)} />
          ))}
        </div>
      </nav>
    </div>
  );
}

function isActive(path: string, to: string) {
  return to === "/client" ? path === "/client" : path === to || path.startsWith(to + "/");
}

function TabButton({
  tab, active,
}: {
  tab: { to: string; label: string; icon: typeof LayoutDashboard; feature?: string };
  active: boolean;
}) {
  const gated = useEntitlement(tab.feature ?? "core.workspaces");
  const disabled = tab.feature ? !gated.on : false;
  const Icon = tab.icon;
  const body = (
    <div className={cn(
      "flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
      disabled ? "text-slate-300"
      : active ? "text-indigo-600"
      : "text-slate-500 hover:text-slate-900",
    )}>
      <div className={cn(
        "flex size-9 items-center justify-center rounded-xl transition-all",
        active && !disabled ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/30" : "",
      )}>
        <Icon className="size-4" />
      </div>
      <span className="truncate">{tab.label}</span>
    </div>
  );
  if (disabled) return <span aria-disabled className="cursor-not-allowed">{body}</span>;
  return <Link to={tab.to}>{body}</Link>;
}

function MoreDrawer() {
  const { t } = useI18n();
  const links: { to: string; label: string; feature: string }[] = [
    { to: "/client/documents",            label: t("client.more.documents"),  feature: "documents.enabled" },
    { to: "/client/banking",              label: t("client.more.banking"),    feature: "banking.feeds" },
    { to: "/client/insights",             label: t("client.more.insights"),   feature: "ai.insights" },
    { to: "/client/accounting",           label: t("client.more.accounting"), feature: "accounting.ledger" },
    { to: "/client/accounting/sales",     label: t("client.more.sales"),      feature: "accounting.invoices" },
    { to: "/client/accounting/purchases", label: t("client.more.purchases"),  feature: "accounting.purchases" },
    { to: "/client/accounting/reports",   label: t("client.more.reports"),    feature: "reports.standard" },
    { to: "/client/accounting/e-invoices",         label: "E-invoices — outbox", feature: "accounting.invoices" },
    { to: "/client/accounting/e-invoices-inbox",   label: "E-invoices — inbox",  feature: "accounting.invoices" },
    { to: "/client/accounting/e-invoices-settings",label: "E-invoice settings",  feature: "accounting.invoices" },
    { to: "/client/tickets",              label: t("client.more.tickets"),    feature: "core.workspaces" },
    { to: "/client/billing",              label: t("client.more.billing"),    feature: "core.workspaces" },
    { to: "/client/settings",             label: t("client.more.settings"),   feature: "core.workspaces" },
  ];
  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("client.workspace")}</p>
        <p className="mt-1 font-display text-lg font-semibold">Fiksu Workspace</p>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {links.map((l) => <MoreLink key={l.to} {...l} />)}
      </nav>
      <div className="border-t p-3">
        <Link to="/login" search={{ redirect: undefined }} className="block rounded-xl bg-slate-900 px-3 py-2.5 text-center text-sm font-medium text-white">
          {t("client.signOut")}
        </Link>
      </div>
    </div>
  );
}

function MoreLink({ to, label, feature }: { to: string; label: string; feature: string }) {
  const { t } = useI18n();
  const { on } = useEntitlement(feature);
  if (!on) {
    return (
      <span aria-disabled className="flex cursor-not-allowed items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400">
        <span>{label}</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase">{t("client.locked")}</span>
      </span>
    );
  }
  return (
    <Link to={to} className="block rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
      {label}
    </Link>
  );
}
