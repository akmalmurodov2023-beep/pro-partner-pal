import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Tag, X, Upload, FileText, Instagram, Send, Bot, Youtube, Globe, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AvatarCropper } from "@/components/AvatarCropper";
import { supabase } from "@/integrations/supabase/client";
import { uploadFile, openFile, getSignedUrls } from "@/lib/storage";
import { toast } from "sonner";

export const Route = createFileRoute("/workers/")({ component: () => <AppLayout><WorkersPage /></AppLayout> });

type Worker = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  passport_series_number: string | null;
  passport_number: string | null;
  birth_date: string | null;
  plastic_card_info: string | null;
  phone_number: string | null;
  telegram_username: string | null;
  position: string | null;
  residence_address: string | null;
  residence_file_url: string | null;
  passport_front_url: string | null;
  passport_back_url: string | null;
  temp_living_addresses: string[] | null;
  e_signature_file_url: string | null;
  e_signature_password: string | null;
  social_media_assets: any;
};

type Promo = { id: string; code: string; worker_id: string };

type SocialAssets = {
  instagram?: string[];
  telegram?: string[];
  telegram_bot?: string[];
  youtube?: string[];
  website?: string[];
  other?: string[];
};

const emptySocial: SocialAssets = { instagram: [], telegram: [], telegram_bot: [], youtube: [], website: [], other: [] };

const empty: Partial<Worker> = {
  full_name: "", avatar_url: "", passport_series_number: "", passport_number: "", birth_date: "", plastic_card_info: "", phone_number: "",
  telegram_username: "", position: "", residence_address: "", temp_living_addresses: [],
  residence_file_url: "", passport_front_url: "", passport_back_url: "",
  e_signature_file_url: "", e_signature_password: "",
  social_media_assets: emptySocial,
};

function formatPlasticCard(v: string) {
  const digits = v.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}
function formatPhone(v: string) {
  let d = v.replace(/\D/g, "");
  if (d.startsWith("998")) d = d.slice(3);
  d = d.slice(0, 9);
  let out = "+998";
  if (d.length > 0) out += " " + d.slice(0, 2);
  if (d.length > 2) out += " " + d.slice(2, 5);
  if (d.length > 5) out += " " + d.slice(5, 7);
  if (d.length > 7) out += " " + d.slice(7, 9);
  return out;
}

function WorkersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Worker[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Worker> | null>(null);
  const [tempAddrs, setTempAddrs] = useState("");
  const [social, setSocial] = useState<SocialAssets>(emptySocial);
  const [newPromo, setNewPromo] = useState("");
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({});
  const [cropFile, setCropFile] = useState<File | null>(null);

  const load = async () => {
    const [w, p] = await Promise.all([
      supabase.from("workers").select("*").order("created_at", { ascending: false }),
      supabase.from("promocodes").select("*"),
    ]);
    if (w.data) setRows(w.data as Worker[]);
    if (p.data) setPromos(p.data as Promo[]);
    const paths = (w.data || []).map((x: any) => x.avatar_url).filter(Boolean) as string[];
    if (paths.length) setAvatarUrls(await getSignedUrls(paths));
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(empty);
    setTempAddrs("");
    setSocial(emptySocial);
    setOpen(true);
  };
  const openEdit = (w: Worker) => {
    setEditing(w);
    setTempAddrs((w.temp_living_addresses || []).join("\n"));
    setSocial({ ...emptySocial, ...(w.social_media_assets || {}) });
    setOpen(true);
  };

  const save = async () => {
    if (!editing?.full_name) { toast.error(t("error")); return; }
    const payload = {
      full_name: editing.full_name,
      avatar_url: editing.avatar_url || null,
      passport_series_number: editing.passport_series_number || null,
      passport_number: editing.passport_number || null,
      birth_date: editing.birth_date || null,
      plastic_card_info: editing.plastic_card_info || null,
      phone_number: editing.phone_number || null,
      telegram_username: editing.telegram_username || null,
      position: editing.position || null,
      residence_address: editing.residence_address || null,
      residence_file_url: editing.residence_file_url || null,
      passport_front_url: editing.passport_front_url || null,
      passport_back_url: editing.passport_back_url || null,
      temp_living_addresses: tempAddrs.split("\n").map(s => s.trim()).filter(Boolean),
      e_signature_file_url: editing.e_signature_file_url || null,
      e_signature_password: editing.e_signature_password || null,
      social_media_assets: social,
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
    if (!confirm(t("confirm_delete"))) return;
    await supabase.from("promocodes").delete().eq("id", id);
    load();
  };

  const filtered = rows.filter(r => {
    const s = search.toLowerCase();
    return !s || r.full_name.toLowerCase().includes(s) || (r.phone_number || "").includes(s) || (r.telegram_username || "").toLowerCase().includes(s);
  });
  const workerPromos = (id: string) => promos.filter(p => p.worker_id === id);

  const uploadTo = (folder: string, field: keyof Worker) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !editing) return;
    try {
      const path = await uploadFile(folder, file);
      setEditing({ ...editing, [field]: path } as any);
      toast.success(t("saved"));
    } catch (err: any) { toast.error(err.message); }
  };

  const onCropDone = async (blob: Blob) => {
    if (!editing) return;
    try {
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      const path = await uploadFile("workers/avatar", file);
      setEditing({ ...editing, avatar_url: path } as any);
      const u = await getSignedUrls([path]);
      setAvatarUrls((prev) => ({ ...prev, ...u }));
      setCropFile(null);
      toast.success(t("saved"));
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div>
      <PageHeader title={t("workers")} action={
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />{t("add")}</Button>
      } />
      <div className="mb-4">
        <Input placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      </div>
      <div className="border bg-card overflow-x-auto">
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
              <TableRow key={w.id} className="cursor-pointer" onClick={() => navigate({ to: "/workers/$workerId", params: { workerId: w.id } })}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      {w.avatar_url && avatarUrls[w.avatar_url] && <AvatarImage src={avatarUrls[w.avatar_url]} alt={w.full_name} />}
                      <AvatarFallback>{(w.full_name || "?").charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span>{w.full_name}</span>
                  </div>
                </TableCell>
                <TableCell>{w.position}</TableCell>
                <TableCell>{w.phone_number}</TableCell>
                <TableCell>{w.telegram_username}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {workerPromos(w.id).map(p => <Badge key={p.id} variant="secondary"><Tag className="h-3 w-3 mr-1" />{p.code}</Badge>)}
                  </div>
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(w); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); del(w.id); }}><Trash2 className="h-4 w-4" /></Button>
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
              <div className="col-span-2 flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  {editing.avatar_url && <AvatarImage src={avatarUrls[editing.avatar_url] || ""} alt="avatar" />}
                  <AvatarFallback>{(editing.full_name || "?").charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <label className="inline-flex items-center gap-2 cursor-pointer text-sm border rounded px-3 py-1.5 hover:bg-muted">
                    <Upload className="h-4 w-4" />Profil rasmi
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setCropFile(f); e.target.value = ""; }} />
                  </label>
                  {editing.avatar_url && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => setEditing({ ...editing, avatar_url: "" })} className="ml-2">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <Field label={t("full_name") + " *"}><Input value={editing.full_name || ""} onChange={(e) => setEditing({ ...editing, full_name: e.target.value })} /></Field>
              <Field label={t("birth_date")}><Input type="date" value={editing.birth_date || ""} onChange={(e) => setEditing({ ...editing, birth_date: e.target.value })} /></Field>
              <Field label={t("position")}><Input value={editing.position || ""} onChange={(e) => setEditing({ ...editing, position: e.target.value })} /></Field>
              <Field label={t("passport")}><Input value={editing.passport_series_number || ""} onChange={(e) => setEditing({ ...editing, passport_series_number: e.target.value })} placeholder="AA" /></Field>
              <Field label={t("passport_number")}><Input value={editing.passport_number || ""} onChange={(e) => setEditing({ ...editing, passport_number: e.target.value.replace(/\D/g,"").slice(0,7) })} placeholder="1234567" /></Field>
              <Field label={t("passport_front")}>
                <FileUploadField path={editing.passport_front_url} onChange={uploadTo("workers/passport", "passport_front_url")} onClear={() => setEditing({ ...editing, passport_front_url: "" })} />
              </Field>
              <Field label={t("passport_back")}>
                <FileUploadField path={editing.passport_back_url} onChange={uploadTo("workers/passport", "passport_back_url")} onClear={() => setEditing({ ...editing, passport_back_url: "" })} />
              </Field>
              <Field label={t("plastic_card")} className="col-span-2"><Input value={editing.plastic_card_info || ""} onChange={(e) => setEditing({ ...editing, plastic_card_info: formatPlasticCard(e.target.value) })} placeholder="0000 0000 0000 0000" inputMode="numeric" /></Field>
              <Field label={t("phone")}><Input value={editing.phone_number || ""} onFocus={(e) => { if (!editing.phone_number) setEditing({ ...editing, phone_number: "+998 " }); }} onChange={(e) => setEditing({ ...editing, phone_number: formatPhone(e.target.value) })} placeholder="+998 XX XXX XX XX" inputMode="tel" /></Field>
              <Field label={t("telegram")}><Input value={editing.telegram_username || ""} onChange={(e) => setEditing({ ...editing, telegram_username: e.target.value })} /></Field>
              <Field label={t("residence")} className="col-span-2"><Input value={editing.residence_address || ""} onChange={(e) => setEditing({ ...editing, residence_address: e.target.value })} /></Field>
              <Field label={t("residence_file")} className="col-span-2">
                <FileUploadField path={editing.residence_file_url} onChange={uploadTo("workers/residence", "residence_file_url")} onClear={() => setEditing({ ...editing, residence_file_url: "" })} />
              </Field>
              <Field label={t("temp_addresses")} className="col-span-2"><Input maxLength={180} value={tempAddrs} onChange={(e) => setTempAddrs(e.target.value.slice(0,180))} placeholder="Max 180 belgi" /></Field>
              <Field label={t("e_signature_file")}>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-sm border rounded px-3 py-1.5 hover:bg-muted">
                    <Upload className="h-4 w-4" />{t("upload")}
                    <input type="file" className="hidden" onChange={uploadTo("workers/esignature", "e_signature_file_url")} />
                  </label>
                  {editing.e_signature_file_url && (
                    <Button type="button" size="sm" variant="outline" onClick={() => openFile(editing.e_signature_file_url!)}>
                      <FileText className="h-3 w-3 mr-1" />{t("view")}
                    </Button>
                  )}
                </div>
              </Field>
              <Field label={t("e_signature_password")}>
                <Input type="text" value={editing.e_signature_password || ""} onChange={(e) => setEditing({ ...editing, e_signature_password: e.target.value })} />
              </Field>

              <div className="col-span-2 border-t pt-4">
                <Label className="mb-2 block font-semibold">{t("social_assets")}</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
                  <LinkGroup icon={Instagram} label={t("instagram")} values={social.instagram || []} onChange={(v) => setSocial({ ...social, instagram: v })} />
                  <LinkGroup icon={Send} label={t("telegram_channel")} values={social.telegram || []} onChange={(v) => setSocial({ ...social, telegram: v })} />
                  <LinkGroup icon={Bot} label={t("telegram_bot")} values={social.telegram_bot || []} onChange={(v) => setSocial({ ...social, telegram_bot: v })} />
                  <LinkGroup icon={Youtube} label={t("youtube")} values={social.youtube || []} onChange={(v) => setSocial({ ...social, youtube: v })} />
                  <LinkGroup icon={Globe} label={t("website")} values={social.website || []} onChange={(v) => setSocial({ ...social, website: v })} />
                  <LinkGroup icon={Link2} label={t("other_link")} values={social.other || []} onChange={(v) => setSocial({ ...social, other: v })} />
                </div>
              </div>

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
      <AvatarCropper open={!!cropFile} file={cropFile} onCancel={() => setCropFile(null)} onDone={onCropDone} />
    </div>
  )
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={"space-y-1 " + (className || "")}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function FileUploadField({ path, onChange, onClear }: { path: string | null | undefined; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; onClear: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <label className="inline-flex items-center gap-2 cursor-pointer text-sm border rounded px-3 py-1.5 hover:bg-muted">
        <Upload className="h-4 w-4" />{t("upload")}
        <input type="file" className="hidden" onChange={onChange} />
      </label>
      {path && (
        <>
          <Button type="button" size="sm" variant="outline" onClick={() => openFile(path)}>
            <FileText className="h-3 w-3 mr-1" />{t("view")}
          </Button>
          <Button type="button" size="icon" variant="ghost" onClick={onClear}><X className="h-4 w-4" /></Button>
        </>
      )}
    </div>
  );
}

function LinkGroup({ icon: Icon, label, values, onChange }: { icon: any; label: string; values: string[]; onChange: (v: string[]) => void }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1">
      <Label className="text-xs flex items-center gap-1"><Icon className="h-3 w-3" />{label}</Label>
      <div className="space-y-1">
        {values.map((v, i) => (
          <div key={i} className="flex gap-1">
            <Input value={v} onChange={(e) => { const n = [...values]; n[i] = e.target.value; onChange(n); }} placeholder="https://..." />
            <Button type="button" size="icon" variant="ghost" onClick={() => onChange(values.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
          </div>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={() => onChange([...values, ""])}>
          <Plus className="h-3 w-3 mr-1" />{t("add_link")}
        </Button>
      </div>
    </div>
  );
}