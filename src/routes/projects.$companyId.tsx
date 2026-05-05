import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Upload, FileText, Trash2, ExternalLink, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadFile, openFile, getSignedUrl } from "@/lib/storage";
import { toast } from "sonner";

export const Route = createFileRoute("/projects/$companyId")({
  component: () => <AppLayout><CompanyDetail /></AppLayout>,
});

const MONTHS = ["Yan", "Fev", "Mart", "Apr", "May", "Iyun", "Iyul", "Avg", "Sen", "Okt", "Noy", "Dek"];

function CompanyDetail() {
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

      <Tabs defaultValue="cpa">
        <TabsList>
          <TabsTrigger value="cpa">{t("cpa_results")}</TabsTrigger>
          <TabsTrigger value="payments">{t("payments")}</TabsTrigger>
          <TabsTrigger value="contracts">{t("contracts")}</TabsTrigger>
          <TabsTrigger value="telegram">{t("telegram_chat")}</TabsTrigger>
          <TabsTrigger value="invoices">{t("invoices")}</TabsTrigger>
        </TabsList>

        <TabsContent value="cpa" className="mt-4"><CpaTab clientId={companyId} /></TabsContent>
        <TabsContent value="payments" className="mt-4"><PaymentsTab clientId={companyId} /></TabsContent>
        <TabsContent value="contracts" className="mt-4"><DocsTab clientId={companyId} kind="contract" /></TabsContent>
        <TabsContent value="invoices" className="mt-4"><DocsTab clientId={companyId} kind="invoice" /></TabsContent>
        <TabsContent value="telegram" className="mt-4"><TelegramTab client={client} /></TabsContent>
      </Tabs>
    </div>
  );
}

// ============ CPA RESULTS (monthly_results) ============
function CpaTab({ clientId }: { clientId: string }) {
  const { t } = useTranslation();
  const [results, setResults] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [resultsJson, setResultsJson] = useState("");

  const load = async () => {
    const { data } = await supabase.from("monthly_results").select("*").eq("client_id", clientId).order("year", { ascending: false }).order("month", { ascending: false });
    if (data) setResults(data);
  };
  useEffect(() => { load(); }, [clientId]);

  const newMonth = () => {
    const now = new Date();
    setEditing({ year: now.getFullYear(), month: now.getMonth() + 1, total_stats: "", uploaded_docs_urls: [] });
    setResultsJson('[\n  { "worker": "", "promo_code": "", "results": "", "salary": 0 }\n]');
    setOpen(true);
  };
  const editMonth = (m: any) => { setEditing(m); setResultsJson(JSON.stringify(m.results_table_data || [], null, 2)); setOpen(true); };

  const save = async () => {
    let parsed: any = []; try { parsed = resultsJson ? JSON.parse(resultsJson) : []; } catch { return toast.error("JSON: " + t("error")); }
    const payload = { client_id: clientId, year: Number(editing.year), month: Number(editing.month), results_table_data: parsed, uploaded_docs_urls: editing.uploaded_docs_urls || [], total_stats: editing.total_stats || null };
    const r = editing.id ? await supabase.from("monthly_results").update(payload).eq("id", editing.id) : await supabase.from("monthly_results").insert(payload);
    if (r.error) return toast.error(r.error.message);
    toast.success(t("saved")); setOpen(false); load();
  };
  const del = async (id: string) => { if (!confirm(t("confirm_delete"))) return; await supabase.from("monthly_results").delete().eq("id", id); load(); };
  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { const path = await uploadFile(`monthly/${clientId}`, file); setEditing({ ...editing, uploaded_docs_urls: [...(editing.uploaded_docs_urls || []), path] }); } catch (err: any) { toast.error(err.message); }
  };

  const byYear: Record<number, any[]> = {};
  results.forEach(m => { (byYear[m.year] ??= []).push(m); });

  return (
    <div>
      <div className="flex justify-end mb-3"><Button onClick={newMonth}><Plus className="h-4 w-4 mr-2" />{t("open_new_month")}</Button></div>
      {Object.keys(byYear).length === 0 && <div className="text-muted-foreground text-sm">{t("no_data")}</div>}
      {Object.entries(byYear).sort((a, b) => Number(b[0]) - Number(a[0])).map(([year, months]) => (
        <div key={year} className="mb-6">
          <h3 className="font-bold mb-2">{year}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {months.map(m => (
              <Card key={m.id} className="cursor-pointer hover:border-primary" onClick={() => editMonth(m)}>
                <CardContent className="pt-4">
                  <div className="font-semibold flex items-center justify-between">{MONTHS[m.month - 1]} {m.year}
                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); del(m.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{Array.isArray(m.results_table_data) ? m.results_table_data.length : 0} rows · {(m.uploaded_docs_urls || []).length} files</div>
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
              <div><Label>{t("results_data")} (JSON)</Label><Textarea rows={10} className="font-mono text-xs" value={resultsJson} onChange={(e) => setResultsJson(e.target.value)} /></div>
              <div><Label>{t("total_stats")}</Label><Textarea rows={2} value={editing.total_stats || ""} onChange={(e) => setEditing({ ...editing, total_stats: e.target.value })} /></div>
              <div>
                <Label>Files</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(editing.uploaded_docs_urls || []).map((p: string, i: number) => (<Button key={i} type="button" size="sm" variant="outline" onClick={() => openFile(p)}><FileText className="h-3 w-3 mr-1" />File {i + 1}</Button>))}
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer text-sm border rounded px-3 py-1.5 hover:bg-muted"><Upload className="h-4 w-4" />{t("upload")}<input type="file" className="hidden" onChange={onUpload} /></label>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button><Button onClick={save}>{t("save")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ PAYMENTS ============
function PaymentsTab({ clientId }: { clientId: string }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const load = async () => {
    const [p, w] = await Promise.all([
      supabase.from("payments").select("*").eq("client_id", clientId).order("payment_date", { ascending: false }),
      supabase.from("workers").select("id,full_name"),
    ]);
    if (p.data) setRows(p.data); if (w.data) setWorkers(w.data);
  };
  useEffect(() => { load(); }, [clientId]);

  const save = async () => {
    const payload = { client_id: clientId, worker_id: editing.worker_id || null, amount: Number(editing.amount) || 0, payment_date: editing.payment_date, payment_type: editing.payment_type || null, notes: editing.notes || null, receipt_url: editing.receipt_url || null };
    const r = editing.id ? await supabase.from("payments").update(payload).eq("id", editing.id) : await supabase.from("payments").insert(payload);
    if (r.error) return toast.error(r.error.message);
    toast.success(t("saved")); setOpen(false); load();
  };
  const del = async (id: string) => { if (!confirm(t("confirm_delete"))) return; await supabase.from("payments").delete().eq("id", id); load(); };
  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { const path = await uploadFile(`receipts/${clientId}`, file); setEditing({ ...editing, receipt_url: path }); } catch (err: any) { toast.error(err.message); }
  };
  const workerName = (id: string | null) => workers.find(w => w.id === id)?.full_name || "—";

  return (
    <div>
      <div className="flex justify-end mb-3"><Button onClick={() => { setEditing({ payment_date: new Date().toISOString().slice(0, 10), amount: 0 }); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />{t("add")}</Button></div>
      <div className="border rounded-lg bg-card overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>{t("date")}</TableHead><TableHead>{t("worker")}</TableHead><TableHead>{t("amount")}</TableHead><TableHead>{t("payment_type")}</TableHead><TableHead>{t("receipt")}</TableHead><TableHead className="text-right">{t("actions")}</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">{t("no_data")}</TableCell></TableRow>}
            {rows.map(p => (
              <TableRow key={p.id}>
                <TableCell>{p.payment_date}</TableCell>
                <TableCell>{workerName(p.worker_id)}</TableCell>
                <TableCell>{Number(p.amount).toLocaleString()}</TableCell>
                <TableCell>{p.payment_type}</TableCell>
                <TableCell>{p.receipt_url ? <Button size="sm" variant="ghost" onClick={() => openFile(p.receipt_url)}><FileText className="h-4 w-4" /></Button> : "—"}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}><FileText className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => del(p.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("payments")}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>{t("date")}</Label><Input type="date" value={editing.payment_date || ""} onChange={(e) => setEditing({ ...editing, payment_date: e.target.value })} /></div>
              <div><Label>{t("worker")}</Label>
                <Select value={editing.worker_id || ""} onValueChange={(v) => setEditing({ ...editing, worker_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{workers.map(w => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>{t("amount")}</Label><Input type="number" value={editing.amount || 0} onChange={(e) => setEditing({ ...editing, amount: e.target.value })} /></div>
              <div><Label>{t("payment_type")}</Label><Input value={editing.payment_type || ""} onChange={(e) => setEditing({ ...editing, payment_type: e.target.value })} /></div>
              <div><Label>{t("notes")}</Label><Textarea value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></div>
              <div><Label>{t("receipt")}</Label>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-sm border rounded px-3 py-1.5 hover:bg-muted"><Upload className="h-4 w-4" />{t("upload")}<input type="file" className="hidden" onChange={onUpload} /></label>
                  {editing.receipt_url && <Button type="button" size="sm" variant="outline" onClick={() => openFile(editing.receipt_url)}><FileText className="h-3 w-3 mr-1" />{t("view")}</Button>}
                </div>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button><Button onClick={save}>{t("save")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ CONTRACTS / INVOICES (projects table reused) ============
function DocsTab({ clientId, kind }: { clientId: string; kind: "contract" | "invoice" }) {
  const { t } = useTranslation();
  const field = kind === "contract" ? "contract_url" : "invoice_url";
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const load = async () => {
    const { data } = await supabase.from("projects").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
    if (data) setRows(data);
  };
  useEffect(() => { load(); }, [clientId]);

  const save = async () => {
    const payload: any = { client_id: clientId, project_name: editing.project_name || null, [field]: editing[field] || null, status: editing.status || "active" };
    const r = editing.id ? await supabase.from("projects").update(payload).eq("id", editing.id) : await supabase.from("projects").insert(payload);
    if (r.error) return toast.error(r.error.message);
    toast.success(t("saved")); setOpen(false); load();
  };
  const del = async (id: string) => { if (!confirm(t("confirm_delete"))) return; await supabase.from("projects").delete().eq("id", id); load(); };
  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { const path = await uploadFile(`projects/${field}`, file); setEditing({ ...editing, [field]: path }); } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div>
      <div className="flex justify-end mb-3"><Button onClick={() => { setEditing({ status: "active" }); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />{t("add")}</Button></div>
      <div className="border rounded-lg bg-card overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>{t("project_name")}</TableHead><TableHead>{kind === "contract" ? t("contract") : t("invoice")}</TableHead><TableHead>{t("status")}</TableHead><TableHead className="text-right">{t("actions")}</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">{t("no_data")}</TableCell></TableRow>}
            {rows.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.project_name || "—"}</TableCell>
                <TableCell>{p[field] ? <Button size="sm" variant="ghost" onClick={() => openFile(p[field])}><FileText className="h-4 w-4" /></Button> : "—"}</TableCell>
                <TableCell>{p.status}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}><FileText className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => del(p.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{kind === "contract" ? t("contracts") : t("invoices")}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>{t("project_name")}</Label><Input value={editing.project_name || ""} onChange={(e) => setEditing({ ...editing, project_name: e.target.value })} /></div>
              <div><Label>{t("status")}</Label>
                <Select value={editing.status || "active"} onValueChange={(v) => setEditing({ ...editing, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">active</SelectItem><SelectItem value="completed">completed</SelectItem><SelectItem value="paused">paused</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>{kind === "contract" ? t("contract") : t("invoice")} (PDF)</Label>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-sm border rounded px-3 py-1.5 hover:bg-muted"><Upload className="h-4 w-4" />{t("upload")}<input type="file" className="hidden" onChange={onUpload} /></label>
                  {editing[field] && <Button type="button" size="sm" variant="outline" onClick={() => openFile(editing[field])}><FileText className="h-3 w-3 mr-1" />{t("view")}</Button>}
                </div>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button><Button onClick={save}>{t("save")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ TELEGRAM CHAT ============
function TelegramTab({ client }: { client: any }) {
  const { t } = useTranslation();
  const link = client?.telegram_archive_link;
  return (
    <Card>
      <CardContent className="pt-6">
        <Label className="text-xs text-muted-foreground">{t("telegram_archive")}</Label>
        {link ? (
          <div className="flex items-center gap-2 mt-2">
            <Send className="h-5 w-5 text-primary" />
            <a href={link} target="_blank" rel="noreferrer" className="text-primary hover:underline break-all">{link}</a>
            <Button size="sm" variant="outline" onClick={() => window.open(link, "_blank")}><ExternalLink className="h-3 w-3 mr-1" />{t("view")}</Button>
          </div>
        ) : (
          <div className="text-muted-foreground text-sm mt-2">{t("no_data")}</div>
        )}
      </CardContent>
    </Card>
  );
}
