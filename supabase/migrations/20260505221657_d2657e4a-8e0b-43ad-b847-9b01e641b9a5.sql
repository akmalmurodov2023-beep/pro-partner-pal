
ALTER TABLE public.workers
  ADD COLUMN IF NOT EXISTS passport_number TEXT,
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS residence_file_url TEXT,
  ADD COLUMN IF NOT EXISTS passport_front_url TEXT,
  ADD COLUMN IF NOT EXISTS passport_back_url TEXT;
