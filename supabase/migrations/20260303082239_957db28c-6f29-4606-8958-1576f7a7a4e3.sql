
-- Add ui_theme column to tenants table
ALTER TABLE public.tenants ADD COLUMN ui_theme text NOT NULL DEFAULT 'neu';
