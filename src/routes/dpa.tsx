import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const Route = createFileRoute("/dpa")({
  head: () => ({
    meta: [
      { title: "Data Processing Addendum — Momken" },
      { name: "description", content: "Momken data processing addendum — plain language, EU-compliant." },
      { property: "og:title", content: "Data Processing Addendum — Momken" },
      { property: "og:description", content: "Momken data processing addendum — plain language, EU-compliant." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Data Processing Addendum</span>
        <h1 className="mt-4 font-display text-4xl font-semibold text-slate-900 sm:text-5xl">Data Processing Addendum.</h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">Last updated: 8 July 2026.</p>
        <div className="prose prose-slate mt-10 max-w-none">
          <h2 className="mt-8 font-display text-xl font-semibold text-slate-900">Roles</h2>
          <p className="mt-2 text-slate-600">You are the data controller; Momken is the processor.</p>
          <h2 className="mt-8 font-display text-xl font-semibold text-slate-900">Sub-processors</h2>
          <p className="mt-2 text-slate-600">Full list at momken.fi/sub-processors. 30 days notice.</p>
          <h2 className="mt-8 font-display text-xl font-semibold text-slate-900">Subprocessing safeguards</h2>
          <p className="mt-2 text-slate-600">SCCs where applicable. EU-only hosting by default.</p>
        </div>
      </section>
    </MarketingShell>
  );
}
