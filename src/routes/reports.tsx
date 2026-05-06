import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, Building2, FolderKanban, Wallet, TrendingUp, Trophy } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import { MONTHS_FULL } from "@/lib/notify";

export const Route = createFileRoute("/reports")({ component: () => <AppLayout><Reports /></AppLayout> });

const COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];
const fmt = (n: number) => Number(n || 0).toLocaleString("ru-RU");

function Reports() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ workers: 0, clients: 0, projects: 0, total: 0 });
  const [payments, setPayments] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [w, c, p, pay, mr] = await Promise.all([
        supabase.from("workers").select("id, full_name"),
        supabase.from("clients").select("id, company_name"),
        supabase.from("projects").select("id"),
        supabase.from("payments").select("amount, payment_date, target_month, target_year, client_id, worker_id, payment_type"),
        supabase.from("monthly_results").select("client_id, month, year, results_table_data"),
      ]);
      setWorkers(w.data || []);
      setClients(c.data || []);
      setPayments(pay.data || []);
      setResults(mr.data || []);
      const total = (pay.data || []).reduce((s, r: any) => s + Number(r.amount || 0), 0);
      setStats({
        workers: (w.data || []).length,
        clients: (c.data || []).length,
        projects: (p.data || []).length,
        total,
      });
      setLoading(false);
    })();
  }, []);

  // Last 12 months payment trend
  const monthlyTrend = useMemo(() => {
    const map = new Map<string, number>();
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      map.set(`${d.getFullYear()}-${d.getMonth() + 1}`, 0);
    }
    for (const p of payments) {
      if (!p.payment_date) continue;
      const d = new Date(p.payment_date);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      if (map.has(key)) map.set(key, (map.get(key) || 0) + Number(p.amount || 0));
    }
    return Array.from(map.entries()).map(([k, v]) => {
      const [y, m] = k.split("-");
      return { name: `${MONTHS_FULL[Number(m) - 1].slice(0, 3)} ${String(y).slice(2)}`, total: v };
    });
  }, [payments]);

  // Payments by company (top 8)
  const byCompany = useMemo(() => {
    const cmap = new Map(clients.map((c: any) => [c.id, c.company_name]));
    const sums = new Map<string, number>();
    for (const p of payments) {
      if (!p.client_id) continue;
      sums.set(p.client_id, (sums.get(p.client_id) || 0) + Number(p.amount || 0));
    }
    return Array.from(sums.entries())
      .map(([id, v]) => ({ name: cmap.get(id) || "—", total: v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [payments, clients]);

  // Payment type breakdown
  const byType = useMemo(() => {
    const sums = new Map<string, number>();
    for (const p of payments) {
      const k = p.payment_type || "Boshqa";
      sums.set(k, (sums.get(k) || 0) + Number(p.amount || 0));
    }
    return Array.from(sums.entries()).map(([name, value]) => ({ name, value }));
  }, [payments]);

  // Top bloggers by total results across all months
  const topWorkers = useMemo(() => {
    const sums = new Map<string, number>();
    for (const r of results) {
      const arr = Array.isArray(r.results_table_data) ? r.results_table_data : [];
      for (const row of arr) {
        const name = String(row.worker || "").trim();
        if (!name) continue;
        sums.set(name, (sums.get(name) || 0) + (Number(row.results) || 0));
      }
    }
    return Array.from(sums.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 7);
  }, [results]);

  const items = [
    { label: t("workers"), value: fmt(stats.workers), icon: Users },
    { label: t("clients"), value: fmt(stats.clients), icon: Building2 },
    { label: t("projects"), value: fmt(stats.projects), icon: FolderKanban },
    { label: t("payments"), value: fmt(stats.total) + " so'm", icon: Wallet },
  ];

  return (
    <div>
      <PageHeader title={t("reports")} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {items.map((it) => (
          <Card key={it.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{it.label}</CardTitle>
              <it.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{it.value}</div></CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" />So'nggi 12 oylik to'lovlar dinamikasi</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                <Tooltip formatter={(v: number) => [fmt(v) + " so'm", "To'lov"]} />
                <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" />Kompaniyalar bo'yicha to'lovlar</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byCompany} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" fontSize={11} tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                <YAxis type="category" dataKey="name" fontSize={11} width={110} />
                <Tooltip formatter={(v: number) => [fmt(v) + " so'm", "Jami"]} />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4" />To'lov turlari</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={byType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(e: any) => e.name}>
                  {byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v) + " so'm"} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4" />Eng yaxshi bloggerlar (jami natijalar bo'yicha)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topWorkers}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" fontSize={11} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v: number) => [fmt(v), "Natijalar"]} />
                <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {loading && <div className="text-center text-muted-foreground py-4">Yuklanmoqda...</div>}
    </div>
  );
}
