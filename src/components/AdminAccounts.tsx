import React, { useState, useEffect } from 'react';
import { useToast95Context } from '@/contexts/Toast95Context';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';

interface Account {
  id: string;
  name: string;
  phone: string;
  note: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

interface Transaction {
  id: string;
  account_id: string;
  type: string;
  amount: number;
  description: string;
  table_num: number | null;
  created_at: string;
}

const AdminAccounts = () => {
  const { showToast } = useToast95Context();
  const { tenantId } = useTenant();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', note: '' });
  const [paymentAmount, setPaymentAmount] = useState('');

  const fetchAccounts = async () => {
    const { data } = await supabase.from('accounts').select('*').eq('tenant_id', tenantId).order('name');
    if (data) setAccounts(data as unknown as Account[]);
  };

  const fetchTransactions = async (accountId: string) => {
    const { data } = await supabase.from('account_transactions').select('*').eq('account_id', accountId).order('created_at', { ascending: false });
    if (data) setTransactions(data as unknown as Transaction[]);
  };

  useEffect(() => { fetchAccounts(); }, [tenantId]);

  const createAccount = async () => {
    if (!form.name) { showToast('Cari hesap adı zorunlu', false); return; }
    setLoading(true);
    const { error } = await supabase.from('accounts').insert({ ...form, tenant_id: tenantId } as any);
    if (error) { showToast('Hata: ' + error.message, false); }
    else { showToast('Cari hesap eklendi ✓'); setShowForm(false); setForm({ name: '', phone: '', note: '' }); fetchAccounts(); }
    setLoading(false);
  };

  const deleteAccount = async (id: string) => {
    await supabase.from('accounts').delete().eq('id', id);
    showToast('Cari hesap silindi');
    setSelectedAccount(null);
    fetchAccounts();
  };

  const addPayment = async () => {
    if (!selectedAccount || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) { showToast('Geçerli tutar girin', false); return; }
    setLoading(true);
    await supabase.from('account_transactions').insert({
      account_id: selectedAccount.id,
      type: 'payment',
      amount,
      description: 'Ödeme alındı',
    } as any);
    await supabase.from('accounts').update({ balance: selectedAccount.balance - amount }).eq('id', selectedAccount.id);
    showToast(`₺${amount} ödeme kaydedildi ✓`);
    setPaymentAmount('');
    const updated = { ...selectedAccount, balance: selectedAccount.balance - amount };
    setSelectedAccount(updated);
    fetchTransactions(selectedAccount.id);
    fetchAccounts();
    setLoading(false);
  };

  // Account detail view
  if (selectedAccount) {
    return (
      <div>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-[13px] font-bold">{selectedAccount.name}</h2>
          <button className="win-btn text-[10px]" onClick={() => setSelectedAccount(null)}>← Geri</button>
        </div>

        <div className="border border-foreground p-2.5 mb-2.5">
          <div className="text-[22px] font-bold text-center">₺{Number(selectedAccount.balance).toLocaleString('tr')}</div>
          <div className="text-[10px] text-muted-foreground text-center uppercase tracking-widest">Toplam Borç</div>
          {selectedAccount.phone && <div className="text-[11px] text-muted-foreground text-center mt-1">📞 {selectedAccount.phone}</div>}
          {selectedAccount.note && <div className="text-[11px] text-muted-foreground text-center">{selectedAccount.note}</div>}
        </div>

        {/* Payment input */}
        <div className="flex gap-1 mb-2.5">
          <input className="win-input flex-1" type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="Ödeme tutarı..." />
          <button className="win-btn win-btn-primary text-[10px]" onClick={addPayment} disabled={loading}>💰 Ödeme Al</button>
        </div>

        {/* Transaction history */}
        <h3 className="text-[11px] font-bold mb-1 uppercase tracking-widest text-muted-foreground">Hesap Hareketleri</h3>
        <div className="border border-foreground">
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-3 text-[10px]">Hareket yok</p>
          ) : transactions.map(t => (
            <div key={t.id} className="flex justify-between items-center px-2 py-1.5 text-[11px] border-b border-dashed border-muted-foreground/20 last:border-b-0">
              <div>
                <div className={t.type === 'payment' ? 'text-emerald-600 font-medium' : 'text-destructive font-medium'}>
                  {t.type === 'payment' ? '💰 Ödeme' : '📋 Borç'} — ₺{Number(t.amount).toLocaleString('tr')}
                </div>
                <div className="text-[9px] text-muted-foreground">{t.description} {t.table_num ? `(Masa ${t.table_num})` : ''}</div>
              </div>
              <div className="text-[9px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString('tr-TR')} {new Date(t.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          ))}
        </div>

        <hr className="border-t border-foreground my-2.5" />
        <button className="win-btn text-[10px] text-destructive w-full" onClick={() => deleteAccount(selectedAccount.id)}>🗑 Cari Hesabı Sil</button>
      </div>
    );
  }

  // Create form
  if (showForm) {
    return (
      <div>
        <h2 className="text-[13px] font-bold mb-2">Yeni Cari Hesap</h2>
        <hr className="border-t border-foreground my-2" />
        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Hesap Adı</div>
          <input className="win-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="ör: Ali Yılmaz" />
        </div>
        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Telefon</div>
          <input className="win-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="ör: 0532 123 4567" />
        </div>
        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Not</div>
          <textarea className="win-input w-full text-[11px]" rows={2} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Ek bilgi..." />
        </div>
        <hr className="border-t border-foreground my-2" />
        <div className="flex gap-1.5">
          <button className="win-btn win-btn-primary" onClick={createAccount} disabled={loading}>{loading ? 'Kaydediliyor...' : 'Kaydet'}</button>
          <button className="win-btn" onClick={() => setShowForm(false)}>İptal</button>
        </div>
      </div>
    );
  }

  // Account list
  return (
    <>
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-[13px] font-bold">Cari Hesaplar</h2>
        <button className="win-btn win-btn-primary text-[10px]" onClick={() => setShowForm(true)}>+ Yeni Hesap</button>
      </div>

      {!accounts.length ? (
        <p className="text-muted-foreground text-center py-3.5 text-xs">Henüz cari hesap eklenmedi.</p>
      ) : (
        <div className="border border-foreground">
          <div className="flex bg-muted text-[10px] font-bold uppercase tracking-widest border-b border-foreground">
            <div className="w-6 px-1 py-1 border-r border-foreground">#</div>
            <div className="flex-1 px-2 py-1 border-r border-foreground">Hesap Adı</div>
            <div className="w-20 px-1 py-1 border-r border-foreground text-right">Borç</div>
            <div className="w-16 px-1 py-1 text-center">İşlem</div>
          </div>
          {accounts.map((a, i) => (
            <div key={a.id} className="flex text-[11px] border-b border-dashed border-muted-foreground/30 last:border-b-0 cursor-pointer hover:bg-muted/30"
              onClick={() => { setSelectedAccount(a); fetchTransactions(a.id); }}>
              <div className="w-6 px-1 py-1.5 border-r border-foreground/10 text-muted-foreground">{i + 1}</div>
              <div className="flex-1 px-2 py-1.5 border-r border-foreground/10">
                <div className="font-bold">{a.name}</div>
                {a.phone && <div className="text-[9px] text-muted-foreground">{a.phone}</div>}
              </div>
              <div className={`w-20 px-1 py-1.5 border-r border-foreground/10 text-right font-bold ${Number(a.balance) > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                ₺{Number(a.balance).toLocaleString('tr')}
              </div>
              <div className="w-16 px-1 py-1.5 flex items-center justify-center">
                <span className="text-primary text-[10px] underline">Detay</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default AdminAccounts;
