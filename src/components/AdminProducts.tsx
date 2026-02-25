import React, { useState, useEffect } from 'react';
import { useToast95Context } from '@/contexts/Toast95Context';
import { supabase } from '@/integrations/supabase/client';

interface Category {
  id: string;
  name: string;
  sort_order: number;
}

interface Product {
  id: string;
  category_id: string | null;
  name: string;
  description: string;
  price: number;
  tag: string;
  is_available: boolean;
  sort_order: number;
}

interface ProductOption {
  id: string;
  product_id: string;
  name: string;
  extra_price: number;
  sort_order: number;
}

const AdminProducts = () => {
  const { showToast } = useToast95Context();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: '', description: '', price: '', tag: '', category_id: '', is_available: true });
  const [catName, setCatName] = useState('');
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionPrice, setNewOptionPrice] = useState('');

  const fetchData = async () => {
    const [{ data: cats }, { data: prods }] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('products').select('*').order('sort_order'),
    ]);
    if (cats) setCategories(cats);
    if (prods) setProducts(prods);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = selectedCat === 'all' ? products : products.filter(p => p.category_id === selectedCat);

  const openAdd = () => {
    setEditProduct(null);
    setForm({ name: '', description: '', price: '', tag: '', category_id: categories[0]?.id || '', is_available: true });
    setProductOptions([]);
    setShowForm(true);
  };

  const openEdit = async (p: Product) => {
    setEditProduct(p);
    setForm({ name: p.name, description: p.description, price: String(p.price), tag: p.tag, category_id: p.category_id || '', is_available: p.is_available });
    const { data } = await supabase.from('product_options').select('*').eq('product_id', p.id).order('sort_order');
    setProductOptions((data as ProductOption[]) || []);
    setShowForm(true);
  };

  const addOption = async () => {
    if (!editProduct || !newOptionName.trim()) return;
    const { error } = await supabase.from('product_options').insert({
      product_id: editProduct.id,
      name: newOptionName.trim(),
      extra_price: Number(newOptionPrice) || 0,
      sort_order: productOptions.length,
    });
    if (error) { showToast('Seçenek eklenemedi', false); return; }
    setNewOptionName('');
    setNewOptionPrice('');
    const { data } = await supabase.from('product_options').select('*').eq('product_id', editProduct.id).order('sort_order');
    setProductOptions((data as ProductOption[]) || []);
    showToast('Seçenek eklendi ✓');
  };

  const deleteOption = async (optId: string) => {
    if (!editProduct) return;
    await supabase.from('product_options').delete().eq('id', optId);
    setProductOptions(prev => prev.filter(o => o.id !== optId));
    showToast('Seçenek silindi');
  };

  const saveProduct = async () => {
    if (!form.name || !form.price) { showToast('Ad ve fiyat zorunlu', false); return; }
    const payload = {
      name: form.name,
      description: form.description,
      price: Number(form.price),
      tag: form.tag,
      category_id: form.category_id || null,
      is_available: form.is_available,
    };

    if (editProduct) {
      const { error } = await supabase.from('products').update(payload).eq('id', editProduct.id);
      if (error) { showToast('Güncelleme hatası', false); return; }
      showToast('Ürün güncellendi ✓');
    } else {
      const { error } = await supabase.from('products').insert(payload);
      if (error) { showToast('Ekleme hatası', false); return; }
      showToast('Ürün eklendi ✓');
    }
    setShowForm(false);
    fetchData();
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) { showToast('Silme hatası', false); return; }
    showToast('Ürün silindi');
    fetchData();
  };

  const toggleAvailable = async (p: Product) => {
    await supabase.from('products').update({ is_available: !p.is_available }).eq('id', p.id);
    fetchData();
  };

  const addCategory = async () => {
    if (!catName.trim()) return;
    const { error } = await supabase.from('categories').insert({ name: catName.trim(), sort_order: categories.length + 1 });
    if (error) { showToast('Kategori eklenemedi', false); return; }
    showToast('Kategori eklendi ✓');
    setCatName('');
    setShowCatForm(false);
    fetchData();
  };

  const deleteCategory = async (id: string) => {
    await supabase.from('categories').delete().eq('id', id);
    showToast('Kategori silindi');
    if (selectedCat === id) setSelectedCat('all');
    fetchData();
  };

  const getCatName = (catId: string | null) => categories.find(c => c.id === catId)?.name || '—';

  // Product form modal
  if (showForm) {
    return (
      <div>
        <h2 className="text-[13px] font-bold mb-2">{editProduct ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}</h2>
        <hr className="border-t border-foreground my-2" />

        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Ürün Kategorisi</div>
          <select className="win-input" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
            <option value="">Seç</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Ürün Adı</div>
          <input className="win-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="ör: Classic Burger" />
        </div>

        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Açıklama</div>
          <input className="win-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Kısa açıklama" />
        </div>

        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Ürün Fiyatı (₺)</div>
          <input className="win-input" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0" />
        </div>

        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Etiket</div>
          <select className="win-input" value={form.tag} onChange={e => setForm({ ...form, tag: e.target.value })}>
            <option value="">Yok</option>
            <option value="n">Yeni</option>
            <option value="s">Acı</option>
            <option value="p">Popüler</option>
          </select>
        </div>

        <div className="flex items-center gap-2 mb-2.5">
          <input type="checkbox" className="w-4 h-4 cursor-pointer" checked={form.is_available} onChange={e => setForm({ ...form, is_available: e.target.checked })} />
          <span className="text-[12px]">Satışta</span>
        </div>

        {/* Product Options - only when editing */}
        {editProduct && (
          <>
            <hr className="border-t border-foreground my-2" />
            <div className="text-[11px] font-bold mb-1.5">Ek Seçenekler</div>
            {productOptions.length > 0 && (
              <div className="mb-2 space-y-1">
                {productOptions.map((opt, idx) => (
                  <div key={opt.id} className="flex items-center justify-between text-[11px] border border-border p-1 px-2">
                    <span>{idx}. {opt.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{opt.extra_price > 0 ? `+₺${opt.extra_price}` : '₺0'}</span>
                      <button className="text-[10px] text-destructive cursor-pointer bg-transparent border-none" onClick={() => deleteOption(opt.id)}>Sil</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-1 items-end mb-2">
              <div className="flex-1">
                <div className="text-[9px] text-muted-foreground">Seçenek Adı</div>
                <input className="win-input text-[11px]" value={newOptionName} onChange={e => setNewOptionName(e.target.value)} placeholder="ör: Ekstra Peynir" />
              </div>
              <div className="w-20">
                <div className="text-[9px] text-muted-foreground">Ekstra ₺</div>
                <input className="win-input text-[11px]" type="number" value={newOptionPrice} onChange={e => setNewOptionPrice(e.target.value)} placeholder="0" />
              </div>
              <button className="win-btn win-btn-primary text-[10px] py-1" onClick={addOption}>Ekle</button>
            </div>
          </>
        )}

        <hr className="border-t border-foreground my-2" />
        <div className="flex gap-1.5">
          <button className="win-btn win-btn-primary" onClick={saveProduct}>Kaydet</button>
          <button className="win-btn" onClick={() => setShowForm(false)}>İptal</button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Category tabs */}
      <div className="flex gap-1 flex-wrap mb-2">
        <button
          className={`text-[11px] px-3 py-1 cursor-pointer rounded-full transition-all ${selectedCat === 'all' ? 'neu-sunken text-foreground font-semibold' : 'neu-flat text-muted-foreground'}`}
          onClick={() => setSelectedCat('all')}>Tümü</button>
        {categories.map(c => (
          <button key={c.id}
            className={`text-[11px] px-3 py-1 cursor-pointer rounded-full transition-all ${selectedCat === c.id ? 'neu-sunken text-foreground font-semibold' : 'neu-flat text-muted-foreground'}`}
            onClick={() => setSelectedCat(c.id)}>{c.name}</button>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-1.5 mb-2.5">
        <button className="win-btn win-btn-primary text-[10px]" onClick={openAdd}>+ Ürün Ekle</button>
        <button className="win-btn text-[10px]" onClick={() => setShowCatForm(!showCatForm)}>+ Kategori Ekle</button>
      </div>

      {/* Category add form */}
      {showCatForm && (
        <div className="border border-foreground p-2 mb-2.5 bg-muted">
          <div className="flex gap-1.5 items-end">
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Kategori Adı</div>
              <input className="win-input" value={catName} onChange={e => setCatName(e.target.value)} placeholder="ör: Tatlılar"
                onKeyDown={e => e.key === 'Enter' && addCategory()} />
            </div>
            <button className="win-btn win-btn-primary text-[10px] py-0.5" onClick={addCategory}>Ekle</button>
          </div>
          {categories.length > 0 && (
            <div className="mt-2 border-t border-dashed border-muted-foreground/40 pt-1.5">
              <div className="text-[10px] text-muted-foreground mb-1">Mevcut kategoriler:</div>
              {categories.map(c => (
                <div key={c.id} className="flex justify-between items-center text-[11px] py-0.5">
                  <span>{c.name}</span>
                  <button className="text-[10px] text-destructive cursor-pointer bg-transparent border-none" onClick={() => deleteCategory(c.id)}>Sil</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Product cards */}
      {!filtered.length ? (
        <p className="text-muted-foreground text-center py-3.5 text-xs">Ürün bulunamadı.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {filtered.map(p => (
            <div key={p.id} className={`border border-foreground ${!p.is_available ? 'opacity-50' : ''}`}>
              <div className="p-2">
                <div className="flex justify-between items-start gap-1">
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold truncate">{p.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{p.description}</div>
                  </div>
                  <span className="text-[12px] font-bold whitespace-nowrap">₺{p.price}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[9px] text-muted-foreground border border-border px-1">{getCatName(p.category_id)}</span>
                  {p.tag && <span className="text-[9px] border border-primary text-primary px-1">{p.tag === 'n' ? 'YENİ' : p.tag === 's' ? 'ACI' : p.tag === 'p' ? 'POPÜLER' : p.tag}</span>}
                  {!p.is_available && <span className="text-[9px] text-destructive">Kapalı</span>}
                </div>
              </div>
              <div className="flex text-[10px] border-t border-foreground">
                <button className="flex-1 py-1 cursor-pointer bg-transparent border-none border-r border-foreground hover:bg-muted text-foreground" onClick={() => openEdit(p)}>Düzenle</button>
                <button className="flex-1 py-1 cursor-pointer bg-transparent border-none border-r border-foreground hover:bg-muted text-foreground" onClick={() => toggleAvailable(p)}>{p.is_available ? 'Kapat' : 'Aç'}</button>
                <button className="flex-1 py-1 cursor-pointer bg-transparent border-none hover:bg-destructive/10 text-destructive" onClick={() => deleteProduct(p.id)}>Sil</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default AdminProducts;
