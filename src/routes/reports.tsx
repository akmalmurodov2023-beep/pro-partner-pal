import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, Building2, FolderKanban, Wallet } from "lucide-react";

export const Route = createFileRoute("/reports")({ component: () => <AppLayout><Reports /></AppLayout> });

function Reports() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({ workers: 0, clients: 0, projects: 0, total: 0 });

  useEffect(() => {
    (async () => {
      const [w, c, p, pay] = await Promise.all([
        supabase.from("workers").select("id", { count: "exact", head: true }),
        supabase.from("clients").select("id", { count: "exact", head: true }),
        supabase.from("projects").select("id", { count: "exact", head: true }),
        supabase.from("payments").select("amount"),
      ]);
      const total = (pay.data || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
      setStats({ workers: w.count || 0, clients: c.count || 0, projects: p.count || 0, total });
    })();
  }, []);

  const items = [
    { label: t("workers"), value: stats.workers, icon: Users },
    { label: t("clients"), value: stats.clients, icon: Building2 },
    { label: t("projects"), value: stats.projects, icon: FolderKanban },
    { label: t("payments"), value: stats.total.toLocaleString(), icon: Wallet },
  ];

  return (
    <div>
      <PageHeader title={t("reports")} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map(it => (
          <Card key={it.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{it.label}</CardTitle>
              <it.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{it.value}</div></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}