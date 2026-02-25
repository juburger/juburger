import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import WinWindow from '@/components/WinWindow';

const SuccessScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order') || '000000';
  const pay = searchParams.get('pay') || 'cash';

  const payLabels: Record<string, string> = {
    card: '💳 Kart ile ödendi',
    pos: '📱 POS cihazı bekleniyor',
    cash: '💵 Nakit ödeme yapılacak',
  };

  return (
    <WinWindow
      icon="✅"
      title="Sipariş Alındı!"
      statusItems={['İşlem tamamlandı']}
    >
      <div className="text-center">
        <br />
        <p className="text-[32px]">✅</p>
        <br />
        <h1 className="text-base font-bold">SİPARİŞ ALINDI</h1>
        <div className="h-px bg-border/40 my-3" />
        <p className="text-muted-foreground text-xs">
          Siparişiniz mutfağa iletildi.<br />Kısa süre içinde hazırlanacak.
        </p>
        <div className="neu-raised p-5 text-center my-5">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Sipariş Numaranız</div>
          <div className="text-[34px] font-bold tracking-[4px]">#{orderId}</div>
        </div>
        <p className="text-muted-foreground text-xs mb-4">{payLabels[pay]}</p>
        <div className="flex gap-2 justify-center flex-wrap">
          <button className="neu-btn neu-btn-primary" onClick={() => navigate('/')}>← Yeni Sipariş</button>
          <button className="neu-btn" onClick={() => navigate('/')}>Ana Sayfa</button>
        </div>
      </div>
    </WinWindow>
  );
};

export default SuccessScreen;
