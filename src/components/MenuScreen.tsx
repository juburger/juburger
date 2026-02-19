import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import WinWindow from '@/components/WinWindow';
import { useCart } from '@/contexts/CartContext';
import { useToast95Context } from '@/contexts/Toast95Context';
import { MENU, MenuItem } from '@/data/menu';
import CartDrawer from '@/components/CartDrawer';

const MenuScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tableNum = searchParams.get('table') || '3';
  const userName = decodeURIComponent(searchParams.get('name') || 'Misafir');
  const { cart, addItem, removeItem, cartCount, cartTotal } = useCart();
  const { showToast } = useToast95Context();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeCat, setActiveCat] = useState('all');

  const count = cartCount();
  const total = cartTotal();

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

        {/* Category bar */}
        <div className="flex gap-1 mb-2.5 flex-wrap">
          <button className={`font-mono text-[11px] px-2.5 py-0.5 cursor-pointer border-2 ${activeCat === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-card-foreground win-raised'}`}
            onClick={() => setActiveCat('all')}>Tümü</button>
          {MENU.map(c => (
            <button key={c.cat}
              className={`font-mono text-[11px] px-2.5 py-0.5 cursor-pointer border-2 ${activeCat === c.cat ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-card-foreground win-raised'}`}
              onClick={() => setActiveCat(c.cat)}>{c.cat}</button>
          ))}
        </div>

        {/* Menu items */}
        {MENU.filter(c => activeCat === 'all' || c.cat === activeCat).map(cat => (
          <div key={cat.cat}>
            <div className="text-xs font-bold mt-3 mb-1.5 border-b border-foreground pb-0.5 uppercase tracking-widest">
              {cat.cat}
            </div>
            {cat.items.map(item => {
              const ci = cart.find(c => c.id === item.id);
              const qty = ci ? ci.qty : 0;
              return (
                <div key={item.id} className="flex items-start justify-between py-1.5 border-b border-dashed border-muted gap-2">
                  <div className="flex-1">
                    <div className="text-[13px] font-bold">
                      {item.name}
                      {item.tag === 'n' && <span className="text-[9px] px-0.5 ml-1 border border-primary text-primary align-middle tracking-wider">YENİ</span>}
                      {item.tag === 's' && <span className="text-[9px] px-0.5 ml-1 border border-destructive text-destructive align-middle tracking-wider">Acılı</span>}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-px leading-snug">{item.desc}</div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
                    <span className="text-[13px] font-bold min-w-[46px] text-right">₺{item.price}</span>
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
