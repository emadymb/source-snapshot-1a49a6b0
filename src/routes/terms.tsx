import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Momken" },
      { name: "description", content: "Momken terms of service — plain language, EU-compliant." },
      { property: "og:title", content: "Terms of Service — Momken" },
      { property: "og:description", content: "Momken terms of service — plain language, EU-compliant." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Terms of Service</span>
        <h1 className="mt-4 font-display text-4xl font-semibold text-slate-900 sm:text-5xl">Terms of Service.</h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">Last updated: 8 July 2026.</p>
        <div className="prose prose-slate mt-10 max-w-none">
          <h2 className="mt-8 font-display text-xl font-semibold text-slate-900">1. Service</h2>
          <p className="mt-2 text-slate-600">Momken provides a cloud accounting workspace as described at momken.fi.</p>
          <h2 className="mt-8 font-display text-xl font-semibold text-slate-900">2. Fees</h2>
          <p className="mt-2 text-slate-600">Subscriptions are billed monthly or annually in advance. Cancel anytime; unused time is not refunded.</p>
          <h2 className="mt-8 font-display text-xl font-semibold text-slate-900">3. Data ownership</h2>
          <p className="mt-2 text-slate-600">Your financial data remains yours. You can export at any time in machine-readable format.</p>
          <h2 className="mt-8 font-display text-xl font-semibold text-slate-900">4. Liability</h2>
          <p className="mt-2 text-slate-600">Limited to fees paid in the preceding 12 months, save for gross negligence or wilful misconduct.</p>
        </div>
      </section>
    </MarketingShell>
  );
}
