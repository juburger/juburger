
-- Allow authenticated users to update members (for loyalty points)
CREATE POLICY "Authenticated users can update members"
ON public.members
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Allow authenticated users to insert point_transactions
CREATE POLICY "Authenticated users can insert point transactions"
ON public.point_transactions
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow reading orders by member_id (so member profile can show past orders)
CREATE POLICY "Members can view orders by member_id"
ON public.orders
FOR SELECT
USING (member_id IS NOT NULL);
