import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/integrations/supabase/client';
import { useToast95Context } from '@/contexts/Toast95Context';
import { useTenant } from '@/contexts/TenantContext';
import { useQuery } from '@tanstack/react-query';

const AdminQRCodes = () => {
  const { showToast } = useToast95Context();
  const { tenant, tenantId } = useTenant();
  const BASE_URL = tenant?.slug ? `https://${tenant.slug}.siparis.co` : 'https://juburger.lovable.app';

  const { data: areas = [] } = useQuery({
    queryKey: ['areas-qr', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from('table_areas')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('sort_order');
      return (data || []) as any[];
    },
    enabled: !!tenantId,
  });

  const { data: tables = [] } = useQuery({
    queryKey: ['tables-qr', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from('tables')
        .select('id, table_num, capacity, is_active, area_id, slug')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('table_num');
      return (data || []) as any[];
    },
    enabled: !!tenantId,
  });

  const getDisplayName = (t: any) => {
    const area = areas.find((a: any) => a.id === t.area_id);
    if (!area) return `Masa ${t.table_num}`;
    const areaTables = tables.filter((tb: any) => tb.area_id === area.id).sort((a: any, b: any) => a.table_num - b.table_num);
    const localIdx = areaTables.findIndex((tb: any) => tb.id === t.id) + 1;
    return `${area.name} ${localIdx}`;
  };

  const getSlug = (t: any) => t.slug || `masa-${t.table_num}`;

  const downloadQR = (tableSlug: string, displayName: string) => {
    const svg = document.getElementById(`qr-${tableSlug}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx?.drawImage(img, 0, 0, 512, 512);
      const link = document.createElement('a');
      link.download = `${tableSlug}-qr.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast(`${displayName} QR kodu indirildi!`);
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const downloadAll = () => {
    tables.forEach((t: any, i: number) => {
      const slug = getSlug(t);
      const displayName = getDisplayName(t);
      setTimeout(() => downloadQR(slug, displayName), i * 300);
    });
  };

  return (
    <>
      <p className="text-muted-foreground text-[11px] mb-2">
        Her masa için QR kod oluşturuldu. Müşteriler okutunca doğrudan o masanın sipariş ekranına yönlenir.
      </p>
      <div className="flex gap-1.5 mb-2.5">
        <button className="win-btn win-btn-primary text-[11px]" onClick={downloadAll}>
          📥 Tümünü İndir
        </button>
      </div>
      <hr className="border-t border-foreground my-2" />
      <div className="grid grid-cols-2 gap-2.5">
      {tables.map((t: any) => {
          const slug = getSlug(t);
          const url = `${BASE_URL}/?table=${slug}`;
          const displayName = getDisplayName(t);
          return (
            <div key={t.id} className="border border-foreground p-2.5 text-center">
              <QRCodeSVG
                id={`qr-${slug}`}
                value={url}
                size={100}
                level="M"
                className="mx-auto mb-1.5"
              />
              <div className="text-xs font-bold">{displayName}</div>
              <div className="text-[9px] text-muted-foreground break-all mt-0.5 mb-1.5">{url}</div>
              <button
                className="win-btn text-[10px] py-0.5 px-2 w-full"
                onClick={() => downloadQR(slug, displayName)}
              >
                📥 İndir
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default AdminQRCodes;
