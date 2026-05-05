import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, X, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { openFile } from "@/lib/storage";
import { MONTHS } from "@/components/company/sections";

export const Route = createFileRoute("/projects/$companyId/cpa/$monthId")({
  component: MonthDetailPage,
});

const pad = (n: number) => String(n).padStart(2, "0");

function MonthDetailPage() {
  const { t } = useTranslation();
  const { companyId, monthId } = Route.useParams();
  const navigate = useNavigate();
  const [month, setMonth] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: m } = await supabase.from("monthly_results").select("*").eq("id", monthId).maybeSingle();
      if (!m) { setLoading(false); return; }
      setMonth(m);
      const last = new Date(m.year, m.month, 0).getDate();
      const start = `${m.year}-${pad(m.month)}-01`;
      const end = `${m.year}-${pad(m.month)}-${pad(last)}`;
      const [p, w] = await Promise.all([
        supabase.from("payments").select("*").eq("client_id", companyId).gte("payment_date", start).lte("payment_date", end),
        supabase.from("workers").select("id,full_name"),
      ]);
      setPayments(p.data || []);
      setWorkers(w.data || []);
      setLoading(false);
    })();
  }, [monthId, companyId]);

  const paidForWorker = (workerName: string) => {
    if (!workerName) return 0;
    const w = workers.find(x => (x.full_name || "").trim().toLowerCase() === workerName.trim().toLowerCase());
    if (!w) return 0;
    return payments.filter(p => p.worker_id === w.id).reduce((s, p) => s + Number(p.amount || 0), 0);
  };

  const rows: any[] = Array.isArray(month?.results_table_data) ? month.results_table_data : [];
  const docs: string[] = month?.uploaded_docs_urls || [];

  return (
    <div>
      <Link to="/projects/$companyId/$section" params={{ companyId, section: "cpa" }} className="inline-flex items-center text-sm text-muted-foreground hover:underline mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />{t("back")}
      </Link>
      <div className="flex items-start justify-between gap-3 mb-4">
        <PageHeader title={month ? `${MONTHS[month.month - 1]} ${month.year} — ${t("results")}` : t("results")} />
        <div className="flex items-center gap-2">
          {docs.map((p, i) => (
            <Button key={i} size="sm" variant="outline" onClick={() => openFile(p)}>
              <Download className="h-3 w-3 mr-1" />File {i + 1}
            </Button>
          ))}
          {month && (
            <Button size="sm" variant="outline" onClick={() => navigate({ to: "/projects/$companyId/$section", params: { companyId, section: "cpa" }, search: { edit: month.id } as any })}>
              <FileText className="h-3 w-3 mr-1" />{t("edit")}
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-muted-foreground text-sm">...</div>
      ) : !month ? (
        <div className="text-muted-foreground text-sm">{t("no_data")}</div>
      ) : (
        <div className="border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>{t("bloggers")}</TableHead>
                <TableHead>{t("promocode")}</TableHead>
                <TableHead>{t("results")}</TableHead>
                <TableHead className="text-right">{t("amount")}</TableHead>
                <TableHead className="text-right">{t("paid")}</TableHead>
                <TableHead className="text-center">{t("status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">{t("no_data")}</TableCell></TableRow>
              ) : rows.map((b: any, i: number) => {
                const expected = Number(b.salary || 0);
                const paid = paidForWorker(b.worker || "");
                const ok = paid >= expected && expected > 0;
                return (
                  <TableRow key={i}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-medium">{b.worker || "—"}</TableCell>
                    <TableCell>{b.promo_code || "—"}</TableCell>
                    <TableCell>{b.results || "—"}</TableCell>
                    <TableCell className="text-right">{expected.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{paid.toLocaleString()}</TableCell>
                    <TableCell className="text-center">
                      {ok ? (
                        <span className="inline-flex items-center justify-center h-6 w-6 bg-green-500/15 text-green-600">
                          <Check className="h-4 w-4" />
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center h-6 w-6 bg-destructive/15 text-destructive">
                          <X className="h-4 w-4" />
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}