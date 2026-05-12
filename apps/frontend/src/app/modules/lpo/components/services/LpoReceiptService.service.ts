import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LpoReceiptService {
  constructor() {}

  generateLpoHTML(lpo: any, orgDetails: any, supplier: any, products: any[]): string {
    const items = typeof lpo.items === 'string' ? 
      JSON.parse(lpo.items) : lpo.items;

    const total = items.reduce((sum: number, item: any) => 
      sum + (item.quantity * item.price), 0);

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
            .document-title {
              text-align: center;
              font-size: 22px;
              font-weight: bold;
              color: #2c5282;
              margin: 20px 0;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            .info-sections {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
            }
            .supplier-details, .lpo-info {
              flex: 1;
            }
            .section-title {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 10px;
              color: #2c5282;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 5px;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
              box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
            }
            .items-table th {
              background-color: #2c5282;
              color: white;
              padding: 12px;
              text-align: left;
            }
            .items-table td {
              padding: 12px;
              border-bottom: 1px solid #e2e8f0;
            }
            .items-table tr:nth-child(even) {
              background-color: #f8fafc;
            }
            .amount-col {
              text-align: right;
            }
            .totals {
              float: right;
              width: 350px;
              margin-top: 20px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #e2e8f0;
            }
            .total-row.grand-total {
              font-weight: bold;
              font-size: 1.1em;
              border-top: 2px solid #333;
              border-bottom: 2px solid #333;
              padding: 15px 0;
              margin-top: 10px;
              color: #2c5282;
            }
            .status-badge {
              display: inline-block;
              padding: 6px 12px;
              border-radius: 15px;
              font-size: 14px;
              font-weight: bold;
              text-transform: uppercase;
            }
            .status-pending {
              background-color: #fef3c7;
              color: #92400e;
            }
            .status-approved {
              background-color: #dcfce7;
              color: #166534;
            }
            .status-rejected {
              background-color: #fee2e2;
              color: #991b1b;
            }
            .terms-section {
              clear: both;
              margin-top: 40px;
              padding: 20px;
              background-color: #f8fafc;
              border-radius: 8px;
            }
            .signatures {
              margin-top: 50px;
              display: flex;
              justify-content: space-between;
            }
            .signature-line {
              flex: 1;
              margin: 0 20px;
              text-align: center;
            }
            .signature-line hr {
              margin: 50px 0 10px 0;
              border: none;
              border-top: 1px solid #000;
            }
            .footer {
              margin-top: 50px;
              text-align: center;
              font-size: 14px;
              color: #666;
              border-top: 1px solid #e2e8f0;
              padding-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${orgDetails.name}</h1>
              <p>${orgDetails.address}</p>
              <p>Tel: ${orgDetails.contact}</p>
            </div>

            <div class="document-title">
              Local Purchase Order (LPO)
            </div>

            <div class="info-sections">
              <div class="supplier-details">
                <div class="section-title">Supplier Details</div>
                <p>Name: ${supplier?.name || 'N/A'}</p>
                <p>Contact: ${supplier?.phone || 'N/A'}</p>
                ${supplier?.email ? `<p>Email: ${supplier.email}</p>` : ''}
                ${supplier?.address ? `<p>Address: ${supplier.address}</p>` : ''}
              </div>

              <div class="lpo-info">
                <div class="section-title">LPO Information</div>
                <p>LPO Number: #${lpo.id}</p>
                <p>Date Issued: ${new Date(lpo.createdAt).toLocaleDateString()}</p>
                <p>Status: <span class="status-badge status-${lpo.status.toLowerCase()}">${lpo.status}</span></p>
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
                ${items.map((item: any) => {
                  const product = products.find(p => p.id === item.productId);
                  return `
                    <tr>
                      <td>${product?.name || `Product ${item.productId}`}</td>
                      <td>${item.quantity}</td>
                      <td class="amount-col">KES ${item.price.toFixed(2)}</td>
                      <td class="amount-col">KES ${(item.quantity * item.price).toFixed(2)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>

            <div class="totals">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>KES ${total.toFixed(2)}</span>
              </div>
              <div class="total-row">
                <span>VAT (16%):</span>
                <span>KES ${(total * 0.16).toFixed(2)}</span>
              </div>
              <div class="total-row grand-total">
                <span>Total Amount:</span>
                <span>KES ${(total * 1.16).toFixed(2)}</span>
              </div>
            </div>

            <div class="terms-section">
              <div class="section-title">Terms & Conditions</div>
              <ol style="padding-left: 20px;">
                <li>All prices quoted must remain valid for 30 days from the date of this LPO</li>
                <li>Delivery must be made within the agreed timeline</li>
                <li>Goods must match the specifications provided</li>
                <li>Payment will be made as per agreed terms</li>
                <li>Any variations must be approved in writing</li>
              </ol>
            </div>

            <div class="signatures">
              <div class="signature-line">
                <hr>
                <p>Authorized Signatory</p>
                <p>${orgDetails.name}</p>
              </div>
              <div class="signature-line">
                <hr>
                <p>Supplier Acknowledgment</p>
                <p>${supplier?.name || 'Supplier Name'}</p>
              </div>
            </div>

            <div class="footer">
              <p>${orgDetails.complementaryMessage}</p>
              <p>This is an official Local Purchase Order from ${orgDetails.name}</p>
              <p>For any queries, please contact us at ${orgDetails.contact}</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  printLpo(lpo: any, orgDetails: any, supplier: any, products: any[]) {
    const lpoContent = this.generateLpoHTML(lpo, orgDetails, supplier, products);

    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(lpoContent);
      printWindow.document.close();

      printWindow.onload = function() {
        printWindow.print();
        setTimeout(() => {
          printWindow.close();
        }, 500);
      };
    }
  }
}