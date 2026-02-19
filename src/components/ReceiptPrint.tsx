import React, { forwardRef } from 'react';

interface ReceiptItem {
  name: string;
  qty: number;
  price: number;
}

interface ReceiptProps {
  orderId: string;
  tableNum: number;
  userName: string;
  items: ReceiptItem[];
  total: number;
  paymentType: string;
  note?: string | null;
  createdAt: string;
  paperSize?: string;
}

const payLabels: Record<string, string> = { card: 'Kart', cash: 'Nakit', pos: 'POS' };

const ReceiptPrint = forwardRef<HTMLDivElement, ReceiptProps>(
  ({ orderId, tableNum, userName, items, total, paymentType, note, createdAt, paperSize = '80' }, ref) => {
    const time = new Date(createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const date = new Date(createdAt).toLocaleDateString('tr-TR');
    const width = paperSize === '58' ? '58mm' : '80mm';
    const fontSize = paperSize === '58' ? '10px' : '12px';

    return (
      <div ref={ref} className="receipt-print">
        <style>{`
          @media print {
            body * { visibility: hidden !important; }
            .receipt-print, .receipt-print * { visibility: visible !important; }
            .receipt-print {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: ${width} !important;
              padding: ${paperSize === '58' ? '2mm' : '4mm'} !important;
              font-family: 'Courier New', monospace !important;
              font-size: ${fontSize} !important;
              color: #000 !important;
              background: #fff !important;
            }
          }
          @media screen {
            .receipt-print { display: none; }
          }
        `}</style>

        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 18, fontWeight: 'bold' }}>JU - Sipariş Sistemi</div>
          <div style={{ fontSize: 11 }}>================================</div>
        </div>

        <div style={{ marginBottom: 6 }}>
          <div>Sipariş: #{orderId.substring(0, 6).toUpperCase()}</div>
          <div>Masa: {tableNum} — {userName}</div>
          <div>{date} {time}</div>
        </div>

        <div style={{ fontSize: 11 }}>--------------------------------</div>

        <div style={{ marginBottom: 6 }}>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{item.name} x{item.qty}</span>
              <span>₺{(item.price * item.qty).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 11 }}>--------------------------------</div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: 14, marginTop: 4 }}>
          <span>TOPLAM</span>
          <span>₺{Number(total).toFixed(2)}</span>
        </div>

        <div style={{ marginTop: 6, fontSize: 11 }}>
          <div>Ödeme: {payLabels[paymentType] || paymentType}</div>
          {note && <div>Not: {note}</div>}
        </div>

        <div style={{ fontSize: 11, marginTop: 8 }}>================================</div>
        <div style={{ textAlign: 'center', fontSize: 10, marginTop: 4 }}>
          Afiyet olsun!
        </div>
      </div>
    );
  }
);

ReceiptPrint.displayName = 'ReceiptPrint';
export default ReceiptPrint;
