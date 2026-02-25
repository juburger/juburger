import React, { useState, useEffect } from 'react';
import { useToast95Context } from '@/contexts/Toast95Context';
import { supabase } from '@/integrations/supabase/client';

interface Member {
  id: string;
  phone: string;
  name: string;
  total_points: number;
  used_points: number;
  total_spent: number;
  visit_count: number;
  last_visit_at: string | null;
  created_at: string;
}

interface PointTransaction {
  id: string;
  member_id: string;
  type: string;
  points: number;
  description: string;
  order_id: string | null;
  created_at: string;
}

interface LoyaltySettings {
  points_per_lira: number;
  point_value: number;
  min_redeem_points: number;
}

const AdminMembers = () => {
  const { showToast } = useToast95Context();
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [adjustPoints, setAdjustPoints] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings>({
    points_per_lira: 1,
    point_value: 0.1,
    min_redeem_points: 50,
  });

  const fetchMembers = async () => {
    const { data } = await supabase.from('members').select('*').order('name');
    if (data) setMembers(data as unknown as Member[]);
  };

  const fetchTransactions = async (memberId: string) => {
    const { data } = await supabase.from('point_transactions').select('*').eq('member_id', memberId).order('created_at', { ascending: false });
    if (data) setTransactions(data as unknown as PointTransaction[]);
  };

  const fetchLoyaltySettings = async () => {
    const { data } = await supabase.from('loyalty_settings').select('*').eq('id', 'default').single();
    if (data) setLoyaltySettings(data as unknown as LoyaltySettings);
  };

  useEffect(() => { fetchMembers(); fetchLoyaltySettings(); }, []);

  const createMember = async () => {
    if (!form.name || !form.phone) { showToast('Ad ve telefon zorunlu', false); return; }
    const cleanPhone = form.phone.replace(/\s/g, '');
    if (cleanPhone.length < 10) { showToast('Geçerli telefon numarası girin', false); return; }
    setLoading(true);
    const { error } = await supabase.from('members').insert({ name: form.name.trim(), phone: cleanPhone } as any);
    if (error) {
      if (error.message.includes('unique') || error.message.includes('duplicate')) {
        showToast('Bu telefon numarası zaten kayıtlı', false);
      } else {
        showToast('Hata: ' + error.message, false);
      }
    } else {
      showToast('Üye eklendi ✓');
      setShowForm(false);
      setForm({ name: '', phone: '' });
      fetchMembers();
    }
    setLoading(false);
  };

  const deleteMember = async (id: string) => {
    await supabase.from('members').delete().eq('id', id);
    showToast('Üye silindi');
    setSelectedMember(null);
    fetchMembers();
  };

  const handleAdjustPoints = async () => {
    if (!selectedMember || !adjustPoints) return;
    const pts = parseInt(adjustPoints);
    if (isNaN(pts) || pts === 0) { showToast('Geçerli puan girin', false); return; }
    setLoading(true);

    await supabase.from('point_transactions').insert({
      member_id: selectedMember.id,
      type: pts > 0 ? 'earn' : 'spend',
      points: Math.abs(pts),
      description: adjustReason || (pts > 0 ? 'Manuel puan ekleme' : 'Manuel puan düşme'),
    } as any);

    const newTotal = pts > 0
      ? selectedMember.total_points + pts
      : selectedMember.total_points;
    const newUsed = pts < 0
      ? selectedMember.used_points + Math.abs(pts)
      : selectedMember.used_points;

    await supabase.from('members').update({
      total_points: newTotal,
      used_points: newUsed,
    }).eq('id', selectedMember.id);

    showToast(`${pts > 0 ? '+' : ''}${pts} puan kaydedildi ✓`);
    setAdjustPoints('');
    setAdjustReason('');

    const updated = { ...selectedMember, total_points: newTotal, used_points: newUsed };
    setSelectedMember(updated);
    fetchTransactions(selectedMember.id);
    fetchMembers();
    setLoading(false);
  };

  const saveLoyaltySettings = async (key: string, value: number) => {
    await supabase.from('loyalty_settings').update({ [key]: value } as any).eq('id', 'default');
    setLoyaltySettings(prev => ({ ...prev, [key]: value }));
    showToast('Sadakat ayarı güncellendi ✓');
  };

  const filteredMembers = searchQuery
    ? members.filter(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.phone.includes(searchQuery)
      )
    : members;

  const availablePoints = (m: Member) => m.total_points - m.used_points;

  // Member detail view
  if (selectedMember) {
    const avail = availablePoints(selectedMember);
    return (
      <div>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-[13px] font-bold">{selectedMember.name}</h2>
          <button className="win-btn text-[10px]" onClick={() => setSelectedMember(null)}>← Geri</button>
        </div>

        <div className="border border-foreground p-2.5 mb-2.5">
          <div className="text-[22px] font-bold text-center text-primary">{avail} Puan</div>
          <div className="text-[10px] text-muted-foreground text-center uppercase tracking-widest">Kullanılabilir Puan</div>
          <div className="grid grid-cols-3 gap-2 mt-2 text-center">
            <div>
              <div className="text-[14px] font-bold">{selectedMember.total_points}</div>
              <div className="text-[9px] text-muted-foreground">Toplam Kazanılan</div>
            </div>
            <div>
              <div className="text-[14px] font-bold">{selectedMember.used_points}</div>
              <div className="text-[9px] text-muted-foreground">Kullanılan</div>
            </div>
            <div>
              <div className="text-[14px] font-bold">{selectedMember.visit_count}</div>
              <div className="text-[9px] text-muted-foreground">Ziyaret</div>
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground text-center mt-2">
            📞 {selectedMember.phone}
          </div>
          <div className="text-[10px] text-muted-foreground text-center">
            💰 Toplam Harcama: ₺{Number(selectedMember.total_spent).toLocaleString('tr')}
          </div>
          {selectedMember.last_visit_at && (
            <div className="text-[10px] text-muted-foreground text-center">
              Son Ziyaret: {new Date(selectedMember.last_visit_at).toLocaleDateString('tr-TR')}
            </div>
          )}
        </div>

        {/* Adjust points */}
        <h3 className="text-[11px] font-bold mb-1 uppercase tracking-widest text-muted-foreground">Puan Düzenle</h3>
        <div className="flex gap-1 mb-1">
          <input className="win-input flex-1" type="number" value={adjustPoints} onChange={e => setAdjustPoints(e.target.value)} placeholder="Puan (+ ekle, - düş)" />
          <button className="win-btn win-btn-primary text-[10px]" onClick={handleAdjustPoints} disabled={loading}>Uygula</button>
        </div>
        <input className="win-input mb-2.5" value={adjustReason} onChange={e => setAdjustReason(e.target.value)} placeholder="Açıklama (opsiyonel)" />

        {/* Transaction history */}
        <h3 className="text-[11px] font-bold mb-1 uppercase tracking-widest text-muted-foreground">Puan Geçmişi</h3>
        <div className="border border-foreground">
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-3 text-[10px]">Hareket yok</p>
          ) : transactions.map(t => (
            <div key={t.id} className="flex justify-between items-center px-2 py-1.5 text-[11px] border-b border-dashed border-muted-foreground/20 last:border-b-0">
              <div>
                <div className={t.type === 'earn' ? 'text-emerald-600 font-medium' : t.type === 'spend' ? 'text-destructive font-medium' : 'text-primary font-medium'}>
                  {t.type === 'earn' ? '⭐ Kazanıldı' : t.type === 'spend' ? '🔻 Harcandı' : '🔧 Düzenleme'} — {t.points} puan
                </div>
                <div className="text-[9px] text-muted-foreground">{t.description}</div>
              </div>
              <div className="text-[9px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString('tr-TR')} {new Date(t.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          ))}
        </div>

        <hr className="border-t border-foreground my-2.5" />
        <button className="win-btn text-[10px] text-destructive w-full" onClick={() => deleteMember(selectedMember.id)}>🗑 Üyeyi Sil</button>
      </div>
    );
  }

  // Loyalty settings view
  if (showSettings) {
    return (
      <div>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-[13px] font-bold">⚙️ Sadakat Ayarları</h2>
          <button className="win-btn text-[10px]" onClick={() => setShowSettings(false)}>← Geri</button>
        </div>
        <hr className="border-t border-foreground my-2" />

        <div className="mb-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Her ₺1 = Kaç Puan?</div>
          <div className="flex gap-1">
            <input className="win-input flex-1" type="number" step="0.1" value={loyaltySettings.points_per_lira}
              onChange={e => setLoyaltySettings({ ...loyaltySettings, points_per_lira: parseFloat(e.target.value) || 0 })} />
            <button className="win-btn text-[10px]" onClick={() => saveLoyaltySettings('points_per_lira', loyaltySettings.points_per_lira)}>Kaydet</button>
          </div>
          <div className="text-[9px] text-muted-foreground mt-0.5">Örn: 1 ise 100₺ harcama = 100 puan</div>
        </div>

        <div className="mb-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">1 Puan = Kaç ₺?</div>
          <div className="flex gap-1">
            <input className="win-input flex-1" type="number" step="0.01" value={loyaltySettings.point_value}
              onChange={e => setLoyaltySettings({ ...loyaltySettings, point_value: parseFloat(e.target.value) || 0 })} />
            <button className="win-btn text-[10px]" onClick={() => saveLoyaltySettings('point_value', loyaltySettings.point_value)}>Kaydet</button>
          </div>
          <div className="text-[9px] text-muted-foreground mt-0.5">Örn: 0.10 ise 100 puan = 10₺ indirim</div>
        </div>

        <div className="mb-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Minimum Harcama Puanı</div>
          <div className="flex gap-1">
            <input className="win-input flex-1" type="number" value={loyaltySettings.min_redeem_points}
              onChange={e => setLoyaltySettings({ ...loyaltySettings, min_redeem_points: parseInt(e.target.value) || 0 })} />
            <button className="win-btn text-[10px]" onClick={() => saveLoyaltySettings('min_redeem_points', loyaltySettings.min_redeem_points)}>Kaydet</button>
          </div>
          <div className="text-[9px] text-muted-foreground mt-0.5">Puanları kullanabilmek için gereken minimum puan</div>
        </div>

        <hr className="border-t border-foreground my-2" />
        <div className="text-[11px] text-muted-foreground">
          <div className="font-bold mb-1">Nasıl Çalışır?</div>
          <div>• Müşteri sipariş verdiğinde otomatik puan kazanır</div>
          <div>• Biriken puanlar sonraki siparişlerde indirim olarak kullanılır</div>
          <div>• Müşteri QR okutup telefon numarası ile giriş yapar</div>
        </div>
      </div>
    );
  }

  // Create form
  if (showForm) {
    return (
      <div>
        <h2 className="text-[13px] font-bold mb-2">Yeni Üye</h2>
        <hr className="border-t border-foreground my-2" />
        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Ad Soyad *</div>
          <input className="win-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="ör: Ali Yılmaz" />
        </div>
        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Telefon *</div>
          <input className="win-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="ör: 05321234567" type="tel" />
        </div>
        <hr className="border-t border-foreground my-2" />
        <div className="flex gap-1.5">
          <button className="win-btn win-btn-primary" onClick={createMember} disabled={loading}>{loading ? 'Kaydediliyor...' : 'Kaydet'}</button>
          <button className="win-btn" onClick={() => setShowForm(false)}>İptal</button>
        </div>
      </div>
    );
  }

  // Member list
  return (
    <>
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-[13px] font-bold">👥 Üyeler ({members.length})</h2>
        <div className="flex gap-1">
          <button className="win-btn text-[10px]" onClick={() => setShowSettings(true)}>⚙️ Ayarlar</button>
          <button className="win-btn win-btn-primary text-[10px]" onClick={() => setShowForm(true)}>+ Yeni Üye</button>
        </div>
      </div>

      <input className="win-input mb-2" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="🔍 İsim veya telefon ara..." />

      {!filteredMembers.length ? (
        <p className="text-muted-foreground text-center py-3.5 text-xs">
          {searchQuery ? 'Sonuç bulunamadı.' : 'Henüz üye eklenmedi.'}
        </p>
      ) : (
        <div className="border border-foreground">
          <div className="flex bg-muted text-[10px] font-bold uppercase tracking-widest border-b border-foreground">
            <div className="w-6 px-1 py-1 border-r border-foreground">#</div>
            <div className="flex-1 px-2 py-1 border-r border-foreground">Üye</div>
            <div className="w-16 px-1 py-1 border-r border-foreground text-right">Puan</div>
            <div className="w-14 px-1 py-1 text-center">Detay</div>
          </div>
          {filteredMembers.map((m, i) => (
            <div key={m.id} className="flex text-[11px] border-b border-dashed border-muted-foreground/30 last:border-b-0 cursor-pointer hover:bg-muted/30"
              onClick={() => { setSelectedMember(m); fetchTransactions(m.id); }}>
              <div className="w-6 px-1 py-1.5 border-r border-foreground/10 text-muted-foreground">{i + 1}</div>
              <div className="flex-1 px-2 py-1.5 border-r border-foreground/10">
                <div className="font-bold">{m.name}</div>
                <div className="text-[9px] text-muted-foreground">{m.phone}</div>
              </div>
              <div className="w-16 px-1 py-1.5 border-r border-foreground/10 text-right font-bold text-primary">
                {availablePoints(m)}
              </div>
              <div className="w-14 px-1 py-1.5 flex items-center justify-center">
                <span className="text-primary text-[10px] underline">Detay</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default AdminMembers;
