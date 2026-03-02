import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, X } from 'lucide-react';
import WinWindow from '@/components/WinWindow';
import { useToast95Context } from '@/contexts/Toast95Context';
import { supabase } from '@/integrations/supabase/client';
import { useTenantId } from '@/hooks/useTenantQuery';

const RegisterScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTable = searchParams.get('table') || '3';
  const existingMemberId = searchParams.get('member') || '';
  const [name, setName] = useState('');
  const [table, setTable] = useState(defaultTable);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [memberMode, setMemberMode] = useState(!!existingMemberId);
  const [memberFound, setMemberFound] = useState<{ id: string; name: string; points: number } | null>(null);
  const { showToast } = useToast95Context();
  const tenantId = useTenantId();

  // Auto-load member if returning with member param
  useEffect(() => {
    if (existingMemberId) {
      const loadMember = async () => {
        const { data } = await supabase.from('members').select('id, name, phone, total_points, used_points').eq('id', existingMemberId).maybeSingle();
        if (data) {
          const m = data as any;
          setMemberFound({ id: m.id, name: m.name, points: m.total_points - m.used_points });
          setName(m.name);
          setPhone(m.phone);
          setMemberMode(true);
        }
      };
      loadMember();
    }
  }, [existingMemberId]);

  const lookupMember = async () => {
    const cleanPhone = phone.replace(/\s/g, '');
    if (cleanPhone.length < 10) { showToast('Geçerli telefon numarası girin', false); return; }
    setLoading(true);
    const { data } = await supabase.from('members').select('id, name, total_points, used_points').eq('phone', cleanPhone).eq('tenant_id', tenantId).maybeSingle();
    if (data) {
      const m = data as any;
      setMemberFound({ id: m.id, name: m.name, points: m.total_points - m.used_points });
      setName(m.name);
      showToast(`Hoş geldin ${m.name}! 🎉`);
    } else {
      showToast('Bu numara kayıtlı değil. Kayıt olmak için "Üye Ol" butonunu kullanın.', false);
      setMemberFound(null);
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!name.trim()) { showToast('Lütfen adınızı girin!', false); return; }
    if (memberMode && !memberFound) { showToast('Üye girişi için önce telefonla üye doğrulaması yapın.', false); return; }
    
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      
      if (data.user) {
        await supabase.from('profiles').insert({
          user_id: data.user.id,
          display_name: name.trim(),
          tenant_id: tenantId,
        });
      }

      const memberId = memberFound?.id || '';
      navigate(`/menu?table=${table}&name=${encodeURIComponent(name.trim())}${memberId ? `&member=${memberId}` : ''}`);
    } catch (err: any) {
      showToast('Giriş hatası: ' + err.message, false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <WinWindow
      icon="📝"
      title="Kayıt"
      controls={[
        { label: <ChevronLeft size={14} />, onClick: () => navigate('/') },
        { label: <X size={14} />, onClick: () => navigate('/') },
      ]}
    >
      <h1 className="text-base font-bold mb-1">Bilgilerinizi girin</h1>
      <p className="text-muted-foreground text-xs">Sipariş takibi için ad ve masa no gereklidir.</p>
      <div className="h-px bg-border my-3" />

      {/* Member toggle */}
      <div className="flex items-center gap-2 mb-3">
        <button
          className={`text-[11px] px-3 py-1.5 rounded-full transition-all ${memberMode ? 'neu-sunken font-semibold' : 'neu-btn'}`}
          onClick={() => setMemberMode(true)}
        >
          ⭐ Üye Girişi
        </button>
        <button
          className={`text-[11px] px-3 py-1.5 rounded-full transition-all ${!memberMode ? 'neu-sunken font-semibold' : 'neu-btn'}`}
          onClick={() => { setMemberMode(false); setMemberFound(null); }}
        >
          👤 Misafir
        </button>
      </div>

      {memberMode && (
        <div className="mb-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Telefon Numarası</div>
          <div className="flex gap-1">
            <input className="neu-input flex-1" type="tel" placeholder="05XX XXX XX XX" value={phone}
              onChange={e => setPhone(e.target.value)} />
            <button className="neu-btn text-[11px]" onClick={lookupMember} disabled={loading}>Ara</button>
          </div>
          {memberFound && (
            <div className="mt-2 p-2 border border-primary/30 rounded-lg bg-primary/5">
              <div className="text-[12px] font-bold text-primary">✅ {memberFound.name}</div>
              <div className="text-[10px] text-muted-foreground">Puan: <span className="font-bold text-primary">{memberFound.points}</span></div>
            </div>
          )}
          {!memberFound && (
            <div className="mt-2 text-[10px] text-muted-foreground">
              Üye değil misiniz? <button className="text-primary underline" onClick={() => navigate(`/member-signup?table=${table}`)}>Üye Ol</button>
            </div>
          )}
        </div>
      )}

      {!memberMode && (
        <div className="mb-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Adınız *</div>
          <input className="neu-input" type="text" placeholder="örn. Ahmet" value={name}
            onChange={e => setName(e.target.value)} autoComplete="off" />
          <div className="mt-1.5 p-2 rounded-lg bg-muted/50 text-[10px] text-muted-foreground">
            ℹ️ Misafir olarak sadece <strong>online kart</strong> ile ödeme yapabilirsiniz. Nakit veya POS için üye girişi yapın.
          </div>
        </div>
      )}

      {memberFound && memberMode && (
        <div className="mb-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Adınız</div>
          <input className="neu-input" type="text" value={name} onChange={e => setName(e.target.value)} />
        </div>
      )}
      
      <div className="mb-3">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Masa Numarası *</div>
        <select className="neu-input" value={table} onChange={e => setTable(e.target.value)}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
            <option key={n} value={n}>Masa {n}</option>
          ))}
        </select>
      </div>
      
      <div className="h-px bg-border/40 my-3" />
      <div className="flex justify-center mt-3">
        <button className="neu-btn" onClick={handleRegister} disabled={loading || (memberMode && !memberFound)}>
          {loading ? 'Giriş yapılıyor...' : 'MENU'}
        </button>
      </div>
    </WinWindow>
  );
};

export default RegisterScreen;
