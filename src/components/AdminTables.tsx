import React, { useState, useEffect } from 'react';
import { useToast95Context } from '@/contexts/Toast95Context';
import { supabase } from '@/integrations/supabase/client';
import type { Order } from '@/data/menu';

interface TableArea { id: string; name: string; sort_order: number; }
interface TableConfig { id: string; table_num: number; area_id: string | null; capacity: number; is_active: boolean; }

const statusColors: Record<string, string> = {
  waiting: 'bg-[#c0392b]',
  preparing: 'bg-[#d35400]',
  ready: 'bg-[#27ae60]',
  paid: 'bg-muted',
};

const AdminTables = () => {
  const { showToast } = useToast95Context();
  const [areas, setAreas] = useState<TableArea[]>([]);
  const [tables, setTables] = useState<TableConfig[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>('open');

  const fetchAll = async () => {
    const [{ data: a }, { data: t }, { data: o }] = await Promise.all([
      supabase.from('table_areas').select('*').order('sort_order'),
      supabase.from('tables').select('*').order('table_num'),
      supabase.from('orders').select('*').in('status', ['waiting', 'preparing', 'ready']).order('created_at', { ascending: false }),
    ]);
    if (a) setAreas(a);
    if (t) setTables(t);
    if (o) setOrders(o as unknown as Order[]);
  };

  useEffect(() => {
    fetchAll();
    const channel = supabase.channel('admin-tables')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Group active orders by table_num
  const ordersByTable: Record<number, Order[]> = {};
  orders.forEach(o => {
    if (!ordersByTable[o.table_num]) ordersByTable[o.table_num] = [];
    ordersByTable[o.table_num].push(o);
  });

  const openTableNums = Object.keys(ordersByTable).map(Number);
  const getAreaName = (areaId: string | null) => areas.find(a => a.id === areaId)?.name || '—';

  // Filter tables based on selected area
  const getVisibleTables = () => {
    if (selectedArea === 'open') {
      return tables.filter(t => openTableNums.includes(t.table_num));
    }
    return tables.filter(t => t.area_id === selectedArea);
  };

  const visibleTables = getVisibleTables();

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} dk önce`;
    const hours = Math.floor(mins / 60);
    return `${hours} saat önce`;
  };

  return (
    <>
      {/* Area filter tabs */}
      <div className="flex gap-1 flex-wrap mb-2.5">
        <button
          className={`font-mono text-[11px] px-2.5 py-0.5 cursor-pointer border-2 ${selectedArea === 'open' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-card-foreground win-raised'}`}
          onClick={() => setSelectedArea('open')}>
          Açık Masalar ({openTableNums.length})
        </button>
        {areas.map(a => (
          <button key={a.id}
            className={`font-mono text-[11px] px-2.5 py-0.5 cursor-pointer border-2 ${selectedArea === a.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-card-foreground win-raised'}`}
            onClick={() => setSelectedArea(a.id)}>{a.name}</button>
        ))}
      </div>

      {/* Table cards */}
      {!visibleTables.length ? (
        <p className="text-muted-foreground text-center py-3.5 text-xs">
          {selectedArea === 'open' ? 'Açık masa yok.' : 'Bu alanda masa yok.'}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {visibleTables.map(t => {
            const tableOrders = ordersByTable[t.table_num] || [];
            const hasOrders = tableOrders.length > 0;
            const latestOrder = tableOrders[0];
            const tableTotal = tableOrders.reduce((s, o) => s + Number(o.total), 0);

            // Determine card color based on most urgent status
            const hasWaiting = tableOrders.some(o => o.status === 'waiting');
            const hasPreparing = tableOrders.some(o => o.status === 'preparing');
            const bgColor = hasWaiting ? statusColors.waiting : hasPreparing ? statusColors.preparing : hasOrders ? statusColors.ready : 'bg-card';
            const textColor = hasOrders ? 'text-white' : 'text-foreground';

            return (
              <div key={t.id} className={`border border-foreground ${bgColor} ${textColor}`}>
                <div className="p-2.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-[13px] font-bold">Masa {t.table_num}</div>
                      {hasOrders && (
                        <div className="text-[10px] opacity-80">{timeAgo(latestOrder.created_at)}</div>
                      )}
                    </div>
                    {hasOrders && (
                      <div className="text-[10px] opacity-70">{tableOrders.length} sipariş</div>
                    )}
                  </div>

                  {hasOrders ? (
                    <>
                      <div className="mt-1.5 text-[10px] opacity-80">{latestOrder.user_name}</div>
                      <div className="text-[15px] font-bold mt-1">₺{tableTotal.toLocaleString('tr')}</div>
                    </>
                  ) : (
                    <div className="mt-2 text-[11px] text-muted-foreground">Boş</div>
                  )}
                </div>

                {/* Area label */}
                <div className={`px-2.5 py-1 text-[9px] uppercase tracking-widest border-t ${hasOrders ? 'border-white/20 opacity-70' : 'border-foreground/20 text-muted-foreground'}`}>
                  {getAreaName(t.area_id)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default AdminTables;
