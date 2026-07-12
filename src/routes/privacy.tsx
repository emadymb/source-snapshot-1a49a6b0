import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Momken" },
      { name: "description", content: "Momken privacy policy — plain language, EU-compliant." },
      { property: "og:title", content: "Privacy Policy — Momken" },
      { property: "og:description", content: "Momken privacy policy — plain language, EU-compliant." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Privacy Policy</span>
        <h1 className="mt-4 font-display text-4xl font-semibold text-slate-900 sm:text-5xl">Privacy Policy.</h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">Last updated: 8 July 2026.</p>
        <div className="prose prose-slate mt-10 max-w-none">
          <h2 className="mt-8 font-display text-xl font-semibold text-slate-900">1. Who we are</h2>
          <p className="mt-2 text-slate-600">Momken Oy (business ID 3123456-7) is the data controller for information collected through momken.fi and the Momken application.</p>
          <h2 className="mt-8 font-display text-xl font-semibold text-slate-900">2. What we collect</h2>
          <p className="mt-2 text-slate-600">Account details, usage telemetry, and the financial data you upload for accounting purposes.</p>
          <h2 className="mt-8 font-display text-xl font-semibold text-slate-900">3. How we use it</h2>
          <p className="mt-2 text-slate-600">To deliver the service, to comply with tax and audit obligations, and — with your consent — to improve our AI models.</p>
          <h2 className="mt-8 font-display text-xl font-semibold text-slate-900">4. Your rights</h2>
          <p className="mt-2 text-slate-600">Access, rectification, erasure, portability, and objection. Contact privacy@momken.fi.</p>
        </div>
      </section>
    </MarketingShell>
  );
}
