import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Menu } from 'lucide-react';
import WinWindow from '@/components/WinWindow';
import { useToast95Context } from '@/contexts/Toast95Context';
import { supabase } from '@/integrations/supabase/client';

interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

interface UserOrder {
  id: string;
  table_num: number;
  items: OrderItem[];
  total: number;
  status: string;
  created_at: string;
  user_name: string;
}

const statusLabels: Record<string, string> = {
  waiting: '⏳ Bekliyor',
  preparing: '🔥 Hazırlanıyor',
  ready: '✅ Hazır',
};

const SplashScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tableNum = searchParams.get('table') || '3';
  const { showToast } = useToast95Context();
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) { setLoading(false); return; }

    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', session.session.user.id)
      .eq('table_num', Number(tableNum))
      .in('status', ['waiting', 'preparing', 'ready'])
      .order('created_at', { ascending: false });

    if (data) setOrders(data as unknown as UserOrder[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    const ch = supabase.channel('customer-orders-' + tableNum)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tableNum]);

  const cancelOrder = async (orderId: string) => {
    const { error } = await supabase.from('orders').update({ status: 'paid', payment_status: 'cancelled' }).eq('id', orderId);
    if (error) { showToast('İptal hatası', false); return; }
    showToast('Sipariş iptal edildi ✓');
    fetchOrders();
  };

  const userName = orders.length > 0 ? orders[0].user_name : '';

  return (
    <WinWindow
      icon="🍔"
      title={`Masa ${tableNum}`}
      controls={[
        { label: <Menu size={14} />, onClick: () => navigate('/admin-login') },
      ]}
      statusItems={['Hazır']}
    >
      <div className="flex flex-col items-center justify-center py-8">
        <button className="neu-btn text-sm font-medium" onClick={() => navigate(`/register?table=${tableNum}`)}>
          Sipariş Ver
        </button>
      </div>

      {/* Active orders for this user */}
      {!loading && orders.length > 0 && (
        <>
          <div className="h-px bg-border my-3" />
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
            Siparişleriniz — {userName}
          </div>

          {orders.map(order => (
            <div key={order.id} className="neu-raised mb-2.5 overflow-hidden text-xs">
              <div className="bg-card text-foreground px-3 py-1.5 flex justify-between items-center neu-flat rounded-t-[var(--radius)]">
                <span className="font-bold">#{order.id.substring(0, 6).toUpperCase()}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted font-medium">
                  {statusLabels[order.status] || order.status}
                </span>
              </div>
              <div className="p-2.5">
                {(Array.isArray(order.items) ? order.items : []).map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between py-0.5">
                    <span>{item.qty}x {item.name}</span>
                    <span className="text-muted-foreground">₺{(item.price * item.qty).toFixed(0)}</span>
                  </div>
                ))}
              </div>
              <div className="bg-muted/30 px-3 py-1.5 flex justify-between items-center border-t border-border/30">
                <strong>₺{Number(order.total).toFixed(0)}</strong>
                <div className="flex gap-1.5 items-center">
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(order.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {order.status === 'waiting' && (
                    <button
                      className="neu-btn text-[10px] py-0.5 px-2 text-destructive"
                      onClick={() => cancelOrder(order.id)}>
                      İptal Et
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      <div className="h-px bg-border my-3" />
      <p className="text-muted-foreground text-[11px]">© 2025 BurgerQR</p>
    </WinWindow>
  );
};

export default SplashScreen;
