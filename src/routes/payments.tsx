import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Upload, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadFile, openFile } from "@/lib/storage";
import { toast } from "sonner";
import { MONTHS } from "@/components/company/sections";

export const Route = createFileRoute("/payments")({ component: () => <AppLayout><Payments /></AppLayout> });

type Pay = { id: string; worker_id: string | null; client_id: string | null; amount: number; payment_date: string; receipt_url: string | null; payment_type: string | null; notes: string | null; target_year: number | null; target_month: number | null; created_at?: string };

function Payments() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Pay[]>([]);
  const [workers, setWorkers] = useState<{ id: string; full_name: string }[]>([]);
  const [clients, setClients] = useState<{ id: string; company_name: string }[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Pay> | null>(null);

  const load = async () => {
    const [p, w, c] = await Promise.all([
      supabase.from("payments").select("*").order("created_at", { ascending: false }),
      supabase.from("workers").select("id,full_name"),
      supabase.from("clients").select("id,company_name"),
    ]);
    if (p.data) setRows(p.data as Pay[]);
    if (w.data) setWorkers(w.data as any);
    if (c.data) setClients(c.data as any);
  };
  useEffect(() => { load(); }, []);

  const wn = (id: string | null) => workers.find(x => x.id === id)?.full_name || "—";
  const cn = (id: string | null) => clients.find(x => x.id === id)?.company_name || "—";

  const save = async () => {
    if (!editing) return;
    const ty = Number(editing.target_year) || new Date().getFullYear();
    const tm = Number(editing.target_month) || (new Date().getMonth() + 1);
    const payload = {
      worker_id: editing.worker_id || null,
      client_id: editing.client_id || null,
      amount: Number(editing.amount) || 0,
      payment_date: editing.payment_date || new Date().toISOString().slice(0, 10),
      receipt_url: editing.receipt_url || null,
      payment_type: editing.payment_type || "cash",
      notes: editing.notes || null,
      target_year: ty,
      target_month: tm,
    };

    // Sync into corresponding CPA monthly_results row
    if (!editing.id && payload.client_id && payload.worker_id) {
      const { data: mr } = await supabase
        .from("monthly_results")
        .select("*")
        .eq("client_id", payload.client_id)
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
        paid_amount: Number(data[idx].paid_amount || 0) + payload.amount,
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

  const del = async (id: string) => {
    if (!confirm(t("confirm_delete"))) return;
    await supabase.from("payments").delete().eq("id", id);
    load();
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !editing) return;
    try {
      const path = await uploadFile("receipts", file);
      setEditing({ ...editing, receipt_url: path });
      toast.success(t("saved"));
    } catch (err: any) { toast.error(err.message); }
  };

  const filtered = rows.filter(r => !search || wn(r.worker_id).toLowerCase().includes(search.toLowerCase()) || cn(r.client_id).toLowerCase().includes(search.toLowerCase()));

  const now = new Date();
  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <div>
      <PageHeader title={t("payments")} action={
        <Button onClick={() => { setEditing({ payment_date: new Date().toISOString().slice(0, 10), amount: 0, payment_type: "cash", target_year: now.getFullYear(), target_month: now.getMonth() + 1 }); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />{t("add")}
        </Button>
      } />
      <div className="mb-4"><Input placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" /></div>
      <div className="border bg-card overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>{t("date")}</TableHead>
            <TableHead>{t("worker")}</TableHead>
            <TableHead>{t("project")}</TableHead>
            <TableHead>{t("amount")}</TableHead>
            <TableHead>{t("payment_type")}</TableHead>
            <TableHead>{t("receipt")}</TableHead>
            <TableHead className="text-right">{t("actions")}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">{t("no_data")}</TableCell></TableRow>}
            {filtered.map(p => (
              <TableRow key={p.id}>
                <TableCell>{p.payment_date}</TableCell>
                <TableCell>{wn(p.worker_id)}</TableCell>
                <TableCell>{cn(p.client_id)}</TableCell>
                <TableCell className="font-medium">{Number(p.amount).toLocaleString()}</TableCell>
                <TableCell>{p.payment_type === "card" ? t("card") : p.payment_type === "cash" ? t("cash") : (p.payment_type || "—")}</TableCell>
                <TableCell>{p.receipt_url ? <Button size="sm" variant="ghost" onClick={() => openFile(p.receipt_url!)}><FileText className="h-4 w-4" /></Button> : "—"}</TableCell>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>{t("worker")}</Label>
                <Select value={editing.worker_id || ""} onValueChange={(v) => setEditing({ ...editing, worker_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{workers.map(w => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>{t("project")}</Label>
                <Select value={editing.client_id || ""} onValueChange={(v) => setEditing({ ...editing, client_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>{t("amount")}</Label><Input type="number" step="0.01" value={editing.amount ?? 0} onChange={(e) => setEditing({ ...editing, amount: Number(e.target.value) })} /></div>
              <div className="space-y-1"><Label>{t("target_month")}</Label>
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
              <div className="space-y-1 col-span-2"><Label>{t("payment_type")}</Label>
                <Select value={editing.payment_type || "cash"} onValueChange={(v) => setEditing({ ...editing, payment_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{t("cash")}</SelectItem>
                    <SelectItem value="card">{t("card")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 col-span-2"><Label>{t("notes")}</Label><Textarea rows={2} value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></div>
              <div className="space-y-1 col-span-2">
                <Label>{t("receipt")}</Label>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-sm border rounded px-3 py-1.5 hover:bg-muted">
                    <Upload className="h-4 w-4" />{t("upload")}
                    <input type="file" className="hidden" onChange={onUpload} />
                  </label>
                  {editing.receipt_url && <Button type="button" size="sm" variant="outline" onClick={() => openFile(editing.receipt_url!)}><FileText className="h-3 w-3 mr-1" />{t("view")}</Button>}
                </div>
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