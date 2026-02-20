import React, { useState, useEffect } from 'react';
import { useToast95Context } from '@/contexts/Toast95Context';
import { supabase } from '@/integrations/supabase/client';
import type { Order } from '@/data/menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Product {
  id: string;
  name: string;
  price: number;
  category_id: string | null;
  is_available: boolean;
}

interface ProductOption {
  id: string;
  product_id: string;
  name: string;
  extra_price: number;
  sort_order: number;
}

interface Category {
  id: string;
  name: string;
  sort_order: number;
}

interface SelectedOption {
  id: string;
  name: string;
  extra_price: number;
}

interface PendingItem {
  id: string;
  uid: string; // unique key per cart line
  name: string;
  price: number;
  qty: number;
  note: string;
  extraCharge: number;
  selectedOptions: SelectedOption[];
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
  const [showAccountTransfer, setShowAccountTransfer] = useState(false);
  const [showTableTransfer, setShowTableTransfer] = useState(false);
  const [transferTargetTable, setTransferTargetTable] = useState<number | null>(null);
  const [allTables, setAllTables] = useState<{ table_num: number }[]>([]);
  const [accountsList, setAccountsList] = useState<{ id: string; name: string; balance: number }[]>([]);
  const [paymentNote, setPaymentNote] = useState('');
  const [discount, setDiscount] = useState(0);

  // Pending cart - items added but not yet confirmed
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);

  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [expandedPendingId, setExpandedPendingId] = useState<string | null>(null);

  // Edit modal for confirmed items
  const [editItem, setEditItem] = useState<{ orderId: string; itemIndex: number; name: string; qty: number; price: number; note: string; extraCharge: number; options?: string[] } | null>(null);
  const [editQty, setEditQty] = useState(1);
  const [editNote, setEditNote] = useState('');
  const [editExtra, setEditExtra] = useState(0);

  // Selection for partial payment/cancel
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const toggleCheck = (key: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const fetchData = async () => {
    const [{ data: cats }, { data: prods }, { data: ords }, { data: opts }] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('products').select('*').eq('is_available', true).order('sort_order'),
      supabase.from('orders').select('*').eq('table_num', tableNum).in('status', ['waiting', 'preparing', 'ready']).order('created_at', { ascending: false }),
      supabase.from('product_options').select('*').order('sort_order'),
    ]);
    if (cats) { setCategories(cats); if (!selectedCat && cats.length > 0) setSelectedCat(cats[0].id); }
    if (prods) setProducts(prods);
    if (ords) setOrders(ords as unknown as Order[]);
    if (opts) setProductOptions(opts as ProductOption[]);
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

  // Add product to pending cart - each click adds a new line with unique uid
  const addToPending = (product: Product) => {
    const uid = crypto.randomUUID();
    setPendingItems(prev => [
      ...prev,
      { id: product.id, uid, name: product.name, price: product.price, qty: 1, note: '', extraCharge: 0, selectedOptions: [] }
    ]);
    setExpandedPendingId(uid);
  };

  const toggleOption = (uid: string, option: ProductOption) => {
    setPendingItems(prev => prev.map(i => {
      if (i.uid !== uid) return i;
      const exists = i.selectedOptions.find(o => o.id === option.id);
      const newOpts = exists
        ? i.selectedOptions.filter(o => o.id !== option.id)
        : [...i.selectedOptions, { id: option.id, name: option.name, extra_price: option.extra_price }];
      const extraTotal = newOpts.reduce((s, o) => s + o.extra_price, 0);
      return { ...i, selectedOptions: newOpts, extraCharge: extraTotal };
    }));
  };

  const updatePendingQty = (uid: string, delta: number) => {
    setPendingItems(prev => prev.map(i => {
      if (i.uid !== uid) return i;
      const newQty = i.qty + delta;
      return newQty <= 0 ? null : { ...i, qty: newQty };
    }).filter(Boolean) as PendingItem[]);
  };

  const updatePendingNote = (uid: string, note: string) => {
    setPendingItems(prev => prev.map(i => i.uid === uid ? { ...i, note } : i));
  };

  const updatePendingExtra = (uid: string, extraCharge: number) => {
    setPendingItems(prev => prev.map(i => i.uid === uid ? { ...i, extraCharge: isNaN(extraCharge) ? 0 : extraCharge } : i));
  };

  const removePending = (uid: string) => {
    setPendingItems(prev => prev.filter(i => i.uid !== uid));
  };

  const pendingTotal = pendingItems.reduce((s, i) => s + (i.price + i.extraCharge) * i.qty, 0);

  // Confirm pending items → create order in DB + print
  const confirmPendingOrder = async () => {
    if (pendingItems.length === 0) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const orderItems = pendingItems.map(i => ({
      id: i.id, name: i.name, price: i.price + i.extraCharge, qty: i.qty, note: i.note,
      options: i.selectedOptions.map(o => o.name),
    }));

    const { data: newOrder, error } = await supabase.from('orders').insert({
      user_id: userData.user.id,
      user_name: userName || 'Admin',
      table_num: tableNum,
      items: orderItems,
      total: pendingTotal,
      status: 'preparing',
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

    // Trigger print only on designated print server
    if (onPrintOrder && newOrder && localStorage.getItem('ju_print_server') === '1') {
      onPrintOrder(newOrder as unknown as Order);
    }

    showToast(`Sipariş onaylandı — ₺${pendingTotal} ✓`);
    setPendingItems([]);
  };

  // Calculate total for confirmed orders
  const tableTotal = orders.reduce((s, o) => s + Number(o.total), 0);
  const discountedTotal = tableTotal - (tableTotal * discount / 100);

  // All confirmed order items flattened
  const allItems: { name: string; qty: number; price: number; orderId: string; itemIndex: number }[] = [];
  orders.forEach(o => {
    const items = Array.isArray(o.items) ? o.items : [];
    items.forEach((i: any, idx: number) => {
      allItems.push({ name: i.name, qty: i.qty, price: i.price * i.qty, orderId: o.id, itemIndex: idx });
    });
  });

  const cancelSingleItem = async (orderId: string, itemIndex: number, itemName: string, itemQty: number) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const items = Array.isArray(order.items) ? [...order.items] as any[] : [];
    const removedItem = items[itemIndex];
    const removedTotal = removedItem.price * removedItem.qty;
    items.splice(itemIndex, 1);

    if (items.length === 0) {
      // No items left, cancel whole order
      await supabase.from('orders').update({ status: 'paid', payment_status: 'cancelled' }).eq('id', orderId);
    } else {
      const newTotal = items.reduce((s: number, i: any) => s + i.price * i.qty, 0);
      await supabase.from('orders').update({ items: items as any, total: newTotal }).eq('id', orderId);
    }

    await supabase.from('table_logs').insert({
      table_num: tableNum,
      user_name: 'Administrator',
      action: 'Ürün iptal edildi',
      details: `(${userName} - ${itemQty}x ${itemName} ₺${removedTotal})`,
    });
    showToast(`${itemName} iptal edildi`);
    fetchData();
  };

  const openEditItem = (item: typeof allItems[0]) => {
    const order = orders.find(o => o.id === item.orderId);
    if (!order) return;
    const orderItems = Array.isArray(order.items) ? order.items : [];
    const raw = orderItems[item.itemIndex] as any;
    setEditItem({
      orderId: item.orderId,
      itemIndex: item.itemIndex,
      name: item.name,
      qty: item.qty,
      price: raw.price,
      note: raw.note || '',
      extraCharge: raw.extraCharge || 0,
      options: raw.options || [],
    });
    setEditQty(item.qty);
    setEditNote(raw.note || '');
    setEditExtra(raw.extraCharge || 0);
  };

  const saveEditItem = async () => {
    if (!editItem) return;
    const order = orders.find(o => o.id === editItem.orderId);
    if (!order) return;
    const items = Array.isArray(order.items) ? [...order.items] as any[] : [];
    const oldQty = editItem.qty;
    const diff = editQty - oldQty;

    if (editQty <= 0) {
      await cancelSingleItem(editItem.orderId, editItem.itemIndex, editItem.name, oldQty);
      setEditItem(null);
      return;
    }

    items[editItem.itemIndex] = {
      ...items[editItem.itemIndex],
      qty: editQty,
      note: editNote,
    };
    const newTotal = items.reduce((s: number, i: any) => s + i.price * i.qty, 0);
    await supabase.from('orders').update({ items: items as any, total: newTotal }).eq('id', editItem.orderId);

    const { data: userData } = await supabase.auth.getUser();

    if (diff > 0) {
      await supabase.from('table_logs').insert({
        table_num: tableNum, user_name: 'Administrator', action: 'Ürün eklendi',
        details: `(${userName} - +${diff}x ${editItem.name})`,
      });
      if (onPrintOrder && userData?.user && localStorage.getItem('ju_print_server') === '1') {
        const fakeOrder = {
          id: crypto.randomUUID(), user_id: userData.user.id, user_name: userName, table_num: tableNum,
          items: [{ id: '', name: editItem.name, price: editItem.price, qty: diff, note: editNote, options: editItem.options || [] }],
          total: editItem.price * diff, status: 'preparing', payment_type: 'cash', payment_status: 'pending',
          note: `EK SİPARİŞ: +${diff}x ${editItem.name}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        } as unknown as Order;
        onPrintOrder(fakeOrder);
      }
      showToast(`+${diff}x ${editItem.name} eklendi ✓`);
    } else if (diff < 0) {
      const cancelledCount = Math.abs(diff);
      await supabase.from('table_logs').insert({
        table_num: tableNum, user_name: 'Administrator', action: 'Ürün azaltıldı',
        details: `(${userName} - -${cancelledCount}x ${editItem.name})`,
      });
      if (onPrintOrder && userData?.user && localStorage.getItem('ju_print_server') === '1') {
        const fakeOrder = {
          id: crypto.randomUUID(), user_id: userData.user.id, user_name: userName, table_num: tableNum,
          items: [{ id: '', name: `İPTAL: ${editItem.name}`, price: editItem.price, qty: cancelledCount, note: '', options: [] }],
          total: editItem.price * cancelledCount, status: 'preparing', payment_type: 'cash', payment_status: 'pending',
          note: `İPTAL FİŞİ: -${cancelledCount}x ${editItem.name}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        } as unknown as Order;
        onPrintOrder(fakeOrder);
      }
      showToast(`-${cancelledCount}x ${editItem.name} iptal edildi`);
    } else {
      showToast(`${editItem.name} güncellendi ✓`);
    }

    setEditItem(null);
    fetchData();
  };

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

  // Get checked items details
  const getCheckedItemsList = () => allItems.filter((_, i) => checkedItems.has(`${i}`));
  const checkedTotal = getCheckedItemsList().reduce((s, i) => s + i.price, 0);
  const hasChecked = checkedItems.size > 0;

  const cancelSelectedItems = async () => {
    const selected = getCheckedItemsList();
    if (selected.length === 0) return;
    // Group by orderId
    const byOrder = new Map<string, { itemIndex: number; name: string; qty: number }[]>();
    selected.forEach(s => {
      if (!byOrder.has(s.orderId)) byOrder.set(s.orderId, []);
      byOrder.get(s.orderId)!.push({ itemIndex: s.itemIndex, name: s.name, qty: s.qty });
    });
    for (const [orderId, cancelItems] of byOrder) {
      const order = orders.find(o => o.id === orderId);
      if (!order) continue;
      const items = Array.isArray(order.items) ? [...order.items] as any[] : [];
      // Remove from end to preserve indices
      const indices = cancelItems.map(c => c.itemIndex).sort((a, b) => b - a);
      for (const idx of indices) items.splice(idx, 1);
      if (items.length === 0) {
        await supabase.from('orders').update({ status: 'paid', payment_status: 'cancelled' }).eq('id', orderId);
      } else {
        const newTotal = items.reduce((s: number, i: any) => s + i.price * i.qty, 0);
        await supabase.from('orders').update({ items: items as any, total: newTotal }).eq('id', orderId);
      }
    }
    const names = selected.map(s => `${s.qty}x ${s.name}`).join(', ');
    await supabase.from('table_logs').insert({
      table_num: tableNum, user_name: 'Administrator',
      action: 'Seçili ürünler iptal edildi',
      details: `(${userName} - ${names})`,
    });
    showToast(`${selected.length} ürün iptal edildi`);
    setCheckedItems(new Set());
    fetchData();
  };

  const handleSelectedPayment = async (paymentType: string) => {
    const selected = getCheckedItemsList();
    if (selected.length === 0) return;
    // If all items selected, do full payment
    if (selected.length === allItems.length) {
      await handlePayment(paymentType);
      return;
    }
    // Partial payment: remove selected items from orders, log payment
    const byOrder = new Map<string, number[]>();
    selected.forEach(s => {
      if (!byOrder.has(s.orderId)) byOrder.set(s.orderId, []);
      byOrder.get(s.orderId)!.push(s.itemIndex);
    });
    for (const [orderId, indices] of byOrder) {
      const order = orders.find(o => o.id === orderId);
      if (!order) continue;
      const items = Array.isArray(order.items) ? [...order.items] as any[] : [];
      const sorted = [...indices].sort((a, b) => b - a);
      for (const idx of sorted) items.splice(idx, 1);
      if (items.length === 0) {
        await supabase.from('orders').update({ status: 'paid', payment_type: paymentType, payment_status: 'paid' }).eq('id', orderId);
      } else {
        const newTotal = items.reduce((s: number, i: any) => s + i.price * i.qty, 0);
        await supabase.from('orders').update({ items: items as any, total: newTotal }).eq('id', orderId);
      }
    }
    const names = selected.map(s => `${s.qty}x ${s.name}`).join(', ');
    await supabase.from('table_logs').insert({
      table_num: tableNum, user_name: 'Administrator',
      action: 'Kısmi ödeme alındı!',
      details: `(${userName} - ${paymentType} ₺${checkedTotal} - ${names})`,
      amount: checkedTotal,
      payment_type: paymentType,
    });
    showToast(`Kısmi ödeme — ₺${checkedTotal} (${paymentType}) ✓`);
    setCheckedItems(new Set());
    fetchData();
  };

  // Show partial payment dialog
  const [showPartialPayment, setShowPartialPayment] = useState(false);

  const fetchAccounts = async () => {
    const { data } = await supabase.from('accounts').select('id, name, balance').order('name');
    if (data) setAccountsList(data as any);
  };

  const transferToAccount = async (accountId: string, accountName: string) => {
    // Move all orders to account as debt
    await supabase.from('account_transactions').insert({
      account_id: accountId,
      type: 'debt',
      amount: tableTotal,
      description: `Masa ${tableNum} - ${userName}`,
      table_num: tableNum,
    } as any);
    // Update account balance
    const account = accountsList.find(a => a.id === accountId);
    if (account) {
      await supabase.from('accounts').update({ balance: Number(account.balance) + tableTotal }).eq('id', accountId);
    }
    // Mark orders as paid (transferred to account)
    for (const o of orders) {
      await supabase.from('orders').update({ status: 'paid', payment_status: 'account', payment_type: 'cari' }).eq('id', o.id);
    }
    await supabase.from('table_logs').insert({
      table_num: tableNum,
      user_name: 'Administrator',
      action: 'Cariye taşındı',
      details: `(${userName} → ${accountName} ₺${tableTotal})`,
      amount: tableTotal,
    });
    showToast(`₺${tableTotal} → ${accountName} cariye aktarıldı ✓`);
    onClose();
  };

  const fetchAllTables = async () => {
    const { data } = await supabase.from('tables').select('table_num').order('table_num');
    if (data) setAllTables(data as any);
  };

  const handleTableTransfer = async (targetNum: number) => {
    for (const o of orders) {
      await supabase.from('orders').update({ table_num: targetNum }).eq('id', o.id);
    }
    await supabase.from('table_logs').insert({
      table_num: tableNum,
      user_name: 'Administrator',
      action: 'Masa taşındı',
      details: `Masa ${tableNum} → Masa ${targetNum} (₺${tableTotal})`,
      amount: tableTotal,
    });
    showToast(`Masa ${tableNum} → Masa ${targetNum} taşındı ✓`);
    onClose();
  };

  // Table transfer dialog
  if (showTableTransfer) {
    return (
      <div className="p-3">
        <div className="text-center mb-3">
          <div className="text-2xl mb-1">🪑</div>
          <div className="text-sm font-bold">Masayı Taşı</div>
          <div className="text-[11px] text-muted-foreground">Masa {tableNum} — {userName} — ₺{tableTotal.toLocaleString('tr')}</div>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {allTables.filter(t => t.table_num !== tableNum).map(t => (
            <button key={t.table_num}
              className="border border-foreground/30 p-2 text-center cursor-pointer text-[11px] hover:bg-muted/50 active:bg-primary active:text-primary-foreground font-bold"
              onClick={() => handleTableTransfer(t.table_num)}>
              Masa {t.table_num}
            </button>
          ))}
        </div>

        <button className="win-btn text-[11px] py-1 w-full mt-2.5" onClick={() => setShowTableTransfer(false)}>← Geri</button>
      </div>
    );
  }

  // Account transfer dialog
  if (showAccountTransfer) {
    return (
      <div className="p-3">
        <div className="text-center mb-3">
          <div className="text-2xl mb-1">📋</div>
          <div className="text-sm font-bold">Cariye Taşı</div>
          <div className="text-[11px] text-muted-foreground">Masa {tableNum} — {userName} — ₺{tableTotal.toLocaleString('tr')}</div>
        </div>

        {accountsList.length === 0 ? (
          <p className="text-muted-foreground text-center py-3 text-[11px]">Henüz cari hesap eklenmedi. Önce "Cari Hesaplar" sekmesinden hesap ekleyin.</p>
        ) : (
          <div className="border border-foreground">
            {accountsList.map(a => (
              <div key={a.id}
                className="flex items-center justify-between px-2.5 py-2 text-[11px] border-b border-dashed border-muted-foreground/20 last:border-b-0 cursor-pointer hover:bg-muted/30"
                onClick={() => transferToAccount(a.id, a.name)}>
                <div>
                  <div className="font-bold">{a.name}</div>
                  <div className="text-[9px] text-muted-foreground">Mevcut borç: ₺{Number(a.balance).toLocaleString('tr')}</div>
                </div>
                <span className="text-primary text-[10px]">Seç →</span>
              </div>
            ))}
          </div>
        )}

        <button className="win-btn text-[11px] py-1 w-full mt-2.5" onClick={() => setShowAccountTransfer(false)}>← Geri</button>
      </div>
    );
  }

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
    <div className="flex flex-col h-full w-full max-w-full overflow-hidden" style={{ minHeight: '70vh' }}>
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-2.5 py-1.5 flex justify-between items-center">
        <span className="text-[12px] font-bold">Masa {tableNum} — {userName}</span>
        <button className="text-[10px] opacity-80 hover:opacity-100" onClick={onClose}>✕</button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Product categories + products */}
        <div className="flex-1 min-w-0 border-r border-foreground/20 overflow-y-auto p-1.5">
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
        <div className="w-[45%] min-w-0 flex flex-col overflow-hidden">
          {/* Pending cart section */}
          {pendingItems.length > 0 && (
            <div className="border-b-2 border-primary/30 bg-primary/5">
              <div className="p-1.5 text-[10px] uppercase tracking-widest text-primary font-bold border-b border-primary/20">
                🛒 Sepet
              </div>
              <div className="p-1.5 max-h-[40vh] overflow-y-auto">
                {pendingItems.map(item => {
                  const itemOptions = productOptions.filter(o => o.product_id === item.id);
                  const isExpanded = expandedPendingId === item.uid;
                  return (
                    <div key={item.uid} className="py-1.5 border-b border-dashed border-muted text-[11px]">
                      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedPendingId(isExpanded ? null : item.uid)}>
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium">{item.name} {itemOptions.length > 0 && <span className="text-[9px] text-primary">▾</span>}</div>
                          <div className="text-[9px] text-muted-foreground">
                            ₺{item.price} × {item.qty}{item.extraCharge > 0 ? ` + ₺${item.extraCharge}` : ''}
                            {item.selectedOptions.length > 0 && ` (${item.selectedOptions.map(o => o.name).join(', ')})`}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-1">
                          <button className="w-5 h-5 flex items-center justify-center border border-foreground/30 text-[10px] font-bold bg-[#e74c3c] text-white"
                            onClick={e => { e.stopPropagation(); updatePendingQty(item.uid, -1); }}>−</button>
                          <span className="text-[11px] font-bold w-4 text-center">{item.qty}</span>
                          <button className="w-5 h-5 flex items-center justify-center border border-foreground/30 text-[10px] font-bold bg-[#f39c12] text-white"
                            onClick={e => { e.stopPropagation(); updatePendingQty(item.uid, 1); }}>+</button>
                          <span className="text-[10px] ml-1 text-muted-foreground">₺{(item.price + item.extraCharge) * item.qty}</span>
                        </div>
                      </div>
                      {/* Collapsible options */}
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
                          <div className="flex gap-1">
                            <input type="text" className="win-input flex-1 text-[9px] py-0.5"
                              placeholder="Not..." value={item.note}
                              onChange={e => updatePendingNote(item.uid, e.target.value)} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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
          <div className="p-1.5 text-[10px] uppercase tracking-widest text-muted-foreground border-b border-foreground/20 flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <input type="checkbox" className="w-3.5 h-3.5 accent-primary cursor-pointer"
                checked={allItems.length > 0 && checkedItems.size === allItems.length}
                onChange={() => { if (checkedItems.size === allItems.length) setCheckedItems(new Set()); else setCheckedItems(new Set(allItems.map((_, i) => `${i}`))); }} />
              <span>Siparişler</span>
            </div>
            <span>{tableNum}.Hesap: {userName.toUpperCase()}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-1.5">
            {allItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-3 text-[10px]">Sipariş yok</p>
            ) : (
              allItems.map((item, idx) => (
                <div key={idx}
                  className={`flex justify-between items-center py-1.5 border-b border-dashed border-muted text-[11px] hover:bg-muted/30 ${checkedItems.has(`${idx}`) ? 'bg-primary/10' : ''}`}>
                  <div className="flex items-center gap-1.5">
                    <input type="checkbox" className="w-3.5 h-3.5 accent-primary cursor-pointer"
                      checked={checkedItems.has(`${idx}`)}
                      onChange={() => toggleCheck(`${idx}`)} />
                    <span>{item.qty}x {item.name.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">₺{item.price}</span>
                    <span className="text-primary cursor-pointer text-[12px]" onClick={() => openEditItem(item)}>✏️</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Note field */}
          <div className="border-t border-foreground/20 p-1.5">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Not</div>
            <textarea
              className="win-input w-full text-[10px]"
              rows={2}
              value={paymentNote}
              onChange={e => setPaymentNote(e.target.value)}
              placeholder="Sipariş notu..."
            />
          </div>

          {/* Total + actions */}
          <div className="border-t border-foreground/20 p-1.5 overflow-hidden">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Toplam</span>
              <span className="text-[15px] font-bold">₺{(tableTotal + pendingTotal).toLocaleString('tr')}</span>
            </div>

            {pendingItems.length > 0 ? (
              <button className="win-btn win-btn-primary text-[11px] py-1.5 w-full mb-1 bg-[#2ecc71] border-[#27ae60] text-white font-bold"
                onClick={confirmPendingOrder}>
                ✔ Siparişleri Kabul Et — ₺{pendingTotal.toLocaleString('tr')}
              </button>
            ) : hasChecked ? (
              <>
                <button className="win-btn win-btn-primary text-[11px] py-1.5 w-full mb-1"
                  onClick={() => setShowPartialPayment(true)}>
                  💰 Seçilenlerin Ödemesini Al — ₺{checkedTotal.toLocaleString('tr')}
                </button>
                <button className="win-btn text-[10px] py-1 w-full mb-1 bg-destructive text-white border-destructive font-bold"
                  onClick={cancelSelectedItems}>
                  ❌ Seçilenleri İptal Et ({checkedItems.size})
                </button>
              </>
            ) : (
              <button className="win-btn win-btn-primary text-[11px] py-1.5 w-full mb-1"
                disabled={allItems.length === 0}
                onClick={() => setShowPayment(true)}>
                💰 Ödeme Al — ₺{tableTotal.toLocaleString('tr')}
              </button>
            )}
            <button className="win-btn text-[10px] py-1 w-full mb-1 bg-[#e67e22] text-white border-[#d35400] font-bold"
              disabled={allItems.length === 0 || pendingItems.length > 0}
              onClick={() => { fetchAllTables(); setShowTableTransfer(true); }}>
              🪑 Masayı Taşı
            </button>
            <button className="win-btn text-[10px] py-1 w-full mb-1 bg-[#9b59b6] text-white border-[#8e44ad] font-bold"
              disabled={allItems.length === 0 || pendingItems.length > 0}
              onClick={() => { fetchAccounts(); setShowAccountTransfer(true); }}>
              📋 Cariye Taşı
            </button>
            <button className="win-btn text-[10px] py-0.5 w-full text-destructive"
              disabled={allItems.length === 0 && pendingItems.length === 0}
              onClick={pendingItems.length > 0 ? () => setPendingItems([]) : cancelOrders}>
              {pendingItems.length > 0 ? '🗑 Sepeti Temizle' : '❌ Tümünü İptal'}
            </button>
          </div>
        </div>
      </div>
      {/* Partial Payment Dialog */}
      <Dialog open={showPartialPayment} onOpenChange={setShowPartialPayment}>
        <DialogContent className="max-w-[320px]">
          <DialogHeader>
            <DialogTitle className="text-center">Seçili Ürünler Ödeme</DialogTitle>
          </DialogHeader>
          <div className="text-center mb-2">
            <div className="text-[11px] text-muted-foreground mb-1">{checkedItems.size} ürün seçili</div>
            <div className="text-xl font-bold">₺{checkedTotal.toLocaleString('tr')}</div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button className="win-btn text-[12px] py-2 bg-[#2ecc71] text-white border-[#27ae60] font-bold" onClick={() => { handleSelectedPayment('nakit'); setShowPartialPayment(false); }}>
              💵 Nakit
            </button>
            <button className="win-btn text-[12px] py-2 bg-[#e74c3c] text-white border-[#c0392b] font-bold" onClick={() => { handleSelectedPayment('kredi kartı'); setShowPartialPayment(false); }}>
              💳 Kredi Kartı
            </button>
            <button className="win-btn text-[12px] py-2 bg-[#3498db] text-white border-[#2980b9] font-bold" onClick={() => { handleSelectedPayment('havale'); setShowPartialPayment(false); }}>
              🏦 Havale
            </button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Edit Item Dialog */}
      <Dialog open={!!editItem} onOpenChange={open => { if (!open) setEditItem(null); }}>
        <DialogContent className="max-w-[360px] p-0">
          {editItem && (
            <>
              <div className="flex flex-col items-center pt-6 pb-2">
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold mb-2">
                  {editItem.name.substring(0, 2).toUpperCase()}
                </div>
                <DialogHeader className="text-center">
                  <DialogTitle className="text-lg font-bold">{editItem.name.toUpperCase()}</DialogTitle>
                </DialogHeader>
                <div className="text-sm text-muted-foreground">Fiyat {(editItem.price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</div>
              </div>

              <div className="px-6 pb-4 space-y-3">
                {/* Qty controls */}
                <div className="flex items-center justify-center gap-3">
                  <button className="w-10 h-10 rounded-full bg-primary text-primary-foreground text-xl font-bold flex items-center justify-center"
                    onClick={() => setEditQty(Math.max(0, editQty - 1))}>−</button>
                  <input type="number" className="win-input text-center text-xl font-bold w-24 py-2"
                    value={editQty} onChange={e => setEditQty(Math.max(0, parseInt(e.target.value) || 0))} />
                  <button className="w-10 h-10 rounded-full bg-primary text-primary-foreground text-xl font-bold flex items-center justify-center"
                    onClick={() => setEditQty(editQty + 1)}>+</button>
                </div>

                {/* Quick qty buttons */}
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n}
                      className={`w-9 h-9 rounded-lg text-sm font-bold flex items-center justify-center border-2 ${editQty === n ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-foreground border-border'}`}
                      onClick={() => setEditQty(n)}>{n}</button>
                  ))}
                </div>

                {/* Note */}
                <textarea className="win-input w-full text-sm" rows={2} placeholder="Sipariş Notu"
                  value={editNote} onChange={e => setEditNote(e.target.value)} />

                {/* Extra charge */}
                <input type="number" className="win-input w-full text-sm" placeholder="Ekstra Ücret"
                  value={editExtra || ''} onChange={e => setEditExtra(parseFloat(e.target.value) || 0)} />

                {/* Options display */}
                {editItem.options && editItem.options.length > 0 && (
                  <div className="text-xs text-muted-foreground">{editItem.options.join(', ')}</div>
                )}

                {/* Save button */}
                <button className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-base"
                  onClick={saveEditItem}>
                  Kaydet ({((editItem.price + editExtra) * editQty).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺)
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTableDetail;
