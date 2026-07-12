import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Megaphone, Send, Users, AlertTriangle, Info, Sparkles, Calendar, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/super/announcements")({ component: AnnouncementsPage });

type Kind = "info" | "warning" | "feature";
type Audience = "all" | "paid" | "trial" | "enterprise";

interface Ann {
  id: string;
  title: string;
  body: string;
  kind: Kind;
  audience: Audience;
  sentAt: string;
  seen: number;
  total: number;
  status: "draft" | "scheduled" | "sent";
}

const kindMeta: Record<Kind, { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  info: { label: "Info", icon: Info, tone: "bg-sky-500/15 text-sky-700 border-sky-500/30" },
  warning: { label: "Warning", icon: AlertTriangle, tone: "bg-amber-500/15 text-amber-700 border-amber-500/30" },
  feature: { label: "Feature", icon: Sparkles, tone: "bg-violet-500/15 text-violet-700 border-violet-500/30" },
};

const SEED: Ann[] = [
  { id: "n1", title: "Scheduled maintenance · July 15, 22:00 UTC", body: "The Fiksu Cloud will be unavailable for ~30 minutes while we upgrade the Postgres cluster to v17.", kind: "warning", audience: "all", sentAt: "2026-07-06", seen: 187, total: 214, status: "sent" },
  { id: "n2", title: "New Finvoice 3.0 support", body: "Every Growth+ workspace now supports the latest Finvoice 3.0 electronic invoice format for Finnish B2B billing.", kind: "feature", audience: "paid", sentAt: "2026-07-02", seen: 142, total: 158, status: "sent" },
  { id: "n3", title: "Trial ending soon reminder", body: "Trial users are seeing a soft banner 3 days before their trial ends. Convert rate up 18% since launch.", kind: "info", audience: "trial", sentAt: "2026-06-28", seen: 34, total: 40, status: "sent" },
  { id: "n4", title: "Whitelabel domains beta", body: "Custom domains available for Enterprise workspaces starting August 1. Reply for early access.", kind: "feature", audience: "enterprise", sentAt: "2026-07-12", seen: 0, total: 12, status: "scheduled" },
];

function AnnouncementsPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<Ann[]>(SEED);
  const [form, setForm] = useState<{ title: string; body: string; kind: Kind; audience: Audience }>({ title: "", body: "", kind: "info", audience: "all" });

  const audienceSize = (a: Audience) => ({ all: 214, paid: 158, trial: 40, enterprise: 12 }[a]);

  const send = () => {
    if (!form.title || !form.body) return toast.error("Title and body are required");
    const total = audienceSize(form.audience);
    setItems((prev) => [{ id: `n${Date.now()}`, ...form, sentAt: new Date().toISOString().slice(0, 10), seen: 0, total, status: "sent" }, ...prev]);
    toast.success(`Announcement broadcast to ${total} workspaces`);
    setForm({ title: "", body: "", kind: "info", audience: "all" });
  };

  const remove = (id: string) => { setItems((p) => p.filter((x) => x.id !== id)); toast("Announcement deleted"); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t("nav.announcements")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Broadcast updates, maintenance, and feature launches to tenants.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px,1fr]">
        {/* Composer */}
        <section className="h-fit rounded-2xl border border-glass-border bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Megaphone className="size-4 text-indigo-600" />New announcement</h2>
          <div className="mt-4 space-y-4">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Short, action-oriented title" className="mt-1.5" /></div>
            <div><Label>Body</Label><Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Markdown supported…" rows={5} className="mt-1.5" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Kind</Label>
                <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as Kind })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="feature">Feature</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Audience</Label>
                <Select value={form.audience} onValueChange={(v) => setForm({ ...form, audience: v as Audience })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All (214)</SelectItem>
                    <SelectItem value="paid">Paid (158)</SelectItem>
                    <SelectItem value="trial">Trials (40)</SelectItem>
                    <SelectItem value="enterprise">Enterprise (12)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-xl border border-dashed border-slate-200 p-3 text-xs text-muted-foreground">
              Preview will reach <b className="text-slate-900">{audienceSize(form.audience)}</b> workspaces via in-app banner and email digest.
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => toast("Saved as draft")}><Calendar className="me-1.5 size-4" />Schedule</Button>
              <Button onClick={send} className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md"><Send className="me-1.5 size-4" />Send now</Button>
            </div>
          </div>
        </section>

        {/* Feed */}
        <section className="space-y-3">
          {items.map((a) => {
            const meta = kindMeta[a.kind];
            const pct = a.total ? Math.round((a.seen / a.total) * 100) : 0;
            return (
              <article key={a.id} className={`rounded-2xl border bg-white p-5 shadow-sm ${meta.tone.split(" ")[2]}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`flex size-10 items-center justify-center rounded-xl ${meta.tone}`}><meta.icon className="size-5" /></div>
                    <div className="min-w-0">
                      <h3 className="font-display text-lg font-semibold">{a.title}</h3>
                      <p className="mt-0.5 text-sm text-slate-600">{a.body}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${a.status === "sent" ? "bg-emerald-500/15 text-emerald-700" : a.status === "scheduled" ? "bg-sky-500/15 text-sky-700" : "bg-slate-500/15 text-slate-700"}`}>{a.status}</span>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3 text-xs">
                  <span className="inline-flex items-center gap-1 text-muted-foreground"><Calendar className="size-3" />{a.sentAt}</span>
                  <span className="inline-flex items-center gap-1 text-muted-foreground"><Users className="size-3" />{a.audience}</span>
                  <div className="flex flex-1 items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="tabular-nums text-muted-foreground">{a.seen}/{a.total} · {pct}%</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => remove(a.id)} className="text-red-600 hover:bg-red-50"><Trash2 className="size-3.5" /></Button>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}
