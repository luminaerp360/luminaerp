import { Injectable } from '@angular/core';
import { PrintingService } from '../../../shared/Services/printing.service';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root',
})
export class PaymentReceiptService {
  constructor(private printingService: PrintingService) {}

  generatePaymentReceiptHTML(payment: any, orgDetails: any): string {
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
              max-width: 600px;
              margin: 0 auto;
              border: 2px solid #333;
              padding: 20px;
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
            .receipt-title {
              font-size: 22px;
              font-weight: bold;
              color: #059669;
              margin-top: 15px;
            }
            .receipt-details {
              margin-bottom: 30px;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #ddd;
            }
            .detail-label {
              font-weight: bold;
              color: #2c5282;
            }
            .detail-value {
              text-align: right;
            }
            .amount-section {
              background-color: #f3f4f6;
              padding: 20px;
              border-radius: 5px;
              margin: 20px 0;
            }
            .amount-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              font-size: 18px;
            }
            .total-amount {
              font-size: 24px;
              font-weight: bold;
              color: #059669;
              border-top: 2px solid #333;
              padding-top: 15px;
              margin-top: 15px;
            }
            .footer {
              margin-top: 50px;
              text-align: center;
              font-size: 14px;
              color: #666;
              border-top: 1px solid #ddd;
              padding-top: 20px;
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
          <div class="watermark">PAYMENT RECEIPT</div>
          <div class="container">
            <div class="header">
              <h1>${orgDetails.name}</h1>
              <p>${orgDetails.address}</p>
              <p>Tel: ${orgDetails.contact}</p>
              ${orgDetails.email ? `<p>Email: ${orgDetails.email}</p>` : ''}
              <p class="receipt-title">PAYMENT RECEIPT</p>
            </div>

            <div class="receipt-details">
              <div class="detail-row">
                <span class="detail-label">Receipt No:</span>
                <span class="detail-value">#${payment.id || 'N/A'}</span>
              </div>
              ${
                payment.orderId || payment.creditSaleId
                  ? `
                <div class="detail-row">
                  <span class="detail-label">Invoice No:</span>
                  <span class="detail-value">#${payment.orderId || payment.creditSaleId}</span>
                </div>
              `
                  : ''
              }
              <div class="detail-row">
                <span class="detail-label">Date:</span>
                <span class="detail-value">${new Date(
                  payment.createdAt
                ).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Received From:</span>
                <span class="detail-value">${payment.paidBy || 'Customer'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Payment Method:</span>
                <span class="detail-value">${
                  payment.method === 'MPESA' ? 'M-PESA' :
                  payment.method === 'BANK_TRANSFER' ? 'Bank Transfer' :
                  payment.method
                }</span>
              </div>
              ${
                payment.transactionCode
                  ? `
                <div class="detail-row">
                  <span class="detail-label">Transaction Code:</span>
                  <span class="detail-value">${payment.transactionCode}</span>
                </div>
              `
                  : ''
              }
              ${
                payment.description
                  ? `
                <div class="detail-row">
                  <span class="detail-label">Payment For:</span>
                  <span class="detail-value">${payment.description}</span>
                </div>
              `
                  : ''
              }
            </div>

            <div class="amount-section">
              <div class="amount-row total-amount">
                <span>Amount Received:</span>
                <span>KES ${payment.amount.toFixed(2)}</span>
              </div>
            </div>

            <div class="signature-section">
              <div class="signature-box">
                <div class="detail-label">Authorized By:</div>
                <div class="signature-line">
                  <p>Signature & Date</p>
                  <p style="font-size: 12px; color: #666;">${
                    orgDetails.name
                  }</p>
                </div>
              </div>

              <div class="signature-box">
                <div class="detail-label">Customer Signature:</div>
                <div class="signature-line">
                  <p>Signature & Date</p>
                  <p style="font-size: 12px; color: #666;">${
                    payment.paidBy || 'Customer'
                  }</p>
                </div>
              </div>
            </div>

            <div class="footer">
              <p>${orgDetails.complementaryMessage || 'Thank you for your business!'}</p>
              <p>This is an official payment receipt from ${orgDetails.name}</p>
              <p>For any queries, please contact us at ${orgDetails.contact}</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  async printPaymentReceipt(
    payment: any,
    orgDetails: any,
    printerIp?: string
  ): Promise<void> {
    const receiptContent = this.generatePaymentReceiptHTML(
      payment,
      orgDetails
    );

    try {
      if (printerIp) {
        // Network printer
        await this.printToNetworkPrinter(receiptContent, printerIp);
      } else if (Capacitor.isNativePlatform()) {
        // Native mobile printing
        await this.printingService.printHTML(receiptContent, {
          name: `Payment-Receipt-${payment.id}`,
          orientation: 'portrait',
          monochrome: false,
        });
      } else {
        // Web browser fallback using direct print
        this.printDirectly(receiptContent);
      }
    } catch (error) {
      console.error('Print payment receipt error:', error);
      throw error;
    }
  }

  private printDirectly(htmlContent: string): void {
    console.log('Payment receipt printDirectly called');

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
          console.log('Opening payment receipt print dialog...');
          printWindow.print();

          // Close window after a delay
          setTimeout(() => {
            printWindow.close();
            console.log('Payment receipt print window closed');
          }, 1000);
        }, 500);
      };
    } else {
      console.error('Failed to open payment receipt print window');
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
}
