import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Menu, Sun, Moon } from 'lucide-react';
import WinWindow, { useModDarkMode } from '@/components/WinWindow';
import { useToast95Context } from '@/contexts/Toast95Context';
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';

interface DbCategory { id: string; name: string; sort_order: number; }
interface DbProduct { id: string; category_id: string | null; name: string; description: string; price: number; tag: string; is_available: boolean; sort_order: number; }

const SplashScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tableNum = searchParams.get('table') || '3';
  const { showToast } = useToast95Context();
  const { tenant, tenantId, uiTheme } = useTenant();
  const [dark, setDark] = useModDarkMode();
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [menuExpanded, setMenuExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMenu = async () => {
      if (!tenantId) return;
      const [{ data: cats }, { data: prods }] = await Promise.all([
        supabase.from('categories').select('*').eq('tenant_id', tenantId).order('sort_order'),
        supabase.from('products').select('*').eq('tenant_id', tenantId).eq('is_available', true).order('sort_order'),
      ]);
      if (cats) setCategories(cats);
      if (prods) setProducts(prods);
      setLoading(false);
    };
    fetchMenu();
  }, [tenantId]);

  const grouped = categories.map(c => ({
    cat: c.name,
    catId: c.id,
    items: products.filter(p => p.category_id === c.id),
  })).filter(g => g.items.length > 0);

  const icon = tenant?.logo_url
    ? <img src={tenant.logo_url} alt="" className="w-5 h-5 rounded-full object-cover" />
    : null;

  return (
    <WinWindow
      icon={icon}
      title={`Masa ${tableNum}`}
      controls={[
        { label: <span className="text-[11px] whitespace-nowrap font-medium tracking-tight text-foreground">🍽️ Sipariş Ver</span>, onClick: () => navigate(`/register?table=${tableNum}`) },
        { label: <span className="text-[11px] whitespace-nowrap font-medium tracking-tight text-foreground">⭐ Üye Ol</span>, onClick: () => navigate(`/member-signup?table=${tableNum}`) },
        { label: <Menu size={14} />, onClick: () => navigate('/admin-login') },
      ]}
    >

      {/* Read-only menu */}
      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Menü</div>

      {loading ? (
        <p className="text-muted-foreground text-center py-4 text-sm">Yükleniyor...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {categories.map(c => (
              <button key={c.id}
                className={`text-sm px-4 py-2.5 cursor-pointer rounded-full transition-all font-medium ${activeCat === c.id ? 'neu-sunken' : 'neu-flat'}`}
                onClick={() => { setActiveCat(activeCat === c.id ? null : c.id); setMenuExpanded(true); }}>{c.name}</button>
            ))}
          </div>

          {menuExpanded && grouped.filter(g => !activeCat || g.catId === activeCat).map(group => (
            <div key={group.catId}>
              <div className="text-xs font-bold mt-3 mb-1.5 pb-1 uppercase tracking-widest text-muted-foreground border-b border-border/50">
                {group.cat}
              </div>
              {group.items.map(p => (
                <div key={p.id} className="flex items-start justify-between py-2 border-b border-border/30 gap-2">
                  <div className="flex-1">
                    <div className="text-sm font-semibold">
                      {p.name}
                      {p.tag === 'n' && <span className="text-[9px] px-1.5 py-0.5 ml-1.5 rounded-full neu-sunken text-foreground font-medium">YENİ</span>}
                      {p.tag === 's' && <span className="text-[9px] px-1.5 py-0.5 ml-1.5 rounded-full neu-sunken text-foreground font-medium">Acılı</span>}
                      {p.tag === 'p' && <span className="text-[9px] px-1.5 py-0.5 ml-1.5 rounded-full neu-sunken text-foreground font-medium">POPÜLER</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{p.description}</div>
                  </div>
                  <span className="text-sm font-bold min-w-[46px] text-right pt-0.5">₺{p.price}</span>
                </div>
              ))}
            </div>
          ))}
        </>
      )}

      {/* Ad Banners */}
      {tenant?.ad_banner_1 && (
        <div className="mt-4">
          {tenant.ad_link_1 ? (
            <a href={tenant.ad_link_1.startsWith('http') ? tenant.ad_link_1 : `https://${tenant.ad_link_1}`} target="_blank" rel="noopener noreferrer">
              <img src={tenant.ad_banner_1} alt="Reklam" width={460} height={259} fetchPriority="high" decoding="async" className="w-full rounded-xl object-cover" />
            </a>
          ) : (
            <img src={tenant.ad_banner_1} alt="Reklam" width={460} height={259} fetchPriority="high" decoding="async" className="w-full rounded-xl object-cover" />
          )}
        </div>
      )}
      {tenant?.ad_banner_2 && (
        <div className="mt-3">
          {tenant.ad_link_2 ? (
            <a href={tenant.ad_link_2.startsWith('http') ? tenant.ad_link_2 : `https://${tenant.ad_link_2}`} target="_blank" rel="noopener noreferrer">
              <img src={tenant.ad_banner_2} alt="Reklam" width={460} height={191} loading="lazy" decoding="async" className="w-full rounded-xl object-cover" />
            </a>
          ) : (
            <img src={tenant.ad_banner_2} alt="Reklam" width={460} height={191} loading="lazy" decoding="async" className="w-full rounded-xl object-cover" />
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-6">
        <p className="text-muted-foreground text-[11px]">© 2025 siparis.co</p>
        {uiTheme === 'mod' && (
          <button
            onClick={() => setDark(!dark)}
            className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer text-foreground/70 hover:text-foreground transition-colors border border-border"
            aria-label={dark ? 'Açık mod' : 'Koyu mod'}
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        )}
      </div>
    </WinWindow>
  );
};

export default SplashScreen;
