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

  // Group products by category
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
        bodyClass="pb-12"
      >
        <div className="flex justify-between items-start mb-1.5">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Merhaba,</div>
            <h1 className="text-[15px] font-bold">{userName}</h1>
          </div>
          <div className="text-right">
            <div className="text-muted-foreground text-xs">Masa</div>
            <strong className="text-lg">#{tableNum}</strong>
          </div>
        </div>
        <hr className="border-t border-foreground my-2.5" />

        {loading ? (
          <p className="text-muted-foreground text-center py-3.5 text-xs">Menü yükleniyor...</p>
        ) : (
          <>
            {/* Category bar */}
            <div className="flex gap-1 mb-2.5 flex-wrap">
              <button className={`font-mono text-[11px] px-2.5 py-0.5 cursor-pointer border-2 ${activeCat === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-card-foreground win-raised'}`}
                onClick={() => setActiveCat('all')}>Tümü</button>
              {categories.map(c => (
                <button key={c.id}
                  className={`font-mono text-[11px] px-2.5 py-0.5 cursor-pointer border-2 ${activeCat === c.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-card-foreground win-raised'}`}
                  onClick={() => setActiveCat(c.id)}>{c.name}</button>
              ))}
            </div>

            {/* Menu items */}
            {grouped.filter(g => activeCat === 'all' || g.catId === activeCat).map(group => (
              <div key={group.catId}>
                <div className="text-xs font-bold mt-3 mb-1.5 border-b border-foreground pb-0.5 uppercase tracking-widest">
                  {group.cat}
                </div>
                {group.items.map(p => {
                  const item = toMenuItem(p);
                  const ci = cart.find(c => c.id === item.id);
                  const qty = ci ? ci.qty : 0;
                  return (
                    <div key={p.id} className="flex items-start justify-between py-1.5 border-b border-dashed border-muted gap-2">
                      <div className="flex-1">
                        <div className="text-[13px] font-bold">
                          {p.name}
                          {p.tag === 'n' && <span className="text-[9px] px-0.5 ml-1 border border-primary text-primary align-middle tracking-wider">YENİ</span>}
                          {p.tag === 's' && <span className="text-[9px] px-0.5 ml-1 border border-destructive text-destructive align-middle tracking-wider">Acılı</span>}
                          {p.tag === 'p' && <span className="text-[9px] px-0.5 ml-1 border border-accent text-accent-foreground align-middle tracking-wider">POPÜLER</span>}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-px leading-snug">{p.description}</div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
                        <span className="text-[13px] font-bold min-w-[46px] text-right">₺{p.price}</span>
                        {qty === 0 ? (
                          <button className="win-btn-primary w-[22px] h-[22px] text-sm cursor-pointer flex items-center justify-center font-mono font-bold flex-shrink-0 border-2"
                            style={{ borderColor: 'hsl(240 100% 50%) hsl(240 100% 12.5%) hsl(240 100% 12.5%) hsl(240 100% 50%)' }}
                            onClick={() => { addItem(item); showToast(item.name + ' eklendi'); }}>+</button>
                        ) : (
                          <div className="flex items-center gap-0.5">
                            <button className="win-btn w-[18px] h-[18px] text-xs p-0 flex items-center justify-center"
                              onClick={() => removeItem(item.id)}>−</button>
                            <span className="text-[13px] min-w-[16px] text-center font-bold">{qty}</span>
                            <button className="win-btn w-[18px] h-[18px] text-xs p-0 flex items-center justify-center"
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
      <div className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-primary text-primary-foreground px-3 py-1.5 text-[13px] font-mono cursor-pointer border-t-2 border-primary transition-transform z-[99] flex justify-between items-center ${count > 0 ? 'translate-y-0' : 'translate-y-full'}`}
        onClick={() => setDrawerOpen(true)}>
        <div>
          <span className="bg-popover text-primary px-1.5 font-bold mr-1.5 text-xs">{count}</span>
          ürün sepette
        </div>
        <div><strong>₺{total}</strong> → Sepeti Gör</div>
      </div>

      <CartDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} tableNum={tableNum} userName={userName} />
    </>
  );
};

export default MenuScreen;
