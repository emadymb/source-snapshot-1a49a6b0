import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Loader2, Power } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { listWorkspaces, setWorkspaceActive } from "@/lib/saas.functions";

export const Route = createFileRoute("/super/subscriptions")({ component: SubscriptionsPage });

function SubscriptionsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const listFn = useServerFn(listWorkspaces);
  const setActiveFn = useServerFn(setWorkspaceActive);
  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ["saas", "workspaces"],
    queryFn: () => listFn(),
  });
  const [q, setQ] = useState("");

  const rows = useMemo(
    () => workspaces.filter((w) => !q || `${w.name} ${w.owner} ${w.ownerEmail}`.toLowerCase().includes(q.toLowerCase())),
    [workspaces, q],
  );
  const totals = useMemo(() => ({
    mrr: rows.reduce((s, w) => s + (w.status === "active" ? w.mrr : 0), 0),
    active: rows.filter((w) => w.status === "active").length,
    trial: rows.filter((w) => w.status === "trial").length,
    suspended: rows.filter((w) => w.status === "suspended").length,
  }), [rows]);

  async function toggle(id: string, active: boolean, name: string) {
    try {
      await setActiveFn({ data: { id, active } });
      toast.success(`${name} ${active ? "activated" : "suspended"}`);
      qc.invalidateQueries({ queryKey: ["saas", "workspaces"] });
    } catch {
      toast.error("Action failed");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t("nav.subscriptions")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Live subscriptions across every workspace on the platform.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Active MRR" value={`€${totals.mrr.toLocaleString()}`} />
        <Stat label="Active" value={String(totals.active)} />
        <Stat label="On trial" value={String(totals.trial)} />
        <Stat label="Suspended" value={String(totals.suspended)} />
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-glass-border bg-white p-3 shadow-sm">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("common.search")} className="rounded-lg border-slate-200 ps-10" />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-glass-border bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="me-2 size-5 animate-spin" /> Loading workspaces…
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-start">Workspace</th>
                <th className="px-4 py-3 text-start">Plan</th>
                <th className="px-4 py-3 text-end">MRR</th>
                <th className="px-4 py-3 text-start">Status</th>
                <th className="px-4 py-3 text-start">Country</th>
                <th className="px-4 py-3 text-start">Created</th>
                <th className="w-32" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((w) => (
                <tr key={w.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-semibold text-white">{w.name.slice(0, 2).toUpperCase()}</div>
                      <div><p className="font-medium">{w.name}</p><p className="text-xs text-muted-foreground">{w.owner} · {w.ownerEmail}</p></div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{w.planName}</td>
                  <td className="px-4 py-3 text-end font-semibold tabular-nums">€{w.mrr}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${w.status === "active" ? "bg-emerald-500/15 text-emerald-700" : w.status === "trial" ? "bg-sky-500/15 text-sky-700" : "bg-red-500/15 text-red-700"}`}>{w.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{w.country}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{w.createdAt}</td>
                  <td className="px-4 py-3 text-end">
                    <Button size="sm" variant="outline" className="rounded-lg" onClick={() => toggle(w.id, w.status === "suspended", w.name)}>
                      <Power className="me-1.5 size-3.5" />{w.status === "suspended" ? "Activate" : "Suspend"}
                    </Button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">No workspaces yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-glass-border bg-white p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}
