import { useMemo, useState } from "react";
import { Plus, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { PageHeading } from "@/components/PagePlaceholder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataToolbar, StatusPill } from "./DataToolbar";
import { listCustomers, upsertCustomer, type CustomerDTO } from "@/lib/accounting.functions";

type Draft = { id?: string; name: string; email: string; vatId: string; country: string };

const empty = (): Draft => ({ name: "", email: "", vatId: "", country: "FI" });

export function ContactsScreen() {
  const qc = useQueryClient();
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["accounting", "customers"],
    queryFn: () => listCustomers(),
    staleTime: 30_000,
  });
  const save = useMutation({
    mutationFn: (d: Draft) =>
      upsertCustomer({ data: { id: d.id, name: d.name, email: d.email || null, vatId: d.vatId || null, country: d.country } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounting", "customers"] });
      toast.success("Contact saved");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(empty());

  const filtered = useMemo(() => contacts.filter((c: CustomerDTO) => {
    if (!q) return true;
    const needle = q.toLowerCase();
    return c.name.toLowerCase().includes(needle) || (c.email ?? "").toLowerCase().includes(needle);
  }), [contacts, q]);

  const openNew = () => { setDraft(empty()); setOpen(true); };
  const openEdit = (c: CustomerDTO) => {
    setDraft({ id: c.id, name: c.name, email: c.email ?? "", vatId: c.vatId ?? "", country: c.country });
    setOpen(true);
  };
  const submit = () => { if (!draft.name.trim()) return toast.error("Name is required"); save.mutate(draft); };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeading title="Customers" description="Live customer directory from your accounting database." icon={Users}
        actions={<Button className="rounded-xl bg-gradient-primary text-primary-foreground shadow-[var(--shadow-glow)]" onClick={openNew}><Plus className="me-1.5 size-4" /> New contact</Button>} />

      <div className="glass rounded-2xl border-glass-border p-6">
        <DataToolbar value={q} onChange={setQ} placeholder="Search customers…" />

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-glass-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Country</th>
                <th className="py-2 pr-4 font-medium">Email</th>
                <th className="py-2 pr-4 font-medium">VAT ID</th>
                <th className="py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground"><Loader2 className="mx-auto size-4 animate-spin" /></td></tr>}
              {!isLoading && filtered.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No customers yet.</td></tr>}
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-glass-border/60 last:border-0 hover:bg-secondary/40">
                  <td className="py-3 pr-4 font-medium">{c.name}</td>
                  <td className="py-3 pr-4"><StatusPill tone="info">{c.country}</StatusPill></td>
                  <td className="py-3 pr-4 text-muted-foreground">{c.email ?? "—"}</td>
                  <td className="py-3 pr-4 font-mono text-xs">{c.vatId ?? "—"}</td>
                  <td className="py-3">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>Edit</Button>
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
            <div><Label>Country</Label><Input value={draft.country} onChange={(e) => setDraft({ ...draft, country: e.target.value })} className="mt-1.5 rounded-xl" /></div>
            <div><Label>Email</Label><Input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} className="mt-1.5 rounded-xl" /></div>
            <div><Label>VAT ID</Label><Input value={draft.vatId} onChange={(e) => setDraft({ ...draft, vatId: e.target.value })} className="mt-1.5 rounded-xl" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-gradient-primary text-primary-foreground" disabled={save.isPending} onClick={submit}>{save.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}