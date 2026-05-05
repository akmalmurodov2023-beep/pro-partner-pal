import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { CpaTab, PaymentsTab, DocsTab, TelegramTab, SettingsTab, ProjectWorkersTab } from "@/components/company/sections";

export const Route = createFileRoute("/projects/$companyId/$section")({
  component: SectionPage,
});

function SectionPage() {
  const { t } = useTranslation();
  const { companyId, section } = Route.useParams();

  const titleKey: Record<string, string> = {
    cpa: "cpa_results",
    workers: "workers",
    payments: "payments",
    contracts: "contracts",
    invoices: "invoices",
    telegram: "telegram_chat",
    settings: "settings",
  };
  if (!titleKey[section]) throw notFound();

  return (
    <div>
      <Link to="/projects/$companyId" params={{ companyId }} className="inline-flex items-center text-sm text-muted-foreground hover:underline mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />{t("back")}
      </Link>
      <PageHeader title={section === "workers" ? "Ishchilar" : t(titleKey[section])} />
      {section === "cpa" && <CpaTab clientId={companyId} />}
      {section === "workers" && <ProjectWorkersTab clientId={companyId} />}
      {section === "payments" && <PaymentsTab clientId={companyId} />}
      {section === "contracts" && <DocsTab clientId={companyId} kind="contract" />}
      {section === "invoices" && <DocsTab clientId={companyId} kind="invoice" />}
      {section === "telegram" && <TelegramTab clientId={companyId} />}
      {section === "settings" && <SettingsTab clientId={companyId} />}
    </div>
  );
}