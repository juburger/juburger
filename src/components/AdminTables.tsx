import React, { useState, useEffect } from 'react';
import { useToast95Context } from '@/contexts/Toast95Context';
import { supabase } from '@/integrations/supabase/client';
import type { Order } from '@/data/menu';
import AdminTableDetail from '@/components/AdminTableDetail';

interface TableArea { id: string; name: string; sort_order: number; }
interface TableConfig { id: string; table_num: number; area_id: string | null; capacity: number; is_active: boolean; }

const statusColors: Record<string, string> = {
  waiting: 'bg-[#c0392b]',
  preparing: 'bg-[#d35400]',
  ready: 'bg-[#27ae60]',
  paid: 'bg-muted',
};

interface Props {
  onPrintOrder?: (order: Order) => void;
}

const AdminTables: React.FC<Props> = ({ onPrintOrder }) => {
  const { showToast } = useToast95Context();
  const [areas, setAreas] = useState<TableArea[]>([]);
  const [tables, setTables] = useState<TableConfig[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>('open');
  const [selectedTable, setSelectedTable] = useState<{ tableNum: number; userName: string } | null>(null);

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

  const getVisibleTables = () => {
    if (selectedArea === 'open') {
      return tables.filter(t => openTableNums.includes(t.table_num));
    }
    return tables.filter(t => t.area_id === selectedArea);
  };

  const visibleTables = getVisibleTables();

  // Build display name: "AreaName LocalIndex" (e.g. "Kaldırım Masa 3")
  const getTableDisplayName = (t: TableConfig) => {
    const area = areas.find(a => a.id === t.area_id);
    if (!area) return `Masa ${t.table_num}`;
    const areaTablesAll = tables.filter(tb => tb.area_id === area.id).sort((a, b) => a.table_num - b.table_num);
    const localIdx = areaTablesAll.findIndex(tb => tb.id === t.id) + 1;
    return `${area.name} ${localIdx}`;
  };

  // Determine grid columns based on area's table count
  const getGridCols = () => {
    const count = visibleTables.length;
    if (count <= 6) return 3;
    return 4;
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} dk önce`;
    const hours = Math.floor(mins / 60);
    return `${hours} saat önce`;
  };

  // If a table is selected, show the detail view
  if (selectedTable) {
    return (
      <AdminTableDetail
        tableNum={selectedTable.tableNum}
        userName={selectedTable.userName}
        onClose={() => { setSelectedTable(null); fetchAll(); }}
        onPrintOrder={onPrintOrder}
      />
    );
  }

  return (
    <>
      {/* Area filter tabs */}
      <div className="flex gap-1 flex-wrap mb-2.5">
        <button
          className={`text-[11px] px-3 py-1 cursor-pointer rounded-full transition-all ${selectedArea === 'open' ? 'neu-sunken text-foreground font-semibold' : 'neu-flat text-muted-foreground'}`}
          onClick={() => setSelectedArea('open')}>
          Açık Masalar ({openTableNums.length})
        </button>
        {areas.map(a => (
          <button key={a.id}
            className={`text-[11px] px-3 py-1 cursor-pointer rounded-full transition-all ${selectedArea === a.id ? 'neu-sunken text-foreground font-semibold' : 'neu-flat text-muted-foreground'}`}
            onClick={() => setSelectedArea(a.id)}>{a.name}</button>
        ))}
      </div>

      {/* Table cards */}
      {!visibleTables.length ? (
        <p className="text-muted-foreground text-center py-3.5 text-xs">
          {selectedArea === 'open' ? 'Açık masa yok.' : 'Bu alanda masa yok.'}
        </p>
      ) : (
        <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${getGridCols()}, 1fr)` }}>
          {visibleTables.map(t => {
            const tableOrders = ordersByTable[t.table_num] || [];
            const hasOrders = tableOrders.length > 0;
            const latestOrder = tableOrders[0];
            const tableTotal = tableOrders.reduce((s, o) => s + Number(o.total), 0);

            const hasWaiting = tableOrders.some(o => o.status === 'waiting');
            const hasPreparing = tableOrders.some(o => o.status === 'preparing');
            const bgColor = hasWaiting ? statusColors.waiting : hasPreparing ? statusColors.preparing : hasOrders ? statusColors.ready : 'bg-card';
            const textColor = hasOrders ? 'text-white' : 'text-foreground';
            const displayName = getTableDisplayName(t);

            return (
              <div key={t.id}
                className={`border border-foreground/20 rounded-lg ${bgColor} ${textColor} cursor-pointer hover:opacity-90 active:opacity-75 transition-opacity aspect-[4/3] flex flex-col justify-between`}
                onClick={() => {
                  setSelectedTable({ tableNum: t.table_num, userName: hasOrders ? latestOrder.user_name : 'Admin' });
                }}>
                <div className="p-3">
                  <div className="text-[13px] font-bold">{displayName}</div>
                  {hasOrders && (
                    <>
                      <div className="text-[10px] opacity-70 mt-1">{latestOrder.user_name} · {timeAgo(latestOrder.created_at)}</div>
                      <div className="text-[10px] opacity-70">{tableOrders.length} sipariş</div>
                      <div className="text-[15px] font-bold mt-1">₺{tableTotal.toLocaleString('tr')}</div>
                    </>
                  )}
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
