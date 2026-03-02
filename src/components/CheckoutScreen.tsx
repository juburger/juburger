import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, X } from 'lucide-react';
import WinWindow from '@/components/WinWindow';
import { useCart } from '@/contexts/CartContext';
import { useToast95Context } from '@/contexts/Toast95Context';
import { supabase } from '@/integrations/supabase/client';

const CheckoutScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tableNum = searchParams.get('table') || '3';
  const userName = decodeURIComponent(searchParams.get('name') || 'Misafir');
  const memberId = searchParams.get('member') || '';
  const { cart, cartTotal, clearCart } = useCart();
  const { showToast } = useToast95Context();
  const [selPay, setSelPay] = useState('card');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [memberData, setMemberData] = useState<{ id: string; name: string } | null>(null);

  const isMember = !!memberId;
  const total = cartTotal();
  const svc = Math.round(total * 0.05);
  const grand = total + svc;

  // Points earned: 1/10 of spending
  const earnedPoints = isMember ? Math.floor(grand / 10) : 0;

  useEffect(() => {
    if (memberId) {
      supabase.from('members').select('id, name').eq('id', memberId).maybeSingle()
        .then(({ data }) => {
          if (data) setMemberData(data as any);
        });
    }
  }, [memberId]);

  const allPayOpts = [
    { id: 'card', icon: '💳', title: 'Kredi / Banka Kartı', desc: 'Güvenli online ödeme', requiresMember: false },
    { id: 'pos', icon: '📱', title: 'Masada Kart (POS)', desc: 'Garson POS cihazını getirir', requiresMember: true },
    { id: 'cash', icon: '💵', title: 'Masada Nakit', desc: 'Garson gelinceye kadar bekleyin', requiresMember: true },
  ];

  const payOpts = allPayOpts.filter(o => !o.requiresMember || isMember);

  const backUrl = `/menu?table=${tableNum}&name=${encodeURIComponent(userName)}${memberId ? `&member=${memberId}` : ''}`;

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
        member_id: memberId || null,
      }).select().single();

      if (error) throw error;

      // Update member stats & earn points
      if (memberId) {
        const { data: currentMember } = await supabase.from('members').select('total_points, used_points, total_spent, visit_count').eq('id', memberId).single();
        if (currentMember) {
          const cm = currentMember as any;

          if (earnedPoints > 0) {
            await supabase.from('point_transactions').insert({
              member_id: memberId,
              type: 'earn',
              points: earnedPoints,
              description: `Sipariş #${data.id.substring(0, 6).toUpperCase()} - ₺${grand} harcama`,
              order_id: data.id,
            } as any);
          }

          await supabase.from('members').update({
            total_points: cm.total_points + earnedPoints,
            total_spent: Number(cm.total_spent) + grand,
            visit_count: cm.visit_count + 1,
            last_visit_at: new Date().toISOString(),
          }).eq('id', memberId);
        }
      }

      const orderId = data.id.substring(0, 6).toUpperCase();
      clearCart();
      navigate(`/success?order=${orderId}&pay=${selPay}${earnedPoints > 0 ? `&points=${earnedPoints}` : ''}${memberId ? `&member=${memberId}` : ''}`);
    } catch (err: any) {
      showToast('Sipariş hatası: ' + err.message, false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <WinWindow
      icon="💳"
      title="Ödeme"
      controls={[
        { label: <ChevronLeft size={14} />, onClick: () => navigate(backUrl) },
        { label: <X size={14} />, onClick: () => navigate(backUrl) },
      ]}
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

      {/* Member info */}
      {memberData && (
        <>
          <div className="h-px bg-border my-3" />
          <div className="p-2.5 border border-primary/30 rounded-lg bg-primary/5 mb-2">
            <div className="text-[12px] font-bold text-primary">⭐ {memberData.name}</div>
            {earnedPoints > 0 && (
              <div className="text-[10px] text-muted-foreground mt-1">
                Bu siparişten ⭐ <span className="font-bold text-primary">{earnedPoints} puan</span> kazanacaksınız
              </div>
            )}
          </div>
        </>
      )}

      {!isMember && (
        <>
          <div className="h-px bg-border my-3" />
          <div className="p-2 rounded-lg bg-muted/50 text-[10px] text-muted-foreground mb-2">
            ℹ️ Misafir olarak sadece online kart ile ödeme yapabilirsiniz. Tüm yöntemler için üye olun.
          </div>
        </>
      )}

      <div className="h-px bg-border my-3" />
      <h2 className="text-sm font-bold mb-1">Ödeme Yöntemi</h2>
      <p className="text-muted-foreground text-xs mb-2">Bir seçenek seçin:</p>
      
      <div className="flex flex-col gap-2">
        {payOpts.map(o => (
          <div key={o.id}
            className={`flex items-start gap-3 px-3 py-2.5 cursor-pointer rounded-xl transition-all ${selPay === o.id ? 'neu-sunken' : 'neu-flat'}`}
            onClick={() => setSelPay(o.id)}>
            <input type="radio" name="pay" checked={selPay === o.id} onChange={() => setSelPay(o.id)} className="mt-0.5" />
            <div>
              <div className="text-sm">{o.icon} {o.title}</div>
              <div className="text-xs text-muted-foreground">{o.desc}</div>
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
      <button className="neu-btn w-full text-center text-sm py-3" onClick={placeOrder} disabled={loading}>
        {loading ? 'Sipariş veriliyor...' : 'SİPARİŞ VER →'}
      </button>
    </WinWindow>
  );
};

export default CheckoutScreen;
