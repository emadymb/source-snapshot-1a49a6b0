import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function DataToolbar({
  value,
  onChange,
  placeholder = "Search…",
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-10 rounded-xl border-glass-border bg-glass pl-9"
        />
      </div>
      {children}
    </div>
  );
}

export function StatusPill({ tone, children }: { tone: "success" | "warning" | "info" | "muted" | "danger"; children: ReactNode }) {
  const cls =
    tone === "success" ? "bg-success/15 text-success" :
    tone === "warning" ? "bg-warning/25 text-warning-foreground" :
    tone === "danger" ? "bg-destructive/15 text-destructive" :
    tone === "info" ? "bg-primary/10 text-primary" :
    "bg-muted text-muted-foreground";
  return <span className={"inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium " + cls}>{children}</span>;
}