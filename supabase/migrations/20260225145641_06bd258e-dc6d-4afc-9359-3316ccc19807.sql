
-- Members table
CREATE TABLE public.members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  name text NOT NULL DEFAULT '',
  total_points integer NOT NULL DEFAULT 0,
  used_points integer NOT NULL DEFAULT 0,
  total_spent numeric NOT NULL DEFAULT 0,
  visit_count integer NOT NULL DEFAULT 0,
  last_visit_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage members" ON public.members FOR ALL
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read members" ON public.members FOR SELECT
  USING (true);

CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Point transactions
CREATE TABLE public.point_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'earn', -- earn, spend, adjust
  points integer NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  order_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage point transactions" ON public.point_transactions FOR ALL
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read point transactions" ON public.point_transactions FOR SELECT
  USING (true);

-- Add member_id to orders for linking
ALTER TABLE public.orders ADD COLUMN member_id uuid REFERENCES public.members(id) ON DELETE SET NULL;

-- Loyalty settings
INSERT INTO public.settings (id, auto_print_enabled, card_enabled, cash_enabled, pos_enabled, sound_enabled, waiter_enabled)
VALUES ('loyalty', true, true, true, true, true, true)
ON CONFLICT (id) DO NOTHING;

-- We'll use a separate table for loyalty config
CREATE TABLE public.loyalty_settings (
  id text PRIMARY KEY DEFAULT 'default',
  points_per_lira numeric NOT NULL DEFAULT 1, -- her 1₺ = 1 puan
  point_value numeric NOT NULL DEFAULT 0.1, -- 1 puan = 0.10₺
  min_redeem_points integer NOT NULL DEFAULT 50, -- minimum harcama puanı
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage loyalty settings" ON public.loyalty_settings FOR ALL
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read loyalty settings" ON public.loyalty_settings FOR SELECT
  USING (true);

INSERT INTO public.loyalty_settings (id) VALUES ('default') ON CONFLICT DO NOTHING;
