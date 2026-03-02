import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import WinWindow from '@/components/WinWindow';
import { useToast95Context } from '@/contexts/Toast95Context';
import { supabase } from '@/integrations/supabase/client';

interface Tenant {
  id: string;
  slug: string;
  name: string;
  logo_url: string;
  primary_color: string;
  phone: string;
  address: string;
  is_active: boolean;
  owner_user_id: string;
  created_at: string;
  ad_banner_1: string;
  ad_banner_2: string;
  ad_link_1: string;
  ad_link_2: string;
}

const SuperAdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast95Context();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [form, setForm] = useState({
    name: '', slug: '', phone: '', address: '',
    logo_url: '', primary_color: '#000000',
    owner_email: '', ad_banner_1: '', ad_banner_2: '',
    ad_link_1: '', ad_link_2: '',
  });
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState<string | null>(null);

  // Auth state
  const [authed, setAuthed] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Admin creation state
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [adminTenant, setAdminTenant] = useState<Tenant | null>(null);
  const [adminForm, setAdminForm] = useState({ email: '', password: '' });
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  // Check if user is authenticated and has admin role
  useEffect(() => {
    let isActive = true;

    // Safety net: never keep user on endless "Kontrol ediliyor..."
    const loadingGuard = window.setTimeout(() => {
      if (isActive) setAuthLoading(false);
    }, 3000);

    const checkAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!isActive) return;

        if (session?.user) {
          const { data: role, error: roleError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .eq('role', 'admin')
            .maybeSingle();

          if (roleError) throw roleError;
          if (!isActive) return;

          setAuthed(!!role);
          if (!role) showToast('Süper admin yetkisi yok', false);
        } else {
          setAuthed(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        if (isActive) {
          setAuthed(false);
          showToast('Oturum kontrolünde hata oluştu', false);
        }
      } finally {
        if (isActive) setAuthLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (!isActive) return;

        if (!session) {
          setAuthed(false);
          setAuthLoading(false);
          return;
        }

        const { data: role, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (roleError) throw roleError;
        if (!isActive) return;

        setAuthed(!!role);
        setAuthLoading(false);
      } catch (error) {
        console.error('Auth state change error:', error);
        if (isActive) {
          setAuthed(false);
          setAuthLoading(false);
        }
      }
    });

    return () => {
      isActive = false;
      window.clearTimeout(loadingGuard);
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      showToast('E-posta ve şifre gerekli', false);
      return;
    }

    setLoginLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) {
        showToast('Giriş hatası: ' + error.message, false);
      }
    } catch (error: any) {
      showToast('Giriş hatası: ' + (error?.message || 'Bilinmeyen hata'), false);
    } finally {
      setLoginLoading(false);
      setAuthLoading(false);
    }
  };

  const fetchTenants = async () => {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      showToast('İşletmeler yüklenemedi', false);
      console.error(error);
    }
    if (data) setTenants(data as Tenant[]);
    setLoading(false);
  };

  useEffect(() => { if (authed) fetchTenants(); }, [authed]);

  const openAdd = () => {
    setEditTenant(null);
    setForm({ name: '', slug: '', phone: '', address: '', logo_url: '', primary_color: '#000000', owner_email: '', ad_banner_1: '', ad_banner_2: '', ad_link_1: '', ad_link_2: '' });
    setShowForm(true);
  };

  const openEdit = (t: Tenant) => {
    setEditTenant(t);
    setForm({
      name: t.name, slug: t.slug, phone: t.phone, address: t.address,
      logo_url: t.logo_url, primary_color: t.primary_color, owner_email: '',
      ad_banner_1: t.ad_banner_1 || '', ad_banner_2: t.ad_banner_2 || '',
      ad_link_1: t.ad_link_1 || '', ad_link_2: t.ad_link_2 || '',
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      showToast('İşletme adı ve slug zorunlu', false);
      return;
    }

    setSaving(true);
    try {
      if (editTenant) {
        const updateData = {
          name: form.name.trim(),
          slug: form.slug.trim().toLowerCase(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          logo_url: form.logo_url.trim(),
          primary_color: form.primary_color,
          ad_banner_1: form.ad_banner_1.trim(),
          ad_banner_2: form.ad_banner_2.trim(),
          ad_link_1: form.ad_link_1.trim(),
          ad_link_2: form.ad_link_2.trim(),
        };
        console.log('Updating tenant:', editTenant.id, updateData);
        const { error, data } = await supabase.from('tenants').update(updateData).eq('id', editTenant.id).select();
        console.log('Update result:', { error, data });

        if (error) throw error;
        showToast('İşletme güncellendi ✓');
      } else {
        if (!form.owner_email.trim()) {
          showToast('Sahip e-posta adresi zorunlu', false);
          setSaving(false);
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Oturum bulunamadı');

        const { data: newTenant, error } = await supabase.from('tenants').insert({
          name: form.name.trim(),
          slug: form.slug.trim().toLowerCase(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          logo_url: form.logo_url.trim(),
          primary_color: form.primary_color,
          owner_user_id: user.id,
        }).select().single();

        if (error) throw error;

        if (newTenant) {
          await supabase.from('tenant_users').insert({
            tenant_id: newTenant.id,
            user_id: user.id,
            role: 'admin',
          });
        }

        showToast('İşletme oluşturuldu ✓');
      }

      setShowForm(false);
      fetchTenants();
    } catch (err: any) {
      console.error('Save error:', err);
      showToast('Hata: ' + (err.message || 'Bilinmeyen hata'), false);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (t: Tenant) => {
    const { error } = await supabase.from('tenants').update({ is_active: !t.is_active }).eq('id', t.id);
    if (error) {
      showToast('Güncelleme hatası', false);
      return;
    }
    showToast(t.is_active ? 'İşletme pasif yapıldı' : 'İşletme aktif yapıldı ✓');
    fetchTenants();
  };

  const openAdminForm = (t: Tenant) => {
    setAdminTenant(t);
    setAdminForm({ email: '', password: '' });
    setShowAdminForm(true);
  };

  const createTenantAdmin = async () => {
    if (!adminForm.email || !adminForm.password) {
      showToast('E-posta ve şifre zorunlu', false);
      return;
    }
    if (adminForm.password.length < 6) {
      showToast('Şifre en az 6 karakter olmalı', false);
      return;
    }
    setCreatingAdmin(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Oturum bulunamadı');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-tenant-admin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email: adminForm.email.trim(),
            password: adminForm.password,
            tenant_id: adminTenant!.id,
          }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Bilinmeyen hata');
      showToast(`Admin oluşturuldu: ${adminForm.email} ✓`);
      setShowAdminForm(false);
    } catch (err: any) {
      showToast('Hata: ' + err.message, false);
    } finally {
      setCreatingAdmin(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  // Login screen
  if (authLoading) {
    return (
      <WinWindow icon="🏢" title="Süper Admin — siparis.co">
        <div className="flex items-center justify-center py-12">
          <div className="text-sm text-muted-foreground">Kontrol ediliyor...</div>
        </div>
      </WinWindow>
    );
  }

  if (!authed) {
    return (
      <WinWindow
        icon="🏢"
        title="Süper Admin Girişi — siparis.co"
        controls={[{ label: '×', onClick: () => navigate('/') }]}
      >
        <div className="flex flex-col items-center py-8">
          <div className="text-3xl mb-3">🔐</div>
          <h2 className="text-[15px] font-bold mb-4">Süper Admin Girişi</h2>
          <div className="w-full max-w-xs space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">E-posta</div>
              <input className="neu-input w-full" type="email" value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)} placeholder="admin@siparis.co" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Şifre</div>
              <input className="neu-input w-full" type="password" value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)} placeholder="••••••"
                onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            </div>
            <button className="neu-btn neu-btn-primary w-full" onClick={handleLogin} disabled={loginLoading}>
              {loginLoading ? 'Giriş yapılıyor...' : '🔑 Giriş Yap'}
            </button>
          </div>
          <button className="text-[10px] text-muted-foreground mt-4 cursor-pointer bg-transparent border-none hover:text-foreground"
            onClick={() => navigate('/')}>← Ana Sayfa</button>
        </div>
      </WinWindow>
    );
  }

  if (showAdminForm && adminTenant) {
    return (
      <WinWindow
        icon="👤"
        title="Süper Admin — siparis.co"
        menuItems={[
          { label: '← Geri', onClick: () => setShowAdminForm(false) },
          { label: '🚪 Çıkış', onClick: handleLogout },
        ]}
        controls={[{ label: '×', onClick: () => setShowAdminForm(false) }]}
      >
        <h2 className="text-[15px] font-bold mb-1">İşletme Admini Oluştur</h2>
        <p className="text-xs text-muted-foreground mb-3">
          <strong>{adminTenant.name}</strong> ({adminTenant.slug}.siparis.co) için yeni admin hesabı
        </p>
        <div className="h-px bg-border my-3" />

        <div className="space-y-3 max-w-lg">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">E-posta *</div>
            <input className="neu-input" type="email" value={adminForm.email}
              onChange={e => setAdminForm({ ...adminForm, email: e.target.value })}
              placeholder="admin@isletme.com" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Şifre *</div>
            <input className="neu-input" type="password" value={adminForm.password}
              onChange={e => setAdminForm({ ...adminForm, password: e.target.value })}
              placeholder="En az 6 karakter"
              onKeyDown={e => e.key === 'Enter' && createTenantAdmin()} />
          </div>
          <div className="flex gap-2 pt-2">
            <button className="neu-btn neu-btn-primary" onClick={createTenantAdmin} disabled={creatingAdmin}>
              {creatingAdmin ? 'Oluşturuluyor...' : '👤 Admin Oluştur'}
            </button>
            <button className="neu-btn" onClick={() => setShowAdminForm(false)}>İptal</button>
          </div>
        </div>

        <div className="h-px bg-border/40 my-3" />
        <p className="text-[10px] text-muted-foreground">
          Oluşturulan hesap, otomatik olarak admin rolü ve işletme bağlantısı ile yapılandırılır. 
          Admin, /admin-login sayfasından giriş yapabilir.
        </p>
      </WinWindow>
    );
  }

  if (showForm) {
    return (
      <WinWindow
        icon="🏢"
        title="Süper Admin — siparis.co"
        menuItems={[
          { label: '← Geri', onClick: () => setShowForm(false) },
          { label: '🚪 Çıkış', onClick: handleLogout },
        ]}
        controls={[{ label: '×', onClick: handleLogout }]}
      >
        <h2 className="text-[15px] font-bold mb-3">
          {editTenant ? 'İşletme Düzenle' : 'Yeni İşletme Ekle'}
        </h2>

        <div className="space-y-3 max-w-lg">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">İşletme Adı *</div>
            <input className="neu-input" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })} placeholder="ör: Burger King" />
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Slug (Alt Alan Adı) *</div>
            <input className="neu-input" value={form.slug}
              onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
              placeholder="ör: burger-king" />
            <div className="text-[9px] text-muted-foreground mt-0.5">
              {form.slug ? `${form.slug}.siparis.co` : 'slug.siparis.co'}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Telefon</div>
            <input className="neu-input" value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="0532 xxx xx xx" />
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Adres</div>
            <input className="neu-input" value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })} placeholder="İstanbul, Türkiye" />
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Logo</div>
            {form.logo_url && (
              <div className="mb-2 flex items-center gap-2">
                <img src={form.logo_url} alt="Logo" className="w-12 h-12 rounded-lg object-cover border border-border" />
                <button className="text-[10px] text-destructive hover:underline" onClick={() => setForm({ ...form, logo_url: '' })}>Kaldır</button>
              </div>
            )}
            <label className={`neu-btn text-xs cursor-pointer inline-block ${uploadingLogo ? 'opacity-50 pointer-events-none' : ''}`}>
              {uploadingLogo ? '⏳ Yükleniyor...' : '📷 Logo Yükle'}
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 2 * 1024 * 1024) {
                  showToast('Dosya 2MB\'dan küçük olmalı', false);
                  return;
                }
                setUploadingLogo(true);
                try {
                  const slug = form.slug || editTenant?.slug || 'temp';
                  const ext = file.name.split('.').pop();
                  const path = `${slug}/logo-${Date.now()}.${ext}`;
                  const { error: upErr } = await supabase.storage.from('tenant-logos').upload(path, file, { upsert: true });
                  if (upErr) {
                    showToast('Yükleme hatası: ' + upErr.message, false);
                    return;
                  }
                  const { data: urlData } = supabase.storage.from('tenant-logos').getPublicUrl(path);
                  setForm(prev => ({ ...prev, logo_url: urlData.publicUrl }));
                  showToast('Logo yüklendi ✓');
                } catch (err: any) {
                  showToast('Yükleme hatası: ' + err.message, false);
                } finally {
                  setUploadingLogo(false);
                }
              }} />
            </label>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Marka Rengi</div>
            <div className="flex items-center gap-3">
              <input type="color" value={form.primary_color} className="w-10 h-10 cursor-pointer rounded-full border-none"
                onChange={e => setForm({ ...form, primary_color: e.target.value })} />
              <span className="text-xs text-muted-foreground">{form.primary_color}</span>
            </div>
          </div>

          {/* Ad Banners */}
          {editTenant && (
            <>
              <div className="h-px bg-border my-2" />
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 font-bold">📢 Reklam Bannerları</div>
              {([
                { bannerKey: 'ad_banner_1' as const, linkKey: 'ad_link_1' as const, idx: 0 },
                { bannerKey: 'ad_banner_2' as const, linkKey: 'ad_link_2' as const, idx: 1 },
              ]).map(({ bannerKey, linkKey, idx }) => (
                <div key={bannerKey} className="mb-3">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Reklam {idx + 1}</div>
                  {form[bannerKey] && (
                    <div className="mb-2 flex items-center gap-2">
                      <img src={form[bannerKey]} alt={`Banner ${idx + 1}`} className="h-16 rounded-lg object-cover border border-border" />
                      <button className="text-[10px] text-destructive hover:underline" onClick={() => setForm({ ...form, [bannerKey]: '', [linkKey]: '' })}>Kaldır</button>
                    </div>
                  )}
                  <label className={`neu-btn text-xs cursor-pointer inline-block ${uploadingBanner === bannerKey ? 'opacity-50 pointer-events-none' : ''}`}>
                    {uploadingBanner === bannerKey ? '⏳ Yükleniyor...' : `📷 Görsel Yükle`}
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024) { showToast('Dosya 5MB\'dan küçük olmalı', false); return; }
                      setUploadingBanner(bannerKey);
                      try {
                        const slug = form.slug || editTenant?.slug || 'temp';
                        const ext = file.name.split('.').pop();
                        const path = `${slug}/${bannerKey}-${Date.now()}.${ext}`;
                        const { error: upErr } = await supabase.storage.from('tenant-logos').upload(path, file, { upsert: true });
                        if (upErr) { showToast('Yükleme hatası: ' + upErr.message, false); return; }
                        const { data: urlData } = supabase.storage.from('tenant-logos').getPublicUrl(path);
                        setForm(prev => ({ ...prev, [bannerKey]: urlData.publicUrl }));
                        showToast(`Reklam ${idx + 1} yüklendi ✓`);
                      } catch (err: any) { showToast('Yükleme hatası: ' + err.message, false); }
                      finally { setUploadingBanner(null); }
                    }} />
                  </label>
                  {form[bannerKey] && (
                    <div className="mt-1.5">
                      <input className="neu-input text-[11px]" value={form[linkKey]}
                        onChange={e => setForm({ ...form, [linkKey]: e.target.value })}
                        placeholder="https://ornek.com (opsiyonel)" />
                      <div className="text-[9px] text-muted-foreground mt-0.5">Tıklanınca açılacak link (boş bırakılabilir)</div>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {!editTenant && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Sahip E-posta *</div>
              <input className="neu-input" type="email" value={form.owner_email}
                onChange={e => setForm({ ...form, owner_email: e.target.value })}
                placeholder="admin@isletme.com" />
              <div className="text-[9px] text-muted-foreground mt-0.5">
                Şimdilik giriş yapan admin hesabı sahip olarak atanır
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button className="neu-btn neu-btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            <button className="neu-btn" onClick={() => setShowForm(false)}>İptal</button>
          </div>
        </div>
      </WinWindow>
    );
  }

  return (
    <WinWindow
      icon="🏢"
      title="Süper Admin — siparis.co"
      menuItems={[
        { label: '← Geri', onClick: () => navigate('/') },
        { label: 'Yenile', onClick: fetchTenants },
        { label: '🚪 Çıkış', onClick: handleLogout },
      ]}
      controls={[{ label: '×', onClick: handleLogout }]}
      statusItems={[`${tenants.length} işletme`, `${tenants.filter(t => t.is_active).length} aktif`]}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[15px] font-bold">İşletme Yönetimi</h2>
        <button className="neu-btn neu-btn-primary text-xs" onClick={openAdd}>+ Yeni İşletme</button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-6 text-xs">Yükleniyor...</p>
      ) : tenants.length === 0 ? (
        <p className="text-muted-foreground text-center py-6 text-xs">Henüz işletme eklenmedi</p>
      ) : (
        <div className="space-y-3">
          {tenants.map(t => (
            <div key={t.id} className={`neu-raised overflow-hidden transition-opacity ${!t.is_active ? 'opacity-50' : ''}`}>
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {t.logo_url && <img src={t.logo_url} alt="" className="w-6 h-6 rounded-full object-cover" />}
                      <span className="text-sm font-bold">{t.name}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider ${t.is_active ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                        {t.is_active ? 'AKTİF' : 'PASİF'}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground space-y-0.5">
                      <div>🌐 {t.slug}.siparis.co</div>
                      {t.phone && <div>📞 {t.phone}</div>}
                      {t.address && <div>📍 {t.address}</div>}
                      <div>📅 {new Date(t.created_at).toLocaleDateString('tr-TR')}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-5 h-5 rounded-full border border-border" style={{ backgroundColor: t.primary_color }} />
                  </div>
                </div>
              </div>
              <div className="flex text-xs border-t border-border/30">
                <button className="flex-1 py-2 cursor-pointer bg-transparent border-none hover:bg-accent/50 text-foreground transition-colors rounded-none"
                  onClick={() => openEdit(t)}>✏️ Düzenle</button>
                <button className="flex-1 py-2 cursor-pointer bg-transparent border-none hover:bg-accent/50 text-foreground transition-colors rounded-none"
                  onClick={() => openAdminForm(t)}>👤 Admin Ekle</button>
                <button className={`flex-1 py-2 cursor-pointer bg-transparent border-none hover:bg-accent/50 transition-colors rounded-none ${t.is_active ? 'text-destructive' : 'text-primary'}`}
                  onClick={() => toggleActive(t)}>
                  {t.is_active ? '⏸ Pasif Yap' : '▶ Aktif Yap'}
                </button>
                <button className="flex-1 py-2 cursor-pointer bg-transparent border-none hover:bg-accent/50 text-foreground transition-colors rounded-none"
                  onClick={() => window.open(`/?tenant=${t.slug}`, '_blank')}>🔗 Önizle</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </WinWindow>
  );
};

export default SuperAdminPanel;
