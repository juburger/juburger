
-- Create helper function for staff permission checks
CREATE OR REPLACE FUNCTION public.check_staff_permission(_perm_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff s
    JOIN public.staff_permissions sp ON sp.staff_id = s.id
    WHERE s.user_id = auth.uid()
      AND sp.perm_key = _perm_key
      AND sp.enabled = true
      AND s.is_active = true
  ) OR public.has_role(auth.uid(), 'admin')
$$;

-- Allow staff with cashier permission to update orders (payment)
CREATE POLICY "Staff with cashier can update orders"
ON public.orders FOR UPDATE
TO authenticated
USING (
  public.check_staff_permission('cashier')
);

-- Allow staff with new_order permission to insert orders
CREATE POLICY "Staff with new_order can insert orders"
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() = user_id) OR public.check_staff_permission('new_order')
);

-- Allow staff with cancel_order permission to view orders
CREATE POLICY "Staff can view orders"
ON public.orders FOR SELECT
TO authenticated
USING (
  (auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin') OR public.check_staff_permission('view_open_tables')
);

-- Allow staff with manage_accounts to manage accounts
CREATE POLICY "Staff with manage_accounts can manage accounts"
ON public.accounts FOR ALL
TO authenticated
USING (public.check_staff_permission('manage_accounts'))
WITH CHECK (public.check_staff_permission('manage_accounts'));

-- Allow staff with manage_accounts to manage account transactions
CREATE POLICY "Staff with manage_accounts can manage transactions"
ON public.account_transactions FOR ALL
TO authenticated
USING (public.check_staff_permission('manage_accounts'))
WITH CHECK (public.check_staff_permission('manage_accounts'));

-- Allow staff with manage_products to manage products
CREATE POLICY "Staff with manage_products can manage products"
ON public.products FOR ALL
TO authenticated
USING (public.check_staff_permission('manage_products'))
WITH CHECK (public.check_staff_permission('manage_products'));

-- Allow staff with manage_categories to manage categories
CREATE POLICY "Staff with manage_categories can manage categories"
ON public.categories FOR ALL
TO authenticated
USING (public.check_staff_permission('manage_categories'))
WITH CHECK (public.check_staff_permission('manage_categories'));

-- Allow staff with view_logs to read logs
CREATE POLICY "Staff with view_logs can read logs"
ON public.table_logs FOR SELECT
TO authenticated
USING (public.check_staff_permission('view_logs'));
