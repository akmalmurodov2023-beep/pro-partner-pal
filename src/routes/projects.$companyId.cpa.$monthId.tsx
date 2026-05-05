import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, X, Download, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { openFile } from "@/lib/storage";
import { MONTHS } from "@/components/company/sections";
import { toast } from "sonner";

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

  const filtered = rows
    .map((r: any, i: number) => ({ row: r, idx: i }))
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
    if (editIdx === null) next.push(entry); else next[editIdx] = entry;
    await persist(next);
    setDlgOpen(false);
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
            <Button key={i} size="sm" variant="outline" onClick={() => openFile(p)}>
              <Download className="h-3 w-3 mr-1" />File {i + 1}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />{t("add_entry")}</Button>
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
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">{t("no_data")}</TableCell></TableRow>
              ) : filtered.map(({ row: b, idx: i }) => {
                const expected = Number(b.salary || 0);
                const paid = Number(b.paid_amount || 0) || paidForWorker(b.worker || "");
                const ok = b.paid_status === "paid" || (paid >= expected && expected > 0);
                return (
                  <TableRow key={i} className="cursor-pointer" onDoubleClick={() => openEdit(i)}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-medium">{b.worker || "—"}</TableCell>
                    <TableCell>{b.promo_code || "—"}</TableCell>
                    <TableCell>{b.results || "—"}</TableCell>
                    <TableCell className="text-right">{fmt(expected)}</TableCell>
                    <TableCell className="text-right">{fmt(paid)}</TableCell>
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
                    <TableCell className="text-right">
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
              <Select value={form.worker_id} onValueChange={(v) => setForm({ ...form, worker_id: v })}>
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