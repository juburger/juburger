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

interface PendingItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

interface Props {
  tableNum: number;
  userName: string;
  onClose: () => void;
  onPrintOrder?: (order: Order) => void;
}

const AdminTableDetail: React.FC<Props> = ({ tableNum, userName, onClose, onPrintOrder }) => {
  const { showToast } = useToast95Context();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [paymentNote, setPaymentNote] = useState('');
  const [discount, setDiscount] = useState(0);

  // Pending cart - items added but not yet confirmed
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);

  const fetchData = async () => {
    const [{ data: cats }, { data: prods }, { data: ords }] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('products').select('*').eq('is_available', true).order('sort_order'),
      supabase.from('orders').select('*').eq('table_num', tableNum).in('status', ['waiting', 'preparing', 'ready']).order('created_at', { ascending: false }),
    ]);
    if (cats) { setCategories(cats); if (!selectedCat && cats.length > 0) setSelectedCat(cats[0].id); }
    if (prods) setProducts(prods);
    if (ords) setOrders(ords as unknown as Order[]);
  };

  useEffect(() => {
    fetchData();
    const ch = supabase.channel('table-detail-' + tableNum)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tableNum]);

  const filteredProducts = searchQuery.trim()
    ? products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : selectedCat ? products.filter(p => p.category_id === selectedCat) : products;

  // Add product to pending cart (not DB yet)
  const addToPending = (product: Product) => {
    setPendingItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { id: product.id, name: product.name, price: product.price, qty: 1 }];
    });
  };

  const updatePendingQty = (id: string, delta: number) => {
    setPendingItems(prev => {
      return prev.map(i => {
        if (i.id !== id) return i;
        const newQty = i.qty + delta;
        return newQty <= 0 ? null : { ...i, qty: newQty };
      }).filter(Boolean) as PendingItem[];
    });
  };

  const removePending = (id: string) => {
    setPendingItems(prev => prev.filter(i => i.id !== id));
  };

  const pendingTotal = pendingItems.reduce((s, i) => s + i.price * i.qty, 0);

  // Confirm pending items → create order in DB + print
  const confirmPendingOrder = async () => {
    if (pendingItems.length === 0) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const orderItems = pendingItems.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty }));

    const { data: newOrder, error } = await supabase.from('orders').insert({
      user_id: userData.user.id,
      user_name: userName || 'Admin',
      table_num: tableNum,
      items: orderItems,
      total: pendingTotal,
      status: 'waiting',
      payment_type: 'cash',
    }).select().single();

    if (error) { showToast('Sipariş oluşturulamadı', false); return; }

    // Log the action
    const itemSummary = pendingItems.map(i => `${i.qty}x ${i.name}`).join(', ');
    await supabase.from('table_logs').insert({
      table_num: tableNum,
      user_name: 'Administrator',
      action: 'Sipariş eklendi!',
      details: `(${userName} - ${itemSummary})`,
    });

    // Trigger print
    if (onPrintOrder && newOrder) {
      onPrintOrder(newOrder as unknown as Order);
    }

    showToast(`Sipariş onaylandı — ₺${pendingTotal} ✓`);
    setPendingItems([]);
  };

  // Calculate total for confirmed orders
  const tableTotal = orders.reduce((s, o) => s + Number(o.total), 0);
  const discountedTotal = tableTotal - (tableTotal * discount / 100);

  // All confirmed order items flattened
  const allItems: { name: string; qty: number; price: number; orderId: string }[] = [];
  orders.forEach(o => {
    const items = Array.isArray(o.items) ? o.items : [];
    items.forEach((i: any) => {
      allItems.push({ name: i.name, qty: i.qty, price: i.price * i.qty, orderId: o.id });
    });
  });

  const handlePayment = async (paymentType: string) => {
    for (const o of orders) {
      await supabase.from('orders').update({ status: 'paid', payment_type: paymentType, payment_status: 'paid' }).eq('id', o.id);
    }
    await supabase.from('table_logs').insert({
      table_num: tableNum,
      user_name: 'Administrator',
      action: 'Ödeme alındı!',
      details: `(${userName} - ${paymentType} (${Math.round(discountedTotal)})${discount > 0 ? ` -%${discount}` : ''})`,
      amount: discountedTotal,
      payment_type: paymentType,
    });
    await supabase.from('table_logs').insert({
      table_num: tableNum,
      user_name: 'Administrator',
      action: 'Masa kapatıldı',
      details: `(${userName})`,
    });
    showToast(`Ödeme alındı — ₺${Math.round(discountedTotal)} (${paymentType}) ✓`);
    onClose();
  };

  const cancelOrders = async () => {
    const itemList = allItems.map(i => `${i.qty}x ${i.name}`).join(', ');
    for (const o of orders) {
      await supabase.from('orders').update({ status: 'paid', payment_status: 'cancelled' }).eq('id', o.id);
    }
    await supabase.from('table_logs').insert({
      table_num: tableNum,
      user_name: 'Administrator',
      action: 'Siparişler iptal edildi!',
      details: `(${userName} ${itemList})`,
    });
    showToast('Siparişler iptal edildi');
    onClose();
  };

  // Payment dialog
  if (showPayment) {
    return (
      <div className="p-3">
        <div className="text-center mb-3">
          <div className="text-2xl mb-1">💰</div>
          <div className="text-sm font-bold">{userName}</div>
          <div className="text-[11px] text-muted-foreground">Masa {tableNum} — Toplam: ₺{tableTotal.toLocaleString('tr')}</div>
        </div>

        <div className="border border-foreground p-2.5 text-center mb-2.5">
          <div className="text-[22px] font-bold">₺{Math.round(discountedTotal).toLocaleString('tr')}</div>
          {discount > 0 && <div className="text-[10px] text-muted-foreground">%{discount} indirim uygulandı</div>}
        </div>

        <div className="mb-2.5">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Açıklama</div>
          <textarea className="win-input w-full text-[11px]" rows={2} value={paymentNote}
            onChange={e => setPaymentNote(e.target.value)} placeholder="Ödeme notu..." />
        </div>

        <div className="flex gap-1 mb-2.5 flex-wrap">
          {[0, 5, 10, 15, 20].map(d => (
            <button key={d}
              className={`font-mono text-[11px] px-2.5 py-1 cursor-pointer border-2 rounded-full ${discount === d ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-card-foreground win-raised'}`}
              onClick={() => setDiscount(d)}>
              {d === 0 ? 'Böl' : `%${d}`}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-1.5 mb-2.5">
          <button className="win-btn text-[12px] py-2 bg-[#2ecc71] text-white border-[#27ae60] font-bold" onClick={() => handlePayment('nakit')}>
            💵 Nakit
          </button>
          <button className="win-btn text-[12px] py-2 bg-[#e74c3c] text-white border-[#c0392b] font-bold" onClick={() => handlePayment('kredi kartı')}>
            💳 Kredi Kartı
          </button>
          <button className="win-btn text-[12px] py-2 bg-[#3498db] text-white border-[#2980b9] font-bold" onClick={() => handlePayment('havale')}>
            🏦 Havale
          </button>
          <button className="win-btn text-[12px] py-2 bg-[#8b4513] text-white border-[#5a2d0c] font-bold" onClick={() => setDiscount(prev => prev > 0 ? prev : 10)}>
            🏷️ İndirim
          </button>
        </div>

        <button className="win-btn text-[11px] py-1 w-full" onClick={() => setShowPayment(false)}>← Geri</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ minHeight: '70vh' }}>
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-2.5 py-1.5 flex justify-between items-center">
        <span className="text-[12px] font-bold">Masa {tableNum} — {userName}</span>
        <button className="text-[10px] opacity-80 hover:opacity-100" onClick={onClose}>✕</button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Product categories + products */}
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
                onClick={() => addToPending(p)}>
                <div className="font-bold truncate">{p.name}</div>
                <div className="text-muted-foreground">₺{p.price}</div>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT: Pending cart + confirmed orders + actions */}
        <div className="w-[45%] flex flex-col">
          {/* Pending cart section */}
          {pendingItems.length > 0 && (
            <div className="border-b-2 border-primary/30 bg-primary/5">
              <div className="p-1.5 text-[10px] uppercase tracking-widest text-primary font-bold border-b border-primary/20">
                🛒 Sepet
              </div>
              <div className="p-1.5 max-h-[30vh] overflow-y-auto">
                {pendingItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between py-1 border-b border-dashed border-muted text-[11px]">
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{item.name}</div>
                      <div className="text-[9px] text-muted-foreground">₺{item.price} × {item.qty}</div>
                    </div>
                    <div className="flex items-center gap-1 ml-1">
                      <button className="w-5 h-5 flex items-center justify-center border border-foreground/30 text-[10px] font-bold bg-[#e74c3c] text-white"
                        onClick={() => updatePendingQty(item.id, -1)}>−</button>
                      <span className="text-[11px] font-bold w-4 text-center">{item.qty}</span>
                      <button className="w-5 h-5 flex items-center justify-center border border-foreground/30 text-[10px] font-bold bg-[#f39c12] text-white"
                        onClick={() => updatePendingQty(item.id, 1)}>+</button>
                      <span className="text-[10px] ml-1 text-muted-foreground">₺{item.price * item.qty}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-1.5 flex gap-1">
                <button className="win-btn win-btn-primary text-[10px] py-1.5 flex-1 font-bold"
                  onClick={confirmPendingOrder}>
                  ✔ Siparişleri Onayla: ₺{pendingTotal.toLocaleString('tr')}
                </button>
                <button className="win-btn text-[10px] py-1.5 px-2 text-destructive"
                  onClick={() => setPendingItems([])}>
                  İptal
                </button>
              </div>
            </div>
          )}

          {/* Confirmed orders */}
          <div className="p-1.5 text-[10px] uppercase tracking-widest text-muted-foreground border-b border-foreground/20">
            Siparişler — {userName}
          </div>

          <div className="flex-1 overflow-y-auto p-1.5">
            {allItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-3 text-[10px]">Sipariş yok</p>
            ) : (
              allItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-1 border-b border-dashed border-muted text-[11px]">
                  <span>{item.qty}x {item.name}</span>
                  <span className="text-muted-foreground">₺{item.price}</span>
                </div>
              ))
            )}
          </div>

          {/* Total + actions */}
          <div className="border-t border-foreground/20 p-1.5">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Toplam</span>
              <span className="text-[15px] font-bold">₺{tableTotal.toLocaleString('tr')}</span>
            </div>

            <button className="win-btn win-btn-primary text-[11px] py-1.5 w-full mb-1"
              disabled={allItems.length === 0}
              onClick={() => setShowPayment(true)}>
              💰 Ödeme Al — ₺{tableTotal.toLocaleString('tr')}
            </button>
            <button className="win-btn text-[10px] py-0.5 w-full text-destructive"
              disabled={allItems.length === 0}
              onClick={cancelOrders}>
              ❌ İptal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminTableDetail;
