import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const Route = createFileRoute("/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations — Momken" },
      { name: "description", content: "Native integrations with Procountor, Nordea, OP, Stripe, PayPal, and more." },
      { property: "og:title", content: "Integrations — Momken" },
      { property: "og:description", content: "Native integrations with Procountor, Nordea, OP, Stripe, PayPal, and more." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Integrations</span>
        <h1 className="mt-4 font-display text-4xl font-semibold text-slate-900 sm:text-5xl">Wire in what you already run.</h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">Momken speaks natively to the banks, PSPs, and government portals Finnish businesses depend on.</p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <div className="glass rounded-2xl border-glass-border p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">Banks</h3>
            <p className="mt-2 text-sm text-slate-600">Nordea, OP, Danske, Handelsbanken via PSD2. Auto-reconcile.</p>
          </div>
          <div className="glass rounded-2xl border-glass-border p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">Payment providers</h3>
            <p className="mt-2 text-sm text-slate-600">Stripe, PayPal, Klarna, Paytrail with unified reporting.</p>
          </div>
          <div className="glass rounded-2xl border-glass-border p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">E-invoicing networks</h3>
            <p className="mt-2 text-sm text-slate-600">Finvoice, PEPPOL BIS 3.0, ZATCA phase 2.</p>
          </div>
          <div className="glass rounded-2xl border-glass-border p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">Government</h3>
            <p className="mt-2 text-sm text-slate-600">Tax administration reporting, incomes register (tulorekisteri).</p>
          </div>
          <div className="glass rounded-2xl border-glass-border p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">Payroll</h3>
            <p className="mt-2 text-sm text-slate-600">TyEL & YEL insurers, tulorekisteri direct submissions.</p>
          </div>
          <div className="glass rounded-2xl border-glass-border p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">APIs</h3>
            <p className="mt-2 text-sm text-slate-600">REST + webhooks for anything else. Zapier, Make, and native SDKs.</p>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
