import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { Screen, DataCard } from "@/components/screens/RichScreen";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/client/accounting/settings")({ component: SettingsPage });

function SettingsPage() {
  return (
    <Screen title="Settings" description="Fiscal year, taxes, numbering, and integrations." icon={Settings}
      actions={<Button className="rounded-xl bg-gradient-primary text-primary-foreground shadow-[var(--shadow-glow)]">Save changes</Button>}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <DataCard title="Fiscal year">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start</Label><Input defaultValue="2026-01-01" className="mt-1 rounded-xl border-glass-border bg-glass" /></div>
              <div><Label>End</Label><Input defaultValue="2026-12-31" className="mt-1 rounded-xl border-glass-border bg-glass" /></div>
            </div>
            <div>
              <Label>Base currency</Label>
              <Select defaultValue="EUR">
                <SelectTrigger className="mt-1 rounded-xl border-glass-border bg-glass"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="EUR">EUR — Euro</SelectItem><SelectItem value="USD">USD — Dollar</SelectItem><SelectItem value="SAR">SAR — Riyal</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
        </DataCard>
        <DataCard title="VAT & taxes">
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Standard</Label><Input defaultValue="24%" className="mt-1 rounded-xl border-glass-border bg-glass" /></div>
              <div><Label>Reduced</Label><Input defaultValue="14%" className="mt-1 rounded-xl border-glass-border bg-glass" /></div>
              <div><Label>Zero</Label><Input defaultValue="0%"  className="mt-1 rounded-xl border-glass-border bg-glass" /></div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-glass-border p-3">
              <div><p className="text-sm font-medium">Reverse charge</p><p className="text-xs text-muted-foreground">Intra-EU services</p></div>
              <Switch defaultChecked />
            </div>
          </div>
        </DataCard>
        <DataCard title="Document numbering">
          <div className="space-y-3">
            <div><Label>Invoice prefix</Label><Input defaultValue="FI-2026-" className="mt-1 rounded-xl border-glass-border bg-glass" /></div>
            <div><Label>Next number</Label><Input defaultValue="0185" className="mt-1 rounded-xl border-glass-border bg-glass" /></div>
            <div><Label>Journal prefix</Label><Input defaultValue="JV-2026-" className="mt-1 rounded-xl border-glass-border bg-glass" /></div>
          </div>
        </DataCard>
        <DataCard title="Integrations">
          {[
            { name: "Finvoice",     desc: "Finnish e-invoicing", on: true },
            { name: "PEPPOL",       desc: "EU network",          on: true },
            { name: "ZATCA (KSA)",  desc: "Saudi e-invoicing",   on: false },
            { name: "Bank feed",    desc: "Nordea, OP, Danske",  on: true },
          ].map((i) => (
            <div key={i.name} className="flex items-center justify-between border-b border-glass-border/60 py-3 last:border-0">
              <div><p className="text-sm font-medium">{i.name}</p><p className="text-xs text-muted-foreground">{i.desc}</p></div>
              <Switch defaultChecked={i.on} />
            </div>
          ))}
        </DataCard>
      </div>
    </Screen>
  );
}
