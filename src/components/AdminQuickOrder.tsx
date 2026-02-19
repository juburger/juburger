import React, { useState, useEffect } from 'react';
import { useToast95Context } from '@/contexts/Toast95Context';
import { supabase } from '@/integrations/supabase/client';
import type { Order } from '@/data/menu';

interface Product {
  id: string;
  name: string;
  price: number;
  category_id: string | null;
  is_available: boolean;
}

interface Category {
  id: string;
  name: string;
  sort_order: number;
}

interface QuickItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

interface Props {
  onPrintOrder?: (order: Order) => void;
}

const AdminQuickOrder: React.FC<Props> = ({ onPrintOrder }) => {
  const { showToast } = useToast95Context();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [accountName, setAccountName] = useState('');
  const [items, setItems] = useState<QuickItem[]>([]);
  const [nameError, setNameError] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const [{ data: cats }, { data: prods }] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('products').select('*').eq('is_available', true).order('sort_order'),
      ]);
      if (cats) { setCategories(cats); if (cats.length > 0) setSelectedCat(cats[0].id); }
      if (prods) setProducts(prods);
    };
    fetch();
  }, []);

  const filteredProducts = searchQuery.trim()
    ? products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : selectedCat ? products.filter(p => p.category_id === selectedCat) : products;

  const addItem = (product: Product) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { id: product.id, name: product.name, price: product.price, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setItems(prev => prev.map(i => {
      if (i.id !== id) return i;
      const newQty = i.qty + delta;
      return newQty <= 0 ? null : { ...i, qty: newQty };
    }).filter(Boolean) as QuickItem[]);
  };

  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

  const submitOrder = async () => {
    const trimmed = accountName.trim();
    if (!trimmed) {
      setNameError(true);
      showToast('Hesap adı boş bırakılamaz!', false);
      return;
    }
    if (items.length === 0) {
      showToast('Ürün ekleyin!', false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const orderItems = items.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty }));

    const { data: newOrder, error } = await supabase.from('orders').insert({
      user_id: userData.user.id,
      user_name: trimmed,
      table_num: 0,
      items: orderItems,
      total,
      status: 'preparing',
      payment_type: 'cash',
    }).select().single();

    if (error) { showToast('Sipariş oluşturulamadı', false); return; }

    await supabase.from('table_logs').insert({
      table_num: 0,
      user_name: 'Administrator',
      action: 'Hızlı sipariş eklendi!',
      details: `(${trimmed} - ${items.map(i => `${i.qty}x ${i.name}`).join(', ')})`,
      amount: total,
    });

    if (onPrintOrder && newOrder) {
      onPrintOrder(newOrder as unknown as Order);
    }

    showToast(`Sipariş oluşturuldu — ${trimmed} ₺${total} ✓`);
    setItems([]);
    setAccountName('');
    setNameError(false);
  };

  return (
    <div className="flex flex-col" style={{ minHeight: '60vh' }}>
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Categories + Products */}
        <div className="flex-1 border-r border-foreground/20 overflow-y-auto p-1.5">
          <input
            type="text"
            className="win-input w-full text-[11px] mb-1.5"
            placeholder="🔍 Ürün ara..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); if (e.target.value) setSelectedCat(null); }}
          />

          {!searchQuery && (
            <div className="flex gap-1 flex-wrap mb-1.5">
              {categories.map(c => (
                <button key={c.id}
                  className={`font-mono text-[9px] px-1.5 py-0.5 cursor-pointer border ${selectedCat === c.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-card-foreground border-border'}`}
                  onClick={() => setSelectedCat(c.id)}>
                  {c.name}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-1">
            {filteredProducts.map(p => (
              <button key={p.id}
                className="border border-foreground/30 p-1.5 text-left text-[10px] hover:bg-muted/50 active:bg-muted cursor-pointer"
                onClick={() => addItem(p)}>
                <div className="font-bold truncate">{p.name}</div>
                <div className="text-muted-foreground">₺{p.price}</div>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT: Cart + Account name */}
        <div className="w-[45%] flex flex-col">
          <div className="p-1.5 text-[10px] uppercase tracking-widest text-muted-foreground border-b border-foreground/20">
            Siparişler
          </div>

          <div className="flex-1 overflow-y-auto p-1.5">
            {items.length === 0 ? (
              <p className="text-muted-foreground text-center py-3 text-[10px]">Ürün ekleyin</p>
            ) : (
              items.map(item => (
                <div key={item.id} className="flex items-center justify-between py-1 border-b border-dashed border-muted text-[11px]">
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{item.name}</div>
                  </div>
                  <div className="flex items-center gap-1 ml-1">
                    <button className="w-5 h-5 flex items-center justify-center border border-foreground/30 text-[10px] font-bold bg-[#e74c3c] text-white"
                      onClick={() => updateQty(item.id, -1)}>−</button>
                    <span className="text-[11px] font-bold w-4 text-center">{item.qty}</span>
                    <button className="w-5 h-5 flex items-center justify-center border border-foreground/30 text-[10px] font-bold bg-[#f39c12] text-white"
                      onClick={() => updateQty(item.id, 1)}>+</button>
                    <span className="text-[10px] ml-1 text-muted-foreground">₺{item.price * item.qty}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Account name + submit */}
          <div className="border-t border-foreground/20 p-1.5">
            <div className="mb-1.5">
              <input
                type="text"
                className={`win-input w-full text-[11px] ${nameError ? 'border-destructive border-2' : ''}`}
                placeholder="Hesap Adı *"
                value={accountName}
                onChange={e => { setAccountName(e.target.value); setNameError(false); }}
                maxLength={100}
              />
              {nameError && <div className="text-destructive text-[9px] mt-0.5">Hesap adı zorunludur!</div>}
            </div>

            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Toplam</span>
              <span className="text-[15px] font-bold">₺{total.toLocaleString('tr')}</span>
            </div>

            <button
              className="win-btn win-btn-primary text-[11px] py-1.5 w-full font-bold"
              onClick={submitOrder}>
              ✔ Siparişi Onayla — ₺{total.toLocaleString('tr')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminQuickOrder;
