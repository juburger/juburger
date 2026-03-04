import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Menu, Sun, Moon, Instagram } from 'lucide-react';
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

  // Instagram icon for header (replaces logo)
  const instagramUrl = (tenant as any)?.instagram_url;
  const instagramIcon = instagramUrl
    ? <a href={instagramUrl.startsWith('http') ? instagramUrl : `https://${instagramUrl}`} target="_blank" rel="noopener noreferrer" className="w-[60px] h-[60px] rounded-full flex items-center justify-center"><Instagram size={28} className="text-foreground" /></a>
    : <span className="w-[60px] h-[60px] rounded-full flex items-center justify-center"><Instagram size={28} className="text-foreground/40" /></span>;

  return (
    <WinWindow
      icon={instagramIcon}
      title=""
      controls={[
        ...(isPremium ? [
          { label: <span className="text-[11px] whitespace-nowrap font-medium tracking-tight text-foreground">🍽️ Sipariş Ver</span>, onClick: () => navigate(`/register?table=${tableNum}`) },
          { label: <span className="text-[11px] whitespace-nowrap font-medium tracking-tight text-foreground">⭐ Üye Ol</span>, onClick: () => navigate(`/member-signup?table=${tableNum}`) },
        ] : []),
        ...(uiTheme === 'mod' ? [{ label: <span className="w-[60px] h-[60px] rounded-full flex items-center justify-center cursor-pointer text-foreground/70 hover:text-foreground transition-colors">{dark ? <Sun size={24} /> : <Moon size={24} />}</span>, onClick: () => setDark(!dark) }] : []),
      ]}
    >

      {/* Centered business logo */}
      {tenant?.logo_url && (tenant as any)?.show_logo !== false && (
        <div className="flex justify-center mb-4">
          {tenant.logo_link ? (
            <a href={tenant.logo_link.startsWith('http') ? tenant.logo_link : `https://${tenant.logo_link}`} target="_blank" rel="noopener noreferrer">
              <img src={tenant.logo_url} alt={tenant.name} className="w-[80px] h-[80px] rounded-full object-cover" />
            </a>
          ) : (
            <img src={tenant.logo_url} alt={tenant.name} className="w-[80px] h-[80px] rounded-full object-cover" />
          )}
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground text-center py-4 text-sm">Yükleniyor...</p>
      ) : (
        <>
           <div className="flex flex-col items-center gap-2 mb-3">
             {categories.map(c => {
               const catProducts = products.filter(p => p.category_id === c.id);
               return (
                 <div key={c.id} className="w-full flex flex-col items-center">
                   <button
                     className={`text-base px-4 py-2 cursor-pointer transition-all font-normal tracking-tight text-foreground ${activeCat === c.id ? 'opacity-50' : ''}`}
                     style={{ fontFamily: "'Helvetica Now Display', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif", fontWeight: 500, letterSpacing: '-0.02em' }}
                     onClick={() => { if (activeCat === c.id) { setActiveCat(null); } else { setActiveCat(c.id); } }}
                   >{c.name.toLocaleUpperCase('en-US')}</button>
                   {activeCat === c.id && catProducts.length > 0 && (
                     <div className="w-full px-4 mb-2">
                       {catProducts.map(p => (
                         <div key={p.id} className="flex items-start justify-between py-3 gap-2">
                           <div className="flex-1">
                             <div className="text-sm lowercase text-foreground" style={{ fontFamily: "'Helvetica Now Display', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif", fontWeight: 500, letterSpacing: '-0.01em' }}>
                               {p.name}
                             </div>
                             {p.description && (
                               <div className="text-xs text-foreground mt-1 leading-relaxed" style={{ fontFamily: "'Helvetica Now Display', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif", fontWeight: 500, letterSpacing: '-0.01em' }}>
                                 {p.description.split(',').map(s => s.trim()).join(' | ')}
                               </div>
                             )}
                           </div>
                           <span className="text-sm font-medium text-foreground min-w-[46px] text-right pt-0.5" style={{ fontFamily: "'Helvetica Now Display', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif" }}>₺{p.price}</span>
                         </div>
                       ))}
                     </div>
                   )}
                 </div>
               );
             })}
           </div>
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
        <a href="https://siparis.co" target="_blank" rel="noopener noreferrer" className="text-muted-foreground text-[11px] hover:underline">© 2025 siparis.co</a>
        <button
          onClick={() => navigate('/admin-login')}
          className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer text-foreground/70 hover:text-foreground transition-colors"
          aria-label="Admin"
        >
          <Menu size={16} />
        </button>
      </div>
    </WinWindow>
  );
};

export default SplashScreen;
