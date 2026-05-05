import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, ArrowLeft, Upload, FileText, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadFile, openFile } from "@/lib/storage";
import { toast } from "sonner";

export const Route = createFileRoute("/clients/$clientId")({
  component: () => <AppLayout><Detail /></AppLayout>,
});

type MR = { id: string; client_id: string; year: number; month: number; results_table_data: any; uploaded_docs_urls: string[] | null; total_stats: string | null };

const MONTHS = ["Yan", "Fev", "Mart", "Apr", "May", "Iyun", "Iyul", "Avg", "Sen", "Okt", "Noy", "Dek"];

function Detail() {
  const { t } = useTranslation();
  const { clientId } = Route.useParams();
  const [client, setClient] = useState<any>(null);
  const [results, setResults] = useState<MR[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<MR> | null>(null);
  const [resultsJson, setResultsJson] = useState("");

  const load = async () => {
    const [c, r] = await Promise.all([
      supabase.from("clients").select("*").eq("id", clientId).maybeSingle(),
      supabase.from("monthly_results").select("*").eq("client_id", clientId).order("year", { ascending: false }).order("month", { ascending: false }),
    ]);
    setClient(c.data);
    if (r.data) setResults(r.data as MR[]);
  };
  useEffect(() => { load(); }, [clientId]);

  const newMonth = () => {
    const now = new Date();
    setEditing({ client_id: clientId, year: now.getFullYear(), month: now.getMonth() + 1, total_stats: "", uploaded_docs_urls: [] });
    setResultsJson('[\n  { "worker": "", "promo_code": "", "results": "", "salary": 0 }\n]');
    setOpen(true);
  };

  const editMonth = (m: MR) => {
    setEditing(m);
    setResultsJson(JSON.stringify(m.results_table_data || [], null, 2));
    setOpen(true);
  };

  const save = async () => {
    if (!editing) return;
    let parsed: any = [];
    try { parsed = resultsJson ? JSON.parse(resultsJson) : []; } catch { return toast.error("JSON: " + t("error")); }
    const payload = {
      client_id: clientId,
      year: Number(editing.year),
      month: Number(editing.month),
      results_table_data: parsed,
      uploaded_docs_urls: editing.uploaded_docs_urls || [],
      total_stats: editing.total_stats || null,
    };
    const r = editing.id
      ? await supabase.from("monthly_results").update(payload).eq("id", editing.id)
      : await supabase.from("monthly_results").insert(payload);
    if (r.error) return toast.error(r.error.message);
    toast.success(t("saved")); setOpen(false); load();
  };

  const del = async (id: string) => {
    if (!confirm(t("confirm_delete"))) return;
    await supabase.from("monthly_results").delete().eq("id", id);
    load();
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !editing) return;
    try {
      const path = await uploadFile(`monthly/${clientId}`, file);
      setEditing({ ...editing, uploaded_docs_urls: [...(editing.uploaded_docs_urls || []), path] });
      toast.success(t("saved"));
    } catch (err: any) { toast.error(err.message); }
  };

  // Group by year
  const byYear: Record<number, MR[]> = {};
  results.forEach(m => { (byYear[m.year] ??= []).push(m); });

  return (
    <div>
      <Link to="/clients" className="inline-flex items-center text-sm text-muted-foreground hover:underline mb-4"><ArrowLeft className="h-4 w-4 mr-1" />{t("clients")}</Link>
      <PageHeader title={client?.company_name || "..."} action={<Button onClick={newMonth}><Plus className="h-4 w-4 mr-2" />{t("open_new_month")}</Button>} />

      {client && (
        <Card className="mb-6">
          <CardContent className="pt-6 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div><div className="text-muted-foreground">{t("inn")}</div><div className="font-medium">{client.inn || "—"}</div></div>
            <div><div className="text-muted-foreground">{t("bank_account")}</div><div className="font-medium">{client.bank_account || "—"}</div></div>
            <div><div className="text-muted-foreground">{t("telegram_archive")}</div><div className="font-medium truncate">{client.telegram_archive_link || "—"}</div></div>
          </CardContent>
        </Card>
      )}

      <h2 className="text-lg font-semibold mb-3">{t("monthly_results")}</h2>
      {Object.keys(byYear).length === 0 && <div className="text-muted-foreground text-sm">{t("no_data")}</div>}
      {Object.entries(byYear).sort((a, b) => Number(b[0]) - Number(a[0])).map(([year, months]) => (
        <div key={year} className="mb-6">
          <h3 className="font-bold mb-2">{year}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {months.map(m => (
              <Card key={m.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => editMonth(m)}>
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center justify-between">
                  {MONTHS[m.month - 1]} {m.year}
                  <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); del(m.id); }}><Trash2 className="h-4 w-4" /></Button>
                </CardTitle></CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-1">
                  <div>{Array.isArray(m.results_table_data) ? m.results_table_data.length : 0} {t("results_data")}</div>
                  <div>{(m.uploaded_docs_urls || []).length} files</div>
                  {m.total_stats && <div className="truncate">{m.total_stats}</div>}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("monthly_results")}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t("year")}</Label><Input type="number" value={editing.year || ""} onChange={(e) => setEditing({ ...editing, year: Number(e.target.value) })} /></div>
                <div><Label>{t("month")}</Label><Input type="number" min={1} max={12} value={editing.month || ""} onChange={(e) => setEditing({ ...editing, month: Number(e.target.value) })} /></div>
              </div>
              <div><Label>{t("results_data")} (JSON)</Label>
                <Textarea rows={10} className="font-mono text-xs" value={resultsJson} onChange={(e) => setResultsJson(e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">[{`{"worker":"","promo_code":"","results":"","salary":0}`}]</p>
              </div>
              <div><Label>{t("total_stats")}</Label><Textarea rows={2} value={editing.total_stats || ""} onChange={(e) => setEditing({ ...editing, total_stats: e.target.value })} /></div>
              <div>
                <Label>Files</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(editing.uploaded_docs_urls || []).map((p, i) => (
                    <Button key={i} type="button" size="sm" variant="outline" onClick={() => openFile(p)}><FileText className="h-3 w-3 mr-1" />File {i + 1}</Button>
                  ))}
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer text-sm border rounded px-3 py-1.5 hover:bg-muted">
                  <Upload className="h-4 w-4" />{t("upload")}
                  <input type="file" className="hidden" onChange={onUpload} />
                </label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
            <Button onClick={save}>{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}