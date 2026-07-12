import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Settings2, Save, ShieldCheck, FileCode2 } from "lucide-react";
import { toast } from "sonner";
import { Screen, DataCard } from "@/components/screens/RichScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getEInvoiceSettings,
  saveEInvoiceSettings,
  listEInvoiceFormatsFn,
  validateEInvoiceXml,
} from "@/lib/accounting.functions";

export const Route = createFileRoute("/client/accounting/e-invoices-settings")({
  component: EInvoiceSettings,
  head: () => ({
    meta: [
      { title: "E-invoice settings — Fiksu" },
      {
        name: "description",
        content:
          "Configure Fiksu-native e-invoicing: default format (Finvoice 3.0, UBL, XRechnung, CII), auto-send, and delivery webhook.",
      },
    ],
  }),
});

function EInvoiceSettings() {
  const qc = useQueryClient();
  const getFn = useServerFn(getEInvoiceSettings);
  const saveFn = useServerFn(saveEInvoiceSettings);
  const formatsFn = useServerFn(listEInvoiceFormatsFn);
  const validateFn = useServerFn(validateEInvoiceXml);

  const { data: settings } = useQuery({ queryKey: ["einvoice", "settings"], queryFn: () => getFn() });
  const { data: formats = [] } = useQuery({ queryKey: ["einvoice", "formats"], queryFn: () => formatsFn() });

  const [webhookUrl, setWebhookUrl] = useState("");
  const [defaultFormat, setDefaultFormat] = useState("FINVOICE");
  const [autoSend, setAutoSend] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setWebhookUrl(settings.webhookUrl ?? "");
      setDefaultFormat(settings.defaultFormat ?? "FINVOICE");
      setAutoSend(Boolean(settings.autoSend));
    }
  }, [settings]);

  const save = async () => {
    setSaving(true);
    try {
      await saveFn({ data: { webhookUrl, defaultFormat, autoSend } });
      toast.success("E-invoice settings saved");
      qc.invalidateQueries({ queryKey: ["einvoice", "settings"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // Validator
  const [xml, setXml] = useState("");
  const [result, setResult] = useState<null | {
    wellFormed: boolean;
    error?: string;
    parsed: unknown;
  }>(null);
  const runValidate = async () => {
    try {
      const r = await validateFn({ data: { xml } });
      setResult(r);
      if (r.wellFormed) toast.success("XML is well-formed");
      else toast.error(r.error ?? "Invalid XML");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Screen
      title="E-invoice settings"
      description="Fiksu-native e-invoicing — EN 16931 compliant. No third-party access point required."
      icon={Settings2}
      actions={
        <Button onClick={save} disabled={saving}>
          <Save className="mr-2 size-4" />
          {saving ? "Saving…" : "Save"}
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <DataCard title="Delivery">
          <div className="space-y-4 p-4">
            <div className="space-y-2">
              <Label htmlFor="fmt">Default outbound format</Label>
              <Select value={defaultFormat} onValueChange={setDefaultFormat}>
                <SelectTrigger id="fmt"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {formats.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.label} <span className="ml-2 text-xs text-muted-foreground">{f.syntax}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Finvoice 3.0 is the Finnish standard accepted by Verohallinto and every Finnish bank operator.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hook">Delivery webhook URL</Label>
              <Input
                id="hook"
                placeholder="https://your-partner.example.com/inbox"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Optional. When set, generated XML is POSTed here signed with your HMAC secret.
                Status callbacks come back to <code>/api/public/einvoice/status</code>.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Auto-send on invoice issue</p>
                <p className="text-xs text-muted-foreground">Dispatch e-invoice the moment an invoice moves to "sent".</p>
              </div>
              <Switch checked={autoSend} onCheckedChange={setAutoSend} />
            </div>

            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              <div className="mb-1 flex items-center gap-1 font-medium text-slate-800">
                <ShieldCheck className="size-3.5" /> Inbound endpoint
              </div>
              <code className="break-all">POST /api/public/einvoice/inbound</code>
              <p className="mt-1">
                Signed with <code>FIKSU_EINVOICE_WEBHOOK_SECRET</code> (HMAC-SHA256, header
                <code> X-Fiksu-Signature</code>) and resolved by <code>X-Fiksu-Company-Id</code> or buyer VAT ID.
              </p>
            </div>
          </div>
        </DataCard>

        <DataCard title="XML validator">
          <div className="space-y-3 p-4">
            <Label htmlFor="xml">Paste Finvoice / UBL / CII XML</Label>
            <Textarea
              id="xml"
              value={xml}
              onChange={(e) => setXml(e.target.value)}
              placeholder='<?xml version="1.0"?>…'
              className="min-h-[220px] font-mono text-xs"
            />
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={runValidate} disabled={!xml.trim()}>
                <FileCode2 className="mr-2 size-4" /> Validate & parse
              </Button>
              {result && (
                <Badge variant={result.wellFormed ? "default" : "destructive"} className="rounded-full">
                  {result.wellFormed ? "Well-formed" : "Invalid"}
                </Badge>
              )}
            </div>
            {result && (
              <pre className="max-h-64 overflow-auto rounded-lg bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-100">
                {JSON.stringify(result, null, 2)}
              </pre>
            )}
          </div>
        </DataCard>
      </div>
    </Screen>
  );
}
