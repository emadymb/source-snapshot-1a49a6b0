import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog — Momken" },
      { name: "description", content: "Product updates, Finnish accounting insights, and best-practice guides." },
      { property: "og:title", content: "Blog — Momken" },
      { property: "og:description", content: "Product updates, Finnish accounting insights, and best-practice guides." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Blog</span>
        <h1 className="mt-4 font-display text-4xl font-semibold text-slate-900 sm:text-5xl">From the Momken team.</h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">Product updates, deep-dives on Finnish e-invoicing, and playbooks for scaling an accounting firm.</p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <div className="glass rounded-2xl border-glass-border p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">Migrating from Procountor in one afternoon</h3>
            <p className="mt-2 text-sm text-slate-600">Our step-by-step guide walks you through moving your chart of accounts, contacts, and open invoices.</p>
          </div>
          <div className="glass rounded-2xl border-glass-border p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">ZATCA phase 2 checklist for Saudi subsidiaries</h3>
            <p className="mt-2 text-sm text-slate-600">Everything Finnish firms with Gulf exposure need to hand to their integrator.</p>
          </div>
          <div className="glass rounded-2xl border-glass-border p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">How Lindqvist Oy closes books by day 3</h3>
            <p className="mt-2 text-sm text-slate-600">A 10x growth story: from 60-hour month-ends to Wednesday coffee.</p>
          </div>
          <div className="glass rounded-2xl border-glass-border p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">Introducing the AI drafts panel</h3>
            <p className="mt-2 text-sm text-slate-600">Automated journal proposals your team can approve, edit, or reject in one click.</p>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
