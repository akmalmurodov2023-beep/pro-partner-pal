import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, FileText, Tag } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { openFile, getSignedUrl } from "@/lib/storage";

export const Route = createFileRoute("/workers/$workerId")({
  component: () => <AppLayout><WorkerProfile /></AppLayout>,
});

function WorkerProfile() {
  const { t } = useTranslation();
  const { workerId } = Route.useParams();
  const [w, setW] = useState<any>(null);
  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [wr, pr] = await Promise.all([
        supabase.from("workers").select("*").eq("id", workerId).maybeSingle(),
        supabase.from("promocodes").select("*").eq("worker_id", workerId),
      ]);
      setW(wr.data);
      setPromos(pr.data || []);
      if (wr.data?.avatar_url) {
        const u = await getSignedUrl(wr.data.avatar_url);
        if (u) setAvatarUrl(u);
      }
      setLoading(false);
    })();
  }, [workerId]);

  if (loading) return <div className="text-muted-foreground text-sm">...</div>;
  if (!w) return <div className="text-muted-foreground text-sm">{t("no_data")}</div>;

  const social = w.social_media_assets || {};
  const socialGroups: { key: string; label: string }[] = [
    { key: "instagram", label: t("instagram") },
    { key: "telegram", label: t("telegram_channel") },
    { key: "telegram_bot", label: t("telegram_bot") },
    { key: "youtube", label: t("youtube") },
    { key: "website", label: t("website") },
    { key: "other", label: t("other_link") },
  ];

  return (
    <div>
      <Link to="/workers" className="inline-flex items-center text-sm text-muted-foreground hover:underline mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />{t("back")}
      </Link>
      <div className="flex items-center gap-4">
        <Avatar className="h-20 w-20">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={w.full_name} />}
          <AvatarFallback>{(w.full_name || "?").charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <PageHeader title={w.full_name} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <Info label={t("full_name")} value={w.full_name} />
        <Info label={t("birth_date")} value={w.birth_date} />
        <Info label={t("position")} value={w.position} />
        <Info label={t("phone")} value={w.phone_number} />
        <Info label={t("telegram")} value={w.telegram_username} />
        <Info label={t("passport")} value={w.passport_series_number} />
        <Info label={t("passport_number")} value={w.passport_number} />
        <Info label={t("plastic_card")} value={w.plastic_card_info} />
        <Info label={t("residence")} value={w.residence_address} className="md:col-span-2" />
        <Info label={t("temp_addresses")} value={(w.temp_living_addresses || []).join(", ")} className="md:col-span-2" />
        <FileInfo label={t("passport_front")} path={w.passport_front_url} />
        <FileInfo label={t("passport_back")} path={w.passport_back_url} />
        <FileInfo label={t("residence_file")} path={w.residence_file_url} />
        <FileInfo label={t("e_signature_file")} path={w.e_signature_file_url} />
        <Info label={t("e_signature_password")} value={w.e_signature_password} />
      </div>

      <div className="mt-6 border-t pt-4">
        <div className="font-semibold mb-2">{t("promocodes")}</div>
        <div className="flex flex-wrap gap-2">
          {promos.length === 0 ? <span className="text-sm text-muted-foreground">—</span> :
            promos.map(p => <Badge key={p.id} variant="secondary"><Tag className="h-3 w-3 mr-1" />{p.code}</Badge>)}
        </div>
      </div>

      <div className="mt-6 border-t pt-4">
        <div className="font-semibold mb-3">{t("social_assets")}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {socialGroups.map(g => {
            const items: string[] = (social[g.key] || []).filter(Boolean);
            return (
              <div key={g.key}>
                <div className="text-xs text-muted-foreground mb-1">{g.label}</div>
                {items.length === 0 ? <div className="text-sm">—</div> : (
                  <ul className="space-y-1">
                    {items.map((v, i) => (
                      <li key={i}><a href={v} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline break-all">{v}</a></li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, className }: { label: string; value: any; className?: string }) {
  return (
    <div className={"border bg-card p-3 " + (className || "")}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium mt-1">{value || "—"}</div>
    </div>
  );
}

function FileInfo({ label, path }: { label: string; path: string | null }) {
  const { t } = useTranslation();
  return (
    <div className="border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1">
        {path ? (
          <Button size="sm" variant="outline" onClick={() => openFile(path)}>
            <FileText className="h-3 w-3 mr-1" />{t("view")}
          </Button>
        ) : <span className="text-sm">—</span>}
      </div>
    </div>
  );
}