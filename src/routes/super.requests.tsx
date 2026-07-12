import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X, MessageSquare, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { listRequests, listPlans, resolveRequest } from "@/lib/saas.functions";

export const Route = createFileRoute("/super/requests")({ component: RequestsPage });

function RequestsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const listReqFn = useServerFn(listRequests);
  const listPlansFn = useServerFn(listPlans);
  const resolveFn = useServerFn(resolveRequest);
  const { data: requests = [] } = useQuery({ queryKey: ["saas", "requests"], queryFn: () => listReqFn() });
  const { data: plans = [] } = useQuery({ queryKey: ["saas", "plans"], queryFn: () => listPlansFn() });
  const refresh = () => qc.invalidateQueries({ queryKey: ["saas", "requests"] });
  async function resolve(id: string, approve: boolean, label: string) {
    try { await resolveFn({ data: { id, approve } }); toast.success(`${label} ${approve ? "approved" : "rejected"}`); refresh(); }
    catch { toast.error("Failed"); }
  }
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  const filtered = requests.filter((r) => filter === "all" ? true : r.status === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t("req.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("req.subtitle")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-glass-border bg-white p-0.5 text-xs shadow-sm">
          {(["pending","approved","rejected","all"] as const).map((k) => {
            const count = k === "all" ? requests.length : requests.filter((r) => r.status === k).length;
            return (
              <button key={k} onClick={() => setFilter(k)} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 capitalize ${filter === k ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                {k}<span className={`rounded-full px-1.5 py-0.5 text-[10px] ${filter === k ? "bg-white/20" : "bg-slate-200 text-slate-700"}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {filtered.map((r) => {
          const plan = plans.find((p) => p.id === r.planId);
          const isPending = r.status === "pending";
          return (
            <article key={r.id} className="rounded-2xl border border-glass-border bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-semibold text-white">{r.workspaceName.slice(0,2).toUpperCase()}</div>
                  <div>
                    <h3 className="font-display text-lg font-semibold">{r.workspaceName}</h3>
                    <p className="text-sm text-muted-foreground">{r.contact} · <a href={`mailto:${r.email}`} className="text-indigo-600 hover:underline">{r.email}</a></p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock className="size-3" />{r.submittedAt}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${r.status === "pending" ? "bg-amber-500/15 text-amber-700" : r.status === "approved" ? "bg-emerald-500/15 text-emerald-700" : "bg-red-500/15 text-red-700"}`}>{r.status}</span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
                <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Requested plan</p><p className="mt-1 font-medium">{plan?.name} · €{plan?.price}/{plan?.interval === "monthly" ? "mo" : "yr"}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Type</p><p className="mt-1 font-medium capitalize">{plan?.type}</p></div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="mb-1 inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground"><MessageSquare className="size-3" />Message</p>
                <p className="text-sm text-slate-700">{r.message}</p>
              </div>

              {isPending && (
                <div className="mt-4 flex gap-2">
                  <Button onClick={() => resolve(r.id, true, r.workspaceName)} className="flex-1 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">
                    <Check className="me-1.5 size-4" />{t("common.approve")}
                  </Button>
                  <Button onClick={() => resolve(r.id, false, r.workspaceName)} variant="outline" className="flex-1 rounded-xl">
                    <X className="me-1.5 size-4" />{t("common.reject")}
                  </Button>
                </div>
              )}
            </article>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center text-sm text-muted-foreground">
            No {filter} requests.
          </div>
        )}
      </div>
    </div>
  );
}
