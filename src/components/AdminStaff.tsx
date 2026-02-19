import React, { useState, useEffect } from 'react';
import { useToast95Context } from '@/contexts/Toast95Context';
import { supabase } from '@/integrations/supabase/client';

interface Staff {
  id: string;
  user_id: string | null;
  name: string;
  username: string;
  pin: string;
  work_days: string[];
  shift_start: string;
  shift_end: string;
  is_active: boolean;
}

const ALL_DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

const AdminStaff = () => {
  const { showToast } = useToast95Context();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [showForm, setShowForm] = useState(false);
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

  const toggleDay = (day: string) => {
    setForm(f => ({
      ...f,
      work_days: f.work_days.includes(day)
        ? f.work_days.filter(d => d !== day)
        : [...f.work_days, day],
    }));
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
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Pin Kodu (ortak cihazlar için)</div>
          <input className="win-input" value={form.pin} onChange={e => setForm({ ...form, pin: e.target.value })} placeholder="ör: 1234" />
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
          {/* Header */}
          <div className="flex bg-muted text-[10px] font-bold uppercase tracking-widest border-b border-foreground">
            <div className="w-6 px-1 py-1 border-r border-foreground">#</div>
            <div className="flex-1 px-2 py-1 border-r border-foreground">Çalışan Adı</div>
            <div className="flex-1 px-2 py-1 border-r border-foreground">Kullanıcı Adı</div>
            <div className="w-16 px-1 py-1 text-center">Mesai</div>
          </div>
          {/* Rows */}
          {staffList.map((s, i) => (
            <div key={s.id} className="flex text-[11px] border-b border-dashed border-muted-foreground/30 last:border-b-0">
              <div className="w-6 px-1 py-1.5 border-r border-foreground/10 text-muted-foreground">{i + 1}</div>
              <div className="flex-1 px-2 py-1.5 border-r border-foreground/10 font-bold">{s.name}</div>
              <div className="flex-1 px-2 py-1.5 border-r border-foreground/10 text-muted-foreground">{s.username}</div>
              <div className="w-16 px-1 py-1.5 flex items-center justify-center gap-1">
                <span className="text-[9px] text-muted-foreground">{s.shift_start}-{s.shift_end}</span>
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
