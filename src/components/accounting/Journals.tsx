import { useMemo, useState } from "react";
import { Plus, Trash2, Pencil, FileText, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";

import { PageHeading } from "@/components/PagePlaceholder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataToolbar, StatusPill } from "./DataToolbar";
import { store, useStore, fmt, type Journal, type JournalLine } from "@/lib/mock/store";

const uid = () => Math.random().toString(36).slice(2, 10);
const emptyLine = (): JournalLine => ({ id: uid(), accountId: "", debit: 0, credit: 0 });
const empty = (): Journal => ({ id: "", number: "", date: new Date().toISOString().slice(0, 10), memo: "", status: "draft", lines: [emptyLine(), emptyLine()] });

export function JournalsScreen() {
  const journals = useStore((s) => s.journals);
  const accounts = useStore((s) => s.accounts);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Journal>(empty());

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? "—";

  const filtered = useMemo(() => journals.filter((j) => {
    if (status !== "all" && j.status !== status) return false;
    if (!q) return true;
    return j.number.toLowerCase().includes(q.toLowerCase()) || j.memo.toLowerCase().includes(q.toLowerCase());
  }), [journals, q, status]);

  const totals = (j: Journal) => {
    const debit = j.lines.reduce((s, l) => s + l.debit, 0);
    const credit = j.lines.reduce((s, l) => s + l.credit, 0);
    return { debit, credit, balanced: Math.abs(debit - credit) < 0.005 };
  };

  const save = () => {
    const t = totals(draft);
    if (!t.balanced) return toast.error(`Not balanced — debit ${fmt.format(t.debit)} vs credit ${fmt.format(t.credit)}`);
    if (!draft.memo.trim()) return toast.error("Add a memo");
    store.upsertJournal(draft);
    toast.success(draft.id ? "Journal updated" : "Journal created");
    setOpen(false);
  };

  const post = (id: string) => { store.postJournal(id); toast.success("Journal posted"); };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeading title="Journal Entries" description="Manual double-entry postings." icon={FileText}
        actions={<Button className="rounded-xl bg-gradient-primary text-primary-foreground shadow-[var(--shadow-glow)]" onClick={() => { setDraft(empty()); setOpen(true); }}><Plus className="me-1.5 size-4" /> New entry</Button>} />

      <div className="glass rounded-2xl border-glass-border p-6">
        <DataToolbar value={q} onChange={setQ} placeholder="Search by number or memo…">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-10 w-[140px] rounded-xl border-glass-border bg-glass"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="posted">Posted</SelectItem>
            </SelectContent>
          </Select>
        </DataToolbar>
        <div className="space-y-3">
          {filtered.map((j) => {
            const t = totals(j);
            return (
              <div key={j.id} className="rounded-xl border border-glass-border bg-secondary/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">{j.number} · {j.date}</p>
                    <p className="mt-0.5 font-medium">{j.memo}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill tone={j.status === "posted" ? "success" : "muted"}>{j.status}</StatusPill>
                    {j.status === "draft" && <Button size="sm" variant="outline" className="rounded-lg" onClick={() => post(j.id)}><CheckCircle2 className="me-1 size-4" /> Post</Button>}
                    <Button size="icon" variant="ghost" className="size-8" onClick={() => { setDraft(j); setOpen(true); }}><Pencil className="size-4" /></Button>
                    <Button size="icon" variant="ghost" className="size-8 text-destructive" onClick={() => { store.deleteJournal(j.id); toast(`${j.number} removed`); }}><Trash2 className="size-4" /></Button>
                  </div>
                </div>
                <table className="mt-3 w-full text-sm">
                  <thead><tr className="text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-1 pr-4 text-left font-medium">Account</th>
                    <th className="py-1 pr-4 text-right font-medium">Debit</th>
                    <th className="py-1 text-right font-medium">Credit</th>
                  </tr></thead>
                  <tbody>
                    {j.lines.map((l) => (
                      <tr key={l.id} className="border-t border-glass-border/40">
                        <td className="py-1.5 pr-4">{accountName(l.accountId)}</td>
                        <td className="py-1.5 pr-4 text-right">{l.debit ? fmt.format(l.debit) : "—"}</td>
                        <td className="py-1.5 text-right">{l.credit ? fmt.format(l.credit) : "—"}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-glass-border font-medium">
                      <td className="py-1.5 pr-4 text-right text-xs uppercase text-muted-foreground">Totals</td>
                      <td className="py-1.5 pr-4 text-right">{fmt.format(t.debit)}</td>
                      <td className="py-1.5 text-right">{fmt.format(t.credit)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{draft.id ? `Edit ${draft.number}` : "New journal entry"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label>Date</Label><Input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="mt-1.5 rounded-xl" /></div>
            <div><Label>Status</Label>
              <Select value={draft.status} onValueChange={(v: Journal["status"]) => setDraft({ ...draft, status: v })}>
                <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="posted">Posted</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2"><Label>Memo</Label><Textarea value={draft.memo} onChange={(e) => setDraft({ ...draft, memo: e.target.value })} className="mt-1.5 rounded-xl" rows={2} /></div>
          </div>
          <div className="mt-2 space-y-2">
            <div className="flex items-center justify-between">
              <Label>Lines</Label>
              <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setDraft({ ...draft, lines: [...draft.lines, emptyLine()] })}><Plus className="me-1 size-3.5" /> Add line</Button>
            </div>
            {draft.lines.map((l, i) => (
              <div key={l.id} className="grid grid-cols-[1fr_100px_100px_32px] gap-2">
                <Select value={l.accountId} onValueChange={(v) => { const lines = [...draft.lines]; lines[i] = { ...l, accountId: v }; setDraft({ ...draft, lines }); }}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Account" /></SelectTrigger>
                  <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} · {a.name}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" placeholder="Debit" value={l.debit || ""} onChange={(e) => { const lines = [...draft.lines]; lines[i] = { ...l, debit: +e.target.value, credit: 0 }; setDraft({ ...draft, lines }); }} className="rounded-xl text-right" />
                <Input type="number" placeholder="Credit" value={l.credit || ""} onChange={(e) => { const lines = [...draft.lines]; lines[i] = { ...l, credit: +e.target.value, debit: 0 }; setDraft({ ...draft, lines }); }} className="rounded-xl text-right" />
                <Button size="icon" variant="ghost" className="size-8 self-center" onClick={() => setDraft({ ...draft, lines: draft.lines.filter((x) => x.id !== l.id) })}><X className="size-4" /></Button>
              </div>
            ))}
            <div className="flex justify-end gap-6 pt-2 text-sm font-medium">
              <span>Debit: {fmt.format(totals(draft).debit)}</span>
              <span>Credit: {fmt.format(totals(draft).credit)}</span>
            </div>
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