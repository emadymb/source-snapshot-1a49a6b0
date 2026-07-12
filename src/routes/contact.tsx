import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin, Phone } from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Momken" },
      { name: "description", content: "Talk to sales, request a demo, or reach our Helsinki support team." },
      { property: "og:title", content: "Contact — Momken" },
      { property: "og:description", content: "Talk to sales, request a demo, or reach our Helsinki support team." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <MarketingShell>
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Contact</span>
          <h1 className="mt-4 font-display text-4xl font-semibold text-slate-900 sm:text-5xl">Let's talk.</h1>
          <p className="mt-4 text-slate-600">Book a 20-minute demo, ask about migration from Procountor, or just say hello.</p>
          <ul className="mt-8 space-y-3 text-sm text-slate-700">
            <li className="flex items-center gap-3"><Mail className="size-4 text-blue-600" /> hello@momken.fi</li>
            <li className="flex items-center gap-3"><Phone className="size-4 text-blue-600" /> +358 40 123 4567</li>
            <li className="flex items-center gap-3"><MapPin className="size-4 text-blue-600" /> Aleksanterinkatu 15, 00100 Helsinki</li>
          </ul>
        </div>
        <form className="glass rounded-2xl border-glass-border p-6" onSubmit={(e) => e.preventDefault()}>
          <div className="space-y-4">
            <div><Label htmlFor="n">Name</Label><Input id="n" placeholder="Aino Virtanen" className="mt-1.5" /></div>
            <div><Label htmlFor="e">Work email</Label><Input id="e" type="email" placeholder="aino@company.fi" className="mt-1.5" /></div>
            <div><Label htmlFor="c">Company</Label><Input id="c" placeholder="Company Oy" className="mt-1.5" /></div>
            <div><Label htmlFor="m">Message</Label><Textarea id="m" rows={5} placeholder="Tell us what you're looking for…" className="mt-1.5" /></div>
            <Button className="w-full rounded-xl bg-blue-600 text-white hover:bg-blue-700">Send message</Button>
          </div>
        </form>
      </section>
    </MarketingShell>
  );
}
