import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/integrations/supabase/client';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
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
    if (!area) return `M-${t.table_num}`;
    const areaTables = tables.filter((tb: any) => tb.area_id === area.id).sort((a: any, b: any) => a.table_num - b.table_num);
    const localIdx = areaTables.findIndex((tb: any) => tb.id === t.id) + 1;
    return `${area.name} ${localIdx}`;
  };

  const getShortName = (t: any) => {
    const area = areas.find((a: any) => a.id === t.area_id);
    if (!area) return `M-${t.table_num}`;
    const areaTables = tables.filter((tb: any) => tb.area_id === area.id).sort((a: any, b: any) => a.table_num - b.table_num);
    const localIdx = areaTables.findIndex((tb: any) => tb.id === t.id) + 1;
    const initial = area.name.charAt(0).toUpperCase();
    return `${initial}-${localIdx}`;
  };

  const getSlug = (t: any) => t.slug || `masa-${t.table_num}`;

  const svgToPngBlob = (svgEl: Element, label?: string): Promise<Blob> => {
    return new Promise((resolve) => {
      const svgData = new XMLSerializer().serializeToString(svgEl);
      const qrSize = 512;
      const labelHeight = label ? 64 : 0;
      const canvas = document.createElement('canvas');
      canvas.width = qrSize;
      canvas.height = qrSize + labelHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, qrSize, qrSize);
        if (label) {
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 32px Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, qrSize / 2, qrSize + labelHeight / 2);
        }
        canvas.toBlob((blob) => resolve(blob!), 'image/png');
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    });
  };

  const downloadQR = async (tableSlug: string, displayName: string, shortName: string) => {
    const svg = document.getElementById(`qr-${tableSlug}`);
    if (!svg) return;
    const blob = await svgToPngBlob(svg, shortName);
    saveAs(blob, `${tableSlug}-qr.png`);
    showToast(`${displayName} QR kodu indirildi!`);
  };

  const downloadAll = async () => {
    const zip = new JSZip();
    const folder = zip.folder(tenant?.slug ? `${tenant.slug}-qr-kodlar` : 'qr-kodlar')!;

    for (const t of tables) {
      const slug = getSlug(t);
      const svg = document.getElementById(`qr-${slug}`);
      if (!svg) continue;
      const dn = getDisplayName(t);
      const sn = getShortName(t);
      const blob = await svgToPngBlob(svg, sn);
      folder.file(`${dn}-${slug}.png`, blob);
    }

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `${tenant?.slug || 'qr'}-kodlar.zip`);
    showToast('Tüm QR kodlar ZIP olarak indirildi!');
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
          const shortName = getShortName(t);
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
                onClick={() => downloadQR(slug, displayName, shortName)}
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
