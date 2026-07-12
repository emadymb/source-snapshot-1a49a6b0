import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Layout, FileText, Plus, Copy, Trash2, GripVertical, Type, Image as ImageIcon, Square, MousePointer, Rows, Columns, Star, Mail, Video, HelpCircle, Eye, Smartphone, Monitor, Save, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/super/page-builder")({ component: PageBuilderPage });

type BlockType = "hero" | "features" | "text" | "cta" | "faq" | "pricing" | "testimonial" | "legal" | "media" | "logos";

interface Block {
  id: string;
  type: BlockType;
  title: string;
  body: string;
}

interface PageDoc {
  id: string;
  name: string;
  slug: string;
  template: string;
  category: "marketing" | "legal" | "blog";
  status: "draft" | "published";
  updated: string;
  blocks: Block[];
}

const BLOCK_LIB: { type: BlockType; label: string; icon: typeof Type; color: string }[] = [
  { type: "hero", label: "Hero", icon: Star, color: "from-indigo-500 to-violet-500" },
  { type: "features", label: "Features grid", icon: Rows, color: "from-emerald-500 to-teal-500" },
  { type: "text", label: "Rich text", icon: Type, color: "from-slate-500 to-slate-700" },
  { type: "cta", label: "Call to action", icon: MousePointer, color: "from-amber-500 to-orange-500" },
  { type: "faq", label: "FAQ", icon: HelpCircle, color: "from-sky-500 to-blue-500" },
  { type: "pricing", label: "Pricing", icon: Columns, color: "from-rose-500 to-pink-500" },
  { type: "testimonial", label: "Testimonial", icon: Mail, color: "from-violet-500 to-fuchsia-500" },
  { type: "legal", label: "Legal clause", icon: FileText, color: "from-slate-600 to-slate-800" },
  { type: "media", label: "Image / video", icon: ImageIcon, color: "from-teal-500 to-cyan-500" },
  { type: "logos", label: "Logo cloud", icon: Square, color: "from-orange-500 to-red-500" },
];

const TEMPLATES: PageDoc[] = [
  {
    id: "t_landing", name: "Home / Landing", slug: "/", template: "landing", category: "marketing", status: "published", updated: "2 days ago",
    blocks: [
      { id: "b1", type: "hero", title: "AI-powered accounting for Finnish businesses", body: "Ship receipts in seconds. Get VAT-ready books. Delight your accountant." },
      { id: "b2", type: "logos", title: "Trusted by 240+ Finnish firms", body: "Lindqvist Oy · K-Ryhmä · Aalto Design · Nordea Consulting" },
      { id: "b3", type: "features", title: "Everything a modern firm needs", body: "Hybrid OCR · PEPPOL Finvoice · Payroll · Multi-tenant workspaces" },
      { id: "b4", type: "testimonial", title: "\"We closed the month in 3 days, not 3 weeks.\"", body: "— Erik Lindqvist, Managing Partner" },
      { id: "b5", type: "cta", title: "Start your 14-day trial", body: "No credit card. Import from Procountor or Netvisor in one click." },
    ],
  },
  { id: "t_pricing", name: "Pricing", slug: "/pricing", template: "pricing", category: "marketing", status: "published", updated: "1 week ago",
    blocks: [{ id: "b1", type: "hero", title: "Simple pricing, no surprises", body: "Every plan includes the AI assistant and PEPPOL delivery." }, { id: "b2", type: "pricing", title: "4 plans", body: "Free · Starter · Growth · Scale" }, { id: "b3", type: "faq", title: "Pricing FAQ", body: "5 common questions" }] },
  { id: "t_about", name: "About", slug: "/about", template: "about", category: "marketing", status: "published", updated: "3 weeks ago",
    blocks: [{ id: "b1", type: "hero", title: "Built in Helsinki, for the Nordics", body: "Founded by accountants, engineered for scale." }, { id: "b2", type: "text", title: "Our story", body: "500 words about the founding team" }] },
  { id: "t_terms", name: "Terms of Service", slug: "/terms", template: "legal", category: "legal", status: "published", updated: "2 months ago",
    blocks: [{ id: "b1", type: "legal", title: "1. Acceptance of terms", body: "By using Fiksu you agree to these terms…" }, { id: "b2", type: "legal", title: "2. Data processing", body: "GDPR-compliant, EU data residency…" }, { id: "b3", type: "legal", title: "3. Liability", body: "Standard SaaS liability clauses…" }] },
  { id: "t_privacy", name: "Privacy Policy", slug: "/privacy", template: "legal", category: "legal", status: "published", updated: "2 months ago",
    blocks: [{ id: "b1", type: "legal", title: "Data we collect", body: "Business identifiers, receipts, chat logs…" }, { id: "b2", type: "legal", title: "Your rights (GDPR)", body: "Access, rectification, erasure, portability…" }] },
  { id: "t_cookies", name: "Cookies", slug: "/cookies", template: "legal", category: "legal", status: "published", updated: "2 months ago", blocks: [{ id: "b1", type: "legal", title: "Essential cookies only", body: "We use minimal cookies for authentication and preferences." }] },
  { id: "t_dpa", name: "Data Processing Agreement", slug: "/dpa", template: "legal", category: "legal", status: "draft", updated: "5 days ago", blocks: [{ id: "b1", type: "legal", title: "Sub-processors", body: "AWS Frankfurt · Cloudflare · Maventa PEPPOL" }] },
  { id: "t_blog", name: "Blog index", slug: "/blog", template: "blog-index", category: "blog", status: "published", updated: "Yesterday", blocks: [{ id: "b1", type: "hero", title: "Fiksu Insights", body: "Guides for modern Finnish accountants" }, { id: "b2", type: "features", title: "Latest posts", body: "12 articles" }] },
];

function PageBuilderPage() {
  const [pages, setPages] = useState<PageDoc[]>(TEMPLATES);
  const [activeId, setActiveId] = useState<string>(TEMPLATES[0].id);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [dragOver, setDragOver] = useState<number | null>(null);
  const active = pages.find((p) => p.id === activeId)!;

  const addBlock = (type: BlockType) => {
    const meta = BLOCK_LIB.find((b) => b.type === type)!;
    const blk: Block = { id: `b_${Date.now()}`, type, title: meta.label, body: "Click to edit content…" };
    setPages((ps) => ps.map((p) => p.id === activeId ? { ...p, blocks: [...p.blocks, blk] } : p));
    toast.success(`${meta.label} block added.`);
  };

  const removeBlock = (id: string) => setPages((ps) => ps.map((p) => p.id === activeId ? { ...p, blocks: p.blocks.filter((b) => b.id !== id) } : p));
  const duplicateBlock = (id: string) => setPages((ps) => ps.map((p) => {
    if (p.id !== activeId) return p;
    const idx = p.blocks.findIndex((b) => b.id === id);
    const dup = { ...p.blocks[idx], id: `b_${Date.now()}` };
    const next = [...p.blocks];
    next.splice(idx + 1, 0, dup);
    return { ...p, blocks: next };
  }));

  const [dragId, setDragId] = useState<string | null>(null);
  const reorder = (targetIdx: number) => {
    if (!dragId) return;
    setPages((ps) => ps.map((p) => {
      if (p.id !== activeId) return p;
      const from = p.blocks.findIndex((b) => b.id === dragId);
      if (from < 0) return p;
      const blk = p.blocks[from];
      const next = p.blocks.filter((_, i) => i !== from);
      next.splice(targetIdx > from ? targetIdx - 1 : targetIdx, 0, blk);
      return { ...p, blocks: next };
    }));
    setDragId(null); setDragOver(null);
  };

  const updateBlock = (id: string, field: "title" | "body", value: string) =>
    setPages((ps) => ps.map((p) => p.id === activeId ? { ...p, blocks: p.blocks.map((b) => b.id === id ? { ...b, [field]: value } : b) } : p));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Page Builder</h1>
          <p className="mt-1 text-sm text-muted-foreground">Drag & drop composer for marketing and legal pages. Every template becomes a live page.</p>
        </div>
        <div className="flex gap-2">
          <div className="flex overflow-hidden rounded-lg border">
            <button onClick={() => setDevice("desktop")} className={cn("px-3 py-1.5 text-xs", device === "desktop" && "bg-slate-900 text-white")}><Monitor className="size-4" /></button>
            <button onClick={() => setDevice("mobile")} className={cn("px-3 py-1.5 text-xs", device === "mobile" && "bg-slate-900 text-white")}><Smartphone className="size-4" /></button>
          </div>
          <Button variant="outline" className="gap-2"><Eye className="size-4" /> Preview</Button>
          <Button variant="outline" className="gap-2"><Undo2 className="size-4" /> Revert</Button>
          <Button onClick={() => toast.success("Published to " + active.slug)} className="gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
            <Save className="size-4" /> Publish
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr_260px]">
        {/* Pages sidebar */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-glass-border bg-white/70 p-3 backdrop-blur">
            <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pages</p>
            <Tabs defaultValue="marketing">
              <TabsList className="w-full">
                <TabsTrigger value="marketing" className="flex-1 text-xs">Marketing</TabsTrigger>
                <TabsTrigger value="legal" className="flex-1 text-xs">Legal</TabsTrigger>
                <TabsTrigger value="blog" className="flex-1 text-xs">Blog</TabsTrigger>
              </TabsList>
              {(["marketing", "legal", "blog"] as const).map((cat) => (
                <TabsContent key={cat} value={cat} className="mt-2 space-y-1">
                  {pages.filter((p) => p.category === cat).map((p) => (
                    <button key={p.id} onClick={() => setActiveId(p.id)}
                      className={cn("w-full rounded-lg px-2.5 py-2 text-start text-sm transition-colors",
                        p.id === activeId ? "bg-indigo-50 text-indigo-900" : "hover:bg-slate-50")}>
                      <div className="flex items-center justify-between">
                        <span className="truncate font-medium">{p.name}</span>
                        <Badge variant={p.status === "published" ? "default" : "secondary"} className={cn("h-4 text-[9px]", p.status === "published" && "bg-emerald-500")}>{p.status}</Badge>
                      </div>
                      <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">{p.slug} · {p.updated}</p>
                    </button>
                  ))}
                  <Button variant="ghost" size="sm" className="mt-1 w-full gap-2 text-xs" onClick={() => {
                    const id = `p_${Date.now()}`;
                    const np: PageDoc = { id, name: `New ${cat} page`, slug: `/new-${Date.now()}`, template: "blank", category: cat, status: "draft", updated: "just now", blocks: [] };
                    setPages((ps) => [...ps, np]); setActiveId(id);
                  }}><Plus className="size-3.5" /> New page</Button>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>

        {/* Canvas */}
        <div className="space-y-3">
          <div className="rounded-2xl border border-glass-border bg-white/70 p-4 backdrop-blur">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 space-y-1">
                <Input value={active.name} onChange={(e) => setPages((ps) => ps.map((p) => p.id === activeId ? { ...p, name: e.target.value } : p))}
                  className="border-0 bg-transparent px-0 font-display text-xl font-semibold focus-visible:ring-0" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">https://fiksu.fi</span>
                  <Input value={active.slug} onChange={(e) => setPages((ps) => ps.map((p) => p.id === activeId ? { ...p, slug: e.target.value } : p))}
                    className="h-6 max-w-[200px] font-mono text-xs" />
                </div>
              </div>
              <Badge variant="secondary">{active.blocks.length} blocks</Badge>
            </div>
          </div>

          <div className={cn("mx-auto space-y-3 transition-all", device === "mobile" ? "max-w-sm" : "max-w-full")}>
            {active.blocks.length === 0 && (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 p-16 text-center">
                <Layout className="mx-auto mb-3 size-10 text-slate-300" />
                <p className="text-sm text-muted-foreground">Drag blocks from the right panel to start building.</p>
              </div>
            )}

            {active.blocks.map((blk, i) => {
              const meta = BLOCK_LIB.find((b) => b.type === blk.type)!;
              const Icon = meta.icon;
              return (
                <div key={blk.id}>
                  <div onDragOver={(e) => { e.preventDefault(); setDragOver(i); }} onDrop={() => reorder(i)}
                    className={cn("h-2 rounded-full transition-all", dragOver === i ? "bg-indigo-400" : "bg-transparent")} />
                  <div draggable onDragStart={() => setDragId(blk.id)}
                    className="group rounded-2xl border border-glass-border bg-white/90 p-5 shadow-sm transition-all hover:shadow-md">
                    <div className="mb-3 flex items-center gap-2">
                      <GripVertical className="size-4 cursor-grab text-slate-300" />
                      <div className={cn("flex size-7 items-center justify-center rounded-md bg-gradient-to-br text-white", meta.color)}>
                        <Icon className="size-3.5" />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{meta.label}</span>
                      <div className="ms-auto flex opacity-0 transition-opacity group-hover:opacity-100">
                        <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => duplicateBlock(blk.id)}><Copy className="size-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="size-7 p-0 text-red-600" onClick={() => removeBlock(blk.id)}><Trash2 className="size-3.5" /></Button>
                      </div>
                    </div>
                    <Input value={blk.title} onChange={(e) => updateBlock(blk.id, "title", e.target.value)}
                      className="border-0 px-0 font-display text-lg font-semibold focus-visible:ring-0" />
                    <Textarea value={blk.body} onChange={(e) => updateBlock(blk.id, "body", e.target.value)}
                      className="mt-1 min-h-[60px] resize-none border-0 px-0 text-sm text-muted-foreground focus-visible:ring-0" />
                  </div>
                </div>
              );
            })}
            <div onDragOver={(e) => { e.preventDefault(); setDragOver(active.blocks.length); }} onDrop={() => reorder(active.blocks.length)}
              className={cn("h-2 rounded-full transition-all", dragOver === active.blocks.length ? "bg-indigo-400" : "bg-transparent")} />
          </div>
        </div>

        {/* Block library */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-glass-border bg-white/70 p-3 backdrop-blur">
            <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Blocks</p>
            <div className="grid grid-cols-2 gap-2">
              {BLOCK_LIB.map((b) => {
                const Icon = b.icon;
                return (
                  <button key={b.type} onClick={() => addBlock(b.type)}
                    className="group flex flex-col items-center gap-2 rounded-xl border bg-white p-3 text-center transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md">
                    <div className={cn("flex size-9 items-center justify-center rounded-lg bg-gradient-to-br text-white", b.color)}>
                      <Icon className="size-4" />
                    </div>
                    <span className="text-[11px] font-medium">{b.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="rounded-2xl border border-glass-border bg-white/70 p-4 backdrop-blur">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">SEO</p>
            <div className="space-y-3">
              <div><Label className="text-xs">Title</Label><Input defaultValue={active.name + " — Fiksu"} className="mt-1 text-xs" /></div>
              <div><Label className="text-xs">Meta description</Label><Textarea defaultValue={"Modern accounting platform for Finnish businesses"} className="mt-1 min-h-[60px] text-xs" /></div>
              <div><Label className="text-xs">OG image</Label><Input placeholder="/og/landing.png" className="mt-1 font-mono text-xs" /></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
