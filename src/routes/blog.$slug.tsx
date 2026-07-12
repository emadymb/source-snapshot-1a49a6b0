import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Clock, Calendar } from "lucide-react";

import { MarketingShell } from "@/components/marketing/MarketingShell";

const POSTS: Record<string, {
  title: string;
  excerpt: string;
  author: string;
  category: string;
  publishedAt: string;
  readingTimeMin: number;
  body: string[];
}> = {
  "ai-bookkeeping-2026": {
    title: "AI bookkeeping in 2026: from OCR to autonomous ledgers",
    excerpt: "How multi-modal models are moving from receipt capture to fully autonomous journal drafting.",
    author: "Fiksu Team",
    category: "AI",
    publishedAt: "2026-06-12",
    readingTimeMin: 7,
    body: [
      "The last two years have compressed a decade of automation into every accountant's inbox. What began as receipt OCR has evolved into agents that draft, categorise, and reconcile without human intervention.",
      "In this piece we cover the practical patterns we see across Fiksu customers: how they combine document capture, chart-of-accounts inference, and reviewer-in-the-loop approval to reach 90%+ straight-through processing.",
      "The next frontier is autonomous ledgers — systems that continuously reconcile against bank feeds, propose journal reversals, and surface anomalies as they happen.",
    ],
  },
  "vat-across-borders": {
    title: "VAT across borders: a practical guide for growing SMBs",
    excerpt: "A pragmatic look at cross-border VAT filing between the Nordics, GCC, and MENA regions.",
    author: "Amira K.",
    category: "Compliance",
    publishedAt: "2026-05-18",
    readingTimeMin: 5,
    body: [
      "Cross-border VAT is one of the fastest ways for a growing SMB to accumulate silent liability. Filing rules diverge sharply between the Nordics, GCC, and MENA regions.",
      "This guide walks through the three most common patterns we support: OSS filings inside the EU, ZATCA e-invoicing in Saudi Arabia, and reverse-charge handling for services rendered abroad.",
    ],
  },
  "closing-the-books-faster": {
    title: "Closing the books faster: our 5-day monthly close playbook",
    excerpt: "The exact workflow we recommend teams adopt to hit a 5-day close without burning out the finance team.",
    author: "Ilkka P.",
    category: "Playbook",
    publishedAt: "2026-04-02",
    readingTimeMin: 6,
    body: [
      "A five-day close is achievable for most SMBs when three things are in place: continuous reconciliation, AI-assisted classification, and a clear reviewer workflow.",
      "We break down each of those below along with the tooling and cadence to make it real.",
    ],
  },
};

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = POSTS[params.slug];
    if (!post) throw notFound();
    return { post, slug: params.slug };
  },
  head: ({ loaderData, params }) => {
    const p = loaderData?.post;
    if (!p) return { meta: [{ title: "Article — Fiksu" }, { name: "robots", content: "noindex" }] };
    return {
      meta: [
        { title: `${p.title} — Fiksu Blog` },
        { name: "description", content: p.excerpt },
        { property: "og:title", content: p.title },
        { property: "og:description", content: p.excerpt },
        { property: "og:type", content: "article" },
      ],
      links: [{ rel: "canonical", href: `/blog/${params.slug}` }],
    };
  },
  notFoundComponent: () => (
    <MarketingShell>
      <section className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
        <h1 className="font-display text-3xl font-semibold">Article not found</h1>
        <p className="mt-3 text-muted-foreground">This post may have moved or been retired.</p>
        <Link to="/blog" className="mt-6 inline-flex items-center gap-2 text-primary hover:underline">
          <ArrowLeft className="size-4" /> Back to blog
        </Link>
      </section>
    </MarketingShell>
  ),
  component: BlogPostPage,
});

function BlogPostPage() {
  const { post } = Route.useLoaderData();

  return (
    <MarketingShell>
      <article className="px-4 pb-20 pt-16 sm:px-6 lg:pt-24">
        <div className="mx-auto max-w-3xl">
          <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Blog
          </Link>

          <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="rounded-full bg-primary/15 px-2.5 py-0.5 font-medium text-primary">{post.category}</span>
            <span className="flex items-center gap-1"><Calendar className="size-3" /> {new Date(post.publishedAt).toLocaleDateString()}</span>
            <span className="flex items-center gap-1"><Clock className="size-3" /> {post.readingTimeMin} min read</span>
          </div>

          <h1 className="mt-4 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {post.title}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">by {post.author}</p>

          <div className="glass mt-8 rounded-3xl border-glass-border p-8 sm:p-10">
            {post.body.map((p: string, i: number) => (
              <p key={i} className="mt-4 text-base leading-relaxed text-foreground/90 first:mt-0">
                {p}
              </p>
            ))}
          </div>
        </div>
      </article>
    </MarketingShell>
  );
}
