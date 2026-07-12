import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, Sparkles, ScanLine, ReceiptText, Landmark, Bot, ShieldCheck,
  BookOpen, CreditCard, Globe, LineChart, Check,
} from "lucide-react";

import { MarketingShell } from "@/components/marketing/MarketingShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <MarketingShell>
      <Hero />
      <TrustBar />
      <Features />
      <PortalPreview />
      <Integrations />
      <PricingTeaser />
      <CTA />
    </MarketingShell>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(1200px 500px at 15% -10%, rgba(64,105,255,0.18), transparent 60%), radial-gradient(900px 500px at 100% 0%, rgba(34,197,220,0.16), transparent 55%)",
        }}
      />
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-20 sm:px-6 sm:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
            <Sparkles className="size-3.5 text-blue-600" /> AI-native accounting for Finnish SMEs
          </span>
          <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.1] tracking-tight text-slate-900 sm:text-6xl">
            Your books, closed by <span className="text-gradient">Wednesday</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            Momken scans every receipt, drafts every journal, and hands your accountant a Procountor-ready
            month-end — without leaving one bilingual workspace.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="min-h-11 rounded-xl bg-blue-600 px-5 text-white hover:bg-blue-700">
              <Link to="/signup">Start 30-day trial <ArrowRight className="ms-1.5 size-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="min-h-11 rounded-xl border-slate-300 bg-white">
              <Link to="/pricing">See pricing</Link>
            </Button>
          </div>
          <p className="mt-3 text-xs text-slate-500">No credit card. GDPR & ZATCA-ready. Cancel anytime.</p>
        </div>

        <div className="mx-auto mt-16 max-w-5xl">
          <div className="glass rounded-3xl border-glass-border p-2 shadow-[var(--shadow-glow)]">
            <div className="rounded-2xl bg-white/70 p-6">
              <MockDashboardPreview />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MockDashboardPreview() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[
        { k: "Revenue this month", v: "€48,210", d: "+12.4% vs Feb", i: LineChart },
        { k: "Receipts processed", v: "1,284", d: "94% auto-categorised", i: ScanLine },
        { k: "Cash on hand", v: "€212,940", d: "3 accounts synced", i: Landmark },
      ].map((c) => {
        const Icon = c.i;
        return (
          <div key={c.k} className="rounded-2xl border border-slate-200 bg-white p-5 text-start">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{c.k}</p>
              <Icon className="size-4 text-blue-600" />
            </div>
            <p className="mt-2 font-display text-3xl font-semibold text-slate-900">{c.v}</p>
            <p className="mt-1 text-xs text-slate-500">{c.d}</p>
          </div>
        );
      })}
      <div className="md:col-span-3 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold text-slate-900">Recent activity</h3>
          <span className="text-xs text-slate-500">Live</span>
        </div>
        <ul className="mt-3 divide-y divide-slate-100 text-sm">
          {[
            ["Receipt scanned", "K-Supermarket · €48.20", "Groceries · 24% VAT"],
            ["e-Invoice sent", "Lindqvist Oy · €1,240.00", "Paid in 2 days"],
            ["Payroll drafted", "March 2026 · 12 employees", "Awaiting approval"],
          ].map(([a, b, c]) => (
            <li key={a} className="flex items-center justify-between py-2.5">
              <div>
                <p className="font-medium text-slate-900">{a}</p>
                <p className="text-xs text-slate-500">{b}</p>
              </div>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">{c}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TrustBar() {
  return (
    <section className="border-y border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-4 py-8 text-sm font-medium text-slate-500 sm:px-6">
        <span>Trusted by 340+ Finnish firms</span>
        <span className="hidden sm:inline">·</span>
        <span>Procountor certified</span>
        <span className="hidden sm:inline">·</span>
        <span>ZATCA e-invoicing</span>
        <span className="hidden sm:inline">·</span>
        <span>ISO 27001</span>
        <span className="hidden sm:inline">·</span>
        <span>GDPR compliant</span>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    { i: ScanLine, t: "OCR receipt scanning", d: "Snap or forward — Momken reads vendor, VAT, and line items in seconds." },
    { i: ReceiptText, t: "e-Invoicing", d: "Send Finvoice, PEPPOL, and ZATCA-compliant invoices from one editor." },
    { i: BookOpen, t: "Double-entry accounting", d: "Chart of accounts, journals, ledgers, FIFO inventory — audit-ready." },
    { i: Bot, t: "AI drafts & insights", d: "Auto-journal entries, cash forecasts, and anomaly alerts." },
    { i: CreditCard, t: "POS + loyalty", d: "Barcode + QR checkout, cash boxes, membership cards." },
    { i: Landmark, t: "Bank feeds", d: "Nordea, OP, Danske, Handelsbanken — reconciled automatically." },
    { i: Globe, t: "Bilingual & RTL", d: "Six languages including full RTL for Arabic." },
    { i: ShieldCheck, t: "GDPR + audit log", d: "Consents, data-subject requests, and immutable trails built-in." },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="max-w-2xl">
        <h2 className="font-display text-3xl font-semibold text-slate-900 sm:text-4xl">
          Everything a Finnish practice runs on. One workspace.
        </h2>
        <p className="mt-3 text-slate-600">
          Firms use Fiksu internally. SMEs get Momken — the same engine, white-labelled. One codebase,
          strict workspace isolation, zero context switching.
        </p>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ i: Icon, t, d }) => (
          <div key={t} className="glass rounded-2xl border-glass-border p-5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
              <Icon className="size-5" />
            </div>
            <h3 className="mt-4 font-display text-base font-semibold text-slate-900">{t}</h3>
            <p className="mt-1.5 text-sm text-slate-600">{d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PortalPreview() {
  return (
    <section className="bg-white border-y border-slate-200">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Two portals · one platform</span>
          <h2 className="mt-4 font-display text-3xl font-semibold text-slate-900 sm:text-4xl">Fiksu for firms. Momken for their clients.</h2>
          <p className="mt-3 text-slate-600">
            The accountant runs Fiksu — omniscient across every client. The SME logs into Momken and sees only
            what they should. One database, iron-clad row-level isolation.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              "Client onboarding wizard with e-signature",
              "Firm-side kanban for tasks and reviews",
              "Client-side AI chat that quotes their own ledger",
              "Ticketing with SLA and internal notes",
            ].map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm text-slate-700">
                <span className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                  <Check className="size-3" />
                </span>
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex gap-3">
            <Button asChild className="rounded-xl bg-blue-600 text-white hover:bg-blue-700">
              <Link to="/firm">Explore firm console</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl border-slate-300">
              <Link to="/client">Explore client portal</Link>
            </Button>
          </div>
        </div>
        <div className="glass rounded-3xl border-glass-border p-2">
          <div className="rounded-2xl bg-white/70 p-6">
            <MockDashboardPreview />
          </div>
        </div>
      </div>
    </section>
  );
}

function Integrations() {
  const logos = ["Procountor", "Nordea", "OP", "Danske", "Stripe", "PayPal", "Finvoice", "PEPPOL", "ZATCA", "Google", "Slack", "Zapier"];
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="text-center">
        <h2 className="font-display text-3xl font-semibold text-slate-900 sm:text-4xl">Plays nicely with your stack</h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-600">
          Direct integrations with the tools Finnish businesses already run on.
        </p>
      </div>
      <div className="mt-10 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {logos.map((l) => (
          <div key={l} className="glass flex h-16 items-center justify-center rounded-xl border-glass-border text-sm font-semibold text-slate-700">
            {l}
          </div>
        ))}
      </div>
    </section>
  );
}

function PricingTeaser() {
  const plans = [
    { name: "Starter", price: "€29", desc: "Solo entrepreneurs", feats: ["Up to 50 receipts/mo", "1 user", "Basic e-invoicing"] },
    { name: "Growth", price: "€89", desc: "Small businesses", feats: ["Unlimited receipts", "5 users", "POS + loyalty", "AI drafts"], featured: true },
    { name: "Firm", price: "Custom", desc: "Accounting practices", feats: ["Unlimited clients", "Firm console", "SSO + audit log", "Priority support"] },
  ];
  return (
    <section className="bg-white border-y border-slate-200">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="text-center">
          <h2 className="font-display text-3xl font-semibold text-slate-900 sm:text-4xl">Simple, transparent pricing</h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-600">All plans include GDPR compliance, EN/AR/FI/SV/DE/TR, and 30-day free trial.</p>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`rounded-2xl border p-6 ${p.featured ? "border-blue-600 bg-blue-50/40 shadow-lg" : "border-slate-200 bg-white"}`}
            >
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-xl font-semibold text-slate-900">{p.name}</h3>
                {p.featured && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">Popular</span>}
              </div>
              <p className="mt-1 text-sm text-slate-500">{p.desc}</p>
              <p className="mt-4 font-display text-4xl font-semibold text-slate-900">{p.price}<span className="text-base font-normal text-slate-500">/mo</span></p>
              <ul className="mt-5 space-y-2 text-sm text-slate-700">
                {p.feats.map((f) => (
                  <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 size-4 text-blue-600" />{f}</li>
                ))}
              </ul>
              <Button asChild className={`mt-6 w-full rounded-xl ${p.featured ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-slate-900 text-white hover:bg-slate-800"}`}>
                <Link to="/signup">Start trial</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
      <div className="glass overflow-hidden rounded-3xl border-glass-border p-10 text-center shadow-[var(--shadow-glow)]">
        <h2 className="font-display text-3xl font-semibold text-slate-900 sm:text-4xl">
          Close your books this month — without the last-week scramble.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-600">
          Import your last three months, connect your bank, invite your accountant. Live in an afternoon.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="rounded-xl bg-blue-600 text-white hover:bg-blue-700">
            <Link to="/signup">Start free trial</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-xl border-slate-300">
            <Link to="/contact">Book a demo</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
