import { useMemo, useState, useEffect } from "react";
import { Layers, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { PageHeading } from "@/components/PagePlaceholder";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusPill } from "./DataToolbar";
import { fmt } from "@/lib/mock/store";
import { listAccounts, listJournalEntries } from "@/lib/accounting.functions";

export function LedgerScreen() {
  const { data: accounts = [], isLoading: accLoading } = useQuery({
    queryKey: ["accounting", "accounts"],
    queryFn: () => listAccounts(),
    staleTime: 30_000,
  });
  const { data: journals = [], isLoading: jrnLoading } = useQuery({
    queryKey: ["accounting", "journals"],
    queryFn: () => listJournalEntries(),
    staleTime: 30_000,
  });

  const [accountId, setAccountId] = useState("");
  useEffect(() => {
    if (!accountId && accounts.length > 0) setAccountId(accounts[0].id);
  }, [accounts, accountId]);

  const account = accounts.find((a) => a.id === accountId);
  const positiveOnDebit = account?.type === "asset" || account?.type === "expense";

  const entries = useMemo(() => {
    const rows: { date: string; ref: string; memo: string; debit: number; credit: number; balance: number }[] = [];
    let balance = 0;
    const sorted = journals
      .filter((j) => j.debitAccountId === accountId || j.creditAccountId === accountId)
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date));
    for (const j of sorted) {
      const isDebit = j.debitAccountId === accountId;
      const debit = isDebit ? j.amount : 0;
      const credit = !isDebit ? j.amount : 0;
      balance += positiveOnDebit ? debit - credit : credit - debit;
      rows.push({ date: j.date, ref: j.id.slice(0, 8), memo: j.memo ?? "", debit, credit, balance });
    }
    return rows;
  }, [journals, accountId, positiveOnDebit]);

  const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
  const currentBalance = entries.length > 0 ? entries[entries.length - 1].balance : 0;
  const loading = accLoading || jrnLoading;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeading title="General Ledger" description="Posted movements per account." icon={Layers} />

      <div className="glass mb-4 rounded-2xl border-glass-border p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger className="h-11 w-[320px] rounded-xl border-glass-border bg-glass"><SelectValue placeholder="Select account" /></SelectTrigger>
            <SelectContent>{accounts.slice().sort((a, b) => a.code.localeCompare(b.code)).map((a) => <SelectItem key={a.id} value={a.id}>{a.code} · {a.name}</SelectItem>)}</SelectContent>
          </Select>
          {account && <StatusPill tone="muted">{account.type}</StatusPill>}
          <div className="ms-auto text-right">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Current balance</p>
            <p className="font-display text-xl font-semibold">{fmt.format(currentBalance)}</p>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl border-glass-border p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-glass-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Ref</th>
                <th className="py-2 pr-4 font-medium">Memo</th>
                <th className="py-2 pr-4 text-right font-medium">Debit</th>
                <th className="py-2 pr-4 text-right font-medium">Credit</th>
                <th className="py-2 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground"><Loader2 className="mx-auto size-4 animate-spin" /></td></tr>}
              {!loading && entries.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No posted movements for this account yet.</td></tr>}
              {entries.map((r, i) => (
                <tr key={i} className="border-b border-glass-border/60 last:border-0 hover:bg-secondary/40">
                  <td className="py-3 pr-4 text-muted-foreground">{r.date}</td>
                  <td className="py-3 pr-4 font-mono text-xs">{r.ref}</td>
                  <td className="py-3 pr-4">{r.memo}</td>
                  <td className="py-3 pr-4 text-right">{r.debit ? fmt.format(r.debit) : "—"}</td>
                  <td className="py-3 pr-4 text-right">{r.credit ? fmt.format(r.credit) : "—"}</td>
                  <td className="py-3 text-right font-medium">{fmt.format(r.balance)}</td>
                </tr>
              ))}
              {entries.length > 0 && (
                <tr className="border-t border-glass-border font-medium">
                  <td colSpan={3} className="py-3 pr-4 text-right text-xs uppercase text-muted-foreground">Totals</td>
                  <td className="py-3 pr-4 text-right">{fmt.format(totalDebit)}</td>
                  <td className="py-3 pr-4 text-right">{fmt.format(totalCredit)}</td>
                  <td className="py-3 text-right">{fmt.format(totalDebit - totalCredit)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
