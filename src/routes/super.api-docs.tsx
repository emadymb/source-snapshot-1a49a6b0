import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, Check, Terminal, KeyRound, Zap, Book, Play, Plus, Trash2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/super/api-docs")({ component: ApiDocsPage });

interface Endpoint {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  desc: string;
  auth: "publishable" | "secret";
  category: string;
}

const ENDPOINTS: Endpoint[] = [
  { method: "GET", path: "/v1/workspaces", desc: "List all workspaces", auth: "secret", category: "Workspaces" },
  { method: "POST", path: "/v1/workspaces", desc: "Create a new workspace", auth: "secret", category: "Workspaces" },
  { method: "GET", path: "/v1/workspaces/{id}", desc: "Retrieve a workspace", auth: "secret", category: "Workspaces" },
  { method: "PATCH", path: "/v1/workspaces/{id}", desc: "Update workspace details", auth: "secret", category: "Workspaces" },
  { method: "GET", path: "/v1/companies", desc: "List client companies", auth: "secret", category: "Companies" },
  { method: "POST", path: "/v1/companies/lookup", desc: "YTJ / PRH business info lookup", auth: "publishable", category: "Companies" },
  { method: "GET", path: "/v1/invoices", desc: "List invoices", auth: "secret", category: "Invoices" },
  { method: "POST", path: "/v1/invoices", desc: "Create a Finvoice / PEPPOL invoice", auth: "secret", category: "Invoices" },
  { method: "POST", path: "/v1/invoices/{id}/send", desc: "Send an invoice via PEPPOL", auth: "secret", category: "Invoices" },
  { method: "POST", path: "/v1/ocr/upload", desc: "Upload receipt for hybrid OCR", auth: "secret", category: "OCR & AI" },
  { method: "POST", path: "/v1/ai/chat", desc: "Chat with the accounting assistant", auth: "secret", category: "OCR & AI" },
  { method: "GET", path: "/v1/reports/pnl", desc: "Generate profit & loss report", auth: "secret", category: "Reports" },
  { method: "GET", path: "/v1/reports/vat", desc: "Finnish ALV report (24 / 14 / 10 / 0)", auth: "secret", category: "Reports" },
  { method: "POST", path: "/v1/webhooks", desc: "Register a webhook subscription", auth: "secret", category: "Webhooks" },
];

const METHOD_COLOR: Record<Endpoint["method"], string> = {
  GET: "bg-emerald-100 text-emerald-700 border-emerald-200",
  POST: "bg-sky-100 text-sky-700 border-sky-200",
  PATCH: "bg-amber-100 text-amber-700 border-amber-200",
  DELETE: "bg-red-100 text-red-700 border-red-200",
};

function CodeBlock({ children, lang }: { children: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="group relative overflow-hidden rounded-xl border bg-slate-950">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{lang}</span>
        <button onClick={() => { navigator.clipboard.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-white/10">
          {copied ? <><Check className="size-3" /> Copied</> : <><Copy className="size-3" /> Copy</>}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed text-slate-100"><code>{children}</code></pre>
    </div>
  );
}

function ApiDocsPage() {
  const [selected, setSelected] = useState<Endpoint>(ENDPOINTS[0]);
  const [managingKeys, setManagingKeys] = useState(false);
  const [keys, setKeys] = useState([
    { id: "k1", label: "Production", prefix: "sk_live_fk_a91f42", created: "2026-01-04", lastUsed: "3 min ago", env: "live" },
    { id: "k2", label: "Analytics pipeline", prefix: "sk_live_fk_7cd201", created: "2025-11-22", lastUsed: "1h ago", env: "live" },
    { id: "k3", label: "Sandbox testing", prefix: "sk_test_fk_3fb8ee", created: "2025-09-01", lastUsed: "Yesterday", env: "test" },
  ]);

  const grouped = Object.entries(
    ENDPOINTS.reduce<Record<string, Endpoint[]>>((acc, e) => { (acc[e.category] ||= []).push(e); return acc; }, {}),
  );

  const curlSample = `curl -X ${selected.method} https://api.fiksu.fi${selected.path.replace("{id}", "w_001")} \\
  -H "Authorization: Bearer ${'$'}FIKSU_API_KEY" \\
  -H "Content-Type: application/json"${selected.method !== "GET" ? ` \\
  -d '{ "name": "Example" }'` : ""}`;

  const nodeSample = `import { Fiksu } from "@fiksu/node";

const fiksu = new Fiksu(process.env.FIKSU_API_KEY);

const result = await fiksu.${selected.category.toLowerCase()}.${selected.method === "GET" ? "list" : "create"}(${selected.method !== "GET" ? "{ name: 'Example' }" : ""});
console.log(result);`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Developer API</h1>
          <p className="mt-1 text-sm text-muted-foreground">REST endpoints, webhooks, and SDKs for integrating with the Fiksu platform.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2"><Book className="size-4" /> Full reference</Button>
          <Button onClick={() => setManagingKeys(true)} className="gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
            <KeyRound className="size-4" /> API keys
          </Button>
        </div>
      </div>

      {/* Hero cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { icon: Zap, label: "Base URL", value: "https://api.fiksu.fi", sub: "REST · JSON · TLS 1.3" },
          { icon: Terminal, label: "SDKs", value: "Node · Python · PHP", sub: "Official libraries" },
          { icon: KeyRound, label: "Auth", value: "Bearer + HMAC", sub: "Publishable & secret keys" },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-glass-border bg-gradient-to-br from-white to-slate-50 p-5 backdrop-blur">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
              <c.icon className="size-5" />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{c.label}</p>
            <p className="font-display text-lg font-semibold">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Endpoint tree */}
        <div className="space-y-4 rounded-2xl border border-glass-border bg-white/70 p-4 backdrop-blur">
          {grouped.map(([cat, eps]) => (
            <div key={cat}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{cat}</p>
              <div className="space-y-1">
                {eps.map((e) => {
                  const active = selected.path === e.path && selected.method === e.method;
                  return (
                    <button key={e.method + e.path} onClick={() => setSelected(e)}
                      className={cn("group flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-start transition-colors",
                        active ? "bg-indigo-50" : "hover:bg-slate-50")}>
                      <span className={cn("shrink-0 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-bold", METHOD_COLOR[e.method])}>{e.method}</span>
                      <span className="truncate font-mono text-[12px]">{e.path}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Endpoint detail */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-glass-border bg-white/70 p-6 backdrop-blur">
            <div className="flex flex-wrap items-center gap-3">
              <span className={cn("rounded-md border px-2.5 py-1 font-mono text-xs font-bold", METHOD_COLOR[selected.method])}>{selected.method}</span>
              <span className="font-mono text-sm">{selected.path}</span>
              <Badge variant="secondary" className="ms-auto">{selected.auth === "secret" ? "Secret key required" : "Publishable key"}</Badge>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{selected.desc}</p>

            <Tabs defaultValue="curl" className="mt-5">
              <TabsList>
                <TabsTrigger value="curl">cURL</TabsTrigger>
                <TabsTrigger value="node">Node.js</TabsTrigger>
                <TabsTrigger value="response">Response</TabsTrigger>
              </TabsList>
              <TabsContent value="curl" className="pt-3"><CodeBlock lang="bash">{curlSample}</CodeBlock></TabsContent>
              <TabsContent value="node" className="pt-3"><CodeBlock lang="typescript">{nodeSample}</CodeBlock></TabsContent>
              <TabsContent value="response" className="pt-3">
                <CodeBlock lang="json">{`{
  "id": "w_001",
  "name": "Lindqvist Oy",
  "plan": "growth",
  "companies": 2,
  "mrr": 89,
  "created_at": "2024-03-12T09:14:00Z"
}`}</CodeBlock>
              </TabsContent>
            </Tabs>
          </div>

          {/* Try it live */}
          <div className="rounded-2xl border border-glass-border bg-white/70 p-6 backdrop-blur">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">Try it live</h3>
              <Button size="sm" className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white" onClick={() => toast.success("200 OK · returned in 142ms")}>
                <Play className="size-4" /> Send request
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">workspace_id</Label>
                <Input defaultValue="w_001" className="font-mono text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">API key</Label>
                <Input type="password" defaultValue="sk_live_fk_a91f42••••" className="font-mono text-xs" />
              </div>
            </div>
          </div>

          {/* Webhooks */}
          <div className="rounded-2xl border border-glass-border bg-white/70 p-6 backdrop-blur">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">Webhook events</h3>
              <Badge variant="secondary">14 events</Badge>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {["invoice.created","invoice.sent","invoice.paid","receipt.uploaded","receipt.processed","payroll.generated","workspace.created","subscription.updated","ocr.completed","ocr.failed","user.invited","peppol.delivered","ai.chat.completed","report.generated"].map((e) => (
                <div key={e} className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm">
                  <span className="font-mono text-xs">{e}</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={managingKeys} onOpenChange={setManagingKeys}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>API keys</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            {keys.map((k) => (
              <div key={k.id} className="flex items-center justify-between rounded-xl border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{k.label} <Badge variant="secondary" className="ms-1 text-[10px]">{k.env}</Badge></p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{k.prefix}••••</p>
                  <p className="text-[11px] text-muted-foreground">Created {k.created} · last used {k.lastUsed}</p>
                </div>
                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setKeys((ks) => ks.filter((x) => x.id !== k.id))}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" className="w-full gap-2" onClick={() => { const id = `k_${Date.now()}`; setKeys((ks) => [...ks, { id, label: "New key", prefix: `sk_live_fk_${Math.random().toString(36).slice(2, 8)}`, created: new Date().toISOString().slice(0,10), lastUsed: "Never", env: "live" }]); toast.success("New API key generated. Copy it now — it won't be shown again."); }}>
              <Plus className="size-4" /> Generate new key
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManagingKeys(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
