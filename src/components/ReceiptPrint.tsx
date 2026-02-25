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
    const fontSize = paperSize === '58' ? '12px' : '14px';

    return (
      <div ref={ref} className="receipt-print" style={{ position: 'fixed', left: '-9999px', top: 0, width: width, padding: paperSize === '58' ? '2mm' : '4mm', fontFamily: "'Courier New', monospace", fontSize: fontSize, fontWeight: 600, color: '#000', background: '#fff', WebkitPrintColorAdjust: 'exact' }}>

        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 22, fontWeight: 900 }}>JU - Sipariş Sistemi</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>================================</div>
        </div>

        <div style={{ marginBottom: 6, fontWeight: 700 }}>
          <div>Sipariş: #{orderId.substring(0, 6).toUpperCase()}</div>
          <div>Masa: {tableNum} — {userName}</div>
          <div>{date} {time}</div>
        </div>

        <div style={{ fontSize: 13, fontWeight: 700 }}>--------------------------------</div>

        <div style={{ marginBottom: 6 }}>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
              <span>{item.name} x{item.qty}</span>
              <span>₺{(item.price * item.qty).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 13, fontWeight: 700 }}>--------------------------------</div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 18, marginTop: 4 }}>
          <span>TOPLAM</span>
          <span>₺{Number(total).toFixed(2)}</span>
        </div>

        <div style={{ marginTop: 6, fontSize: 13, fontWeight: 700 }}>
          <div>Ödeme: {payLabels[paymentType] || paymentType}</div>
          {note && <div>Not: {note}</div>}
        </div>

        <div style={{ fontSize: 13, fontWeight: 700, marginTop: 8 }}>================================</div>
        <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, marginTop: 4 }}>
          Afiyet olsun!
        </div>
      </div>
    );
  }
);

ReceiptPrint.displayName = 'ReceiptPrint';
export default ReceiptPrint;
