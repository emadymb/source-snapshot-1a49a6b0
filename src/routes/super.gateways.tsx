import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Wallet, ExternalLink, KeyRound, Settings2, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import {
  listGateways, upsertGateway, toggleGateway, setGatewayMode, deleteGateway,
  type GatewayDTO,
} from "@/lib/saas.functions";

export const Route = createFileRoute("/super/gateways")({ component: GatewaysPage });

interface Draft {
  id: string; name: string; provider: string; logo: string;
  mode: "test" | "live"; fee: string; apiKey: string; enabled: boolean;
}
const empty = (): Draft => ({ id: "", name: "", provider: "stripe", logo: "S", mode: "test", fee: "", apiKey: "", enabled: false });

function GatewaysPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const listFn = useServerFn(listGateways);
  const upsertFn = useServerFn(upsertGateway);
  const toggleFn = useServerFn(toggleGateway);
  const modeFn = useServerFn(setGatewayMode);
  const deleteFn = useServerFn(deleteGateway);

  const { data: gateways = [], isLoading } = useQuery({ queryKey: ["saas", "gateways"], queryFn: () => listFn() });
  const refresh = () => qc.invalidateQueries({ queryKey: ["saas", "gateways"] });
  const [editing, setEditing] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  async function toggle(g: GatewayDTO) {
    try { await toggleFn({ data: { id: g.id } }); toast.success(`${g.name} ${g.enabled ? "disabled" : "enabled"}`); refresh(); }
    catch { toast.error("Failed"); }
  }
  async function setMode(g: GatewayDTO, mode: "test" | "live") {
    try { await modeFn({ data: { id: g.id, mode } }); refresh(); }
    catch { toast.error("Failed"); }
  }
  async function remove(g: GatewayDTO) {
    try { await deleteFn({ data: { id: g.id } }); toast.success("Removed"); refresh(); }
    catch { toast.error("Failed"); }
  }
  async function save(d: Draft) {
    setSaving(true);
    try {
      const { id, ...rest } = d;
      await upsertFn({ data: { ...rest, id: id || undefined } });
      toast.success("Saved"); setEditing(null); refresh();
    } catch { toast.error("Could not save"); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t("gw.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("gw.subtitle")}</p>
        </div>
        <Button onClick={() => setEditing(empty())} className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
          <Plus className="me-2 size-4" />Add gateway
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="me-2 size-5 animate-spin" />Loading…</div>
      ) : gateways.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center text-sm text-muted-foreground">
          No gateways configured yet. Add your first payment provider.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {gateways.map((g) => (
            <article key={g.id} className={`rounded-2xl border bg-white p-5 shadow-sm transition ${g.enabled ? "border-glass-border" : "border-dashed border-slate-300"}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex size-11 items-center justify-center rounded-xl font-display text-lg font-bold ${g.enabled ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white" : "bg-slate-100 text-slate-500"}`}>{g.logo}</div>
                  <div>
                    <h3 className="font-display text-lg font-semibold">{g.name}</h3>
                    <p className="text-xs text-muted-foreground">{g.provider} · Fee {g.fee}</p>
                  </div>
                </div>
                <Switch checked={g.enabled} onCheckedChange={() => toggle(g)} />
              </div>

              <div className={`mt-4 space-y-3 transition ${g.enabled ? "" : "pointer-events-none opacity-40"}`}>
                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Mode</Label>
                  <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-0.5 text-xs">
                    {(["test","live"] as const).map((m) => (
                      <button key={m} onClick={() => setMode(g, m)} className={`rounded-md py-1.5 capitalize ${g.mode === m ? m === "live" ? "bg-emerald-500 text-white shadow-sm" : "bg-white shadow-sm font-medium" : "text-slate-600"}`}>{m}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground"><KeyRound className="me-1 inline size-3" />API key</Label>
                  <Input readOnly value={g.apiKey ? "sk_" + g.mode + "_••••••••" : "(not set)"} className="mt-1.5 font-mono text-xs" />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="flex-1 rounded-lg" onClick={() => setEditing({ ...g })}><Settings2 className="me-1.5 size-3.5" />Configure</Button>
                  <Button size="sm" variant="ghost" className="rounded-lg text-red-600" onClick={() => remove(g)}><Trash2 className="size-3.5" /></Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-glass-border bg-gradient-to-br from-indigo-50 to-violet-50 p-6">
        <div className="flex items-start gap-4">
          <div className="flex size-11 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm"><Wallet className="size-5" /></div>
          <div className="flex-1">
            <h3 className="font-display text-lg font-semibold">Route rules</h3>
            <p className="mt-1 text-sm text-slate-600">Route Nordic invoices through Stripe, and anything above €5,000 to a bank transfer with manual review.</p>
          </div>
          <Button className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"><ExternalLink className="me-1.5 size-4" />Manage rules</Button>
        </div>
      </div>

      {editing && (
        <Dialog open onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editing.id ? `Edit ${editing.name}` : "Add gateway"}</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Name</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>Provider</Label>
                <Select value={editing.provider} onValueChange={(v) => setEditing({ ...editing, provider: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["stripe","paypal","paddle","razorpay","pesapal","paystack","flutterwave","offline"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Logo char</Label><Input maxLength={2} value={editing.logo} onChange={(e) => setEditing({ ...editing, logo: e.target.value })} /></div>
                <div><Label>Fee</Label><Input value={editing.fee} onChange={(e) => setEditing({ ...editing, fee: e.target.value })} placeholder="1.4% + €0.25" /></div>
              </div>
              <div><Label>API key</Label><Input type="password" value={editing.apiKey} onChange={(e) => setEditing({ ...editing, apiKey: e.target.value })} placeholder="sk_test_…" /></div>
              <div className="flex items-center gap-2 pt-2">
                <Switch checked={editing.enabled} onCheckedChange={(v) => setEditing({ ...editing, enabled: v })} />
                <Label>Enabled</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={() => save(editing)} disabled={saving || !editing.name}>
                {saving && <Loader2 className="me-2 size-4 animate-spin" />}Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}