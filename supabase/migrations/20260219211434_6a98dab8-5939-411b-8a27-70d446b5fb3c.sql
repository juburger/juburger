
ALTER TABLE public.settings
ADD COLUMN auto_print_enabled boolean NOT NULL DEFAULT true,
ADD COLUMN paper_size text NOT NULL DEFAULT '80',
ADD COLUMN printer_name text NOT NULL DEFAULT '';
