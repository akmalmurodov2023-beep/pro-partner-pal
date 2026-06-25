import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Upload, FileText, Trash2, ExternalLink, Send, FileArchive, Download, Loader2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadFile, openFile, getSignedUrl } from "@/lib/storage";
import { toast } from "sonner";
import JSZip from "jszip";
import { notifyAddedToProject, notifyRemovedFromProject } from "@/lib/notify";

export const MONTHS = ["Yan", "Fev", "Mart", "Apr", "May", "Iyun", "Iyul", "Avg", "Sen", "Okt", "Noy", "Dek"];

// ============ PROJECT WORKERS ============
export function ProjectWorkersTab({ clientId }: { clientId: string }) {
  const { t } = useTranslation();
  const [linked, setLinked] = useState<any[]>([]);
  const [allWorkers, setAllWorkers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("");

  const load = async () => {
    const { data: links } = await supabase
      .from("project_workers")
      .select("id, worker_id, promo_code, created_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    const { data: workers } = await supabase
      .from("workers")
      .select("id, full_name, telegram_id");
    setLinked(links || []);
    setAllWorkers(workers || []);
  };
  useEffect(() => { load(); }, [clientId]);

  const linkedIds = new Set(linked.map(l => l.worker_id));
  const available = allWorkers.filter(w => !linkedIds.has(w.id));

  const [promoCode, setPromoCode] = useState("");

  const add = async () => {
    if (!selectedId) return;
    const { error } = await supabase
      .from("project_workers")
      .insert({ client_id: clientId, worker_id: selectedId, promo_code: promoCode || null });
    if (error) return toast.error(error.message);
    notifyAddedToProject(selectedId, clientId, promoCode || null).catch(() => {});
    toast.success(t("saved"));
    setOpen(false);
    setSelectedId("");
    setPromoCode("");
    load();
  };

  const remove = async (link: any) => {
    if (!confirm(t("confirm_delete"))) return;
    const { error } = await supabase
      .from("project_workers")
      .delete()
      .eq("id", link.id);
    if (error) return toast.error(error.message);
    notifyRemovedFromProject(link.worker_id, clientId).catch(() => {});
    toast.success(t("deleted"));
    load();
  };

  const nameOf = (id: string) => allWorkers.find(w => w.id === id)?.full_name || "—";

  const updatePromo = async (linkId: string, code: string) => {
    const { error } = await supabase
      .from("project_workers")
      .update({ promo_code: code || null })
      .eq("id", linkId);
    if (error) return toast.error(error.message);
    setLinked(prev => prev.map(l => l.id === linkId ? { ...l, promo_code: code } : l));
  };

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />{t("add")}
        </Button>
      </div>
      <div className="border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("worker")}</TableHead>
              <TableHead>Telegram</TableHead>
              <TableHead>{t("promocode")}</TableHead>
              <TableHead className="text-right">{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linked.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">{t("no_data")}</TableCell></TableRow>
            ) : linked.map(l => {
              const w = allWorkers.find(x => x.id === l.worker_id);
              return (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{nameOf(l.worker_id)}</TableCell>
                  <TableCell className="text-muted-foreground">{w?.telegram_id || "—"}</TableCell>
                  <TableCell>
                    <Input
                      defaultValue={l.promo_code || ""}
                      placeholder="—"
                      className="h-8 max-w-[180px]"
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v !== (l.promo_code || "")) updatePromo(l.id, v);
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => remove(l)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("add")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t("worker")}</Label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger><SelectValue placeholder={t("select_blogger")} /></SelectTrigger>
                <SelectContent>
                  {available.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">—</div>
                  ) : available.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("promocode")}</Label>
              <Input value={promoCode} onChange={(e) => setPromoCode(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
            <Button onClick={add} disabled={!selectedId}>{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ CPA RESULTS ============
export function CpaTab({ clientId }: { clientId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { const path = await uploadFile(`monthly/${clientId}`, file); setEditing({ ...editing, uploaded_docs_urls: [...(editing.uploaded_docs_urls || []), path] }); } catch (err: any) { toast.error(err.message); }
  };

  const sorted = [...results].sort((a, b) => b.year - a.year || b.month - a.month);

  const pad = (n: number) => String(n).padStart(2, "0");
  const monthRange = (year: number, month: number) => {
    const last = new Date(year, month, 0).getDate();
    return `${pad(1)}.${pad(month)}.${year} - ${pad(last)}.${pad(month)}.${year}`;
  };
  const openDetails = (m: any) => {
    navigate({ to: "/projects/$companyId/cpa/$monthId", params: { companyId: clientId, monthId: m.id } });
  };

  const fmt = (n: number) => Number(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const totals = sorted.reduce((acc, m) => {
    const rows = Array.isArray(m.results_table_data) ? m.results_table_data : [];
    for (const r of rows) {
      acc.total += Number(r.salary) || 0;
      acc.paid += Number(r.paid_amount) || 0;
    }
    return acc;
  }, { total: 0, paid: 0 });
  const profit = totals.total - totals.paid;

  return (
    <div>
      {sorted.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="border bg-card p-4">
            <div className="text-xs text-muted-foreground">{t("total_amount")}</div>
            <div className="text-2xl font-semibold mt-1">{fmt(totals.total)}</div>
          </div>
          <div className="border bg-card p-4">
            <div className="text-xs text-muted-foreground">{t("total_paid")}</div>
            <div className="text-2xl font-semibold mt-1 text-green-600">{fmt(totals.paid)}</div>
          </div>
          <div className="border bg-card p-4">
            <div className="text-xs text-muted-foreground">{t("profit")}</div>
            <div className={`text-2xl font-semibold mt-1 ${profit > 0 ? "text-destructive" : "text-foreground"}`}>{fmt(profit)}</div>
          </div>
        </div>
      )}
      <div className="flex justify-end mb-3">
        <Button onClick={newMonth}><Plus className="h-4 w-4 mr-2" />{t("open_new_month")}</Button>
      </div>
      {sorted.length === 0 ? (
        <div className="text-muted-foreground text-sm">{t("no_data")}</div>
      ) : (
        <div className="space-y-6">
          {Array.from(new Set(sorted.map(m => m.year))).sort((a, b) => b - a).map(year => {
            const yearMonths = sorted.filter(m => m.year === year);
            return (
              <div key={year}>
                <div className="text-lg font-semibold mb-2">{year}</div>
                <div className="border bg-card overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("month")}</TableHead>
                        <TableHead>{t("period")}</TableHead>
                        <TableHead>{t("attendance")}</TableHead>
                        <TableHead className="text-right">{t("results")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {yearMonths.map(m => {
                        const count = Array.isArray(m.results_table_data) ? m.results_table_data.length : 0;
                        return (
                          <TableRow key={m.id} onClick={() => openDetails(m)} className="cursor-pointer">
                            <TableCell className="font-medium">{MONTHS[m.month - 1]} {m.year}</TableCell>
                            <TableCell className="text-muted-foreground">{monthRange(m.year, m.month)}</TableCell>
                            <TableCell>
                              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openDetails(m); }}>{count}</Button>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <Button size="sm" variant="outline" className="rounded-none" onClick={(e) => { e.stopPropagation(); openDetails(m); }}>
                                <FileText className="h-3 w-3 mr-1" />{t("results_btn")}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
export function PaymentsTab({ clientId }: { clientId: string }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const load = async () => {
    const [p, w] = await Promise.all([
      supabase.from("payments").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
      supabase.from("workers").select("id,full_name"),
    ]);
    if (p.data) setRows(p.data); if (w.data) setWorkers(w.data);
  };
  useEffect(() => { load(); }, [clientId]);

  const fmtNum = (n: number | string) => {
    const num = Number(String(n).replace(/\s/g, "")) || 0;
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };
  const parseNum = (s: string) => Number(String(s).replace(/\s/g, "")) || 0;

  const save = async () => {
    if (!editing) return;
    const now = new Date();
    const ty = Number(editing.target_year) || now.getFullYear();
    const tm = Number(editing.target_month) || (now.getMonth() + 1);
    const amount = Number(editing.amount) || 0;
    const payload: any = {
      client_id: clientId,
      worker_id: editing.worker_id || null,
      amount,
      payment_date: editing.payment_date || new Date().toISOString().slice(0, 10),
      payment_type: editing.payment_type || "cash",
      notes: editing.notes || null,
      receipt_url: editing.receipt_url || null,
      target_year: ty,
      target_month: tm,
    };

    // Sync into corresponding CPA monthly_results row (only on insert)
    if (!editing.id && payload.worker_id) {
      const { data: mr } = await supabase
        .from("monthly_results")
        .select("*")
        .eq("client_id", clientId)
        .eq("year", ty)
        .eq("month", tm)
        .maybeSingle();
      if (!mr) {
        toast.error(t("no_cpa_for_month"));
        return;
      }
      const wname = workers.find(x => x.id === payload.worker_id)?.full_name || "";
      const data: any[] = Array.isArray(mr.results_table_data) ? mr.results_table_data : [];
      const idx = data.findIndex((r: any) => String(r.worker || "").trim().toLowerCase() === wname.trim().toLowerCase());
      if (idx === -1) {
        toast.error(t("blogger_not_in_cpa"));
        return;
      }
      if (data[idx].paid_status === "paid" && Number(data[idx].paid_amount || 0) > 0) {
        if (!confirm(t("already_paid_warning"))) return;
      }
      data[idx] = {
        ...data[idx],
        paid_amount: Number(data[idx].paid_amount || 0) + amount,
        paid_status: "paid",
      };
      await supabase.from("monthly_results").update({ results_table_data: data }).eq("id", mr.id);
    }

    const r = editing.id
      ? await supabase.from("payments").update(payload).eq("id", editing.id)
      : await supabase.from("payments").insert(payload);
    if (r.error) return toast.error(r.error.message);
    toast.success(t("saved")); setOpen(false); load();
  };
  const del = async (id: string) => { if (!confirm(t("confirm_delete"))) return; await supabase.from("payments").delete().eq("id", id); load(); };
  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { const path = await uploadFile("receipts", file); setEditing({ ...editing, receipt_url: path }); } catch (err: any) { toast.error(err.message); }
  };
  const workerName = (id: string | null) => workers.find(w => w.id === id)?.full_name || "—";

  const now = new Date();
  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <div>
      <div className="flex justify-end mb-3"><Button onClick={() => { setEditing({ payment_date: new Date().toISOString().slice(0, 10), amount: 0, payment_type: "cash", target_year: now.getFullYear(), target_month: now.getMonth() + 1 }); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />{t("add")}</Button></div>
      <div className="border bg-card overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>{t("date")}</TableHead><TableHead>{t("worker")}</TableHead><TableHead>{t("amount")}</TableHead><TableHead>{t("payment_type")}</TableHead><TableHead>{t("receipt")}</TableHead><TableHead className="text-right">{t("actions")}</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">{t("no_data")}</TableCell></TableRow>}
            {rows.map(p => (
              <TableRow key={p.id}>
                <TableCell>{p.payment_date}</TableCell>
                <TableCell>{workerName(p.worker_id)}</TableCell>
                <TableCell className="font-medium">{fmtNum(p.amount)}</TableCell>
                <TableCell>{p.payment_type === "card" ? t("card") : p.payment_type === "cash" ? t("cash") : (p.payment_type || "—")}</TableCell>
                <TableCell>{p.receipt_url ? <Button size="sm" variant="ghost" onClick={() => openFile(p.receipt_url)}><FileText className="h-4 w-4" /></Button> : "—"}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
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
              <div><Label>{t("amount")}</Label><Input inputMode="numeric" value={fmtNum(editing.amount ?? 0)} onChange={(e) => setEditing({ ...editing, amount: parseNum(e.target.value) })} /></div>
              <div><Label>{t("target_month")}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={String(editing.target_year || now.getFullYear())} onValueChange={(v) => setEditing({ ...editing, target_year: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={String(editing.target_month || now.getMonth() + 1)} onValueChange={(v) => setEditing({ ...editing, target_month: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>{t("payment_type")}</Label>
                <Select value={editing.payment_type || "cash"} onValueChange={(v) => setEditing({ ...editing, payment_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{t("cash")}</SelectItem>
                    <SelectItem value="card">{t("card")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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

// ============ DOCS (contracts/invoices) ============
export function DocsTab({ clientId, kind }: { clientId: string; kind: "contract" | "invoice" }) {
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
      <div className="border bg-card overflow-x-auto">
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

// ============ TELEGRAM ============
export function TelegramTab({ clientId }: { clientId: string }) {
  const { t } = useTranslation();
  const [client, setClient] = useState<any>(null);
  const reload = async () => {
    const { data } = await supabase.from("clients").select("*").eq("id", clientId).maybeSingle();
    setClient(data);
  };
  useEffect(() => { reload(); }, [clientId]);

  const link = client?.telegram_archive_link;
  const zips: string[] = client?.telegram_archive_zips || [];
  const driveUrls: string[] = client?.telegram_drive_urls || [];
  const [uploading, setUploading] = useState(false);
  const [uploadingDrive, setUploadingDrive] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const [archiveHtml, setArchiveHtml] = useState<string | null>(null);
  const [archiveFiles, setArchiveFiles] = useState<{ name: string; blobUrl: string }[]>([]);
  const [loadingArchive, setLoadingArchive] = useState(false);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".zip")) return toast.error("ZIP only");
    setUploading(true);
    try {
      const path = await uploadFile(`telegram/${clientId}`, file);
      const next = [...zips, path];
      const { error } = await supabase.from("clients").update({ telegram_archive_zips: next }).eq("id", clientId);
      if (error) throw error;
      toast.success(t("saved"));
      await reload();
    } catch (err: any) { toast.error(err.message); }
    finally { setUploading(false); e.target.value = ""; }
  };

  const onUploadDrive = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDrive(true);
    try {
      const buf = await file.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buf);
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
      }
      const base64 = btoa(binary);
      const { data: res, error: upErr } = await supabase.functions.invoke(
        "upload-to-drive",
        { body: { fileName: file.name, mimeType: file.type || "application/octet-stream", base64 } },
      );
      if (upErr) throw upErr;
      const next = [...driveUrls, (res as { webViewLink: string }).webViewLink];
      const { error } = await supabase.from("clients").update({ telegram_drive_urls: next as any }).eq("id", clientId);
      if (error) throw error;
      toast.success("Google Drive'ga yuklandi");
      await reload();
    } catch (err: any) {
      toast.error(err.message || "Drive upload failed");
    } finally {
      setUploadingDrive(false);
      e.target.value = "";
    }
  };

  const removeDriveUrl = async (url: string) => {
    if (!confirm(t("confirm_delete"))) return;
    const next = driveUrls.filter(u => u !== url);
    await supabase.from("clients").update({ telegram_drive_urls: next as any }).eq("id", clientId);
    await reload();
  };

  const removeZip = async (path: string) => {
    if (!confirm(t("confirm_delete"))) return;
    await supabase.storage.from("documents").remove([path]);
    const next = zips.filter(z => z !== path);
    await supabase.from("clients").update({ telegram_archive_zips: next }).eq("id", clientId);
    await reload();
  };

  const viewArchive = async (path: string) => {
    setViewing(path); setLoadingArchive(true); setArchiveHtml(null);
    archiveFiles.forEach(f => URL.revokeObjectURL(f.blobUrl));
    setArchiveFiles([]);
    try {
      const { data, error } = await supabase.storage.from("documents").download(path);
      if (error) throw error;
      const zip = await JSZip.loadAsync(await data.arrayBuffer());
      const fileMap: Record<string, string> = {};
      const fileList: { name: string; blobUrl: string }[] = [];
      const entries = Object.values(zip.files).filter(f => !f.dir);
      for (const entry of entries) {
        const lower = entry.name.toLowerCase();
        if (lower.endsWith(".html") || lower.endsWith(".htm")) continue;
        const blob = await entry.async("blob");
        const url = URL.createObjectURL(blob);
        fileMap[entry.name] = url;
        fileList.push({ name: entry.name, blobUrl: url });
      }
      setArchiveFiles(fileList);
      const htmlEntry = zip.file(/messages\.html$/i)[0] || zip.file(/\.html?$/i)[0];
      if (htmlEntry) {
        let html = await htmlEntry.async("string");
        const baseDir = htmlEntry.name.includes("/") ? htmlEntry.name.replace(/[^/]+$/, "") : "";
        html = html.replace(/(href|src)="([^"#?][^"#?]*?)"/g, (_m, attr, p) => {
          const candidate = baseDir + p;
          const normalized = candidate.replace(/^\.\//, "");
          const found = fileMap[normalized] || fileMap[p];
          return `${attr}="${found || p}"`;
        });
        setArchiveHtml(html);
      } else {
        setArchiveHtml("<p style='padding:1rem;font-family:sans-serif'>No HTML found in archive.</p>");
      }
    } catch (err: any) {
      toast.error(err.message);
      setArchiveHtml(`<p style='padding:1rem;color:red'>${err.message}</p>`);
    } finally { setLoadingArchive(false); }
  };

  const closeViewer = () => {
    archiveFiles.forEach(f => URL.revokeObjectURL(f.blobUrl));
    setArchiveFiles([]); setArchiveHtml(null); setViewing(null);
  };

  const downloadZip = async (path: string) => {
    const url = await getSignedUrl(path);
    if (url) window.open(url, "_blank");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">{t("telegram_archive")} ({t("link")})</Label>
            {link ? (
              <div className="flex items-center gap-2 mt-2">
                <Send className="h-5 w-5 text-primary" />
                <a href={link} target="_blank" rel="noreferrer" className="text-primary hover:underline break-all">{link}</a>
                <Button size="sm" variant="outline" onClick={() => window.open(link, "_blank")}><ExternalLink className="h-3 w-3 mr-1" />{t("view")}</Button>
              </div>
            ) : (<div className="text-muted-foreground text-sm mt-2">—</div>)}
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs text-muted-foreground">{t("telegram_zips")}</Label>
              <label className="inline-flex items-center gap-2 cursor-pointer text-sm border rounded px-3 py-1.5 hover:bg-muted">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {t("upload_zip")}
                <input type="file" accept=".zip" className="hidden" onChange={onUpload} disabled={uploading} />
              </label>
            </div>
            {zips.length === 0 ? (
              <div className="text-muted-foreground text-sm">{t("no_data")}</div>
            ) : (
              <div className="space-y-2">
                {zips.map((p, i) => {
                  const fileName = p.split("/").pop() || p;
                  return (
                    <div key={p} className="flex items-center gap-2 border rounded px-3 py-2">
                      <FileArchive className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 truncate text-sm">Archive #{i + 1} — {fileName}</div>
                      <Button size="sm" variant="outline" onClick={() => viewArchive(p)}><ExternalLink className="h-3 w-3 mr-1" />{t("view")}</Button>
                      <Button size="sm" variant="outline" onClick={() => downloadZip(p)}><Download className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => removeZip(p)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs text-muted-foreground">Google Drive arxivlari</Label>
              <label className="inline-flex items-center gap-2 cursor-pointer text-sm border rounded px-3 py-1.5 hover:bg-muted">
                {uploadingDrive ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Drive'ga yuklash
                <input type="file" className="hidden" onChange={onUploadDrive} disabled={uploadingDrive} />
              </label>
            </div>
            {driveUrls.length === 0 ? (
              <div className="text-muted-foreground text-sm">{t("no_data")}</div>
            ) : (
              <div className="space-y-2">
                {driveUrls.map((u, i) => (
                  <div key={u} className="flex items-center gap-2 border rounded px-3 py-2">
                    <FileArchive className="h-4 w-4 text-muted-foreground" />
                    <a href={u} target="_blank" rel="noreferrer" className="flex-1 truncate text-sm text-primary hover:underline">Drive arxiv #{i + 1}</a>
                    <Button size="sm" variant="outline" onClick={() => window.open(u, "_blank")}><ExternalLink className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => removeDriveUrl(u)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && closeViewer()}>
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 flex flex-col">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center gap-2"><FileArchive className="h-4 w-4" />{t("telegram_chat")}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden bg-muted/20">
            {loadingArchive ? (
              <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : archiveHtml ? (
              <iframe title="telegram-archive" srcDoc={archiveHtml} sandbox="allow-same-origin allow-popups" className="w-full h-full bg-white" />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ SETTINGS (delete months) ============
export function SettingsTab({ clientId }: { clientId: string }) {
  const { t } = useTranslation();
  const [months, setMonths] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase.from("monthly_results").select("id,year,month").eq("client_id", clientId).order("year", { ascending: false }).order("month", { ascending: false });
    if (data) setMonths(data);
  };
  useEffect(() => { load(); }, [clientId]);

  const del = async (id: string) => {
    if (!confirm(t("confirm_delete"))) return;
    const { error } = await supabase.from("monthly_results").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(t("deleted"));
    load();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-3">{t("manage_months")}</h3>
          {months.length === 0 ? (
            <div className="text-muted-foreground text-sm">{t("no_data")}</div>
          ) : (
            <div className="space-y-2">
              {months.map(m => (
                <div key={m.id} className="flex items-center justify-between border rounded px-3 py-2">
                  <div className="font-medium">{MONTHS[m.month - 1]} {m.year}</div>
                  <Button size="sm" variant="ghost" onClick={() => del(m.id)}>
                    <Trash2 className="h-4 w-4 text-destructive mr-1" />{t("delete")}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}