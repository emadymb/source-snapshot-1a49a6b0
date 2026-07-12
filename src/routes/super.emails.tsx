import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Send, Eye, Save, Sparkles, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/super/emails")({ component: EmailsPage });

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  trigger: string;
  sent30d: number;
  openRate: number;
}

const SEED: Template[] = [
  { id: "welcome", name: "Welcome", subject: "Welcome to Fiksu, {{owner_name}} 🎉", body: "Hi {{owner_name}},\n\nYour workspace {{workspace_name}} is ready. You can start with a 14-day free trial on the {{plan_name}} plan.\n\n👉 https://app.fiksu.fi/onboarding\n\n— The Fiksu team", variables: ["owner_name", "workspace_name", "plan_name"], trigger: "workspace.created", sent30d: 214, openRate: 68 },
  { id: "trial_end", name: "Trial ending", subject: "Your trial ends in 3 days", body: "Hi {{owner_name}},\n\nYour trial for {{workspace_name}} ends on {{trial_end_date}}. Add a payment method to keep going without interruption.\n\n👉 https://app.fiksu.fi/billing", variables: ["owner_name", "workspace_name", "trial_end_date"], trigger: "trial.ending", sent30d: 40, openRate: 82 },
  { id: "invoice_paid", name: "Invoice paid", subject: "Payment received — {{invoice_number}}", body: "Thanks! We received your payment of €{{amount}} for invoice {{invoice_number}}.\n\nA PDF receipt is attached.", variables: ["invoice_number", "amount"], trigger: "invoice.paid", sent30d: 187, openRate: 45 },
  { id: "invoice_failed", name: "Payment failed", subject: "⚠️ We couldn't process your payment", body: "Hi {{owner_name}},\n\nWe were unable to charge your card for invoice {{invoice_number}} (€{{amount}}). Please update your payment method within 7 days to avoid a service pause.\n\n👉 https://app.fiksu.fi/billing", variables: ["owner_name", "invoice_number", "amount"], trigger: "invoice.payment_failed", sent30d: 9, openRate: 91 },
  { id: "reset", name: "Password reset", subject: "Reset your Fiksu password", body: "Someone requested a password reset for your account. Click the link below within 30 minutes:\n\n👉 {{reset_url}}\n\nIf this wasn't you, you can safely ignore this email.", variables: ["reset_url"], trigger: "auth.password_reset", sent30d: 32, openRate: 74 },
  { id: "invite", name: "Team invitation", subject: "{{inviter_name}} invited you to {{workspace_name}}", body: "Join {{workspace_name}} on Fiksu as a {{role}}. Accept the invite:\n\n👉 {{invite_url}}", variables: ["inviter_name", "workspace_name", "role", "invite_url"], trigger: "team.invited", sent30d: 56, openRate: 79 },
];

function EmailsPage() {
  const { t } = useI18n();
  const [templates, setTemplates] = useState(SEED);
  const [selectedId, setSelectedId] = useState<string>(SEED[0].id);
  const selected = templates.find((x) => x.id === selectedId)!;

  const update = (patch: Partial<Template>) => setTemplates((p) => p.map((x) => x.id === selectedId ? { ...x, ...patch } : x));

  const renderPreview = (s: string) => s.replace(/\{\{(\w+)\}\}/g, (_, v) => `[${v}]`);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t("nav.emails")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Transactional email templates — subject, body, and Mustache variables.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px,1fr,380px]">
        {/* List */}
        <aside className="rounded-2xl border border-glass-border bg-white p-3 shadow-sm">
          <ul className="space-y-1">
            {templates.map((tpl) => {
              const active = tpl.id === selectedId;
              return (
                <li key={tpl.id}>
                  <button onClick={() => setSelectedId(tpl.id)} className={`w-full rounded-xl p-3 text-start transition ${active ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md" : "hover:bg-slate-100"}`}>
                    <div className="flex items-center gap-2">
                      <Mail className={`size-4 ${active ? "text-white" : "text-slate-500"}`} />
                      <span className="font-medium">{tpl.name}</span>
                    </div>
                    <p className={`mt-0.5 truncate text-xs ${active ? "text-white/80" : "text-muted-foreground"}`}>{tpl.trigger}</p>
                    <div className={`mt-1 flex justify-between text-[10px] ${active ? "text-white/80" : "text-muted-foreground"}`}>
                      <span>{tpl.sent30d} sent</span>
                      <span>{tpl.openRate}% open</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Editor */}
        <section className="rounded-2xl border border-glass-border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold">{selected.name}</h2>
              <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono">{selected.trigger}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="rounded-lg" onClick={() => toast.success("Test email sent to owner@fiksu.fi")}><Send className="me-1.5 size-3.5" />Send test</Button>
              <Button size="sm" className="rounded-lg bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => toast.success("Template saved")}><Save className="me-1.5 size-3.5" />Save</Button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Subject</Label>
              <Input value={selected.subject} onChange={(e) => update({ subject: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label>Body (plain text, Mustache variables)</Label>
              <Textarea value={selected.body} onChange={(e) => update({ body: e.target.value })} rows={14} className="mt-1.5 font-mono text-sm" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Available variables</Label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {selected.variables.map((v) => (
                  <button key={v} onClick={() => { navigator.clipboard?.writeText(`{{${v}}}`); toast.success(`Copied {{${v}}}`); }} className="rounded-full bg-indigo-500/10 px-2.5 py-1 font-mono text-xs text-indigo-700 hover:bg-indigo-500/15">
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Preview */}
        <aside className="space-y-3">
          <div className="overflow-hidden rounded-2xl border border-glass-border bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs">
              <Eye className="size-3.5 text-slate-500" /><span className="font-medium text-slate-700">Live preview</span>
            </div>
            <div className="p-5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">From</p>
              <p className="text-sm">Fiksu &lt;no-reply@fiksu.fi&gt;</p>
              <p className="mt-3 text-[10px] uppercase tracking-wide text-muted-foreground">Subject</p>
              <p className="text-sm font-semibold">{renderPreview(selected.subject)}</p>
              <hr className="my-4 border-slate-100" />
              <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700">{renderPreview(selected.body)}</pre>
            </div>
          </div>

          <div className="rounded-2xl border border-glass-border bg-gradient-to-br from-violet-50 to-indigo-50 p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 size-4 text-violet-600" />
              <div className="flex-1">
                <p className="text-sm font-medium">AI copy suggestion</p>
                <p className="mt-1 text-xs text-slate-600">Try adding a personal line acknowledging the workspace size for higher engagement.</p>
                <Button size="sm" variant="ghost" className="mt-2 h-7 px-2 text-xs text-violet-700 hover:bg-white">Apply suggestion <ExternalLink className="ms-1 size-3" /></Button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
