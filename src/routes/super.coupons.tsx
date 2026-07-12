import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Ticket, Plus, Copy, Trash2, Percent, Euro, Infinity as InfIcon, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/super/coupons")({ component: CouponsPage });

type Kind = "percent" | "amount";
type Duration = "once" | "3mo" | "forever";

interface Coupon {
  id: string;
  code: string;
  kind: Kind;
  value: number;
  duration: Duration;
  maxRedemptions: number | null;
  redemptions: number;
  expires: string | null;
  active: boolean;
  appliesTo: "all" | "new" | "specific";
}

const SEED: Coupon[] = [
  { id: "c1", code: "LAUNCH50", kind: "percent", value: 50, duration: "3mo", maxRedemptions: 100, redemptions: 47, expires: "2026-09-30", active: true, appliesTo: "new" },
  { id: "c2", code: "SUMMER10", kind: "percent", value: 10, duration: "once", maxRedemptions: null, redemptions: 214, expires: "2026-08-31", active: true, appliesTo: "all" },
  { id: "c3", code: "NORDIC-YEAR", kind: "amount", value: 199, duration: "once", maxRedemptions: 50, redemptions: 12, expires: null, active: true, appliesTo: "new" },
  { id: "c4", code: "BLACK24", kind: "percent", value: 30, duration: "3mo", maxRedemptions: 500, redemptions: 500, expires: "2024-12-31", active: false, appliesTo: "all" },
  { id: "c5", code: "PARTNER-K", kind: "percent", value: 25, duration: "forever", maxRedemptions: null, redemptions: 8, expires: null, active: true, appliesTo: "specific" },
];

function CouponsPage() {
  const { t } = useI18n();
  const [items, setItems] = useState(SEED);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Omit<Coupon, "id" | "redemptions">>({ code: "", kind: "percent", value: 20, duration: "once", maxRedemptions: 100, expires: null, active: true, appliesTo: "all" });

  const create = () => {
    if (!form.code) return toast.error("Code required");
    setItems((p) => [{ ...form, code: form.code.toUpperCase(), id: `c${Date.now()}`, redemptions: 0 }, ...p]);
    toast.success(`Coupon ${form.code.toUpperCase()} created`);
    setOpen(false);
    setForm({ code: "", kind: "percent", value: 20, duration: "once", maxRedemptions: 100, expires: null, active: true, appliesTo: "all" });
  };

  const totals = {
    active: items.filter((c) => c.active).length,
    redemptions: items.reduce((s, c) => s + c.redemptions, 0),
    lost: items.reduce((s, c) => s + c.redemptions * (c.kind === "percent" ? 89 * (c.value / 100) : c.value), 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t("nav.coupons")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Promotional codes, partner discounts, and campaign links.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md"><Plus className="me-1.5 size-4" />New coupon</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Create coupon</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-2">
              <div className="col-span-2"><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="SAVE20" className="mt-1.5 font-mono uppercase" /></div>
              <div>
                <Label>Discount type</Label>
                <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as Kind })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="percent">Percent</SelectItem><SelectItem value="amount">Fixed € amount</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Value</Label><Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} className="mt-1.5" /></div>
              <div>
                <Label>Duration</Label>
                <Select value={form.duration} onValueChange={(v) => setForm({ ...form, duration: v as Duration })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="once">One-time</SelectItem><SelectItem value="3mo">First 3 months</SelectItem><SelectItem value="forever">Forever</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Max redemptions</Label><Input type="number" value={form.maxRedemptions ?? ""} onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value ? Number(e.target.value) : null })} placeholder="Unlimited" className="mt-1.5" /></div>
              <div className="col-span-2"><Label>Expires</Label><Input type="date" value={form.expires ?? ""} onChange={(e) => setForm({ ...form, expires: e.target.value || null })} className="mt-1.5" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
              <Button onClick={create} className="bg-indigo-600 text-white hover:bg-indigo-700">Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-glass-border bg-white p-5 shadow-sm"><p className="text-xs uppercase tracking-wide text-muted-foreground">Active codes</p><p className="mt-2 font-display text-2xl font-semibold">{totals.active}</p></div>
        <div className="rounded-2xl border border-glass-border bg-white p-5 shadow-sm"><p className="text-xs uppercase tracking-wide text-muted-foreground">Total redemptions</p><p className="mt-2 font-display text-2xl font-semibold">{totals.redemptions}</p></div>
        <div className="rounded-2xl border border-glass-border bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-sm"><p className="text-xs uppercase tracking-wide text-amber-700">Discount granted</p><p className="mt-2 font-display text-2xl font-semibold text-amber-800">€{Math.round(totals.lost).toLocaleString()}</p></div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((c) => {
          const pct = c.maxRedemptions ? Math.round((c.redemptions / c.maxRedemptions) * 100) : 0;
          return (
            <article key={c.id} className={`rounded-2xl border bg-white p-5 shadow-sm ${c.active ? "border-glass-border" : "border-dashed border-slate-300 opacity-70"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Ticket className="size-4 text-indigo-600" />
                    <span className="font-mono text-lg font-bold tracking-wider">{c.code}</span>
                    <button onClick={() => { navigator.clipboard?.writeText(c.code); toast.success("Copied"); }} className="text-slate-400 hover:text-slate-900"><Copy className="size-3.5" /></button>
                  </div>
                  <p className="mt-1 text-xs capitalize text-muted-foreground">Applies to: {c.appliesTo === "all" ? "all workspaces" : c.appliesTo === "new" ? "new signups" : "specific workspaces"}</p>
                </div>
                <Switch checked={c.active} onCheckedChange={(v) => { setItems((p) => p.map((x) => x.id === c.id ? { ...x, active: v } : x)); toast.success(`${c.code} ${v ? "activated" : "paused"}`); }} />
              </div>

              <div className="mt-4 flex items-baseline gap-2 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 p-4">
                {c.kind === "percent" ? <Percent className="size-5 text-indigo-600" /> : <Euro className="size-5 text-indigo-600" />}
                <span className="font-display text-4xl font-semibold text-indigo-700">{c.value}{c.kind === "percent" ? "%" : "€"}</span>
                <span className="text-xs text-indigo-600/70">off · {c.duration === "once" ? "one time" : c.duration === "3mo" ? "3 months" : "forever"}</span>
              </div>

              <div className="mt-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Redemptions</span>
                  <span className="font-semibold tabular-nums">{c.redemptions}{c.maxRedemptions ? ` / ${c.maxRedemptions}` : ""}{!c.maxRedemptions && <InfIcon className="ms-1 inline size-3" />}</span>
                </div>
                {c.maxRedemptions && (
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${pct >= 100 ? "bg-red-500" : "bg-gradient-to-r from-indigo-500 to-violet-500"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                )}
                {c.expires && <p className="flex items-center gap-1 text-muted-foreground"><Calendar className="size-3" />Expires {c.expires}</p>}
              </div>

              <div className="mt-4 flex justify-end">
                <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => { setItems((p) => p.filter((x) => x.id !== c.id)); toast("Coupon deleted"); }}><Trash2 className="size-3.5" /></Button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
