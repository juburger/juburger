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
      controls={[
        { label: '←', onClick: () => {} },
        { label: '☰', onClick: () => navigate('/admin-login') },
      ]}
      statusItems={['Hazır']}
    >
      <div className="flex flex-col items-center justify-center py-8">
        <div className="neu-raised w-28 h-28 flex items-center justify-center mb-6">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
            <path d="M3 11h18a1 1 0 0 1 0 2H3a1 1 0 0 1 0-2z"/>
            <path d="M4 11c0-4 3.5-7 8-7s8 3 8 7"/>
            <path d="M5 13c0 2 1 4 1.5 5h11c.5-1 1.5-3 1.5-5"/>
            <path d="M3 18h18"/>
          </svg>
        </div>
        <p className="text-sm font-medium mb-1">Masa Sipariş Sistemi</p>
      </div>
      <p className="text-sm mb-1 text-center">QR kodu okutarak masanıza özel<br/>sipariş verebilirsiniz.</p>
      <div className="h-px bg-border/40 my-3" />
      <p className="text-muted-foreground text-xs">Masa: <strong className="text-foreground">#{tableNum}</strong></p>
      <div className="h-px bg-border/40 my-3" />
      <div className="flex gap-2 mt-3 flex-wrap">
        <button className="neu-btn neu-btn-primary" onClick={() => navigate(`/register?table=${tableNum}`)}>
          Sipariş Ver
        </button>
      </div>
      <div className="h-px bg-border my-3" />
      <p className="text-muted-foreground text-[11px]">© 2025 BurgerQR</p>
    </WinWindow>
  );
};

export default SplashScreen;
