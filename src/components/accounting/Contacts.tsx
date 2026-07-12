import { useMemo, useState } from "react";
import { Plus, Trash2, Pencil, Users } from "lucide-react";
import { toast } from "sonner";

import { PageHeading } from "@/components/PagePlaceholder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataToolbar, StatusPill } from "./DataToolbar";
import { store, useStore, fmt, type Contact } from "@/lib/mock/store";

const empty = (): Contact => ({ id: "", name: "", type: "customer", email: "", country: "FI", vat: "", balance: 0 });

export function ContactsScreen() {
  const contacts = useStore((s) => s.contacts);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Contact>(empty());

  const filtered = useMemo(() => contacts.filter((c) => {
    if (filter !== "all" && c.type !== filter && !(filter === "customer" && c.type === "both") && !(filter === "vendor" && c.type === "both")) return false;
    if (!q) return true;
    return c.name.toLowerCase().includes(q.toLowerCase()) || c.email.toLowerCase().includes(q.toLowerCase());
  }), [contacts, q, filter]);

  const openNew = () => { setDraft(empty()); setOpen(true); };
  const openEdit = (c: Contact) => { setDraft(c); setOpen(true); };
  const save = () => {
    if (!draft.name.trim()) return toast.error("Name is required");
    store.upsertContact(draft);
    toast.success(draft.id ? "Contact updated" : "Contact created");
    setOpen(false);
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeading title="Contacts" description="Customers, vendors, and everyone you invoice or pay." icon={Users}
        actions={<Button className="rounded-xl bg-gradient-primary text-primary-foreground shadow-[var(--shadow-glow)]" onClick={openNew}><Plus className="me-1.5 size-4" /> New contact</Button>} />

      <div className="glass rounded-2xl border-glass-border p-6">
        <DataToolbar value={q} onChange={setQ} placeholder="Search contacts…">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="h-10 w-[160px] rounded-xl border-glass-border bg-glass"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="customer">Customers</SelectItem>
              <SelectItem value="vendor">Vendors</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
        </DataToolbar>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-glass-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Type</th>
                <th className="py-2 pr-4 font-medium">Email</th>
                <th className="py-2 pr-4 font-medium">VAT ID</th>
                <th className="py-2 pr-4 text-right font-medium">Balance</th>
                <th className="py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-glass-border/60 last:border-0 hover:bg-secondary/40">
                  <td className="py-3 pr-4 font-medium">{c.name}</td>
                  <td className="py-3 pr-4"><StatusPill tone={c.type === "customer" ? "info" : c.type === "vendor" ? "warning" : "success"}>{c.type}</StatusPill></td>
                  <td className="py-3 pr-4 text-muted-foreground">{c.email}</td>
                  <td className="py-3 pr-4 font-mono text-xs">{c.vat ?? "—"}</td>
                  <td className={"py-3 pr-4 text-right font-medium " + (c.balance < 0 ? "text-destructive" : "")}>{fmt.format(c.balance)}</td>
                  <td className="py-3">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="size-8" onClick={() => openEdit(c)}><Pencil className="size-4" /></Button>
                      <Button size="icon" variant="ghost" className="size-8 text-destructive" onClick={() => { store.deleteContact(c.id); toast(`${c.name} removed`); }}><Trash2 className="size-4" /></Button>
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
          <DialogHeader><DialogTitle>{draft.id ? "Edit contact" : "New contact"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2"><Label>Name</Label><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="mt-1.5 rounded-xl" /></div>
            <div><Label>Type</Label>
              <Select value={draft.type} onValueChange={(v: Contact["type"]) => setDraft({ ...draft, type: v })}>
                <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="customer">Customer</SelectItem><SelectItem value="vendor">Vendor</SelectItem><SelectItem value="both">Both</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Country</Label><Input value={draft.country} onChange={(e) => setDraft({ ...draft, country: e.target.value })} className="mt-1.5 rounded-xl" /></div>
            <div><Label>Email</Label><Input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} className="mt-1.5 rounded-xl" /></div>
            <div><Label>VAT ID</Label><Input value={draft.vat ?? ""} onChange={(e) => setDraft({ ...draft, vat: e.target.value })} className="mt-1.5 rounded-xl" /></div>
            <div className="md:col-span-2"><Label>Opening balance (€)</Label><Input type="number" value={draft.balance} onChange={(e) => setDraft({ ...draft, balance: +e.target.value })} className="mt-1.5 rounded-xl" /></div>
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