import { createFileRoute, Outlet } from "@tanstack/react-router";
import { I18nProvider } from "@/lib/i18n";
import { EntitlementsProvider } from "@/lib/entitlements/store";
import { SuperShell } from "@/components/super/SuperShell";
import { requireArea } from "@/lib/auth/guard";

export const Route = createFileRoute("/super")({
  beforeLoad: ({ location }) => requireArea("/super", location.href),
  head: () => ({
    meta: [
      { title: "Fiksu — Super Admin Console" },
      { name: "description", content: "Platform-wide control: plans, tenants, subscriptions, and gateways." },
    ],
  }),
  component: () => (
    <I18nProvider>
      <EntitlementsProvider>
        <SuperShell>
          <Outlet />
        </SuperShell>
      </EntitlementsProvider>
    </I18nProvider>
  ),
});
