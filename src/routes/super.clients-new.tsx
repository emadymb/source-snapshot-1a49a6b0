import { createFileRoute } from "@tanstack/react-router";
import { ClientRegisterWizard } from "@/components/registration/ClientRegisterWizard";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/super/clients-new")({ component: Page });

function Page() {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t("reg.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("reg.subtitle")}</p>
      </div>
      <div className="rounded-3xl border border-glass-border bg-white/80 p-6 shadow-sm sm:p-8">
        <ClientRegisterWizard variant="internal" />
      </div>
    </div>
  );
}
