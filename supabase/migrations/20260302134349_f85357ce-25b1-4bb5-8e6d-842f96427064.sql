
-- 1. Create tenants table
CREATE TABLE public.tenants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  logo_url text NOT NULL DEFAULT '',
  primary_color text NOT NULL DEFAULT '#000000',
  phone text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  owner_user_id uuid NOT NULL
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Super admins (siparis.co) can manage all tenants
CREATE POLICY "Super admins can manage tenants"
  ON public.tenants FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Tenant owners can read their own tenant
CREATE POLICY "Owners can read own tenant"
  ON public.tenants FOR SELECT
  USING (owner_user_id = auth.uid());

-- Anyone can read active tenants (for subdomain resolution)
CREATE POLICY "Anyone can read active tenants"
  ON public.tenants FOR SELECT
  USING (is_active = true);

-- 2. Create tenant_users junction table (which users belong to which tenant)
CREATE TABLE public.tenant_users (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'admin',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage tenant_users"
  ON public.tenant_users FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can read own tenant_users"
  ON public.tenant_users FOR SELECT
  USING (user_id = auth.uid());

-- 3. Helper function: get tenant_id for current user
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT tenant_id FROM public.tenant_users
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

-- 4. Add tenant_id to all existing tables
ALTER TABLE public.categories ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.products ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.product_options ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.orders ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.tables ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.table_areas ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.table_logs ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.staff ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.staff_permissions ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.settings ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.printers ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.accounts ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.account_transactions ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.members ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.point_transactions ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.loyalty_settings ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.profiles ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);

-- 5. Create indexes for tenant_id on all tables
CREATE INDEX idx_categories_tenant ON public.categories(tenant_id);
CREATE INDEX idx_products_tenant ON public.products(tenant_id);
CREATE INDEX idx_product_options_tenant ON public.product_options(tenant_id);
CREATE INDEX idx_orders_tenant ON public.orders(tenant_id);
CREATE INDEX idx_tables_tenant ON public.tables(tenant_id);
CREATE INDEX idx_table_areas_tenant ON public.table_areas(tenant_id);
CREATE INDEX idx_table_logs_tenant ON public.table_logs(tenant_id);
CREATE INDEX idx_staff_tenant ON public.staff(tenant_id);
CREATE INDEX idx_staff_permissions_tenant ON public.staff_permissions(tenant_id);
CREATE INDEX idx_settings_tenant ON public.settings(tenant_id);
CREATE INDEX idx_printers_tenant ON public.printers(tenant_id);
CREATE INDEX idx_accounts_tenant ON public.accounts(tenant_id);
CREATE INDEX idx_account_transactions_tenant ON public.account_transactions(tenant_id);
CREATE INDEX idx_members_tenant ON public.members(tenant_id);
CREATE INDEX idx_point_transactions_tenant ON public.point_transactions(tenant_id);
CREATE INDEX idx_loyalty_settings_tenant ON public.loyalty_settings(tenant_id);

-- 6. Update helper functions to be tenant-aware
CREATE OR REPLACE FUNCTION public.check_staff_permission(_perm_key text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
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

-- 7. Create trigger for tenants updated_at
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Enable realtime for tenants
ALTER PUBLICATION supabase_realtime ADD TABLE public.tenants;
