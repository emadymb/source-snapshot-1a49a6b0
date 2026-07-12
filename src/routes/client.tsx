import { createFileRoute, Outlet } from "@tanstack/react-router";
import { I18nProvider } from "@/lib/i18n";
import { EntitlementsProvider } from "@/lib/entitlements/store";
import { ClientRoleProvider } from "@/lib/client-role";
import { ClientMobileShell } from "@/components/client/ClientMobileShell";
import { requireArea } from "@/lib/auth/guard";

export const Route = createFileRoute("/client")({
  beforeLoad: ({ location }) => requireArea("/client", location.href),
  head: () => ({
    meta: [
      { title: "Fiksu — Client Workspace" },
      { name: "description", content: "AI-native accounting for Finnish SMEs — receipts, invoices, payroll, and insights in one PWA." },
      { name: "theme-color", content: "#4338ca" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Fiksu" },
    ],
    links: [
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/favicon.ico" },
    ],
  }),
  component: () => (
    <I18nProvider>
      <EntitlementsProvider>
        <ClientRoleProvider>
          <ClientMobileShell>
            <Outlet />
          </ClientMobileShell>
        </ClientRoleProvider>
      </EntitlementsProvider>
    </I18nProvider>
  ),
});
