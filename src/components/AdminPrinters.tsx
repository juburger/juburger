import React, { useState, useEffect } from 'react';
import { useToast95Context } from '@/contexts/Toast95Context';
import { supabase } from '@/integrations/supabase/client';

interface Printer {
  id: string;
  name: string;
  ip_address: string;
  paper_size: string;
  is_default: boolean;
  is_active: boolean;
  auto_print_categories: string[];
  header_text: string;
  footer_text: string;
}

interface Category {
  id: string;
  name: string;
}

const AdminPrinters: React.FC = () => {
  const { showToast } = useToast95Context();
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editPrinter, setEditPrinter] = useState<Printer | null>(null);
  const [form, setForm] = useState({
    name: '', ip_address: '', paper_size: '80', is_default: false,
    auto_print_categories: [] as string[], header_text: '', footer_text: '',
  });

  const fetchData = async () => {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from('printers').select('*').order('created_at'),
      supabase.from('categories').select('*').order('sort_order'),
    ]);
    if (p) setPrinters(p as Printer[]);
    if (c) setCategories(c);
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = () => {
    setEditPrinter(null);
    setForm({ name: '', ip_address: '', paper_size: '80', is_default: false, auto_print_categories: [], header_text: '', footer_text: '' });
    setShowForm(true);
  };

  const openEdit = (p: Printer) => {
    setEditPrinter(p);
    setForm({
      name: p.name, ip_address: p.ip_address, paper_size: p.paper_size,
      is_default: p.is_default, auto_print_categories: p.auto_print_categories || [],
      header_text: p.header_text, footer_text: p.footer_text,
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) { showToast('Yazıcı adı zorunlu', false); return; }
    const payload = {
      name: form.name.trim(),
      ip_address: form.ip_address.trim(),
      paper_size: form.paper_size,
      is_default: form.is_default,
      auto_print_categories: form.auto_print_categories,
      header_text: form.header_text,
      footer_text: form.footer_text,
    };

    if (editPrinter) {
      const { error } = await supabase.from('printers').update(payload).eq('id', editPrinter.id);
      if (error) { showToast('Güncelleme hatası', false); return; }
      // If setting as default, unset others
      if (form.is_default) {
        await supabase.from('printers').update({ is_default: false }).neq('id', editPrinter.id);
      }
      showToast('Yazıcı güncellendi ✓');
    } else {
      const { error } = await supabase.from('printers').insert(payload);
      if (error) { showToast('Ekleme hatası', false); return; }
      showToast('Yazıcı eklendi ✓');
    }
    setShowForm(false);
    fetchData();
  };

  const deletePrinter = async (id: string) => {
    await supabase.from('printers').delete().eq('id', id);
    showToast('Yazıcı silindi');
    fetchData();
  };

  const toggleActive = async (p: Printer) => {
    await supabase.from('printers').update({ is_active: !p.is_active }).eq('id', p.id);
    fetchData();
  };

  const toggleCategory = (catId: string) => {
    setForm(prev => ({
      ...prev,
      auto_print_categories: prev.auto_print_categories.includes(catId)
        ? prev.auto_print_categories.filter(c => c !== catId)
        : [...prev.auto_print_categories, catId],
    }));
  };

  if (showForm) {
    return (
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-[13px] font-bold">{editPrinter ? 'Yazıcı Düzenle' : 'Yeni Yazıcı Ekle'}</h3>
          <button className="text-[11px] cursor-pointer bg-transparent border-none text-muted-foreground" onClick={() => setShowForm(false)}>✕</button>
        </div>
        <hr className="border-t border-foreground my-2" />

        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Yazıcı Adı</div>
          <input className="win-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="ör: Bar, Mutfak" />
        </div>

        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Yazıcı IP Adresi</div>
          <input className="win-input" value={form.ip_address} onChange={e => setForm({ ...form, ip_address: e.target.value })} placeholder="ör: 192.168.1.100" />
        </div>

        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Kağıt Boyutu</div>
          <div className="flex gap-1.5">
            {['58', '80'].map(size => (
              <button key={size}
                className={`font-mono text-[11px] px-3 py-1 cursor-pointer border-2 ${form.paper_size === size ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-card-foreground win-raised'}`}
                onClick={() => setForm({ ...form, paper_size: size })}>
                {size}mm
              </button>
            ))}
          </div>
        </div>

        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Otomatik Yazdırılacak Kategoriler</div>
          <div className="flex flex-wrap gap-1">
            {categories.map(c => (
              <button key={c.id}
                className={`text-[10px] px-2 py-0.5 border cursor-pointer ${form.auto_print_categories.includes(c.id) ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-card-foreground border-border'}`}
                onClick={() => toggleCategory(c.id)}>
                {c.name}
              </button>
            ))}
            {categories.length === 0 && <span className="text-[10px] text-muted-foreground">Kategori bulunamadı</span>}
          </div>
          <div className="text-[9px] text-muted-foreground mt-0.5">Boş bırakılırsa tüm siparişler yazdırılır</div>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <input type="checkbox" className="w-4 h-4 cursor-pointer" checked={form.is_default}
            onChange={e => setForm({ ...form, is_default: e.target.checked })} />
          <span className="text-[12px]">Varsayılan Yazıcı</span>
        </div>

        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Fiş Üst Kısım</div>
          <textarea className="win-input w-full text-[11px]" rows={2} value={form.header_text}
            onChange={e => setForm({ ...form, header_text: e.target.value })} placeholder="ör: Restoran Adı" />
        </div>

        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Fiş Alt Kısım</div>
          <textarea className="win-input w-full text-[11px]" rows={2} value={form.footer_text}
            onChange={e => setForm({ ...form, footer_text: e.target.value })} placeholder="ör: Afiyet olsun!" />
        </div>

        <hr className="border-t border-foreground my-2" />
        <div className="flex gap-1.5">
          <button className="win-btn win-btn-primary" onClick={save}>Kaydet</button>
          <button className="win-btn" onClick={() => setShowForm(false)}>İptal</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-[13px] font-bold">🖨️ Yazıcılar</h3>
        <button className="win-btn win-btn-primary text-[10px]" onClick={openAdd}>+ Yazıcı Ekle</button>
      </div>

      {printers.length === 0 ? (
        <p className="text-muted-foreground text-center py-3 text-[10px]">Henüz yazıcı eklenmedi</p>
      ) : (
        <div className="space-y-1.5">
          {printers.map(p => (
            <div key={p.id} className={`border border-foreground ${!p.is_active ? 'opacity-50' : ''}`}>
              <div className="p-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-[12px] font-bold">
                      {p.name}
                      {p.is_default && <span className="text-[9px] ml-1 text-primary border border-primary px-1">VARSAYILAN</span>}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {p.ip_address || 'IP girilmedi'} — {p.paper_size}mm
                    </div>
                    {p.auto_print_categories.length > 0 && (
                      <div className="text-[9px] text-muted-foreground mt-0.5">
                        Kategoriler: {p.auto_print_categories.map(cId => categories.find(c => c.id === cId)?.name || cId).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex text-[10px] border-t border-foreground">
                <button className="flex-1 py-1 cursor-pointer bg-transparent border-none border-r border-foreground hover:bg-muted text-foreground" onClick={() => openEdit(p)}>Düzenle</button>
                <button className="flex-1 py-1 cursor-pointer bg-transparent border-none border-r border-foreground hover:bg-muted text-foreground" onClick={() => toggleActive(p)}>{p.is_active ? 'Kapat' : 'Aç'}</button>
                <button className="flex-1 py-1 cursor-pointer bg-transparent border-none hover:bg-destructive/10 text-destructive" onClick={() => deletePrinter(p.id)}>Sil</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 p-2 bg-muted border border-border text-[10px] text-muted-foreground">
        <div className="font-bold mb-1">💡 Sessiz Yazdırma (Yazıcı Diyalogu Olmadan)</div>
        <div>Chrome tarayıcısını şu parametreyle başlatın:</div>
        <div className="font-mono mt-0.5 bg-card px-1 py-0.5 border border-border">chrome --kiosk-printing</div>
        <div className="mt-1">Bu sayede yazdırma diyalogu açılmadan varsayılan yazıcıya otomatik gönderilir.</div>
      </div>
    </div>
  );
};

export default AdminPrinters;
