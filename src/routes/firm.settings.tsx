import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Building, Palette, FileText, Plug, Bell, CreditCard, ShieldCheck,
  Check, Upload, Download, KeyRound, Smartphone, LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n";
import { useFirm } from "@/lib/mock/firm";

export const Route = createFileRoute("/firm/settings")({ component: FirmSettingsPage });

const TABS = [
  { id: "profile", label: "Profile", icon: Building },
  { id: "branding", label: "Branding", icon: Palette },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "invoicing", label: "Invoicing", icon: FileText },
] as const;

function FirmSettingsPage() {
  const { t } = useI18n();
  const { can } = useFirm();
  const locked = !can("settings.manage");
  const [primary, setPrimary] = useState("#059669");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t("firm.settings.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("firm.settings.subtitle")}</p>
      </div>

      {locked && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Your current role can't change firm settings — switch to an Owner seat in the header to edit.
        </div>
      )}

      <Tabs defaultValue="profile" className={locked ? "pointer-events-none opacity-60" : ""}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-2xl border border-glass-border bg-white p-1.5 shadow-sm">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="gap-1.5 rounded-xl px-3 py-2 text-sm data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:shadow-none"
            >
              <tab.icon className="size-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* PROFILE */}
        <TabsContent value="profile" className="mt-6 space-y-4">
          <Card icon={Building} title="Firm profile" desc="Displayed on invoices and client portals.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Firm name"><Input defaultValue="Fiksu Advisors Oy" /></Field>
              <Field label="Business ID"><Input defaultValue="FI27890321" /></Field>
              <Field label="VAT number"><Input defaultValue="FI27890321" /></Field>
              <Field label="Registered address"><Input defaultValue="Aleksanterinkatu 15, 00100 Helsinki" /></Field>
              <Field label="Contact email"><Input defaultValue="hello@fiksuadvisors.fi" /></Field>
              <Field label="Phone"><Input defaultValue="+358 40 123 4567" /></Field>
              <Field label="Website"><Input defaultValue="https://fiksuadvisors.fi" /></Field>
              <Field label="Default locale"><Input defaultValue="fi-FI" /></Field>
            </div>
          </Card>
          <SaveBar onSave={() => toast.success("Firm profile saved")} />
        </TabsContent>

        {/* BRANDING */}
        <TabsContent value="branding" className="mt-6 space-y-4">
          <Card icon={Palette} title="Colors" desc="Applied to portals and PDF invoices.">
            <Field label="Primary color">
              <div className="flex flex-wrap items-center gap-2">
                {["#059669", "#0ea5e9", "#6366f1", "#8b5cf6", "#f59e0b", "#e11d48", "#0f172a"].map((c) => (
                  <button
                    key={c}
                    onClick={() => setPrimary(c)}
                    aria-label={`Pick ${c}`}
                    className={`relative size-10 rounded-xl ring-2 transition ${primary === c ? "ring-slate-900" : "ring-transparent hover:ring-slate-300"}`}
                    style={{ background: c }}
                  >
                    {primary === c && <Check className="absolute inset-0 m-auto size-4 text-white" />}
                  </button>
                ))}
                <div className="ms-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
                  <span className="size-4 rounded" style={{ background: primary }} />
                  <span className="font-mono text-xs">{primary}</span>
                </div>
              </div>
            </Field>
          </Card>

          <Card icon={Upload} title="Logo" desc="SVG or PNG, transparent background, at least 512×512.">
            <div className="flex items-center gap-4">
              <div className="flex size-24 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-xs text-muted-foreground">Preview</div>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="rounded-lg"><Upload className="me-1.5 size-4" />Upload logo</Button>
                <p className="text-xs text-muted-foreground">Max 2 MB. Also used as a favicon on the client portal.</p>
              </div>
            </div>
            <Toggle label="Show firm name next to the logo" defaultChecked />
            <Toggle label="Use white logo on dark backgrounds" />
          </Card>

          <Card icon={Palette} title="Portal appearance" desc="How your client portal is presented.">
            <Field label="Custom subdomain"><Input defaultValue="advisors.fiksu.fi" /></Field>
            <Field label="Support email in footer"><Input defaultValue="support@fiksuadvisors.fi" /></Field>
            <Toggle label="Show 'Powered by Fiksu' badge" />
          </Card>
          <SaveBar onSave={() => toast.success("Branding saved")} />
        </TabsContent>

        {/* BILLING */}
        <TabsContent value="billing" className="mt-6 space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <Card icon={CreditCard} title="Current plan" desc="Firm subscription and add-ons.">
              <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className="rounded-lg bg-emerald-600 text-white">Scale</Badge>
                    <span className="text-sm text-muted-foreground">Annual · renews 12 Nov 2026</span>
                  </div>
                  <p className="mt-2 font-display text-2xl font-semibold">€349<span className="ms-1 text-sm font-normal text-muted-foreground">/month</span></p>
                  <p className="text-xs text-muted-foreground">Includes 25 clients · 12 staff seats · Finvoice PEPPOL · OCR extraction</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="rounded-xl">Change plan</Button>
                  <Button variant="ghost" className="rounded-xl text-rose-600 hover:bg-rose-50">Cancel</Button>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <UsageRow label="Client workspaces" value={18} max={25} />
                <UsageRow label="Staff seats" value={9} max={12} />
                <UsageRow label="Finvoice envelopes (this month)" value={286} max={500} />
                <UsageRow label="OCR pages (this month)" value={1420} max={2500} />
              </div>
            </Card>

            <Card icon={CreditCard} title="Payment method" desc="Charged in EUR on renewal.">
              <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                <div className="flex h-9 w-14 items-center justify-center rounded-md bg-slate-900 text-[10px] font-bold text-white">VISA</div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Visa •••• 4832</p>
                  <p className="text-xs text-muted-foreground">Expires 09/2028 · A. Virtanen</p>
                </div>
                <Button variant="ghost" size="sm">Replace</Button>
              </div>
              <Field label="Billing email"><Input defaultValue="finance@fiksuadvisors.fi" /></Field>
              <Field label="Purchase order reference"><Input defaultValue="PO-2026-014" /></Field>
              <Toggle label="Send a copy of every invoice to the accountant" defaultChecked />
            </Card>
          </div>

          <Card icon={FileText} title="Invoice history" desc="Last 6 firm invoices.">
            <div className="overflow-hidden rounded-xl border border-slate-100">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-start font-medium">Invoice</th>
                    <th className="px-3 py-2 text-start font-medium">Date</th>
                    <th className="px-3 py-2 text-end font-medium">Amount</th>
                    <th className="px-3 py-2 text-start font-medium">Status</th>
                    <th className="px-3 py-2 text-end font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { n: "FIRM-2026-006", d: "2026-06-01", a: 349, s: "paid" },
                    { n: "FIRM-2026-005", d: "2026-05-01", a: 349, s: "paid" },
                    { n: "FIRM-2026-004", d: "2026-04-01", a: 349, s: "paid" },
                    { n: "FIRM-2026-003", d: "2026-03-01", a: 349, s: "paid" },
                    { n: "FIRM-2026-002", d: "2026-02-01", a: 349, s: "paid" },
                    { n: "FIRM-2026-001", d: "2026-01-01", a: 469, s: "paid" },
                  ].map((r) => (
                    <tr key={r.n} className="hover:bg-slate-50/60">
                      <td className="px-3 py-2 font-mono text-xs">{r.n}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.d}</td>
                      <td className="px-3 py-2 text-end font-semibold tabular-nums">€{r.a}.00</td>
                      <td className="px-3 py-2"><Badge variant="outline" className="rounded-lg border-emerald-200 bg-emerald-50 text-emerald-700">Paid</Badge></td>
                      <td className="px-3 py-2 text-end">
                        <Button variant="ghost" size="sm" className="gap-1.5"><Download className="size-3.5" />PDF</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* NOTIFICATIONS */}
        <TabsContent value="notifications" className="mt-6 space-y-4">
          <Card icon={Bell} title="Firm activity" desc="Alerts sent to firm admins and leads.">
            <Toggle label="New client onboarded" defaultChecked />
            <Toggle label="Client uploaded new documents" defaultChecked />
            <Toggle label="Engagement over budget (>90%)" defaultChecked />
            <Toggle label="Client subscription payment failed" defaultChecked />
          </Card>
          <Card icon={FileText} title="Tasks & deadlines" desc="Sent to the assigned staff member.">
            <Toggle label="Task assigned to me" defaultChecked />
            <Toggle label="Task overdue (daily digest)" defaultChecked />
            <Toggle label="Filing deadline in 7 days" defaultChecked />
            <Toggle label="Filing deadline in 24 hours" defaultChecked />
          </Card>
          <Card icon={CreditCard} title="Invoicing" desc="Firm and client invoicing events.">
            <Toggle label="Invoice paid" defaultChecked />
            <Toggle label="Invoice overdue" defaultChecked />
            <Toggle label="Weekly A/R digest (Monday 09:00)" defaultChecked />
          </Card>
          <Card icon={Smartphone} title="Delivery channels" desc="Where to send the alerts above.">
            <Toggle label="Email" defaultChecked />
            <Toggle label="In-app inbox" defaultChecked />
            <Toggle label="Push (mobile PWA)" />
            <Toggle label="Slack #firm-alerts" defaultChecked />
          </Card>
          <SaveBar onSave={() => toast.success("Notification preferences saved")} />
        </TabsContent>

        {/* SECURITY */}
        <TabsContent value="security" className="mt-6 space-y-4">
          <Card icon={ShieldCheck} title="Authentication" desc="How your staff signs in.">
            <Toggle label="Require two-factor authentication for all staff" defaultChecked />
            <Toggle label="Allow SSO via Microsoft Entra ID" defaultChecked />
            <Toggle label="Allow SSO via Google Workspace" />
            <Field label="Password policy">
              <Input defaultValue="Min. 12 chars, 1 upper, 1 digit, rotation every 180 days" />
            </Field>
          </Card>

          <Card icon={KeyRound} title="API access" desc="Programmatic access to firm data.">
            <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Live key · <span className="font-mono text-xs">fk_live_••••7Xa2</span></p>
                  <p className="text-xs text-muted-foreground">Created 12 Feb 2026 · last used 18 min ago</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="rounded-lg">Rotate</Button>
                  <Button variant="ghost" size="sm" className="rounded-lg text-rose-600">Revoke</Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Sandbox key · <span className="font-mono text-xs">fk_test_••••11cD</span></p>
                  <p className="text-xs text-muted-foreground">Created 01 Nov 2025 · last used 4 days ago</p>
                </div>
                <Button variant="outline" size="sm" className="rounded-lg">Rotate</Button>
              </div>
            </div>
          </Card>

          <Card icon={Smartphone} title="Active sessions" desc="Devices currently signed in as firm staff.">
            <div className="space-y-2">
              {[
                { d: "MacBook Pro · Chrome", w: "Helsinki, FI", t: "This device", now: true },
                { d: "iPhone 15 · Safari", w: "Helsinki, FI", t: "12 min ago" },
                { d: "Windows · Edge", w: "Espoo, FI", t: "yesterday" },
              ].map((s) => (
                <div key={s.d} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                  <div>
                    <p className="text-sm font-medium">{s.d} {s.now && <Badge className="ms-1 rounded-md bg-emerald-600 text-white">Now</Badge>}</p>
                    <p className="text-xs text-muted-foreground">{s.w} · {s.t}</p>
                  </div>
                  {!s.now && <Button variant="ghost" size="sm" className="gap-1.5 text-rose-600"><LogOut className="size-4" />Sign out</Button>}
                </div>
              ))}
              <Button variant="outline" className="w-full rounded-xl">Sign out of all other sessions</Button>
            </div>
          </Card>

          <Card icon={ShieldCheck} title="Compliance" desc="Data handling and access policies.">
            <Toggle label="Restrict client data access to assigned staff only" defaultChecked />
            <Toggle label="Log every export to Audit log" defaultChecked />
            <Toggle label="Auto-lock inactive sessions after 30 minutes" defaultChecked />
            <Toggle label="IP allow-list for API keys" />
          </Card>
          <SaveBar onSave={() => toast.success("Security settings saved")} />
        </TabsContent>

        {/* INTEGRATIONS */}
        <TabsContent value="integrations" className="mt-6 space-y-4">
          <Card icon={Plug} title="Connected services" desc="Bookkeeping, banking, and e-invoicing providers.">
            <IntegrationRow name="Fortnox" desc="Sync GL & VAT" connected />
            <IntegrationRow name="Finvoice 3.0" desc="Send e-invoices via PEPPOL (Maventa)" connected />
            <IntegrationRow name="Nordea Open Banking" desc="Bank feeds & payments" />
            <IntegrationRow name="OP Open Banking" desc="Bank feeds & payments" />
            <IntegrationRow name="Vero.fi" desc="Tax filings and VAT returns" connected />
            <IntegrationRow name="Kirjuri" desc="Register updates for authorised offices" />
          </Card>
        </TabsContent>

        {/* INVOICING */}
        <TabsContent value="invoicing" className="mt-6 space-y-4">
          <Card icon={FileText} title="Defaults" desc="Applied to every new invoice.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Currency"><Input defaultValue="EUR" /></Field>
              <Field label="Payment terms (days)"><Input type="number" defaultValue={14} /></Field>
              <Field label="Late fee"><Input defaultValue="8% p.a." /></Field>
              <Field label="Reminder cadence"><Input defaultValue="D+3, D+7, D+14" /></Field>
              <Field label="Default VAT rate"><Input defaultValue="25.5%" /></Field>
              <Field label="Bank account (IBAN)"><Input defaultValue="FI21 1234 5600 0007 85" /></Field>
            </div>
            <Toggle label="Auto-send monthly retainer invoices" defaultChecked />
            <Toggle label="Attach PDF to Finvoice envelope" defaultChecked />
            <Toggle label="Round to nearest 0.05 €" />
          </Card>
          <SaveBar onSave={() => toast.success("Invoicing defaults saved")} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Card({ icon: Icon, title, desc, children }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-glass-border bg-white p-5 shadow-sm">
      <header className="mb-4 flex items-start gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600"><Icon className="size-5" /></div>
        <div><h3 className="font-display text-lg font-semibold">{title}</h3><p className="text-xs text-muted-foreground">{desc}</p></div>
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label><div className="mt-1.5">{children}</div></div>;
}
function Toggle({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  return <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-3"><Label className="text-sm font-medium">{label}</Label><Switch defaultChecked={defaultChecked} /></div>;
}
function IntegrationRow({ name, desc, connected }: { name: string; desc: string; connected?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-3">
      <div><p className="text-sm font-medium">{name}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
      <Button variant={connected ? "outline" : "default"} size="sm" className="rounded-lg">{connected ? "Connected" : "Connect"}</Button>
    </div>
  );
}
function UsageRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{value.toLocaleString()} / {max.toLocaleString()}</span>
      </div>
      <Progress value={pct} className={`h-1.5 ${pct >= 90 ? "[&>div]:bg-rose-500" : pct >= 70 ? "[&>div]:bg-amber-500" : ""}`} />
    </div>
  );
}
function SaveBar({ onSave }: { onSave: () => void }) {
  return (
    <div className="flex justify-end">
      <Button onClick={onSave} className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md">Save changes</Button>
    </div>
  );
}
