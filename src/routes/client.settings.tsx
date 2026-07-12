import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Settings as SettingsIcon, Building2, Users, Bell, Palette, Shield, Globe } from "lucide-react";
import { Screen, DataCard } from "@/components/screens/RichScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/client/settings")({ component: Page });

const tabs = [
  { key: "company", label: "Company", icon: Building2 },
  { key: "team", label: "Team", icon: Users },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "appearance", label: "Appearance", icon: Palette },
  { key: "security", label: "Security", icon: Shield },
  { key: "locale", label: "Locale", icon: Globe },
];

const team = [
  { name: "Erik Lindqvist", email: "erik@lindqvist-oy.fi", role: "Owner" },
  { name: "Anna Koskinen", email: "anna@lindqvist-oy.fi", role: "Bookkeeper" },
  { name: "Aino Virtanen", email: "aino@fiksu.fi", role: "External accountant" },
];

function Page() {
  const [tab, setTab] = useState("company");
  return (
    <Screen title="Settings" description="Workspace, team, and preferences." icon={SettingsIcon} actions={<Button className="rounded-xl bg-gradient-primary text-primary-foreground">Save changes</Button>}>
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <nav className="glass rounded-2xl border-glass-border p-2">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${tab === t.key ? "bg-gradient-primary text-primary-foreground" : "hover:bg-secondary"}`}>
              <t.icon className="size-4" />{t.label}
            </button>
          ))}
        </nav>
        <div className="space-y-4">
          {tab === "company" && (
            <DataCard title="Company profile">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Legal name" value="Lindqvist Oy" />
                <Field label="Business ID" value="2345678-1" />
                <Field label="VAT number" value="FI23456781" />
                <Field label="Address" value="Aleksanterinkatu 15, 00100 Helsinki" />
                <Field label="Country" value="Finland" />
                <Field label="Fiscal year end" value="December 31" />
              </div>
            </DataCard>
          )}
          {tab === "team" && (
            <DataCard title="Team members" action={<Button size="sm" className="rounded-xl bg-gradient-primary text-primary-foreground">Invite</Button>}>
              <ul className="divide-y divide-glass-border">
                {team.map((m) => (
                  <li key={m.email} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.email}</p>
                    </div>
                    <span className="rounded-full border border-glass-border bg-secondary px-3 py-1 text-xs font-medium">{m.role}</span>
                  </li>
                ))}
              </ul>
            </DataCard>
          )}
          {tab === "notifications" && (
            <DataCard title="Notification preferences">
              <div className="space-y-4">
                {[
                  ["Weekly financial summary", true],
                  ["Invoice paid confirmations", true],
                  ["Overdue invoice alerts", true],
                  ["Accountant messages", true],
                  ["Product updates", false],
                  ["Marketing emails", false],
                ].map(([l, v]) => (
                  <div key={l as string} className="flex items-center justify-between">
                    <Label>{l as string}</Label>
                    <Switch defaultChecked={v as boolean} />
                  </div>
                ))}
              </div>
            </DataCard>
          )}
          {tab === "appearance" && (
            <DataCard title="Appearance">
              <div className="grid gap-3 sm:grid-cols-3">
                {["Light", "Dark", "System"].map((m) => (
                  <button key={m} className="glass rounded-2xl border-glass-border p-4 text-start hover:bg-secondary">
                    <div className="mb-3 h-16 rounded-lg bg-gradient-to-br from-primary/20 to-secondary" />
                    <p className="font-medium">{m}</p>
                  </button>
                ))}
              </div>
            </DataCard>
          )}
          {tab === "security" && (
            <DataCard title="Security">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div><p className="font-medium">Two-factor authentication</p><p className="text-xs text-muted-foreground">Extra security via authenticator app</p></div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div><p className="font-medium">Single sign-on (SSO)</p><p className="text-xs text-muted-foreground">Google Workspace connected</p></div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div><p className="font-medium">Session timeout</p><p className="text-xs text-muted-foreground">Auto sign-out after 30 min idle</p></div>
                  <Switch />
                </div>
              </div>
            </DataCard>
          )}
          {tab === "locale" && (
            <DataCard title="Locale & formats">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Language" value="Finnish (Suomi)" />
                <Field label="Timezone" value="Europe/Helsinki (UTC+2)" />
                <Field label="Currency" value="EUR (€)" />
                <Field label="Date format" value="DD.MM.YYYY" />
              </div>
            </DataCard>
          )}
        </div>
      </div>
    </Screen>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</Label>
      <Input defaultValue={value} className="rounded-xl border-glass-border bg-glass" />
    </div>
  );
}