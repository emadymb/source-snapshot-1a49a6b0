import { createFileRoute, notFound } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

const CARDS: Record<string, {
  card_number: string;
  template_name: string;
  template_type: string;
  customer_name: string;
  customer_tier: string;
  issued_at: string;
  expires_at?: string;
}> = {
  "FKS-1001": {
    card_number: "FKS-1001",
    template_name: "Fiksu Loyalty Gold",
    template_type: "Loyalty",
    customer_name: "Aino Virtanen",
    customer_tier: "Gold",
    issued_at: "2026-01-14",
    expires_at: "2027-01-14",
  },
  "FKS-1002": {
    card_number: "FKS-1002",
    template_name: "Fiksu Corporate",
    template_type: "Membership",
    customer_name: "Omar Al-Salam",
    customer_tier: "Platinum",
    issued_at: "2026-03-02",
  },
};

export const Route = createFileRoute("/c/$cardNumber")({
  loader: ({ params }) => {
    const card = CARDS[params.cardNumber];
    if (!card) throw notFound();
    return { card };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData?.card ? `${loaderData.card.template_name} · Membership` : "Membership card" },
      { name: "description", content: "Digital membership card" },
      { name: "robots", content: "noindex" },
    ],
  }),
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Card not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">This card has been revoked or never existed.</p>
      </div>
    </div>
  ),
  component: PublicCardView,
});

function PublicCardView() {
  const { card } = Route.useLoaderData();
  const bg = "linear-gradient(135deg,#0f172a,#1e40af)";
  const fg = "#fff";
  const accent = "#60a5fa";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 py-10">
      <div
        className="relative aspect-[1.586/1] w-full max-w-md overflow-hidden rounded-3xl p-6 shadow-2xl"
        style={{ background: bg, color: fg }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest opacity-70">{card.template_type}</p>
            <p className="text-xs opacity-80">{card.template_name}</p>
          </div>
          <Sparkles className="size-5" style={{ color: accent }} />
        </div>
        <div className="mt-10">
          <p className="text-[10px] uppercase opacity-60">Member</p>
          <p className="text-xl font-semibold">{card.customer_name}</p>
        </div>
        <div className="mt-6 flex items-end justify-between">
          <div>
            <p className="font-mono text-base tracking-wider">{card.card_number}</p>
            <p className="mt-1 text-[10px] uppercase opacity-70">Tier · {card.customer_tier}</p>
          </div>
          <div className="rounded bg-white p-2 text-[10px] font-mono text-slate-900">
            <div className="grid grid-cols-6 gap-0.5">
              {Array.from({ length: 36 }).map((_, i) => (
                <span
                  key={i}
                  className="size-1.5"
                  style={{ background: (i * 7 + card.card_number.length) % 3 === 0 ? "#0f172a" : "transparent" }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Issued {new Date(card.issued_at).toLocaleDateString()}
        {card.expires_at ? ` · expires ${new Date(card.expires_at).toLocaleDateString()}` : ""}
      </p>
    </div>
  );
}
