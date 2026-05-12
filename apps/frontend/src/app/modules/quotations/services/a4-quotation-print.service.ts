import { Injectable } from '@angular/core';
import { PrintingService } from '../../../shared/Services/printing.service';

@Injectable({
  providedIn: 'root',
})
export class A4QuotationPrintService {
  constructor(private printingService: PrintingService) {}

  async printQuotation(quotationData: any, orgDetails: any) {
    const html = this.generateQuotationHTML(quotationData, orgDetails);
    await this.printingService.printHTML(html);
  }

  generateQuotationHTML(quotationData: any, orgDetails: any): string {
    const safeOrgDetails = orgDetails || {
      name: 'Business Quotation',
      email: '',
      contact: '',
      address: '',
      logoUrl: null,
    };

    const data = quotationData.data || quotationData;
    const items = data.items || [];
    const customer = data.customer || data.supplier || {};

    const dateObj = new Date(data.date || data.createdAt);
    const date = dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const validUntilObj = new Date(
      data.validUntil || new Date(dateObj.getTime() + 30 * 24 * 60 * 60 * 1000),
    );
    const validUntil = validUntilObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const logoHtml = safeOrgDetails.logoUrl
      ? `<img src="${safeOrgDetails.logoUrl}" alt="Logo" style="max-height: 60px; margin-bottom: 15px;">`
      : '';

    const subtotal = data.subtotal || 0;
    const vatAmount = data.vatAmount || 0;
    const totalAmount = data.total || data.totalAmount || 0;
    const vatRate = data.vatRate || 0.16;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Quotation - ${data.quotationNumber || data.referenceNumber || data.id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            @page {
              size: A4;
              margin: 0;
            }
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 20px 30px;
              color: #1a1a1a;
              line-height: 1.4;
              background: #fff;
              font-size: 12px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .header-container {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
            }
            .org-info {
              flex: 1;
            }
            .org-name {
              color: #FF8C00;
              font-size: 20px;
              font-weight: 800;
              margin: 0 0 5px 0;
              letter-spacing: -0.5px;
            }
            .org-details {
              font-size: 11px;
              color: #444;
            }
            .org-details p {
              margin: 1px 0;
            }
            .quotation-title-container {
              text-align: right;
            }
            .quotation-label {
              font-size: 32px;
              font-weight: 800;
              color: #1a1a1a;
              margin: 0;
              line-height: 1;
              letter-spacing: -1px;
            }
            .quotation-meta {
              margin-top: 15px;
              font-size: 11px;
            }
            .meta-row {
              display: flex;
              justify-content: flex-end;
              gap: 10px;
              margin-bottom: 5px;
            }
            .meta-label {
              font-weight: 700;
              color: #1a1a1a;
            }
            .divider {
              height: 2px;
              background-color: #FF8C00;
              margin: 25px 0;
              border: none;
            }
            .billing-status-container {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
            }
            .section-label {
              color: #FF8C00;
              font-weight: 800;
              font-size: 10px;
              text-transform: uppercase;
              margin-bottom: 8px;
              letter-spacing: 0.5px;
            }
            .customer-info {
              flex: 1;
              border-top: 1px solid #eee;
              padding-top: 15px;
              margin-right: 20px;
            }
            .customer-name {
              font-size: 14px;
              font-weight: 800;
              margin-bottom: 4px;
            }
            .customer-detail {
              font-size: 11px;
              color: #555;
              margin: 1px 0;
            }
            .status-container {
              text-align: right;
              flex: 1;
              border-top: 1px solid #eee;
              padding-top: 15px;
            }
            .status-badge {
              background: #fef3c7;
              color: #92400e;
              padding: 4px 12px;
              border-radius: 4px;
              font-weight: 800;
              font-size: 10px;
              text-transform: uppercase;
              display: inline-block;
            }
            .status-badge.approved {
              background: #d1fae5;
              color: #065f46;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            .items-table th {
              text-align: left;
              color: #FF8C00;
              font-weight: 800;
              font-size: 10px;
              text-transform: uppercase;
              padding: 10px 12px;
              border-bottom: 2px solid #FF8C00;
              background-color: #fffaf0;
              letter-spacing: 0.5px;
            }
            .items-table td {
              padding: 10px 12px;
              border-bottom: 1px solid #eee;
              font-size: 12px;
              color: #333;
            }
            .text-left {
              text-align: left;
            }
            .text-center {
              text-align: center;
            }
            .text-right {
              text-align: right;
            }
            .totals-container {
              display: flex;
              flex-direction: column;
              align-items: flex-end;
              margin-bottom: 40px;
              padding: 20px;
              background-color: #fffaf0;
              border-radius: 6px;
              border: 1px solid #ffe8cc;
            }
            .total-row {
              display: flex;
              width: 100%;
              max-width: 280px;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #ffd8a8;
            }
            .total-row:last-child {
              border-bottom: none;
            }
            .total-row.final {
              margin-top: 8px;
              color: #FF8C00;
              font-size: 18px;
              font-weight: 800;
            }
            .total-label {
              color: #666;
              font-weight: 600;
              font-size: 12px;
            }
            .total-value {
              font-weight: 700;
              color: #1a1a1a;
              font-size: 12px;
            }
            .total-row.final .total-label {
              color: #FF8C00;
              font-size: 18px;
            }
            .total-row.final .total-value {
              color: #FF8C00;
              font-size: 18px;
            }
            .terms-section {
              margin: 30px 0;
              padding: 20px;
              background-color: #f9fafb;
              border-radius: 6px;
              border: 1px solid #e5e7eb;
            }
            .terms-title {
              color: #FF8C00;
              font-weight: 800;
              font-size: 14px;
              margin-bottom: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .terms-list {
              margin: 0;
              padding-left: 20px;
              font-size: 11px;
              line-height: 1.6;
              color: #555;
            }
            .terms-list li {
              margin-bottom: 6px;
            }
            .validity-notice {
              margin: 20px 0;
              padding: 15px;
              background-color: #fff3cd;
              border: 1px solid #ffeeba;
              border-radius: 6px;
              text-align: center;
              color: #856404;
              font-weight: 700;
              font-size: 11px;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 30px;
              border-top: 1px solid #eee;
            }
            .thank-you {
              color: #FF8C00;
              font-weight: 800;
              font-size: 18px;
              margin-bottom: 8px;
              letter-spacing: -0.5px;
            }
            .footer-links {
              font-size: 10px;
              color: #666;
            }
            .footer-links p {
              margin: 4px 0;
            }
            .footer-links a {
              color: #FF8C00;
              text-decoration: none;
              font-weight: 600;
            }
            @media print {
              body { padding: 20px 30px; }
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div class="org-info">
              ${logoHtml}
              <h1 class="org-name">${safeOrgDetails.name}</h1>
              <div class="org-details">
                <p>${safeOrgDetails.email || ''}</p>
                <p>${safeOrgDetails.contact || ''}</p>
                <p>${safeOrgDetails.address || ''}</p>
              </div>
            </div>
            <div class="quotation-title-container">
              <h2 class="quotation-label">QUOTATION</h2>
              <div class="quotation-meta">
                <div class="meta-row">
                  <span class="meta-label">Quotation #:</span>
                  <span>${data.quotationNumber || data.referenceNumber || 'QUO-' + data.id}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">Date:</span>
                  <span>${date}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">Valid Until:</span>
                  <span>${validUntil}</span>
                </div>
              </div>
            </div>
          </div>

          <hr class="divider">

          <div class="billing-status-container">
            <div class="customer-info">
              <div class="section-label">QUOTATION FOR</div>
              <div class="customer-name">${customer?.name || 'Customer Name'}</div>
              ${customer?.email ? `<p class="customer-detail">${customer.email}</p>` : ''}
              ${customer?.phone ? `<p class="customer-detail">${customer.phone}</p>` : ''}
            </div>
            <div class="status-container">
              <div class="section-label">STATUS</div>
              <div class="status-badge ${data.status?.toLowerCase() === 'approved' ? 'approved' : ''}">${data.status || 'PENDING'}</div>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>DESCRIPTION</th>
                <th class="text-left">UNIT PRICE</th>
                <th class="text-center">QUANTITY</th>
                <th class="text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map((item: any) => {
                  const unitPrice = item.unitPrice || 0;
                  const quantity = item.quantity || 0;
                  const itemTotal = item.total || unitPrice * quantity;

                  return `
                  <tr>
                    <td>${item.description || item.name || 'N/A'}</td>
                    <td class="text-left">Ksh ${unitPrice.toLocaleString()}</td>
                    <td class="text-center">${quantity}</td>
                    <td class="text-right" style="font-weight:600;">Ksh ${itemTotal.toLocaleString()}</td>
                  </tr>
                `;
                })
                .join('')}
            </tbody>
          </table>

          <div class="totals-container">
            <div class="total-row">
              <span class="total-label">Subtotal:</span>
              <span class="total-value">Ksh ${subtotal.toLocaleString()}</span>
            </div>
            <div class="total-row">
              <span class="total-label">VAT (${(vatRate * 100).toFixed(0)}%):</span>
              <span class="total-value">Ksh ${vatAmount.toLocaleString()}</span>
            </div>
            <div class="total-row final">
              <span class="total-label">Total Amount:</span>
              <span class="total-value">Ksh ${totalAmount.toLocaleString()}</span>
            </div>
          </div>

          <div class="validity-notice">
            This quotation is valid until ${validUntil}
          </div>

          <div class="terms-section">
            <div class="terms-title">Terms & Conditions</div>
            <ul class="terms-list">
              <li>This quotation is valid for 30 days from the date of issue</li>
              <li>Prices are inclusive of VAT where applicable</li>
              <li>Payment terms to be agreed upon order confirmation</li>
              <li>Delivery terms and conditions apply</li>
              <li>All quotations are subject to availability of goods</li>
            </ul>
          </div>

          <div class="footer">
            <div class="thank-you">Thank you for your interest</div>
            <div class="footer-links">
              <p>Powered by Lumina360 ERP</p>
              <p>© ${new Date().getFullYear()} ${safeOrgDetails.name}. All rights reserved.</p>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 500);
            }
          </script>
        </body>
      </html>
    `;
  }
}
