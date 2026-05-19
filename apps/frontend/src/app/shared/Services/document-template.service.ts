import { Injectable } from '@angular/core';
import {
  DocumentType,
  DocumentTypeSettings,
  DocumentTemplate,
  DEFAULT_SALE_SETTINGS,
  DEFAULT_INVOICE_SETTINGS,
  DEFAULT_QUOTATION_SETTINGS,
} from '../interfaces/settings.interface';

export interface DocumentData {
  // Common header
  docNumber: string;
  docDate: string;
  dueDate?: string;
  docType: DocumentType;
  // Organization
  orgName: string;
  orgAddress?: string;
  orgPhone?: string;
  orgEmail?: string;
  orgLogo?: string;
  // Customer
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerType?: 'INDIVIDUAL' | 'BUSINESS';
  kraPin?: string;
  // Items
  items: DocumentItem[];
  // Totals
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  amountPaid?: number;
  balanceDue?: number;
  paymentMethod?: string;
  // Footer
  notes?: string;
  terms?: string;
}

export interface DocumentItem {
  name: string;
  sku?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxRate?: number;
  total: number;
}

@Injectable({ providedIn: 'root' })
export class DocumentTemplateService {
  getDefaultSettings(type: DocumentType): DocumentTypeSettings {
    switch (type) {
      case 'invoice':
        return { ...DEFAULT_INVOICE_SETTINGS };
      case 'quotation':
        return { ...DEFAULT_QUOTATION_SETTINGS };
      default:
        return { ...DEFAULT_SALE_SETTINGS };
    }
  }

  render(data: DocumentData, settings: DocumentTypeSettings): string {
    switch (settings.template) {
      case 'modern-bold':
        return this.renderModernBold(data, settings);
      case 'minimal':
        return this.renderMinimal(data, settings);
      case 'branded':
        return this.renderBranded(data, settings);
      case 'compact':
        return this.renderCompact(data, settings);
      default:
        return this.renderClassic(data, settings);
    }
  }

  private formatCurrency(amount: number): string {
    return (
      'KSH ' +
      amount.toLocaleString('en-KE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  private formatDate(d: string): string {
    try {
      return new Date(d).toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return d;
    }
  }

  private getDocLabel(type: DocumentType): string {
    return type === 'invoice'
      ? 'INVOICE'
      : type === 'quotation'
        ? 'QUOTATION'
        : 'SALES RECEIPT';
  }

  private sharedStyles(settings: DocumentTypeSettings): string {
    const paper =
      settings.paperSize === 'A5'
        ? '148mm'
        : settings.paperSize === 'Letter'
          ? '216mm'
          : '210mm';
    const pageSize = settings.paperSize === 'A5' ? 'A5' : settings.paperSize === 'Letter' ? 'letter' : 'A4';

    return `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        color-adjust: exact;
      }
      body {
        font-family: 'Inter', Arial, sans-serif;
        color: #1a1a1a;
        background: #fff;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .page {
        width: ${paper};
        min-height: 297mm;
        margin: 0 auto;
        background: #fff;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      th, td {
        padding: 8px 10px;
        text-align: left;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      @media screen {
        .page {
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          margin: 20px auto;
        }
      }

      @media print {
        @page {
          margin: 0;
          size: ${pageSize} portrait;
        }
        html, body {
          width: 100%;
          height: 100%;
          margin: 0 !important;
          padding: 0 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        .page {
          width: 100%;
          margin: 0;
          box-shadow: none;
          page-break-after: auto;
        }
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        table {
          page-break-inside: auto;
          border-collapse: collapse !important;
        }
        tr {
          page-break-inside: avoid;
          page-break-after: auto;
        }
        th, td {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        thead {
          display: table-header-group;
        }
        tfoot {
          display: table-footer-group;
        }
        img {
          max-width: 100%;
          page-break-inside: avoid;
        }
        /* Preserve all backgrounds and colors */
        div[style*="background"],
        span[style*="background"],
        td[style*="background"],
        th[style*="background"] {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `;
  }

  private itemsTable(
    data: DocumentData,
    settings: DocumentTypeSettings,
    accentColor: string,
  ): string {
    const showSku = settings.showItemSku;
    const showDesc = settings.showItemDescription;
    const showTax = settings.showItemTax;
    const showDisc = settings.showItemDiscount;
    const ac = accentColor;

    const thStyle = `background:${ac};color:#fff;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;padding:9px 10px;`;
    const headers = [
      `<th style="${thStyle}text-align:center;width:28px">#</th>`,
      `<th style="${thStyle}">Description</th>`,
    ];
    if (showSku) headers.push(`<th style="${thStyle}">SKU</th>`);
    headers.push(`<th style="${thStyle}text-align:right">Qty</th>`);
    headers.push(`<th style="${thStyle}text-align:right">Unit Price</th>`);
    if (showDisc)
      headers.push(`<th style="${thStyle}text-align:right">Disc.</th>`);
    if (showTax)
      headers.push(`<th style="${thStyle}text-align:right">Tax%</th>`);
    headers.push(`<th style="${thStyle}text-align:right">Total</th>`);

    const rows = data.items
      .map((item, i) => {
        const bg = i % 2 === 0 ? '#fff' : '#f8fafb';
        const tdStyle = `background:${bg};padding:9px 10px;font-size:13px;border-bottom:1px solid #f0f0f0;`;
        const cells = [
          `<td style="${tdStyle}text-align:center;color:#999;font-size:11px">${i + 1}</td>`,
          `<td style="${tdStyle}">${item.name}${showDesc && item.description ? `<br><span style="font-size:11px;color:#888">${item.description}</span>` : ''}${showSku && item.sku && !showSku ? '' : ''}</td>`,
        ];
        if (showSku)
          cells.push(
            `<td style="${tdStyle}font-size:11px;color:#777">${item.sku || '–'}</td>`,
          );
        cells.push(
          `<td style="${tdStyle}text-align:right">${item.quantity}</td>`,
        );
        cells.push(
          `<td style="${tdStyle}text-align:right">${this.formatCurrency(item.unitPrice)}</td>`,
        );
        if (showDisc)
          cells.push(
            `<td style="${tdStyle}text-align:right">${item.discount ? this.formatCurrency(item.discount) : '–'}</td>`,
          );
        if (showTax)
          cells.push(
            `<td style="${tdStyle}text-align:right">${item.taxRate != null ? item.taxRate + '%' : '–'}</td>`,
          );
        cells.push(
          `<td style="${tdStyle}text-align:right;font-weight:600">${this.formatCurrency(item.total)}</td>`,
        );
        return `<tr>${cells.join('')}</tr>`;
      })
      .join('');

    return `<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden">
<thead><tr>${headers.join('')}</tr></thead>
<tbody>${rows}</tbody>
</table>`;
  }

  private totalsBlock(
    data: DocumentData,
    settings: DocumentTypeSettings,
    ac: string,
  ): string {
    const row = (label: string, val: string, accent = false, red = false) => {
      const style = accent
        ? `background:${ac};color:#fff;font-weight:700;font-size:15px;`
        : red
          ? `color:#dc2626;font-weight:600;font-size:13px;`
          : `color:#555;font-size:13px;`;
      return `<tr>
        <td style="padding:7px 14px;text-align:right;${style}">${label}</td>
        <td style="padding:7px 14px;text-align:right;${style}">${val}</td>
      </tr>`;
    };
    const rows: string[] = [];
    if (settings.showSubtotal)
      rows.push(row('Subtotal', this.formatCurrency(data.subtotal)));
    if (settings.showDiscount && data.discountAmount > 0)
      rows.push(
        row('Total Discount', '–' + this.formatCurrency(data.discountAmount)),
      );
    if (settings.showTaxBreakdown && data.taxAmount > 0)
      rows.push(row('Tax / VAT', this.formatCurrency(data.taxAmount)));
    rows.push(row('TOTAL', this.formatCurrency(data.total), true));
    if (
      settings.showAmountPaid &&
      data.amountPaid != null &&
      data.amountPaid > 0
    )
      rows.push(row('Amount Paid', this.formatCurrency(data.amountPaid)));
    if (settings.showBalanceDue && data.balanceDue != null)
      rows.push(
        row(
          'Balance Due',
          this.formatCurrency(data.balanceDue),
          false,
          data.balanceDue > 0,
        ),
      );
    return `<table style="min-width:280px;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;border-collapse:collapse">
<tbody>${rows.join('')}</tbody></table>`;
  }

  private notesBox(data: DocumentData, settings: DocumentTypeSettings): string {
    if (!settings.showNotes || !data.notes) return '';
    return `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:12px 16px;margin-bottom:16px;font-size:12px;">
  <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#92400e;margin-bottom:4px">Notes / Instructions</div>
  <div style="color:#78350f">${data.notes}</div>
</div>`;
  }

  private termsBox(
    data: DocumentData,
    settings: DocumentTypeSettings,
    ac: string,
  ): string {
    if (!settings.showTermsAndConditions || !data.terms) return '';
    const lines = data.terms.split('\n').filter(Boolean);
    const listItems = lines
      .map((l) => `<li style="margin-bottom:3px">${l}</li>`)
      .join('');
    return `<div style="margin-top:12px;margin-bottom:16px;">
  <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${ac};margin-bottom:6px">Payment Terms &amp; Conditions</div>
  <div style="border-left:3px solid ${ac};padding:8px 12px;background:#f8f9fa;border-radius:0 6px 6px 0;font-size:12px;color:#555">
    <ul style="margin:0;padding-left:16px">${listItems}</ul>
  </div>
</div>`;
  }

  private eoeFooter(settings: DocumentTypeSettings): string {
    const thankYou = settings.showThankYouMessage
      ? 'Thank you for your business!'
      : '';
    const custom = settings.customFooterText || '';
    return `<div style="text-align:center;font-size:11px;color:#888;padding:12px 0;">
  ${thankYou ? `<div style="margin-bottom:2px;font-style:italic">${thankYou}</div>` : ''}
  <div><em>E &amp; O.E – Errors and Omissions Excepted</em></div>
  ${custom ? `<div style="margin-top:2px">${custom}</div>` : ''}
</div>`;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TEMPLATE 1: Classic  — clean corporate, accent header band, info bar
  // ─────────────────────────────────────────────────────────────────────────────
  renderClassic(data: DocumentData, settings: DocumentTypeSettings): string {
    const label = this.getDocLabel(data.docType);
    const ac = settings.accentColor;

    const sigBlock = settings.showSignatureLine
      ? `<div style="display:flex;justify-content:space-between;margin-top:36px;padding:0 24px;">
          <div style="text-align:center;width:180px"><div style="border-top:1px solid #999;margin-bottom:4px;"></div><span style="font-size:11px;color:#777">Authorized Signature</span></div>
          <div style="text-align:center;width:180px"><div style="border-top:1px solid #999;margin-bottom:4px;"></div><span style="font-size:11px;color:#777">Customer Signature</span></div>
        </div>`
      : '';

    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
${this.sharedStyles(settings)}
body { font-size:13px; color:#1a1a1a; }
.page { display:flex; flex-direction:column; min-height:297mm; }
.hdr { display:flex; justify-content:space-between; align-items:flex-start; padding:28px 36px 20px; border-bottom:3px solid ${ac}; }
.org-name { font-size:18px; font-weight:700; color:#1a1a1a; margin-bottom:2px; }
.org-detail { font-size:11px; color:#666; margin-top:1px; }
.doc-title { font-size:34px; font-weight:800; color:${ac}; letter-spacing:1px; text-align:right; }
.doc-meta { font-size:12px; color:#666; text-align:right; margin-top:4px; }
.info-bar { display:flex; background:#f8f9fa; border-bottom:1px solid #e5e7eb; }
.info-cell { flex:1; padding:10px 36px; border-right:1px solid #e5e7eb; }
.info-cell:last-child { border-right:none; }
.info-lbl { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1.2px; color:#999; margin-bottom:2px; }
.info-val { font-size:13px; font-weight:600; color:#1a1a1a; }
.body { padding:20px 36px; flex:1; }
.bill-box { background:#f8f9fa; border-radius:6px; padding:14px 18px; margin-bottom:18px; display:inline-block; min-width:260px; }
.bill-lbl { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; color:${ac}; padding-bottom:5px; border-bottom:2px solid ${ac}; margin-bottom:8px; display:inline-block; }
.bill-name { font-size:14px; font-weight:700; margin-bottom:3px; }
.bill-detail { font-size:12px; color:#555; margin-top:1px; }
.totals-wrap { display:flex; justify-content:flex-end; margin:16px 0; }
.footer-bar { background:#f8f9fa; border-top:1px solid #e5e7eb; padding:10px 36px; display:flex; justify-content:space-between; align-items:center; font-size:11px; color:#999; }
</style></head><body><div class="page">

<div class="hdr">
  <div>
    ${settings.showLogo && data.orgLogo ? `<img src="${data.orgLogo}" style="height:60px;max-width:190px;object-fit:contain;display:block;margin-bottom:6px;" alt="logo">` : ''}
    ${settings.showOrgName ? `<div class="org-name">${data.orgName}</div>` : ''}
    ${settings.showOrgAddress && data.orgAddress ? `<div class="org-detail">${data.orgAddress}</div>` : ''}
    ${settings.showOrgPhone && data.orgPhone ? `<div class="org-detail">Tel: ${data.orgPhone}</div>` : ''}
    ${settings.showOrgEmail && data.orgEmail ? `<div class="org-detail">${data.orgEmail}</div>` : ''}
  </div>
  <div>
    <div class="doc-title">${label}</div>
    <div class="doc-meta">${label} No: <strong>${data.docNumber}</strong></div>
  </div>
</div>

<div class="info-bar">
  <div class="info-cell">
    <div class="info-lbl">Issue Date</div>
    <div class="info-val">${this.formatDate(data.docDate)}</div>
  </div>
  ${data.dueDate ? `<div class="info-cell"><div class="info-lbl">Due Date</div><div class="info-val" style="color:${ac}">${this.formatDate(data.dueDate)}</div></div>` : ''}
  ${settings.showPaymentMethod && data.paymentMethod ? `<div class="info-cell"><div class="info-lbl">Payment Method</div><div class="info-val">${data.paymentMethod}</div></div>` : ''}
  ${settings.showAmountPaid && data.amountPaid != null ? `<div class="info-cell"><div class="info-lbl">Amount Paid</div><div class="info-val" style="color:#16a34a">${this.formatCurrency(data.amountPaid)}</div></div>` : ''}
</div>

<div class="body">
  <div class="bill-box">
    <div class="bill-lbl">Bill To</div>
    <div class="bill-name">${data.customerName}</div>
    <div class="bill-detail">Phone: ${data.customerPhone || 'N/A'}</div>
    <div class="bill-detail">Email: ${data.customerEmail || 'N/A'}</div>
    ${data.customerAddress ? `<div class="bill-detail">${data.customerAddress}</div>` : ''}
    ${settings.showCustomerType && data.customerType ? `<div class="bill-detail" style="margin-top:4px"><span style="background:${data.customerType === 'BUSINESS' ? '#e0e7ff' : '#dbeafe'};color:${data.customerType === 'BUSINESS' ? '#3730a3' : '#1d4ed8'};padding:2px 6px;border-radius:3px;font-size:11px">${data.customerType}</span></div>` : ''}
    ${settings.showKraPin ? `<div class="bill-detail">KRA PIN: ${data.kraPin || 'N/A'}</div>` : ''}
  </div>

  ${this.itemsTable(data, settings, ac)}

  ${this.notesBox(data, settings)}
  <div class="totals-wrap">${this.totalsBlock(data, settings, ac)}</div>
  ${this.termsBox(data, settings, ac)}
  ${sigBlock}
</div>

<div class="footer-bar">
  <em>E &amp; O.E – Errors and Omissions Excepted</em>
  <span>${settings.showThankYouMessage ? 'Thank you for your business!' : ''}${settings.customFooterText ? '  ·  ' + settings.customFooterText : ''}</span>
</div>

</div></body></html>`;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TEMPLATE 2: Modern Bold  — full-width accent header, 3-col date bar
  // ─────────────────────────────────────────────────────────────────────────────
  renderModernBold(data: DocumentData, settings: DocumentTypeSettings): string {
    const label = this.getDocLabel(data.docType);
    const ac = settings.accentColor;

    const sigBlock = settings.showSignatureLine
      ? `<div style="display:flex;justify-content:space-between;margin-top:36px;">
          <div style="text-align:center;width:180px"><div style="border-top:1px solid rgba(255,255,255,.4);margin-bottom:4px;"></div><span style="font-size:11px;opacity:.7">Authorized Signature</span></div>
          <div style="text-align:center;width:180px"><div style="border-top:1px solid rgba(255,255,255,.4);margin-bottom:4px;"></div><span style="font-size:11px;opacity:.7">Customer Signature</span></div>
        </div>`
      : '';

    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
${this.sharedStyles(settings)}
body { font-size:13px; }
.hdr { background:${ac}; color:#fff; padding:28px 36px; display:flex; justify-content:space-between; align-items:center; }
.org-name { font-size:22px; font-weight:700; margin-bottom:2px; }
.org-detail { font-size:11px; opacity:.8; margin-top:1px; }
.doc-title { font-size:38px; font-weight:800; letter-spacing:2px; text-align:right; }
.doc-num { font-size:13px; opacity:.85; text-align:right; margin-top:3px; }
.info-bar { display:flex; background:#fff; border-bottom:2px solid #f0f0f0; }
.info-cell { flex:1; padding:12px 36px; border-right:1px solid #e5e7eb; }
.info-cell:last-child { border-right:none; }
.info-lbl { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1.2px; color:${ac}; margin-bottom:2px; }
.info-val { font-size:13px; font-weight:600; color:#1a1a1a; }
.body { padding:22px 36px; }
.bill-box { margin-bottom:18px; padding-bottom:16px; border-bottom:1px solid #f0f0f0; }
.bill-lbl { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; color:${ac}; padding-bottom:4px; border-bottom:2px solid ${ac}; margin-bottom:8px; display:inline-block; }
.bill-name { font-size:15px; font-weight:700; margin-bottom:3px; }
.bill-detail { font-size:12px; color:#555; margin-top:1px; }
.totals-wrap { display:flex; justify-content:flex-end; margin:16px 0; }
.footer-bar { background:${ac}; color:rgba(255,255,255,.8); padding:10px 36px; display:flex; justify-content:space-between; align-items:center; font-size:11px; }
</style></head><body><div class="page">

<div class="hdr">
  <div>
    ${settings.showLogo && data.orgLogo ? `<img src="${data.orgLogo}" style="height:52px;max-width:180px;object-fit:contain;display:block;margin-bottom:6px;background:#fff;padding:4px;border-radius:4px;" alt="logo">` : ''}
    ${settings.showOrgName ? `<div class="org-name">${data.orgName}</div>` : ''}
    ${settings.showOrgAddress && data.orgAddress ? `<div class="org-detail">${data.orgAddress}</div>` : ''}
    ${settings.showOrgPhone && data.orgPhone ? `<div class="org-detail">Tel: ${data.orgPhone}</div>` : ''}
    ${settings.showOrgEmail && data.orgEmail ? `<div class="org-detail">${data.orgEmail}</div>` : ''}
  </div>
  <div>
    <div class="doc-title">${label}</div>
    <div class="doc-num"># ${data.docNumber}</div>
    <div style="font-size:12px;opacity:.75;text-align:right;margin-top:2px">${this.formatDate(data.docDate)}</div>
  </div>
</div>

<div class="info-bar">
  <div class="info-cell">
    <div class="info-lbl">Issue Date</div>
    <div class="info-val">${this.formatDate(data.docDate)}</div>
  </div>
  ${data.dueDate ? `<div class="info-cell"><div class="info-lbl">Due Date</div><div class="info-val" style="color:${ac}">${this.formatDate(data.dueDate)}</div></div>` : ''}
  ${settings.showPaymentMethod && data.paymentMethod ? `<div class="info-cell"><div class="info-lbl">Payment Method</div><div class="info-val">${data.paymentMethod}</div></div>` : ''}
  ${settings.showBalanceDue && data.balanceDue != null ? `<div class="info-cell"><div class="info-lbl">Balance Due</div><div class="info-val" style="color:${data.balanceDue > 0 ? '#dc2626' : '#16a34a'}">${this.formatCurrency(data.balanceDue)}</div></div>` : ''}
</div>

<div class="body">
  <div class="bill-box">
    <div class="bill-lbl">Bill To</div>
    <div class="bill-name">${data.customerName}</div>
    <div class="bill-detail">Phone: ${data.customerPhone || 'N/A'}</div>
    <div class="bill-detail">Email: ${data.customerEmail || 'N/A'}</div>
    ${data.customerAddress ? `<div class="bill-detail">${data.customerAddress}</div>` : ''}
    ${settings.showCustomerType && data.customerType ? `<div class="bill-detail" style="margin-top:4px"><span style="background:${data.customerType === 'BUSINESS' ? '#e0e7ff' : '#dbeafe'};color:${data.customerType === 'BUSINESS' ? '#3730a3' : '#1d4ed8'};padding:2px 7px;border-radius:3px;font-size:11px">${data.customerType}</span></div>` : ''}
    ${settings.showKraPin ? `<div class="bill-detail">KRA PIN: ${data.kraPin || 'N/A'}</div>` : ''}
  </div>

  ${this.itemsTable(data, settings, ac)}
  ${this.notesBox(data, settings)}
  <div class="totals-wrap">${this.totalsBlock(data, settings, ac)}</div>
  ${this.termsBox(data, settings, ac)}
  ${sigBlock}
</div>

<div class="footer-bar">
  <em>E &amp; O.E – Errors and Omissions Excepted</em>
  <span>${settings.showThankYouMessage ? 'Thank you for your business!' : ''}${settings.customFooterText ? '  ·  ' + settings.customFooterText : ''}</span>
</div>

</div></body></html>`;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TEMPLATE 3: Minimal  — elegant inline header, thin dividers, clean type
  // ─────────────────────────────────────────────────────────────────────────────
  renderMinimal(data: DocumentData, settings: DocumentTypeSettings): string {
    const label = this.getDocLabel(data.docType);
    const ac = settings.accentColor;

    const showSku = settings.showItemSku;
    const showTax = settings.showItemTax;
    const showDisc = settings.showItemDiscount;
    const showDesc = settings.showItemDescription;

    const thMin = `font-weight:500;color:#999;font-size:10px;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e5e7eb;padding:7px 0;`;
    const itemHeaders = [
      `<th style="${thMin}text-align:center;width:24px">#</th>`,
      `<th style="${thMin}">Description</th>`,
      showSku ? `<th style="${thMin}">SKU</th>` : '',
      `<th style="${thMin}text-align:right">Qty</th>`,
      `<th style="${thMin}text-align:right">Price</th>`,
      showDisc ? `<th style="${thMin}text-align:right">Disc.</th>` : '',
      showTax ? `<th style="${thMin}text-align:right">Tax%</th>` : '',
      `<th style="${thMin}text-align:right">Total</th>`,
    ]
      .filter(Boolean)
      .join('');

    const itemRows = data.items
      .map((item, i) => {
        const tdMin = `padding:9px 0;border-bottom:1px solid #f3f4f6;font-size:13px;`;
        const cells = [
          `<td style="${tdMin}text-align:center;color:#bbb;font-size:11px">${i + 1}</td>`,
          `<td style="${tdMin}">${item.name}${showDesc && item.description ? `<br><span style="font-size:11px;color:#aaa">${item.description}</span>` : ''}${showSku && item.sku ? `<br><span style="font-size:10px;color:#bbb">${item.sku}</span>` : ''}</td>`,
          showSku
            ? `<td style="${tdMin}color:#999;font-size:11px">${item.sku || '–'}</td>`
            : '',
          `<td style="${tdMin}text-align:right;color:#555">${item.quantity}</td>`,
          `<td style="${tdMin}text-align:right;color:#555">${this.formatCurrency(item.unitPrice)}</td>`,
          showDisc
            ? `<td style="${tdMin}text-align:right;color:#555">${item.discount ? this.formatCurrency(item.discount) : '–'}</td>`
            : '',
          showTax
            ? `<td style="${tdMin}text-align:right;color:#555">${item.taxRate != null ? item.taxRate + '%' : '–'}</td>`
            : '',
          `<td style="${tdMin}text-align:right;font-weight:600">${this.formatCurrency(item.total)}</td>`,
        ]
          .filter(Boolean)
          .join('');
        return `<tr>${cells}</tr>`;
      })
      .join('');

    const sigBlock = settings.showSignatureLine
      ? `<div style="display:flex;justify-content:space-between;margin-top:40px;">
          <div style="text-align:center;width:180px"><div style="border-top:1px solid #ccc;margin-bottom:4px;"></div><span style="font-size:11px;color:#aaa">Authorized Signature</span></div>
          <div style="text-align:center;width:180px"><div style="border-top:1px solid #ccc;margin-bottom:4px;"></div><span style="font-size:11px;color:#aaa">Customer Signature</span></div>
        </div>`
      : '';

    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
${this.sharedStyles(settings)}
body { font-size:13px; color:#222; }
.wrap { padding:44px 52px; }
.top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:28px; }
.org-inline { display:flex; align-items:center; gap:14px; }
.org-name { font-size:17px; font-weight:700; color:#1a1a1a; }
.org-detail { font-size:11px; color:#888; margin-top:1px; }
.doc-lbl { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:2.5px; color:${ac}; margin-bottom:4px; }
.doc-num { font-size:24px; font-weight:300; color:#333; }
.doc-date { font-size:12px; color:#aaa; margin-top:4px; }
hr.div { border:none; border-top:1px solid #efefef; margin:20px 0; }
.bill-section { display:flex; gap:32px; margin-bottom:20px; align-items:flex-start; }
.bill-lbl { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; color:${ac}; padding-bottom:4px; border-bottom:1.5px solid ${ac}; margin-bottom:7px; display:inline-block; }
.bill-name { font-size:14px; font-weight:600; margin-bottom:2px; }
.bill-detail { font-size:12px; color:#666; margin-top:1px; }
.dates-mini { text-align:right; }
.dates-mini .d-lbl { font-size:9px; font-weight:600; text-transform:uppercase; letter-spacing:1px; color:#bbb; margin-bottom:1px; }
.dates-mini .d-val { font-size:13px; font-weight:600; margin-bottom:8px; color:#333; }
.totals-wrap { display:flex; justify-content:flex-end; margin-top:16px; }
</style></head><body><div class="page"><div class="wrap">

<div class="top">
  <div class="org-inline">
    ${settings.showLogo && data.orgLogo ? `<img src="${data.orgLogo}" style="height:52px;max-width:160px;object-fit:contain;" alt="logo">` : ''}
    <div>
      ${settings.showOrgName ? `<div class="org-name">${data.orgName}</div>` : ''}
      ${settings.showOrgAddress && data.orgAddress ? `<div class="org-detail">${data.orgAddress}</div>` : ''}
      ${settings.showOrgPhone && data.orgPhone ? `<div class="org-detail">Tel: ${data.orgPhone}</div>` : ''}
      ${settings.showOrgEmail && data.orgEmail ? `<div class="org-detail">${data.orgEmail}</div>` : ''}
    </div>
  </div>
  <div style="text-align:right">
    <div class="doc-lbl">${label}</div>
    <div class="doc-num"># ${data.docNumber}</div>
    <div class="doc-date">${this.formatDate(data.docDate)}</div>
    ${data.dueDate ? `<div class="doc-date" style="color:${ac}">Due: ${this.formatDate(data.dueDate)}</div>` : ''}
    ${settings.showPaymentMethod && data.paymentMethod ? `<div class="doc-date">${data.paymentMethod}</div>` : ''}
  </div>
</div>

<hr class="div">

<div class="bill-section">
  <div style="flex:1">
    <div class="bill-lbl">Bill To</div>
    <div class="bill-name">${data.customerName}</div>
    <div class="bill-detail">${data.customerPhone || 'N/A'}</div>
    <div class="bill-detail">${data.customerEmail || 'N/A'}</div>
    ${data.customerAddress ? `<div class="bill-detail">${data.customerAddress}</div>` : ''}
    ${settings.showKraPin ? `<div class="bill-detail">KRA PIN: ${data.kraPin || 'N/A'}</div>` : ''}
  </div>
  <div class="dates-mini">
    <div class="d-lbl">Issue Date</div>
    <div class="d-val">${this.formatDate(data.docDate)}</div>
    ${data.dueDate ? `<div class="d-lbl">Due Date</div><div class="d-val" style="color:${ac}">${this.formatDate(data.dueDate)}</div>` : ''}
    ${settings.showAmountPaid && data.amountPaid != null ? `<div class="d-lbl">Amount Paid</div><div class="d-val" style="color:#16a34a">${this.formatCurrency(data.amountPaid)}</div>` : ''}
  </div>
</div>

<hr class="div">

<table style="width:100%;border-collapse:collapse">
<thead><tr>${itemHeaders}</tr></thead>
<tbody>${itemRows}</tbody>
</table>

${this.notesBox(data, settings)}
<div class="totals-wrap">${this.totalsBlock(data, settings, ac)}</div>
<hr class="div">
${this.termsBox(data, settings, ac)}
${sigBlock}

<div style="text-align:center;font-size:11px;color:#bbb;margin-top:24px">
  ${settings.showThankYouMessage ? `<div style="margin-bottom:2px;font-style:italic;color:#888">Thank you for your business!</div>` : ''}
  <em>E &amp; O.E – Errors and Omissions Excepted</em>
  ${settings.customFooterText ? `<div style="margin-top:2px">${settings.customFooterText}</div>` : ''}
</div>

</div></div></body></html>`;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TEMPLATE 4: Branded  — gradient hero header, 2-col body, sidebar totals
  // ─────────────────────────────────────────────────────────────────────────────
  renderBranded(data: DocumentData, settings: DocumentTypeSettings): string {
    const label = this.getDocLabel(data.docType);
    const ac = settings.accentColor;

    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
${this.sharedStyles(settings)}
body { font-size:13px; }
.hero { background: linear-gradient(135deg, ${ac} 0%, ${ac}dd 100%); color:#fff; padding:32px 36px; display:flex; justify-content:space-between; align-items:center; }
.org-name { font-size:22px; font-weight:700; margin-bottom:2px; }
.org-detail { font-size:11px; opacity:.8; margin-top:1px; }
.doc-lbl { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:2px; opacity:.85; text-align:right; }
.doc-num { font-size:30px; font-weight:300; text-align:right; }
.info-strip { display:flex; background:#f8f9fa; border-bottom:1px solid #e5e7eb; }
.info-cell { flex:1; padding:10px 36px; border-right:1px solid #e5e7eb; }
.info-cell:last-child { border-right:none; }
.info-lbl { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1.2px; color:${ac}; margin-bottom:2px; }
.info-val { font-size:13px; font-weight:600; color:#1a1a1a; }
.body { padding:22px 36px; display:flex; gap:24px; }
.main { flex:1; min-width:0; }
.sidebar { width:230px; flex-shrink:0; }
.bill-box { background:#f0f9ff; border-left:4px solid ${ac}; border-radius:0 6px 6px 0; padding:14px 16px; margin-bottom:18px; }
.bill-lbl { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; color:${ac}; margin-bottom:6px; }
.bill-name { font-size:14px; font-weight:700; margin-bottom:2px; }
.bill-detail { font-size:12px; color:#555; margin-top:1px; }
.totals-card { border:1.5px solid ${ac}; border-radius:8px; overflow:hidden; }
.totals-card .tc-row { display:flex; justify-content:space-between; padding:7px 14px; font-size:13px; border-bottom:1px solid #f0f0f0; }
.totals-card .tc-row:last-child { border-bottom:none; }
.totals-card .tc-lbl { color:#666; }
.totals-card .tc-total { background:${ac}; color:#fff; font-weight:700; font-size:15px; }
.totals-card .tc-total .tc-lbl { color:rgba(255,255,255,.85); }
.totals-card .tc-balance-red .tc-lbl, .totals-card .tc-balance-red .tc-val { color:#dc2626; font-weight:600; }
.totals-card .tc-paid .tc-lbl, .totals-card .tc-paid .tc-val { color:#16a34a; }
.footer-bar { background:#f8f9fa; border-top:1px solid #e5e7eb; padding:10px 36px; display:flex; justify-content:space-between; align-items:center; font-size:11px; color:#999; }
</style></head><body><div class="page">

<div class="hero">
  <div>
    ${settings.showLogo && data.orgLogo ? `<img src="${data.orgLogo}" style="height:50px;max-width:170px;object-fit:contain;display:block;margin-bottom:6px;background:#fff;padding:4px;border-radius:4px;" alt="logo">` : ''}
    ${settings.showOrgName ? `<div class="org-name">${data.orgName}</div>` : ''}
    ${settings.showOrgAddress && data.orgAddress ? `<div class="org-detail">${data.orgAddress}</div>` : ''}
    ${settings.showOrgPhone && data.orgPhone ? `<div class="org-detail">Tel: ${data.orgPhone}</div>` : ''}
    ${settings.showOrgEmail && data.orgEmail ? `<div class="org-detail">${data.orgEmail}</div>` : ''}
  </div>
  <div>
    <div class="doc-lbl">${label}</div>
    <div class="doc-num"># ${data.docNumber}</div>
    <div style="font-size:12px;opacity:.75;text-align:right;margin-top:4px">${this.formatDate(data.docDate)}</div>
    ${data.dueDate ? `<div style="font-size:12px;opacity:.7;text-align:right">Due: ${this.formatDate(data.dueDate)}</div>` : ''}
  </div>
</div>

<div class="info-strip">
  <div class="info-cell">
    <div class="info-lbl">Issue Date</div>
    <div class="info-val">${this.formatDate(data.docDate)}</div>
  </div>
  ${data.dueDate ? `<div class="info-cell"><div class="info-lbl">Due Date</div><div class="info-val" style="color:${ac}">${this.formatDate(data.dueDate)}</div></div>` : ''}
  ${settings.showPaymentMethod && data.paymentMethod ? `<div class="info-cell"><div class="info-lbl">Payment</div><div class="info-val">${data.paymentMethod}</div></div>` : ''}
</div>

<div class="body">
  <div class="main">
    <div class="bill-box">
      <div class="bill-lbl">Bill To</div>
      <div class="bill-name">${data.customerName}</div>
      <div class="bill-detail">Phone: ${data.customerPhone || 'N/A'}</div>
      <div class="bill-detail">Email: ${data.customerEmail || 'N/A'}</div>
      ${data.customerAddress ? `<div class="bill-detail">${data.customerAddress}</div>` : ''}
      ${settings.showCustomerType && data.customerType ? `<div class="bill-detail" style="margin-top:4px"><span style="background:#fff;padding:1px 6px;border-radius:3px;font-size:11px;color:${ac};border:1px solid ${ac}">${data.customerType}</span></div>` : ''}
      ${settings.showKraPin ? `<div class="bill-detail">KRA PIN: ${data.kraPin || 'N/A'}</div>` : ''}
    </div>
    ${this.itemsTable(data, settings, ac)}
    ${this.notesBox(data, settings)}
    ${this.termsBox(data, settings, ac)}
    ${settings.showSignatureLine ? `<div style="display:flex;justify-content:space-between;margin-top:36px;"><div style="text-align:center;width:170px"><div style="border-top:1px solid #999;margin-bottom:4px;"></div><span style="font-size:11px;color:#777">Authorized Signature</span></div><div style="text-align:center;width:170px"><div style="border-top:1px solid #999;margin-bottom:4px;"></div><span style="font-size:11px;color:#777">Customer Signature</span></div></div>` : ''}
  </div>

  <div class="sidebar">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${ac};margin-bottom:8px">Summary</div>
    <div class="totals-card">
      ${settings.showSubtotal ? `<div class="tc-row"><span class="tc-lbl">Subtotal</span><span>${this.formatCurrency(data.subtotal)}</span></div>` : ''}
      ${settings.showDiscount && data.discountAmount > 0 ? `<div class="tc-row"><span class="tc-lbl">Total Discount</span><span>–${this.formatCurrency(data.discountAmount)}</span></div>` : ''}
      ${settings.showTaxBreakdown && data.taxAmount > 0 ? `<div class="tc-row"><span class="tc-lbl">Tax / VAT</span><span>${this.formatCurrency(data.taxAmount)}</span></div>` : ''}
      <div class="tc-row tc-total"><span class="tc-lbl">TOTAL</span><span>${this.formatCurrency(data.total)}</span></div>
      ${settings.showAmountPaid && data.amountPaid != null && data.amountPaid > 0 ? `<div class="tc-row tc-paid"><span class="tc-lbl">Amount Paid</span><span class="tc-val">${this.formatCurrency(data.amountPaid)}</span></div>` : ''}
      ${settings.showBalanceDue && data.balanceDue != null ? `<div class="tc-row ${data.balanceDue > 0 ? 'tc-balance-red' : 'tc-paid'}"><span class="tc-lbl">Balance Due</span><span class="tc-val">${this.formatCurrency(data.balanceDue)}</span></div>` : ''}
    </div>
    ${settings.showPaymentMethod && data.paymentMethod ? `<div style="margin-top:12px;font-size:12px;color:#555"><strong>Payment:</strong> ${data.paymentMethod}</div>` : ''}
  </div>
</div>

<div class="footer-bar">
  <em>E &amp; O.E – Errors and Omissions Excepted</em>
  <span>${settings.showThankYouMessage ? 'Thank you for your business!' : ''}${settings.customFooterText ? '  ·  ' + settings.customFooterText : ''}</span>
</div>

</div></body></html>`;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TEMPLATE 5: Compact  — dense layout, payments history, thermal-friendly
  // ─────────────────────────────────────────────────────────────────────────────
  renderCompact(data: DocumentData, settings: DocumentTypeSettings): string {
    const label = this.getDocLabel(data.docType);
    const ac = settings.accentColor;
    const showSku = settings.showItemSku;
    const showTax = settings.showItemTax;
    const showDisc = settings.showItemDiscount;

    const thC = `background:${ac};color:#fff;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;padding:6px 7px;`;

    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
${this.sharedStyles(settings)}
body { font-size:12px; }
.wrap { padding:16px 22px; }
.hdr { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:10px; margin-bottom:0; border-bottom:2px solid ${ac}; }
.org-side .org-name { font-size:15px; font-weight:700; }
.org-side .org-detail { font-size:10px; color:#666; margin-top:1px; }
.doc-side { text-align:right; }
.doc-title { font-size:20px; font-weight:800; color:${ac}; }
.doc-num { font-size:11px; color:#555; margin-top:2px; }
.info-bar { display:flex; background:#f8f9fa; border-bottom:1px solid #e5e7eb; margin-bottom:10px; }
.info-cell { flex:1; padding:7px 14px; border-right:1px solid #e5e7eb; }
.info-cell:last-child { border-right:none; }
.info-lbl { font-size:8px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#999; margin-bottom:1px; }
.info-val { font-size:11px; font-weight:600; color:#1a1a1a; }
.bill-row { background:#f8f9fa; border-radius:4px; padding:8px 12px; margin-bottom:10px; display:flex; gap:12px; flex-wrap:wrap; font-size:11px; }
.bill-name { font-weight:700; font-size:12px; }
.bill-detail { color:#555; }
.totals { margin-top:8px; display:flex; justify-content:flex-end; }
.payment-section { margin-top:10px; }
.payment-lbl { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:${ac}; margin-bottom:5px; border-left:3px solid ${ac}; padding-left:6px; }
.payment-row { display:flex; justify-content:space-between; font-size:11px; padding:4px 8px; border-bottom:1px solid #f0f0f0; }
.payment-row:nth-child(even) { background:#f9fafb; }
.footer { border-top:1px solid #e5e7eb; margin-top:10px; padding-top:8px; text-align:center; font-size:10px; color:#999; }
</style></head><body><div class="page"><div class="wrap">

<div class="hdr">
  <div class="org-side">
    ${settings.showLogo && data.orgLogo ? `<img src="${data.orgLogo}" style="height:34px;max-width:110px;object-fit:contain;display:block;margin-bottom:4px;">` : ''}
    ${settings.showOrgName ? `<div class="org-name">${data.orgName}</div>` : ''}
    ${settings.showOrgAddress && data.orgAddress ? `<div class="org-detail">${data.orgAddress}</div>` : ''}
    ${settings.showOrgPhone && data.orgPhone ? `<div class="org-detail">Tel: ${data.orgPhone}</div>` : ''}
    ${settings.showOrgEmail && data.orgEmail ? `<div class="org-detail">${data.orgEmail}</div>` : ''}
  </div>
  <div class="doc-side">
    <div class="doc-title">${label}</div>
    <div class="doc-num"># ${data.docNumber}</div>
    <div style="font-size:10px;color:#777;margin-top:2px">${this.formatDate(data.docDate)}</div>
    ${data.dueDate ? `<div style="font-size:10px;color:${ac}">Due: ${this.formatDate(data.dueDate)}</div>` : ''}
  </div>
</div>

<div class="info-bar">
  <div class="info-cell">
    <div class="info-lbl">Issue Date</div>
    <div class="info-val">${this.formatDate(data.docDate)}</div>
  </div>
  ${data.dueDate ? `<div class="info-cell"><div class="info-lbl">Due Date</div><div class="info-val" style="color:${ac}">${this.formatDate(data.dueDate)}</div></div>` : ''}
  ${settings.showPaymentMethod && data.paymentMethod ? `<div class="info-cell"><div class="info-lbl">Payment</div><div class="info-val">${data.paymentMethod}</div></div>` : ''}
  ${settings.showAmountPaid && data.amountPaid != null ? `<div class="info-cell"><div class="info-lbl">Paid</div><div class="info-val" style="color:#16a34a">${this.formatCurrency(data.amountPaid)}</div></div>` : ''}
</div>

<div class="bill-row">
  <div>
    <div class="bill-name">${data.customerName}</div>
    <div class="bill-detail">Tel: ${data.customerPhone || 'N/A'}</div>
    <div class="bill-detail">${data.customerEmail || 'N/A'}</div>
    ${settings.showKraPin ? `<div class="bill-detail">KRA: ${data.kraPin || 'N/A'}</div>` : ''}
  </div>
  ${data.customerAddress ? `<div><div class="bill-detail" style="color:#888">Address</div><div class="bill-detail">${data.customerAddress}</div></div>` : ''}
  ${settings.showCustomerType && data.customerType ? `<div><span style="background:${data.customerType === 'BUSINESS' ? '#e0e7ff' : '#dbeafe'};color:${data.customerType === 'BUSINESS' ? '#3730a3' : '#1d4ed8'};padding:2px 6px;border-radius:3px;font-size:10px">${data.customerType}</span></div>` : ''}
</div>

<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:4px;overflow:hidden">
  <thead><tr>
    <th style="${thC}text-align:center;width:20px">#</th>
    <th style="${thC}">Item</th>
    ${showSku ? `<th style="${thC}">SKU</th>` : ''}
    <th style="${thC}text-align:right">Qty</th>
    <th style="${thC}text-align:right">Price</th>
    ${showDisc ? `<th style="${thC}text-align:right">Disc.</th>` : ''}
    ${showTax ? `<th style="${thC}text-align:right">Tax</th>` : ''}
    <th style="${thC}text-align:right">Total</th>
  </tr></thead>
  <tbody>
    ${data.items
      .map((item, i) => {
        const bg = i % 2 ? 'background:#f9fafb;' : '';
        return `<tr>
        <td style="${bg}padding:5px 7px;font-size:10px;text-align:center;color:#bbb;border-bottom:1px solid #f0f0f0">${i + 1}</td>
        <td style="${bg}padding:5px 7px;border-bottom:1px solid #f0f0f0">${item.name}</td>
        ${showSku ? `<td style="${bg}padding:5px 7px;font-size:10px;color:#888;border-bottom:1px solid #f0f0f0">${item.sku || '–'}</td>` : ''}
        <td style="${bg}padding:5px 7px;text-align:right;border-bottom:1px solid #f0f0f0">${item.quantity}</td>
        <td style="${bg}padding:5px 7px;text-align:right;border-bottom:1px solid #f0f0f0">${this.formatCurrency(item.unitPrice)}</td>
        ${showDisc ? `<td style="${bg}padding:5px 7px;text-align:right;border-bottom:1px solid #f0f0f0">${item.discount ? this.formatCurrency(item.discount) : '–'}</td>` : ''}
        ${showTax ? `<td style="${bg}padding:5px 7px;text-align:right;border-bottom:1px solid #f0f0f0">${item.taxRate != null ? item.taxRate + '%' : '–'}</td>` : ''}
        <td style="${bg}padding:5px 7px;text-align:right;font-weight:600;border-bottom:1px solid #f0f0f0">${this.formatCurrency(item.total)}</td>
      </tr>`;
      })
      .join('')}
  </tbody>
</table>

<div class="totals">${this.totalsBlock(data, settings, ac)}</div>

${
  settings.showAmountPaid && data.amountPaid != null && data.amountPaid > 0
    ? `
<div class="payment-section">
  <div class="payment-lbl">Payments Made</div>
  <div class="payment-row" style="font-weight:600;font-size:10px;color:#888;background:#f8f9fa;">
    <span>Method</span><span>Amount</span>
  </div>
  <div class="payment-row">
    <span>${data.paymentMethod || 'Payment'}</span>
    <span style="color:#16a34a;font-weight:600">${this.formatCurrency(data.amountPaid)}</span>
  </div>
</div>`
    : ''
}

${settings.showNotes && data.notes ? `<div style="margin-top:10px;background:#fffbeb;border:1px solid #fde68a;border-radius:4px;padding:8px 12px;font-size:11px;color:#78350f"><strong>Notes:</strong> ${data.notes}</div>` : ''}
${settings.showTermsAndConditions && data.terms ? `<div style="margin-top:8px;border-left:3px solid ${ac};padding:6px 10px;background:#f8f9fa;font-size:11px;color:#555"><strong>Terms:</strong> ${data.terms}</div>` : ''}
${settings.showSignatureLine ? `<div style="display:flex;justify-content:space-between;margin-top:24px;"><div style="text-align:center;width:140px"><div style="border-top:1px solid #999;margin-bottom:3px;"></div><span style="font-size:10px;color:#777">Authorized Signature</span></div><div style="text-align:center;width:140px"><div style="border-top:1px solid #999;margin-bottom:3px;"></div><span style="font-size:10px;color:#777">Customer Signature</span></div></div>` : ''}

<div class="footer">
  ${settings.showThankYouMessage ? `<div style="font-style:italic">Thank you for your business!</div>` : ''}
  <div><em>E &amp; O.E – Errors and Omissions Excepted</em></div>
  ${settings.customFooterText ? `<div>${settings.customFooterText}</div>` : ''}
</div>

</div></div></body></html>`;
  }
}
