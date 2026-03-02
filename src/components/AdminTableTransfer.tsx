import React, { useState, useEffect } from 'react';
import { useToast95Context } from '@/contexts/Toast95Context';
import { supabase } from '@/integrations/supabase/client';
import type { Order } from '@/data/menu';
import { useTenantId } from '@/hooks/useTenantQuery';

interface TableArea { id: string; name: string; sort_order: number; }
interface TableConfig { id: string; table_num: number; area_id: string | null; capacity: number; is_active: boolean; }

const AdminTableTransfer = () => {
  const { showToast } = useToast95Context();
  const tenantId = useTenantId();
  const [areas, setAreas] = useState<TableArea[]>([]);
  const [tables, setTables] = useState<TableConfig[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [sourceTable, setSourceTable] = useState<number | null>(null);
  const [targetTable, setTargetTable] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'full' | 'items'>('full');
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [sourceArea, setSourceArea] = useState<string>('open');
  const [targetArea, setTargetArea] = useState<string | null>(null);

  const fetchData = async () => {
    if (!tenantId) return;
    const [{ data: a }, { data: t }, { data: o }] = await Promise.all([
      supabase.from('table_areas').select('*').eq('tenant_id', tenantId).order('sort_order'),
      supabase.from('tables').select('*').eq('tenant_id', tenantId).order('table_num'),
      supabase.from('orders').select('*').eq('tenant_id', tenantId).in('status', ['waiting', 'preparing', 'ready']).order('created_at', { ascending: false }),
    ]);
    if (a) setAreas(a);
    if (t) setTables(t);
    if (o) setOrders(o as unknown as Order[]);
  };

  useEffect(() => { fetchData(); }, [tenantId]);

  const ordersByTable: Record<number, Order[]> = {};
  orders.forEach(o => {
    if (!ordersByTable[o.table_num]) ordersByTable[o.table_num] = [];
    ordersByTable[o.table_num].push(o);
  });

  const openTableNums = Object.keys(ordersByTable).map(Number);

  const getTableDisplayName = (t: TableConfig) => {
    const area = areas.find(a => a.id === t.area_id);
    if (!area) return `Masa ${t.table_num}`;
    const areaTablesAll = tables.filter(tb => tb.area_id === area.id).sort((a, b) => a.table_num - b.table_num);
    const localIdx = areaTablesAll.findIndex(tb => tb.id === t.id) + 1;
    return `${area.name} ${localIdx}`;
  };

  const getDisplayNameByNum = (num: number) => {
    const t = tables.find(tb => tb.table_num === num);
    return t ? getTableDisplayName(t) : `Masa ${num}`;
  };

  const getSourceTables = () => {
    if (sourceArea === 'open') {
      return tables.filter(t => openTableNums.includes(t.table_num));
    }
    return tables.filter(t => t.area_id === sourceArea && openTableNums.includes(t.table_num));
  };

  const getTargetTables = () => {
    if (!targetArea) return [];
    return tables.filter(t => t.area_id === targetArea && t.table_num !== sourceTable);
  };

  const sourceOrders = sourceTable !== null ? (ordersByTable[sourceTable] || []) : [];
  const allSourceItems: { name: string; qty: number; price: number; idx: number; orderId: string }[] = [];
  sourceOrders.forEach(o => {
    const items = Array.isArray(o.items) ? o.items : [];
    items.forEach((i: any, idx: number) => {
      allSourceItems.push({ name: i.name, qty: i.qty, price: i.price * i.qty, idx: allSourceItems.length, orderId: o.id });
    });
  });

  const sourceTotal = sourceOrders.reduce((s, o) => s + Number(o.total), 0);

  const handleFullTransfer = async () => {
    if (sourceTable === null || targetTable === null) return;
    setLoading(true);
    try {
      for (const o of sourceOrders) {
        await supabase.from('orders').update({ table_num: targetTable }).eq('id', o.id);
      }
      await supabase.from('table_logs').insert({
        table_num: sourceTable,
        user_name: 'Administrator',
        action: 'Masa taşındı',
        details: `Masa ${sourceTable} → Masa ${targetTable} (₺${sourceTotal})`,
        amount: sourceTotal,
        tenant_id: tenantId,
      });
      showToast(`Masa ${sourceTable} → Masa ${targetTable} taşındı ✓`);
      setSourceTable(null);
      setTargetTable(null);
      fetchData();
    } catch (err: any) {
      showToast('Hata: ' + err.message, false);
    } finally {
      setLoading(false);
    }
  };

  const handleItemTransfer = async () => {
    if (sourceTable === null || targetTable === null || selectedItems.size === 0) return;
    setLoading(true);
    try {
      // Group selected items by order
      const itemsByOrder: Record<string, number[]> = {};
      selectedItems.forEach(idx => {
        const item = allSourceItems[idx];
        if (!itemsByOrder[item.orderId]) itemsByOrder[item.orderId] = [];
        itemsByOrder[item.orderId].push(idx);
      });

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // For each source order, split items
      for (const orderId of Object.keys(itemsByOrder)) {
        const order = sourceOrders.find(o => o.id === orderId);
        if (!order) continue;
        const orderItems = Array.isArray(order.items) ? order.items : [];
        
        const selectedIndices = new Set(itemsByOrder[orderId].map(globalIdx => {
          // Find local index within this order
          let localIdx = 0;
          let count = 0;
          for (const si of allSourceItems) {
            if (si.orderId === orderId) {
              if (count === 0) localIdx = allSourceItems.indexOf(si);
              count++;
            }
          }
          return globalIdx - localIdx;
        }));

        const movedItems = orderItems.filter((_: any, i: number) => selectedIndices.has(i));
        const remainingItems = orderItems.filter((_: any, i: number) => !selectedIndices.has(i));

        // Create new order on target table with moved items
        const movedTotal = movedItems.reduce((s: number, i: any) => s + i.price * i.qty, 0);
        await supabase.from('orders').insert({
          user_id: userData.user.id,
          user_name: order.user_name,
          table_num: targetTable,
          items: movedItems as any,
          total: movedTotal,
          status: order.status as any,
          payment_type: order.payment_type,
          tenant_id: tenantId,
        } as any);

        if (remainingItems.length > 0) {
          const remainingTotal = remainingItems.reduce((s: number, i: any) => s + i.price * i.qty, 0);
          await supabase.from('orders').update({ items: remainingItems as any, total: remainingTotal }).eq('id', orderId);
        } else {
          await supabase.from('orders').update({ status: 'paid', payment_status: 'transferred' }).eq('id', orderId);
        }
      }

      const movedNames = Array.from(selectedItems).map(idx => `${allSourceItems[idx].qty}x ${allSourceItems[idx].name}`).join(', ');
      await supabase.from('table_logs').insert({
        table_num: sourceTable,
        user_name: 'Administrator',
        action: 'Ürün taşındı',
        details: `Masa ${sourceTable} → Masa ${targetTable} (${movedNames})`,
        tenant_id: tenantId,
      });

      showToast(`Ürünler Masa ${targetTable}'e taşındı ✓`);
      setSourceTable(null);
      setTargetTable(null);
      setSelectedItems(new Set());
      fetchData();
    } catch (err: any) {
      showToast('Hata: ' + err.message, false);
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (idx: number) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  return (
    <>
      {/* Mode selector */}
      <div className="flex gap-1 mb-2.5">
        <button className={`text-[11px] px-3 py-1 cursor-pointer rounded-full transition-all ${mode === 'full' ? 'neu-sunken text-foreground font-semibold' : 'neu-flat text-muted-foreground'}`}
          onClick={() => { setMode('full'); setSelectedItems(new Set()); }}>
          🪑 Masa Taşıma
        </button>
        <button className={`text-[11px] px-3 py-1 cursor-pointer rounded-full transition-all ${mode === 'items' ? 'neu-sunken text-foreground font-semibold' : 'neu-flat text-muted-foreground'}`}
          onClick={() => setMode('items')}>
          📦 Ürün Taşıma
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Source table selection */}
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 font-bold">Kaynak Masa</div>
          {/* Source area tabs */}
          <div className="flex gap-1 flex-wrap mb-1.5">
            <button
              className={`text-[10px] px-2 py-0.5 cursor-pointer rounded-full transition-all ${sourceArea === 'open' ? 'neu-sunken text-foreground font-semibold' : 'neu-flat text-muted-foreground'}`}
              onClick={() => { setSourceArea('open'); setSourceTable(null); setSelectedItems(new Set()); }}>
              Açık ({openTableNums.length})
            </button>
            {areas.map(a => {
              const areaOpenCount = tables.filter(t => t.area_id === a.id && openTableNums.includes(t.table_num)).length;
              if (areaOpenCount === 0) return null;
              return (
                <button key={a.id}
                  className={`text-[10px] px-2 py-0.5 cursor-pointer rounded-full transition-all ${sourceArea === a.id ? 'neu-sunken text-foreground font-semibold' : 'neu-flat text-muted-foreground'}`}
                  onClick={() => { setSourceArea(a.id); setSourceTable(null); setSelectedItems(new Set()); }}>
                  {a.name}
                </button>
              );
            })}
          </div>

          {getSourceTables().length === 0 ? (
            <p className="text-muted-foreground text-center py-3 text-[10px]">Açık masa yok</p>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {getSourceTables().sort((a, b) => a.table_num - b.table_num).map(t => {
                const tableOrders = ordersByTable[t.table_num] || [];
                const total = tableOrders.reduce((s, o) => s + Number(o.total), 0);
                return (
                  <button key={t.id}
                    className={`border rounded-lg p-1.5 text-center cursor-pointer text-[10px] ${sourceTable === t.table_num ? 'bg-primary text-primary-foreground border-primary' : 'border-foreground/30 hover:bg-muted/50'}`}
                    onClick={() => { setSourceTable(t.table_num); setSelectedItems(new Set()); }}>
                    <div className="font-bold truncate">{getTableDisplayName(t)}</div>
                    <div className="text-[9px] opacity-70">₺{total}</div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Show source items when selected */}
          {sourceTable !== null && allSourceItems.length > 0 && (
            <div className="mt-2 border border-foreground/30 rounded-lg overflow-hidden">
              <div className="bg-muted px-2 py-1 text-[10px] font-bold uppercase tracking-widest border-b border-foreground/30">
                {getDisplayNameByNum(sourceTable)} — ₺{sourceTotal}
              </div>
              {allSourceItems.map((item, idx) => (
                <div key={idx} className={`flex items-center justify-between px-2 py-1 text-[11px] border-b border-dashed border-muted-foreground/20 last:border-b-0 ${mode === 'items' ? 'cursor-pointer hover:bg-muted/30' : ''} ${selectedItems.has(idx) ? 'bg-primary/10' : ''}`}
                  onClick={() => mode === 'items' && toggleItem(idx)}>
                  <div className="flex items-center gap-1.5">
                    {mode === 'items' && (
                      <input type="checkbox" className="w-3.5 h-3.5" checked={selectedItems.has(idx)} readOnly />
                    )}
                    <span>{item.qty}x {item.name}</span>
                  </div>
                  <span className="text-muted-foreground">₺{item.price}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Target table selection */}
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 font-bold">Hedef Masa</div>
          {/* Target area tabs */}
          <div className="flex gap-1 flex-wrap mb-1.5">
            {areas.map(a => (
              <button key={a.id}
                className={`text-[10px] px-2 py-0.5 cursor-pointer rounded-full transition-all ${targetArea === a.id ? 'neu-sunken text-foreground font-semibold' : 'neu-flat text-muted-foreground'}`}
                onClick={() => { setTargetArea(a.id); setTargetTable(null); }}>
                {a.name}
              </button>
            ))}
          </div>

          {!targetArea ? (
            <p className="text-muted-foreground text-center py-3 text-[10px]">Önce alan seçin</p>
          ) : getTargetTables().length === 0 ? (
            <p className="text-muted-foreground text-center py-3 text-[10px]">Bu alanda masa yok</p>
          ) : (
            <div className="grid grid-cols-3 gap-1 max-h-[50vh] overflow-y-auto">
              {getTargetTables().map(t => {
                const hasOrders = openTableNums.includes(t.table_num);
                return (
                  <button key={t.id}
                    className={`border rounded-lg p-1.5 text-center cursor-pointer text-[10px] ${targetTable === t.table_num ? 'bg-primary text-primary-foreground border-primary' : hasOrders ? 'border-foreground/30 bg-amber-900/20 hover:bg-amber-900/40' : 'border-foreground/30 hover:bg-muted/50'}`}
                    onClick={() => setTargetTable(t.table_num)}>
                    <div className="font-bold truncate">{getTableDisplayName(t)}</div>
                    <div className="text-[9px] opacity-70">{hasOrders ? 'Dolu' : 'Boş'}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Action */}
      {sourceTable !== null && targetTable !== null && (
        <div className="mt-3 border-t border-foreground/30 pt-2">
          <div className="text-center text-[12px] font-bold mb-2">
            {getDisplayNameByNum(sourceTable)} → {getDisplayNameByNum(targetTable)}
            {mode === 'items' && selectedItems.size > 0 && ` (${selectedItems.size} ürün)`}
          </div>
          <button
            className="win-btn win-btn-primary text-[11px] py-1.5 w-full font-bold"
            disabled={loading || (mode === 'items' && selectedItems.size === 0)}
            onClick={mode === 'full' ? handleFullTransfer : handleItemTransfer}>
            {loading ? 'Taşınıyor...' : mode === 'full' ? '🪑 Masayı Taşı' : '📦 Seçili Ürünleri Taşı'}
          </button>
        </div>
      )}
    </>
  );
};

export default AdminTableTransfer;
