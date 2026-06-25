
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['clients','workers','projects','payments','monthly_results','promocodes','project_workers']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "auth all %I" ON public.%I', t, t);
    EXECUTE format($p$CREATE POLICY "auth select %1$I" ON public.%1$I FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL)$p$, t);
    EXECUTE format($p$CREATE POLICY "auth insert %1$I" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL)$p$, t);
    EXECUTE format($p$CREATE POLICY "auth update %1$I" ON public.%1$I FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)$p$, t);
    EXECUTE format($p$CREATE POLICY "auth delete %1$I" ON public.%1$I FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL)$p$, t);
  END LOOP;
END $$;
