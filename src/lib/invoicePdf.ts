import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Invoice, InvoiceLineItem } from '@/lib/api2';
import { formatCurrency, formatDate } from '@/lib/format';

export function generateInvoicePdf(invoice: Invoice, items: InvoiceLineItem[]): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text('INVOICE', margin, 64);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`# ${invoice.invoice_number}`, margin, 82);
  doc.text(`Status: ${invoice.status.toUpperCase()}`, margin, 96);

  // From (right side)
  doc.setFont('helvetica', 'bold');
  doc.text('From', pageW - margin - 200, 64);
  doc.setFont('helvetica', 'normal');
  const fromLines = [
    invoice.from_name ?? '',
    invoice.from_email ?? '',
    ...(invoice.from_address ?? '').split('\n'),
  ].filter(Boolean);
  fromLines.forEach((l, i) => doc.text(l, pageW - margin - 200, 78 + i * 12));

  // Bill to
  const y = 150;
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To', margin, y);
  doc.setFont('helvetica', 'normal');
  const billLines = [
    invoice.client_name,
    invoice.client_email ?? '',
    ...(invoice.client_address ?? '').split('\n'),
  ].filter(Boolean);
  billLines.forEach((l, i) => doc.text(l, margin, y + 14 + i * 12));

  // Dates
  doc.setFont('helvetica', 'bold');
  doc.text('Issue Date', pageW - margin - 200, y);
  doc.text('Due Date', pageW - margin - 100, y);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(invoice.issue_date), pageW - margin - 200, y + 14);
  doc.text(invoice.due_date ? formatDate(invoice.due_date) : '—', pageW - margin - 100, y + 14);

  // Line items table
  const tableStartY = y + 14 + Math.max(billLines.length, 2) * 12 + 24;
  autoTable(doc, {
    startY: tableStartY,
    head: [['Description', 'Qty', 'Unit Price', 'Amount']],
    body: items.map((it) => [
      it.description,
      String(it.quantity),
      formatCurrency(it.unit_price, invoice.currency),
      formatCurrency(it.amount, invoice.currency),
    ]),
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [30, 30, 30] },
    columnStyles: {
      1: { halign: 'right', cellWidth: 50 },
      2: { halign: 'right', cellWidth: 90 },
      3: { halign: 'right', cellWidth: 90 },
    },
    margin: { left: margin, right: margin },
  });

  // Totals
  // @ts-expect-error jspdf-autotable extends doc with lastAutoTable
  const endY = (doc.lastAutoTable?.finalY ?? tableStartY + 100) + 16;
  const labelX = pageW - margin - 180;
  const valueX = pageW - margin;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal', labelX, endY);
  doc.text(formatCurrency(invoice.subtotal, invoice.currency), valueX, endY, { align: 'right' });
  doc.text(`Tax (${invoice.tax_rate}%)`, labelX, endY + 16);
  doc.text(formatCurrency(invoice.tax_amount, invoice.currency), valueX, endY + 16, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total', labelX, endY + 36);
  doc.text(formatCurrency(invoice.total, invoice.currency), valueX, endY + 36, { align: 'right' });

  // Notes / Terms
  let notesY = endY + 70;
  if (invoice.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Notes', margin, notesY);
    doc.setFont('helvetica', 'normal');
    const split = doc.splitTextToSize(invoice.notes, pageW - margin * 2);
    doc.text(split, margin, notesY + 14);
    notesY += 14 + split.length * 12 + 12;
  }
  if (invoice.terms) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Terms', margin, notesY);
    doc.setFont('helvetica', 'normal');
    const split = doc.splitTextToSize(invoice.terms, pageW - margin * 2);
    doc.text(split, margin, notesY + 14);
  }

  return doc;
}

export function downloadInvoicePdf(invoice: Invoice, items: InvoiceLineItem[]) {
  const doc = generateInvoicePdf(invoice, items);
  doc.save(`invoice-${invoice.invoice_number}.pdf`);
}
