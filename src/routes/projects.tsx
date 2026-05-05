import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Upload, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { uploadFile, openFile } from "@/lib/storage";
import { toast } from "sonner";

export const Route = createFileRoute("/projects")({ component: () => <AppLayout><Projects /></AppLayout> });

type P = { id: string; client_id: string | null; project_name: string | null; contract_url: string | null; invoice_url: string | null; status: string };

function Projects() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<P[]>([]);
  const [clients, setClients] = useState<{ id: string; company_name: string }[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<P> | null>(null);

  const load = async () => {
    const [p, c] = await Promise.all([
      supabase.from("projects").select("*").order("created_at", { ascending: false }),
      supabase.from("clients").select("id,company_name"),
    ]);
    if (p.data) setRows(p.data as P[]);
    if (c.data) setClients(c.data as any);
  };
  useEffect(() => { load(); }, []);

  const clientName = (id: string | null) => clients.find(c => c.id === id)?.company_name || "—";

  const save = async () => {
    if (!editing) return;
    const payload = {
      client_id: editing.client_id || null,
      project_name: editing.project_name || null,
      contract_url: editing.contract_url || null,
      invoice_url: editing.invoice_url || null,
      status: editing.status || "active",
    };
    const r = editing.id
      ? await supabase.from("projects").update(payload).eq("id", editing.id)
      : await supabase.from("projects").insert(payload);
    if (r.error) return toast.error(r.error.message);
    toast.success(t("saved")); setOpen(false); load();
  };

  const del = async (id: string) => {
    if (!confirm(t("confirm_delete"))) return;
    await supabase.from("projects").delete().eq("id", id);
    load();
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: "contract_url" | "invoice_url") => {
    const file = e.target.files?.[0]; if (!file || !editing) return;
    try {
      const path = await uploadFile(`projects/${field}`, file);
      setEditing({ ...editing, [field]: path });
      toast.success(t("saved"));
    } catch (err: any) { toast.error(err.message); }
  };

  const filtered = rows.filter(r => !search || (r.project_name || "").toLowerCase().includes(search.toLowerCase()) || clientName(r.client_id).toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader title={t("projects")} action={
        <Button onClick={() => { setEditing({ status: "active" }); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />{t("add")}</Button>
      } />
      <div className="mb-4"><Input placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" /></div>
      <div className="border rounded-lg bg-card overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>{t("project_name")}</TableHead>
            <TableHead>{t("client")}</TableHead>
            <TableHead>{t("contract")}</TableHead>
            <TableHead>{t("invoice")}</TableHead>
            <TableHead>{t("status")}</TableHead>
            <TableHead className="text-right">{t("actions")}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t("no_data")}</TableCell></TableRow>}
            {filtered.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.project_name}</TableCell>
                <TableCell>{clientName(p.client_id)}</TableCell>
                <TableCell>{p.contract_url ? <Button size="sm" variant="ghost" onClick={() => openFile(p.contract_url!)}><FileText className="h-4 w-4" /></Button> : "—"}</TableCell>
                <TableCell>{p.invoice_url ? <Button size="sm" variant="ghost" onClick={() => openFile(p.invoice_url!)}><FileText className="h-4 w-4" /></Button> : "—"}</TableCell>
                <TableCell><Badge variant="secondary">{p.status}</Badge></TableCell>
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
          <DialogHeader><DialogTitle>{t("projects")}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1"><Label>{t("project_name")}</Label><Input value={editing.project_name || ""} onChange={(e) => setEditing({ ...editing, project_name: e.target.value })} /></div>
              <div className="space-y-1"><Label>{t("client")}</Label>
                <Select value={editing.client_id || ""} onValueChange={(v) => setEditing({ ...editing, client_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>{t("status")}</Label>
                <Select value={editing.status || "active"} onValueChange={(v) => setEditing({ ...editing, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">active</SelectItem>
                    <SelectItem value="completed">completed</SelectItem>
                    <SelectItem value="paused">paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <FileUpload label={t("contract") + " (PDF)"} value={editing.contract_url} onChange={(e) => onUpload(e, "contract_url")} onOpen={() => editing.contract_url && openFile(editing.contract_url)} />
              <FileUpload label={t("invoice") + " (PDF)"} value={editing.invoice_url} onChange={(e) => onUpload(e, "invoice_url")} onOpen={() => editing.invoice_url && openFile(editing.invoice_url)} />
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

function FileUpload({ label, value, onChange, onOpen }: { label: string; value: string | null | undefined; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; onOpen: () => void }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <label className="inline-flex items-center gap-2 cursor-pointer text-sm border rounded px-3 py-1.5 hover:bg-muted">
          <Upload className="h-4 w-4" />Upload
          <input type="file" className="hidden" onChange={onChange} />
        </label>
        {value && <Button type="button" size="sm" variant="outline" onClick={onOpen}><FileText className="h-3 w-3 mr-1" />Open</Button>}
      </div>
    </div>
  );
}