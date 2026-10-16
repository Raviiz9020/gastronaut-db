import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { Order, Vendor } from '@/types';

export const buildDineInBillPdfDoc = (order: Order, vendor: Vendor | null): jsPDF | null => {
  if (!order) return null;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const orderDate = order.createdAt ? new Date(order.createdAt) : new Date();
  const displayId = order.displayId || order.orderId;
  const isPaid = order.paymentStatus === 'PAID' || order.status === 'Delivered';

  // 1. Brand Top Banner (HyperDelivery Signature Purple / Violet)
  doc.setFillColor(147, 51, 234); // Brand Purple
  doc.roundedRect(14, 12, pageWidth - 28, 22, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('HYPERDELIVERY', 20, 22);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('OFFICIAL ORDER RECEIPT & TAX INVOICE • DINE-IN', 20, 29);

  // Top Right: Order ID & Date
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`ORDER #${displayId}`, pageWidth - 20, 22, { align: 'right' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(format(orderDate, 'dd MMM yyyy, hh:mm a'), pageWidth - 20, 29, { align: 'right' });

  // 2. Info Cards (Billed From Restaurant & Billed To Dine-In Order)
  const cardWidth = (pageWidth - 34) / 2;
  const cardY = 38;
  const cardHeight = 34;

  // Card Left: BILLED FROM (RESTAURANT)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, cardY, cardWidth, cardHeight, 2, 2, 'FD');

  doc.setTextColor(147, 51, 234);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('BILLED FROM (RESTAURANT)', 18, cardY + 6);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text(vendor?.shopName || vendor?.name || 'Restaurant Partner', 18, cardY + 12);

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  if (vendor?.address) {
    const splitAddress = doc.splitTextToSize(vendor.address, cardWidth - 8);
    doc.text(splitAddress.slice(0, 2), 18, cardY + 18);
  }
  if (vendor?.contact) {
    doc.text(`Phone: ${vendor.contact}`, 18, cardY + 28);
  }

  // Card Right: BILLED TO (DINE-IN ORDER)
  const tableNumber = order.tableId ? `Table ${order.tableId}` : 'Dine-In Table';
  const guestName = order.customer?.name || 'Dine-In Guest';

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14 + cardWidth + 6, cardY, cardWidth, cardHeight, 2, 2, 'FD');

  doc.setTextColor(147, 51, 234);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('BILLED TO (DINE-IN ORDER)', 14 + cardWidth + 10, cardY + 6);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text(tableNumber, 14 + cardWidth + 10, cardY + 12);

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Guest: ${guestName}`, 14 + cardWidth + 10, cardY + 18);
  doc.text('Phone: Table Service', 14 + cardWidth + 10, cardY + 23);
  doc.text(`Type: Dine-In • #${displayId?.slice(-4) || '9193'}`, 14 + cardWidth + 10, cardY + 28);

  // 3. Itemized Order Table
  let itemsSubtotal = 0;
  const tableBody = (order.items || []).map((item: any, idx: number) => {
    const qty = item.quantity || 1;
    const price = item.price || 0;
    const lineTotal = price * qty;
    itemsSubtotal += lineTotal;

    let custText = '';
    if (item.selectedSize) {
      custText = `\n  + ${item.selectedSize}`;
    } else if (item.customizations && item.customizations.length > 0) {
      const details = item.customizations
        .map((g: any) => (g.options ? g.options.map((o: any) => o.name).join(', ') : ''))
        .filter(Boolean)
        .join(', ');
      if (details) custText = `\n  + ${details}`;
    }

    return [
      (idx + 1).toString(),
      `${item.name}${custText}`,
      qty.toString(),
      `Rs. ${price.toFixed(2)}`,
      `Rs. ${lineTotal.toFixed(2)}`,
    ];
  });

  autoTable(doc, {
    startY: 76,
    head: [['#', 'ITEM DESCRIPTION', 'QTY', 'UNIT PRICE', 'AMOUNT']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [147, 51, 234],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
      cellPadding: 3,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'left' },
      2: { halign: 'center', cellWidth: 14 },
      3: { halign: 'right', cellWidth: 26 },
      4: { halign: 'right', cellWidth: 28 },
    },
    styles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: [250, 245, 255],
    },
  });

  const tableEndY = (doc as any).lastAutoTable.finalY || 130;

  // 4. Payment Confirmation Stamp (Left Box)
  const stampWidth = (pageWidth - 34) * 0.48;
  doc.setFillColor(240, 253, 244); // Green 50
  doc.setDrawColor(187, 247, 208); // Green 200
  doc.roundedRect(14, tableEndY + 4, stampWidth, 38, 2, 2, 'FD');

  doc.setTextColor(22, 101, 52); // Green 800
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('✓ PAYMENT CONFIRMED', 18, tableEndY + 11);

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Payment Mode: ${order.paymentMethod || 'Pay at Counter'}`, 18, tableEndY + 17);
  doc.text('Gateway: Counter POS', 18, tableEndY + 22);
  doc.text(`Txn Ref: ${displayId}`, 18, tableEndY + 27);
  doc.text(`Timestamp: ${format(orderDate, 'dd/MM/yyyy hh:mm a')}`, 18, tableEndY + 32);
  doc.text(`Status: ${isPaid ? 'PAID' : 'PAID'}`, 18, tableEndY + 37);

  // 5. Billing Summary (Right Box)
  const summaryX = 14 + stampWidth + 6;
  const summaryWidth = pageWidth - 14 - summaryX;
  let summaryY = tableEndY + 7;

  const addSummaryRow = (label: string, value: string, isBold: boolean = false, isGreen: boolean = false) => {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setTextColor(
      isGreen ? 22 : isBold ? 15 : 100,
      isGreen ? 101 : isBold ? 23 : 116,
      isGreen ? 52 : isBold ? 42 : 139
    );
    doc.text(label, summaryX, summaryY);
    doc.text(value, pageWidth - 14, summaryY, { align: 'right' });
    summaryY += 5;
  };

  addSummaryRow('Items Subtotal', `Rs. ${itemsSubtotal.toFixed(2)}`);

  if (order.discountAmount !== undefined && order.discountAmount > 0) {
    addSummaryRow('Discount / Offer', `- Rs. ${order.discountAmount.toFixed(2)}`, false, true);
  }

  // Grand Total Pill Box
  summaryY += 1;
  doc.setFillColor(147, 51, 234);
  doc.roundedRect(summaryX - 2, summaryY, summaryWidth + 2, 8, 2, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL PAID', summaryX + 3, summaryY + 5.5);
  doc.text(`Rs. ${order.totalPrice.toFixed(2)}`, pageWidth - 16, summaryY + 5.5, { align: 'right' });

  // 6. Professional Footer matching Vendor App Receipt
  const footerY = Math.max(summaryY + 45, pageHeight - 18);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text('Thank you for dining with us & being part of the HyperDelivery Community!', pageWidth / 2, footerY, { align: 'center' });

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text("This is a computer-generated invoice and doesn't require a signature.", pageWidth / 2, footerY + 5, { align: 'center' });

  return doc;
};

export const generateDineInBillPdf = (order: Order, vendor: Vendor | null) => {
  const doc = buildDineInBillPdfDoc(order, vendor);
  if (!doc) return;
  const displayId = order.displayId || order.orderId;
  doc.save(`HyperDelivery-Bill-${displayId}.pdf`);
};

export const shareDineInBillPdf = async (order: Order, vendor: Vendor | null) => {
  if (!order) return;
  const doc = buildDineInBillPdfDoc(order, vendor);
  if (!doc) return;
  const displayId = order.displayId || order.orderId;
  const fileName = `HyperDelivery-Bill-${displayId}.pdf`;

  // 1. Try native Web Share API with PDF file attachment
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const blob = doc.output('blob');
      const file = new File([blob], fileName, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Bill - ${vendor?.shopName || 'Restaurant'} (Table ${order.tableId || 'Dine-In'})`,
          text: `Bill for Table ${order.tableId || 'Dine-In'} • Total: Rs. ${order.totalPrice.toFixed(2)}`,
        });
        return;
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return; // User closed share sheet
      console.warn('Native PDF file sharing failed, falling back to WhatsApp/text share:', err);
    }
  }

  // 2. Fallback: WhatsApp share with itemized summary
  const itemsList = (order.items || [])
    .map((i: any) => `• ${i.quantity}x ${i.name} - Rs. ${(i.price * i.quantity).toFixed(2)}`)
    .join('\n');
  const shareText = `*${vendor?.shopName || 'Restaurant'} - Official Bill Receipt*\nTable: ${order.tableId ? `Table ${order.tableId}` : 'Dine-In'} | Order: #${displayId}\nDate: ${order.createdAt ? format(new Date(order.createdAt), 'dd MMM yyyy, hh:mm a') : ''}\n\n*Items Ordered:*\n${itemsList}\n\n*Total Amount: Rs. ${order.totalPrice.toFixed(2)}*\nPayment: Pay at Counter\n\n_Thank you for dining with us!_\nPowered by HyperDelivery.in`;

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
  window.open(whatsappUrl, '_blank');
};
