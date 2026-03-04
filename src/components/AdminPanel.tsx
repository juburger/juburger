import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import WinWindow from '@/components/WinWindow';
import { useToast95Context } from '@/contexts/Toast95Context';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import type { Order } from '@/data/menu';
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
import AdminClosedTables from '@/components/AdminClosedTables';
import AdminMembers from '@/components/AdminMembers';

type TabType = 'orders' | 'tables' | 'closed' | 'transfer' | 'accounts' | 'members' | 'quick' | 'stats' | 'reports' | 'products' | 'settings' | 'qr' | 'logs';

const payLabels: Record<string, string> = { card: 'Kart', cash: 'Nakit', pos: 'POS' };

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildReceiptHtml = (order: Order, paperSize: string) => {
  const width = paperSize === '58' ? '58mm' : '80mm';
  const fontSize = paperSize === '58' ? '12px' : '14px';
  const createdAt = new Date(order.created_at);
  const time = createdAt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const date = createdAt.toLocaleDateString('tr-TR');
  const safeNote = order.note ? `<div>Not: ${escapeHtml(order.note)}</div>` : '';
  const items = (Array.isArray(order.items) ? order.items : []) as Array<{ name: string; qty: number; price: number }>;
  const itemRows = items
    .map((item) => `<div style="display:flex;justify-content:space-between;font-weight:700;"><span>${escapeHtml(item.name)} x${item.qty}</span><span>₺${(Number(item.price) * Number(item.qty)).toFixed(2)}</span></div>`)
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8" /><style>
    @page { margin: 0; }
    html, body { margin: 0; padding: 0; }
    body { width: ${width}; padding: ${paperSize === '58' ? '2mm' : '4mm'}; font-family: 'Courier New', monospace; font-size: ${fontSize}; font-weight: 600; color: #000; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  </style></head><body>
    <div style="text-align:center;margin-bottom:8px;"><div style="font-size:22px;font-weight:900;">JU - Sipariş Sistemi</div><div style="font-size:13px;font-weight:700;">================================</div></div>
    <div style="margin-bottom:6px;font-weight:700;"><div>Sipariş: #${order.id.substring(0, 6).toUpperCase()}</div><div>Masa: ${order.table_num} — ${escapeHtml(order.user_name)}</div><div>${date} ${time}</div></div>
    <div style="font-size:13px;font-weight:700;">--------------------------------</div>
    <div style="margin-bottom:6px;">${itemRows}</div>
    <div style="font-size:13px;font-weight:700;">--------------------------------</div>
    <div style="display:flex;justify-content:space-between;font-weight:900;font-size:18px;margin-top:4px;"><span>TOPLAM</span><span>₺${Number(order.total).toFixed(2)}</span></div>
    <div style="margin-top:6px;font-size:13px;font-weight:700;"><div>Ödeme: ${payLabels[order.payment_type] || escapeHtml(order.payment_type)}</div>${safeNote}</div>
    <div style="font-size:13px;font-weight:700;margin-top:8px;">================================</div>
    <div style="text-align:center;font-size:13px;font-weight:700;margin-top:4px;">Afiyet olsun!</div>
  </body></html>`;
};

const AdminPanel = () => {
  const navigate = useNavigate();
  const { showToast } = useToast95Context();
  const { tenant, tenantId } = useTenant();
  const [hasTenantAccess, setHasTenantAccess] = useState(false);
  const [accessChecking, setAccessChecking] = useState(true);
  const [tab, setTab] = useState<TabType>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState({
    card_enabled: true, cash_enabled: true, pos_enabled: true,
    sound_enabled: true, waiter_enabled: true,
    auto_print_enabled: true, paper_size: '80', printer_name: '',
  });
  const knownOrderIds = useRef<Set<string>>(new Set());
  const initialLoadDone = useRef(false);
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const printIframeRef = useRef<HTMLIFrameElement>(null);

  const [isPrintServer, setIsPrintServer] = useState(() => localStorage.getItem('ju_print_server') === '1');

  useEffect(() => {
    const verifyAccess = async () => {
      if (!tenantId) {
        setHasTenantAccess(false);
        setAccessChecking(false);
        return;
      }

      setAccessChecking(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setHasTenantAccess(false);
        setAccessChecking(false);
        navigate('/admin-login', { replace: true });
        return;
      }

      const [roleRes, tenantAccessRes] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle(),
        supabase.from('tenant_users').select('id').eq('tenant_id', tenantId).eq('user_id', user.id).maybeSingle(),
      ]);

      if (roleRes.error || tenantAccessRes.error || !roleRes.data || !tenantAccessRes.data) {
        await supabase.auth.signOut();
        setHasTenantAccess(false);
        setAccessChecking(false);
        showToast('Bu işletmenin yönetim paneline erişim izniniz yok', false);
        navigate('/admin-login', { replace: true });
        return;
      }

      setHasTenantAccess(true);
      setAccessChecking(false);
    };

    void verifyAccess();
  }, [tenantId, navigate, showToast]);

  const togglePrintServer = (val: boolean) => {
    setIsPrintServer(val);
    localStorage.setItem('ju_print_server', val ? '1' : '0');
    showToast(val ? 'Bu cihaz yazıcı bilgisayar olarak ayarlandı ✓' : 'Yazıcı bilgisayar devre dışı');
  };

  const triggerPrint = useCallback((order: Order, source: 'manual' | 'auto' = 'manual') => {
    const currentSettings = settingsRef.current;
    const isCurrentDevicePrintServer = localStorage.getItem('ju_print_server') === '1';

    if (source === 'auto') {
      if (!currentSettings.auto_print_enabled) return;
      if (!isCurrentDevicePrintServer) return;
    }

    const iframe = printIframeRef.current;
    if (!iframe || !iframe.contentWindow) {
      showToast('❌ Yazdırma penceresi açılamadı', false);
      return;
    }

    showToast(`🖨️ Yazdırma başlatılıyor: #${order.id.substring(0, 6).toUpperCase()}`);

    try {
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      doc.write(buildReceiptHtml(order, currentSettings.paper_size || '80'));
      doc.close();

      const runPrint = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          showToast(`✅ Fiş yazdırıldı: #${order.id.substring(0, 6).toUpperCase()}`);
        } catch {
          showToast('❌ Yazdırma başarısız. Yazıcı/Chrome kiosk ayarını kontrol edin.', false);
        }
      };

      setTimeout(runPrint, 450);
    } catch {
      showToast('❌ Fiş oluşturulamadı', false);
    }
  }, [showToast]);

  // Load orders realtime
  useEffect(() => {
    if (!tenantId) return;

    const fetchOrders = async () => {
      const { data } = await supabase.from('orders').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(50);
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

    const channel = supabase.channel(`admin-orders-${tenantId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `tenant_id=eq.${tenantId}` }, (payload) => {
        const newOrder = payload.new as unknown as Order;
        if (!knownOrderIds.current.has(newOrder.id)) {
          knownOrderIds.current.add(newOrder.id);
          triggerPrint(newOrder, 'auto');
        }
        fetchOrders();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `tenant_id=eq.${tenantId}` }, () => fetchOrders())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tenantId, triggerPrint]);

  // Load settings
  useEffect(() => {
    if (!tenantId) return;

    const fetchSettings = async () => {
      const { data } = await supabase.from('settings').select('*').eq('id', 'payment').eq('tenant_id', tenantId).maybeSingle();
      if (data) setSettings(data as any);
    };
    fetchSettings();
  }, [tenantId]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (error) showToast('Güncelleme hatası', false);
    else showToast('Sipariş güncellendi ✓');
  };

  const cancelOrder = async (order: Order) => {
    const { error } = await supabase.from('orders').update({ status: 'paid', payment_status: 'cancelled' }).eq('id', order.id);
    if (error) { showToast('İptal hatası', false); return; }

    // Always print cancellation receipt
    const items = Array.isArray(order.items) ? order.items : [];
    const cancelReceipt = {
      ...order,
      id: crypto.randomUUID(),
      note: `İPTAL FİŞİ: #${order.id.substring(0, 6).toUpperCase()}`,
      items: (items as any[]).map((i: any) => ({ ...i, name: `İPTAL: ${i.name}` })),
    } as unknown as Order;
    triggerPrint(cancelReceipt);

    showToast('Sipariş iptal edildi ✓');
  };

  const saveSettings = async (key: string, val: boolean | string) => {
    const updated = { ...settings, [key]: val };
    setSettings(updated);
    await supabase.from('settings').update({ [key]: val }).eq('id', 'payment').eq('tenant_id', tenantId);
    showToast('Ayarlar kaydedildi ✓');
  };

  const waitingCount = orders.filter(o => o.status === 'waiting').length;

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
    { id: 'quick', label: 'Hızlı Sipariş' },
    { id: 'tables', label: 'Masalar' },
    { id: 'transfer', label: 'Masa Taşıma' },
    { id: 'closed', label: 'Kapanan Masalar' },
    { id: 'accounts', label: 'Cari Hesaplar' },
  ];


  return (
    <WinWindow
      icon="⚙️"
      title={`${tenant?.name || 'siparis.co'} — Yönetici Paneli`}
      menuItems={[
        { label: '← Geri', onClick: () => navigate(-1 as any) },
        
        { label: 'Raporlar', onClick: () => setTab('reports') },
        { label: 'Üyeler', onClick: () => setTab('members') },
        { label: 'İstatistik', onClick: () => setTab('stats') },
        { label: 'Ürünler', onClick: () => setTab('products') },
        { label: 'QR', onClick: () => setTab('qr') },
        { label: 'Ayarlar', onClick: () => setTab('settings') },
        { label: 'Log', onClick: () => setTab('logs') },
        { label: '🚪 Çıkış', onClick: handleLogout },
      ]}
      controls={[{ label: '×', onClick: handleLogout }]}
      statusItems={['Yönetici girişi yapıldı']}
    >
      {/* Tabs */}
      <div className="flex gap-1.5 mb-3 pb-1 flex-wrap">
        {tabs.map(t => (
          <button key={t.id}
            className={`px-3 py-1.5 text-xs cursor-pointer font-medium rounded-full transition-all ${tab === t.id ? 'neu-sunken font-semibold bg-[#F97316] text-black' : 'neu-flat bg-[#F97316]/80 text-black'}`}
            onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* ORDERS TAB */}
      {tab === 'orders' && (
        <>
          {!orders.length ? (
            <p className="text-muted-foreground text-center py-3.5 text-xs">Sipariş bulunamadı.</p>
          ) : orders.map(o => (
            <div key={o.id} className="neu-raised mb-3 text-xs overflow-hidden text-foreground">
              <div className="bg-card px-3 py-2 flex justify-between items-center text-xs rounded-t-[var(--radius)] neu-flat">
                <span className="text-[#5EBC80] font-semibold">#{o.id.substring(0, 6).toUpperCase()} — Masa {o.table_num} — {o.user_name}</span>
                <span className="text-[10px]">
                  {new Date(o.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="p-3">
                {(Array.isArray(o.items) ? o.items : []).map((i: any, idx: number) => (
                  <div key={idx}>• {i.name} × {i.qty} — ₺{i.price * i.qty}</div>
                ))}
                {o.note && <div className="text-[10px] text-muted-foreground mt-1">Not: {o.note}</div>}
              </div>
              <div className="bg-muted/30 px-3 py-2 flex justify-between items-center border-t border-border/30 gap-2">
                <strong>₺{o.total}</strong>
                <div className="flex gap-1.5 items-center flex-wrap">
                  <button className="neu-btn text-[10px] py-1 px-2.5" onClick={() => triggerPrint(o)}>🖨️</button>
                  {o.payment_status === 'cancelled' ? (
                    <span className="text-[10px] text-destructive font-bold">❌ İptal Edildi</span>
                  ) : (
                    ['waiting', 'preparing', 'ready'].includes(o.status) && (
                      <button className="neu-btn text-[10px] py-1 px-2.5 text-destructive" onClick={() => cancelOrder(o)}>İptal</button>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {/* STATS TAB */}
      {tab === 'stats' && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4 text-foreground">
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
      {tab === 'closed' && <AdminClosedTables onPrintOrder={triggerPrint} />}

      {/* TABLE TRANSFER TAB */}
      {tab === 'transfer' && <AdminTableTransfer />}

      {/* ACCOUNTS TAB */}
      {tab === 'accounts' && <AdminAccounts />}

      {/* MEMBERS TAB */}
      {tab === 'members' && <AdminMembers />}

      {/* QUICK ORDER TAB */}
      {tab === 'quick' && <AdminQuickOrder onPrintOrder={triggerPrint} />}

      {/* PRODUCTS TAB */}
      {tab === 'products' && <AdminProducts />}

      {/* SETTINGS TAB */}
      {tab === 'settings' && (
        <div className="text-foreground">
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
        </div>
      )}

      {/* LOGS TAB */}
      {tab === 'logs' && <AdminLogs />}

      {/* QR TAB */}
      {tab === 'qr' && <AdminQRCodes />}

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
