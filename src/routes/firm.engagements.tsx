import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Briefcase, Plus, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { useFirm, type Engagement } from "@/lib/mock/firm";

export const Route = createFileRoute("/firm/engagements")({ component: EngagementsPage });

const TYPE_LABEL: Record<Engagement["type"], string> = {
  "monthly-bookkeeping": "Monthly bookkeeping",
  "annual-close": "Annual close",
  "vat-return": "VAT return",
  "payroll": "Payroll",
  "advisory": "Advisory",
};
const TYPE_TONE: Record<Engagement["type"], string> = {
  "monthly-bookkeeping": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "annual-close": "bg-violet-50 text-violet-700 border-violet-200",
  "vat-return": "bg-amber-50 text-amber-700 border-amber-200",
  "payroll": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "advisory": "bg-sky-50 text-sky-700 border-sky-200",
};

function EngagementsPage() {
  const { t } = useI18n();
  const { engagements, clients, staff, upsertEngagement, can } = useFirm();
  const [status, setStatus] = useState<string>("all");
  const [client, setClient] = useState<string>("all");

  const filtered = engagements.filter(e =>
    (status === "all" || e.status === status) && (client === "all" || e.clientId === client)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t("firm.engagements.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("firm.engagements.subtitle")}</p>
        </div>
        {can("engagements.manage") && (
          <Button onClick={() => toast.info("Engagement composer coming soon")} className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md">
            <Plus className="me-1.5 size-4" />New engagement
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="on-hold">On hold</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={client} onValueChange={setClient}>
          <SelectTrigger className="w-56 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="ms-auto text-xs text-muted-foreground">{filtered.length} engagement(s)</span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map(e => {
          const c = clients.find(x => x.id === e.clientId)!;
          const lead = staff.find(x => x.id === e.leadStaffId)!;
          const pct = Math.min(100, Math.round((e.spentHours / e.budgetHours) * 100));
          const over = pct > 90;
          return (
            <article key={e.id} className="rounded-2xl border border-glass-border bg-white p-5 shadow-sm">
              <header className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold uppercase text-muted-foreground">{c?.name}</p>
                  <h3 className="mt-0.5 font-display text-base font-semibold leading-tight">{e.title}</h3>
                </div>
                <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white"><Briefcase className="size-4" /></div>
              </header>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className={`rounded-lg ${TYPE_TONE[e.type]}`}>{TYPE_LABEL[e.type]}</Badge>
                <Badge variant="outline" className={`rounded-lg capitalize ${e.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : e.status === "draft" ? "border-slate-200 bg-slate-100 text-slate-600" : e.status === "on-hold" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-sky-200 bg-sky-50 text-sky-700"}`}>{e.status}</Badge>
              </div>

              <div className="mt-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground"><Clock className="me-1 inline size-3" />{e.spentHours} / {e.budgetHours} h</span>
                  <span className={`font-medium tabular-nums ${over ? "text-rose-600" : "text-slate-700"}`}>{pct}%</span>
                </div>
                <Progress value={pct} className={`h-1.5 ${over ? "[&>*]:bg-rose-500" : ""}`} />
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <div className="flex items-center gap-2">
                  <Avatar className="size-7"><AvatarFallback className="bg-slate-900 text-[10px] text-white">{lead?.avatarSeed}</AvatarFallback></Avatar>
                  <div className="text-xs"><p className="font-medium">{lead?.name}</p><p className="text-muted-foreground">Lead</p></div>
                </div>
                <div className="text-end"><p className="font-display text-lg font-semibold">€{e.fee.toLocaleString()}</p><p className="text-[10px] uppercase text-muted-foreground">Fee</p></div>
              </div>

              {can("engagements.manage") && (
                <Button variant="outline" size="sm" className="mt-3 w-full rounded-lg" onClick={() => { upsertEngagement({ ...e, status: e.status === "active" ? "on-hold" : "active" }); toast.success("Updated"); }}>
                  {e.status === "active" ? "Put on hold" : "Activate"}
                </Button>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
