import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help Center — Momken" },
      { name: "description", content: "Guides, tutorials, and troubleshooting for Momken and Fiksu users." },
      { property: "og:title", content: "Help Center — Momken" },
      { property: "og:description", content: "Guides, tutorials, and troubleshooting for Momken and Fiksu users." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Help Center</span>
        <h1 className="mt-4 font-display text-4xl font-semibold text-slate-900 sm:text-5xl">We are here.</h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">Guides for every workflow, a searchable knowledge base, and live chat with a real human during Helsinki business hours.</p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <div className="glass rounded-2xl border-glass-border p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">Getting started</h3>
            <p className="mt-2 text-sm text-slate-600">A 15-minute walkthrough from signup to your first invoice.</p>
          </div>
          <div className="glass rounded-2xl border-glass-border p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">Migrating your data</h3>
            <p className="mt-2 text-sm text-slate-600">Import chart of accounts, open items, and historical journals.</p>
          </div>
          <div className="glass rounded-2xl border-glass-border p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">Connecting your bank</h3>
            <p className="mt-2 text-sm text-slate-600">PSD2 consent, sandbox testing, and troubleshooting.</p>
          </div>
          <div className="glass rounded-2xl border-glass-border p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">e-Invoicing setup</h3>
            <p className="mt-2 text-sm text-slate-600">Finvoice operator selection and PEPPOL certification.</p>
          </div>
          <div className="glass rounded-2xl border-glass-border p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">User & permission management</h3>
            <p className="mt-2 text-sm text-slate-600">Roles, workspace access, and MFA enforcement.</p>
          </div>
          <div className="glass rounded-2xl border-glass-border p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">Contact support</h3>
            <p className="mt-2 text-sm text-slate-600">Chat, email, or phone — 08–18 EET, Mon–Fri.</p>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
