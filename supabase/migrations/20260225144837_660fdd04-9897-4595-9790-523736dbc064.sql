-- Allow users to cancel their own waiting orders
CREATE POLICY "Users can cancel own waiting orders"
ON public.orders
FOR UPDATE
USING (auth.uid() = user_id AND status = 'waiting')
WITH CHECK (auth.uid() = user_id AND status = 'paid' AND payment_status = 'cancelled');