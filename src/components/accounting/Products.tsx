import { useMemo, useState } from "react";
import { Plus, Trash2, Pencil, Package, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { PageHeading } from "@/components/PagePlaceholder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DataToolbar, StatusPill } from "./DataToolbar";
import { store, useStore, fmt, type Product } from "@/lib/mock/store";

const empty = (): Product => ({ id: "", sku: "", name: "", price: 0, cost: 0, stock: 0, vatRate: 24, unit: "pcs" });

export function ProductsScreen() {
  const products = useStore((s) => s.products);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Product>(empty());

  const filtered = useMemo(() => products.filter((p) =>
    !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.sku.toLowerCase().includes(q.toLowerCase())
  ), [products, q]);

  const totalValue = products.reduce((a, p) => a + p.cost * p.stock, 0);
  const lowStock = products.filter((p) => p.stock < 10).length;

  const save = () => {
    if (!draft.name.trim() || !draft.sku.trim()) return toast.error("SKU and name are required");
    store.upsertProduct(draft);
    toast.success(draft.id ? "Product updated" : "Product created");
    setOpen(false);
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeading title="Inventory & Products" description="Sellable items, stock levels, and cost basis." icon={Package}
        actions={<Button className="rounded-xl bg-gradient-primary text-primary-foreground shadow-[var(--shadow-glow)]" onClick={() => { setDraft(empty()); setOpen(true); }}><Plus className="me-1.5 size-4" /> New product</Button>} />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass rounded-2xl border-glass-border p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Inventory value</p>
          <p className="mt-2 font-display text-2xl font-semibold">{fmt.format(totalValue)}</p>
          <p className="mt-1 text-xs text-muted-foreground">At cost</p>
        </div>
        <div className="glass rounded-2xl border-glass-border p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">SKUs</p>
          <p className="mt-2 font-display text-2xl font-semibold">{products.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Tracked</p>
        </div>
        <div className="glass rounded-2xl border-glass-border p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Low stock</p>
          <p className="mt-2 flex items-center gap-2 font-display text-2xl font-semibold">{lowStock > 0 && <AlertTriangle className="size-5 text-warning-foreground" />} {lowStock}</p>
          <p className="mt-1 text-xs text-muted-foreground">Under 10 units</p>
        </div>
      </div>

      <div className="mt-4 glass rounded-2xl border-glass-border p-6">
        <DataToolbar value={q} onChange={setQ} placeholder="Search by name or SKU…" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-glass-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-4 font-medium">SKU</th>
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 text-right font-medium">Price</th>
                <th className="py-2 pr-4 text-right font-medium">Cost</th>
                <th className="py-2 pr-4 text-right font-medium">Stock</th>
                <th className="py-2 pr-4 font-medium">VAT</th>
                <th className="py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-glass-border/60 last:border-0 hover:bg-secondary/40">
                  <td className="py-3 pr-4 font-mono text-xs">{p.sku}</td>
                  <td className="py-3 pr-4 font-medium">{p.name}</td>
                  <td className="py-3 pr-4 text-right">{fmt.format(p.price)}</td>
                  <td className="py-3 pr-4 text-right text-muted-foreground">{fmt.format(p.cost)}</td>
                  <td className="py-3 pr-4 text-right">{p.stock === 999 ? "∞" : p.stock} {p.unit}</td>
                  <td className="py-3 pr-4"><StatusPill tone="muted">{p.vatRate}%</StatusPill></td>
                  <td className="py-3">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="size-8" onClick={() => { setDraft(p); setOpen(true); }}><Pencil className="size-4" /></Button>
                      <Button size="icon" variant="ghost" className="size-8 text-destructive" onClick={() => { store.deleteProduct(p.id); toast(`${p.name} removed`); }}><Trash2 className="size-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{draft.id ? "Edit product" : "New product"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label>SKU</Label><Input value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} className="mt-1.5 rounded-xl" /></div>
            <div><Label>Unit</Label><Input value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} className="mt-1.5 rounded-xl" /></div>
            <div className="md:col-span-2"><Label>Name</Label><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="mt-1.5 rounded-xl" /></div>
            <div><Label>Price (€)</Label><Input type="number" value={draft.price} onChange={(e) => setDraft({ ...draft, price: +e.target.value })} className="mt-1.5 rounded-xl" /></div>
            <div><Label>Cost (€)</Label><Input type="number" value={draft.cost} onChange={(e) => setDraft({ ...draft, cost: +e.target.value })} className="mt-1.5 rounded-xl" /></div>
            <div><Label>Stock</Label><Input type="number" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: +e.target.value })} className="mt-1.5 rounded-xl" /></div>
            <div><Label>VAT %</Label><Input type="number" value={draft.vatRate} onChange={(e) => setDraft({ ...draft, vatRate: +e.target.value })} className="mt-1.5 rounded-xl" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-gradient-primary text-primary-foreground" onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}