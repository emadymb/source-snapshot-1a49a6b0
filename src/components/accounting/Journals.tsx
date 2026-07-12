import { useMemo, useState } from "react";
import { Plus, Trash2, Pencil, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { PageHeading } from "@/components/PagePlaceholder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataToolbar } from "./DataToolbar";
import { fmt } from "@/lib/format";
import {
  listAccounts, listJournalEntries, upsertJournalEntry, deleteJournalEntry,
  type JournalEntryDTO,
} from "@/lib/accounting.functions";

type Draft = { id?: string; date: string; memo: string; debitAccountId: string; creditAccountId: string; amount: number };
const empty = (): Draft => ({ date: new Date().toISOString().slice(0, 10), memo: "", debitAccountId: "", creditAccountId: "", amount: 0 });

export function JournalsScreen() {
  const qc = useQueryClient();
  const { data: journals = [], isLoading: jLoading } = useQuery({ queryKey: ["accounting", "journals"], queryFn: () => listJournalEntries(), staleTime: 30_000 });
  const { data: accounts = [] } = useQuery({ queryKey: ["accounting", "accounts"], queryFn: () => listAccounts(), staleTime: 30_000 });
  const invalidate = () => { qc.invalidateQueries({ queryKey: ["accounting", "journals"] }); qc.invalidateQueries({ queryKey: ["accounting", "reports"] }); };
  const save = useMutation({
    mutationFn: (d: Draft) => upsertJournalEntry({ data: { id: d.id, date: d.date, memo: d.memo || null, debitAccountId: d.debitAccountId, creditAccountId: d.creditAccountId, amount: d.amount } }),
    onSuccess: () => { invalidate(); toast.success("Journal saved"); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteJournalEntry({ data: { id } }),
    onSuccess: () => { invalidate(); toast("Removed"); },
  });

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(empty());

  const accountName = (id: string | null) => accounts.find((a) => a.id === id)?.name ?? "—";
  const accountCode = (id: string | null) => accounts.find((a) => a.id === id)?.code ?? "";

  const filtered = useMemo(() => journals.filter((j: JournalEntryDTO) => {
    if (!q) return true;
    const needle = q.toLowerCase();
    return (j.memo ?? "").toLowerCase().includes(needle) || j.id.toLowerCase().includes(needle);
  }), [journals, q]);

  const submit = () => {
    if (!draft.debitAccountId || !draft.creditAccountId) return toast.error("Select debit and credit accounts");
    if (draft.debitAccountId === draft.creditAccountId) return toast.error("Debit and credit accounts must differ");
    if (!draft.amount || draft.amount <= 0) return toast.error("Amount must be positive");
    save.mutate(draft);
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeading title="Journal Entries" description="Live double-entry postings from your ledger." icon={FileText}
        actions={<Button className="rounded-xl bg-gradient-primary text-primary-foreground shadow-[var(--shadow-glow)]" onClick={() => { setDraft(empty()); setOpen(true); }}><Plus className="me-1.5 size-4" /> New entry</Button>} />

      <div className="glass rounded-2xl border-glass-border p-6">
        <DataToolbar value={q} onChange={setQ} placeholder="Search by memo…" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-glass-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Memo</th>
                <th className="py-2 pr-4 font-medium">Debit</th>
                <th className="py-2 pr-4 font-medium">Credit</th>
                <th className="py-2 pr-4 text-right font-medium">Amount</th>
                <th className="py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {jLoading && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground"><Loader2 className="mx-auto size-4 animate-spin" /></td></tr>}
              {!jLoading && filtered.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No journal entries yet.</td></tr>}
              {filtered.map((j) => (
                <tr key={j.id} className="border-b border-glass-border/60 last:border-0 hover:bg-secondary/40">
                  <td className="py-3 pr-4 text-muted-foreground">{j.date}</td>
                  <td className="py-3 pr-4">{j.memo ?? "—"}</td>
                  <td className="py-3 pr-4 font-mono text-xs">{accountCode(j.debitAccountId)} · {accountName(j.debitAccountId)}</td>
                  <td className="py-3 pr-4 font-mono text-xs">{accountCode(j.creditAccountId)} · {accountName(j.creditAccountId)}</td>
                  <td className="py-3 pr-4 text-right font-medium">{fmt.format(j.amount)}</td>
                  <td className="py-3">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="size-8"
                        onClick={() => setDraft({ id: j.id, date: j.date, memo: j.memo ?? "", debitAccountId: j.debitAccountId ?? "", creditAccountId: j.creditAccountId ?? "", amount: j.amount }) || setOpen(true)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="size-8 text-destructive" onClick={() => del.mutate(j.id)}><Trash2 className="size-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{draft.id ? "Edit journal entry" : "New journal entry"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label>Date</Label><Input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="mt-1.5 rounded-xl" /></div>
            <div><Label>Amount (€)</Label><Input type="number" step="0.01" value={draft.amount || ""} onChange={(e) => setDraft({ ...draft, amount: +e.target.value })} className="mt-1.5 rounded-xl" /></div>
            <div>
              <Label>Debit account</Label>
              <Select value={draft.debitAccountId} onValueChange={(v) => setDraft({ ...draft, debitAccountId: v })}>
                <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} · {a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Credit account</Label>
              <Select value={draft.creditAccountId} onValueChange={(v) => setDraft({ ...draft, creditAccountId: v })}>
                <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} · {a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2"><Label>Memo</Label><Textarea value={draft.memo} onChange={(e) => setDraft({ ...draft, memo: e.target.value })} className="mt-1.5 rounded-xl" rows={2} /></div>
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