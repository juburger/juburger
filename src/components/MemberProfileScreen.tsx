import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import WinWindow from '@/components/WinWindow';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface MemberInfo {
  id: string;
  name: string;
  phone: string;
  total_points: number;
  used_points: number;
  total_spent: number;
  visit_count: number;
  last_visit_at: string | null;
  created_at: string;
}

interface OrderRecord {
  id: string;
  table_num: number;
  total: number;
  status: string;
  payment_type: string;
  created_at: string;
  items: any;
}

const MemberProfileScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const memberId = searchParams.get('member') || '';
  const tableNum = searchParams.get('table') || '3';
  const [member, setMember] = useState<MemberInfo | null>(null);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!memberId) {
      setLoading(false);
      setMember(null);
      setOrders([]);
      return;
    }
    const fetchData = async () => {
      const [{ data: m }, { data: o }] = await Promise.all([
        supabase.from('members').select('*').eq('id', memberId).single(),
        supabase.from('orders').select('*').eq('member_id', memberId).order('created_at', { ascending: false }).limit(50),
      ]);
      if (m) setMember(m as any);
      if (o) setOrders(o as any);
      setLoading(false);
    };
    fetchData();
  }, [memberId]);

  const availablePoints = member ? member.total_points - member.used_points : 0;

  const payLabel: Record<string, string> = { card: '💳 Kart', pos: '📱 POS', cash: '💵 Nakit' };
  const statusLabel: Record<string, string> = { waiting: '⏳ Bekliyor', preparing: '🔥 Hazırlanıyor', ready: '✅ Hazır', paid: '💰 Ödendi' };

  if (loading) {
    return (
      <WinWindow icon="⭐" title="Profilim">
        <p className="text-center text-muted-foreground py-8 text-sm">Yükleniyor...</p>
      </WinWindow>
    );
  }

  if (!member) {
    return (
      <WinWindow icon="⭐" title="Profilim" controls={[{ label: <ChevronLeft size={14} />, onClick: () => navigate(-1 as any) }]}>
        <p className="text-center text-muted-foreground py-8 text-sm">Üye bulunamadı.</p>
      </WinWindow>
    );
  }

  return (
    <WinWindow
      icon="⭐"
      title="Profilim"
      controls={[{ label: <ChevronLeft size={14} />, onClick: () => navigate(`/menu?table=${tableNum}&name=${encodeURIComponent(member.name)}&member=${memberId}`) }]}
    >
      {/* Member card */}
      <div className="p-3 border border-primary/30 rounded-lg bg-primary/5 mb-3">
        <div className="text-base font-bold text-primary">⭐ {member.name}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">{member.phone}</div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="text-center">
            <div className="text-lg font-bold text-primary">{availablePoints}</div>
            <div className="text-[9px] text-muted-foreground">Puan</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">₺{Number(member.total_spent).toLocaleString('tr-TR')}</div>
            <div className="text-[9px] text-muted-foreground">Toplam Harcama</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">{member.visit_count}</div>
            <div className="text-[9px] text-muted-foreground">Ziyaret</div>
          </div>
        </div>
        {member.last_visit_at && (
          <div className="text-[9px] text-muted-foreground mt-2 text-center">
            Son ziyaret: {format(new Date(member.last_visit_at), 'dd.MM.yyyy HH:mm')}
          </div>
        )}
        <div className="text-[9px] text-muted-foreground text-center">
          Üyelik: {format(new Date(member.created_at), 'dd.MM.yyyy')}
        </div>
      </div>

      {/* Order history */}
      <div className="h-px bg-border my-3" />
      <h2 className="text-sm font-bold mb-2">Sipariş Geçmişi</h2>
      
      {orders.length === 0 ? (
        <p className="text-muted-foreground text-xs text-center py-4">Henüz sipariş yok.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {orders.map(order => {
            const items = Array.isArray(order.items) ? order.items : [];
            return (
              <div key={order.id} className="neu-flat p-2.5 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-[11px] font-bold">#{order.id.substring(0, 6).toUpperCase()}</div>
                    <div className="text-[9px] text-muted-foreground">
                      {format(new Date(order.created_at), 'dd.MM.yyyy HH:mm')} · Masa {order.table_num}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">₺{order.total}</div>
                    <div className="text-[9px] text-muted-foreground">
                      {payLabel[order.payment_type] || order.payment_type}
                    </div>
                  </div>
                </div>
                <div className="mt-1.5 text-[10px] text-muted-foreground">
                  {items.map((it: any, i: number) => (
                    <span key={i}>{it.name}×{it.qty}{i < items.length - 1 ? ', ' : ''}</span>
                  ))}
                </div>
                <div className="text-[9px] mt-1">
                  {statusLabel[order.status] || order.status}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </WinWindow>
  );
};

export default MemberProfileScreen;
