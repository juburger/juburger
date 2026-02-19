import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  tableNum: string;
  userName: string;
}

const CartDrawer = ({ open, onClose, tableNum, userName }: CartDrawerProps) => {
  const navigate = useNavigate();
  const { cart, addItem, removeItem, clearCart, cartTotal } = useCart();
  const total = cartTotal();
  const svc = Math.round(total * 0.05);

  const goCheckout = () => {
    if (!cart.length) return;
    onClose();
    navigate(`/checkout?table=${tableNum}&name=${encodeURIComponent(userName)}`);
  };

  return (
    <>
      {/* Overlay */}
      <div className={`fixed inset-0 bg-foreground/45 z-[100] ${open ? 'block' : 'hidden'}`} onClick={onClose} />
      
      {/* Drawer */}
      <div className={`fixed bottom-0 left-1/2 w-full max-w-[480px] bg-card border-t-2 border-l-2 border-r-2 z-[101] transition-transform duration-300 max-h-[88vh] overflow-y-auto ${open ? '-translate-x-1/2 translate-y-0' : '-translate-x-1/2 translate-y-full'}`}
        style={{ borderColor: 'hsl(0 0% 100%) hsl(0 0% 50%) hsl(0 0% 50%) hsl(0 0% 100%)', boxShadow: '-2px -2px 0 hsl(0 0% 0%)' }}>
        <div className="bg-primary text-primary-foreground px-2 py-0.5 text-xs font-bold flex justify-between items-center">
          <span>🛒 Sepetim</span>
          <button className="win-btn w-4 h-3.5 text-[9px] p-0 flex items-center justify-center bg-card text-card-foreground" onClick={onClose}>×</button>
        </div>
        <div className="bg-popover m-1 p-3 win-sunken">
          {!cart.length ? (
            <p className="text-muted-foreground text-center py-2.5 text-xs">Sepetiniz boş.</p>
          ) : (
            <>
              {cart.map(item => (
                <div key={item.id} className="flex items-center justify-between py-1 border-b border-dashed border-muted text-[13px] gap-2">
                  <span className="flex-1">{item.name} × {item.qty}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-0.5">
                      <button className="win-btn w-[18px] h-[18px] text-xs p-0 flex items-center justify-center"
                        onClick={() => removeItem(item.id)}>−</button>
                      <button className="win-btn w-[18px] h-[18px] text-xs p-0 flex items-center justify-center"
                        onClick={() => addItem(item)}>+</button>
                    </div>
                    <span className="text-xs text-muted-foreground min-w-[50px] text-right">₺{item.price * item.qty}</span>
                  </div>
                </div>
              ))}
              <hr className="border-t border-dashed border-muted-foreground/40 my-2.5" />
              <div className="flex items-center justify-between py-1 text-[13px]">
                <span>Ara toplam</span><span>₺{total}</span>
              </div>
              <div className="flex items-center justify-between py-1 text-[13px]">
                <span>Servis (%5)</span><span>₺{svc}</span>
              </div>
              <div className="flex items-center justify-between py-1 text-[13px] font-bold border-t border-foreground pt-1 mt-0.5">
                <span>TOPLAM</span><span>₺{total + svc}</span>
              </div>
            </>
          )}
          <div className="flex gap-1.5 mt-2">
            <button className="win-btn win-btn-primary" onClick={goCheckout}>Ödemeye Geç →</button>
            <button className="win-btn win-btn-danger" onClick={() => { clearCart(); onClose(); }}>Temizle</button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CartDrawer;
