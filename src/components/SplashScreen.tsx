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
  const isPremium = tenant?.is_premium ?? false;
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
      title=""
      controls={[
        ...(isPremium ? [
          { label: <span className="text-[11px] whitespace-nowrap font-medium tracking-tight text-foreground">🍽️ Sipariş Ver</span>, onClick: () => navigate(`/register?table=${tableNum}`) },
          { label: <span className="text-[11px] whitespace-nowrap font-medium tracking-tight text-foreground">⭐ Üye Ol</span>, onClick: () => navigate(`/member-signup?table=${tableNum}`) },
        ] : []),
        { label: <Menu size={14} />, onClick: () => navigate('/admin-login') },
      ]}
    >

      {/* Read-only menu */}
      <div className="text-center mb-4">
        <span style={{ fontFamily: "'Haas Grot Text Trial', 'Haas Grotesk', sans-serif", fontStyle: 'italic', fontSize: '28px', fontWeight: 800, letterSpacing: '0.15em' }} className="text-foreground uppercase">MENU</span>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-4 text-sm">Yükleniyor...</p>
      ) : (
        <>
           <div className="flex flex-col items-center gap-2 mb-3">
             {categories.map(c => (
               <button key={c.id}
                 className={`text-base px-4 py-2 cursor-pointer transition-all font-normal uppercase tracking-[0.15em] text-foreground ${activeCat === c.id ? 'opacity-50' : ''}`}
                  style={{ fontFamily: "'Helvetica Now Display', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif", fontWeight: 500 }}
                 onClick={() => { setActiveCat(activeCat === c.id ? null : c.id); setMenuExpanded(true); }}>{c.name}</button>
             ))}
           </div>

           {menuExpanded && grouped.filter(g => !activeCat || g.catId === activeCat).map(group => (
             <div key={group.catId} className="mb-6">
               {group.items.map(p => (
                 <div key={p.id} className="py-3">
                   <div className="text-sm lowercase tracking-wide text-foreground" style={{ fontFamily: "'Helvetica Now Display', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif", fontWeight: 500 }}>
                     {p.name}
                   </div>
                   {p.description && (
                     <div className="text-xs text-muted-foreground mt-1 leading-relaxed" style={{ fontFamily: "'Helvetica Now Display', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif", fontWeight: 500 }}>
                       {p.description.split(',').map(s => s.trim()).join(' | ')}
                     </div>
                   )}
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
