import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, ReceiptText, CheckCircle2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageGate } from "@/components/entitlements/GateBanner";
import { RangeFilterBar, matchesRangeFilter, useRangeFilter } from "@/components/client/RangeFilterBar";
import { UploadReceiptsDialog } from "@/components/client/UploadReceiptsDialog";
import { ExportMenu } from "@/components/client/ExportMenu";
import { useClientRole, Can } from "@/lib/client-role";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/client/accounting/expenses")({
  component: () => (
    <PageGate feature="accounting.expenses" title="Expenses" description="Enable expenses on your plan to track spending.">
      <ExpensesPage />
    </PageGate>
  ),
});

type Expense = { id: string; date: string; vendor: string; category: string; amount: number; vat: number; status: "pending" | "approved" };

const SEED: Expense[] = [
  { id: "e1", date: "2026-03-08", vendor: "K-Supermarket",      category: "Groceries", amount: 48.20,  vat: 14, status: "approved" },
  { id: "e2", date: "2026-03-07", vendor: "Teboil",             category: "Fuel",      amount: 62.10,  vat: 24, status: "approved" },
  { id: "e3", date: "2026-03-06", vendor: "Ravintola Savoy",    category: "Meals",     amount: 124.00, vat: 14, status: "pending"  },
  { id: "e4", date: "2026-03-05", vendor: "Verkkokauppa.com",   category: "Software",  amount: 249.00, vat: 24, status: "approved" },
  { id: "e5", date: "2026-03-03", vendor: "R-Kioski",           category: "Office",    amount: 8.90,   vat: 24, status: "pending"  },
  { id: "e6", date: "2026-03-01", vendor: "Alko",               category: "Meals",     amount: 42.00,  vat: 24, status: "approved" },
  { id: "e7", date: "2026-02-27", vendor: "Lidl",               category: "Groceries", amount: 62.50,  vat: 14, status: "approved" },
  { id: "e8", date: "2026-02-22", vendor: "Neste",              category: "Fuel",      amount: 88.20,  vat: 24, status: "approved" },
  { id: "e9", date: "2026-02-15", vendor: "Adobe",              category: "Software",  amount: 59.99,  vat: 24, status: "pending"  },
];

function ExpensesPage() {
  const { t, lang } = useI18n();
  const { can } = useClientRole();
  const [items, setItems] = useState<Expense[]>(SEED);
  const [filter, setFilter] = useRangeFilter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Expense>({
    id: "", date: new Date().toISOString().slice(0, 10), vendor: "", category: "Meals", amount: 0, vat: 24, status: "pending",
  });

  const filtered = useMemo(
    () => items.filter((e) =>
      matchesRangeFilter(e, filter, {
        text: (r) => `${r.vendor} ${r.category}`,
        date: (r) => r.date,
        status: (r) => r.status,
      })
    ),
    [items, filter]
  );

  const fmt = (n: number) => new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en-FI", { style: "currency", currency: "EUR" }).format(n);
  const total = filtered.reduce((s, e) => s + e.amount, 0);

  const approve = (id: string) => {
    setItems((p) => p.map((e) => (e.id === id ? { ...e, status: "approved" } : e)));
    toast.success("Expense approved");
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{t("client.exp.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("client.exp.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <ExportMenu
            title="Expenses"
            filenameBase="expenses"
            rows={filtered}
            columns={[
              { key: "date", label: "Date" },
              { key: "vendor", label: "Vendor" },
              { key: "category", label: "Category" },
              { key: "vat", label: "VAT %" },
              { key: "amount", label: "Amount", get: (r) => r.amount.toFixed(2) },
              { key: "status", label: "Status" },
            ]}
          />
          <UploadReceiptsDialog
            defaultDocType="receipt"
            trigger={
              <Button variant="outline" className="rounded-xl border-glass-border bg-glass" disabled={!can("docs.upload")}>
                <Upload className="me-1.5 size-4" /> Upload
              </Button>
            }
          />
          <Can cap="expense.create">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md">
                  <Plus className="me-1.5 size-4" />{t("client.exp.new")}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-3xl">
                <SheetHeader><SheetTitle>{t("client.exp.new")}</SheetTitle></SheetHeader>
                <div className="mt-4 grid gap-3">
                  <div><Label>{t("client.scan.vendor")}</Label><Input value={draft.vendor} onChange={(e) => setDraft({ ...draft, vendor: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>{t("client.scan.date")}</Label><Input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></div>
                    <div><Label>{t("client.scan.amount")}</Label><Input type="number" step="0.01" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>{t("client.scan.category")}</Label>
                      <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{["Meals","Fuel","Groceries","Office","Software","Travel"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{t("client.scan.vat")}</Label>
                      <Select value={String(draft.vat)} onValueChange={(v) => setDraft({ ...draft, vat: Number(v) })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{[0,10,14,24].map(r => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <SheetFooter className="mt-4">
                  <Button className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
                    onClick={() => {
                      if (!draft.vendor || !draft.amount) return toast.error("Vendor and amount required");
                      setItems((p) => [{ ...draft, id: `e${Date.now()}` }, ...p]);
                      toast.success("Expense added");
                      setOpen(false);
                      setDraft({ ...draft, vendor: "", amount: 0 });
                    }}>
                    {t("common.save")}
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </Can>
        </div>
      </header>

      <div className="rounded-2xl border border-glass-border bg-white p-4 shadow-sm">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total ({filtered.length})</p>
        <p className="mt-1 font-display text-2xl font-semibold">{fmt(total)}</p>
      </div>

      <RangeFilterBar
        value={filter}
        onChange={setFilter}
        placeholder="Search vendor or category…"
        statuses={[{ value: "pending", label: "Pending" }, { value: "approved", label: "Approved" }]}
      />

      <ul className="space-y-2">
        {filtered.length === 0 && (
          <li className="rounded-2xl bg-white p-8 text-center text-sm text-muted-foreground">No expenses match your filters.</li>
        )}
        {filtered.map((e) => (
          <li key={e.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
            <div className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><ReceiptText className="size-5" /></div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{e.vendor}</p>
              <p className="truncate text-xs text-muted-foreground">{e.category} · {e.date}</p>
            </div>
            <div className="text-end">
              <p className="font-display text-sm font-semibold tabular-nums">{fmt(e.amount)}</p>
              <span className={cn(
                "text-[10px] font-medium uppercase",
                e.status === "approved" ? "text-emerald-600" : "text-amber-600",
              )}>{e.status}</span>
            </div>
            {e.status === "pending" && can("expense.approve") && (
              <Button size="icon" variant="ghost" className="size-8" onClick={() => approve(e.id)} title="Approve">
                <CheckCircle2 className="size-4 text-emerald-600" />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
