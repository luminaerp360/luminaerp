import { Component, OnInit } from '@angular/core';
import {
  StorePurchase,
  PurchaseStatus,
} from '../../../../../shared/interfaces/store.interface';
import { StorePurchaseService } from '../../../../../shared/Services/store-purchase.service';
import { AddStorePurchaseComponent } from '../add-store-purchase/add-store-purchase.component';
import { ReceiveStorePurchaseComponent } from '../receive-store-purchase/receive-store-purchase.component';
import {
  AppearanceAnimation,
  DialogRemoteControl,
  DisappearanceAnimation,
} from '@ng-vibe/dialog';
import { finalize } from 'rxjs/operators';
import { HotToastService } from '@ngneat/hot-toast';

@Component({
  selector: 'app-show-store-purchases',
  templateUrl: './show-store-purchases.component.html',
  styleUrl: './show-store-purchases.component.scss',
})
export class ShowStorePurchasesComponent implements OnInit {
  private dialog: DialogRemoteControl = new DialogRemoteControl(
    AddStorePurchaseComponent,
  );
  private updateDialog: DialogRemoteControl = new DialogRemoteControl(
    AddStorePurchaseComponent,
  );
  private receiveDialog: DialogRemoteControl = new DialogRemoteControl(
    ReceiveStorePurchaseComponent,
  );
  storePurchases: StorePurchase[] = [];
  query: string = '';
  loading: boolean = false;
  statusFilter: PurchaseStatus | '' = '';
  expandedPurchaseId: number | null = null;
  receiveHistory: Record<number, any[] | undefined> = {};
  historyLoading: Record<number, boolean | undefined> = {};

  constructor(
    private storePurchaseService: StorePurchaseService,
    private toast: HotToastService,
  ) {}

  ngOnInit(): void {
    this.getAllStorePurchases();
  }

  onInputChange() {
    this.filterLocally();
  }

  onStatusChange() {
    this.getAllStorePurchases();
  }

  getAllStorePurchases(): void {
    this.loading = true;
    const params: any = {};
    if (this.statusFilter) params.status = this.statusFilter;
    this.storePurchaseService
      .getAllStorePurchases(params)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe((purchases) => {
        this.storePurchases = purchases;
        this.filterLocally();
      });
  }

  private allPurchases: StorePurchase[] = [];
  filterLocally(): void {
    if (
      !this.allPurchases.length ||
      this.allPurchases !== this.storePurchases
    ) {
      this.allPurchases = [...this.storePurchases];
    }
    if (this.query && this.query.trim()) {
      const q = this.query.toLowerCase();
      this.storePurchases = this.allPurchases.filter(
        (p) =>
          p.purchaseNumber?.toLowerCase().includes(q) ||
          p.items?.some((i) =>
            i.storeProduct?.productName?.toLowerCase().includes(q),
          ),
      );
    } else {
      this.storePurchases = [...this.allPurchases];
    }
  }

  toggleExpand(id: number): void {
    this.expandedPurchaseId = this.expandedPurchaseId === id ? null : id;
    if (this.expandedPurchaseId === id) {
      this.loadReceiveHistory(id);
    }
  }

  loadReceiveHistory(purchaseId: number): void {
    const purchase = this.storePurchases.find((p) => p.id === purchaseId);
    if (
      !purchase ||
      (purchase.status !== 'RECEIVED' &&
        purchase.status !== 'PARTIALLY_RECEIVED')
    ) {
      return;
    }
    this.historyLoading[purchaseId] = true;
    this.storePurchaseService
      .getReceiveHistory(purchaseId)
      .pipe(finalize(() => (this.historyLoading[purchaseId] = false)))
      .subscribe(
        (history) => {
          this.receiveHistory[purchaseId] = history;
        },
        () => {
          this.receiveHistory[purchaseId] = [];
        },
      );
  }

  approvePurchase(id: number): void {
    if (confirm('Approve this purchase order?')) {
      this.loading = true;
      this.storePurchaseService
        .approveStorePurchase(id)
        .pipe(finalize(() => (this.loading = false)))
        .subscribe(
          () => {
            this.toast.success('Purchase approved');
            this.getAllStorePurchases();
          },
          (error) =>
            this.toast.error(error.error?.message || 'Error approving'),
        );
    }
  }

  rejectPurchase(id: number): void {
    const reason = prompt('Enter rejection reason:');
    if (reason) {
      this.loading = true;
      this.storePurchaseService
        .rejectStorePurchase(id, reason)
        .pipe(finalize(() => (this.loading = false)))
        .subscribe(
          () => {
            this.toast.success('Purchase rejected');
            this.getAllStorePurchases();
          },
          (error) =>
            this.toast.error(error.error?.message || 'Error rejecting'),
        );
    }
  }

  receivePurchase(purchase: StorePurchase): void {
    this.receiveDialog.options = {
      showOverlay: true,
      animationIn: AppearanceAnimation.ZOOM_IN,
      animationOut: DisappearanceAnimation.ZOOM_OUT,
    };
    this.receiveDialog.openDialog(purchase).subscribe((resp) => {
      if (resp) this.getAllStorePurchases();
    });
  }

  printGrn(id: number): void {
    this.loading = true;
    this.storePurchaseService
      .getGrn(id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe(
        (grn) => {
          this.generateGrnPrint(grn);
        },
        (error) =>
          this.toast.error(error.error?.message || 'Error loading GRN'),
      );
  }

  printReceiveGrn(purchaseId: number, receiveId: number): void {
    this.loading = true;
    this.storePurchaseService
      .getReceiveGrn(purchaseId, receiveId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe(
        (grn) => {
          this.generateReceiveGrnPrint(grn);
        },
        (error) =>
          this.toast.error(error.error?.message || 'Error loading GRN'),
      );
  }

  private generateGrnPrint(grn: any): void {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      this.toast.error('Please allow popups to print GRN');
      return;
    }

    const itemRows = grn.items
      .map(
        (item: any, index: number) => `
      <tr>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:center">${index + 1}</td>
        <td style="padding:6px 8px;border:1px solid #ddd">${item.productName}</td>
        <td style="padding:6px 8px;border:1px solid #ddd">${item.sku || '—'}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:center">${item.orderedQuantity}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:center">${item.receivedQuantity}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:center">${item.pendingQuantity}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:right">KSH ${item.unitPrice.toFixed(2)}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:right">KSH ${item.receivedTotal.toFixed(2)}</td>
      </tr>`,
      )
      .join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>GRN - ${grn.grnNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 3px solid #4f46e5; padding-bottom: 15px; }
    .header h1 { margin: 0; font-size: 24px; color: #4f46e5; }
    .header h2 { margin: 4px 0 0 0; font-size: 14px; color: #666; }
    .org-name { font-size: 18px; font-weight: bold; }
    .org-details { font-size: 12px; color: #666; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
    .info-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
    .info-box label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
    .info-box p { margin: 3px 0 0; font-size: 14px; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    thead th { background: #4f46e5; color: white; padding: 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
    tbody td { font-size: 13px; }
    .totals { text-align: right; margin-top: 10px; }
    .totals .row { display: flex; justify-content: flex-end; gap: 20px; padding: 4px 0; font-size: 14px; }
    .totals .total { font-weight: bold; font-size: 16px; border-top: 2px solid #333; padding-top: 6px; }
    .footer { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; }
    .signature { text-align: center; }
    .signature .line { border-top: 1px solid #999; margin-top: 50px; padding-top: 5px; font-size: 12px; color: #666; }
    .status-badge { display: inline-block; padding: 3px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .status-received { background: #d1fae5; color: #065f46; }
    .status-partial { background: #fef3c7; color: #92400e; }
    .notes { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px; margin-bottom: 15px; font-size: 13px; }
    @media print { body { margin: 10px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print" style="text-align:right;margin-bottom:10px">
    <button onclick="window.print()" style="background:#4f46e5;color:white;border:none;padding:8px 20px;border-radius:6px;cursor:pointer;font-size:14px">Print GRN</button>
  </div>

  <div class="header">
    <div>
      <h1>GOODS RECEIVED NOTE</h1>
      <h2>${grn.grnNumber}</h2>
    </div>
    <div style="text-align:right">
      <div class="org-name">${grn.organization?.name || ''}</div>
      <div class="org-details">${grn.organization?.address || ''}</div>
      <div class="org-details">${grn.organization?.contact || ''}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <label>GRN Number</label>
      <p>${grn.grnNumber}</p>
    </div>
    <div class="info-box">
      <label>PO Number</label>
      <p>${grn.purchaseNumber}</p>
    </div>
    <div class="info-box">
      <label>Supplier</label>
      <p>${grn.supplier?.name || '—'}</p>
    </div>
    <div class="info-box">
      <label>Status</label>
      <p><span class="status-badge ${grn.status === 'RECEIVED' ? 'status-received' : 'status-partial'}">${grn.status === 'PARTIALLY_RECEIVED' ? 'Partial' : 'Fully Received'}</span></p>
    </div>
    <div class="info-box">
      <label>Received By</label>
      <p>${grn.receivedBy || '—'}</p>
    </div>
    <div class="info-box">
      <label>Date Received</label>
      <p>${grn.receivedAt ? new Date(grn.receivedAt).toLocaleDateString() : new Date().toLocaleDateString()}</p>
    </div>
    <div class="info-box">
      <label>Created By</label>
      <p>${grn.createdBy?.fullName || '—'}</p>
    </div>
    <div class="info-box">
      <label>Approved By</label>
      <p>${grn.approvedBy?.fullName || '—'}</p>
    </div>
  </div>

  ${grn.notes ? `<div class="notes"><strong>Notes:</strong> ${grn.notes}</div>` : ''}

  <table>
    <thead>
      <tr>
        <th style="width:30px">#</th>
        <th>Product</th>
        <th>SKU</th>
        <th style="text-align:center">Ordered</th>
        <th style="text-align:center">Received</th>
        <th style="text-align:center">Pending</th>
        <th style="text-align:right">Unit Price</th>
        <th style="text-align:right">Received Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Order Total:</span><span>KSH ${grn.totalAmount.toFixed(2)}</span></div>
    <div class="row total"><span>Received Total:</span><span>KSH ${grn.totalReceived.toFixed(2)}</span></div>
  </div>

  <div class="footer">
    <div class="signature">
      <div class="line">Received By</div>
    </div>
    <div class="signature">
      <div class="line">Checked By</div>
    </div>
    <div class="signature">
      <div class="line">Authorized By</div>
    </div>
  </div>

  <div style="text-align:center;margin-top:30px;font-size:11px;color:#999">
    Printed on ${new Date().toLocaleString()} | ${grn.grnNumber}
  </div>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
  }

  private generateReceiveGrnPrint(grn: any): void {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      this.toast.error('Please allow popups to print GRN');
      return;
    }

    const itemRows = grn.items
      .map(
        (item: any, index: number) => `
      <tr>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:center">${index + 1}</td>
        <td style="padding:6px 8px;border:1px solid #ddd">${item.productName}</td>
        <td style="padding:6px 8px;border:1px solid #ddd">${item.sku || '—'}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:center">${item.orderedQuantity}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;font-weight:bold">${item.receivedQuantity}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:right">KSH ${item.unitPrice.toFixed(2)}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:right">KSH ${item.receivedTotal.toFixed(2)}</td>
      </tr>`,
      )
      .join('');

    const receiveHtml = `<!DOCTYPE html>
<html>
<head>
  <title>GRN - ${grn.grnNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 3px solid #0d9488; padding-bottom: 15px; }
    .header h1 { margin: 0; font-size: 24px; color: #0d9488; }
    .header h2 { margin: 4px 0 0 0; font-size: 14px; color: #666; }
    .org-name { font-size: 18px; font-weight: bold; }
    .org-details { font-size: 12px; color: #666; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
    .info-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
    .info-box label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
    .info-box p { margin: 3px 0 0; font-size: 14px; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    thead th { background: #0d9488; color: white; padding: 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
    tbody td { font-size: 13px; }
    .totals { text-align: right; margin-top: 10px; }
    .totals .row { display: flex; justify-content: flex-end; gap: 20px; padding: 4px 0; font-size: 14px; }
    .totals .total { font-weight: bold; font-size: 16px; border-top: 2px solid #333; padding-top: 6px; }
    .footer { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; }
    .signature { text-align: center; }
    .signature .line { border-top: 1px solid #999; margin-top: 50px; padding-top: 5px; font-size: 12px; color: #666; }
    .badge { display: inline-block; padding: 3px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; background: #ccfbf1; color: #0d9488; }
    .notes { background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 10px; margin-bottom: 15px; font-size: 13px; }
    @media print { body { margin: 10px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print" style="text-align:right;margin-bottom:10px">
    <button onclick="window.print()" style="background:#0d9488;color:white;border:none;padding:8px 20px;border-radius:6px;cursor:pointer;font-size:14px">Print GRN</button>
  </div>

  <div class="header">
    <div>
      <h1>GOODS RECEIVED NOTE</h1>
      <h2>${grn.grnNumber} <span class="badge">Partial Receive</span></h2>
    </div>
    <div style="text-align:right">
      <div class="org-name">${grn.organization?.name || ''}</div>
      <div class="org-details">${grn.organization?.address || ''}</div>
      <div class="org-details">${grn.organization?.contact || ''}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <label>GRN Number</label>
      <p>${grn.grnNumber}</p>
    </div>
    <div class="info-box">
      <label>PO Number</label>
      <p>${grn.purchaseNumber}</p>
    </div>
    <div class="info-box">
      <label>Supplier</label>
      <p>${grn.supplier?.name || '—'}</p>
    </div>
    <div class="info-box">
      <label>Received By</label>
      <p>${grn.receivedBy?.fullName || '—'}</p>
    </div>
    <div class="info-box">
      <label>Date Received</label>
      <p>${grn.receivedAt ? new Date(grn.receivedAt).toLocaleDateString() : '—'}</p>
    </div>
    <div class="info-box">
      <label>Approved By</label>
      <p>${grn.approvedBy?.fullName || '—'}</p>
    </div>
  </div>

  ${grn.notes ? `<div class="notes"><strong>Notes:</strong> ${grn.notes}</div>` : ''}

  <table>
    <thead>
      <tr>
        <th style="width:30px">#</th>
        <th>Product</th>
        <th>SKU</th>
        <th style="text-align:center">Ordered Qty</th>
        <th style="text-align:center">Received This Time</th>
        <th style="text-align:right">Unit Price</th>
        <th style="text-align:right">Received Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="totals">
    <div class="row total"><span>Total This Receive:</span><span>KSH ${grn.totalReceived.toFixed(2)}</span></div>
  </div>

  <div class="footer">
    <div class="signature">
      <div class="line">Received By</div>
    </div>
    <div class="signature">
      <div class="line">Checked By</div>
    </div>
    <div class="signature">
      <div class="line">Authorized By</div>
    </div>
  </div>

  <div style="text-align:center;margin-top:30px;font-size:11px;color:#999">
    Printed on ${new Date().toLocaleString()} | ${grn.grnNumber}
  </div>
</body>
</html>`;

    printWindow.document.write(receiveHtml);
    printWindow.document.close();
  }

  cancelPurchase(id: number): void {
    if (confirm('Cancel this purchase?')) {
      this.loading = true;
      this.storePurchaseService
        .cancelStorePurchase(id)
        .pipe(finalize(() => (this.loading = false)))
        .subscribe(() => {
          this.toast.success('Purchase cancelled');
          this.getAllStorePurchases();
        });
    }
  }

  deleteStorePurchase(id: number): void {
    if (confirm('Delete this purchase permanently?')) {
      this.loading = true;
      this.storePurchaseService
        .deleteStorePurchase(id)
        .pipe(finalize(() => (this.loading = false)))
        .subscribe(() => {
          this.toast.success('Purchase deleted');
          this.getAllStorePurchases();
        });
    }
  }

  openAddDialog() {
    this.dialog.options = {
      showOverlay: true,
      animationIn: AppearanceAnimation.ZOOM_IN,
      animationOut: DisappearanceAnimation.ZOOM_OUT,
    };
    this.dialog.openDialog().subscribe((resp) => {
      if (resp) this.getAllStorePurchases();
    });
  }

  openUpdateDialog(purchase: StorePurchase) {
    this.updateDialog.options = {
      showOverlay: true,
      animationIn: AppearanceAnimation.ZOOM_IN,
      animationOut: DisappearanceAnimation.ZOOM_OUT,
    };
    this.updateDialog.openDialog(purchase).subscribe((resp) => {
      if (resp) this.getAllStorePurchases();
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30';
      case 'APPROVED':
        return 'text-green-500 bg-green-100 dark:bg-green-900/30';
      case 'REJECTED':
        return 'text-red-500 bg-red-100 dark:bg-red-900/30';
      case 'PARTIALLY_RECEIVED':
        return 'text-orange-500 bg-orange-100 dark:bg-orange-900/30';
      case 'RECEIVED':
        return 'text-blue-500 bg-blue-100 dark:bg-blue-900/30';
      case 'CANCELLED':
        return 'text-gray-500 bg-gray-100 dark:bg-gray-900/30';
      default:
        return 'text-gray-400 bg-gray-100 dark:bg-gray-900/30';
    }
  }
}
