import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import WinWindow from '@/components/WinWindow';
import { useToast95Context } from '@/contexts/Toast95Context';
import { supabase } from '@/integrations/supabase/client';
import type { Order } from '@/data/menu';
import ReceiptPrint from '@/components/ReceiptPrint';
import AdminProducts from '@/components/AdminProducts';
import AdminStaff from '@/components/AdminStaff';
import AdminTables from '@/components/AdminTables';
import AdminTableManagement from '@/components/AdminTableManagement';
import AdminLogs from '@/components/AdminLogs';
import AdminReports from '@/components/AdminReports';
import AdminQuickOrder from '@/components/AdminQuickOrder';
import AdminPrinters from '@/components/AdminPrinters';
import AdminTableTransfer from '@/components/AdminTableTransfer';
import AdminAccounts from '@/components/AdminAccounts';
import AdminQRCodes from '@/components/AdminQRCodes';

type TabType = 'orders' | 'tables' | 'transfer' | 'accounts' | 'quick' | 'stats' | 'reports' | 'products' | 'settings' | 'qr' | 'logs';
type FilterType = 'all' | 'waiting' | 'preparing' | 'ready' | 'paid';

const AdminPanel = () => {
  const navigate = useNavigate();
  const { showToast } = useToast95Context();
  const [tab, setTab] = useState<TabType>('orders');
  const [filter, setFilter] = useState<FilterType>('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState({
    card_enabled: true, cash_enabled: true, pos_enabled: true,
    sound_enabled: true, waiter_enabled: true,
    auto_print_enabled: true, paper_size: '80', printer_name: '',
  });
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const knownOrderIds = useRef<Set<string>>(new Set());
  const initialLoadDone = useRef(false);
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const printIframeRef = useRef<HTMLIFrameElement>(null);

  const [isPrintServer, setIsPrintServer] = useState(() => localStorage.getItem('ju_print_server') === '1');

  const togglePrintServer = (val: boolean) => {
    setIsPrintServer(val);
    localStorage.setItem('ju_print_server', val ? '1' : '0');
    showToast(val ? 'Bu cihaz yazıcı bilgisayar olarak ayarlandı ✓' : 'Yazıcı bilgisayar devre dışı');
  };

  const triggerPrint = useCallback((order: Order) => {
    setPrintOrder(order);
    setTimeout(() => {
      const iframe = printIframeRef.current;
      if (iframe) {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc && printRef.current) {
          doc.open();
          doc.write(`
            <html><head><style>
              body { margin: 0; padding: 4mm; font-family: 'Courier New', monospace; font-size: 12px; }
              .line { display: flex; justify-content: space-between; }
              .bold { font-weight: bold; }
              .center { text-align: center; }
              .sep { font-size: 11px; }
            </style></head><body>${printRef.current.innerHTML}</body></html>
          `);
          doc.close();
          setTimeout(() => {
            iframe.contentWindow?.print();
            showToast(`Fiş yazdırıldı: #${order.id.substring(0, 6).toUpperCase()}`);
          }, 200);
          return;
        }
      }
      window.print();
      showToast(`Fiş yazdırıldı: #${order.id.substring(0, 6).toUpperCase()}`);
    }, 400);
  }, [showToast]);

  // Load orders realtime
  useEffect(() => {
    const fetchOrders = async () => {
      const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(50);
      if (data) {
        const typedData = data as unknown as Order[];
        if (!initialLoadDone.current) {
          typedData.forEach(o => knownOrderIds.current.add(o.id));
          initialLoadDone.current = true;
        }
        setOrders(typedData);
      }
    };
    fetchOrders();

    const channel = supabase.channel('admin-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        const newOrder = payload.new as unknown as Order;
        if (!knownOrderIds.current.has(newOrder.id)) {
          knownOrderIds.current.add(newOrder.id);
          // Only auto-print if this device is the print server AND auto-print is enabled
          if (localStorage.getItem('ju_print_server') === '1') {
            triggerPrint(newOrder);
          }
        }
        fetchOrders();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => fetchOrders())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [triggerPrint]);

  // Load settings
  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('settings').select('*').eq('id', 'payment').single();
      if (data) setSettings(data as any);
    };
    fetchSettings();
  }, []);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (error) showToast('Güncelleme hatası', false);
    else showToast('Sipariş güncellendi ✓');
  };

  const saveSettings = async (key: string, val: boolean | string) => {
    const updated = { ...settings, [key]: val };
    setSettings(updated);
    await supabase.from('settings').update({ [key]: val }).eq('id', 'payment');
    showToast('Ayarlar kaydedildi ✓');
  };

  const filteredOrders = filter === 'all' ? orders : orders.filter(o => o.status === filter);
  const waitingCount = orders.filter(o => o.status === 'waiting').length;

  const statusLabels: Record<string, string> = { waiting: 'Bekliyor', preparing: 'Hazırlanıyor', ready: 'Hazır', paid: 'Tamamlandı' };
  const payLabels: Record<string, string> = { card: 'Kart', cash: 'Nakit', pos: 'POS' };
  const statusClass: Record<string, string> = {
    waiting: 'text-muted-foreground bg-muted/50',
    preparing: 'text-foreground bg-muted/60',
    ready: 'text-foreground bg-muted/80 font-bold',
    paid: 'text-muted-foreground/50 bg-muted/30',
  };

  const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0);
  const doneCount = orders.filter(o => o.status === 'paid').length;
  const activeCount = orders.filter(o => ['waiting', 'preparing', 'ready'].includes(o.status)).length;

  // Popular items
  const itemCounts: Record<string, number> = {};
  orders.forEach(o => {
    const items = Array.isArray(o.items) ? o.items : [];
    items.forEach((i: any) => { itemCounts[i.name] = (itemCounts[i.name] || 0) + i.qty; });
  });
  const popular = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: 'orders', label: `Siparişler ${waitingCount > 0 ? `(${waitingCount})` : ''}` },
    { id: 'tables', label: 'Masalar' },
    { id: 'transfer', label: 'Masa Taşıma' },
    { id: 'accounts', label: 'Cari Hesaplar' },
    { id: 'quick', label: 'Hızlı Sipariş' },
    { id: 'stats', label: 'İstatistik' },
    { id: 'reports', label: 'Raporlar' },
    { id: 'products', label: 'Ürünler' },
    { id: 'settings', label: 'Ayarlar' },
    { id: 'qr', label: 'QR Kodlar' },
    { id: 'logs', label: 'Logs' },
  ];

  const filters: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'Tümü' },
    { id: 'waiting', label: 'Bekliyor' },
    { id: 'preparing', label: 'Hazırlanıyor' },
    { id: 'ready', label: 'Hazır' },
    { id: 'paid', label: 'Tamamlanan' },
  ];

  return (
    <WinWindow
      icon="⚙️"
      title="JU — Yönetici Paneli"
      menuItems={[
        { label: '← Geri', onClick: () => navigate(-1 as any) },
        { label: 'Yenile', onClick: () => window.location.reload() },
        { label: '🚪 Çıkış', onClick: handleLogout },
      ]}
      controls={[{ label: '×', onClick: handleLogout }]}
      statusItems={['Yönetici girişi yapıldı']}
    >
      {/* Tabs */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button key={t.id}
            className={`px-3 py-1.5 text-xs font-medium cursor-pointer rounded-full whitespace-nowrap transition-all ${tab === t.id ? 'neu-sunken text-foreground font-semibold' : 'neu-btn'}`}
            onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* ORDERS TAB */}
      {tab === 'orders' && (
        <>
          <div className="flex gap-1.5 flex-wrap mb-3">
            {filters.map(f => (
              <button key={f.id}
                className={`text-xs px-3 py-1.5 cursor-pointer rounded-full transition-all ${filter === f.id ? 'neu-sunken text-foreground font-semibold' : 'neu-btn'}`}
                onClick={() => setFilter(f.id)}>{f.label}</button>
            ))}
          </div>
          {!filteredOrders.length ? (
            <p className="text-muted-foreground text-center py-3.5 text-xs">Sipariş bulunamadı.</p>
          ) : filteredOrders.map(o => (
            <div key={o.id} className="neu-raised mb-3 text-xs overflow-hidden">
              <div className="bg-card text-foreground px-3 py-2 flex justify-between items-center text-xs rounded-t-[var(--radius)] neu-flat">
                <span>#{o.id.substring(0, 6).toUpperCase()} — Masa {o.table_num} — {o.user_name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider ${statusClass[o.status] || ''}`}>
                  {statusLabels[o.status] || o.status}
                </span>
              </div>
              <div className="p-3">
                {(Array.isArray(o.items) ? o.items : []).map((i: any, idx: number) => (
                  <div key={idx}>• {i.name} × {i.qty} — ₺{i.price * i.qty}</div>
                ))}
                {o.note && <div className="text-[10px] text-muted-foreground mt-1">Not: {o.note}</div>}
                <div className="text-[10px] text-muted-foreground mt-1">
                  {new Date(o.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} — {payLabels[o.payment_type] || o.payment_type}
                </div>
              </div>
              <div className="bg-muted/30 px-3 py-2 flex justify-between items-center border-t border-border/30 gap-2">
                <strong>₺{o.total}</strong>
                <div className="flex gap-1.5 items-center">
                  <button className="neu-btn text-[10px] py-1 px-2.5" onClick={() => triggerPrint(o)}>🖨️</button>
                  {o.status === 'waiting' && <button className="neu-btn text-[10px] py-1 px-2.5" onClick={() => updateOrderStatus(o.id, 'preparing')}>Kabul Et</button>}
                  {o.status === 'preparing' && <button className="neu-btn text-[10px] py-1 px-2.5" onClick={() => updateOrderStatus(o.id, 'ready')}>Hazır</button>}
                  {o.status === 'ready' && <button className="neu-btn text-[10px] py-1 px-2.5" onClick={() => updateOrderStatus(o.id, 'paid')}>Ödendi</button>}
                  {o.status === 'paid' && <span className="text-[10px] text-muted-foreground">✓ Tamamlandı</span>}
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {/* STATS TAB */}
      {tab === 'stats' && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="neu-raised p-4"><div className="text-xl font-bold">₺{totalRevenue.toLocaleString('tr')}</div><div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Günlük Ciro</div></div>
            <div className="neu-raised p-4"><div className="text-xl font-bold">{orders.length}</div><div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Toplam Sipariş</div></div>
            <div className="neu-raised p-4"><div className="text-xl font-bold">{doneCount}</div><div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Tamamlanan</div></div>
            <div className="neu-raised p-4"><div className="text-xl font-bold">{activeCount}</div><div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Aktif Sipariş</div></div>
          </div>
          <hr className="border-t border-foreground my-2.5" />
          <h2 className="text-[13px] font-bold mb-1.5">EN ÇOK SİPARİŞ</h2>
          {popular.map(([name, qty], i) => (
            <div key={name} className="flex items-center justify-between py-1 border-b border-dashed border-muted text-[13px]">
              <span>{i + 1}. {name}</span><span>{qty}x</span>
            </div>
          ))}
        </>
      )}

      {/* REPORTS TAB */}
      {tab === 'reports' && <AdminReports />}

      {/* TABLES TAB */}
      {tab === 'tables' && <AdminTables onPrintOrder={triggerPrint} />}

      {/* TABLE TRANSFER TAB */}
      {tab === 'transfer' && <AdminTableTransfer />}

      {/* ACCOUNTS TAB */}
      {tab === 'accounts' && <AdminAccounts />}

      {/* QUICK ORDER TAB */}
      {tab === 'quick' && <AdminQuickOrder onPrintOrder={triggerPrint} />}

      {/* PRODUCTS TAB */}
      {tab === 'products' && <AdminProducts />}

      {/* SETTINGS TAB */}
      {tab === 'settings' && (
        <>
          <h2 className="text-[13px] font-bold mb-2">Ödeme Yöntemleri</h2>
          {[
            { key: 'card_enabled', icon: '💳', name: 'Kredi/Banka Kartı (Online)', desc: 'Müşteriler kart bilgisi girerek öder' },
            { key: 'cash_enabled', icon: '💵', name: 'Masada Nakit', desc: 'Sipariş sonrası masada nakit ödeme' },
            { key: 'pos_enabled', icon: '📱', name: 'Masada Kart (POS)', desc: 'Garson POS cihazıyla kart çekme' },
          ].map(o => (
            <div key={o.key} className="flex items-center justify-between py-1.5 border-b border-dashed border-muted gap-2.5">
              <div className="flex-1">
                <div className="text-[13px]">{o.icon} {o.name}</div>
                <div className="text-[11px] text-muted-foreground">{o.desc}</div>
              </div>
              <input type="checkbox" className="w-4 h-4 flex-shrink-0 cursor-pointer"
                checked={(settings as any)[o.key]} onChange={e => saveSettings(o.key, e.target.checked)} />
            </div>
          ))}
          <hr className="border-t border-foreground my-2.5" />
          <h2 className="text-[13px] font-bold mb-2">Sistem Ayarları</h2>
          {[
            { key: 'sound_enabled', icon: '🔔', name: 'Yeni Sipariş Bildirimi', desc: 'Yeni sipariş geldiğinde ses çal' },
            { key: 'waiter_enabled', icon: '🛎', name: 'Garson Çağırma', desc: 'Müşteriler garson çağırabilsin' },
          ].map(o => (
            <div key={o.key} className="flex items-center justify-between py-1.5 border-b border-dashed border-muted gap-2.5">
              <div className="flex-1">
                <div className="text-[13px]">{o.icon} {o.name}</div>
                <div className="text-[11px] text-muted-foreground">{o.desc}</div>
              </div>
              <input type="checkbox" className="w-4 h-4 flex-shrink-0 cursor-pointer"
                checked={(settings as any)[o.key]} onChange={e => saveSettings(o.key, e.target.checked)} />
            </div>
          ))}

          <hr className="border-t border-foreground my-2.5" />
          <AdminPrinters />

          <hr className="border-t border-foreground my-2.5" />
          <div className="flex items-center justify-between py-1.5 border-b border-dashed border-muted gap-2.5">
            <div className="flex-1">
              <div className="text-[13px]">🖨️ Otomatik Yazdırma</div>
              <div className="text-[11px] text-muted-foreground">Yeni sipariş geldiğinde fişi otomatik yazdır</div>
            </div>
            <input type="checkbox" className="w-4 h-4 flex-shrink-0 cursor-pointer"
              checked={settings.auto_print_enabled} onChange={e => saveSettings('auto_print_enabled', e.target.checked)} />
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-dashed border-muted gap-2.5">
            <div className="flex-1">
              <div className="text-[13px]">🖥️ Yazıcı Bilgisayar (Bu Cihaz)</div>
              <div className="text-[11px] text-muted-foreground">Sadece bu cihazda otomatik yazdırma yapılır. Diğer cihazlarda yazdırma tetiklenmez.</div>
            </div>
            <input type="checkbox" className="w-4 h-4 flex-shrink-0 cursor-pointer"
              checked={isPrintServer} onChange={e => togglePrintServer(e.target.checked)} />
          </div>

          <hr className="border-t border-dashed border-muted-foreground/40 my-2.5" />
          <p className="text-muted-foreground text-[11px]">Değişiklikler anında müşteri ekranına yansır.</p>


          <hr className="border-t border-foreground my-2.5" />
          <h2 className="text-[13px] font-bold mb-2">🪑 Masa Yönetimi</h2>
          <AdminTableManagement />

          <hr className="border-t border-foreground my-2.5" />
          <AdminStaff />
        </>
      )}

      {/* LOGS TAB */}
      {tab === 'logs' && <AdminLogs />}

      {/* QR TAB */}
      {tab === 'qr' && <AdminQRCodes />}

      {/* Hidden receipt for printing */}
      {printOrder && (
        <ReceiptPrint
          ref={printRef}
          orderId={printOrder.id}
          tableNum={printOrder.table_num}
          userName={printOrder.user_name}
          items={Array.isArray(printOrder.items) ? printOrder.items as any : []}
          total={printOrder.total}
          paymentType={printOrder.payment_type}
          note={printOrder.note}
          createdAt={printOrder.created_at}
          paperSize={settings.paper_size}
        />
      )}

      {/* Hidden iframe for silent printing */}
      <iframe
        ref={printIframeRef}
        style={{ position: 'fixed', width: 0, height: 0, border: 'none', left: '-9999px' }}
        title="print-frame"
      />
    </WinWindow>
  );
};

export default AdminPanel;
