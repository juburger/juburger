
-- Table areas for categorization
CREATE TABLE public.table_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);
ALTER TABLE public.table_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read areas" ON public.table_areas FOR SELECT USING (true);
CREATE POLICY "Admins can manage areas" ON public.table_areas FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Tables configuration
CREATE TABLE public.tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_num INT NOT NULL UNIQUE,
  area_id UUID REFERENCES public.table_areas(id) ON DELETE SET NULL,
  capacity INT NOT NULL DEFAULT 4,
  is_active BOOLEAN NOT NULL DEFAULT true
);
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read tables" ON public.tables FOR SELECT USING (true);
CREATE POLICY "Admins can manage tables" ON public.tables FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default areas and tables
INSERT INTO public.table_areas (name, sort_order) VALUES
  ('İç Alan', 1), ('Bahçe', 2), ('Teras', 3);

WITH area AS (SELECT id FROM public.table_areas WHERE name = 'İç Alan' LIMIT 1)
INSERT INTO public.tables (table_num, area_id)
SELECT n, area.id FROM generate_series(1, 10) AS n, area;
