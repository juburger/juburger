
-- Drop and recreate products policies as PERMISSIVE
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
DROP POLICY IF EXISTS "Anyone can read products" ON public.products;

CREATE POLICY "Admins can manage products"
ON public.products
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read products"
ON public.products
FOR SELECT
USING (true);

-- Fix categories too
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Anyone can read categories" ON public.categories;

CREATE POLICY "Admins can manage categories"
ON public.categories
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read categories"
ON public.categories
FOR SELECT
USING (true);

-- Fix product_options too
DROP POLICY IF EXISTS "Admins can manage product options" ON public.product_options;
DROP POLICY IF EXISTS "Anyone can read product options" ON public.product_options;

CREATE POLICY "Admins can manage product options"
ON public.product_options
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read product options"
ON public.product_options
FOR SELECT
USING (true);
