
-- Fix table_areas RLS policies to PERMISSIVE
DROP POLICY IF EXISTS "Anyone can read areas" ON public.table_areas;
DROP POLICY IF EXISTS "Admins can manage areas" ON public.table_areas;

CREATE POLICY "Admins can manage areas"
ON public.table_areas
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read areas"
ON public.table_areas
FOR SELECT
USING (true);

-- Fix tables RLS policies to PERMISSIVE
DROP POLICY IF EXISTS "Anyone can read tables" ON public.tables;
DROP POLICY IF EXISTS "Admins can manage tables" ON public.tables;

CREATE POLICY "Admins can manage tables"
ON public.tables
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read tables"
ON public.tables
FOR SELECT
USING (true);

NOTIFY pgrst, 'reload schema';
