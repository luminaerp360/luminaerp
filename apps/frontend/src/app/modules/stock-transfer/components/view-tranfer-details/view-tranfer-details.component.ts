import { Component, OnInit } from '@angular/core';
import { ModalComponent } from '../../../../shared/Data/components/modal/modal.component';
import {
  StockTransfer,
  StockTransferItem,
} from '../../interfaces/stock-tranfer.interface';

@Component({
  selector: 'app-view-tranfer-details',
  templateUrl: './view-tranfer-details.component.html',
  styleUrl: './view-tranfer-details.component.scss',
})
export class ViewTranferDetailsComponent
  extends ModalComponent
  implements OnInit
{
  transferDetails: StockTransfer | null = null;
  transferItems: StockTransferItem[] = [];
  loading = false;

  constructor() {
    super();
  }

  ngOnInit() {
    console.log('ViewTranferDetailsComponent initialized');
    console.log('Dialog payload:', this.dialogRemoteControl.payload);

    // The actual transfer data is nested in payload.payload
    const dialogPayload = this.dialogRemoteControl.payload as any;
    this.transferDetails = dialogPayload.payload as StockTransfer;

    console.log('Transfer details extracted:', this.transferDetails);

    if (this.transferDetails) {
      // Parse items if they're in JSON string format
      this.parseTransferItems();
    } else {
      console.error('No transfer details provided');
    }
  }

  private parseTransferItems() {
    if (!this.transferDetails) return;

    try {
      console.log('Transfer details items:', this.transferDetails.items);
      console.log('Items type:', typeof this.transferDetails.items);

      // Check if items is a string that needs parsing
      if (typeof this.transferDetails.items === 'string') {
        this.transferItems = JSON.parse(this.transferDetails.items);
      } else if (Array.isArray(this.transferDetails.items)) {
        this.transferItems = this.transferDetails.items;
      } else {
        this.transferItems = [];
      }

      console.log('Parsed transfer items:', this.transferItems);
    } catch (error) {
      console.error('Error parsing transfer items:', error);
      this.transferItems = [];
    }
  }

  getTotalQuantity(): number {
    return this.transferItems.reduce(
      (total, item) => total + (item.quantity || 0),
      0
    );
  }

  getTotalValue(): number {
    return this.transferItems.reduce(
      (total, item) => total + (item.quantity || 0) * (item.unitPrice || 0),
      0
    );
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getStatusBadgeClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  override close() {
    super.close();
  }
}
