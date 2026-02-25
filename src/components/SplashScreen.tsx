import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Menu } from 'lucide-react';
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
      title={`Masa ${tableNum}`}
      controls={[
        { label: <Menu size={14} />, onClick: () => navigate('/admin-login') },
      ]}
      statusItems={['Hazır']}
    >
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <button className="neu-btn text-sm font-medium" onClick={() => navigate(`/register?table=${tableNum}`)}>
          Sipariş Ver
        </button>
        <button className="neu-btn text-[11px]" onClick={() => navigate(`/member-signup?table=${tableNum}`)}>
          ⭐ Üye Ol
        </button>
      </div>
      <div className="h-px bg-border my-3" />
      <p className="text-muted-foreground text-[11px]">© 2025 BurgerQR</p>
    </WinWindow>
  );
};

export default SplashScreen;
