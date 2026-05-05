import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, ArrowRight, Upload, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadFile, getSignedUrl } from "@/lib/storage";
import { toast } from "sonner";

export const Route = createFileRoute("/clients")({ component: () => <AppLayout><ClientsPage /></AppLayout> });

type Client = { id: string; company_name: string; inn: string | null; bank_account: string | null; telegram_archive_link: string | null; logo_url: string | null };

function ClientsPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Client> | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUrls, setLogoUrls] = useState<Record<string, string>>({});

  const load = async () => {
    const { data } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
    if (data) {
      setRows(data as Client[]);
      const urls: Record<string, string> = {};
      await Promise.all((data as Client[]).map(async (c) => {
        if (c.logo_url) { const u = await getSignedUrl(c.logo_url); if (u) urls[c.id] = u; }
      }));
      setLogoUrls(urls);
    }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.company_name) return toast.error(t("error"));
    const payload = {
      company_name: editing.company_name,
      inn: editing.inn || null,
      bank_account: editing.bank_account || null,
      telegram_archive_link: editing.telegram_archive_link || null,
      logo_url: editing.logo_url || null,
    };
    const r = editing.id
      ? await supabase.from("clients").update(payload).eq("id", editing.id)
      : await supabase.from("clients").insert(payload);
    if (r.error) return toast.error(r.error.message);
    toast.success(t("saved")); setOpen(false); load();
  };

  const del = async (id: string) => {
    if (!confirm(t("confirm_delete"))) return;
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(t("deleted")); load();
  };

  const onLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !editing) return;
    try {
      const path = await uploadFile("clients/logos", file);
      setEditing({ ...editing, logo_url: path });
      const u = await getSignedUrl(path);
      setLogoPreview(u);
    } catch (err: any) { toast.error(err.message); }
  };

  const openEdit = async (c: Client) => {
    setEditing(c);
    setLogoPreview(c.logo_url ? await getSignedUrl(c.logo_url) : null);
    setOpen(true);
  };
  const openNew = () => {
    setEditing({ company_name: "", inn: "", bank_account: "", telegram_archive_link: "", logo_url: "" });
    setLogoPreview(null);
    setOpen(true);
  };

  const filtered = rows.filter(r => !search || r.company_name.toLowerCase().includes(search.toLowerCase()) || (r.inn || "").includes(search));

  return (
    <div>
      <PageHeader title={t("clients")} action={
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />{t("add")}</Button>
      } />
      <div className="mb-4"><Input placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" /></div>
      <div className="border rounded-lg bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">{t("logo")}</TableHead>
              <TableHead>{t("company")}</TableHead>
              <TableHead>{t("inn")}</TableHead>
              <TableHead>{t("bank_account")}</TableHead>
              <TableHead className="text-right">{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">{t("no_data")}</TableCell></TableRow>}
            {filtered.map(c => (
              <TableRow key={c.id}>
                <TableCell>
                  {logoUrls[c.id] ? <img src={logoUrls[c.id]} alt={c.company_name} className="h-10 w-10 rounded object-cover" /> : <div className="h-10 w-10 rounded bg-muted flex items-center justify-center"><Building2 className="h-4 w-4 text-muted-foreground" /></div>}
                </TableCell>
                <TableCell className="font-medium">
                  <Link to="/clients/$clientId" params={{ clientId: c.id }} className="hover:underline flex items-center gap-1">
                    {c.company_name} <ArrowRight className="h-3 w-3" />
                  </Link>
                </TableCell>
                <TableCell>{c.inn}</TableCell>
                <TableCell>{c.bank_account}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => del(c.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? t("edit") : t("add")} — {t("clients")}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>{t("logo")}</Label>
                <div className="flex items-center gap-3">
                  {logoPreview ? <img src={logoPreview} alt="logo" className="h-16 w-16 rounded object-cover border" /> : <div className="h-16 w-16 rounded bg-muted flex items-center justify-center border"><Building2 className="h-6 w-6 text-muted-foreground" /></div>}
                  <label className="inline-flex items-center gap-2 cursor-pointer text-sm border rounded px-3 py-1.5 hover:bg-muted">
                    <Upload className="h-4 w-4" />{t("upload")}
                    <input type="file" accept="image/*" className="hidden" onChange={onLogo} />
                  </label>
                </div>
              </div>
              <div className="space-y-1"><Label>{t("company")} *</Label><Input value={editing.company_name || ""} onChange={(e) => setEditing({ ...editing, company_name: e.target.value })} /></div>
              <div className="space-y-1"><Label>{t("inn")}</Label><Input value={editing.inn || ""} onChange={(e) => setEditing({ ...editing, inn: e.target.value })} /></div>
              <div className="space-y-1"><Label>{t("bank_account")}</Label><Input value={editing.bank_account || ""} onChange={(e) => setEditing({ ...editing, bank_account: e.target.value })} /></div>
              <div className="space-y-1"><Label>{t("telegram_archive")}</Label><Input value={editing.telegram_archive_link || ""} onChange={(e) => setEditing({ ...editing, telegram_archive_link: e.target.value })} /></div>
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