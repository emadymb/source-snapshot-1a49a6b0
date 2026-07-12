import { type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Package, Building2, CreditCard, Inbox, Wallet, BarChart3,
  Settings, Search, Bell, Languages, Crown, LogOut, ScrollText, Users, Megaphone, Boxes, ShieldCheck,
  Receipt, Ticket, Mail, Webhook, Activity, Shield, UserCircle, Code2, Layout, UserPlus, Sliders, Brain, MessageSquare, Terminal,
  FileText, Newspaper, Menu as MenuIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const NAV_GROUPS = [
  {
    label: "Platform",
    items: [
      { to: "/super", label: "nav.dashboard", icon: LayoutDashboard, exact: true },
      { to: "/super/health", label: "nav.health", icon: Activity },
      { to: "/super/reports", label: "nav.reports", icon: BarChart3 },
      { to: "/super/audit", label: "nav.audit", icon: ScrollText },
    ],
  },
  {
    label: "SaaS & Billing",
    items: [
      { to: "/super/plans", label: "nav.plans", icon: Package },
      { to: "/super/plan-builder", label: "nav.planBuilder", icon: Sliders },
      { to: "/super/workspaces", label: "nav.workspaces", icon: Building2 },
      { to: "/super/clients-new", label: "nav.clientsNew", icon: UserPlus },
      { to: "/super/subscriptions", label: "nav.subscriptions", icon: CreditCard },
      { to: "/super/invoices", label: "nav.invoices", icon: Receipt },
      { to: "/super/coupons", label: "nav.coupons", icon: Ticket },
      { to: "/super/requests", label: "nav.requests", icon: Inbox, badge: true },
      { to: "/super/gateways", label: "nav.gateways", icon: Wallet },
      { to: "/super/modules", label: "nav.modules", icon: Boxes },
    ],
  },

  {
    label: "Users & Access",
    items: [
      { to: "/super/users", label: "nav.users", icon: UserCircle },
      { to: "/super/roles", label: "nav.roles", icon: Shield },
      { to: "/super/team", label: "nav.team", icon: Users },
      { to: "/super/security", label: "nav.security", icon: ShieldCheck },
    ],
  },
  {
    label: "Content & Comms",
    items: [
      { to: "/super/cms", label: "CMS Dashboard", icon: LayoutDashboard, exact: true },
      { to: "/super/cms/pages", label: "الصفحات", icon: FileText },
      { to: "/super/cms/blog", label: "المدونة", icon: Newspaper },
      { to: "/super/cms/menus", label: "القوائم", icon: MenuIcon },
      { to: "/super/page-builder", label: "nav.pageBuilder", icon: Layout },
      { to: "/super/announcements", label: "nav.announcements", icon: Megaphone },
      { to: "/super/emails", label: "nav.emails", icon: Mail },
    ],
  },
  {
    label: "AI Platform",
    items: [
      { to: "/super/ai/dashboard", label: "AI Dashboard", icon: Brain },
      { to: "/super/ai/leads", label: "AI Leads", icon: UserPlus },
      { to: "/super/ai/settings", label: "AI Routing", icon: Sliders },
      { to: "/super/ai/widget", label: "Chat Widget", icon: MessageSquare },
      { to: "/super/ai/conversations", label: "سجل المحادثات", icon: MessageSquare },
    ],
  },
  {
    label: "Developer",
    items: [
      { to: "/super/developer", label: "Developer Console", icon: Terminal },
      { to: "/super/api-docs", label: "nav.apiDocs", icon: Code2 },
      { to: "/super/webhooks", label: "nav.webhooks", icon: Webhook },
      { to: "/super/settings", label: "nav.settings", icon: Settings },
    ],
  },
] as const;

export function SuperShell({ children }: { children: ReactNode }) {
  const { t, lang, toggle, dir } = useI18n();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (to: string, exact?: boolean) =>
    exact ? path === to : path === to || path.startsWith(to + "/");

  return (
    <div dir={dir} className="min-h-dvh bg-[oklch(0.97_0.008_260)] text-foreground">
      <div className="flex min-h-dvh">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col border-e border-glass-border bg-white/70 backdrop-blur lg:flex">
          <div className="flex h-16 items-center gap-3 border-b border-glass-border px-5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
              <Crown className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold leading-tight">{t("app.brand")}</p>
              <p className="truncate text-[11px] text-muted-foreground">{t("app.superAdmin")}</p>
            </div>
          </div>
          <nav className="flex-1 space-y-4 overflow-y-auto p-3">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{group.label}</p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = isActive(item.to, "exact" in item ? item.exact : false);
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={cn(
                          "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all",
                          active
                            ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                        )}
                      >
                        <item.icon className={cn("size-4 shrink-0", active ? "text-white" : "text-slate-500 group-hover:text-slate-900")} />
                        <span className="flex-1 truncate">{t(item.label as never)}</span>
                        {"badge" in item && item.badge ? (
                          <span className={cn(
                            "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                            active ? "bg-white/25 text-white" : "bg-red-500/15 text-red-600",
                          )}>4</span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-glass-border p-3">
            <div className="flex items-center gap-3 rounded-xl bg-slate-100 p-2">
              <Avatar className="size-9"><AvatarFallback className="bg-slate-900 text-white">SA</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">Owner</p><p className="truncate text-xs text-muted-foreground">owner@fiksu.fi</p></div>
              <button className="text-slate-500 hover:text-slate-900"><LogOut className="size-4" /></button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-glass-border bg-white/70 px-4 backdrop-blur lg:px-8">
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input placeholder={t("common.search")} className="rounded-xl border-slate-200 bg-white ps-10" />
            </div>
            <div className="ms-auto flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={toggle} className="gap-1.5 rounded-xl">
                <Languages className="size-4" /><span className="text-xs font-semibold uppercase">{lang === "en" ? "AR" : "EN"}</span>
              </Button>
              <Button variant="ghost" size="icon" className="rounded-xl"><Bell className="size-4" /></Button>
              <Avatar className="size-9"><AvatarFallback className="bg-slate-900 text-white">SA</AvatarFallback></Avatar>
            </div>
          </header>

          <main className="flex-1 p-4 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
