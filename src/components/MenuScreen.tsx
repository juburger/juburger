import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import WinWindow from '@/components/WinWindow';
import { useCart } from '@/contexts/CartContext';
import { useToast95Context } from '@/contexts/Toast95Context';
import { supabase } from '@/integrations/supabase/client';
import type { MenuItem } from '@/data/menu';
import CartDrawer from '@/components/CartDrawer';

interface DbCategory { id: string; name: string; sort_order: number; }
interface DbProduct { id: string; category_id: string | null; name: string; description: string; price: number; tag: string; is_available: boolean; sort_order: number; }

const MenuScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tableNum = searchParams.get('table') || '3';
  const userName = decodeURIComponent(searchParams.get('name') || 'Misafir');
  const { cart, addItem, removeItem, cartCount, cartTotal } = useCart();
  const { showToast } = useToast95Context();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeCat, setActiveCat] = useState('all');
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [{ data: cats }, { data: prods }] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('products').select('*').eq('is_available', true).order('sort_order'),
      ]);
      if (cats) setCategories(cats);
      if (prods) setProducts(prods);
      setLoading(false);
    };
    fetch();
  }, []);

  const count = cartCount();
  const total = cartTotal();

  const grouped = categories.map(c => ({
    cat: c.name,
    catId: c.id,
    items: products.filter(p => p.category_id === c.id),
  })).filter(g => g.items.length > 0);

  const toMenuItem = (p: DbProduct): MenuItem => ({
    id: Number(p.id.replace(/\D/g, '').slice(0, 8)) || Math.random() * 100000,
    name: p.name,
    desc: p.description,
    price: p.price,
    tag: p.tag,
  });

  return (
    <>
      <WinWindow
        icon="🍔"
        title={`Menü — Masa ${tableNum}`}
        menuItems={[
          { label: '← Ana Sayfa', onClick: () => navigate('/') },
          { label: `Sepet (${count})`, onClick: () => setDrawerOpen(true) },
        ]}
        controls={[{ label: '🛒', onClick: () => setDrawerOpen(true) }]}
        bodyClass="pb-14"
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Merhaba,</div>
            <h1 className="text-base font-bold">{userName}</h1>
          </div>
          <div className="text-right">
            <div className="text-muted-foreground text-xs">Masa</div>
            <strong className="text-lg">#{tableNum}</strong>
          </div>
        </div>
        <div className="h-px bg-border my-3" />

        {loading ? (
          <p className="text-muted-foreground text-center py-4 text-sm">Menü yükleniyor...</p>
        ) : (
          <>
            {/* Category bar */}
            <div className="flex gap-1.5 mb-3 flex-wrap">
              <button className={`text-xs px-3 py-1.5 cursor-pointer rounded-full transition-all ${activeCat === 'all' ? 'neu-btn-primary' : 'neu-btn'}`}
                onClick={() => setActiveCat('all')}>Tümü</button>
              {categories.map(c => (
                <button key={c.id}
                  className={`text-xs px-3 py-1.5 cursor-pointer rounded-full transition-all ${activeCat === c.id ? 'neu-btn-primary' : 'neu-btn'}`}
                  onClick={() => setActiveCat(c.id)}>{c.name}</button>
              ))}
            </div>

            {/* Menu items */}
            {grouped.filter(g => activeCat === 'all' || g.catId === activeCat).map(group => (
              <div key={group.catId}>
                <div className="text-xs font-bold mt-4 mb-2 pb-1 uppercase tracking-widest text-muted-foreground border-b border-border/50">
                  {group.cat}
                </div>
                {group.items.map(p => {
                  const item = toMenuItem(p);
                  const ci = cart.find(c => c.id === item.id);
                  const qty = ci ? ci.qty : 0;
                  return (
                    <div key={p.id} className="flex items-start justify-between py-2.5 border-b border-border/30 gap-2">
                      <div className="flex-1">
                        <div className="text-sm font-semibold">
                          {p.name}
                          {p.tag === 'n' && <span className="text-[9px] px-1.5 py-0.5 ml-1.5 rounded-full bg-primary/10 text-primary font-medium">YENİ</span>}
                          {p.tag === 's' && <span className="text-[9px] px-1.5 py-0.5 ml-1.5 rounded-full bg-destructive/10 text-destructive font-medium">Acılı</span>}
                          {p.tag === 'p' && <span className="text-[9px] px-1.5 py-0.5 ml-1.5 rounded-full bg-accent text-accent-foreground font-medium">POPÜLER</span>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{p.description}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
                        <span className="text-sm font-bold min-w-[46px] text-right">₺{p.price}</span>
                        {qty === 0 ? (
                          <button className="neu-btn-primary w-8 h-8 text-sm cursor-pointer flex items-center justify-center font-bold flex-shrink-0 rounded-full"
                            style={{ boxShadow: '3px 3px 6px hsl(var(--neu-dark)), -3px -3px 6px hsl(var(--neu-light))' }}
                            onClick={() => { addItem(item); showToast(item.name + ' eklendi'); }}>+</button>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button className="neu-btn w-7 h-7 text-xs p-0 flex items-center justify-center rounded-full"
                              onClick={() => removeItem(item.id)}>−</button>
                            <span className="text-sm min-w-[18px] text-center font-bold">{qty}</span>
                            <button className="neu-btn w-7 h-7 text-xs p-0 flex items-center justify-center rounded-full"
                              onClick={() => { addItem(item); showToast(item.name + ' eklendi'); }}>+</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </>
        )}
      </WinWindow>

      {/* Sticky cart bar */}
      <div className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-primary text-primary-foreground px-4 py-2.5 text-sm cursor-pointer z-[99] flex justify-between items-center rounded-t-2xl transition-transform ${count > 0 ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ boxShadow: '0 -4px 12px hsl(var(--neu-dark))' }}
        onClick={() => setDrawerOpen(true)}>
        <div>
          <span className="bg-primary-foreground text-primary px-2 py-0.5 rounded-full font-bold mr-2 text-xs">{count}</span>
          ürün sepette
        </div>
        <div><strong>₺{total}</strong> → Sepeti Gör</div>
      </div>

      <CartDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} tableNum={tableNum} userName={userName} />
    </>
  );
};

export default MenuScreen;
