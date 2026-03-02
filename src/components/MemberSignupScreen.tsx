import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import WinWindow from '@/components/WinWindow';
import { useToast95Context } from '@/contexts/Toast95Context';
import { supabase } from '@/integrations/supabase/client';

const MemberSignupScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tableNum = searchParams.get('table') || '3';
  const { showToast } = useToast95Context();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name.trim()) { showToast('Lütfen adınızı girin', false); return; }
    const cleanPhone = phone.replace(/\s/g, '');
    if (cleanPhone.length < 10) { showToast('Geçerli telefon numarası girin', false); return; }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        await supabase.auth.signInAnonymously();
      }

      const { data: existing } = await supabase.from('members').select('id').eq('phone', cleanPhone).maybeSingle();
      if (existing) {
        showToast('Bu numara zaten kayıtlı! Üye girişi yapabilirsiniz.', false);
        setLoading(false);
        return;
      }

      const { error } = await supabase.from('members').insert({
        name: name.trim(),
        phone: cleanPhone,
      });
      if (error) throw error;

      showToast('Üyelik oluşturuldu! 🎉');
      setTimeout(() => navigate(`/register?table=${tableNum}`), 1500);
    } catch (err: any) {
      showToast('Hata: ' + err.message, false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <WinWindow
      icon="⭐"
      title="Üye Ol"
      controls={[
        { label: <ChevronLeft size={14} />, onClick: () => navigate(`/register?table=${tableNum}`) },
      ]}
    >
      <h1 className="text-base font-bold mb-1">Üyelik Oluştur</h1>
      <p className="text-muted-foreground text-xs">Üye olun, puan kazanın ve tüm ödeme yöntemlerinden yararlanın.</p>
      <div className="h-px bg-border my-3" />

      <div className="mb-3">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Ad Soyad *</div>
        <input className="neu-input" type="text" placeholder="örn. Ahmet Yılmaz" value={name}
          onChange={e => setName(e.target.value)} autoComplete="off" />
      </div>

      <div className="mb-3">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Telefon Numarası *</div>
        <input className="neu-input" type="tel" placeholder="05XX XXX XX XX" value={phone}
          onChange={e => setPhone(e.target.value)} />
      </div>

      <div className="mb-3">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">E-posta (opsiyonel)</div>
        <input className="neu-input" type="email" placeholder="ornek@mail.com" value={email}
          onChange={e => setEmail(e.target.value)} />
      </div>

      <div className="p-2 rounded-lg bg-primary/5 border border-primary/20 text-[10px] text-muted-foreground mb-3">
        <strong className="text-primary">Üyelik Avantajları:</strong>
        <ul className="mt-1 space-y-0.5">
          <li>⭐ Her harcamanın 1/10'u kadar puan kazanın</li>
          <li>💳 Nakit ve POS ile ödeme yapabilin</li>
          <li>📋 Sipariş geçmişinizi görüntüleyin</li>
        </ul>
      </div>

      <div className="h-px bg-border/40 my-3" />
      <div className="flex justify-center mt-3">
        <button className="neu-btn" onClick={handleSignup} disabled={loading}>
          {loading ? 'Kaydediliyor...' : '⭐ ÜYE OL'}
        </button>
      </div>
    </WinWindow>
  );
};

export default MemberSignupScreen;
