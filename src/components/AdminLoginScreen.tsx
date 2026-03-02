import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import WinWindow from '@/components/WinWindow';
import { useToast95Context } from '@/contexts/Toast95Context';
import { supabase } from '@/integrations/supabase/client';

const AdminLoginScreen = () => {
  const navigate = useNavigate();
  const { showToast } = useToast95Context();
  const [email, setEmail] = useState(() => localStorage.getItem('admin_email') || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('admin_email'));
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { showToast('Email ve şifre girin', false); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı bulunamadı');

      const { data: role } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
      
      if (!role) {
        await supabase.auth.signOut();
        showToast('Yönetici yetkisi yok', false);
        return;
      }

      if (rememberMe) {
        localStorage.setItem('admin_email', email);
      } else {
        localStorage.removeItem('admin_email');
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
      <h1 className="text-base font-bold mb-1">Yönetici Paneli</h1>
      <p className="text-muted-foreground text-xs">Giriş bilgilerinizi girin.</p>
      <div className="h-px bg-border my-3" />
      
      <div className="mb-3">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">E-posta</div>
        <input className="neu-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@burgerqr.com" />
      </div>
      <div className="mb-3">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Şifre</div>
        <input className="neu-input" type="password" value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()} />
      </div>
      <div className="flex items-center gap-3 mb-3">
        <input type="checkbox" className="w-4 h-4 cursor-pointer" checked={rememberMe}
          onChange={e => setRememberMe(e.target.checked)} id="rememberMe" />
        <label htmlFor="rememberMe" className="text-xs cursor-pointer select-none">Beni Hatırla</label>
        <button className="neu-btn neu-btn-primary" onClick={handleLogin} disabled={loading}>
          {loading ? 'Giriş...' : 'Giriş Yap'}
        </button>
        <button className="neu-btn" onClick={() => navigate('/')}>İptal</button>
      </div>
      <div className="h-px bg-border/40 my-3" />
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs">Admin hesabı Cloud üzerinden oluşturulmalıdır.</p>
        <button className="text-xs text-primary underline cursor-pointer bg-transparent border-none" onClick={() => navigate('/super-admin')}>🏢 Süper Admin</button>
      </div>
    </WinWindow>
  );
};

export default AdminLoginScreen;
