import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Policy — Momken" },
      { name: "description", content: "Momken cookie policy — plain language, EU-compliant." },
      { property: "og:title", content: "Cookie Policy — Momken" },
      { property: "og:description", content: "Momken cookie policy — plain language, EU-compliant." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Cookie Policy</span>
        <h1 className="mt-4 font-display text-4xl font-semibold text-slate-900 sm:text-5xl">Cookie Policy.</h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">Last updated: 8 July 2026.</p>
        <div className="prose prose-slate mt-10 max-w-none">
          <h2 className="mt-8 font-display text-xl font-semibold text-slate-900">Essential cookies</h2>
          <p className="mt-2 text-slate-600">Session, CSRF, and workspace context. Cannot be disabled.</p>
          <h2 className="mt-8 font-display text-xl font-semibold text-slate-900">Analytics</h2>
          <p className="mt-2 text-slate-600">Aggregate usage via a self-hosted Plausible. No cross-site tracking.</p>
          <h2 className="mt-8 font-display text-xl font-semibold text-slate-900">Preferences</h2>
          <p className="mt-2 text-slate-600">Language and theme. Local to your browser.</p>
        </div>
      </section>
    </MarketingShell>
  );
}
