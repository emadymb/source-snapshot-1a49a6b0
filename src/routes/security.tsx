import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Security — Momken" },
      { name: "description", content: "ISO 27001, GDPR, hosted in the EU. How we protect your financial data." },
      { property: "og:title", content: "Security — Momken" },
      { property: "og:description", content: "ISO 27001, GDPR, hosted in the EU. How we protect your financial data." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Security</span>
        <h1 className="mt-4 font-display text-4xl font-semibold text-slate-900 sm:text-5xl">Built for the auditors who trust us.</h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">ISO 27001 certified, GDPR compliant, hosted in the EU. Every action audit-logged.</p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <div className="glass rounded-2xl border-glass-border p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">EU-only hosting</h3>
            <p className="mt-2 text-sm text-slate-600">Data resides in Frankfurt and Helsinki. Never leaves the EU.</p>
          </div>
          <div className="glass rounded-2xl border-glass-border p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">Row-level isolation</h3>
            <p className="mt-2 text-sm text-slate-600">Every table scoped by workspace at the database level.</p>
          </div>
          <div className="glass rounded-2xl border-glass-border p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">Encrypted at rest & transit</h3>
            <p className="mt-2 text-sm text-slate-600">AES-256 at rest, TLS 1.3 in flight, hardware-backed key management.</p>
          </div>
          <div className="glass rounded-2xl border-glass-border p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">SSO & MFA</h3>
            <p className="mt-2 text-sm text-slate-600">SAML 2.0, WebAuthn, TOTP. Enforce MFA org-wide.</p>
          </div>
          <div className="glass rounded-2xl border-glass-border p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">Immutable audit log</h3>
            <p className="mt-2 text-sm text-slate-600">Every mutation logged with actor, IP, and timestamp.</p>
          </div>
          <div className="glass rounded-2xl border-glass-border p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900">Bug bounty & pentests</h3>
            <p className="mt-2 text-sm text-slate-600">Annual third-party pentests. Public bounty via Intigriti.</p>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
