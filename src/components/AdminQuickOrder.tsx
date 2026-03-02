import React, { useState, useEffect } from 'react';
import { useToast95Context } from '@/contexts/Toast95Context';
import { supabase } from '@/integrations/supabase/client';
import type { Order } from '@/data/menu';
import { useTenantId } from '@/hooks/useTenantQuery';

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

interface ProductOption {
  id: string;
  product_id: string;
  name: string;
  extra_price: number;
  sort_order: number;
}

interface SelectedOption {
  id: string;
  name: string;
  extra_price: number;
}

interface QuickItem {
  id: string;
  uid: string;
  name: string;
  price: number;
  qty: number;
  note: string;
  extraCharge: number;
  selectedOptions: SelectedOption[];
}

interface Props {
  onPrintOrder?: (order: Order) => void;
}

const AdminQuickOrder: React.FC<Props> = ({ onPrintOrder }) => {
  const { showToast } = useToast95Context();
  const tenantId = useTenantId();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [accountName, setAccountName] = useState('');
  const [items, setItems] = useState<QuickItem[]>([]);
  const [nameError, setNameError] = useState(false);
  const [expandedUid, setExpandedUid] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      if (!tenantId) return;
      const [{ data: cats }, { data: prods }, { data: opts }] = await Promise.all([
        supabase.from('categories').select('*').eq('tenant_id', tenantId).order('sort_order'),
        supabase.from('products').select('*').eq('tenant_id', tenantId).eq('is_available', true).order('sort_order'),
        supabase.from('product_options').select('*').eq('tenant_id', tenantId).order('sort_order'),
      ]);
      if (cats) { setCategories(cats); if (cats.length > 0) setSelectedCat(cats[0].id); }
      if (prods) setProducts(prods);
      if (opts) setProductOptions(opts as ProductOption[]);
    };
    fetch();
  }, [tenantId]);

  const filteredProducts = searchQuery.trim()
    ? products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : selectedCat ? products.filter(p => p.category_id === selectedCat) : products;

  const addItem = (product: Product) => {
    const uid = crypto.randomUUID();
    setItems(prev => [...prev, { id: product.id, uid, name: product.name, price: product.price, qty: 1, note: '', extraCharge: 0, selectedOptions: [] }]);
    setExpandedUid(uid);
  };

  const updateQty = (uid: string, delta: number) => {
    setItems(prev => prev.map(i => {
      if (i.uid !== uid) return i;
      const newQty = i.qty + delta;
      return newQty <= 0 ? null : { ...i, qty: newQty };
    }).filter(Boolean) as QuickItem[]);
  };

  const toggleOption = (uid: string, option: ProductOption) => {
    setItems(prev => prev.map(i => {
      if (i.uid !== uid) return i;
      const exists = i.selectedOptions.find(o => o.id === option.id);
      const newOpts = exists
        ? i.selectedOptions.filter(o => o.id !== option.id)
        : [...i.selectedOptions, { id: option.id, name: option.name, extra_price: option.extra_price }];
      const extraTotal = newOpts.reduce((s, o) => s + o.extra_price, 0);
      return { ...i, selectedOptions: newOpts, extraCharge: extraTotal };
    }));
  };

  const updateNote = (uid: string, note: string) => {
    setItems(prev => prev.map(i => i.uid === uid ? { ...i, note } : i));
  };

  const total = items.reduce((s, i) => s + (i.price + i.extraCharge) * i.qty, 0);

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

    const orderItems = items.map(i => ({
      id: i.id, name: i.name, price: i.price + i.extraCharge, qty: i.qty, note: i.note,
      options: i.selectedOptions.map(o => o.name),
    }));

    const { data: newOrder, error } = await supabase.from('orders').insert({
      user_id: userData.user.id,
      user_name: trimmed,
      table_num: 0,
      items: orderItems,
      total,
      status: 'preparing',
      payment_type: 'cash',
      tenant_id: tenantId,
    }).select().single();

    if (error) { showToast('Sipariş oluşturulamadı', false); return; }

    await supabase.from('table_logs').insert({
      table_num: 0,
      user_name: 'Administrator',
      action: 'Hızlı sipariş eklendi!',
      details: `(${trimmed} - ${items.map(i => `${i.qty}x ${i.name}`).join(', ')})`,
      amount: total,
      tenant_id: tenantId,
    });

    if (onPrintOrder && newOrder && localStorage.getItem('ju_print_server') === '1') {
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
                  className={`text-[9px] px-1.5 py-0.5 cursor-pointer rounded-full transition-all ${selectedCat === c.id ? 'neu-sunken text-foreground font-semibold' : 'neu-flat text-muted-foreground'}`}
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
              items.map(item => {
                const itemOptions = productOptions.filter(o => o.product_id === item.id);
                const isExpanded = expandedUid === item.uid;
                return (
                  <div key={item.uid} className="py-1.5 border-b border-dashed border-muted text-[11px]">
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedUid(isExpanded ? null : item.uid)}>
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">{item.name} {itemOptions.length > 0 && <span className="text-[9px] text-primary">▾</span>}</div>
                        <div className="text-[9px] text-muted-foreground">
                          ₺{item.price} × {item.qty}{item.extraCharge > 0 ? ` + ₺${item.extraCharge}` : ''}
                          {item.selectedOptions.length > 0 && ` (${item.selectedOptions.map(o => o.name).join(', ')})`}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-1">
                        <button className="w-5 h-5 flex items-center justify-center border border-foreground/30 text-[10px] font-bold bg-[#e74c3c] text-white"
                          onClick={e => { e.stopPropagation(); updateQty(item.uid, -1); }}>−</button>
                        <span className="text-[11px] font-bold w-4 text-center">{item.qty}</span>
                        <button className="w-5 h-5 flex items-center justify-center border border-foreground/30 text-[10px] font-bold bg-[#f39c12] text-white"
                          onClick={e => { e.stopPropagation(); updateQty(item.uid, 1); }}>+</button>
                        <span className="text-[10px] ml-1 text-muted-foreground">₺{(item.price + item.extraCharge) * item.qty}</span>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-1 pl-1 space-y-1">
                        {itemOptions.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {itemOptions.map(opt => {
                              const isSelected = item.selectedOptions.some(o => o.id === opt.id);
                              return (
                                <button key={opt.id}
                                  className={`text-[9px] px-1.5 py-0.5 border cursor-pointer ${isSelected ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-card-foreground border-border'}`}
                                  onClick={() => toggleOption(item.uid, opt)}>
                                  {opt.name}{opt.extra_price > 0 ? ` +₺${opt.extra_price}` : ''}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        <input type="text" className="win-input w-full text-[9px] py-0.5"
                          placeholder="Not..." value={item.note}
                          onChange={e => updateNote(item.uid, e.target.value)} />
                      </div>
                    )}
                  </div>
                );
              })
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
