export interface MenuItem {
  id: number;
  name: string;
  desc: string;
  price: number;
  tag: string;
}

export interface MenuCategory {
  cat: string;
  items: MenuItem[];
}

export interface CartItem extends MenuItem {
  qty: number;
}

export interface Order {
  id: string;
  user_id: string;
  user_name: string;
  table_num: number;
  items: CartItem[];
  total: number;
  payment_type: string;
  payment_status: string;
  status: string;
  note: string;
  created_at: string;
}

export const MENU: MenuCategory[] = [
  { cat: 'Burgerler', items: [
    { id: 1, name: 'Classic Burger', desc: 'Dana eti, cheddar, domates, marul, özel sos', price: 145, tag: '' },
    { id: 2, name: 'Smoky BBQ', desc: 'Barbekü soslu dana, bacon, soğan halkası', price: 165, tag: 'n' },
    { id: 3, name: 'Spicy Jalapeño', desc: 'Acı biber, jalapeño, sriracha sos', price: 155, tag: 's' },
    { id: 4, name: 'Double Stack', desc: '2 adet dana köfte, double cheddar', price: 195, tag: '' },
    { id: 5, name: 'Mushroom Swiss', desc: 'Sote mantar, swiss peynir, trüf sos', price: 175, tag: '' },
    { id: 6, name: 'Crispy Chicken', desc: 'Çıtır tavuk, coleslaw, bal hardal', price: 160, tag: '' },
  ]},
  { cat: 'Yanlar', items: [
    { id: 7, name: 'Patates Kızartması', desc: 'Çıtır patates, özel tuz', price: 55, tag: '' },
    { id: 8, name: 'Soğan Halkası', desc: 'Çıtır soğan halkası, ranch sos', price: 65, tag: '' },
    { id: 9, name: 'Mozzarella Sticks', desc: 'Çıtır mozzarella, domates sosu', price: 75, tag: '' },
    { id: 10, name: 'Patates Kama', desc: 'Baharatlı patates kama, sour cream', price: 70, tag: 's' },
  ]},
  { cat: 'İçecekler', items: [
    { id: 11, name: 'Coca-Cola', desc: '33cl, buz & limon', price: 35, tag: '' },
    { id: 12, name: 'Ayran', desc: 'Ev yapımı, taze', price: 25, tag: '' },
    { id: 13, name: 'Limonata', desc: 'Taze sıkılmış, nane', price: 45, tag: '' },
    { id: 14, name: 'Milkshake', desc: 'Çikolata / Çilek / Vanilyalı', price: 75, tag: 'n' },
  ]},
  { cat: 'Tatlılar', items: [
    { id: 15, name: 'Cheesecake', desc: 'New York usulü, çilek sos', price: 85, tag: '' },
    { id: 16, name: 'Brownie', desc: 'Sıcak çikolatalı brownie, dondurma', price: 75, tag: '' },
  ]},
];
