import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
      // Anonymous sign-in for customer
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      
      // Create profile
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
      menuItems={[{ label: '← Geri', onClick: () => navigate('/') }]}
      controls={[{ label: '×', onClick: () => navigate('/') }]}
    >
      <h1 className="text-[15px] font-bold mb-1">Bilgilerinizi girin</h1>
      <p className="text-muted-foreground text-xs">Sipariş takibi için ad ve masa no gereklidir.</p>
      <hr className="border-t border-foreground my-2.5" />
      
      <div className="mb-2.5">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Adınız *</div>
        <input className="win-input" type="text" placeholder="örn. Ahmet" value={name}
          onChange={e => setName(e.target.value)} autoComplete="off" />
      </div>
      
      <div className="mb-2.5">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Masa Numarası *</div>
        <select className="win-input" value={table} onChange={e => setTable(e.target.value)}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
            <option key={n} value={n}>Masa {n}</option>
          ))}
        </select>
      </div>
      
      <hr className="border-t border-dashed border-muted-foreground/40 my-2.5" />
      <div className="flex gap-1.5 mt-2 flex-wrap">
        <button className="win-btn win-btn-primary" onClick={handleRegister} disabled={loading}>
          {loading ? 'Giriş yapılıyor...' : 'Menüye Geç →'}
        </button>
        <button className="win-btn" onClick={() => navigate('/')}>İptal</button>
      </div>
    </WinWindow>
  );
};

export default RegisterScreen;
