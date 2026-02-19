
-- Categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC NOT NULL DEFAULT 0,
  tag TEXT NOT NULL DEFAULT '',
  is_available BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Admins can manage products" ON public.products FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed categories from existing menu
INSERT INTO public.categories (name, sort_order) VALUES
  ('Burgerler', 1),
  ('Yanlar', 2),
  ('İçecekler', 3),
  ('Tatlılar', 4);

-- Seed products from existing menu
WITH cats AS (SELECT id, name FROM public.categories)
INSERT INTO public.products (category_id, name, description, price, tag, sort_order)
SELECT c.id, v.name, v.description, v.price, v.tag, v.sort_order
FROM (VALUES
  ('Burgerler', 'Classic Burger', 'Dana eti, cheddar, domates, marul, özel sos', 145, '', 1),
  ('Burgerler', 'Smoky BBQ', 'Barbekü soslu dana, bacon, soğan halkası', 165, 'n', 2),
  ('Burgerler', 'Spicy Jalapeño', 'Acı biber, jalapeño, sriracha sos', 155, 's', 3),
  ('Burgerler', 'Double Stack', '2 adet dana köfte, double cheddar', 195, '', 4),
  ('Burgerler', 'Mushroom Swiss', 'Sote mantar, swiss peynir, trüf sos', 175, '', 5),
  ('Burgerler', 'Crispy Chicken', 'Çıtır tavuk, coleslaw, bal hardal', 160, '', 6),
  ('Yanlar', 'Patates Kızartması', 'Çıtır patates, özel tuz', 55, '', 1),
  ('Yanlar', 'Soğan Halkası', 'Çıtır soğan halkası, ranch sos', 65, '', 2),
  ('Yanlar', 'Mozzarella Sticks', 'Çıtır mozzarella, domates sosu', 75, '', 3),
  ('Yanlar', 'Patates Kama', 'Baharatlı patates kama, sour cream', 70, 's', 4),
  ('İçecekler', 'Coca-Cola', '33cl, buz & limon', 35, '', 1),
  ('İçecekler', 'Ayran', 'Ev yapımı, taze', 25, '', 2),
  ('İçecekler', 'Limonata', 'Taze sıkılmış, nane', 45, '', 3),
  ('İçecekler', 'Milkshake', 'Çikolata / Çilek / Vanilyalı', 75, 'n', 4),
  ('Tatlılar', 'Cheesecake', 'New York usulü, çilek sos', 85, '', 1),
  ('Tatlılar', 'Brownie', 'Sıcak çikolatalı brownie, dondurma', 75, '', 2)
) AS v(cat, name, description, price, tag, sort_order)
JOIN cats c ON c.name = v.cat;
