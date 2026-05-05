import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Building2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSignedUrl } from "@/lib/storage";

export const Route = createFileRoute("/projects")({ component: () => <AppLayout><ProjectsPage /></AppLayout> });

type Client = { id: string; company_name: string; inn: string | null; logo_url: string | null };

function ProjectsPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Client[]>([]);
  const [logos, setLogos] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("clients").select("id,company_name,inn,logo_url").order("company_name");
      if (!data) return;
      setRows(data as Client[]);
      const urls: Record<string, string> = {};
      await Promise.all((data as Client[]).map(async (c) => {
        if (c.logo_url) { const u = await getSignedUrl(c.logo_url); if (u) urls[c.id] = u; }
      }));
      setLogos(urls);
    })();
  }, []);

  const filtered = rows.filter(r => !search || r.company_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader title={t("projects")} />
      <div className="mb-4"><Input placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" /></div>
      {filtered.length === 0 && <div className="text-muted-foreground text-sm">{t("no_data")}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(c => (
          <Link key={c.id} to="/projects/$companyId" params={{ companyId: c.id }}>
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardContent className="pt-6 flex items-center gap-4">
                {logos[c.id]
                  ? <img src={logos[c.id]} alt={c.company_name} className="h-14 w-14 rounded object-cover" />
                  : <div className="h-14 w-14 rounded bg-muted flex items-center justify-center"><Building2 className="h-6 w-6 text-muted-foreground" /></div>}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{c.company_name}</div>
                  <div className="text-xs text-muted-foreground">{t("inn")}: {c.inn || "—"}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
