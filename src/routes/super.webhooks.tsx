import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Webhook, Plus, Trash2, CheckCircle2, XCircle, RotateCw, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/super/webhooks")({ component: WebhooksPage });

const ALL_EVENTS = [
  "workspace.created", "workspace.deleted", "subscription.created", "subscription.updated",
  "subscription.canceled", "invoice.paid", "invoice.payment_failed", "trial.ending",
  "user.invited", "plan.updated",
];

interface Endpoint {
  id: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  successRate: number;
  lastDelivery: string;
}

interface Delivery {
  id: string;
  endpointId: string;
  event: string;
  status: "success" | "failed";
  code: number;
  when: string;
  attempts: number;
  latencyMs: number;
}

const SEED: Endpoint[] = [
  { id: "e1", url: "https://ops.fiksu.internal/hooks/billing", events: ["invoice.paid", "invoice.payment_failed", "subscription.canceled"], secret: "whsec_a91f8b3c204e77f4d1e2c", active: true, successRate: 99.4, lastDelivery: "3 min ago" },
  { id: "e2", url: "https://slack.com/webhook/T04XXX/BFI…", events: ["workspace.created", "trial.ending"], secret: "whsec_slack_772af1b0c9d3", active: true, successRate: 100, lastDelivery: "18 min ago" },
  { id: "e3", url: "https://legacy.partner.example/hook", events: ["subscription.created", "subscription.updated"], secret: "whsec_legacy_5d3e8b", active: false, successRate: 62.1, lastDelivery: "3 days ago" },
];

const DELIVERIES: Delivery[] = [
  { id: "d1", endpointId: "e1", event: "invoice.paid", status: "success", code: 200, when: "3 min ago", attempts: 1, latencyMs: 142 },
  { id: "d2", endpointId: "e2", event: "trial.ending", status: "success", code: 200, when: "18 min ago", attempts: 1, latencyMs: 89 },
  { id: "d3", endpointId: "e1", event: "invoice.payment_failed", status: "success", code: 200, when: "1h ago", attempts: 2, latencyMs: 312 },
  { id: "d4", endpointId: "e3", event: "subscription.updated", status: "failed", code: 502, when: "2h ago", attempts: 5, latencyMs: 8000 },
  { id: "d5", endpointId: "e1", event: "subscription.canceled", status: "success", code: 200, when: "4h ago", attempts: 1, latencyMs: 118 },
  { id: "d6", endpointId: "e2", event: "workspace.created", status: "success", code: 200, when: "5h ago", attempts: 1, latencyMs: 76 },
  { id: "d7", endpointId: "e3", event: "subscription.created", status: "failed", code: 500, when: "6h ago", attempts: 5, latencyMs: 8000 },
];

function WebhooksPage() {
  const { t } = useI18n();
  const [endpoints, setEndpoints] = useState(SEED);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ url: "", events: [] as string[] });

  const create = () => {
    if (!form.url || form.events.length === 0) return toast.error("URL and at least one event required");
    setEndpoints((p) => [...p, { id: `e${Date.now()}`, url: form.url, events: form.events, secret: `whsec_${Math.random().toString(36).slice(2, 18)}`, active: true, successRate: 100, lastDelivery: "—" }]);
    toast.success("Endpoint created");
    setOpen(false);
    setForm({ url: "", events: [] });
  };

  const toggleEvent = (e: string) => setForm((f) => ({ ...f, events: f.events.includes(e) ? f.events.filter((x) => x !== e) : [...f.events, e] }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t("nav.webhooks")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Push events to your internal systems — signed with HMAC-SHA256.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md"><Plus className="me-1.5 size-4" />Add endpoint</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader><DialogTitle>New webhook endpoint</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div><Label>URL</Label><Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://your-app.com/webhooks/fiksu" className="mt-1.5 font-mono text-sm" /></div>
              <div>
                <Label>Subscribe to events</Label>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {ALL_EVENTS.map((e) => (
                    <label key={e} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-xs transition ${form.events.includes(e) ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300"}`}>
                      <input type="checkbox" checked={form.events.includes(e)} onChange={() => toggleEvent(e)} className="accent-indigo-600" />
                      <span className="font-mono">{e}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
              <Button onClick={create} className="bg-indigo-600 text-white hover:bg-indigo-700">Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Endpoints */}
      <div className="space-y-3">
        {endpoints.map((e) => (
          <article key={e.id} className={`rounded-2xl border bg-white p-5 shadow-sm ${e.active ? "border-glass-border" : "border-dashed border-slate-300 opacity-70"}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className={`flex size-9 items-center justify-center rounded-xl ${e.active ? "bg-emerald-500/15 text-emerald-600" : "bg-slate-100 text-slate-500"}`}><Webhook className="size-4" /></div>
                  <p className="truncate font-mono text-sm font-medium">{e.url}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {e.events.map((ev) => <span key={ev} className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-700">{ev}</span>)}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Signing secret:</span>
                  <code className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px]">{e.secret.slice(0, 22)}••••</code>
                  <button onClick={() => { navigator.clipboard?.writeText(e.secret); toast.success("Secret copied"); }} className="text-slate-400 hover:text-slate-900"><Copy className="size-3" /></button>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Switch checked={e.active} onCheckedChange={(v) => { setEndpoints((p) => p.map((x) => x.id === e.id ? { ...x, active: v } : x)); toast.success(`Endpoint ${v ? "enabled" : "paused"}`); }} />
                <div className="text-end text-xs">
                  <p className={`font-semibold tabular-nums ${e.successRate >= 99 ? "text-emerald-700" : e.successRate >= 90 ? "text-amber-700" : "text-red-700"}`}>{e.successRate}%</p>
                  <p className="text-muted-foreground">success · last {e.lastDelivery}</p>
                </div>
                <Button size="icon" variant="ghost" className="size-8 text-red-600 hover:bg-red-50" onClick={() => { setEndpoints((p) => p.filter((x) => x.id !== e.id)); toast("Endpoint removed"); }}><Trash2 className="size-4" /></Button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Delivery log */}
      <div className="rounded-2xl border border-glass-border bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-display text-lg font-semibold">Recent deliveries</h3>
        <ol className="divide-y divide-slate-100">
          {DELIVERIES.map((d) => {
            const ep = endpoints.find((x) => x.id === d.endpointId);
            return (
              <li key={d.id} className="flex items-center gap-4 py-3 text-sm">
                <div className={`flex size-8 items-center justify-center rounded-lg ${d.status === "success" ? "bg-emerald-500/15 text-emerald-600" : "bg-red-500/15 text-red-600"}`}>
                  {d.status === "success" ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs">{d.event}</p>
                  <p className="truncate text-xs text-muted-foreground">→ {ep?.url ?? "removed endpoint"}</p>
                </div>
                <span className={`rounded-md px-2 py-0.5 font-mono text-xs ${d.code < 300 ? "bg-emerald-500/10 text-emerald-700" : "bg-red-500/10 text-red-700"}`}>{d.code}</span>
                <span className="hidden text-xs text-muted-foreground md:inline tabular-nums">{d.latencyMs}ms</span>
                <span className="hidden text-xs text-muted-foreground md:inline">{d.attempts} attempt{d.attempts > 1 ? "s" : ""}</span>
                <span className="text-xs text-muted-foreground">{d.when}</span>
                {d.status === "failed" && <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={() => toast.success("Redelivery queued")}><RotateCw className="size-3" />Retry</Button>}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
