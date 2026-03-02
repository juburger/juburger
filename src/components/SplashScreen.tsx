import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Menu } from 'lucide-react';
import WinWindow from '@/components/WinWindow';
import { useToast95Context } from '@/contexts/Toast95Context';
import { useTenant } from '@/contexts/TenantContext';

const SplashScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tableNum = searchParams.get('table') || '3';
  const { showToast } = useToast95Context();
  const { tenant } = useTenant();

  const icon = tenant?.logo_url
    ? <img src={tenant.logo_url} alt="" className="w-5 h-5 rounded-full object-cover" />
    : "🍔";

  return (
    <WinWindow
      icon={icon}
      title={`Masa ${tableNum}`}
      controls={[
        { label: <Menu size={14} />, onClick: () => navigate('/admin-login') },
      ]}
    >
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <button className="neu-btn text-sm font-medium" onClick={() => navigate(`/register?table=${tableNum}`)}>
          Sipariş Ver
        </button>
        <button className="neu-btn text-[11px]" onClick={() => navigate(`/member-signup?table=${tableNum}`)}>
          ⭐ Üye Ol
        </button>
      </div>
      <p className="text-muted-foreground text-[11px] mt-4">© 2025 siparis.co</p>
    </WinWindow>
  );
};

export default SplashScreen;
