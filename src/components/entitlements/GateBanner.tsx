import { Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useEntitlement } from "@/lib/entitlements/store";

/**
 * Full-page gate: use inside a route component when the entire screen depends on
 * a single feature. Shows an upsell if the workspace lacks the entitlement.
 */
export function PageGate({
  feature,
  title,
  description,
  children,
}: {
  feature: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const { on, def } = useEntitlement(feature);
  if (on) return <>{children}</>;
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 text-white shadow-lg">
        <Lock className="size-6" />
      </div>
      <h2 className="mt-5 font-display text-2xl font-semibold">{title}</h2>
      {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
      <p className="mt-1 text-xs text-muted-foreground">
        Feature id: <code className="rounded bg-muted px-1.5 py-0.5">{def?.id ?? feature}</code>
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Button asChild variant="outline" className="rounded-xl">
          <Link to="/client/billing">See plan</Link>
        </Button>
        <Button asChild className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
          <Link to="/pricing">Upgrade</Link>
        </Button>
      </div>
    </div>
  );
}
