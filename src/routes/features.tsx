import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — Momken" },
      { name: "description", content: "Every module Momken ships — from OCR receipts to payroll and e-invoicing." },
      { property: "og:title", content: "Features — Momken" },
      { property: "og:description", content: "Every module Momken ships — from OCR receipts to payroll and e-invoicing." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Features</span>
        <h1 className="mt-4 font-display text-4xl font-semibold text-slate-900 sm:text-5xl">A complete finance operating system.</h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">From double-entry ledgers to POS to AI drafts, every workflow lives in one workspace.</p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <div className="glass rounded-2xl border-glass-border p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">Double-entry accounting</h3>
            <p className="mt-2 text-sm text-slate-600">Chart of accounts, journals, ledgers, vouchers, FIFO inventory. Audit trails on everything.</p>
          </div>
          <div className="glass rounded-2xl border-glass-border p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">e-Invoicing</h3>
            <p className="mt-2 text-sm text-slate-600">Finvoice, PEPPOL BIS, and ZATCA-compliant XML. Send from the invoice editor in one click.</p>
          </div>
          <div className="glass rounded-2xl border-glass-border p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">POS & loyalty</h3>
            <p className="mt-2 text-sm text-slate-600">Barcode + QR scanning, cash-box reconciliation, membership cards, tiered discounts.</p>
          </div>
          <div className="glass rounded-2xl border-glass-border p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">Payroll & HR</h3>
            <p className="mt-2 text-sm text-slate-600">Attendance, salaries, commissions, TyEL/YEL calculations, payslip PDFs.</p>
          </div>
          <div className="glass rounded-2xl border-glass-border p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">CRM & tickets</h3>
            <p className="mt-2 text-sm text-slate-600">Contacts, deals, kanban, SLA-based ticketing with internal notes and threading.</p>
          </div>
          <div className="glass rounded-2xl border-glass-border p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">AI assistant</h3>
            <p className="mt-2 text-sm text-slate-600">Chat that reads your ledger. OCR that reads receipts. Anomaly detection on cashflow.</p>
          </div>
          <div className="glass rounded-2xl border-glass-border p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">Bank feeds</h3>
            <p className="mt-2 text-sm text-slate-600">Nordea, OP, Danske, Handelsbanken. Reconcile in one click.</p>
          </div>
          <div className="glass rounded-2xl border-glass-border p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">CMS & marketplace</h3>
            <p className="mt-2 text-sm text-slate-600">Ship blog posts, marketing pages, and a public product catalog from the same admin.</p>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
