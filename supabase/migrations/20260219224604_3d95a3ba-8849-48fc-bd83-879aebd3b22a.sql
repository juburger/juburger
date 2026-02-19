
-- Staff permissions table
CREATE TABLE public.staff_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  perm_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(staff_id, perm_key)
);

ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage staff permissions"
ON public.staff_permissions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can read own permissions"
ON public.staff_permissions
FOR SELECT
TO authenticated
USING (
  staff_id IN (SELECT s.id FROM public.staff s WHERE s.user_id = auth.uid())
);
