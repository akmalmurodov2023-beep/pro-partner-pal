import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSignedUrl } from "@/lib/storage";

export const Route = createFileRoute("/projects/")({ component: () => <AppLayout><ProjectsPage /></AppLayout> });

type Client = { id: string; company_name: string; inn: string | null; bank_account: string | null; logo_url: string | null };

function ProjectsPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Client[]>([]);
  const [logos, setLogos] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("clients")
        .select("id,company_name,inn,bank_account,logo_url")
        .order("company_name");
      if (!data) return;
      setRows(data as Client[]);
      const urls: Record<string, string> = {};
      await Promise.all((data as Client[]).map(async (c) => {
        if (c.logo_url) { const u = await getSignedUrl(c.logo_url); if (u) urls[c.id] = u; }
      }));
      setLogos(urls);
    })();
  }, []);

  const filtered = rows.filter(r =>
    !search ||
    r.company_name.toLowerCase().includes(search.toLowerCase()) ||
    (r.inn || "").includes(search)
  );

  return (
    <div>
      <PageHeader title={t("projects")} />
      <div className="mb-4">
        <Input placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      </div>
      <div className="border rounded-lg bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">{t("logo")}</TableHead>
              <TableHead>{t("company")}</TableHead>
              <TableHead>{t("inn")}</TableHead>
              <TableHead>{t("bank_account")}</TableHead>
              <TableHead className="text-right w-32">{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">{t("no_data")}</TableCell></TableRow>
            )}
            {filtered.map(c => (
              <TableRow key={c.id} className="hover:bg-muted/50">
                <TableCell>
                  {logos[c.id]
                    ? <img src={logos[c.id]} alt={c.company_name} className="h-10 w-10 rounded object-cover" />
                    : <div className="h-10 w-10 rounded bg-muted flex items-center justify-center"><Building2 className="h-4 w-4 text-muted-foreground" /></div>}
                </TableCell>
                <TableCell className="font-medium">
                  <Link to="/projects/$companyId" params={{ companyId: c.id }} className="hover:underline">
                    {c.company_name}
                  </Link>
                </TableCell>
                <TableCell>{c.inn || "—"}</TableCell>
                <TableCell>{c.bank_account || "—"}</TableCell>
                <TableCell className="text-right">
                  <Button asChild size="sm" variant="outline">
                    <Link to="/projects/$companyId" params={{ companyId: c.id }}>
                      {t("view")} <ArrowRight className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
