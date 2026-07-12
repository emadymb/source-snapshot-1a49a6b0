import { useState } from "react";
import { Search, CalendarDays, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type RangeFilterValue = { q: string; from: string; to: string; status: string };

export const emptyFilter: RangeFilterValue = { q: "", from: "", to: "", status: "all" };

/** Compact filter bar: search + date range + status. Emits a single onChange every keystroke. */
export function RangeFilterBar({
  value,
  onChange,
  statuses,
  placeholder = "Search…",
  className,
}: {
  value: RangeFilterValue;
  onChange: (v: RangeFilterValue) => void;
  statuses?: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}) {
  const set = <K extends keyof RangeFilterValue>(k: K, v: RangeFilterValue[K]) => onChange({ ...value, [k]: v });
  const dirty = value.q || value.from || value.to || value.status !== "all";
  return (
    <div className={cn("glass flex flex-wrap items-center gap-2 rounded-2xl border-glass-border p-3", className)}>
      <div className="relative min-w-[180px] flex-1">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value.q}
          onChange={(e) => set("q", e.target.value)}
          placeholder={placeholder}
          className="rounded-xl border-glass-border bg-glass ps-9"
        />
      </div>
      <div className="flex items-center gap-1.5">
        <CalendarDays className="size-4 text-muted-foreground" />
        <Input
          type="date"
          value={value.from}
          onChange={(e) => set("from", e.target.value)}
          className="h-9 w-[140px] rounded-xl border-glass-border bg-glass text-xs"
          aria-label="From"
        />
        <span className="text-xs text-muted-foreground">→</span>
        <Input
          type="date"
          value={value.to}
          onChange={(e) => set("to", e.target.value)}
          className="h-9 w-[140px] rounded-xl border-glass-border bg-glass text-xs"
          aria-label="To"
        />
      </div>
      {statuses && (
        <Select value={value.status} onValueChange={(v) => set("status", v)}>
          <SelectTrigger className="h-9 w-[150px] rounded-xl border-glass-border bg-glass">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {dirty && (
        <Button variant="ghost" size="sm" onClick={() => onChange(emptyFilter)} className="h-9 rounded-xl">
          <X className="me-1 size-4" /> Clear
        </Button>
      )}
    </div>
  );
}

/** Convenient row matcher — returns true if row passes the range filter. */
export function matchesRangeFilter<T>(row: T, f: RangeFilterValue, opts: {
  text: (r: T) => string;
  date?: (r: T) => string; // ISO YYYY-MM-DD
  status?: (r: T) => string;
}): boolean {
  if (f.q && !opts.text(row).toLowerCase().includes(f.q.toLowerCase())) return false;
  if (f.from && opts.date && opts.date(row) < f.from) return false;
  if (f.to && opts.date && opts.date(row) > f.to) return false;
  if (f.status !== "all" && opts.status && opts.status(row) !== f.status) return false;
  return true;
}

export function useRangeFilter(initial: Partial<RangeFilterValue> = {}) {
  const [value, setValue] = useState<RangeFilterValue>({ ...emptyFilter, ...initial });
  return [value, setValue] as const;
}
