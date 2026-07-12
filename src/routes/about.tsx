import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Momken" },
      { name: "description", content: "Momken is the AI-native accounting workspace built for Finnish accounting firms and their SME clients." },
      { property: "og:title", content: "About — Momken" },
      { property: "og:description", content: "Momken is the AI-native accounting workspace built for Finnish accounting firms and their SME clients." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">About Momken</span>
        <h1 className="mt-4 font-display text-4xl font-semibold text-slate-900 sm:text-5xl">Two products, one platform, one mission.</h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">Fiksu is what accounting firms run internally. Momken is the same product white-labelled for their SME clients. Both share one codebase and one database with strict workspace isolation.</p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <div className="glass rounded-2xl border-glass-border p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">Founded in Helsinki, 2024</h3>
            <p className="mt-2 text-sm text-slate-600">By a team of ex-Procountor engineers and a chartered accountant who was tired of duct-taped bookkeeping stacks.</p>
          </div>
          <div className="glass rounded-2xl border-glass-border p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">Serving 340+ firms</h3>
            <p className="mt-2 text-sm text-slate-600">From solo bookkeepers to Nordic mid-tier practices with 400+ clients under one roof.</p>
          </div>
          <div className="glass rounded-2xl border-glass-border p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">Full RTL & 6 languages</h3>
            <p className="mt-2 text-sm text-slate-600">English, Arabic, Finnish, Swedish, German, Turkish — because our customers serve customers everywhere.</p>
          </div>
          <div className="glass rounded-2xl border-glass-border p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">ISO 27001 & GDPR</h3>
            <p className="mt-2 text-sm text-slate-600">European hosting, audit-ready trails, and data-subject request tooling built in from day one.</p>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
