CREATE TABLE public.project_workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  worker_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, worker_id)
);
ALTER TABLE public.project_workers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all project_workers" ON public.project_workers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_project_workers_client ON public.project_workers(client_id);
CREATE INDEX idx_project_workers_worker ON public.project_workers(worker_id);