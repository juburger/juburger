import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import WinWindow from '@/components/WinWindow';
import { useToast95Context } from '@/contexts/Toast95Context';

const SplashScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tableNum = searchParams.get('table') || '3';
  const { showToast } = useToast95Context();

  return (
    <WinWindow
      icon="🍔"
      title="JU — Sipariş Sistemi"
      menuItems={[
        { label: 'Dosya', onClick: () => {} },
        { label: 'Düzen', onClick: () => {} },
        { label: 'Yardım', onClick: () => {} },
      ]}
      statusItems={['Hazır']}
    >
      <p className="text-muted-foreground text-xs">Masa Sipariş Sistemi v1.0</p>
      <hr className="border-t border-foreground my-2.5" />
      <p className="text-[13px] mb-1">QR kodu okutarak masanıza özel<br/>sipariş verebilirsiniz.</p>
      <hr className="border-t border-dashed border-muted-foreground/40 my-2.5" />
      <p className="text-muted-foreground text-xs">Masa: <strong className="text-foreground">#{tableNum}</strong></p>
      <hr className="border-t border-dashed border-muted-foreground/40 my-2.5" />
      <div className="flex gap-1.5 mt-2 flex-wrap">
        <button className="win-btn win-btn-primary" onClick={() => navigate(`/register?table=${tableNum}`)}>
          Sipariş Ver
        </button>
        <button className="win-btn" onClick={() => navigate('/admin-login')}>Yönetici</button>
      </div>
      <hr className="border-t border-dashed border-muted-foreground/40 my-2.5" />
      <p className="text-muted-foreground text-[11px]">
        Garson çağırmak için:<br/>
        <button className="bg-transparent border-none font-mono text-xs text-[#0000cc] cursor-pointer underline p-0"
          onClick={() => showToast('Garson çağrıldı 🔔')}>
          → Garson Çağır
        </button>
      </p>
      <hr className="border-t border-foreground my-2.5" />
      <p className="text-muted-foreground text-[11px]">© 2025 BurgerQR</p>
    </WinWindow>
  );
};

export default SplashScreen;
