import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, XCircle, Copy, ArrowRight } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const callbackSearchSchema = z.object({
  ref: z.string().min(1).max(64).default("FKS-DEMO-1204"),
  method: z.enum(["paytrail", "mobilepay"]).default("paytrail"),
  plan: z.enum(["basic", "pro", "premium"]).default("pro"),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/).default("49.00"),
  status: z.enum(["success", "failed", "cancelled"]).default("success"),
});

export const Route = createFileRoute("/client/billing/callback")({
  head: () => ({ meta: [{ title: "Payment confirmation — Fiksu" }, { name: "robots", content: "noindex" }] }),
  validateSearch: callbackSearchSchema,
  component: BillingCallback,
});

const PLAN_NAMES: Record<"basic" | "pro" | "premium", string> = {
  basic: "Basic",
  pro: "Pro",
  premium: "Premium",
};

function BillingCallback() {
  const search = Route.useSearch() as {
    ref: string; method: "paytrail" | "mobilepay";
    plan: "basic" | "pro" | "premium"; amount: string;
    status: "success" | "failed" | "cancelled";
  };
  const { ref, method, plan, amount, status } = search;
  const [copied, setCopied] = useState(false);

  const success = status === "success";
  const failed = status === "failed";

  const formatted = new Intl.NumberFormat("fi-FI", { style: "currency", currency: "EUR" }).format(Number(amount));

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(ref);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold">
          {success ? "Payment confirmed" : failed ? "Payment failed" : "Payment cancelled"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {success
            ? "Your subscription is now active."
            : "The transaction was not processed. You can try again below."}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="glass rounded-2xl border-glass-border p-6">
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div
              className={cn(
                "flex size-20 items-center justify-center rounded-3xl",
                success && "bg-emerald-500/15 text-emerald-500",
                failed && "bg-destructive/15 text-destructive",
                status === "cancelled" && "bg-muted text-muted-foreground",
              )}
            >
              {success ? <CheckCircle2 className="size-10" /> : <XCircle className="size-10" />}
            </div>
            <div>
              <p className="text-lg font-semibold">
                {success ? "Payment confirmed" : "Payment not processed"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {success
                  ? `Your ${PLAN_NAMES[plan]} plan is active immediately.`
                  : "Please try again or use another method."}
              </p>
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-sm">
              <Badge variant="outline" className="capitalize">
                {method === "paytrail" ? "Paytrail" : "MobilePay"}
              </Badge>
              <Badge variant="outline">{PLAN_NAMES[plan]}</Badge>
              <Badge variant="outline">{formatted}</Badge>
            </div>

            <div className="mt-4 flex flex-col items-center gap-1">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Transaction ref</span>
              <button
                type="button"
                onClick={copyRef}
                className="group flex items-center gap-2 rounded-lg border border-glass-border bg-card/40 px-3 py-2 font-mono text-sm"
              >
                <span>{ref}</span>
                <Copy
                  className={cn(
                    "size-4 transition",
                    copied ? "text-emerald-500" : "text-muted-foreground group-hover:text-foreground",
                  )}
                />
              </button>
              {copied && <span className="text-xs text-emerald-500">Copied</span>}
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {success ? (
                <Button asChild className="gap-2 bg-gradient-primary text-primary-foreground">
                  <Link to="/client">Go to dashboard <ArrowRight className="size-4" /></Link>
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <Link to="/client/billing">Try again</Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="glass h-fit rounded-2xl border-glass-border p-6">
          <h2 className="mb-3 font-display text-base font-semibold">Receipt</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Plan" value={PLAN_NAMES[plan]} />
            <Row label="Method" value={method === "paytrail" ? "Paytrail" : "MobilePay"} />
            <Row label="Amount" value={formatted} />
            <Row label="Reference" value={ref} mono />
            <Row label="Status" value={status} />
            <Row label="Date" value={new Date().toLocaleString()} />
          </dl>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("text-end font-medium", mono && "font-mono text-xs")}>{value}</dd>
    </div>
  );
}
