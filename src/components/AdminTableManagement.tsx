import React, { useState, useEffect } from 'react';
import { useToast95Context } from '@/contexts/Toast95Context';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';

interface TableArea { id: string; name: string; sort_order: number; }
interface TableConfig { id: string; table_num: number; area_id: string | null; capacity: number; is_active: boolean; name: string; }

const AdminTableManagement = () => {
  const { showToast } = useToast95Context();
  const { tenantId } = useTenant();
  const [areas, setAreas] = useState<TableArea[]>([]);
  const [tables, setTables] = useState<TableConfig[]>([]);
  const [selectedArea, setSelectedArea] = useState<TableArea | null>(null);
  const [newAreaName, setNewAreaName] = useState('');
  const [editCapacity, setEditCapacity] = useState(4);
  const [customTableName, setCustomTableName] = useState('');

  const fetchAll = async () => {
    if (!tenantId) return;
    const [{ data: a }, { data: t }] = await Promise.all([
      supabase.from('table_areas').select('*').eq('tenant_id', tenantId).order('sort_order'),
      supabase.from('tables').select('*').eq('tenant_id', tenantId).order('table_num'),
    ]);
    if (a) setAreas(a);
    if (t) setTables(t);
  };

  useEffect(() => { fetchAll(); }, [tenantId]);

  // Add new area
  const addArea = async () => {
    const name = newAreaName.trim();
    if (!name) return;
    const nextOrder = areas.length > 0 ? Math.max(...areas.map(a => a.sort_order)) + 1 : 0;
    const { error } = await supabase.from('table_areas').insert({ name, sort_order: nextOrder, tenant_id: tenantId });
    if (error) { showToast('Alan eklenemedi', false); return; }
    setNewAreaName('');
    showToast('Alan eklendi ✓');
    fetchAll();
  };

  // Delete area
  const deleteArea = async (areaId: string) => {
    // Remove tables in this area first
    await supabase.from('tables').delete().eq('area_id', areaId);
    const { error } = await supabase.from('table_areas').delete().eq('id', areaId);
    if (error) { showToast('Silinemedi', false); return; }
    if (selectedArea?.id === areaId) setSelectedArea(null);
    showToast('Alan silindi ✓');
    fetchAll();
  };

  // Select area to edit
  const selectArea = (area: TableArea) => {
    setSelectedArea(area);
    const areaTables = tables.filter(t => t.area_id === area.id);
    if (areaTables.length > 0) {
      setEditCapacity(areaTables[0].capacity);
    }
  };

  // Add single custom-named table
  const addCustomTable = async () => {
    if (!selectedArea) return;
    const name = customTableName.trim();
    if (!name) { showToast('Masa adı girin', false); return; }
    const maxNum = tables.length > 0 ? Math.max(...tables.map(t => t.table_num)) : 0;
    const { error } = await supabase.from('tables').insert({
      table_num: maxNum + 1,
      area_id: selectedArea.id,
      capacity: editCapacity,
      is_active: true,
      name,
      tenant_id: tenantId,
    });
    if (error) { showToast('Masa eklenemedi', false); return; }
    setCustomTableName('');
    showToast(`Masa eklendi ✓`);
    fetchAll();
  };

  const areaTables = selectedArea ? tables.filter(t => t.area_id === selectedArea.id) : [];

  // Area detail view
  if (selectedArea) {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <button className="win-btn text-[10px] py-0.5 px-2" onClick={() => setSelectedArea(null)}>← Geri</button>
          <span className="text-[11px] text-muted-foreground">#{areas.findIndex(a => a.id === selectedArea.id) + 1}</span>
        </div>

        <div className="mb-2.5">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Oturma Düzeni Adı</div>
          <input className="win-input" type="text" value={selectedArea.name} readOnly />
        </div>

        <div className="mb-2.5">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Masa Oluştur</div>
          <div className="flex gap-1.5">
            <input className="win-input flex-1" type="text" placeholder="Masa adı (ör: VIP 1)"
              value={customTableName} onChange={e => setCustomTableName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCustomTable()} />
            <button className="win-btn win-btn-primary text-[11px] py-1 px-3" onClick={addCustomTable}>+ Ekle</button>
          </div>
        </div>

        {/* Table list */}
        {areaTables.length > 0 && (
          <div className="grid grid-cols-4 gap-1 mb-2.5">
            {areaTables.map(t => (
              <div key={t.id} className="border border-foreground bg-muted py-1.5 px-1 flex items-center justify-center text-[10px] font-bold text-center rounded">
                {t.name || t.table_num}
              </div>
            ))}
          </div>
        )}

        <button className="win-btn text-[10px] py-0.5 px-2 text-destructive border-destructive" onClick={() => deleteArea(selectedArea.id)}>
          🗑 Bu Alanı Sil
        </button>
      </div>
    );
  }

  // Area list view
  return (
    <div>
      {/* Add new area */}
      <div className="flex gap-1.5 mb-2.5">
        <input className="win-input flex-1" type="text" placeholder="Yeni alan adı (ör: Bahçe)"
          value={newAreaName} onChange={e => setNewAreaName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addArea()} />
        <button className="win-btn win-btn-primary text-[11px] py-1 px-3" onClick={addArea}>+ Ekle</button>
      </div>

      {/* Area table */}
      {areas.length === 0 ? (
        <p className="text-muted-foreground text-center py-3.5 text-xs">Henüz alan eklenmedi.</p>
      ) : (
        <div className="border border-foreground">
          <div className="flex bg-muted text-[10px] uppercase tracking-widest text-muted-foreground border-b border-foreground">
            <div className="w-8 p-1.5 text-center">#</div>
            <div className="flex-1 p-1.5">Oturma Düzeni Adı</div>
            <div className="w-16 p-1.5 text-center">Masa</div>
            <div className="w-12 p-1.5"></div>
          </div>
          {areas.map((area, idx) => {
            const count = tables.filter(t => t.area_id === area.id).length;
            return (
              <div key={area.id} className="flex items-center border-b border-muted text-[12px]">
                <div className="w-8 p-1.5 text-center text-muted-foreground">{idx + 1}</div>
                <div className="flex-1 p-1.5 font-medium">{area.name}</div>
                <div className="w-16 p-1.5 text-center text-muted-foreground">{count}</div>
                <div className="w-12 p-1.5 text-center">
                  <button className="win-btn win-btn-primary text-[10px] py-0.5 px-1.5" onClick={() => selectArea(area)}>→</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminTableManagement;
