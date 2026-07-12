import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Momken" },
      { name: "description", content: "Simple, transparent pricing for solo entrepreneurs, growing businesses, and accounting firms." },
      { property: "og:title", content: "Pricing — Momken" },
      { property: "og:description", content: "Simple, transparent pricing for solo entrepreneurs, growing businesses, and accounting firms." },
    ],
  }),
  component: Page,
});

const plans = [
  { name: "Starter", price: "€29", desc: "Solo entrepreneurs and freelancers.", feats: ["Up to 50 receipts/month","1 user","Basic e-invoicing","Email support"] },
  { name: "Growth", price: "€89", desc: "Growing SMEs with a small team.", featured: true, feats: ["Unlimited receipts","5 users","POS + loyalty","AI drafts","Bank feed sync","Priority chat support"] },
  { name: "Firm", price: "Custom", desc: "Accounting practices of any size.", feats: ["Unlimited clients","Firm-side omniscient view","SSO + audit log","Dedicated CSM","White-label option"] },
];

function Page() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Pricing</span>
          <h1 className="mt-4 font-display text-4xl font-semibold text-slate-900 sm:text-5xl">Priced for the business you are, not the business you'll be.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600">30-day free trial on every plan. No credit card. Change or cancel anytime.</p>
        </div>
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {plans.map((p) => (
            <div key={p.name} className={`rounded-2xl border p-6 ${p.featured ? "border-blue-600 bg-blue-50/40 shadow-lg" : "border-slate-200 bg-white"}`}>
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-xl font-semibold text-slate-900">{p.name}</h3>
                {p.featured && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">Popular</span>}
              </div>
              <p className="mt-1 text-sm text-slate-500">{p.desc}</p>
              <p className="mt-5 font-display text-4xl font-semibold text-slate-900">{p.price}<span className="text-base font-normal text-slate-500">/mo</span></p>
              <ul className="mt-5 space-y-2 text-sm text-slate-700">
                {p.feats.map((f) => (<li key={f} className="flex items-start gap-2"><Check className="mt-0.5 size-4 text-blue-600" />{f}</li>))}
              </ul>
              <Button asChild className={`mt-6 w-full rounded-xl ${p.featured ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-slate-900 text-white hover:bg-slate-800"}`}>
                <Link to="/signup">Start trial</Link>
              </Button>
            </div>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
