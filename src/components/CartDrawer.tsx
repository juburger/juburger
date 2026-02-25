import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  tableNum: string;
  userName: string;
  memberId?: string;
}

const CartDrawer = ({ open, onClose, tableNum, userName, memberId }: CartDrawerProps) => {
  const navigate = useNavigate();
  const { cart, addItem, removeItem, clearCart, cartTotal } = useCart();
  const total = cartTotal();
  const svc = Math.round(total * 0.05);

  const goCheckout = () => {
    if (!cart.length) return;
    onClose();
    navigate(`/checkout?table=${tableNum}&name=${encodeURIComponent(userName)}${memberId ? `&member=${memberId}` : ''}`);
  };

  return (
    <>
      {/* Overlay */}
      <div className={`fixed inset-0 bg-foreground/30 backdrop-blur-sm z-[100] ${open ? 'block' : 'hidden'}`} onClick={onClose} />
      
      {/* Drawer */}
      <div className={`fixed bottom-0 left-1/2 w-full max-w-[480px] z-[101] transition-transform duration-300 max-h-[88vh] overflow-y-auto ${open ? '-translate-x-1/2 translate-y-0' : '-translate-x-1/2 translate-y-full'}`}>
        <div className="neu-raised m-2 overflow-hidden">
          <div className="bg-card text-foreground px-4 py-2.5 text-sm font-semibold flex justify-between items-center rounded-t-[var(--radius)]">
            <span>🛒 Sepetim</span>
            <button className="neu-flat w-7 h-7 rounded-full text-xs flex items-center justify-center cursor-pointer" onClick={onClose}>✕</button>
          </div>
          <div className="p-4">
            {!cart.length ? (
              <p className="text-muted-foreground text-center py-4 text-sm">Sepetiniz boş.</p>
            ) : (
              <>
                {cart.map(item => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b border-border/50 text-sm gap-2">
                    <span className="flex-1">{item.name} × {item.qty}</span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <button className="neu-btn w-7 h-7 text-xs p-0 flex items-center justify-center rounded-full"
                          onClick={() => removeItem(item.id)}>−</button>
                        <button className="neu-btn w-7 h-7 text-xs p-0 flex items-center justify-center rounded-full"
                          onClick={() => addItem(item)}>+</button>
                      </div>
                      <span className="text-xs text-muted-foreground min-w-[50px] text-right">₺{item.price * item.qty}</span>
                    </div>
                  </div>
                ))}
                <div className="h-px bg-border/40 my-3" />
                <div className="flex items-center justify-between py-1 text-sm">
                  <span>Ara toplam</span><span>₺{total}</span>
                </div>
                <div className="flex items-center justify-between py-1 text-sm">
                  <span>Servis (%5)</span><span>₺{svc}</span>
                </div>
                <div className="flex items-center justify-between py-1 text-sm font-bold border-t border-border pt-2 mt-1">
                  <span>TOPLAM</span><span>₺{total + svc}</span>
                </div>
              </>
            )}
            <div className="flex gap-2 mt-3">
              <button className="neu-btn" onClick={goCheckout}>Ödemeye Geç →</button>
              <button className="neu-btn" onClick={() => { clearCart(); onClose(); }}>Temizle</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CartDrawer;
