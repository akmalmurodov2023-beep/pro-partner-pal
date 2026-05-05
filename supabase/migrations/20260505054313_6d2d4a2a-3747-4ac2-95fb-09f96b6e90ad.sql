
-- Workers
CREATE TABLE public.workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  passport_series_number TEXT,
  plastic_card_info TEXT,
  phone_number TEXT,
  telegram_username TEXT,
  position TEXT,
  residence_address TEXT,
  temp_living_addresses TEXT[] DEFAULT '{}',
  e_signature_key TEXT,
  social_media_assets JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Clients
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  inn TEXT UNIQUE,
  bank_account TEXT,
  telegram_archive_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Promocodes
CREATE TABLE public.promocodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  project_name TEXT,
  contract_url TEXT,
  invoice_url TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Monthly results
CREATE TABLE public.monthly_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  year INT NOT NULL,
  month INT NOT NULL,
  results_table_data JSONB DEFAULT '[]'::jsonb,
  uploaded_docs_urls TEXT[] DEFAULT '{}',
  total_stats TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, year, month)
);

-- Payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES public.workers(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  payment_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_workers_updated BEFORE UPDATE ON public.workers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_monthly_results_updated BEFORE UPDATE ON public.monthly_results FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promocodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Authenticated full access policies
CREATE POLICY "auth all workers" ON public.workers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all clients" ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all promocodes" ON public.promocodes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all projects" ON public.projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all monthly_results" ON public.monthly_results FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all payments" ON public.payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "auth read documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documents');
CREATE POLICY "auth insert documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');
CREATE POLICY "auth update documents" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'documents');
CREATE POLICY "auth delete documents" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documents');
