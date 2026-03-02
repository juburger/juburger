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
    owner_email: '',
  });
  const [saving, setSaving] = useState(false);

  // Admin creation state
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [adminTenant, setAdminTenant] = useState<Tenant | null>(null);
  const [adminForm, setAdminForm] = useState({ email: '', password: '' });
  const [creatingAdmin, setCreatingAdmin] = useState(false);

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

  useEffect(() => { fetchTenants(); }, []);

  const openAdd = () => {
    setEditTenant(null);
    setForm({ name: '', slug: '', phone: '', address: '', logo_url: '', primary_color: '#000000', owner_email: '' });
    setShowForm(true);
  };

  const openEdit = (t: Tenant) => {
    setEditTenant(t);
    setForm({
      name: t.name, slug: t.slug, phone: t.phone, address: t.address,
      logo_url: t.logo_url, primary_color: t.primary_color, owner_email: '',
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
        // Update existing tenant
        const { error } = await supabase.from('tenants').update({
          name: form.name.trim(),
          slug: form.slug.trim().toLowerCase(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          logo_url: form.logo_url.trim(),
          primary_color: form.primary_color,
        }).eq('id', editTenant.id);

        if (error) throw error;
        showToast('İşletme güncellendi ✓');
      } else {
        // Create new tenant — need owner_email to resolve user
        if (!form.owner_email.trim()) {
          showToast('Sahip e-posta adresi zorunlu', false);
          setSaving(false);
          return;
        }

        // Look up user by email via edge function or direct query
        // For now, we'll create tenant with a placeholder and let admin set owner later
        // Actually, we need the owner_user_id. Let's use the current user as owner for now
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

        // Also create tenant_users entry
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
      showToast('Hata: ' + err.message, false);
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
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Logo URL</div>
            <input className="neu-input" value={form.logo_url}
              onChange={e => setForm({ ...form, logo_url: e.target.value })} placeholder="https://..." />
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Marka Rengi</div>
            <div className="flex items-center gap-3">
              <input type="color" value={form.primary_color} className="w-10 h-10 cursor-pointer rounded-full border-none"
                onChange={e => setForm({ ...form, primary_color: e.target.value })} />
              <span className="text-xs text-muted-foreground">{form.primary_color}</span>
            </div>
          </div>

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
