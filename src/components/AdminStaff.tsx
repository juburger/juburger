import React, { useState, useEffect } from 'react';
import { useToast95Context } from '@/contexts/Toast95Context';
import { supabase } from '@/integrations/supabase/client';

interface Staff {
  id: string;
  user_id: string | null;
  name: string;
  username: string;
  pin: string; // hashed - never displayed
  work_days: string[];
  shift_start: string;
  shift_end: string;
  is_active: boolean;
}

interface StaffPermission {
  perm_key: string;
  enabled: boolean;
}

const ALL_DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

const PERMISSION_DEFS: { key: string; label: string; color?: string }[] = [
  { key: 'business_management', label: 'İşletme Yönetimi (Genel Ayarlar, Menü vb. Düzenleme)', color: 'destructive' },
  { key: 'cashier', label: 'Sipariş Ödemesi Alabilme (Kasa Yetkisi)', color: 'destructive' },
  { key: 'close_paid_account', label: 'Ödemesi Alınan Hesabı Kapatma', color: 'destructive' },
  { key: 'edit_closed_tables', label: 'Kapanan Masaları Düzenleme', color: 'destructive' },
  { key: 'new_order', label: 'Yeni sipariş ekleme' },
  { key: 'edit_order_price', label: 'Siparişin Fiyatını Düşürebilme yada Arttırma' },
  { key: 'cancel_order', label: 'Sipariş iptal edebilme', color: 'destructive' },
  { key: 'table_to_account', label: 'Masayı Cariye Taşıma', color: 'destructive' },
  { key: 'merge_tables', label: 'Masa Birleştirme', color: 'destructive' },
  { key: 'move_items', label: 'Başka Masaya Ürün Taşıma', color: 'destructive' },
  { key: 'move_to_empty', label: 'Boş Masaya Taşıma', color: 'destructive' },
  { key: 'cover_price', label: 'Kuver Fiyatı Düzenleme' },
  { key: 'order_delivery', label: 'Sipariş Teslimatı' },
  { key: 'delivery_payment', label: 'Sipariş Teslimatında Ödeme Alma' },
  { key: 'order_prep', label: 'Sipariş Hazırlama' },
  { key: 'add_expense', label: 'Gelir Gider Ekleme' },
  { key: 'manage_expenses', label: 'Gelir Gider Düzenleme - Ekleme - Silme' },
  { key: 'manage_payments', label: 'Ödeme Yöntemlerini Düzenleme - Ekleme - Silme' },
  { key: 'manage_products', label: 'Ürün Düzenleme - Ürün Ekleme - Ürün Silme' },
  { key: 'manage_categories', label: 'Ürün Kategori Düzenleme - Ekleme - Silme' },
  { key: 'manage_staff', label: 'Çalışan Düzenleme - Ekleme - Silme' },
  { key: 'manage_accounts', label: 'Cari Hesap Düzenleme - Ekleme - Silme' },
  { key: 'manage_layout', label: 'Oturma Düzeni Düzenleme - Ekleme - Silme' },
  { key: 'view_reports_limited', label: 'Kısıtlı Gün Sonu Raporu Görmek', color: 'warning' },
  { key: 'view_reports_full', label: 'Tüm Gün Sonu Raporlarını Görmek', color: 'warning' },
  { key: 'view_open_tables', label: 'Açık Masaları Göster', color: 'warning' },
  { key: 'view_packages', label: 'Paket Servisleri Göster', color: 'warning' },
  { key: 'view_quick_order', label: 'Hızlı Sipariş Göster', color: 'warning' },
  { key: 'view_calls', label: 'Aramaları Göster', color: 'warning' },
  { key: 'view_logs', label: 'Logları Göster', color: 'warning' },
  { key: 'view_accounts', label: 'Cari Hesapları Göster', color: 'warning' },
  { key: 'view_prep', label: 'Hazırlanacakları Göster', color: 'warning' },
  { key: 'view_deliveries', label: 'Teslim Edilecekleri Göster', color: 'warning' },
  { key: 'view_settings', label: 'Ayarları Göster', color: 'warning' },
];

const AdminStaff = () => {
  const { showToast } = useToast95Context();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', username: '', password: '', pin: '',
    work_days: ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'] as string[],
    shift_start: '09:00', shift_end: '23:00',
  });

  const fetchStaff = async () => {
    const { data } = await supabase.from('staff').select('*').order('created_at');
    if (data) setStaffList(data as unknown as Staff[]);
  };

  useEffect(() => { fetchStaff(); }, []);

  const fetchPermissions = async (staffId: string) => {
    const { data } = await supabase.from('staff_permissions').select('perm_key, enabled').eq('staff_id', staffId);
    const permMap: Record<string, boolean> = {};
    PERMISSION_DEFS.forEach(p => permMap[p.key] = true); // default all on
    if (data) {
      data.forEach((p: any) => { permMap[p.perm_key] = p.enabled; });
    }
    setPermissions(permMap);
  };

  const toggleDay = (day: string) => {
    setForm(f => ({
      ...f,
      work_days: f.work_days.includes(day)
        ? f.work_days.filter(d => d !== day)
        : [...f.work_days, day],
    }));
  };

  const startEdit = (s: Staff) => {
    setEditingStaff(s);
    setForm({
      name: s.name, username: s.username, password: '', pin: '',
      work_days: s.work_days, shift_start: s.shift_start, shift_end: s.shift_end,
    });
    fetchPermissions(s.id);
  };

  const saveEdit = async () => {
    if (!editingStaff) return;
    setLoading(true);
    try {
      const body: any = { action: 'update', staff_id: editingStaff.id, name: form.name, work_days: form.work_days, shift_start: form.shift_start, shift_end: form.shift_end, permissions };
      if (form.pin) body.pin = form.pin;
      if (form.password) body.password = form.password;
      const { data, error } = await supabase.functions.invoke('manage-staff', { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      showToast('Çalışan güncellendi ✓');
      setEditingStaff(null);
      fetchStaff();
    } catch (err: any) {
      showToast('Hata: ' + err.message, false);
    } finally {
      setLoading(false);
    }
  };

  const createStaff = async () => {
    if (!form.name || !form.username || !form.password) {
      showToast('Ad, kullanıcı adı ve şifre zorunlu', false);
      return;
    }
    if (form.password.length < 6) {
      showToast('Şifre en az 6 karakter olmalı', false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-staff', {
        body: { action: 'create', ...form },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      showToast('Çalışan eklendi ✓');
      setShowForm(false);
      setForm({ name: '', username: '', password: '', pin: '', work_days: ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'], shift_start: '09:00', shift_end: '23:00' });
      fetchStaff();
    } catch (err: any) {
      showToast('Hata: ' + err.message, false);
    } finally {
      setLoading(false);
    }
  };

  const deleteStaff = async (s: Staff) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-staff', {
        body: { action: 'delete', staff_id: s.id, user_id: s.user_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      showToast('Çalışan silindi');
      fetchStaff();
    } catch (err: any) {
      showToast('Hata: ' + err.message, false);
    } finally {
      setLoading(false);
    }
  };

  // Edit view
  if (editingStaff) {
    return (
      <div>
        <h2 className="text-[13px] font-bold mb-2">Çalışan Düzenle: {editingStaff.name}</h2>
        <hr className="border-t border-foreground my-2" />

        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Çalışan Adı</div>
          <input className="win-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>

        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Kullanıcı Adı</div>
          <input className="win-input" value={form.username} disabled />
          <div className="text-[9px] text-muted-foreground">Kullanıcı adı değiştirilemez</div>
        </div>

        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Yeni Şifre (boş bırakırsan değişmez)</div>
          <input className="win-input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Boş bırakırsan değişmez" />
        </div>

        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Yeni Pin Kodu (boş bırakırsan değişmez)</div>
          <input className="win-input" value={form.pin} onChange={e => setForm({ ...form, pin: e.target.value })} placeholder="4-6 haneli rakam" maxLength={6} />
        </div>

        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Mesai Günleri</div>
          <div className="flex flex-wrap gap-1">
            {ALL_DAYS.map(day => (
              <button key={day}
                className={`text-[10px] px-2 py-0.5 cursor-pointer border ${form.work_days.includes(day) ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-card-foreground border-border'}`}
                onClick={() => toggleDay(day)}>
                {day.substring(0, 3)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2.5">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">İşbaşı Saati</div>
            <input className="win-input" type="time" value={form.shift_start} onChange={e => setForm({ ...form, shift_start: e.target.value })} />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">İş Sonu Saati</div>
            <input className="win-input" type="time" value={form.shift_end} onChange={e => setForm({ ...form, shift_end: e.target.value })} />
          </div>
        </div>

        <hr className="border-t border-foreground my-2" />
        <h3 className="text-[12px] font-bold mb-2">Yetkiler</h3>

        <div className="border border-foreground">
          {PERMISSION_DEFS.map((p, i) => (
            <div key={p.key} className={`flex items-center justify-between px-2 py-1.5 text-[11px] ${i < PERMISSION_DEFS.length - 1 ? 'border-b border-dashed border-muted-foreground/30' : ''}`}>
              <span className={p.color === 'destructive' ? 'text-destructive font-medium' : p.color === 'warning' ? 'text-amber-600 font-medium' : ''}>{p.label}</span>
              <button
                className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors ${permissions[p.key] ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                onClick={() => setPermissions(prev => ({ ...prev, [p.key]: !prev[p.key] }))}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-background shadow transition-transform ${permissions[p.key] ? 'left-[18px]' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
        </div>

        <hr className="border-t border-foreground my-2" />
        <div className="flex gap-1.5">
          <button className="win-btn win-btn-primary" onClick={saveEdit} disabled={loading}>
            {loading ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
          <button className="win-btn" onClick={() => setEditingStaff(null)}>İptal</button>
          <button className="win-btn text-destructive" onClick={() => { deleteStaff(editingStaff); setEditingStaff(null); }}>Sil</button>
        </div>
      </div>
    );
  }

  // Create form
  if (showForm) {
    return (
      <div>
        <h2 className="text-[13px] font-bold mb-2">Yeni Çalışan Ekle</h2>
        <hr className="border-t border-foreground my-2" />

        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Çalışan Adı</div>
          <input className="win-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="ör: Ahmet" />
        </div>

        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Kullanıcı Adı</div>
          <input className="win-input" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="ör: ahmet123" />
        </div>

        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Şifre</div>
          <input className="win-input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="En az 6 karakter" />
        </div>

        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Pin Kodu (ortak cihazlar için, 4-6 haneli rakam)</div>
          <input className="win-input" value={form.pin} onChange={e => setForm({ ...form, pin: e.target.value })} placeholder="ör: 1234" maxLength={6} />
        </div>

        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Mesai Günleri</div>
          <div className="flex flex-wrap gap-1">
            {ALL_DAYS.map(day => (
              <button key={day}
                className={`text-[10px] px-2 py-0.5 cursor-pointer border ${form.work_days.includes(day) ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-card-foreground border-border'}`}
                onClick={() => toggleDay(day)}>
                {day.substring(0, 3)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2.5">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">İşbaşı Saati</div>
            <input className="win-input" type="time" value={form.shift_start} onChange={e => setForm({ ...form, shift_start: e.target.value })} />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">İş Sonu Saati</div>
            <input className="win-input" type="time" value={form.shift_end} onChange={e => setForm({ ...form, shift_end: e.target.value })} />
          </div>
        </div>

        <hr className="border-t border-foreground my-2" />
        <div className="flex gap-1.5">
          <button className="win-btn win-btn-primary" onClick={createStaff} disabled={loading}>
            {loading ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
          <button className="win-btn" onClick={() => setShowForm(false)}>İptal</button>
        </div>
      </div>
    );
  }

  // List view
  return (
    <>
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-[13px] font-bold">Çalışanlar</h2>
        <button className="win-btn win-btn-primary text-[10px]" onClick={() => setShowForm(true)}>+ Yeni Çalışan</button>
      </div>

      {!staffList.length ? (
        <p className="text-muted-foreground text-center py-3.5 text-xs">Henüz çalışan eklenmedi.</p>
      ) : (
        <div className="border border-foreground">
          <div className="flex bg-muted text-[10px] font-bold uppercase tracking-widest border-b border-foreground">
            <div className="w-6 px-1 py-1 border-r border-foreground">#</div>
            <div className="flex-1 px-2 py-1 border-r border-foreground">Çalışan Adı</div>
            <div className="flex-1 px-2 py-1 border-r border-foreground">Kullanıcı Adı</div>
            <div className="w-20 px-1 py-1 text-center">İşlem</div>
          </div>
          {staffList.map((s, i) => (
            <div key={s.id} className="flex text-[11px] border-b border-dashed border-muted-foreground/30 last:border-b-0">
              <div className="w-6 px-1 py-1.5 border-r border-foreground/10 text-muted-foreground">{i + 1}</div>
              <div className="flex-1 px-2 py-1.5 border-r border-foreground/10 font-bold">{s.name}</div>
              <div className="flex-1 px-2 py-1.5 border-r border-foreground/10 text-muted-foreground">{s.username}</div>
              <div className="w-20 px-1 py-1.5 flex items-center justify-center gap-2">
                <button className="text-primary text-[10px] bg-transparent border-none cursor-pointer underline" onClick={() => startEdit(s)}>Düzenle</button>
                <button className="text-destructive text-[10px] bg-transparent border-none cursor-pointer" onClick={() => deleteStaff(s)}>×</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default AdminStaff;
