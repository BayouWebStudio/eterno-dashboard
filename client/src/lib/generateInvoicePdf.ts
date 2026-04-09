import jsPDF from "jspdf";

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number; // cents
}

export interface InvoiceData {
  invoiceNumber: string;
  createdAt: number;
  dueDate?: string;
  clientName: string;
  clientEmail?: string;
  lineItems: InvoiceLineItem[];
  subtotal: number; // cents
  tax: number; // cents
  total: number; // cents
  currency: string;
  notes?: string;
  status: string;
  businessName?: string;
  businessEmail?: string;
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function generateInvoicePdf(invoice: InvoiceData): Blob {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Colors
  const gold = [201, 168, 76] as const; // #C9A84C
  const dark = [30, 30, 35] as const;
  const muted = [120, 120, 130] as const;

  // ── Header ──
  doc.setFontSize(28);
  doc.setTextColor(...gold);
  doc.text("INVOICE", margin, y + 8);

  doc.setFontSize(10);
  doc.setTextColor(...muted);
  doc.text(invoice.invoiceNumber, margin, y + 14);

  // Business info (top right)
  const bizName = invoice.businessName || "Eterno Web Studio";
  doc.setFontSize(11);
  doc.setTextColor(...dark);
  doc.text(bizName, pageWidth - margin, y + 4, { align: "right" });
  if (invoice.businessEmail) {
    doc.setFontSize(9);
    doc.setTextColor(...muted);
    doc.text(invoice.businessEmail, pageWidth - margin, y + 9, { align: "right" });
  }

  y += 24;

  // ── Gold accent line ──
  doc.setDrawColor(...gold);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ── Invoice details ──
  doc.setFontSize(9);
  doc.setTextColor(...muted);

  // Left column: Bill to
  doc.text("BILL TO", margin, y);
  y += 5;
  doc.setFontSize(11);
  doc.setTextColor(...dark);
  doc.text(invoice.clientName, margin, y);
  y += 5;
  if (invoice.clientEmail) {
    doc.setFontSize(9);
    doc.setTextColor(...muted);
    doc.text(invoice.clientEmail, margin, y);
    y += 5;
  }

  // Right column: Dates
  const detailsY = y - 15;
  doc.setFontSize(9);
  doc.setTextColor(...muted);
  doc.text("DATE", pageWidth - margin - 50, detailsY);
  doc.setTextColor(...dark);
  doc.text(formatDate(invoice.createdAt), pageWidth - margin - 50, detailsY + 5);

  if (invoice.dueDate) {
    doc.setTextColor(...muted);
    doc.text("DUE DATE", pageWidth - margin - 50, detailsY + 12);
    doc.setTextColor(...dark);
    doc.text(invoice.dueDate, pageWidth - margin - 50, detailsY + 17);
  }

  // Status badge
  const statusColors: Record<string, readonly [number, number, number]> = {
    draft: [120, 120, 130],
    sent: [59, 130, 246],
    paid: [34, 197, 94],
    cancelled: [239, 68, 68],
  };
  const statusColor = statusColors[invoice.status] || muted;
  doc.setFontSize(10);
  doc.setTextColor(...statusColor);
  doc.text(invoice.status.toUpperCase(), pageWidth - margin, detailsY, { align: "right" });

  y += 8;

  // ── Line items table ──
  // Header
  doc.setFillColor(245, 245, 248);
  doc.rect(margin, y, contentWidth, 8, "F");
  doc.setFontSize(8);
  doc.setTextColor(...muted);
  doc.text("DESCRIPTION", margin + 3, y + 5.5);
  doc.text("QTY", margin + contentWidth * 0.6, y + 5.5);
  doc.text("UNIT PRICE", margin + contentWidth * 0.72, y + 5.5);
  doc.text("AMOUNT", pageWidth - margin - 3, y + 5.5, { align: "right" });
  y += 10;

  // Rows
  doc.setFontSize(10);
  for (const item of invoice.lineItems) {
    doc.setTextColor(...dark);
    doc.text(item.description, margin + 3, y + 4);
    doc.text(String(item.quantity), margin + contentWidth * 0.6, y + 4);
    doc.text(formatCurrency(item.unitPrice), margin + contentWidth * 0.72, y + 4);
    doc.text(formatCurrency(item.quantity * item.unitPrice), pageWidth - margin - 3, y + 4, { align: "right" });

    // Separator line
    y += 7;
    doc.setDrawColor(230, 230, 235);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 2;
  }

  y += 4;

  // ── Totals ──
  const totalsX = pageWidth - margin - 60;

  doc.setFontSize(9);
  doc.setTextColor(...muted);
  doc.text("Subtotal", totalsX, y + 4);
  doc.setTextColor(...dark);
  doc.text(formatCurrency(invoice.subtotal), pageWidth - margin - 3, y + 4, { align: "right" });
  y += 7;

  if (invoice.tax > 0) {
    doc.setTextColor(...muted);
    doc.text("Tax", totalsX, y + 4);
    doc.setTextColor(...dark);
    doc.text(formatCurrency(invoice.tax), pageWidth - margin - 3, y + 4, { align: "right" });
    y += 7;
  }

  // Total with gold accent
  doc.setDrawColor(...gold);
  doc.setLineWidth(0.5);
  doc.line(totalsX, y, pageWidth - margin, y);
  y += 2;

  doc.setFontSize(13);
  doc.setTextColor(...gold);
  doc.text("Total", totalsX, y + 6);
  doc.text(formatCurrency(invoice.total), pageWidth - margin - 3, y + 6, { align: "right" });
  y += 14;

  // ── Notes ──
  if (invoice.notes) {
    doc.setFontSize(9);
    doc.setTextColor(...muted);
    doc.text("NOTES", margin, y);
    y += 5;
    doc.setFontSize(9);
    doc.setTextColor(...dark);
    const lines = doc.splitTextToSize(invoice.notes, contentWidth);
    doc.text(lines, margin, y);
    y += lines.length * 4 + 4;
  }

  // ── Footer ──
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setTextColor(...muted);
  doc.text(`Generated by ${invoice.businessName || "Eterno Web Studio"}`, margin, footerY);
  doc.text(invoice.invoiceNumber, pageWidth - margin, footerY, { align: "right" });

  return doc.output("blob");
}
