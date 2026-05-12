import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../Environments/environments';

@Injectable({
  providedIn: 'root',
})
export class QuotationReceiptService {
  private apiUrl: string;

  constructor(private http: HttpClient) {
    this.apiUrl = `${environment.apiRootUrl}quotations`;
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  // Get printable data from API
  getPrintableData(quotationId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${quotationId}/printable-data`, {
      headers: this.getHeaders(),
    });
  }

  generateQuotationHTML(printableData: any): string {
    const data = printableData.data || printableData;
    const items = data.items || [];
    const customer = data.customer || data.supplier || {};

    // Use data from API response
    const subtotal = data.subtotal || 0;
    const vatAmount = data.vatAmount || 0;
    const totalAmount = data.total || 0;
    const vatRate = data.vatRate || 0.16;

    // Generate items HTML
    let itemsHTML = '';
    items.forEach((item: any) => {
      const unitPrice = item.unitPrice || 0;
      const quantity = item.quantity || 0;
      const itemTotal = item.total || unitPrice * quantity;

      console.log(
        `Generating HTML for: ${item.description}, Price: ${unitPrice}, Qty: ${quantity}, Total: ${itemTotal}`,
      );

      itemsHTML += `
        <tr>
          <td>${item.description || 'N/A'}</td>
          <td>${quantity}</td>
          <td class="amount-col">KES ${unitPrice.toFixed(2)}</td>
          <td class="amount-col">KES ${itemTotal.toFixed(2)}</td>
        </tr>
      `;
    });

    console.log('Generated items HTML:', itemsHTML);

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
            .quotation-info-section {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
              gap: 20px;
            }
            .customer-details, .quotation-info {
              flex: 1;
              border: 1px solid #ddd;
              padding: 15px;
              border-radius: 5px;
            }
            .section-title {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 10px;
              color: #2c5282;
              border-bottom: 1px solid #eee;
              padding-bottom: 5px;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            .items-table th {
              background-color: #2c5282;
              color: white;
              padding: 12px 10px;
              text-align: left;
              font-weight: bold;
            }
            .items-table td {
              padding: 10px;
              border-bottom: 1px solid #ddd;
            }
            .items-table tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .amount-col {
              text-align: right;
            }
            .totals {
              float: right;
              width: 300px;
              margin-top: 20px;
              border: 1px solid #ddd;
              padding: 15px;
              border-radius: 5px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 5px 0;
              border-bottom: 1px solid #eee;
            }
            .total-row.grand-total {
              font-weight: bold;
              border-top: 2px solid #333;
              border-bottom: 2px solid #333;
              padding: 10px 0;
              background-color: #f0f8f0;
            }
            .payment-info {
              clear: both;
              margin-top: 40px;
              padding: 20px;
              border: 1px solid #ddd;
              border-radius: 5px;
              background-color: #f9f9f9;
            }
            .footer {
              margin-top: 50px;
              text-align: center;
              font-size: 14px;
              color: #666;
              border-top: 1px solid #ddd;
              padding-top: 20px;
            }
            .quotation-terms {
              margin-top: 20px;
              padding: 15px;
              background-color: #f3f4f6;
              border-radius: 5px;
              border: 1px solid #e5e7eb;
            }
            .validity-notice {
              margin-top: 20px;
              padding: 15px;
              background-color: #fff3cd;
              border: 1px solid #ffeeba;
              border-radius: 5px;
              text-align: center;
              color: #856404;
              font-weight: bold;
            }
            .quotation-status {
              display: inline-block;
              padding: 5px 15px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: bold;
              text-transform: uppercase;
            }
            .status-pending {
              background-color: #fef3c7;
              color: #92400e;
            }
            .status-approved {
              background-color: #d1fae5;
              color: #065f46;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${data.organizationName || 'Company Name'}</h1>
              ${
                data.organizationAddress
                  ? `<p>${data.organizationAddress}</p>`
                  : ''
              }
              ${
                data.organizationContact
                  ? `<p>Tel: ${data.organizationContact}</p>`
                  : ''
              }
              <p style="font-size: 18px; margin-top: 15px; color: #2c5282;">QUOTATION</p>
            </div>

            <div class="quotation-info-section">
              <div class="customer-details">
                <div class="section-title">Customer Information</div>
                <p><strong>Name:</strong> ${
                  customer?.name || 'Walk-in Customer'
                }</p>
                <p><strong>Phone:</strong> ${customer?.phone || 'N/A'}</p>
                ${
                  customer?.email
                    ? `<p><strong>Email:</strong> ${customer.email}</p>`
                    : '<p><strong>Email:</strong> N/A</p>'
                }
              </div>

              <div class="quotation-info">
                <div class="section-title">Quotation Details</div>
                <p><strong>Quotation Number:</strong> ${
                  data.quotationNumber
                }</p>
                <p><strong>Date:</strong> ${new Date(
                  data.date,
                ).toLocaleDateString()}</p>
                <p><strong>Status:</strong> <span class="quotation-status status-${
                  data.status?.toLowerCase() || 'pending'
                }">${data.status || 'PENDING'}</span></p>
                <p><strong>Valid Until:</strong> ${new Date(
                  data.validUntil,
                ).toLocaleDateString()}</p>
                <p><strong>VAT Rate:</strong> ${(vatRate * 100).toFixed(0)}%</p>
              </div>
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHTML}
              </tbody>
            </table>

            <div class="totals">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>KES ${subtotal.toFixed(2)}</span>
              </div>
              <div class="total-row">
                <span>VAT (${(vatRate * 100).toFixed(0)}%):</span>
                <span>KES ${vatAmount.toFixed(2)}</span>
              </div>
              <div class="total-row grand-total">
                <span>Total Amount:</span>
                <span>KES ${totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <div class="quotation-terms">
              <div class="section-title">Terms & Conditions</div>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>This quotation is valid for 30 days from the date of issue</li>
                <li>Prices are inclusive of VAT where applicable</li>
                <li>Payment terms to be agreed upon order confirmation</li>
                <li>Delivery terms and conditions apply</li>
              </ul>
            </div>

            <div class="validity-notice">
              This quotation is valid until ${new Date(
                data.validUntil,
              ).toLocaleDateString()}
            </div>

            <div class="footer">
              <p>Thank you for choosing ${
                data.organizationName || 'our services'
              }!</p>
              <p>For any queries, please contact us at ${
                data.organizationContact
              }</p>
              <p style="margin-top: 15px; font-size: 12px; color: #888;">
                This is a computer-generated quotation.<br>
                Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  printQuotation(quotationId: number) {
    console.log('Printing quotation with ID:', quotationId);

    // Fetch printable data from API
    this.getPrintableData(quotationId).subscribe(
      (response: any) => {
        console.log('Received printable data:', response);

        if (!response || !response.success) {
          console.error('Failed to get printable data:', response);
          alert(
            'Failed to load quotation data for printing. Please try again.',
          );
          return;
        }

        const quotationContent = this.generateQuotationHTML(response);

        // Log the complete HTML to see if prices are there
        console.log(
          'Complete HTML being sent to print window:',
          quotationContent,
        );

        const printWindow = window.open('', '', 'width=800,height=600');
        if (printWindow) {
          printWindow.document.write(quotationContent);
          printWindow.document.close();

          printWindow.onload = function () {
            // Check the actual content in the print window
            console.log(
              'Print window content:',
              printWindow.document.body.innerHTML,
            );
            printWindow.print();
            setTimeout(() => {
              printWindow.close();
            }, 500);
          };
        } else {
          alert('Please allow popups for this website to print quotations.');
        }
      },
      (error) => {
        console.error('Error fetching printable data:', error);
        alert(
          'Failed to load quotation data for printing. Please check your connection and try again.',
        );
      },
    );
  }
}
