import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, X, Download, Plus, Search, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { openFile, uploadFile } from "@/lib/storage";
import { MONTHS } from "@/components/company/sections";
import { toast } from "sonner";
import { notifyPaymentConfirmed, notifyNewResult } from "@/lib/notify";

export const Route = createFileRoute("/projects/$companyId/cpa/$monthId")({
  component: MonthDetailPage,
});

const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (n: number | string) => {
  const num = Number(String(n).replace(/\s/g, "")) || 0;
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};
const parseNum = (s: string) => Number(String(s).replace(/\s/g, "")) || 0;

function MonthDetailPage() {
  const { t } = useTranslation();
  const { companyId, monthId } = Route.useParams();
  const [month, setMonth] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dlgOpen, setDlgOpen] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [form, setForm] = useState<any>({ worker_id: "", promo_code: "", results: "", salary: "", paid_amount: "", paid_status: "unpaid" });

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
        supabase.from("project_workers").select("worker_id, promo_code").eq("client_id", companyId),
      ]);
      setPayments(p.data || []);
      const ids = (w.data || []).map((r: any) => r.worker_id);
      let workersList: any[] = [];
      if (ids.length) {
        const { data: ws } = await supabase.from("workers").select("id, full_name").in("id", ids);
        const promoMap = new Map((w.data || []).map((r: any) => [r.worker_id, r.promo_code]));
        workersList = (ws || []).map(x => ({ ...x, promo_code: promoMap.get(x.id) || "" }));
      }
      setWorkers(workersList);
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

  const filtered = rows
    .map((r: any, i: number) => ({ row: r, idx: i }))
    .sort((a, b) => (Number(b.row.results) || 0) - (Number(a.row.results) || 0))
    .filter(({ row }) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return [row.worker, row.promo_code, row.results].some((v: any) => String(v || "").toLowerCase().includes(q));
    });

  const openAdd = () => {
    setEditIdx(null);
    setForm({ worker_id: "", promo_code: "", results: "", salary: "", paid_amount: "", paid_status: "unpaid" });
    setDlgOpen(true);
  };
  const openEdit = (i: number) => {
    const r = rows[i];
    const w = workers.find(x => (x.full_name || "").trim().toLowerCase() === String(r.worker || "").trim().toLowerCase());
    setEditIdx(i);
    setForm({
      worker_id: w?.id || "",
      promo_code: r.promo_code || "",
      results: r.results || "",
      salary: fmt(r.salary || 0),
      paid_amount: fmt(r.paid_amount || 0),
      paid_status: r.paid_status || "unpaid",
    });
    setDlgOpen(true);
  };

  const persist = async (next: any[]) => {
    const { error } = await supabase.from("monthly_results").update({ results_table_data: next }).eq("id", monthId);
    if (error) return toast.error(error.message);
    setMonth({ ...month, results_table_data: next });
    toast.success(t("saved"));
  };

  const save = async () => {
    const w = workers.find(x => x.id === form.worker_id);
    if (!w) return toast.error(t("select_blogger"));
    const entry = {
      worker: w.full_name,
      promo_code: form.promo_code || "",
      results: form.results || "",
      salary: parseNum(form.salary),
      paid_amount: parseNum(form.paid_amount),
      paid_status: form.paid_status || "unpaid",
    };
    const next = [...rows];
    const isNew = editIdx === null;
    const prev = isNew ? null : rows[editIdx!];
    if (isNew) next.push(entry); else next[editIdx!] = entry;
    await persist(next);
    setDlgOpen(false);
    // Triggers
    try {
      if (isNew && entry.results) {
        await notifyNewResult({
          workerId: w.id,
          clientId: companyId,
          month: month.month,
          results: entry.results,
        });
      }
      const wasPaid = prev?.paid_status === "paid";
      const nowPaid = entry.paid_status === "paid";
      if (!wasPaid && nowPaid) {
        await notifyPaymentConfirmed({
          workerId: w.id,
          clientId: companyId,
          month: month.month,
          year: month.year,
          amount: entry.paid_amount || entry.salary,
        });
      }
    } catch (e) {
      console.error("notify error", e);
    }
  };

  const removeRow = async (i: number) => {
    if (!confirm(t("confirm_delete"))) return;
    const next = rows.filter((_, idx) => idx !== i);
    await persist(next);
  };

  return (
    <div>
      <Link to="/projects/$companyId/$section" params={{ companyId, section: "cpa" }} className="inline-flex items-center text-sm text-muted-foreground hover:underline mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />{t("back")}
      </Link>
      <div className="flex items-start justify-between gap-3 mb-4">
        <PageHeader title={month ? `${MONTHS[month.month - 1]} ${month.year} — ${t("results")}` : t("results")} />
        <div className="flex items-center gap-2">
          {docs.map((p, i) => (
            <ContextMenu key={i}>
              <ContextMenuTrigger asChild>
                <Button size="sm" variant="outline" onClick={() => openFile(p)}>
                  <Download className="h-3 w-3 mr-1" />File {i + 1}
                </Button>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem
                  className="text-destructive"
                  onClick={async () => {
                    if (!confirm(t("confirm_delete"))) return;
                    const next = docs.filter((_, idx) => idx !== i);
                    const { error } = await supabase.from("monthly_results").update({ uploaded_docs_urls: next }).eq("id", monthId);
                    if (error) return toast.error(error.message);
                    await supabase.storage.from("documents").remove([p]);
                    setMonth({ ...month, uploaded_docs_urls: next });
                    toast.success(t("saved"));
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />{t("delete")}
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
          <label>
            <input
              type="file"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  const path = await uploadFile(`monthly_results/${monthId}`, f);
                  const next = [...docs, path];
                  const { error } = await supabase.from("monthly_results").update({ uploaded_docs_urls: next }).eq("id", monthId);
                  if (error) throw error;
                  setMonth({ ...month, uploaded_docs_urls: next });
                  toast.success(t("saved"));
                } catch (err: any) {
                  toast.error(err.message);
                }
                e.target.value = "";
              }}
            />
            <Button size="sm" variant="outline" asChild>
              <span className="cursor-pointer"><Upload className="h-3 w-3 mr-1" />{t("upload")}</span>
            </Button>
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />{t("add_entry")}</Button>
      </div>

      {month && (() => {
        const total = rows.reduce((s: number, r: any) => s + (Number(r.salary) || 0), 0);
        const paidTotal = rows.reduce((s: number, r: any) => s + ((Number(r.paid_amount) || 0) || paidForWorker(r.worker || "")), 0);
        const profit = total - paidTotal;
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="border bg-card p-4">
              <div className="text-xs text-muted-foreground">{t("total_amount")}</div>
              <div className="text-2xl font-semibold mt-1">{fmt(total)}</div>
            </div>
            <div className="border bg-card p-4">
              <div className="text-xs text-muted-foreground">{t("total_paid")}</div>
              <div className="text-2xl font-semibold mt-1 text-green-600">{fmt(paidTotal)}</div>
            </div>
            <div className="border bg-card p-4">
              <div className="text-xs text-muted-foreground">{t("profit")}</div>
              <div className={`text-2xl font-semibold mt-1 ${profit > 0 ? "text-destructive" : "text-foreground"}`}>{fmt(profit)}</div>
            </div>
          </div>
        );
      })()}

      {loading ? (
        <div className="text-muted-foreground text-sm">...</div>
      ) : !month ? (
        <div className="text-muted-foreground text-sm">{t("no_data")}</div>
      ) : (
        <div className="border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4 py-3">#</TableHead>
                <TableHead className="px-4 py-3">{t("bloggers")}</TableHead>
                <TableHead className="px-4 py-3">{t("promocode")}</TableHead>
                <TableHead className="px-4 py-3">{t("results")}</TableHead>
                <TableHead className="px-4 py-3 text-right">{t("amount")}</TableHead>
                <TableHead className="px-4 py-3 text-right">{t("paid")}</TableHead>
                <TableHead className="px-4 py-3 text-center">{t("status")}</TableHead>
                <TableHead className="px-4 py-3 text-right">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">{t("no_data")}</TableCell></TableRow>
              ) : filtered.map(({ row: b, idx: i }) => {
                const expected = Number(b.salary || 0);
                const paid = Number(b.paid_amount || 0) || paidForWorker(b.worker || "");
                const ok = b.paid_status === "paid";
                return (
                  <TableRow key={i} className="cursor-pointer" onClick={() => openEdit(i)}>
                    <TableCell className="px-4 py-3">{i + 1}</TableCell>
                    <TableCell className="px-4 py-3 font-medium">{b.worker || "—"}</TableCell>
                    <TableCell className="px-4 py-3">
                      {b.promo_code ? (
                        <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 text-primary px-3 py-1 text-xs font-medium">
                          {b.promo_code}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="px-4 py-3">{b.results || "—"}</TableCell>
                    <TableCell className="px-4 py-3 text-right">{fmt(expected)}</TableCell>
                    <TableCell className="px-4 py-3 text-right">{fmt(paid)}</TableCell>
                    <TableCell className="px-4 py-3 text-center">
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
                    <TableCell className="px-4 py-3 text-right">
                      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); removeRow(i); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dlgOpen} onOpenChange={setDlgOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editIdx === null ? t("add_entry") : t("edit")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t("bloggers")}</Label>
              <Select value={form.worker_id} onValueChange={(v) => {
                const w = workers.find(x => x.id === v);
                setForm((f: any) => ({
                  ...f,
                  worker_id: v,
                  promo_code: f.promo_code || w?.promo_code || "",
                }));
              }}>
                <SelectTrigger><SelectValue placeholder={t("select_blogger")} /></SelectTrigger>
                <SelectContent>
                  {workers.map(w => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("promocode")}</Label>
              <Input value={form.promo_code} onChange={(e) => setForm({ ...form, promo_code: e.target.value })} />
            </div>
            <div>
              <Label>{t("results")}</Label>
              <Input value={form.results} onChange={(e) => setForm({ ...form, results: e.target.value })} />
            </div>
            <div>
              <Label>{t("amount")}</Label>
              <Input inputMode="numeric" value={form.salary} onChange={(e) => setForm({ ...form, salary: fmt(e.target.value) })} />
            </div>
            <div>
              <Label>{t("paid")}</Label>
              <Input inputMode="numeric" value={form.paid_amount} onChange={(e) => setForm({ ...form, paid_amount: fmt(e.target.value) })} />
            </div>
            <div>
              <Label>{t("paid_status")}</Label>
              <Select value={form.paid_status} onValueChange={(v) => setForm({ ...form, paid_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">{t("paid_yes")}</SelectItem>
                  <SelectItem value="unpaid">{t("paid_no")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDlgOpen(false)}>{t("cancel")}</Button>
            <Button onClick={save}>{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}