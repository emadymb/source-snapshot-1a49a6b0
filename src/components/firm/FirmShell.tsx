import { type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Building2, Briefcase, ListChecks, Receipt,
  ShieldCheck, Settings, Search, Bell, Languages, Building, LogOut, ChevronDown, UserPlus, History,
  BarChart3, Clock, FileText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n";
import { useFirm } from "@/lib/mock/firm";
import { useEntitlement } from "@/lib/entitlements/store";
import { cn } from "@/lib/utils";

const ROLE_COLOR: Record<string, { dot: string; bg: string }> = {
  violet: { dot: "bg-violet-500", bg: "bg-violet-600" },
  indigo: { dot: "bg-indigo-500", bg: "bg-indigo-600" },
  emerald: { dot: "bg-emerald-500", bg: "bg-emerald-600" },
  sky: { dot: "bg-sky-500", bg: "bg-sky-600" },
  amber: { dot: "bg-amber-500", bg: "bg-amber-600" },
};

const NAV = [
  { to: "/firm", label: "firm.nav.dashboard", icon: LayoutDashboard, exact: true },
  { to: "/firm/clients", label: "firm.nav.clients", icon: Building2 },
  { to: "/firm/clients-new", label: "nav.clientsNew", icon: UserPlus },
  { to: "/firm/staff", label: "firm.nav.staff", icon: Users },

  { to: "/firm/roles", label: "firm.nav.roles", icon: ShieldCheck },
  { to: "/firm/engagements", label: "firm.nav.engagements", icon: Briefcase },
  { to: "/firm/tasks", label: "firm.nav.tasks", icon: ListChecks },
  { to: "/firm/invoices", label: "firm.nav.invoices", icon: Receipt },
  { to: "/firm/time", label: "firm.nav.time", icon: Clock, feature: "firm.time" },
  { to: "/firm/documents", label: "firm.nav.documents", icon: FileText, feature: "firm.documents" },
  { to: "/firm/reports", label: "firm.nav.reports", icon: BarChart3, feature: "firm.reports" },
  { to: "/firm/audit", label: "firm.nav.audit", icon: History },
  { to: "/firm/settings", label: "firm.nav.settings", icon: Settings },
] as const;

export function FirmShell({ children }: { children: ReactNode }) {
  const { t, lang, toggle, dir } = useI18n();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { staff, roles, currentStaffId, setCurrentStaff } = useFirm();
  const current = staff.find((s) => s.id === currentStaffId)!;
  const currentRole = roles.find((r) => r.id === current.roleId)!;

  const isActive = (to: string, exact?: boolean) =>
    exact ? path === to : path === to || path.startsWith(to + "/");

  return (
    <div dir={dir} className="min-h-dvh bg-[oklch(0.97_0.01_240)] text-foreground">
      <div className="flex min-h-dvh">
        <aside className="hidden w-64 shrink-0 flex-col border-e border-glass-border bg-white/70 backdrop-blur lg:flex">
          <div className="flex h-16 items-center gap-3 border-b border-glass-border px-5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white">
              <Building className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold leading-tight">Fiksu Advisors</p>
              <p className="truncate text-[11px] text-muted-foreground">{t("firm.brand")}</p>
            </div>
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {NAV.map((item) => <NavItem key={item.to} item={item} isActive={isActive} t={t as (k: string) => string} />)}
          </nav>
          <div className="border-t border-glass-border p-3">
            <div className="flex items-center gap-3 rounded-xl bg-slate-100 p-2">
              <Avatar className="size-9"><AvatarFallback className={`${ROLE_COLOR[currentRole.color]?.bg ?? "bg-slate-600"} text-white`}>{current.avatarSeed}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{current.name}</p>
                <p className="truncate text-xs text-muted-foreground">{currentRole.name}</p>
              </div>
              <button className="text-slate-500 hover:text-slate-900"><LogOut className="size-4" /></button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-glass-border bg-white/70 px-4 backdrop-blur lg:px-8">
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input placeholder={t("common.search")} className="rounded-xl border-slate-200 bg-white ps-10" />
            </div>
            <div className="ms-auto flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 rounded-xl">
                    <span className={`size-2 rounded-full ${ROLE_COLOR[currentRole.color]?.dot ?? "bg-slate-500"}`} />
                    <span className="text-xs font-medium">{t("firm.viewingAs")}: {current.name.split(" ")[0]}</span>
                    <ChevronDown className="size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>{t("firm.switchRole")}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {staff.filter(s => s.status === "active").map((s) => {
                    const r = roles.find(x => x.id === s.roleId)!;
                    return (
                      <DropdownMenuItem key={s.id} onClick={() => setCurrentStaff(s.id)} className="gap-2">
                        <span className={`size-2 rounded-full ${ROLE_COLOR[r.color]?.dot ?? "bg-slate-500"}`} />
                        <div className="flex-1"><div className="text-sm">{s.name}</div><div className="text-xs text-muted-foreground">{r.name}</div></div>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="sm" onClick={toggle} className="gap-1.5 rounded-xl">
                <Languages className="size-4" /><span className="text-xs font-semibold uppercase">{lang === "en" ? "AR" : "EN"}</span>
              </Button>
              <Button variant="ghost" size="icon" className="rounded-xl"><Bell className="size-4" /></Button>
              <Avatar className="size-9"><AvatarFallback className={`${ROLE_COLOR[currentRole.color]?.bg ?? "bg-slate-600"} text-white`}>{current.avatarSeed}</AvatarFallback></Avatar>
            </div>
          </header>

          <main className="flex-1 p-4 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

type NavEntry = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  feature?: string;
};

function NavItem({ item, isActive, t }: { item: NavEntry; isActive: (to: string, exact?: boolean) => boolean; t: (k: string) => string }) {
  const gate = useEntitlement(item.feature ?? "");
  if (item.feature && !gate.on) return null;
  const active = isActive(item.to, item.exact);
  return (
    <Link
      to={item.to}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all",
        active
          ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
      )}
    >
      <item.icon className={cn("size-4 shrink-0", active ? "text-white" : "text-slate-500 group-hover:text-slate-900")} />
      <span className="flex-1 truncate">{t(item.label)}</span>
    </Link>
  );
}
