import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, X } from 'lucide-react';
import WinWindow from '@/components/WinWindow';
import { useToast95Context } from '@/contexts/Toast95Context';
import { supabase } from '@/integrations/supabase/client';

const RegisterScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTable = searchParams.get('table') || '3';
  const [name, setName] = useState('');
  const [table, setTable] = useState(defaultTable);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast95Context();

  const handleRegister = async () => {
    if (!name.trim()) { showToast('Lütfen adınızı girin!', false); return; }
    
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      
      if (data.user) {
        await supabase.from('profiles').insert({
          user_id: data.user.id,
          display_name: name.trim(),
          is_admin: false,
        });
      }
      
      navigate(`/menu?table=${table}&name=${encodeURIComponent(name.trim())}`);
    } catch (err: any) {
      showToast('Giriş hatası: ' + err.message, false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <WinWindow
      icon="📝"
      title="Kayıt — BurgerQR"
      controls={[
        { label: <ChevronLeft size={14} />, onClick: () => navigate('/') },
        { label: <X size={14} />, onClick: () => navigate('/') },
      ]}
    >
      <h1 className="text-base font-bold mb-1">Bilgilerinizi girin</h1>
      <p className="text-muted-foreground text-xs">Sipariş takibi için ad ve masa no gereklidir.</p>
      <div className="h-px bg-border my-3" />
      
      <div className="mb-3">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Adınız *</div>
        <input className="neu-input" type="text" placeholder="örn. Ahmet" value={name}
          onChange={e => setName(e.target.value)} autoComplete="off" />
      </div>
      
      <div className="mb-3">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Masa Numarası *</div>
        <select className="neu-input" value={table} onChange={e => setTable(e.target.value)}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
            <option key={n} value={n}>Masa {n}</option>
          ))}
        </select>
      </div>
      
      <div className="h-px bg-border/40 my-3" />
      <div className="flex gap-2 mt-3 flex-wrap">
        <button className="neu-btn neu-btn-primary" onClick={handleRegister} disabled={loading}>
          {loading ? 'Giriş yapılıyor...' : 'Menüye Geç →'}
        </button>
        <button className="neu-btn" onClick={() => navigate('/')}>İptal</button>
      </div>
    </WinWindow>
  );
};

export default RegisterScreen;
