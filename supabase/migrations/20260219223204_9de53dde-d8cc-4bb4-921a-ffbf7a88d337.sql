
CREATE TABLE public.printers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  ip_address TEXT NOT NULL DEFAULT '',
  paper_size TEXT NOT NULL DEFAULT '80',
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  auto_print_categories TEXT[] NOT NULL DEFAULT '{}',
  header_text TEXT NOT NULL DEFAULT '',
  footer_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.printers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read printers"
ON public.printers FOR SELECT USING (true);

CREATE POLICY "Admins can manage printers"
ON public.printers FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
