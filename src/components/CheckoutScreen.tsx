import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import WinWindow from '@/components/WinWindow';
import { useCart } from '@/contexts/CartContext';
import { useToast95Context } from '@/contexts/Toast95Context';
import { supabase } from '@/integrations/supabase/client';

const CheckoutScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tableNum = searchParams.get('table') || '3';
  const userName = decodeURIComponent(searchParams.get('name') || 'Misafir');
  const { cart, cartTotal, clearCart } = useCart();
  const { showToast } = useToast95Context();
  const [selPay, setSelPay] = useState('card');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const total = cartTotal();
  const svc = Math.round(total * 0.05);
  const grand = total + svc;

  const payOpts = [
    { id: 'card', icon: '💳', title: 'Kredi / Banka Kartı', desc: 'Güvenli online ödeme' },
    { id: 'pos', icon: '📱', title: 'Masada Kart (POS)', desc: 'Garson POS cihazını getirir' },
    { id: 'cash', icon: '💵', title: 'Masada Nakit', desc: 'Garson gelinceye kadar bekleyin' },
  ];

  const placeOrder = async () => {
    if (!cart.length) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { showToast('Oturum bulunamadı', false); return; }

      const { data, error } = await supabase.from('orders').insert({
        user_id: user.id,
        user_name: userName,
        table_num: parseInt(tableNum),
        items: cart.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })),
        total: grand,
        payment_type: selPay,
        payment_status: selPay === 'card' ? 'pending' : 'cash',
        status: 'waiting',
        note,
      }).select().single();

      if (error) throw error;

      const orderId = data.id.substring(0, 6).toUpperCase();
      clearCart();
      navigate(`/success?order=${orderId}&pay=${selPay}`);
    } catch (err: any) {
      showToast('Sipariş hatası: ' + err.message, false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <WinWindow
      icon="💳"
      title="Ödeme — BurgerQR"
      menuItems={[{ label: '← Menüye Dön', onClick: () => navigate(`/menu?table=${tableNum}&name=${encodeURIComponent(userName)}`) }]}
      controls={[{ label: '×', onClick: () => navigate(`/menu?table=${tableNum}&name=${encodeURIComponent(userName)}`) }]}
      statusItems={['Ödeme bekleniyor']}
    >
      <h1 className="text-[15px] font-bold mb-1">Sipariş Özeti</h1>
      <hr className="border-t border-foreground my-2.5" />
      
      {cart.map(item => (
        <div key={item.id} className="flex items-center justify-between py-1 border-b border-dashed border-muted text-[13px]">
          <span>{item.name} × {item.qty}</span>
          <span>₺{item.price * item.qty}</span>
        </div>
      ))}
      <div className="flex items-center justify-between py-1 text-[11px] text-muted-foreground">
        <span>Servis (%5)</span><span>₺{svc}</span>
      </div>

      <hr className="border-t border-foreground my-2.5" />
      <h2 className="text-[13px] font-bold mb-1">Ödeme Yöntemi</h2>
      <p className="text-muted-foreground text-xs mb-1.5">Bir seçenek seçin:</p>
      
      <div className="flex flex-col gap-1.5">
        {payOpts.map(o => (
          <div key={o.id}
            className={`flex items-start gap-2 px-2 py-1.5 cursor-pointer border ${selPay === o.id ? 'bg-primary text-primary-foreground border-primary' : 'border-transparent hover:bg-muted'}`}
            onClick={() => setSelPay(o.id)}>
            <input type="radio" name="pay" checked={selPay === o.id} onChange={() => setSelPay(o.id)} className="mt-0.5" />
            <div>
              <div className="text-[13px]">{o.icon} {o.title}</div>
              <div className={`text-[11px] ${selPay === o.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{o.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <hr className="border-t border-dashed border-muted-foreground/40 my-2.5" />
      <h2 className="text-[13px] font-bold mb-1">Sipariş Notu</h2>
      <textarea className="win-input resize-y min-h-[56px] mt-1"
        placeholder="Özel isteğiniz? (az pişmiş, sos istemiyorum vb.)"
        value={note} onChange={e => setNote(e.target.value)} />

      <hr className="border-t border-foreground my-2.5" />
      <div className="flex justify-between items-center mb-2.5">
        <strong className="text-sm">TOPLAM</strong>
        <strong className="text-lg">₺{grand}</strong>
      </div>
      <button className="win-btn win-btn-primary w-full text-center text-sm py-2" onClick={placeOrder} disabled={loading}>
        {loading ? 'Sipariş veriliyor...' : 'SİPARİŞ VER →'}
      </button>
    </WinWindow>
  );
};

export default CheckoutScreen;
