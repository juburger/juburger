import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import type { Order } from '@/data/menu';

type Period = 'daily' | 'monthly' | 'yearly';

const AdminReports = () => {
  const { tenantId } = useTenant();
  const [orders, setOrders] = useState<Order[]>([]);
  const [period, setPeriod] = useState<Period>('daily');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const fetchOrders = async () => {
      let start: string, end: string;
      if (period === 'daily') {
        start = selectedDate + 'T00:00:00';
        end = selectedDate + 'T23:59:59';
      } else if (period === 'monthly') {
        const [y, m] = selectedDate.split('-');
        start = `${y}-${m}-01T00:00:00`;
        const lastDay = new Date(Number(y), Number(m), 0).getDate();
        end = `${y}-${m}-${lastDay}T23:59:59`;
      } else {
        const y = selectedDate.split('-')[0];
        start = `${y}-01-01T00:00:00`;
        end = `${y}-12-31T23:59:59`;
      }

      const { data } = await supabase.from('orders').select('*')
        .eq('tenant_id', tenantId)
        .gte('created_at', start).lte('created_at', end)
        .order('created_at', { ascending: false })
        .limit(1000);
      if (data) setOrders(data as unknown as Order[]);
    };
    fetchOrders();
  }, [period, selectedDate, tenantId]);

  const paidOrders = orders.filter(o => o.payment_status === 'paid');
  const cancelledOrders = orders.filter(o => o.payment_status === 'cancelled');

  const totalRevenue = paidOrders.reduce((s, o) => s + Number(o.total), 0);
  const cancelledTotal = cancelledOrders.reduce((s, o) => s + Number(o.total), 0);

  // Payment type breakdown
  const byPaymentType: Record<string, number> = {};
  paidOrders.forEach(o => {
    const pt = o.payment_type || 'diğer';
    byPaymentType[pt] = (byPaymentType[pt] || 0) + Number(o.total);
  });
  const maxPayment = Math.max(...Object.values(byPaymentType), 1);

  // Top products
  const productCounts: Record<string, { qty: number; revenue: number }> = {};
  paidOrders.forEach(o => {
    const items = Array.isArray(o.items) ? o.items : [];
    items.forEach((i: any) => {
      if (!productCounts[i.name]) productCounts[i.name] = { qty: 0, revenue: 0 };
      productCounts[i.name].qty += i.qty;
      productCounts[i.name].revenue += i.price * i.qty;
    });
  });
  const topProducts = Object.entries(productCounts).sort((a, b) => b[1].qty - a[1].qty).slice(0, 10);

  // Unique tables served
  const uniqueTables = new Set(paidOrders.map(o => o.table_num)).size;

  // Daily breakdown for monthly/yearly
  const dailyBreakdown: Record<string, number> = {};
  if (period !== 'daily') {
    paidOrders.forEach(o => {
      const day = o.created_at.split('T')[0];
      dailyBreakdown[day] = (dailyBreakdown[day] || 0) + Number(o.total);
    });
  }
  const dailyEntries = Object.entries(dailyBreakdown).sort((a, b) => b[0].localeCompare(a[0]));
  const maxDaily = Math.max(...Object.values(dailyBreakdown), 1);

  const periodLabels: Record<Period, string> = { daily: 'Günlük', monthly: 'Aylık', yearly: 'Yıllık' };

  const formatMoney = (n: number) => `₺${n.toLocaleString('tr', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <>
      {/* Period selector */}
      <div className="flex gap-1 mb-2.5 flex-wrap items-end">
        {(['daily', 'monthly', 'yearly'] as Period[]).map(p => (
          <button key={p}
            className={`text-[11px] px-3 py-1 cursor-pointer rounded-full transition-all ${period === p ? 'neu-sunken text-foreground font-semibold' : 'neu-flat text-muted-foreground'}`}
            onClick={() => setPeriod(p)}>
            {periodLabels[p]}
          </button>
        ))}
        <input type="date" className="win-input text-[11px] ml-auto" value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="border border-foreground p-2.5">
          <div className="text-[20px] font-bold">{formatMoney(totalRevenue)}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
            {period === 'daily' ? new Date(selectedDate).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }) : period === 'monthly' ? 'Aylık Hesap Özeti' : 'Yıllık Hesap Özeti'}
          </div>
        </div>
        <div className="border border-foreground p-2.5">
          <div className="text-[20px] font-bold">{uniqueTables}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Masa Sayısı</div>
        </div>
        <div className="border border-foreground p-2.5">
          <div className="text-[20px] font-bold">{paidOrders.length}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Toplam Sipariş</div>
        </div>
      </div>

      {/* Payment type breakdown */}
      <div className="border border-foreground p-2.5 mb-3">
        <h3 className="text-[12px] font-bold mb-2">Ödeme Yöntemleri</h3>
        {Object.entries(byPaymentType).map(([type, amount]) => (
          <div key={type} className="mb-1.5">
            <div className="flex justify-between text-[11px] mb-0.5">
              <span className="uppercase font-medium">{type}</span>
              <span className="font-bold">{formatMoney(amount)}</span>
            </div>
            <div className="w-full h-2 bg-muted">
              <div className="h-full bg-[#f39c12]" style={{ width: `${(amount / maxPayment) * 100}%` }} />
            </div>
          </div>
        ))}

        {cancelledTotal > 0 && (
          <div className="mt-2 pt-2 border-t border-dashed border-muted">
            <div className="flex justify-between text-[11px]">
              <span>🏷️ İptal</span>
              <span className="font-bold text-destructive">{formatMoney(cancelledTotal)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Top products */}
      <div className="border border-foreground p-2.5 mb-3">
        <h3 className="text-[12px] font-bold mb-2">Ürün Satış Raporu</h3>
        <div className="flex text-[9px] uppercase tracking-widest text-muted-foreground border-b border-foreground pb-1 mb-1">
          <span className="w-6">#</span>
          <span className="flex-1">Ürün Adı</span>
          <span className="w-10 text-right">Adet</span>
          <span className="w-20 text-right">Tutar</span>
        </div>
        {topProducts.length === 0 ? (
          <p className="text-muted-foreground text-[10px] text-center py-2">Veri yok</p>
        ) : topProducts.map(([name, data], i) => (
          <div key={name} className="flex items-center text-[11px] py-0.5 border-b border-dashed border-muted">
            <span className="w-6 text-muted-foreground">{i + 1}</span>
            <span className="flex-1 truncate">{name}</span>
            <span className="w-10 text-right font-bold">{data.qty}</span>
            <span className="w-20 text-right text-muted-foreground">{formatMoney(data.revenue)}</span>
          </div>
        ))}
      </div>

      {/* Daily breakdown (for monthly/yearly) */}
      {period !== 'daily' && dailyEntries.length > 0 && (
        <div className="border border-foreground p-2.5 mb-3">
          <h3 className="text-[12px] font-bold mb-2">Gün Sonu Raporları</h3>
          <div className="flex text-[9px] uppercase tracking-widest text-muted-foreground border-b border-foreground pb-1 mb-1">
            <span className="w-24">#</span>
            <span className="flex-1">Ciro</span>
            <span className="w-24 text-right">Toplam</span>
          </div>
          {dailyEntries.slice(0, 10).map(([day, amount]) => (
            <div key={day} className="mb-1">
              <div className="flex justify-between text-[11px] mb-0.5">
                <span>{day}</span>
                <span className="font-bold">{formatMoney(amount)}</span>
              </div>
              <div className="w-full h-1.5 bg-muted">
                <div className="h-full bg-[#2c3e50]" style={{ width: `${(amount / maxDaily) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default AdminReports;
