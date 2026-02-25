import React, { useState, useEffect } from 'react';
import { useToast95Context } from '@/contexts/Toast95Context';
import { supabase } from '@/integrations/supabase/client';
import type { Order } from '@/data/menu';

const payLabels: Record<string, string> = { nakit: 'Nakit', 'kredi kartı': 'Kredi Kartı', havale: 'Havale', cash: 'Nakit', card: 'Kart', pos: 'POS', cari: 'Cari' };

interface Props {
  onPrintOrder?: (order: Order) => void;
}

const AdminClosedTables: React.FC<Props> = ({ onPrintOrder }) => {
  const { showToast } = useToast95Context();
  const [closedOrders, setClosedOrders] = useState<Order[]>([]);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [reopening, setReopening] = useState<string | null>(null);

  const fetchClosed = async () => {
    // Get today's paid orders
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'paid')
      .gte('created_at', today.toISOString())
      .order('updated_at', { ascending: false })
      .limit(100);
    if (data) setClosedOrders(data as unknown as Order[]);
  };

  useEffect(() => {
    fetchClosed();
    const ch = supabase.channel('closed-tables')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchClosed())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Group by table_num
  const byTable: Record<number, Order[]> = {};
  closedOrders.forEach(o => {
    if (o.table_num === 0) return; // skip quick orders
    if (!byTable[o.table_num]) byTable[o.table_num] = [];
    byTable[o.table_num].push(o);
  });

  const tableNums = Object.keys(byTable).map(Number).sort((a, b) => {
    // Sort by latest update desc
    const aTime = new Date(byTable[a][0].created_at).getTime();
    const bTime = new Date(byTable[b][0].created_at).getTime();
    return bTime - aTime;
  });

  const reopenTable = async (tableNum: number) => {
    const tableOrders = byTable[tableNum];
    if (!tableOrders) return;
    setReopening(`${tableNum}`);

    for (const o of tableOrders) {
      await supabase.from('orders').update({ status: 'ready', payment_status: 'pending' }).eq('id', o.id);
    }

    await supabase.from('table_logs').insert({
      table_num: tableNum,
      user_name: 'Administrator',
      action: 'Masa tekrar açıldı',
      details: `(Ödeme iptal edildi — ₺${tableOrders.reduce((s, o) => s + Number(o.total), 0)})`,
    });

    showToast(`Masa ${tableNum} tekrar açıldı ✓`);
    setReopening(null);
    setSelectedTable(null);
    fetchClosed();
  };

  const changePaymentType = async (tableNum: number, newPaymentType: string) => {
    const tableOrders = byTable[tableNum];
    if (!tableOrders) return;

    for (const o of tableOrders) {
      await supabase.from('orders').update({ payment_type: newPaymentType }).eq('id', o.id);
    }

    await supabase.from('table_logs').insert({
      table_num: tableNum,
      user_name: 'Administrator',
      action: 'Ödeme türü değiştirildi',
      details: `(Masa ${tableNum} → ${payLabels[newPaymentType] || newPaymentType})`,
    });

    showToast(`Ödeme türü güncellendi: ${payLabels[newPaymentType] || newPaymentType} ✓`);
    setSelectedTable(null);
    fetchClosed();
  };

  const timeStr = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  // Detail view for a selected table
  if (selectedTable !== null && byTable[selectedTable]) {
    const tableOrders = byTable[selectedTable];
    const total = tableOrders.reduce((s, o) => s + Number(o.total), 0);
    const currentPayment = tableOrders[0]?.payment_type || 'nakit';
    const allItems: { name: string; qty: number; price: number }[] = [];
    tableOrders.forEach(o => {
      const items = Array.isArray(o.items) ? o.items : [];
      items.forEach((i: any) => {
        allItems.push({ name: i.name, qty: i.qty, price: i.price * i.qty });
      });
    });

    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <button className="neu-btn text-[11px] py-1 px-2.5" onClick={() => setSelectedTable(null)}>← Geri</button>
          <span className="text-[12px] font-bold">Masa {selectedTable} — Kapalı</span>
        </div>

        <div className="neu-raised p-3 mb-2.5 text-[11px]">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Sipariş Detayları</div>
          {allItems.map((item, idx) => (
            <div key={idx} className="flex justify-between py-0.5 border-b border-dashed border-muted">
              <span>{item.qty}x {item.name}</span>
              <span>₺{item.price}</span>
            </div>
          ))}
          <div className="flex justify-between mt-2 font-bold text-[13px]">
            <span>TOPLAM</span>
            <span>₺{total.toLocaleString('tr')}</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">
            Ödeme: {payLabels[currentPayment] || currentPayment} — {timeStr(tableOrders[0].created_at)}
          </div>
        </div>

        {/* Change payment type */}
        <div className="mb-2.5">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Ödeme Türünü Değiştir</div>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { type: 'nakit', icon: '💵', label: 'Nakit' },
              { type: 'kredi kartı', icon: '💳', label: 'Kredi Kartı' },
              { type: 'havale', icon: '🏦', label: 'Havale' },
            ].map(p => (
              <button key={p.type}
                className={`neu-btn text-[11px] py-2 font-bold ${currentPayment === p.type ? 'neu-sunken text-primary' : ''}`}
                onClick={() => changePaymentType(selectedTable, p.type)}>
                {p.icon} {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reopen table */}
        <button
          className="w-full neu-btn text-[11px] py-2 font-bold bg-[#e74c3c] text-white border-[#c0392b]"
          disabled={reopening !== null}
          onClick={() => reopenTable(selectedTable)}>
          🔓 Masayı Tekrar Aç (Ödemeyi İptal Et)
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
        Bugün Kapanan Masalar ({tableNums.length})
      </div>

      {tableNums.length === 0 ? (
        <p className="text-muted-foreground text-center py-3.5 text-xs">Bugün kapanan masa yok.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {tableNums.map(num => {
            const tableOrders = byTable[num];
            const total = tableOrders.reduce((s, o) => s + Number(o.total), 0);
            const payType = tableOrders[0]?.payment_type || '';
            const closedAt = timeStr(tableOrders[0]?.created_at);
            const userName = tableOrders[0]?.user_name || '';

            return (
              <div key={num}
                className="border border-foreground/30 bg-muted/30 cursor-pointer hover:bg-muted/50 active:opacity-75 transition-opacity"
                onClick={() => setSelectedTable(num)}>
                <div className="p-2.5">
                  <div className="flex justify-between items-start">
                    <div className="text-[13px] font-bold">Masa {num}</div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wider">
                      Kapalı
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{userName}</div>
                  <div className="text-[15px] font-bold mt-1">₺{total.toLocaleString('tr')}</div>
                </div>
                <div className="px-2.5 py-1 text-[9px] uppercase tracking-widest border-t border-foreground/20 text-muted-foreground flex justify-between">
                  <span>{payLabels[payType] || payType}</span>
                  <span>{closedAt}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default AdminClosedTables;
