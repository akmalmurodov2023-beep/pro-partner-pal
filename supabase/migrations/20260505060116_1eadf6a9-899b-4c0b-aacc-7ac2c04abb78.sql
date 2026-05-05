
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS e_signature_file_url TEXT;
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS e_signature_password TEXT;
