import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, BarChart3, CreditCard, FileText, MessageSquare, Receipt, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSignedUrl } from "@/lib/storage";

export const Route = createFileRoute("/projects/$companyId/")({
  component: CompanyIndex,
});

function CompanyIndex() {
  const { t } = useTranslation();
  const { companyId } = Route.useParams();
  const [client, setClient] = useState<any>(null);
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("clients").select("*").eq("id", companyId).maybeSingle();
      setClient(data);
      if (data?.logo_url) setLogo(await getSignedUrl(data.logo_url));
    })();
  }, [companyId]);

  const sections = [
    { key: "cpa", label: t("cpa_results"), icon: BarChart3 },
    { key: "payments", label: t("payments"), icon: CreditCard },
    { key: "contracts", label: t("contracts"), icon: FileText },
    { key: "telegram", label: t("telegram_chat"), icon: MessageSquare },
    { key: "invoices", label: t("invoices"), icon: Receipt },
    { key: "settings", label: t("settings"), icon: Settings },
  ];

  return (
    <div>
      <Link to="/projects" className="inline-flex items-center text-sm text-muted-foreground hover:underline mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />{t("projects")}
      </Link>
      <PageHeader title={client?.company_name || "..."} />

      {client && (
        <Card className="mb-6">
          <CardContent className="pt-6 flex items-center gap-4">
            {logo && <img src={logo} alt="" className="h-16 w-16 rounded object-cover border" />}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm flex-1">
              <div><div className="text-muted-foreground">{t("inn")}</div><div className="font-medium">{client.inn || "—"}</div></div>
              <div><div className="text-muted-foreground">{t("bank_account")}</div><div className="font-medium">{client.bank_account || "—"}</div></div>
              <div><div className="text-muted-foreground">{t("telegram_archive")}</div><div className="font-medium truncate">{client.telegram_archive_link || "—"}</div></div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="border bg-card divide-y">
        {sections.map(s => {
          const Icon = s.icon;
          return (
            <Link
              key={s.key}
              to="/projects/$companyId/$section"
              params={{ companyId, section: s.key }}
              className="flex items-center gap-4 px-6 py-5 hover:bg-muted/50 transition-colors group"
            >
              <Icon className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
              <span className="text-lg font-medium">{s.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}