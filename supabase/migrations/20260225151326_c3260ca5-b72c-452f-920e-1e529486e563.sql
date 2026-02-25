
CREATE POLICY "Authenticated users can insert members"
ON public.members
FOR INSERT
TO authenticated
WITH CHECK (true);
