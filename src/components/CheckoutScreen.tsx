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
  const [memberData, setMemberData] = useState<{ id: string; name: string; total_points: number; used_points: number } | null>(null);
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [loyaltySettings, setLoyaltySettings] = useState({ min_redeem_points: 50, point_value: 0.1 });

  const isMember = !!memberId;
  const total = cartTotal();
  const svc = Math.round(total * 0.05);
  const grandBeforePoints = total + svc;

  const availablePoints = memberData ? memberData.total_points - memberData.used_points : 0;
  const maxPointsForOrder = Math.min(availablePoints, Math.floor(grandBeforePoints / loyaltySettings.point_value));
  const pointDiscount = usePoints ? Math.round(pointsToUse * loyaltySettings.point_value) : 0;
  const grand = grandBeforePoints - pointDiscount;

  // Points earned: 1/10 of actual spending (after point discount)
  const earnedPoints = isMember ? Math.floor(grand / 10) : 0;

  useEffect(() => {
    if (memberId) {
      Promise.all([
        supabase.from('members').select('id, name, total_points, used_points').eq('id', memberId).maybeSingle(),
        supabase.from('loyalty_settings').select('*').eq('id', 'default').maybeSingle(),
      ]).then(([{ data: m }, { data: ls }]) => {
        if (m) setMemberData(m as any);
        if (ls) setLoyaltySettings(ls as any);
      });
    }
  }, [memberId]);

  // Update pointsToUse when toggling or when maxPointsForOrder changes
  useEffect(() => {
    if (usePoints) {
      setPointsToUse(maxPointsForOrder);
    } else {
      setPointsToUse(0);
    }
  }, [usePoints, maxPointsForOrder]);

  const canUsePoints = availablePoints >= loyaltySettings.min_redeem_points;

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
        note: `${note}${pointsToUse > 0 ? ` [${pointsToUse} puan kullanıldı, ₺${pointDiscount} indirim]` : ''}`,
        member_id: memberId || null,
      }).select().single();

      if (error) throw error;

      // Update member stats & handle points
      if (memberId) {
        const { data: currentMember, error: memberFetchError } = await supabase
          .from('members')
          .select('total_points, used_points, total_spent, visit_count')
          .eq('id', memberId)
          .single();

        if (memberFetchError) throw memberFetchError;

        if (currentMember) {
          const cm = currentMember as any;

          // Record earned points
          if (earnedPoints > 0) {
            const { error: pointsInsertError } = await supabase.from('point_transactions').insert({
              member_id: memberId,
              type: 'earn',
              points: earnedPoints,
              description: `Sipariş #${data.id.substring(0, 6).toUpperCase()} - ₺${grand} harcama`,
              order_id: data.id,
            } as any);
            if (pointsInsertError) throw pointsInsertError;
          }

          // Record spent points
          if (pointsToUse > 0) {
            const { error: pointsSpendError } = await supabase.from('point_transactions').insert({
              member_id: memberId,
              type: 'spend',
              points: -pointsToUse,
              description: `Sipariş #${data.id.substring(0, 6).toUpperCase()} - ${pointsToUse} puan kullanıldı (₺${pointDiscount} indirim)`,
              order_id: data.id,
            } as any);
            if (pointsSpendError) throw pointsSpendError;
          }

          const { error: memberUpdateError } = await supabase.from('members').update({
            total_points: cm.total_points + earnedPoints,
            used_points: cm.used_points + pointsToUse,
            total_spent: Number(cm.total_spent) + grand,
            visit_count: cm.visit_count + 1,
            last_visit_at: new Date().toISOString(),
          }).eq('id', memberId);

          if (memberUpdateError) throw memberUpdateError;
        }
      }

      const orderId = data.id.substring(0, 6).toUpperCase();
      clearCart();
      navigate(`/success?order=${orderId}&pay=${selPay}${earnedPoints > 0 ? `&points=${earnedPoints}` : ''}${pointsToUse > 0 ? `&usedPoints=${pointsToUse}&discount=${pointDiscount}` : ''}${memberId ? `&member=${memberId}` : ''}`);
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

      {/* Member info & points */}
      {memberData && (
        <>
          <div className="h-px bg-border my-3" />
          <div className="p-2.5 border border-primary/30 rounded-lg bg-primary/5 mb-2">
            <div className="text-[12px] font-bold text-primary">⭐ {memberData.name}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Kullanılabilir puan: <span className="font-bold text-primary">{availablePoints}</span>
            </div>

            {/* Points redemption */}
            {canUsePoints ? (
              <div className="mt-2 p-2 rounded-lg bg-background/60 border border-border/50">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={usePoints}
                    onChange={e => setUsePoints(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-[11px] font-semibold">Puanla Öde</span>
                </label>
                {usePoints && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={loyaltySettings.min_redeem_points}
                        max={maxPointsForOrder}
                        value={pointsToUse}
                        onChange={e => setPointsToUse(Number(e.target.value))}
                        className="flex-1 accent-primary"
                      />
                      <span className="text-[11px] font-bold text-primary min-w-[50px] text-right">{pointsToUse} puan</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      İndirim: <span className="font-bold text-green-600">-₺{pointDiscount}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : availablePoints > 0 ? (
              <div className="text-[9px] text-muted-foreground mt-1">
                Puan kullanmak için en az {loyaltySettings.min_redeem_points} puan gerekir
              </div>
            ) : null}

            {earnedPoints > 0 && (
              <div className="text-[10px] text-muted-foreground mt-1.5">
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
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-muted-foreground">Ara Toplam</span>
        <span className="text-sm">₺{grandBeforePoints}</span>
      </div>
      {pointDiscount > 0 && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-green-600">⭐ Puan İndirimi</span>
          <span className="text-sm font-bold text-green-600">-₺{pointDiscount}</span>
        </div>
      )}
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