import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, ShieldAlert, Lock, Globe, Smartphone, Monitor, Trash2, Plus, KeyRound, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/super/security")({ component: SecurityPage });

interface Session { id: string; device: string; browser: string; ip: string; location: string; when: string; current?: boolean; mobile?: boolean }
interface Key { id: string; label: string; prefix: string; created: string; lastUsed: string; scopes: string[] }
interface IP { id: string; cidr: string; label: string }

const SESSIONS: Session[] = [
  { id: "s1", device: "MacBook Pro 14\"", browser: "Chrome 128 · macOS", ip: "82.181.44.12", location: "Helsinki, FI", when: "Active now", current: true },
  { id: "s2", device: "iPhone 16 Pro", browser: "Safari · iOS 19", ip: "82.181.44.12", location: "Helsinki, FI", when: "12 min ago", mobile: true },
  { id: "s3", device: "Dell XPS 15", browser: "Firefox 130 · Windows", ip: "213.114.9.201", location: "Stockholm, SE", when: "2h ago" },
  { id: "s4", device: "Unknown", browser: "curl/8.4.0", ip: "45.155.204.19", location: "Unknown", when: "Yesterday · blocked" },
];

const KEYS: Key[] = [
  { id: "k1", label: "Production automation", prefix: "sk_live_a91f", created: "2026-01-04", lastUsed: "3 min ago", scopes: ["workspaces:read", "invoices:write"] },
  { id: "k2", label: "Analytics pipeline", prefix: "sk_live_7cd2", created: "2025-11-22", lastUsed: "1h ago", scopes: ["reports:read"] },
  { id: "k3", label: "Legacy webhook", prefix: "sk_live_3fb8", created: "2024-08-11", lastUsed: "42 days ago", scopes: ["*"] },
];

const IPS: IP[] = [
  { id: "i1", cidr: "82.181.44.0/24", label: "Office · Helsinki" },
  { id: "i2", cidr: "213.114.9.201/32", label: "Sara laptop VPN" },
];

function score(): { value: number; label: string; tone: string } {
  return { value: 82, label: "Strong", tone: "from-emerald-500 to-teal-500" };
}

function SecurityPage() {
  const { t } = useI18n();
  const s = score();
  const [twoFA, setTwoFA] = useState(true);
  const [ipLock, setIpLock] = useState(true);
  const [ssoOnly, setSsoOnly] = useState(false);
  const [webhook, setWebhook] = useState(true);
  const [showKey, setShowKey] = useState<string | null>(null);
  const [sessions, setSessions] = useState(SESSIONS);
  const [keys, setKeys] = useState(KEYS);
  const [ips, setIps] = useState(IPS);
  const [newIp, setNewIp] = useState({ cidr: "", label: "" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t("nav.security")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sessions, keys, network policies, and posture score.</p>
      </div>

      {/* Score */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[380px,1fr]">
        <section className="rounded-2xl border border-glass-border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className={`flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br ${s.tone} text-white shadow-lg`}>
              <ShieldCheck className="size-10" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Security score</p>
              <p className="font-display text-4xl font-semibold tabular-nums">{s.value}<span className="text-lg text-muted-foreground">/100</span></p>
              <p className="text-sm font-medium text-emerald-700">{s.label}</p>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full bg-gradient-to-r ${s.tone}`} style={{ width: `${s.value}%` }} />
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex items-center gap-2 text-emerald-700"><ShieldCheck className="size-4" />2FA enforced for admins</li>
            <li className="flex items-center gap-2 text-emerald-700"><ShieldCheck className="size-4" />IP allowlist active</li>
            <li className="flex items-center gap-2 text-amber-700"><ShieldAlert className="size-4" />1 API key inactive for 42 days</li>
          </ul>
        </section>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <PolicyRow label="Enforce 2FA on all admin accounts" checked={twoFA} onChange={(v) => { setTwoFA(v); toast.success(`2FA ${v ? "enforced" : "disabled"}`); }} />
          <PolicyRow label="IP allowlist for console access" checked={ipLock} onChange={(v) => { setIpLock(v); toast.success(`IP lock ${v ? "on" : "off"}`); }} />
          <PolicyRow label="Require SSO (Google Workspace)" checked={ssoOnly} onChange={(v) => { setSsoOnly(v); toast.success(`SSO-only ${v ? "on" : "off"}`); }} />
          <PolicyRow label="Sign outbound webhooks (HMAC)" checked={webhook} onChange={(v) => { setWebhook(v); toast.success(`Webhook signing ${v ? "on" : "off"}`); }} />
        </section>
      </div>

      {/* Sessions */}
      <section className="rounded-2xl border border-glass-border bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Active sessions</h2>
          <Button variant="outline" size="sm" className="rounded-lg" onClick={() => { setSessions((p) => p.filter((s) => s.current)); toast.success("Signed out 3 other sessions"); }}>Sign out all others</Button>
        </div>
        <ul className="divide-y divide-slate-100">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center gap-4 py-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                {s.mobile ? <Smartphone className="size-5" /> : <Monitor className="size-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {s.device}
                  {s.current && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">Current</span>}
                </p>
                <p className="text-xs text-muted-foreground">{s.browser} · {s.location} · {s.ip}</p>
              </div>
              <p className="text-xs text-muted-foreground">{s.when}</p>
              {!s.current && <Button size="icon" variant="ghost" className="size-8 text-red-600 hover:bg-red-50" onClick={() => { setSessions((p) => p.filter((x) => x.id !== s.id)); toast("Session revoked"); }}><Trash2 className="size-4" /></Button>}
            </li>
          ))}
        </ul>
      </section>

      {/* API keys + IPs */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-glass-border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><KeyRound className="size-4 text-indigo-600" />API keys</h2>
            <Button size="sm" className="rounded-lg bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => { setKeys((p) => [{ id: `k${Date.now()}`, label: "Untitled key", prefix: "sk_live_" + Math.random().toString(36).slice(2, 6), created: new Date().toISOString().slice(0,10), lastUsed: "—", scopes: ["*"] }, ...p]); toast.success("New key generated"); }}><Plus className="me-1 size-4" />New key</Button>
          </div>
          <ul className="space-y-2">
            {keys.map((k) => (
              <li key={k.id} className="rounded-xl border border-slate-100 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{k.label}</p>
                    <p className="mt-0.5 flex items-center gap-2 font-mono text-xs text-slate-500">
                      {showKey === k.id ? `${k.prefix}f8a3b91c204e77` : `${k.prefix}••••••••••••••`}
                      <button onClick={() => setShowKey(showKey === k.id ? null : k.id)} className="text-slate-400 hover:text-slate-900">
                        {showKey === k.id ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                      </button>
                    </p>
                  </div>
                  <Button size="icon" variant="ghost" className="size-8 text-red-600 hover:bg-red-50" onClick={() => { setKeys((p) => p.filter((x) => x.id !== k.id)); toast("Key revoked"); }}><Trash2 className="size-4" /></Button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Created {k.created}</span>·<span>Last used {k.lastUsed}</span>
                  <span className="ms-auto flex gap-1">{k.scopes.map((s) => <span key={s} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">{s}</span>)}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-glass-border bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold"><Globe className="size-4 text-indigo-600" />IP allowlist</h2>
          <div className="mb-3 flex items-end gap-2">
            <div className="flex-1"><Label className="text-xs">CIDR</Label><Input value={newIp.cidr} onChange={(e) => setNewIp({ ...newIp, cidr: e.target.value })} placeholder="203.0.113.0/24" className="mt-1 font-mono text-sm" /></div>
            <div className="flex-1"><Label className="text-xs">Label</Label><Input value={newIp.label} onChange={(e) => setNewIp({ ...newIp, label: e.target.value })} placeholder="Home office" className="mt-1" /></div>
            <Button className="rounded-lg bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => { if (!newIp.cidr) return; setIps((p) => [...p, { id: `i${Date.now()}`, ...newIp }]); setNewIp({ cidr: "", label: "" }); toast.success("IP range added"); }}><Plus className="size-4" /></Button>
          </div>
          <ul className="divide-y divide-slate-100">
            {ips.map((ip) => (
              <li key={ip.id} className="flex items-center gap-3 py-2.5">
                <Lock className="size-4 text-emerald-600" />
                <div className="min-w-0 flex-1"><p className="font-mono text-sm">{ip.cidr}</p><p className="text-xs text-muted-foreground">{ip.label}</p></div>
                <Button size="icon" variant="ghost" className="size-8 text-red-600 hover:bg-red-50" onClick={() => { setIps((p) => p.filter((x) => x.id !== ip.id)); toast("Range removed"); }}><Trash2 className="size-4" /></Button>
              </li>
            ))}
            {ips.length === 0 && <li className="py-6 text-center text-xs text-muted-foreground">No IP restrictions — console reachable from anywhere.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}

function PolicyRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className={`flex items-center justify-between rounded-2xl border p-4 shadow-sm transition ${checked ? "border-emerald-500/30 bg-emerald-50/40" : "border-glass-border bg-white"}`}>
      <div className="flex items-center gap-3">
        <div className={`flex size-9 items-center justify-center rounded-xl ${checked ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"}`}><ShieldCheck className="size-4" /></div>
        <p className="text-sm font-medium">{label}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
