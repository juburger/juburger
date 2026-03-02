import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Menu } from 'lucide-react';
import WinWindow from '@/components/WinWindow';
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
  const { tenant, tenantId } = useTenant();
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [activeCat, setActiveCat] = useState('all');
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
        { label: <Menu size={14} />, onClick: () => navigate('/admin-login') },
      ]}
    >
      <div className="flex flex-col items-center justify-center py-4 gap-3">
        <button className="neu-btn text-sm font-medium" onClick={() => navigate(`/register?table=${tableNum}`)}>
          🍽️ Sipariş Ver
        </button>
        <button className="neu-btn text-[11px]" onClick={() => navigate(`/member-signup?table=${tableNum}`)}>
          ⭐ Üye Ol
        </button>
      </div>

      <div className="h-px bg-border my-3" />

      {/* Read-only menu */}
      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Menü</div>

      {loading ? (
        <p className="text-muted-foreground text-center py-4 text-sm">Yükleniyor...</p>
      ) : (
        <>
          <div className="flex gap-1.5 mb-3 flex-wrap">
            <button className={`text-xs px-3 py-1.5 cursor-pointer rounded-full transition-all ${activeCat === 'all' ? 'neu-sunken' : 'neu-flat'}`}
              onClick={() => setActiveCat('all')}>Tümü</button>
            {categories.map(c => (
              <button key={c.id}
                className={`text-xs px-3 py-1.5 cursor-pointer rounded-full transition-all ${activeCat === c.id ? 'neu-sunken' : 'neu-flat'}`}
                onClick={() => setActiveCat(c.id)}>{c.name}</button>
            ))}
          </div>

          {grouped.filter(g => activeCat === 'all' || g.catId === activeCat).map(group => (
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

      <p className="text-muted-foreground text-[11px] mt-6 text-center">© 2025 siparis.co</p>
    </WinWindow>
  );
};

export default SplashScreen;
