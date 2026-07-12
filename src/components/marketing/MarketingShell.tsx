import { Link } from "@tanstack/react-router";
import { Mail, MapPin, Phone, ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import logoAsset from "@/assets/fiksu_logo.png.asset.json";

const NAV = [
  { to: "/about", label: "About" },
  { to: "/services", label: "Services" },
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/integrations", label: "Integrations" },
  { to: "/blog", label: "Blog" },
  { to: "/contact", label: "Contact" },
] as const;

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={logoAsset.url} alt="Fiksu Tiliratkaisut Oy" className="h-9 w-auto object-contain" />
          <span className="font-display text-lg font-semibold tracking-tight text-slate-900">Fiksu</span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="text-slate-600 transition-colors hover:text-slate-900"
              activeProps={{ className: "text-slate-900" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link to="/login" search={{ redirect: undefined }}>Sign in</Link>
          </Button>
          <Button asChild size="sm" className="min-h-10 bg-blue-600 text-white hover:bg-blue-700">
            <Link to="/signup">
              Get started <ArrowRight className="ms-1 size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="flex items-center gap-2.5">
              <img src={logoAsset.url} alt="Fiksu Tiliratkaisut Oy" className="h-8 w-auto object-contain" />
              <span className="font-display text-lg font-semibold text-slate-900">Fiksu</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-slate-600">
              AI-powered accounting, e-invoicing, POS and payroll for Finnish SMEs and their accounting firms.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2"><Mail className="size-3.5 text-blue-600" /> hello@fiksu.fi</li>
              <li className="flex items-center gap-2"><Phone className="size-3.5 text-blue-600" /> +358 40 123 4567</li>
              <li className="flex items-center gap-2"><MapPin className="size-3.5 text-blue-600" /> Aleksanterinkatu 15, Helsinki</li>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-8">
            <FooterColumn title="Product" links={[
              { to: "/features", label: "Features" },
              { to: "/pricing", label: "Pricing" },
              { to: "/integrations", label: "Integrations" },
              { to: "/security", label: "Security" },
            ]} />
            <FooterColumn title="Company" links={[
              { to: "/about", label: "About" },
              { to: "/contact", label: "Contact" },
              { to: "/blog", label: "Blog" },
            ]} />
            <FooterColumn title="Resources" links={[
              { to: "/help", label: "Help Center" },
              { to: "/blog", label: "Blog" },
              { to: "/login", label: "Sign in" },
            ]} />
            <FooterColumn title="Legal" links={[
              { to: "/privacy", label: "Privacy" },
              { to: "/terms", label: "Terms" },
              { to: "/cookies", label: "Cookies" },
              { to: "/dpa", label: "DPA" },
            ]} />
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-slate-200 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Fiksu Tiliratkaisut Oy.</p>
          <p>All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map((l) => (
          <li key={`${l.to}-${l.label}`}>
            <Link to={l.to} className="text-slate-600 transition-colors hover:text-slate-900">{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#fafbfc] text-slate-900">
      <MarketingHeader />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}