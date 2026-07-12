import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Settings2, Globe, Palette, Mail, Bell, Database, HardDrive, ShieldCheck, KeyRound,
  Webhook, Zap, Plug, ScrollText, AlertTriangle, Save, Check, Upload, Trash2, Plus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/super/settings")({ component: SettingsPage });

const TABS = [
  { id: "general", labelKey: "settings.tab.general", icon: Settings2 },
  { id: "localization", labelKey: "settings.tab.localization", icon: Globe },
  { id: "branding", labelKey: "settings.tab.branding", icon: Palette },
  { id: "email", labelKey: "settings.tab.email", icon: Mail },
  { id: "notifications", labelKey: "settings.tab.notifications", icon: Bell },
  { id: "database", labelKey: "settings.tab.database", icon: Database },
  { id: "backups", labelKey: "settings.tab.backups", icon: HardDrive },
  { id: "security", labelKey: "settings.tab.security", icon: ShieldCheck },
  { id: "auth", labelKey: "settings.tab.auth", icon: KeyRound },
  { id: "api", labelKey: "settings.tab.api", icon: Webhook },
  { id: "flags", labelKey: "settings.tab.flags", icon: Zap },
  { id: "integrations", labelKey: "settings.tab.integrations", icon: Plug },
  { id: "compliance", labelKey: "settings.tab.compliance", icon: ScrollText },
  { id: "danger", labelKey: "settings.tab.danger", icon: AlertTriangle },
] as const;

type TabId = (typeof TABS)[number]["id"];
type I18nKey = Parameters<ReturnType<typeof useI18n>["t"]>[0];

function SettingsPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<TabId>("general");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t("sys.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Comprehensive platform configuration — 14 domains.</p>
        </div>
        <Button onClick={() => toast.success("All settings saved")} className="gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
          <Save className="size-4" /> Save all changes
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)} className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-2xl bg-white p-2 shadow-sm">
          {TABS.map((tb) => {
            const Icon = tb.icon;
            return (
              <TabsTrigger key={tb.id} value={tb.id}
                className={cn("gap-1.5 rounded-xl px-3 py-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md")}>
                <Icon className="size-3.5" /> {t(tb.labelKey as I18nKey)}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card title="Platform identity" desc="Basic identification.">
            <Row label="Platform name"><Input defaultValue="Fiksu" /></Row>
            <Row label="Legal entity"><Input defaultValue="Fiksu Oy" /></Row>
            <Row label="Business ID (Y-tunnus)"><Input defaultValue="3421789-2" className="font-mono" /></Row>
            <Row label="Primary domain"><Input defaultValue="fiksu.fi" /></Row>
            <Row label="Support email"><Input defaultValue="support@fiksu.fi" /></Row>
          </Card>
          <Card title="Environment">
            <Row label="Environment">
              <Select defaultValue="production">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="production">Production</SelectItem><SelectItem value="staging">Staging</SelectItem><SelectItem value="development">Development</SelectItem></SelectContent>
              </Select>
            </Row>
            <Row label="Deployment region"><Input defaultValue="eu-north-1 (Stockholm)" disabled /></Row>
            <Toggle label="Enable maintenance banner" />
            <Toggle label="Read-only mode" hint="Blocks all writes across tenants." />
          </Card>
        </TabsContent>

        <TabsContent value="localization" className="space-y-4">
          <Card title="Default locale">
            <Row label="Default language">
              <Select defaultValue="fi"><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["fi", "en", "sv", "ar"].map((l) => <SelectItem key={l} value={l}>{l.toUpperCase()}</SelectItem>)}</SelectContent>
              </Select>
            </Row>
            <Row label="Fallback language">
              <Select defaultValue="en"><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["en", "fi"].map((l) => <SelectItem key={l} value={l}>{l.toUpperCase()}</SelectItem>)}</SelectContent>
              </Select>
            </Row>
            <Row label="Timezone"><Input defaultValue="Europe/Helsinki" /></Row>
            <Row label="Date format">
              <Select defaultValue="dd.MM.yyyy"><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["dd.MM.yyyy", "yyyy-MM-dd", "MM/dd/yyyy"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </Row>
            <Row label="Number format"><Input defaultValue="1 234,56" /></Row>
            <Row label="Currency"><Input defaultValue="EUR (€)" /></Row>
          </Card>
          <Card title="Enabled languages" desc="What tenants can pick from.">
            <div className="flex flex-wrap gap-2">
              {[
                { code: "fi", name: "Suomi" }, { code: "en", name: "English" },
                { code: "sv", name: "Svenska" }, { code: "ar", name: "العربية" },
                { code: "et", name: "Eesti" }, { code: "ru", name: "Русский" },
              ].map((l) => (
                <label key={l.code} className="flex items-center gap-2 rounded-xl border bg-white px-3 py-1.5 text-sm">
                  <input type="checkbox" defaultChecked={l.code !== "ru"} className="accent-indigo-600" />
                  <span>{l.name}</span><span className="text-xs text-muted-foreground">{l.code}</span>
                </label>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="space-y-4">
          <Card title="Brand identity">
            <Row label="Logo (light)">
              <Button variant="outline" className="gap-1.5"><Upload className="size-4" /> Upload PNG/SVG</Button>
            </Row>
            <Row label="Logo (dark)">
              <Button variant="outline" className="gap-1.5"><Upload className="size-4" /> Upload PNG/SVG</Button>
            </Row>
            <Row label="Favicon"><Button variant="outline" className="gap-1.5"><Upload className="size-4" /> Upload .ico</Button></Row>
            <Row label="Primary color">
              <div className="flex items-center gap-2"><input type="color" defaultValue="#6366F1" className="size-9 rounded-md border" /><Input defaultValue="#6366F1" className="font-mono" /></div>
            </Row>
            <Row label="Accent color">
              <div className="flex items-center gap-2"><input type="color" defaultValue="#8B5CF6" className="size-9 rounded-md border" /><Input defaultValue="#8B5CF6" className="font-mono" /></div>
            </Row>
            <Row label="Display font"><Input defaultValue="Manrope" /></Row>
            <Row label="Body font"><Input defaultValue="Inter" /></Row>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <Card title="SMTP provider">
            <Row label="Provider">
              <Select defaultValue="postmark"><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="postmark">Postmark</SelectItem><SelectItem value="ses">Amazon SES</SelectItem><SelectItem value="sendgrid">SendGrid</SelectItem><SelectItem value="custom">Custom SMTP</SelectItem></SelectContent>
              </Select>
            </Row>
            <Row label="From email"><Input defaultValue="no-reply@fiksu.fi" /></Row>
            <Row label="From name"><Input defaultValue="Fiksu Team" /></Row>
            <Row label="Reply-to"><Input defaultValue="support@fiksu.fi" /></Row>
            <Row label="API key"><Input type="password" defaultValue="pm_••••••••••" className="font-mono" /></Row>
            <Row label="SPF status">
              <Badge className="bg-emerald-500"><Check className="me-1 size-3" /> Verified</Badge>
            </Row>
            <Row label="DKIM status">
              <Badge className="bg-emerald-500"><Check className="me-1 size-3" /> Verified</Badge>
            </Row>
          </Card>
          <Card title="Rate limits">
            <Row label="Per tenant / hour"><Input type="number" defaultValue={500} /></Row>
            <Row label="Platform-wide / minute"><Input type="number" defaultValue={2000} /></Row>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card title="Admin notifications">
            {[
              "Weekly revenue digest", "Failed payment (real-time)", "Subscription request",
              "Security alert", "New workspace signup", "Workspace churn", "Uptime incident",
              "Backup failure", "AI usage above 80% of monthly cap",
            ].map((label) => <Toggle key={label} label={label} defaultChecked={!label.includes("uptime")} />)}
          </Card>
          <Card title="Channels">
            <Row label="Email digests to"><Input defaultValue="ops@fiksu.fi, cto@fiksu.fi" /></Row>
            <Row label="Slack webhook"><Input placeholder="https://hooks.slack.com/services/..." className="font-mono" /></Row>
            <Row label="PagerDuty routing key"><Input placeholder="R0UT1NG..." className="font-mono" /></Row>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <Card title="Primary Postgres">
            <Row label="Host"><Input defaultValue="pg-fiksu-prod.eu-north-1.rds" /></Row>
            <Row label="Region"><Input defaultValue="eu-north-1 (Stockholm)" /></Row>
            <Row label="Version"><Input defaultValue="16.3" /></Row>
            <Row label="Pool size"><Input type="number" defaultValue={80} /></Row>
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 p-3 text-sm">
              <span className="inline-flex items-center gap-2 text-emerald-700"><span className="size-2 animate-pulse rounded-full bg-emerald-500" />Connected · 12ms latency</span>
              <Button size="sm" variant="ghost" className="text-emerald-700 hover:bg-emerald-100" onClick={() => toast.success("Connection healthy")}>Test</Button>
            </div>
          </Card>
          <Card title="Read replicas">
            {["eu-west-1 · Ireland (RO) · 34ms", "eu-central-1 · Frankfurt (RO) · 22ms"].map((r) => (
              <div key={r} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <span>{r}</span><Badge variant="secondary">In sync</Badge>
              </div>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="backups" className="space-y-4">
          <Card title="Automated snapshots">
            <Toggle label="Daily snapshot" defaultChecked />
            <Toggle label="Hourly WAL shipping" defaultChecked />
            <Toggle label="Cross-region replication (eu-central-1)" defaultChecked />
            <Row label="Retention (days)"><Input type="number" defaultValue={30} /></Row>
            <Row label="Encryption key (KMS)"><Input defaultValue="arn:aws:kms:eu-north-1:...:key/abcd1234" className="font-mono text-xs" /></Row>
          </Card>
          <Card title="Restore points">
            <div className="rounded-lg border">
              {[
                ["2026-07-09 03:00", "4.2 GB", "Full"], ["2026-07-08 03:00", "4.1 GB", "Full"],
                ["2026-07-07 03:00", "4.1 GB", "Full"], ["2026-07-06 03:00", "4.0 GB", "Full"],
              ].map(([when, size, kind]) => (
                <div key={when} className="grid grid-cols-4 items-center gap-2 border-b p-3 text-sm last:border-0">
                  <span className="font-mono text-xs">{when}</span>
                  <span>{size}</span><Badge variant="outline">{kind}</Badge>
                  <Button size="sm" variant="ghost" className="justify-self-end">Restore</Button>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card title="Password policy">
            <Row label="Minimum length"><Input type="number" defaultValue={12} /></Row>
            <Row label="Rotate every (days)"><Input type="number" defaultValue={180} /></Row>
            <Toggle label="Require uppercase" defaultChecked />
            <Toggle label="Require number" defaultChecked />
            <Toggle label="Require symbol" defaultChecked />
            <Toggle label="Reject leaked passwords (HIBP)" defaultChecked />
          </Card>
          <Card title="Session security">
            <Row label="Session lifetime (minutes)"><Input type="number" defaultValue={60} /></Row>
            <Row label="Refresh lifetime (days)"><Input type="number" defaultValue={30} /></Row>
            <Toggle label="Enforce 2FA for admins" defaultChecked />
            <Toggle label="Enforce 2FA for accountants" defaultChecked />
            <Toggle label="IP allowlist for admin console" />
            <Toggle label="Bind session to IP + user-agent" defaultChecked />
          </Card>
          <Card title="Audit & monitoring">
            <Toggle label="Stream audit-log to SIEM (Datadog)" defaultChecked />
            <Row label="Suspicious login threshold"><Input type="number" defaultValue={5} /></Row>
          </Card>
        </TabsContent>

        <TabsContent value="auth" className="space-y-4">
          <Card title="Authentication providers">
            {[
              ["Email + password", true], ["Magic link", true], ["Google", true],
              ["Microsoft", true], ["Apple", false], ["SAML 2.0 (SSO)", true], ["OIDC", true],
            ].map(([label, on]) => <Toggle key={label as string} label={label as string} defaultChecked={on as boolean} />)}
          </Card>
          <Card title="Signup rules">
            <Toggle label="Public signup" defaultChecked />
            <Toggle label="Require email verification" defaultChecked />
            <Toggle label="Require admin approval for new workspaces" />
            <Row label="Allowed email domains"><Textarea placeholder="One per line — e.g. *.fi" defaultValue={"*.fi\n*.se\n*.ee"} className="font-mono text-xs" /></Row>
            <Row label="Blocked email domains"><Input placeholder="temp-mail.io, guerrillamail.com" /></Row>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <Card title="Public API">
            <Toggle label="Enable REST API" defaultChecked />
            <Toggle label="Enable GraphQL" />
            <Row label="Base URL"><Input defaultValue="https://api.fiksu.fi/v1" className="font-mono text-xs" /></Row>
            <Row label="Rate limit (req/min)"><Input type="number" defaultValue={600} /></Row>
            <Row label="Max page size"><Input type="number" defaultValue={100} /></Row>
          </Card>
          <Card title="Webhooks defaults">
            <Row label="Signing algorithm">
              <Select defaultValue="hmac-sha256"><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="hmac-sha256">HMAC-SHA256</SelectItem><SelectItem value="hmac-sha512">HMAC-SHA512</SelectItem></SelectContent>
              </Select>
            </Row>
            <Row label="Retry policy"><Input defaultValue="Exponential (5 attempts over 24h)" /></Row>
            <Row label="Timeout (ms)"><Input type="number" defaultValue={5000} /></Row>
          </Card>
        </TabsContent>

        <TabsContent value="flags" className="space-y-4">
          <Card title="Feature flags" desc="Progressive rollouts across tenants.">
            {[
              ["AI drafting v2", 100], ["Whitelabel domains", 20], ["New reports engine", 65],
              ["PEPPOL 4-corner", 40], ["Bank feed via GoCardless", 15], ["Mobile app beta", 5],
              ["Realtime board sync", 100],
            ].map(([label, pct]) => (
              <div key={label as string} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-[11px] text-muted-foreground">Rolled out to {pct}% of workspaces</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input type="number" defaultValue={pct as number} className="h-8 w-20 text-end font-mono" />
                  <Switch defaultChecked={(pct as number) > 0} />
                </div>
              </div>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Card title="Connected services">
            {[
              ["YTJ / PRH avoindata", "Live", true],
              ["Vero VAT return", "Live", true],
              ["Finvoice 3.0 / PEPPOL AP", "Sandbox", true],
              ["Nordea Open Banking", "Live", true],
              ["OP Financial APIs", "Live", true],
              ["Google Workspace", "Live", true],
              ["Microsoft 365", "Live", false],
              ["Slack", "Live", true],
              ["OpenAI (via gateway)", "Live", true],
            ].map(([name, mode, on]) => (
              <div key={name as string} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{name}</p>
                  <p className="text-[11px] text-muted-foreground">{mode}</p>
                </div>
                <Switch defaultChecked={on as boolean} />
              </div>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card title="Data protection">
            <Row label="Data residency"><Input defaultValue="EU (Finland + Sweden)" disabled /></Row>
            <Toggle label="GDPR — Data Processing Agreement enabled" defaultChecked />
            <Toggle label="GDPR — Right-to-be-forgotten automation" defaultChecked />
            <Toggle label="SOC 2 Type II — evidence collection" defaultChecked />
            <Toggle label="ISO 27001 — control mapping" defaultChecked />
            <Row label="Default log retention"><Input defaultValue="365 days" /></Row>
          </Card>
          <Card title="Legal">
            <Row label="Terms of Service URL"><Input defaultValue="https://fiksu.fi/terms" /></Row>
            <Row label="Privacy Policy URL"><Input defaultValue="https://fiksu.fi/privacy" /></Row>
            <Row label="DPA URL"><Input defaultValue="https://fiksu.fi/dpa" /></Row>
            <Row label="Cookie policy URL"><Input defaultValue="https://fiksu.fi/cookies" /></Row>
          </Card>
        </TabsContent>

        <TabsContent value="danger" className="space-y-4">
          <Card title="Danger zone" desc="Irreversible actions — proceed with care.">
            {[
              { label: "Purge test workspaces", desc: "Deletes every workspace flagged as test." },
              { label: "Rotate all API keys", desc: "Invalidates every tenant integration." },
              { label: "Force logout everyone", desc: "Kills every session across the platform." },
              { label: "Wipe demo data", desc: "Removes seeded demo tenants." },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between rounded-xl border-2 border-red-200 bg-red-50/40 p-4">
                <div>
                  <p className="text-sm font-semibold text-red-900">{row.label}</p>
                  <p className="text-xs text-red-700/80">{row.desc}</p>
                </div>
                <Button variant="destructive" onClick={() => toast.error(`Blocked — requires 2 admin approvals`)} className="gap-1.5">
                  <Trash2 className="size-4" /> Run
                </Button>
              </div>
            ))}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Card({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-glass-border bg-white p-5 shadow-sm">
      <header className="mb-4">
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[220px_1fr] sm:items-center">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div>{children}</div>
    </div>
  );
}

function Toggle({ label, hint, defaultChecked }: { label: string; hint?: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-3">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}
