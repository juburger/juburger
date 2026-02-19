import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import WinWindow from '@/components/WinWindow';
import { useToast95Context } from '@/contexts/Toast95Context';
import { supabase } from '@/integrations/supabase/client';

const AdminLoginScreen = () => {
  const navigate = useNavigate();
  const { showToast } = useToast95Context();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { showToast('Email ve şifre girin', false); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Check admin status
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı bulunamadı');

      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('user_id', user.id).single();
      
      if (!profile?.is_admin) {
        await supabase.auth.signOut();
        showToast('Yönetici yetkisi yok', false);
        return;
      }

      navigate('/admin');
    } catch (err: any) {
      showToast('Giriş hatası: ' + err.message, false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <WinWindow
      icon="🔐"
      title="Yönetici Girişi"
      menuItems={[{ label: '← Geri', onClick: () => navigate('/') }]}
      controls={[{ label: '×', onClick: () => navigate('/') }]}
    >
      <h1 className="text-[15px] font-bold mb-1">Yönetici Paneli</h1>
      <p className="text-muted-foreground text-xs">Giriş bilgilerinizi girin.</p>
      <hr className="border-t border-foreground my-2.5" />
      
      <div className="mb-2.5">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">E-posta</div>
        <input className="win-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@burgerqr.com" />
      </div>
      <div className="mb-2.5">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Şifre</div>
        <input className="win-input" type="password" value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()} />
      </div>
      <div className="flex gap-1.5">
        <button className="win-btn win-btn-primary" onClick={handleLogin} disabled={loading}>
          {loading ? 'Giriş...' : 'Giriş Yap'}
        </button>
        <button className="win-btn" onClick={() => navigate('/')}>İptal</button>
      </div>
      <hr className="border-t border-dashed border-muted-foreground/40 my-2.5" />
      <p className="text-muted-foreground text-[11px]">Admin hesabı Cloud üzerinden oluşturulmalıdır.</p>
    </WinWindow>
  );
};

export default AdminLoginScreen;
