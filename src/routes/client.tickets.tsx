import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare, Plus, Paperclip, Send } from "lucide-react";
import { Screen, KpiGrid, StatusBadge } from "@/components/screens/RichScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/client/tickets")({ component: Page });

const tickets = [
  { id: "T-1042", subject: "VAT return February — clarification on reverse charge", assignee: "Aino Virtanen", status: "open", updated: "12m ago", unread: 2 },
  { id: "T-1039", subject: "Payroll: onboard new employee starting April", assignee: "Mikael Nyström", status: "pending", updated: "2h ago", unread: 0 },
  { id: "T-1031", subject: "Bank reconciliation mismatch — Nordea Feb 27", assignee: "Aino Virtanen", status: "resolved", updated: "yesterday", unread: 0 },
  { id: "T-1024", subject: "Q1 close checklist", assignee: "Team", status: "open", updated: "2d ago", unread: 0 },
  { id: "T-1018", subject: "Change of address — invoice header", assignee: "Sara Koskinen", status: "closed", updated: "1w ago", unread: 0 },
];

const messages = [
  { from: "Aino Virtanen", role: "Accountant", text: "Hi Erik — I've reviewed the February entries. There are two invoices from a Swedish supplier that need reverse-charge treatment. Can you confirm both are B2B?", at: "10:24" },
  { from: "Erik Lindqvist", role: "You", text: "Yes both are B2B. VAT numbers are on the PDFs.", at: "10:31" },
  { from: "Aino Virtanen", role: "Accountant", text: "Perfect. I'll post them and file the return today. Draft attached for your signature.", at: "10:45" },
];

function Page() {
  const [text, setText] = useState("");
  return (
    <Screen title="Tickets" description="Conversations with your accounting team." icon={MessageSquare}
      actions={<Button className="rounded-xl bg-gradient-primary text-primary-foreground"><Plus className="me-2 size-4" />New ticket</Button>}>
      <KpiGrid kpis={[
        { label: "Open", value: "2", delta: "1 awaiting your reply", tone: "flat" },
        { label: "Pending", value: "1", delta: "with accountant", tone: "flat" },
        { label: "Resolved (30d)", value: "14", delta: "Avg 6.2h response", tone: "up" },
        { label: "Satisfaction", value: "4.9 / 5", delta: "Last 20 tickets", tone: "up" },
      ]} />

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <div className="glass rounded-2xl border-glass-border p-2">
          {tickets.map((t, i) => (
            <button key={t.id} className={`flex w-full flex-col gap-1 rounded-xl p-3 text-start hover:bg-secondary ${i === 0 ? "bg-secondary" : ""}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">{t.id}</span>
                <StatusBadge status={t.status} />
              </div>
              <p className="text-sm font-medium">{t.subject}</p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t.assignee}</span>
                <span>{t.updated}</span>
              </div>
              {t.unread > 0 && <span className="mt-1 inline-flex w-fit rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">{t.unread} unread</span>}
            </button>
          ))}
        </div>
        <div className="glass flex h-[600px] flex-col rounded-2xl border-glass-border">
          <div className="border-b border-glass-border p-4">
            <p className="text-xs font-semibold text-muted-foreground">T-1042 · Open</p>
            <p className="font-display text-lg font-semibold">VAT return February — clarification on reverse charge</p>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "You" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl p-4 text-sm ${m.role === "You" ? "bg-gradient-primary text-primary-foreground" : "bg-secondary"}`}>
                  <p className="mb-1 text-xs opacity-80">{m.from} · {m.at}</p>
                  <p>{m.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-glass-border p-3">
            <div className="flex gap-2">
              <Button variant="outline" size="icon" className="rounded-xl border-glass-border bg-glass"><Paperclip className="size-4" /></Button>
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a reply…" className="rounded-xl border-glass-border bg-glass" />
              <Button className="rounded-xl bg-gradient-primary text-primary-foreground"><Send className="size-4" /></Button>
            </div>
          </div>
        </div>
      </div>
    </Screen>
  );
}