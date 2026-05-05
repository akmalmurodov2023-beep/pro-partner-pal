import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Tag, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/workers")({ component: () => <AppLayout><WorkersPage /></AppLayout> });

type Worker = {
  id: string;
  full_name: string;
  passport_series_number: string | null;
  plastic_card_info: string | null;
  phone_number: string | null;
  telegram_username: string | null;
  position: string | null;
  residence_address: string | null;
  temp_living_addresses: string[] | null;
  e_signature_key: string | null;
  social_media_assets: any;
};

type Promo = { id: string; code: string; worker_id: string };

const empty: Partial<Worker> = {
  full_name: "", passport_series_number: "", plastic_card_info: "", phone_number: "",
  telegram_username: "", position: "", residence_address: "", temp_living_addresses: [],
  e_signature_key: "", social_media_assets: { bots: [], channels: [], sites: [] },
};

function WorkersPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Worker[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Worker> | null>(null);
  const [tempAddrs, setTempAddrs] = useState("");
  const [socialJson, setSocialJson] = useState("");
  const [newPromo, setNewPromo] = useState("");

  const load = async () => {
    const [w, p] = await Promise.all([
      supabase.from("workers").select("*").order("created_at", { ascending: false }),
      supabase.from("promocodes").select("*"),
    ]);
    if (w.data) setRows(w.data as Worker[]);
    if (p.data) setPromos(p.data as Promo[]);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(empty);
    setTempAddrs("");
    setSocialJson(JSON.stringify(empty.social_media_assets, null, 2));
    setOpen(true);
  };
  const openEdit = (w: Worker) => {
    setEditing(w);
    setTempAddrs((w.temp_living_addresses || []).join("\n"));
    setSocialJson(JSON.stringify(w.social_media_assets || {}, null, 2));
    setOpen(true);
  };

  const save = async () => {
    if (!editing?.full_name) { toast.error(t("error")); return; }
    let parsedSocial: any = {};
    try { parsedSocial = socialJson ? JSON.parse(socialJson) : {}; } catch { toast.error("JSON: " + t("error")); return; }
    const payload = {
      full_name: editing.full_name,
      passport_series_number: editing.passport_series_number || null,
      plastic_card_info: editing.plastic_card_info || null,
      phone_number: editing.phone_number || null,
      telegram_username: editing.telegram_username || null,
      position: editing.position || null,
      residence_address: editing.residence_address || null,
      temp_living_addresses: tempAddrs.split("\n").map(s => s.trim()).filter(Boolean),
      e_signature_key: editing.e_signature_key || null,
      social_media_assets: parsedSocial,
    };
    if (editing.id) {
      const { error } = await supabase.from("workers").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("workers").insert(payload);
      if (error) return toast.error(error.message);
    }
    toast.success(t("saved"));
    setOpen(false);
    load();
  };

  const del = async (id: string) => {
    if (!confirm(t("confirm_delete"))) return;
    const { error } = await supabase.from("workers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(t("deleted"));
    load();
  };

  const addPromo = async () => {
    if (!editing?.id || !newPromo.trim()) return;
    const { error } = await supabase.from("promocodes").insert({ code: newPromo.trim(), worker_id: editing.id });
    if (error) return toast.error(error.message);
    setNewPromo("");
    load();
  };
  const delPromo = async (id: string) => {
    await supabase.from("promocodes").delete().eq("id", id);
    load();
  };

  const filtered = rows.filter(r => {
    const s = search.toLowerCase();
    return !s || r.full_name.toLowerCase().includes(s) || (r.phone_number || "").includes(s) || (r.telegram_username || "").toLowerCase().includes(s);
  });
  const workerPromos = (id: string) => promos.filter(p => p.worker_id === id);

  return (
    <div>
      <PageHeader title={t("workers")} action={
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />{t("add")}</Button>
      } />
      <div className="mb-4">
        <Input placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      </div>
      <div className="border rounded-lg bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("full_name")}</TableHead>
              <TableHead>{t("position")}</TableHead>
              <TableHead>{t("phone")}</TableHead>
              <TableHead>{t("telegram")}</TableHead>
              <TableHead>{t("promocodes")}</TableHead>
              <TableHead className="text-right">{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t("no_data")}</TableCell></TableRow>
            )}
            {filtered.map(w => (
              <TableRow key={w.id}>
                <TableCell className="font-medium">{w.full_name}</TableCell>
                <TableCell>{w.position}</TableCell>
                <TableCell>{w.phone_number}</TableCell>
                <TableCell>{w.telegram_username}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {workerPromos(w.id).map(p => <Badge key={p.id} variant="secondary"><Tag className="h-3 w-3 mr-1" />{p.code}</Badge>)}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(w)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => del(w.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? t("edit") : t("add")} — {t("workers")}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-4">
              <Field label={t("full_name") + " *"}><Input value={editing.full_name || ""} onChange={(e) => setEditing({ ...editing, full_name: e.target.value })} /></Field>
              <Field label={t("position")}><Input value={editing.position || ""} onChange={(e) => setEditing({ ...editing, position: e.target.value })} /></Field>
              <Field label={t("passport")}><Input value={editing.passport_series_number || ""} onChange={(e) => setEditing({ ...editing, passport_series_number: e.target.value })} /></Field>
              <Field label={t("plastic_card")}><Input value={editing.plastic_card_info || ""} onChange={(e) => setEditing({ ...editing, plastic_card_info: e.target.value })} /></Field>
              <Field label={t("phone")}><Input value={editing.phone_number || ""} onChange={(e) => setEditing({ ...editing, phone_number: e.target.value })} /></Field>
              <Field label={t("telegram")}><Input value={editing.telegram_username || ""} onChange={(e) => setEditing({ ...editing, telegram_username: e.target.value })} /></Field>
              <Field label={t("residence")} className="col-span-2"><Input value={editing.residence_address || ""} onChange={(e) => setEditing({ ...editing, residence_address: e.target.value })} /></Field>
              <Field label={t("temp_addresses")} className="col-span-2"><Textarea rows={2} value={tempAddrs} onChange={(e) => setTempAddrs(e.target.value)} placeholder="One per line" /></Field>
              <Field label={t("e_signature")} className="col-span-2"><Textarea rows={2} value={editing.e_signature_key || ""} onChange={(e) => setEditing({ ...editing, e_signature_key: e.target.value })} /></Field>
              <Field label={t("social_assets")} className="col-span-2">
                <Textarea rows={6} className="font-mono text-xs" value={socialJson} onChange={(e) => setSocialJson(e.target.value)} />
              </Field>

              {editing.id && (
                <div className="col-span-2 border-t pt-4">
                  <Label className="mb-2 block">{t("promocodes")}</Label>
                  <div className="flex gap-2 mb-2">
                    <Input placeholder="MURODOV20" value={newPromo} onChange={(e) => setNewPromo(e.target.value)} />
                    <Button type="button" onClick={addPromo}>{t("add_promocode")}</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {workerPromos(editing.id).map(p => (
                      <Badge key={p.id} variant="secondary" className="gap-1">
                        {p.code}
                        <button onClick={() => delPromo(p.id)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
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

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={"space-y-1 " + (className || "")}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}