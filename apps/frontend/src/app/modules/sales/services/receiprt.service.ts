import { Injectable } from '@angular/core';
import { PrintingService } from '../../../shared/Services/printing.service';
import { BluetoothPrinterService } from '../../../shared/Services/bluetooth-printer.service';
import { PrinterSettingsService } from '../../../shared/Services/printer-settings.service';
import { Capacitor } from '@capacitor/core';

interface OrderPayment {
  id: number;
  paymentMethodId: number;
  paymentMethodCode: string;
  paymentMethodName: string;
  amount: number;
  transactionCode?: string;
  recordedBy: string;
}

@Injectable({
  providedIn: 'root',
})
export class ReceiptService {
  constructor(
    private printingService: PrintingService,
    private bluetoothPrinterService: BluetoothPrinterService,
    private printerSettingsService: PrinterSettingsService
  ) {}

  generateDeliveryNoteHTML(orderDetails: any, orgDetails: any): string {
    const safeOrgDetails = orgDetails || {
      name: 'Lumina ERP',
      address: '',
      contact: '',
      logoUrl: null
    };

    const items =
      typeof orderDetails.items === 'string'
        ? JSON.parse(orderDetails.items)
        : orderDetails.items;

    return `
      <html>
        <head>
          <style>
            @page {
              margin: 0.5cm;
              size: A4;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              padding: 40px;
              color: #1a202c;
              background-color: #fff;
              line-height: 1.5;
            }
            .container {
              max-width: 850px;
              margin: 0 auto;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #edf2f7;
              padding-bottom: 30px;
              margin-bottom: 40px;
            }
            .org-info h1 {
              font-size: 28px;
              font-weight: 800;
              margin: 0 0 8px 0;
              color: #4f46e5;
              letter-spacing: -0.025em;
            }
            .org-info p {
              margin: 2px 0;
              font-size: 14px;
              color: #4a5568;
            }
            .doc-title-container {
              text-align: right;
            }
            .doc-title {
              font-size: 32px;
              font-weight: 900;
              color: #1a202c;
              margin: 0;
              letter-spacing: 0.05em;
              text-transform: uppercase;
            }
            .doc-number {
              font-size: 16px;
              font-weight: 600;
              color: #4f46e5;
              margin-top: 5px;
            }
            .details-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
              margin-bottom: 40px;
            }
            .section-title {
              font-size: 12px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: #718096;
              margin-bottom: 12px;
              border-bottom: 1px solid #edf2f7;
              padding-bottom: 8px;
            }
            .info-box p {
              margin: 4px 0;
              font-size: 14px;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 30px 0;
            }
            .items-table th {
              background-color: #f8fafc;
              color: #475569;
              padding: 12px 15px;
              text-align: left;
              font-size: 12px;
              font-weight: 700;
              text-transform: uppercase;
              border-bottom: 2px solid #e2e8f0;
            }
            .items-table td {
              padding: 15px;
              border-bottom: 1px solid #edf2f7;
              font-size: 14px;
            }
            .items-table tr:last-child td {
              border-bottom: none;
            }
            .items-table .qty-col {
              font-weight: 700;
              color: #4f46e5;
            }
            .total-row {
              background-color: #f8fafc;
              font-weight: 800;
            }
            .instructions {
              margin-top: 40px;
              padding: 20px;
              background-color: #f1f5f9;
              border-radius: 12px;
              font-size: 13px;
              color: #475569;
            }
            .instructions ul {
              margin: 10px 0 0 0;
              padding-left: 20px;
            }
            .instructions li {
              margin-bottom: 5px;
            }
            .signature-section {
              margin-top: 60px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 60px;
            }
            .sig-box {
              padding-top: 15px;
              border-top: 2px solid #e2e8f0;
              text-align: center;
            }
            .sig-label {
              font-size: 12px;
              font-weight: 700;
              color: #64748b;
              text-transform: uppercase;
            }
            .footer {
              margin-top: 80px;
              text-align: center;
              font-size: 12px;
              color: #94a3b8;
              border-top: 1px solid #f1f5f9;
              padding-top: 30px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="org-info">
                <h1>${safeOrgDetails.name}</h1>
                <p>${safeOrgDetails.address || ''}</p>
                <p><strong>Tel:</strong> ${safeOrgDetails.contact || ''}</p>
              </div>
              <div class="doc-title-container">
                <p class="doc-title">Delivery Note</p>
                <p class="doc-number">#DN-${orderDetails.id}</p>
              </div>
            </div>

            <div class="details-grid">
              <div class="info-box">
                <div class="section-title">Recipient Details</div>
                <p><strong>Customer:</strong> ${
                  orderDetails.created_by || 'Walk-in Customer'
                }</p>
                <p><strong>Order Reference:</strong> #${orderDetails.id}</p>
              </div>
              <div class="info-box">
                <div class="section-title">Delivery Information</div>
                <p><strong>Date:</strong> ${new Date(
                  orderDetails.createdAt
                ).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}</p>
                <p><strong>Time:</strong> ${new Date(
                  orderDetails.createdAt
                ).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}</p>
              </div>
            </div>

            <div class="section-title">Consignment Details</div>
            <table class="items-table">
              <thead>
                <tr>
                  <th width="50">#</th>
                  <th>Description</th>
                  <th width="100">Quantity</th>
                  <th width="120">Condition</th>
                </tr>
              </thead>
              <tbody>
                ${items
                  .map(
                    (item: any, index: number) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td><strong>${item.name}</strong></td>
                    <td class="qty-col">${item.selectedItems} Pcs</td>
                    <td style="color: #cbd5e1;">[ ] Good [ ] Damaged</td>
                  </tr>
                `
                  )
                  .join('')}
                <tr class="total-row">
                  <td colspan="2" style="text-align: right;">Total Consignment Qty:</td>
                  <td colspan="2">${items.reduce(
                    (sum: number, item: any) => sum + (item.selectedItems || 0),
                    0
                  )} Pcs</td>
                </tr>
              </tbody>
            </table>

            <div class="instructions">
              <div style="font-weight: 800; color: #1e293b; margin-bottom: 5px;">Delivery Protocol:</div>
              <ul>
                <li>Please inspect all delivered goods for quality and quantity.</li>
                <li>Any discrepancies must be noted on this document before signing.</li>
                <li>Liability transitions to the recipient upon signature of this consignment note.</li>
              </ul>
            </div>

            <div class="signature-section">
              <div class="sig-box">
                <p style="height: 40px;"></p>
                <div class="sig-label">Authorized Dispatcher Signature</div>
                <p style="font-size: 10px; color: #94a3b8; margin-top: 5px;">${
                  orgDetails.name
                }</p>
              </div>
              <div class="sig-box">
                <p style="height: 40px;"></p>
                <div class="sig-label">Customer's Acceptance Signature</div>
                <p style="font-size: 10px; color: #94a3b8; margin-top: 5px;">Receiver's Name & ID</p>
              </div>
            </div>

            <div class="footer">
              <p style="font-style: italic; color: #64748b; margin-bottom: 10px;">"${
                orgDetails.complementaryMessage
              }"</p>
              <p>This is a legally binding document generated for ${
                orgDetails.name
              }.</p>
              <p>Powered by Lumina360 (0758675716)</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }


  // Thermal EPOS printer friendly receipt format
  generateThermalReceiptHTML(orderDetails: any, orgDetails: any): string {
    const safeOrgDetails = orgDetails || {
      name: 'Business Receipt',
      address: '',
      contact: '',
      logoUrl: null
    };

    const items =
      typeof orderDetails.items === 'string'
        ? JSON.parse(orderDetails.items)
        : orderDetails.items;

    return `
      <html>
        <head>
          <title>Thermal Receipt</title>
          <style>
            @page {
              margin: 0;
              size: 80mm auto;
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              margin: 0;
              padding: 5px;
              width: 72mm;
              font-size: 11px;
              color: black;
              background-color: white;
              font-variant-ligatures: none;
            }
            .receipt {
              width: 100%;
            }
            .center {
              text-align: center;
            }
            .bold {
              font-weight: bold;
            }
            .header {
              margin-bottom: 12px;
            }
            .logo {
              display: block;
              max-width: 60mm;
              max-height: 40mm;
              margin: 0 auto 3px;
              object-fit: contain;
            }
            .header h1 {
              font-size: 16px;
              margin: 0;
              padding: 0;
              text-transform: uppercase;
            }
            .header p {
              margin: 2px 0;
              font-size: 10px;
            }
            .divider {
              border-top: 1px dashed #000;
              margin: 8px 0;
            }
            .double-divider {
              border-top: 2px solid #000;
              margin: 8px 0;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin: 3px 0;
            }
            .items-table {
              width: 100%;
              font-size: 10px;
              margin: 8px 0;
              border-collapse: collapse;
            }
            .items-table th {
              text-align: left;
              padding: 4px 0;
              border-bottom: 1px solid #000;
              text-transform: uppercase;
            }
            .items-table td {
              text-align: left;
              padding: 6px 0;
              vertical-align: top;
            }
            .items-table .amount-col {
              text-align: right;
            }
            .item-name {
              display: block;
              font-weight: bold;
              margin-bottom: 2px;
            }
            .item-details {
              display: block;
              font-size: 9px;
            }
            .footer {
              margin-top: 15px;
              text-align: center;
              font-size: 10px;
              padding-top: 10px;
              border-top: 1px dashed #000;
            }
            /* Hide elements when printing */
            @media print {
              @page {
                margin: 0;
              }
              body {
                margin: 0;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header center">
              ${safeOrgDetails.logoUrl ? `<img src="${safeOrgDetails.logoUrl}" alt="Logo" class="logo" />` : ''}
              <h1 class="bold">${safeOrgDetails.name}</h1>
              <p>${safeOrgDetails.address || ''}</p>
              <p>Tel: ${safeOrgDetails.contact || ''}</p>
            </div>

            <div class="double-divider"></div>

            <div class="info-row">
              <span class="bold">RECEIPT #:</span>
              <span>${orderDetails.id}</span>
            </div>
            <div class="info-row">
              <span class="bold">DATE:</span>
              <span>${new Date(orderDetails.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
            </div>
            <div class="info-row">
              <span class="bold">CASHIER:</span>
              <span>${orderDetails.created_by}</span>
            </div>

            <div class="divider"></div>

            <table class="items-table">
              <thead>
                <tr>
                  <th>ITEM</th>
                  <th class="amount-col">QTY</th>
                  <th class="amount-col">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                ${items
                  .map(
                    (item: any) => `
                  <tr>
                    <td>
                      <span class="item-name">${item.name}</span>
                      <span class="item-details">@ ${item.price.toFixed(2)}</span>
                    </td>
                    <td class="amount-col">${item.selectedItems}</td>
                    <td class="amount-col bold">${(item.price * item.selectedItems).toFixed(2)}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>

            <div class="double-divider"></div>

            <div class="info-row">
              <span>SUBTOTAL:</span>
              <span class="bold">KES ${(orderDetails.total - orderDetails.taxAmount).toFixed(2)}</span>
            </div>
            <div class="info-row">
              <span>VAT (16.0%):</span>
              <span class="bold">KES ${orderDetails.taxAmount.toFixed(2)}</span>
            </div>
            ${
              orderDetails.discountAmount > 0
                ? `
              <div class="info-row">
                <span>DISCOUNT:</span>
                <span class="bold">KES ${orderDetails.discountAmount.toFixed(2)}</span>
              </div>
            `
                : ''
            }
            <div class="info-row bold" style="font-size: 14px; margin-top: 5px;">
              <span>TOTAL:</span>
              <span>KES ${orderDetails.total.toFixed(2)}</span>
            </div>

            <div class="divider"></div>

            <div class="center" style="margin: 8px 0;">
              <span class="bold">PAYMENT DETAILS</span>
            </div>

            ${
              orderDetails.payments && orderDetails.payments.length > 0
                ? orderDetails.payments
                    .map(
                      (payment: OrderPayment) => `
              <div class="info-row">
                <span>${payment.paymentMethodName.toUpperCase()}:</span>
                <span class="bold">${payment.amount.toFixed(2)}</span>
              </div>
              ${
                payment.transactionCode
                  ? `<div class="info-row" style="margin-top: -3px;">
                <span style="font-size: 8px;">REF: ${payment.transactionCode}</span>
              </div>`
                  : ''
              }
            `
                    )
                    .join('')
                : `
              <div class="info-row">
                <span>CASH PAID:</span>
                <span class="bold">${orderDetails.totalAmountPaid.toFixed(2)}</span>
              </div>
            `
            }
            <div class="info-row bold" style="border-top: 1px solid #000; margin-top: 5px; padding-top: 5px;">
              <span>TOTAL PAID:</span>
              <span>KES ${orderDetails.totalAmountPaid.toFixed(2)}</span>
            </div>

            <div class="divider"></div>

            ${
              orgDetails.mpesaDetails || orgDetails.bankDetails
                ? `
              <div class="center" style="font-size: 9px;">
                ${orgDetails.mpesaDetails ? `<p>${orgDetails.mpesaDetails}</p>` : ''}
                ${orgDetails.bankDetails ? `<p>${orgDetails.bankDetails}</p>` : ''}
              </div>
              <div class="divider"></div>
            `
                : ''
            }

            <div class="footer">
              <p class="bold">${orgDetails.complementaryMessage || 'THANK YOU!'}</p>
              <p>Goods once sold are not returnable.</p>
              <p style="margin-top: 10px; border: 1px solid #000; padding: 4px; display: inline-block;">
                Powered by Lumina360 (0758675716)
              </p>
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



  // For EPOS/thermal printer friendly format
  async printThermalReceipt(orderDetails: any, orgDetails: any): Promise<void> {
    // Check printer settings to determine print method
    const printerSettings = this.printerSettingsService.getSettings();

    try {
      // If Bluetooth printer is configured and we're on mobile, use Bluetooth with ESC/POS
      if (
        printerSettings?.printerType === 'bluetooth' &&
        Capacitor.isNativePlatform()
      ) {
        await this.printBluetoothReceipt(orderDetails, orgDetails);
        return;
      }

      // Otherwise use HTML thermal receipt format
      const thermalReceiptContent = this.generateThermalReceiptHTML(
        orderDetails,
        orgDetails
      );

      if (Capacitor.isNativePlatform()) {
        // Native mobile printing for thermal receipt
        await this.printingService.printHTML(thermalReceiptContent, {
          name: `Thermal-Receipt-${orderDetails.id}`,
          orientation: 'portrait',
          monochrome: true, // Thermal printers are usually monochrome
        });
      } else {
        // Web browser fallback - use direct print approach
        this.printDirectly(thermalReceiptContent);
      }
    } catch (error) {
      console.error('Thermal print error:', error);
      throw error;
    }
  }

  /**
   * Print using CSS media print without popup windows
   * Creates a temporary iframe for printing to avoid popup blockers
   */
  private printUsingMediaPrint(htmlContent: string): void {
    console.log('printUsingMediaPrint called');

    // Create temporary iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';

    // Add flag to prevent multiple prints
    let printExecuted = false;

    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      // Wait for content to load
      iframe.onload = () => {
        if (printExecuted) {
          console.log('Print already executed, skipping...');
          return;
        }

        console.log('iframe onload fired, executing print...');
        printExecuted = true;

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            console.log('Print dialog opened');

            // Remove iframe after printing
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
                console.log('iframe removed');
              }
            }, 1000);
          } catch (error) {
            console.error('Print failed:', error);
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
            console.warn(
              'Iframe printing failed. User should use Ctrl+P if needed.'
            );
          }
        }, 500);
      };

      // Handle iframe loading errors
      iframe.onerror = () => {
        if (printExecuted) {
          console.log('Print already executed, skipping error handler...');
          return;
        }

        console.error('Iframe failed to load');
        printExecuted = true;

        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
        // Use fallback only if iframe completely fails to load
        this.fallbackPrint(htmlContent);
      };
    } else {
      console.log('iframeDoc not available, using fallback');
      this.fallbackPrint(htmlContent);
    }
  }

  /**
   * Direct print method using a simple popup window approach
   * More reliable than iframe method
   */
  private printDirectly(htmlContent: string): void {
    console.log('printDirectly called');

    const printWindow = window.open(
      '',
      '_blank',
      'width=800,height=600,scrollbars=yes'
    );
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      // Wait for content to load before printing
      printWindow.onload = () => {
        setTimeout(() => {
          console.log('Opening print dialog...');
          printWindow.print();

          // Close window after a delay
          setTimeout(() => {
            printWindow.close();
            console.log('Print window closed');
          }, 1000);
        }, 500);
      };
    } else {
      console.error('Failed to open print window');
      alert(
        'Please allow popups to print, or use the browser print function (Ctrl+P)'
      );
    }
  }

  /**
   * Fallback print method if iframe fails
   * Only used as last resort on web
   */
  private fallbackPrint(htmlContent: string): void {
    console.log('fallbackPrint called');
    this.printDirectly(htmlContent);
  }

  /**
   * Generate ESC/POS commands for Bluetooth thermal printers
   */
  generateESCPOSCommands(orderDetails: any, orgDetails: any): string {
    const items =
      typeof orderDetails.items === 'string'
        ? JSON.parse(orderDetails.items)
        : orderDetails.items;

    const ESC = '\x1B';
    const GS = '\x1D';
    const commands: string[] = [];

    // Initialize printer
    commands.push(`${ESC}@`);

    // Center alignment
    commands.push(`${ESC}a\x01`);

    // Bold + Double height for business name
    commands.push(`${ESC}E\x01`);
    commands.push(`${GS}!\x11`);
    commands.push(`${orgDetails.name}\n`);
    commands.push(`${ESC}E\x00`);
    commands.push(`${GS}!\x00`);

    // Regular text for address and contact
    commands.push(`${orgDetails.address || ''}\n`);
    commands.push(`Tel: ${orgDetails.contact || ''}\n`);

    // Divider
    commands.push('================================\n');

    // Left alignment for receipt details
    commands.push(`${ESC}a\x00`);
    commands.push(`Receipt No: #${orderDetails.id}\n`);
    commands.push(
      `Date: ${new Date(orderDetails.createdAt).toLocaleString()}\n`
    );
    commands.push(`Cashier: ${orderDetails.created_by}\n`);

    // Divider
    commands.push('--------------------------------\n');

    // Items header
    commands.push(`${ESC}E\x01`); // Bold
    commands.push(this.padRight('Item', 16));
    commands.push(this.padLeft('Qty', 4));
    commands.push(this.padLeft('Price', 6));
    commands.push(this.padLeft('Total', 6));
    commands.push('\n');
    commands.push(`${ESC}E\x00`); // Bold off
    commands.push('--------------------------------\n');

    // Items
    items.forEach((item: any) => {
      const itemName = this.truncate(item.name, 16);
      const qty = item.selectedItems.toString();
      const price = item.price.toFixed(2);
      const total = (item.price * item.selectedItems).toFixed(2);

      commands.push(this.padRight(itemName, 16));
      commands.push(this.padLeft(qty, 4));
      commands.push(this.padLeft(price, 6));
      commands.push(this.padLeft(total, 6));
      commands.push('\n');
    });

    // Divider
    commands.push('--------------------------------\n');

    // Totals
    const subtotal = (orderDetails.total - orderDetails.taxAmount).toFixed(2);
    commands.push(this.padRight('Subtotal:', 26));
    commands.push(this.padLeft(`KES ${subtotal}`, 6));
    commands.push('\n');

    commands.push(this.padRight('VAT (16%):', 26));
    commands.push(this.padLeft(`KES ${orderDetails.taxAmount.toFixed(2)}`, 6));
    commands.push('\n');

    if (orderDetails.discountAmount > 0) {
      commands.push(this.padRight('Discount:', 26));
      commands.push(
        this.padLeft(`KES ${orderDetails.discountAmount.toFixed(2)}`, 6)
      );
      commands.push('\n');
    }

    // Bold total
    commands.push(`${ESC}E\x01`);
    commands.push(this.padRight('TOTAL:', 26));
    commands.push(this.padLeft(`KES ${orderDetails.total.toFixed(2)}`, 6));
    commands.push('\n');
    commands.push(`${ESC}E\x00`);

    // Divider
    commands.push('--------------------------------\n');

    // Payment methods
    if (orderDetails.cashPaid > 0) {
      commands.push(this.padRight('Cash:', 26));
      commands.push(this.padLeft(`KES ${orderDetails.cashPaid.toFixed(2)}`, 6));
      commands.push('\n');
    }

    if (orderDetails.mpesaPaid > 0) {
      commands.push(this.padRight('M-PESA:', 26));
      commands.push(
        this.padLeft(`KES ${orderDetails.mpesaPaid.toFixed(2)}`, 6)
      );
      commands.push('\n');
      commands.push(`Trans ID: ${orderDetails.mpesaTransactionId}\n`);
    }

    if (orderDetails.bankPaid > 0) {
      commands.push(this.padRight('Bank:', 26));
      commands.push(this.padLeft(`KES ${orderDetails.bankPaid.toFixed(2)}`, 6));
      commands.push('\n');
    }

    commands.push(`${ESC}E\x01`);
    commands.push(this.padRight('Total Paid:', 26));
    commands.push(
      this.padLeft(`KES ${orderDetails.totalAmountPaid.toFixed(2)}`, 6)
    );
    commands.push('\n');
    commands.push(`${ESC}E\x00`);

    // Divider
    commands.push('================================\n');

    // Payment details (centered)
    commands.push(`${ESC}a\x01`);
    if (orgDetails.mpesaDetails) {
      commands.push(`${orgDetails.mpesaDetails}\n`);
    }
    if (orgDetails.bankDetails) {
      commands.push(`${orgDetails.bankDetails}\n`);
    }

    // Footer
    if (orgDetails.complementaryMessage) {
      commands.push(`\n${orgDetails.complementaryMessage}\n`);
    }
    commands.push('\nPowered by Lumina360 (0758675716)\n');

    // Feed paper and cut
    commands.push('\n\n\n\n');
    commands.push(`${GS}V\x41\x03`); // Partial cut

    return commands.join('');
  }

  /**
   * Helper: Pad string to right
   */
  private padRight(str: string, length: number): string {
    return str.length >= length
      ? str.substring(0, length)
      : str + ' '.repeat(length - str.length);
  }

  /**
   * Helper: Pad string to left
   */
  private padLeft(str: string, length: number): string {
    return str.length >= length
      ? str.substring(0, length)
      : ' '.repeat(length - str.length) + str;
  }

  /**
   * Helper: Truncate string
   */
  private truncate(str: string, length: number): string {
    return str.length > length ? str.substring(0, length) : str;
  }

  /**
   * Print receipt using Bluetooth thermal printer with ESC/POS commands
   */
  async printBluetoothReceipt(
    orderDetails: any,
    orgDetails: any
  ): Promise<void> {
    const escPosCommands = this.generateESCPOSCommands(
      orderDetails,
      orgDetails
    );

    try {
      await this.bluetoothPrinterService.print(escPosCommands);
    } catch (error) {
      console.error('Bluetooth print error:', error);
      throw error;
    }
  }

  /**
   * Print delivery note for cash sales
   */
  async printDeliveryNote(orderDetails: any, orgDetails: any): Promise<void> {
    const deliveryNoteContent = this.generateDeliveryNoteHTML(
      orderDetails,
      orgDetails
    );

    try {
      if (Capacitor.isNativePlatform()) {
        // Native mobile printing
        await this.printingService.printHTML(deliveryNoteContent, {
          name: `Delivery-Note-${orderDetails.id}`,
          orientation: 'portrait',
          monochrome: false,
        });
      } else {
        // Web browser fallback using direct print
        this.printDeliveryNoteDirectly(deliveryNoteContent);
      }
    } catch (error) {
      console.error('Print delivery note error:', error);
      throw error;
    }
  }

  /**
   * Direct print method for delivery notes
   */
  private printDeliveryNoteDirectly(htmlContent: string): void {
    console.log('Delivery note printDirectly called');

    const printWindow = window.open(
      '',
      '_blank',
      'width=800,height=600,scrollbars=yes'
    );
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      // Wait for content to load before printing
      printWindow.onload = () => {
        setTimeout(() => {
          console.log('Opening delivery note print dialog...');
          printWindow.print();

          // Close window after a delay
          setTimeout(() => {
            printWindow.close();
            console.log('Delivery note print window closed');
          }, 1000);
        }, 500);
      };
    } else {
      console.error('Failed to open delivery note print window');
      alert(
        'Please allow popups to print, or use the browser print function (Ctrl+P)'
      );
    }
  }
}
