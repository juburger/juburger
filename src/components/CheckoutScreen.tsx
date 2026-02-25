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
      <h1 className="text-base font-bold mb-1">Sipariş Özeti</h1>
      <div className="h-px bg-border my-3" />
      
      {cart.map(item => (
        <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-border/30 text-sm">
          <span>{item.name} × {item.qty}</span>
          <span>₺{item.price * item.qty}</span>
        </div>
      ))}
      <div className="flex items-center justify-between py-1.5 text-xs text-muted-foreground">
        <span>Servis (%5)</span><span>₺{svc}</span>
      </div>

      <div className="h-px bg-border my-3" />
      <h2 className="text-sm font-bold mb-1">Ödeme Yöntemi</h2>
      <p className="text-muted-foreground text-xs mb-2">Bir seçenek seçin:</p>
      
      <div className="flex flex-col gap-2">
        {payOpts.map(o => (
          <div key={o.id}
            className={`flex items-start gap-3 px-3 py-2.5 cursor-pointer rounded-xl transition-all ${selPay === o.id ? 'neu-btn-primary' : 'neu-flat'}`}
            onClick={() => setSelPay(o.id)}>
            <input type="radio" name="pay" checked={selPay === o.id} onChange={() => setSelPay(o.id)} className="mt-0.5" />
            <div>
              <div className="text-sm">{o.icon} {o.title}</div>
              <div className={`text-xs ${selPay === o.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{o.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="h-px bg-border/40 my-3" />
      <h2 className="text-sm font-bold mb-1">Sipariş Notu</h2>
      <textarea className="neu-input resize-y min-h-[60px] mt-1"
        placeholder="Özel isteğiniz? (az pişmiş, sos istemiyorum vb.)"
        value={note} onChange={e => setNote(e.target.value)} />

      <div className="h-px bg-border my-3" />
      <div className="flex justify-between items-center mb-3">
        <strong className="text-sm">TOPLAM</strong>
        <strong className="text-xl">₺{grand}</strong>
      </div>
      <button className="neu-btn neu-btn-primary w-full text-center text-sm py-3" onClick={placeOrder} disabled={loading}>
        {loading ? 'Sipariş veriliyor...' : 'SİPARİŞ VER →'}
      </button>
    </WinWindow>
  );
};

export default CheckoutScreen;
