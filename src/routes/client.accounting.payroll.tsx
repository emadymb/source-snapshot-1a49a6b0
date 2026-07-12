import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Wallet, Download, ChevronRight, Plus, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageGate } from "@/components/entitlements/GateBanner";
import { ExportMenu } from "@/components/client/ExportMenu";
import { RangeFilterBar, matchesRangeFilter, useRangeFilter } from "@/components/client/RangeFilterBar";
import { useClientRole, Can } from "@/lib/client-role";
import {
  listPayroll,
  listEmployees,
  generatePayroll,
  setPayrollStatus,
  type PayrollDTO,
  type PayrollLineDTO,
  type UiPayrollStatus,
} from "@/lib/hrm.functions";

export const Route = createFileRoute("/client/accounting/payroll")({
  component: () => (
    <PageGate feature="hrm.payroll" title="Payroll" description="Enable payroll on your plan to run monthly TyEL/YEL runs.">
      <RoleGate />
    </PageGate>
  ),
});

function RoleGate() {
  const { can } = useClientRole();
  if (!can("payroll.view")) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg"><Wallet className="size-6" /></div>
        <h2 className="mt-5 font-display text-2xl font-semibold">Payroll is restricted</h2>
        <p className="mt-2 text-sm text-muted-foreground">Only Client Owners and Employees can view payslips.</p>
      </div>
    );
  }
  return <PayrollPage />;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const periodLabel = (p: PayrollDTO) => `${MONTHS[p.month - 1]} ${p.year}`;

const STATUS_TONE: Record<UiPayrollStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  approved: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
};

type LineForm = { label: string; amount: string };

function PayrollPage() {
  const { t, lang } = useI18n();
  const { can } = useClientRole();
  const qc = useQueryClient();

  const listFn = useServerFn(listPayroll);
  const employeesFn = useServerFn(listEmployees);
  const generateFn = useServerFn(generatePayroll);
  const statusFn = useServerFn(setPayrollStatus);

  const { data: runs = [], isLoading } = useQuery({ queryKey: ["hrm", "payroll"], queryFn: () => listFn({ data: {} }) });
  const { data: employees = [] } = useQuery({ queryKey: ["hrm", "employees"], queryFn: () => employeesFn() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["hrm"] });

  const [active, setActive] = useState<PayrollDTO | null>(null);
  const [filter, setFilter] = useRangeFilter();
  const [genOpen, setGenOpen] = useState(false);

  const now = new Date();
  const [gEmployee, setGEmployee] = useState("");
  const [gMonth, setGMonth] = useState(now.getMonth() + 1);
  const [gYear, setGYear] = useState(now.getFullYear());
  const [allowances, setAllowances] = useState<LineForm[]>([]);
  const [deductions, setDeductions] = useState<LineForm[]>([{ label: "Tax (withholding)", amount: "" }]);

  const fmt = (n: number) => new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en-FI", { style: "currency", currency: "EUR" }).format(n);

  const generateMut = useMutation({
    mutationFn: (d: { employeeId: string; month: number; year: number; allowanceLines: PayrollLineDTO[]; deductionLines: PayrollLineDTO[] }) => generateFn({ data: d }),
    onSuccess: (r) => { invalidate(); setGenOpen(false); toast.success(`Payroll generated · net ${fmt(r.net)}`); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Generation failed."),
  });
  const statusMut = useMutation({
    mutationFn: (d: { id: string; status: UiPayrollStatus }) => statusFn({ data: d }),
    onSuccess: () => { invalidate(); toast.success("Status updated."); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed."),
  });

  const filtered = runs.filter((s) =>
    matchesRangeFilter(s, filter, { text: (r) => `${r.employeeName} ${periodLabel(r)}`, date: (r) => `${r.year}-${String(r.month).padStart(2, "0")}-01` }),
  );
  const groups = Object.entries(
    filtered.reduce<Record<string, PayrollDTO[]>>((a, s) => ({ ...a, [periodLabel(s)]: [...(a[periodLabel(s)] ?? []), s] }), {}),
  );

  const exportRows = filtered.map((r) => ({
    period: periodLabel(r),
    employeeName: r.employeeName,
    base: r.base.toFixed(2),
    allowances: r.allowances.toFixed(2),
    deductions: r.deductions.toFixed(2),
    net: r.net.toFixed(2),
    status: r.status,
  }));

  const heroPeriod = useMemo(() => {
    if (!runs.length) return null;
    const top = [...runs].sort((a, b) => b.year - a.year || b.month - a.month)[0];
    const items = runs.filter((r) => r.month === top.month && r.year === top.year);
    return { label: periodLabel(top), count: items.length, net: items.reduce((n, r) => n + r.net, 0) };
  }, [runs]);

  const parseLines = (rows: LineForm[]): PayrollLineDTO[] =>
    rows.filter((r) => r.label.trim() && Number(r.amount) > 0).map((r) => ({ label: r.label.trim(), amount: Number(r.amount) }));

  function submitGenerate() {
    if (!gEmployee) { toast.error("Select an employee."); return; }
    generateMut.mutate({
      employeeId: gEmployee,
      month: gMonth,
      year: gYear,
      allowanceLines: parseLines(allowances),
      deductionLines: parseLines(deductions),
    });
  }

  const updateLine = (set: React.Dispatch<React.SetStateAction<LineForm[]>>, i: number, patch: Partial<LineForm>) =>
    set((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{t("client.pay.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("client.pay.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <ExportMenu
            title="Payroll register"
            filenameBase="payroll"
            rows={exportRows}
            columns={[
              { key: "period", label: "Period" },
              { key: "employeeName", label: "Employee" },
              { key: "base", label: "Base (€)" },
              { key: "allowances", label: "Allowances (€)" },
              { key: "deductions", label: "Deductions (€)" },
              { key: "net", label: "Net (€)" },
              { key: "status", label: "Status" },
            ]}
          />
          <Can cap="payroll.approve">
            <Button className="rounded-xl bg-gradient-primary text-primary-foreground" onClick={() => setGenOpen(true)}>
              <Plus className="me-1.5 size-4" /> Generate run
            </Button>
          </Can>
        </div>
      </header>

      {heroPeriod && (
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-lg shadow-emerald-500/25">
          <p className="text-xs opacity-80">{heroPeriod.label} · {heroPeriod.count} employees</p>
          <p className="mt-2 font-display text-3xl font-bold tracking-tight">{fmt(heroPeriod.net)}</p>
          <p className="mt-1 text-xs opacity-80">{t("client.pay.net")} · total for period</p>
        </section>
      )}

      <RangeFilterBar value={filter} onChange={setFilter} placeholder="Search employee or period…" />

      {isLoading && <div className="rounded-2xl bg-white p-8 text-center text-sm text-muted-foreground">Loading payroll…</div>}

      {groups.map(([period, slips]) => (
        <section key={period}>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{period}</h2>
          <ul className="space-y-2">
            {slips.map((s) => (
              <li key={s.id}>
                <button onClick={() => setActive(s)} className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-start shadow-sm active:scale-[0.99]">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><Wallet className="size-5" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.employeeName}</p>
                    <span className={"mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium capitalize " + STATUS_TONE[s.status]}>{s.status}</span>
                  </div>
                  <div className="text-end">
                    <p className="font-display text-sm font-semibold tabular-nums">{fmt(s.net)}</p>
                    <p className="text-[10px] text-muted-foreground">net</p>
                  </div>
                  <ChevronRight className="size-4 text-slate-300 rtl:rotate-180" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {!isLoading && groups.length === 0 && (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-muted-foreground">No payroll runs yet.</div>
      )}

      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          {active && (
            <>
              <SheetHeader><SheetTitle>{active.employeeName} · {periodLabel(active)}</SheetTitle></SheetHeader>
              <dl className="mt-4 divide-y divide-slate-100">
                <Row label="Base salary" value={fmt(active.base)} />
                {active.allowanceLines.map((a, i) => <Row key={"a" + i} label={a.label} value={"+" + fmt(a.amount)} />)}
                {active.deductionLines.map((d, i) => <Row key={"d" + i} label={d.label} value={"-" + fmt(d.amount)} />)}
                <Row label={t("client.pay.net")} value={fmt(active.net)} strong />
              </dl>

              <Can cap="payroll.approve">
                <div className="mt-4 flex gap-2">
                  {active.status === "draft" && (
                    <Button className="flex-1 rounded-xl bg-amber-500 text-white hover:bg-amber-600"
                      onClick={() => { statusMut.mutate({ id: active.id, status: "approved" }); setActive(null); }}>
                      <Check className="me-2 size-4" /> Approve
                    </Button>
                  )}
                  {active.status === "approved" && (
                    <Button className="flex-1 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                      onClick={() => { statusMut.mutate({ id: active.id, status: "paid" }); setActive(null); }}>
                      <Check className="me-2 size-4" /> Mark as paid
                    </Button>
                  )}
                </div>
              </Can>

              <Button className="mt-2 w-full rounded-xl bg-slate-900 text-white" onClick={() => toast.success(`PDF queued for ${active.employeeName}`)}>
                <Download className="me-2 size-4" />{t("client.pay.download")}
              </Button>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Generate payroll run</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-3">
                <Label>Employee</Label>
                <select value={gEmployee} onChange={(e) => setGEmployee(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Select employee…</option>
                  {employees.filter((e) => e.isActive).map((e) => (
                    <option key={e.id} value={e.id}>{e.fullName} — {fmt(e.baseSalary)}/mo</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Month</Label>
                <select value={gMonth} onChange={(e) => setGMonth(Number(e.target.value))}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <Label>Year</Label>
                <Input type="number" min={2000} max={2100} value={gYear} onChange={(e) => setGYear(Number(e.target.value))} />
              </div>
            </div>

            <LineEditor title="Allowances" rows={allowances} onAdd={() => setAllowances((r) => [...r, { label: "", amount: "" }])}
              onRemove={(i) => setAllowances((r) => r.filter((_, idx) => idx !== i))} onChange={(i, p) => updateLine(setAllowances, i, p)} />
            <LineEditor title="Deductions" rows={deductions} onAdd={() => setDeductions((r) => [...r, { label: "", amount: "" }])}
              onRemove={(i) => setDeductions((r) => r.filter((_, idx) => idx !== i))} onChange={(i, p) => updateLine(setDeductions, i, p)} />

            <p className="text-xs text-muted-foreground">Net is auto-calculated: base salary + allowances − deductions.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setGenOpen(false)}>Cancel</Button>
            <Button onClick={submitGenerate} disabled={generateMut.isPending}>Generate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LineEditor({ title, rows, onAdd, onRemove, onChange }: {
  title: string; rows: LineForm[];
  onAdd: () => void; onRemove: (i: number) => void; onChange: (i: number, patch: Partial<LineForm>) => void;
}) {
  return (
    <div className="rounded-xl border p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold">{title}</span>
        <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={onAdd}><Plus className="size-3.5" /> Add</Button>
      </div>
      {rows.length === 0 && <p className="text-xs text-muted-foreground">None.</p>}
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input placeholder="Label" value={r.label} onChange={(e) => onChange(i, { label: e.target.value })} />
            <Input type="number" min={0} placeholder="0.00" className="w-28" value={r.amount} onChange={(e) => onChange(i, { amount: e.target.value })} />
            <Button size="icon" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => onRemove(i)}><Trash2 className="size-4" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={"flex items-center justify-between py-2.5 text-sm " + (strong ? "font-semibold" : "")}>
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
