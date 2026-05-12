import { Injectable } from '@angular/core';
import { PrintingService } from '../../../shared/Services/printing.service';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root',
})
export class CreditReceiptService {
  constructor(private printingService: PrintingService) {}

  generateCreditInvoiceHTML(creditSale: any, orgDetails: any): string {
    let items = [];

    if (creditSale.items) {
      try {
        items =
          typeof creditSale.items === 'string'
            ? JSON.parse(creditSale.items)
            : creditSale.items;
      } catch (error) {
        console.error('Error parsing credit sale items:', error);
        items = [];
      }
    } else {
      console.warn('Credit sale items is undefined or null:', creditSale);
    }

    // Ensure items is always an array
    if (!Array.isArray(items)) {
      items = [];
    }

    const remainingBalance =
      creditSale.credit_amount - (creditSale.amount_paid || 0);

    return `
      <html>
        <head>
          <style>
            @page {
              margin: 1cm;
              size: A4;
            }
            body {
              font-family: 'Arial', sans-serif;
              margin: 0;
              padding: 20px;
              color: #333;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .header h1 {
              font-size: 24px;
              margin: 0 0 10px 0;
              color: #2c5282;
            }
            .header p {
              margin: 5px 0;
              font-size: 14px;
            }
            .invoice-details {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
            }
            .customer-details, .invoice-info {
              flex: 1;
            }
            .section-title {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 10px;
              color: #2c5282;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            .items-table th {
              background-color: #2c5282;
              color: white;
              padding: 10px;
              text-align: left;
            }
            .items-table td {
              padding: 10px;
              border-bottom: 1px solid #ddd;
            }
            .amount-col {
              text-align: right;
            }
            .totals {
              float: right;
              width: 300px;
              margin-top: 20px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 5px 0;
              border-bottom: 1px solid #ddd;
            }
            .total-row.grand-total {
              font-weight: bold;
              border-top: 2px solid #333;
              border-bottom: 2px solid #333;
              padding: 10px 0;
            }
            .payment-info {
              clear: both;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
            }
            .footer {
              margin-top: 50px;
              text-align: center;
              font-size: 14px;
              color: #666;
            }
            .status-paid {
              color: #059669;
              font-weight: bold;
            }
            .status-unpaid {
              color: #dc2626;
              font-weight: bold;
            }
            .payment-terms {
              margin-top: 20px;
              padding: 15px;
              background-color: #f3f4f6;
              border-radius: 5px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${orgDetails.name}</h1>
              <p>${orgDetails.address}</p>
              <p>Tel: ${orgDetails.contact}</p>
              <p style="font-size: 18px; margin-top: 15px; color: #2c5282;">CREDIT SALE INVOICE</p>
            </div>

            <div class="invoice-details">
              <div class="customer-details">
                <div class="section-title">Customer Details</div>
                <p>Name: ${creditSale.customer_name}</p>
                <p>Phone: ${creditSale.phone_number || 'N/A'}</p>
                <p>ID Number: ${creditSale.national_id || 'N/A'}</p>
              </div>

              <div class="invoice-info">
                <div class="section-title">Invoice Information</div>
                <p>Invoice No: #${creditSale.id}</p>
                <p>Date: ${new Date(
                  creditSale.createdAt
                ).toLocaleDateString()}</p>
                <p>Due Date: ${new Date(
                  creditSale.payment_date
                ).toLocaleDateString()}</p>
                <p>Status: <span class="${
                  creditSale.fully_paid ? 'status-paid' : 'status-unpaid'
                }">
                  ${creditSale.fully_paid ? 'PAID' : 'UNPAID'}
                </span></p>
              </div>
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th>Item Description</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${items
                  .map(
                    (item: any) => `
                  <tr>
                    <td>${item.name}</td>
                    <td>${item.selectedItems}</td>
                    <td class="amount-col">${item.price.toFixed(2)}</td>
                    <td class="amount-col">${(
                      item.price * item.selectedItems
                    ).toFixed(2)}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>

            <div class="totals">
              <div class="total-row">
                <span>Credit Amount:</span>
                <span>KES ${creditSale.credit_amount.toFixed(2)}</span>
              </div>
              <div class="total-row">
                <span>Amount Paid:</span>
                <span>KES ${(creditSale.amount_paid || 0).toFixed(2)}</span>
              </div>
              <div class="total-row grand-total">
                <span>Balance Due:</span>
                <span>KES ${remainingBalance.toFixed(2)}</span>
              </div>
            </div>

            <div class="payment-info">
              <div class="section-title">Payment Information</div>
              ${
                orgDetails.mpesaDetails
                  ? `
                <p>M-PESA Payments:</p>
                <p> ${orgDetails.mpesaDetails}</p>
              `
                  : ''
              }
              ${
                orgDetails.bankDetails
                  ? `
                <p>Bank Payments:</p>
                <p>${orgDetails.bankDetails} </p>
              `
                  : ''
              }
            </div>

            <div class="payment-terms">
              <div class="section-title">Payment Terms & Conditions</div>
              <p>1. Full payment is due by: ${new Date(
                creditSale.payment_date
              ).toLocaleDateString()}</p>
              <p>2. Please include invoice number in all payment communications</p>
              <p>3. Late payments may incur additional charges</p>
            </div>

            <div class="footer">
              <p>${orgDetails.complementaryMessage}</p>
              <p>This is an official invoice from ${orgDetails.name}</p>
              <p>For any queries, please contact us at ${orgDetails.contact}</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  generateDeliveryNoteHTML(creditSale: any, orgDetails: any): string {
    let items = [];

    if (creditSale.items) {
      try {
        items =
          typeof creditSale.items === 'string'
            ? JSON.parse(creditSale.items)
            : creditSale.items;
      } catch (error) {
        console.error('Error parsing credit sale items:', error);
        items = [];
      }
    } else {
      console.warn('Credit sale items is undefined or null:', creditSale);
    }

    // Ensure items is always an array
    if (!Array.isArray(items)) {
      items = [];
    }

    return `
      <html>
        <head>
          <style>
            @page {
              margin: 1cm;
              size: A4;
            }
            body {
              font-family: 'Arial', sans-serif;
              margin: 0;
              padding: 20px;
              color: #333;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .header h1 {
              font-size: 24px;
              margin: 0 0 10px 0;
              color: #2c5282;
            }
            .header p {
              margin: 5px 0;
              font-size: 14px;
            }
            .delivery-note-title {
              font-size: 22px;
              font-weight: bold;
              color: #059669;
              margin-top: 15px;
            }
            .delivery-details {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
            }
            .customer-details, .delivery-info {
              flex: 1;
            }
            .section-title {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 10px;
              color: #2c5282;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            .items-table th {
              background-color: #059669;
              color: white;
              padding: 10px;
              text-align: left;
            }
            .items-table td {
              padding: 10px;
              border-bottom: 1px solid #ddd;
            }
            .signature-section {
              margin-top: 60px;
              display: flex;
              justify-content: space-between;
            }
            .signature-box {
              width: 45%;
            }
            .signature-line {
              border-top: 1px solid #333;
              margin-top: 50px;
              padding-top: 10px;
              text-align: center;
            }
            .footer {
              margin-top: 50px;
              text-align: center;
              font-size: 14px;
              color: #666;
              border-top: 1px solid #ddd;
              padding-top: 20px;
            }
            .delivery-instructions {
              margin-top: 20px;
              padding: 15px;
              background-color: #f3f4f6;
              border-radius: 5px;
              border-left: 4px solid #059669;
            }
            .watermark {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-45deg);
              font-size: 100px;
              color: rgba(5, 150, 105, 0.1);
              font-weight: bold;
              z-index: -1;
              pointer-events: none;
            }
          </style>
        </head>
        <body>
          <div class="watermark">DELIVERY NOTE</div>
          <div class="container">
            <div class="header">
              <h1>${orgDetails.name}</h1>
              <p>${orgDetails.address}</p>
              <p>Tel: ${orgDetails.contact}</p>
              <p class="delivery-note-title">DELIVERY NOTE</p>
            </div>

            <div class="delivery-details">
              <div class="customer-details">
                <div class="section-title">Deliver To:</div>
                <p><strong>Name:</strong> ${creditSale.customer_name}</p>
                <p><strong>Phone:</strong> ${
                  creditSale.phone_number || 'N/A'
                }</p>
                <p><strong>ID Number:</strong> ${
                  creditSale.national_id || 'N/A'
                }</p>
              </div>

              <div class="delivery-info">
                <div class="section-title">Delivery Information</div>
                <p><strong>Delivery Note No:</strong> DN-${creditSale.id}</p>
                <p><strong>Reference Invoice:</strong> #${creditSale.id}</p>
                <p><strong>Date:</strong> ${new Date(
                  creditSale.createdAt
                ).toLocaleDateString()}</p>
                <p><strong>Expected Delivery:</strong> ${new Date(
                  creditSale.payment_date
                ).toLocaleDateString()}</p>
              </div>
            </div>

            <div class="section-title">Items to be Delivered</div>
            <table class="items-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item Description</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                ${items
                  .map(
                    (item: any, index: number) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${item.name}</td>
                    <td><strong>${item.selectedItems}</strong></td>
                    <td>Pcs</td>
                    <td style="min-width: 100px;">_____________</td>
                  </tr>
                `
                  )
                  .join('')}
                <tr>
                  <td colspan="5" style="text-align: right; padding: 15px; font-weight: bold;">
                    Total Items: ${
                      items.length
                    } | Total Quantity: ${items.reduce(
      (sum: number, item: any) => sum + (item.selectedItems || 0),
      0
    )}
                  </td>
                </tr>
              </tbody>
            </table>

            <div class="delivery-instructions">
              <div class="section-title">Delivery Instructions</div>
              <p>1. Please verify all items upon delivery</p>
              <p>2. Check for any damage or discrepancies</p>
              <p>3. Sign and date the delivery note upon receipt</p>
              <p>4. Return a signed copy to ${orgDetails.name}</p>
              <p>5. Report any issues within 24 hours of delivery</p>
            </div>

            <div class="signature-section">
              <div class="signature-box">
                <div class="section-title">Delivered By:</div>
                <div class="signature-line">
                  <p>Signature & Date</p>
                  <p style="font-size: 12px; color: #666;">${
                    orgDetails.name
                  }</p>
                </div>
              </div>

              <div class="signature-box">
                <div class="section-title">Received By:</div>
                <div class="signature-line">
                  <p>Signature & Date</p>
                  <p style="font-size: 12px; color: #666;">${
                    creditSale.customer_name
                  }</p>
                </div>
              </div>
            </div>

            <div class="footer">
              <p>${orgDetails.complementaryMessage}</p>
              <p>This is an official delivery note from ${orgDetails.name}</p>
              <p>For any queries, please contact us at ${orgDetails.contact}</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  async printCreditInvoice(
    creditSale: any,
    orgDetails: any,
    printerIp?: string
  ): Promise<void> {
    const invoiceContent = this.generateCreditInvoiceHTML(
      creditSale,
      orgDetails
    );

    try {
      if (printerIp) {
        // Network printer
        await this.printToNetworkPrinter(invoiceContent, printerIp);
      } else if (Capacitor.isNativePlatform()) {
        // Native mobile printing
        await this.printingService.printHTML(invoiceContent, {
          name: `Credit-Invoice-${creditSale.id}`,
          orientation: 'portrait',
          monochrome: false,
        });
      } else {
        // Web browser fallback using direct print
        this.printDirectly(invoiceContent);
      }
    } catch (error) {
      console.error('Print credit invoice error:', error);
      throw error;
    }
  }

  private printDirectly(htmlContent: string): void {
    console.log('Credit invoice printDirectly called');

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
          console.log('Opening credit invoice print dialog...');
          printWindow.print();

          // Close window after a delay
          setTimeout(() => {
            printWindow.close();
            console.log('Credit invoice print window closed');
          }, 1000);
        }, 500);
      };
    } else {
      console.error('Failed to open credit invoice print window');
      alert(
        'Please allow popups to print, or use the browser print function (Ctrl+P)'
      );
    }
  }

  private async printToNetworkPrinter(content: string, printerIp: string) {
    try {
      const response = await fetch(`http://${printerIp}/print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error('Printing failed');
      }
    } catch (error) {
      console.error('Printer error:', error);
      throw error;
    }
  }

  async printDeliveryNote(
    creditSale: any,
    orgDetails: any,
    printerIp?: string
  ): Promise<void> {
    const deliveryNoteContent = this.generateDeliveryNoteHTML(
      creditSale,
      orgDetails
    );

    try {
      if (printerIp) {
        // Network printer
        await this.printToNetworkPrinter(deliveryNoteContent, printerIp);
      } else if (Capacitor.isNativePlatform()) {
        // Native mobile printing
        await this.printingService.printHTML(deliveryNoteContent, {
          name: `Delivery-Note-${creditSale.id}`,
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
