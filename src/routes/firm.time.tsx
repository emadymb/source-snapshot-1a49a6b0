import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Clock, Play, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { useFirm } from "@/lib/mock/firm";
import { PageGate } from "@/components/entitlements/GateBanner";

export const Route = createFileRoute("/firm/time")({
  component: () => (
    <PageGate feature="firm.time" title="Time tracking" description="Available on Growth, Scale and Enterprise plans.">
      <TimePage />
    </PageGate>
  ),
});

interface Entry {
  id: string;
  date: string;
  staffId: string;
  clientId: string;
  engagementId?: string;
  hours: number;
  note: string;
  billable: boolean;
}

const SEED: Entry[] = [
  { id: "te_1", date: "2026-03-08", staffId: "s_002", clientId: "c_001", engagementId: "e_001", hours: 3.5, note: "Reconciliation & GL cleanup", billable: true },
  { id: "te_2", date: "2026-03-08", staffId: "s_003", clientId: "c_002", engagementId: "e_005", hours: 2, note: "Advisory call — cashflow", billable: true },
  { id: "te_3", date: "2026-03-08", staffId: "s_005", clientId: "c_004", engagementId: "e_004", hours: 5, note: "Payroll run prep", billable: true },
  { id: "te_4", date: "2026-03-07", staffId: "s_004", clientId: "c_003", engagementId: "e_003", hours: 6, note: "Annual close — depreciation", billable: true },
  { id: "te_5", date: "2026-03-07", staffId: "s_003", clientId: "c_005", engagementId: "e_006", hours: 2.5, note: "Onboarding — CoA setup", billable: true },
  { id: "te_6", date: "2026-03-06", staffId: "s_007", clientId: "c_003", hours: 1, note: "Collections follow-up", billable: false },
  { id: "te_7", date: "2026-03-06", staffId: "s_002", clientId: "c_001", engagementId: "e_002", hours: 2, note: "VAT return prep", billable: true },
];

function TimePage() {
  const { t } = useI18n();
  const { staff, clients, engagements, currentStaffId } = useFirm();
  const [entries, setEntries] = useState<Entry[]>(SEED);
  const [staffFilter, setStaffFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [draft, setDraft] = useState({ clientId: "", hours: "", note: "" });

  const filtered = entries.filter(e =>
    (staffFilter === "all" || e.staffId === staffFilter) &&
    (clientFilter === "all" || e.clientId === clientFilter)
  );

  const totals = useMemo(() => {
    const totalHours = filtered.reduce((s, e) => s + e.hours, 0);
    const billableHours = filtered.filter(e => e.billable).reduce((s, e) => s + e.hours, 0);
    const revenue = filtered.filter(e => e.billable).reduce((s, e) => {
      const rate = staff.find(x => x.id === e.staffId)?.billableRate ?? 0;
      return s + e.hours * rate;
    }, 0);
    const billablePct = totalHours ? Math.round((billableHours / totalHours) * 100) : 0;
    return { totalHours, billableHours, revenue, billablePct };
  }, [filtered, staff]);

  const addEntry = () => {
    if (!draft.clientId || !draft.hours) { toast.error("Client and hours required"); return; }
    const e: Entry = {
      id: `te_${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      staffId: currentStaffId,
      clientId: draft.clientId,
      hours: Number(draft.hours),
      note: draft.note || "—",
      billable: true,
    };
    setEntries(p => [e, ...p]);
    setDraft({ clientId: "", hours: "", note: "" });
    toast.success("Time entry logged");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t("firm.time.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("firm.time.subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Hours logged" value={`${totals.totalHours.toFixed(1)}h`} tone="text-slate-800" />
        <Kpi label="Billable" value={`${totals.billableHours.toFixed(1)}h`} tone="text-emerald-600" />
        <Kpi label="Billable ratio" value={`${totals.billablePct}%`} tone="text-indigo-600">
          <Progress value={totals.billablePct} className="mt-2 h-1.5" />
        </Kpi>
        <Kpi label="Revenue value" value={`€${totals.revenue.toLocaleString()}`} tone="text-emerald-700" />
      </div>

      <section className="rounded-2xl border border-glass-border bg-white p-5 shadow-sm">
        <header className="mb-4 flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600"><Play className="size-4" /></div>
          <div><h3 className="font-display text-base font-semibold">Quick log</h3><p className="text-xs text-muted-foreground">Track time as your current seat</p></div>
        </header>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_120px_2fr_auto]">
          <Select value={draft.clientId} onValueChange={(v) => setDraft(p => ({ ...p, clientId: v }))}>
            <SelectTrigger className="rounded-xl"><SelectValue placeholder="Client" /></SelectTrigger>
            <SelectContent>
              {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="number" step="0.25" placeholder="Hours" value={draft.hours} onChange={e => setDraft(p => ({ ...p, hours: e.target.value }))} className="rounded-xl" />
          <Input placeholder="What did you work on?" value={draft.note} onChange={e => setDraft(p => ({ ...p, note: e.target.value }))} className="rounded-xl" />
          <Button onClick={addEntry} className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md">
            <Plus className="me-1.5 size-4" />Log
          </Button>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={staffFilter} onValueChange={setStaffFilter}>
          <SelectTrigger className="w-48 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All members</SelectItem>
            {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-56 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="ms-auto text-xs text-muted-foreground">{filtered.length} entries</span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-glass-border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-start font-medium">Date</th>
              <th className="px-4 py-3 text-start font-medium">Member</th>
              <th className="px-4 py-3 text-start font-medium">Client</th>
              <th className="px-4 py-3 text-start font-medium">Engagement</th>
              <th className="px-4 py-3 text-start font-medium">Note</th>
              <th className="px-4 py-3 text-end font-medium">Hours</th>
              <th className="px-4 py-3 text-start font-medium">Type</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(e => {
              const s = staff.find(x => x.id === e.staffId);
              const c = clients.find(x => x.id === e.clientId);
              const eng = engagements.find(x => x.id === e.engagementId);
              return (
                <tr key={e.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-muted-foreground">{e.date}</td>
                  <td className="px-4 py-3 font-medium">{s?.name}</td>
                  <td className="px-4 py-3">{c?.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{eng?.title ?? "—"}</td>
                  <td className="px-4 py-3">{e.note}</td>
                  <td className="px-4 py-3 text-end font-semibold tabular-nums">{e.hours}h</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`rounded-lg ${e.billable ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}>
                      {e.billable ? "Billable" : "Internal"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-end">
                    <Button size="icon" variant="ghost" className="rounded-lg text-slate-400 hover:text-rose-600" onClick={() => { setEntries(p => p.filter(x => x.id !== e.id)); toast.success("Entry removed"); }}>
                      <Trash2 className="size-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground"><Clock className="mx-auto mb-2 size-6 opacity-40" />No time entries match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone, children }: { label: string; value: string; tone: string; children?: React.ReactNode }) {
  return (
    <article className="rounded-2xl border border-glass-border bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-2xl font-semibold tabular-nums ${tone}`}>{value}</p>
      {children}
    </article>
  );
}
