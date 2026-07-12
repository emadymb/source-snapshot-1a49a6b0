import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services — Momken" },
      { name: "description", content: "Implementation, migration, and managed accounting services from the Momken team." },
      { property: "og:title", content: "Services — Momken" },
      { property: "og:description", content: "Implementation, migration, and managed accounting services from the Momken team." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Services</span>
        <h1 className="mt-4 font-display text-4xl font-semibold text-slate-900 sm:text-5xl">Beyond the software.</h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">From onboarding to full managed bookkeeping, our services team gets you live and keeps you compliant.</p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <div className="glass rounded-2xl border-glass-border p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">Onboarding & migration</h3>
            <p className="mt-2 text-sm text-slate-600">Full data import from Procountor, Netvisor, or spreadsheets. Live in 2 weeks.</p>
          </div>
          <div className="glass rounded-2xl border-glass-border p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">Managed bookkeeping</h3>
            <p className="mt-2 text-sm text-slate-600">Our in-house team handles monthly closes for SMEs without an in-house accountant.</p>
          </div>
          <div className="glass rounded-2xl border-glass-border p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">Firm implementation</h3>
            <p className="mt-2 text-sm text-slate-600">White-glove rollout for practices with 50+ clients, including staff training.</p>
          </div>
          <div className="glass rounded-2xl border-glass-border p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">Compliance advisory</h3>
            <p className="mt-2 text-sm text-slate-600">ZATCA, GDPR, and Finnish tax authority reporting handled end-to-end.</p>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
