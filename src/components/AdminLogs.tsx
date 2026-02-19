import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LogEntry {
  id: string;
  table_num: number;
  user_name: string;
  action: string;
  details: string;
  amount: number;
  payment_type: string;
  created_at: string;
}

const actionIcons: Record<string, string> = {
  'Ödeme alındı!': '💰',
  'Masa kapatıldı': '🔒',
  'Siparişler iptal edildi!': '🗑️',
  'Sipariş eklendi!': '📝',
};

const actionColors: Record<string, string> = {
  'Ödeme alındı!': 'bg-[#27ae60]/10 border-[#27ae60]/30',
  'Siparişler iptal edildi!': 'bg-[#c0392b]/10 border-[#c0392b]/30',
  'Masa kapatıldı': 'bg-muted',
  'Sipariş eklendi!': 'bg-muted',
};

const AdminLogs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const fetchLogs = async () => {
    const { data } = await supabase.from('table_logs').select('*')
      .gte('created_at', startDate + 'T00:00:00')
      .lte('created_at', endDate + 'T23:59:59')
      .order('created_at', { ascending: false })
      .limit(200);
    if (data) setLogs(data as LogEntry[]);
  };

  useEffect(() => {
    fetchLogs();
    const ch = supabase.channel('admin-logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'table_logs' }, () => fetchLogs())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [startDate, endDate]);

  const formatDate = (d: string) => new Date(d).toLocaleString('tr-TR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  return (
    <>
      {/* Date filters */}
      <div className="flex gap-2 mb-2.5">
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Başlangıç</div>
          <input type="date" className="win-input w-full text-[11px]" value={startDate}
            onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Bitiş</div>
          <input type="date" className="win-input w-full text-[11px]" value={endDate}
            onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>

      {logs.length === 0 ? (
        <p className="text-muted-foreground text-center py-3.5 text-xs">Bu tarih aralığında log bulunamadı.</p>
      ) : (
        <div className="space-y-1.5">
          {logs.map(log => {
            const icon = actionIcons[log.action] || '📋';
            const color = actionColors[log.action] || 'bg-muted';
            const isPayment = log.action === 'Ödeme alındı!';
            const isCancel = log.action === 'Siparişler iptal edildi!';

            return (
              <div key={log.id} className={`border ${color} p-2 text-[11px]`}>
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-1.5">
                    <span className="text-[14px]">{icon}</span>
                    <div>
                      <span className="font-bold">{log.user_name}</span>
                      {' '}{log.action}
                      {log.details && (
                        <span className={`ml-1 text-[10px] px-1 py-0.5 rounded ${isPayment ? 'bg-[#27ae60] text-white' : isCancel ? 'bg-[#c0392b] text-white' : 'bg-muted-foreground/20 text-foreground'}`}>
                          {log.details}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-[9px] text-muted-foreground whitespace-nowrap ml-2">
                    {formatDate(log.created_at)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default AdminLogs;
