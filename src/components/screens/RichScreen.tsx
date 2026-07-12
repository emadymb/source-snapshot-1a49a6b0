import type { ComponentType, ReactNode } from "react";
import { PageHeading } from "@/components/PagePlaceholder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

export type Kpi = { label: string; value: string; delta?: string; tone?: "up" | "down" | "flat" };

export function KpiGrid({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((k) => (
        <div key={k.label} className="glass rounded-2xl border-glass-border p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{k.label}</p>
          <p className="mt-2 font-display text-2xl font-semibold">{k.value}</p>
          {k.delta && (
            <p className={`mt-1 text-xs ${k.tone === "down" ? "text-destructive" : k.tone === "up" ? "text-emerald-600" : "text-muted-foreground"}`}>{k.delta}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export function DataCard({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="glass rounded-2xl border-glass-border p-5">
      <div className="flex items-center justify-between border-b border-glass-border pb-3">
        <h3 className="font-display text-base font-semibold">{title}</h3>
        {action}
      </div>
      <div className="pt-3">{children}</div>
    </div>
  );
}

export function Toolbar({ placeholder = "Search…", tabs, active, onTab, actions }: {
  placeholder?: string;
  tabs?: string[];
  active?: string;
  onTab?: (t: string) => void;
  actions?: ReactNode;
}) {
  return (
    <div className="glass mb-4 flex flex-wrap items-center gap-3 rounded-2xl border-glass-border p-3">
      <div className="relative min-w-[200px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder={placeholder} className="rounded-xl border-glass-border bg-glass pl-9" />
      </div>
      {tabs && (
        <div className="flex gap-1 rounded-xl border border-glass-border bg-glass p-1">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => onTab?.(t)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${active === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >{t}</button>
          ))}
        </div>
      )}
      {actions}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone: Record<string, string> = {
    paid: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    active: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    open: "bg-blue-500/15 text-blue-600 border-blue-500/30",
    pending: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    draft: "bg-muted text-muted-foreground border-glass-border",
    overdue: "bg-red-500/15 text-red-600 border-red-500/30",
    failed: "bg-red-500/15 text-red-600 border-red-500/30",
    closed: "bg-muted text-muted-foreground border-glass-border",
    resolved: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  };
  const key = status.toLowerCase();
  return <Badge variant="outline" className={`rounded-full ${tone[key] ?? "bg-secondary"}`}>{status}</Badge>;
}

export function DataTable<T>({ columns, rows, empty = "No records" }: {
  columns: { key: keyof T | string; label: string; render?: (row: T) => ReactNode; className?: string }[];
  rows: T[];
  empty?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-glass-border text-left text-xs uppercase tracking-wider text-muted-foreground">
            {columns.map((c) => (
              <th key={String(c.key)} className={`py-2 pe-4 font-medium ${c.className ?? ""}`}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={columns.length} className="py-8 text-center text-muted-foreground">{empty}</td></tr>
          )}
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-glass-border/50 last:border-0 hover:bg-secondary/30">
              {columns.map((c) => (
                <td key={String(c.key)} className={`py-3 pe-4 ${c.className ?? ""}`}>
                  {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key as string] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Screen({ title, description, icon, actions, children }: {
  title: string;
  description?: string;
  icon?: ComponentType<{ className?: string }>;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeading title={title} description={description} icon={icon}
        actions={actions ?? (
          <>
            <Button variant="outline" className="rounded-xl border-glass-border bg-glass">Export</Button>
            <Button className="rounded-xl bg-gradient-primary text-primary-foreground shadow-[var(--shadow-glow)]">New</Button>
          </>
        )}
      />
      <div className="space-y-6">{children}</div>
    </div>
  );
}