import { createFileRoute, Outlet } from "@tanstack/react-router";
import { I18nProvider } from "@/lib/i18n";
import { FirmProvider } from "@/lib/mock/firm";
import { AuditProvider } from "@/lib/mock/audit";
import { EntitlementsProvider } from "@/lib/entitlements/store";
import { FirmShell } from "@/components/firm/FirmShell";
import { requireArea } from "@/lib/auth/guard";

export const Route = createFileRoute("/firm")({
  beforeLoad: ({ location }) => requireArea("/firm", location.href),
  head: () => ({
    meta: [
      { title: "Fiksu — Firm Console" },
      { name: "description", content: "Manage clients, staff, engagements and billing for your accounting firm." },
    ],
  }),
  component: () => (
    <I18nProvider>
      <EntitlementsProvider>
        <FirmProvider>
          <AuditProvider>
            <FirmShell>
              <Outlet />
            </FirmShell>
          </AuditProvider>
        </FirmProvider>
      </EntitlementsProvider>
    </I18nProvider>
  ),
});
