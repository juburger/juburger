
-- Add slug column to tables
ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS slug text NOT NULL DEFAULT '';

-- Create slugify function for Turkish text
CREATE OR REPLACE FUNCTION public.slugify_turkish(input text)
RETURNS text
LANGUAGE sql IMMUTABLE STRICT
SET search_path TO 'public'
AS $$
  SELECT LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        TRANSLATE(input, 'İıÖöÜüÇçŞşĞğ ', 'iiooUuccssgg-'),
        '[^a-zA-Z0-9-]', '', 'g'
      ),
      '-+', '-', 'g'
    )
  )
$$;

-- Populate slugs for existing tables based on area name + local index
WITH ranked AS (
  SELECT t.id, ta.name as area_name,
    ROW_NUMBER() OVER (PARTITION BY t.area_id, t.tenant_id ORDER BY t.table_num) as local_idx
  FROM public.tables t
  LEFT JOIN public.table_areas ta ON t.area_id = ta.id
)
UPDATE public.tables SET slug = 
  CASE 
    WHEN ranked.area_name IS NOT NULL THEN 
      public.slugify_turkish(ranked.area_name) || '-' || ranked.local_idx
    ELSE 'masa-' || public.tables.table_num
  END
FROM ranked WHERE public.tables.id = ranked.id;
