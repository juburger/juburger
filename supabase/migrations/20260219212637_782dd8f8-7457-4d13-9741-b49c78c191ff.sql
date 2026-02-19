
-- Staff table for employee details
CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  username TEXT NOT NULL,
  pin TEXT NOT NULL DEFAULT '',
  work_days TEXT[] NOT NULL DEFAULT ARRAY['Pazartesi','Salı','Çarşamba','Perşembe','Cuma'],
  shift_start TEXT NOT NULL DEFAULT '09:00',
  shift_end TEXT NOT NULL DEFAULT '23:00',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage staff" ON public.staff FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
