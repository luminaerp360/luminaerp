import { Component, OnInit } from '@angular/core';
import { ModalComponent } from '../../../../shared/Data/components/modal/modal.component';
import { ReceiptService } from '../../services/receiprt.service';

interface OrderItem {
  name: string;
  id: number;
  category_id: number;
  price: number;
  selectedItems: number;
}

interface OrderPayment {
  id: number;
  paymentMethodId?: number;
  paymentMethodCode: string;
  paymentMethodName: string;
  amount: number;
  transactionCode: string;
  paymentDate: string;
  recordedBy?: string;
}

interface OrderDetails {
  id: number;
  createdAt: string;
  updatedAt: string;
  items: string | any[]; // Allow both string (SQLite) and array (PostgreSQL)
  total: number;
  bankPaid: number;
  cashPaid: number;
  customerId: number;
  customer_name?: string;
  customerEmail?: string;
  discountAmount: number;
  isVoided: boolean;
  mpesaPaid: number;
  mpesaTransactionId: string;
  printerIp: string;
  taxAmount: number;
  totalAmountPaid: number;
  userId: number;
  voidedBy: number;
  created_by?: string;
  payments?: OrderPayment[]; // New dynamic payment methods
}

@Component({
  selector: 'app-view-order-details',
  templateUrl: './view-order-details.component.html',
  styleUrls: ['./view-order-details.component.scss'],
})
export class ViewOrderDetailsComponent
  extends ModalComponent
  implements OnInit
{
  orderDetails: OrderDetails;
  parsedItems: any[] = [];

  constructor(private receiptService: ReceiptService) {
    super();
    this.orderDetails = this.dialogRemoteControl.payload;
    this.parseItems();
  }

  ngOnInit() {
    this.orderDetails = this.dialogRemoteControl.payload;
    this.parseItems();
  }

  private parseItems() {
    try {
      console.log('Order details:', this.orderDetails);

      if (!this.orderDetails.items) {
        console.warn('No items found in order details');
        this.parsedItems = [];
        return;
      }

      // Handle both SQLite (string) and PostgreSQL (array) formats
      if (typeof this.orderDetails.items === 'string') {
        const parsed = JSON.parse(this.orderDetails.items);
        this.parsedItems = Array.isArray(parsed)
          ? parsed.filter(
              (item: any) =>
                item && typeof item === 'object' && !Array.isArray(item),
            )
          : [];
      } else if (Array.isArray(this.orderDetails.items)) {
        // Filter out non-object entries (e.g. nested empty arrays [[]] from legacy data)
        this.parsedItems = this.orderDetails.items.filter(
          (item: any) =>
            item && typeof item === 'object' && !Array.isArray(item),
        );
      } else {
        console.warn(
          'Items property is not a string or array:',
          this.orderDetails.items,
        );
        this.parsedItems = [];
      }

      console.log('Parsed items:', this.parsedItems);
    } catch (error) {
      console.error('Error parsing order items:', error);
      this.parsedItems = [];
    }
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleString();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  }

  getPrimaryPaymentMethod(): string {
    console.log('getPrimaryPaymentMethod called');
    console.log('orderDetails:', this.orderDetails);
    console.log('payments array:', this.orderDetails?.payments);

    // Check if we have the new payments array
    if (this.orderDetails.payments && this.orderDetails.payments.length > 0) {
      console.log(
        'Found payments array with',
        this.orderDetails.payments.length,
        'payments',
      );

      // If there's only one payment method, return it
      if (this.orderDetails.payments.length === 1) {
        const method = this.orderDetails.payments[0].paymentMethodName;
        console.log('Single payment method:', method);
        return method;
      }

      // If multiple payment methods, check combinations
      const hasCash = this.orderDetails.payments.some(
        (p) => p.paymentMethodCode === 'CASH',
      );
      const hasMpesa = this.orderDetails.payments.some(
        (p) => p.paymentMethodCode === 'MPESA',
      );
      const hasBank = this.orderDetails.payments.some(
        (p) => p.paymentMethodCode === 'BANK',
      );

      if (hasCash && hasMpesa && hasBank) {
        return 'Mixed Payment (Cash + M-PESA + Bank)';
      } else if (hasCash && hasMpesa) {
        return 'Mixed Payment (Cash + M-PESA)';
      } else if (hasCash && hasBank) {
        return 'Mixed Payment (Cash + Bank)';
      } else if (hasMpesa && hasBank) {
        return 'Mixed Payment (M-PESA + Bank)';
      } else {
        return 'Multiple Payment Methods';
      }
    }

    // Fall back to legacy payment fields
    console.log('No payments array found, falling back to legacy fields');
    return this.getLegacyPaymentMethod();
  }

  getLegacyPaymentMethod(): string {
    const payments = [];
    if (this.orderDetails.cashPaid > 0) payments.push('Cash');
    if (this.orderDetails.mpesaPaid > 0) payments.push('M-PESA');
    if (this.orderDetails.bankPaid > 0) payments.push('Bank Transfer');

    if (payments.length === 0) return 'Unknown';
    if (payments.length === 1) return payments[0];
    return `Mixed (${payments.join(' + ')})`;
  }

  getPaymentHistory(): any[] {
    // Return new payment system data if available
    if (this.orderDetails.payments && this.orderDetails.payments.length > 0) {
      return this.orderDetails.payments.map((payment) => ({
        method: payment.paymentMethodName,
        amount: payment.amount,
        transactionCode: payment.transactionCode,
        recordedBy:
          payment.recordedBy || this.orderDetails.created_by || 'System',
        date: payment.paymentDate || this.orderDetails.createdAt,
      }));
    }

    // Fall back to legacy payment fields
    const payments = [];
    if (this.orderDetails.cashPaid > 0) {
      payments.push({
        method: 'Cash Payment',
        amount: this.orderDetails.cashPaid,
        transactionCode: null,
        recordedBy: this.orderDetails.created_by || 'System',
        date: this.orderDetails.createdAt,
      });
    }
    if (this.orderDetails.mpesaPaid > 0) {
      payments.push({
        method: 'M-PESA',
        amount: this.orderDetails.mpesaPaid,
        transactionCode: this.orderDetails.mpesaTransactionId,
        recordedBy: this.orderDetails.created_by || 'System',
        date: this.orderDetails.createdAt,
      });
    }
    if (this.orderDetails.bankPaid > 0) {
      payments.push({
        method: 'Bank Transfer',
        amount: this.orderDetails.bankPaid,
        transactionCode: null,
        recordedBy: this.orderDetails.created_by || 'System',
        date: this.orderDetails.createdAt,
      });
    }

    return payments;
  }
}
