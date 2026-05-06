-- =====================================================================
-- ONE-SHOT INIT MIGRATION
-- Run this once on a fresh Supabase project to recreate the entire
-- database structure used by this app (schema + RLS + functions +
-- storage bucket). Data is NOT included — see supabase-export/02_data.sql.
--
-- NOTE: This file lives at supabase/init.sql (not supabase/migrations/)
-- because Lovable's managed migrations folder is read-only. On your own
-- Supabase project just paste the contents into the SQL editor and run.
-- =====================================================================

-- ---------- 1. EXTENSIONS ----------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------- 2. SHARED TRIGGER FUNCTION ----------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------- 3. TABLES (parent → child order) ----------

CREATE TABLE IF NOT EXISTS public.clients (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name            text NOT NULL,
  inn                     text,
  bank_account            text,
  logo_url                text,
  telegram_archive_link   text,
  telegram_drive_urls     text[] NOT NULL DEFAULT '{}'::text[],
  telegram_archive_zips   text[] NOT NULL DEFAULT '{}'::text[],
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workers (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name                text NOT NULL,
  position                 text,
  phone_number             text,
  birth_date               date,
  passport_series_number   text,
  passport_number          text,
  passport_front_url       text,
  passport_back_url        text,
  residence_address        text,
  residence_file_url       text,
  temp_living_addresses    text[] DEFAULT '{}'::text[],
  plastic_card_info        text,
  e_signature_key          text,
  e_signature_password     text,
  e_signature_file_url     text,
  telegram_id              text,
  telegram_username        text,
  avatar_url               text,
  social_media_assets      jsonb DEFAULT '{}'::jsonb,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.projects (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  project_name  text,
  status        text DEFAULT 'active',
  contract_url  text,
  invoice_url   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_workers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  worker_id   uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  promo_code  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.promocodes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL,
  worker_id   uuid REFERENCES public.workers(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  worker_id     uuid REFERENCES public.workers(id) ON DELETE SET NULL,
  amount        numeric NOT NULL DEFAULT 0,
  payment_date  date NOT NULL DEFAULT CURRENT_DATE,
  payment_type  text,
  target_year   integer,
  target_month  integer,
  receipt_url   text,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.monthly_results (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id            uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  year                 integer NOT NULL,
  month                integer NOT NULL,
  results_table_data   jsonb DEFAULT '[]'::jsonb,
  total_stats          text,
  uploaded_docs_urls   text[] DEFAULT '{}'::text[],
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ---------- 4. INDEXES ----------
CREATE INDEX IF NOT EXISTS idx_projects_client_id          ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_project_workers_client_id   ON public.project_workers(client_id);
CREATE INDEX IF NOT EXISTS idx_project_workers_worker_id   ON public.project_workers(worker_id);
CREATE INDEX IF NOT EXISTS idx_promocodes_worker_id        ON public.promocodes(worker_id);
CREATE INDEX IF NOT EXISTS idx_payments_client_id          ON public.payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_worker_id          ON public.payments(worker_id);
CREATE INDEX IF NOT EXISTS idx_monthly_results_client_id   ON public.monthly_results(client_id);
CREATE INDEX IF NOT EXISTS idx_monthly_results_year_month  ON public.monthly_results(year, month);

-- ---------- 5. updated_at TRIGGERS ----------
DROP TRIGGER IF EXISTS trg_clients_updated_at         ON public.clients;
CREATE TRIGGER trg_clients_updated_at         BEFORE UPDATE ON public.clients         FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_workers_updated_at         ON public.workers;
CREATE TRIGGER trg_workers_updated_at         BEFORE UPDATE ON public.workers         FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_projects_updated_at        ON public.projects;
CREATE TRIGGER trg_projects_updated_at        BEFORE UPDATE ON public.projects        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_monthly_results_updated_at ON public.monthly_results;
CREATE TRIGGER trg_monthly_results_updated_at BEFORE UPDATE ON public.monthly_results FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- 6. ROW LEVEL SECURITY ----------
ALTER TABLE public.clients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_workers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promocodes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_results  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth all clients"          ON public.clients          FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all workers"          ON public.workers          FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all projects"         ON public.projects         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all project_workers"  ON public.project_workers  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all promocodes"       ON public.promocodes       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all payments"         ON public.payments         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all monthly_results"  ON public.monthly_results  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---------- 7. STORAGE ----------
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "auth read documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents');

CREATE POLICY "auth insert documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents');

CREATE POLICY "auth update documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documents');

CREATE POLICY "auth delete documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents');