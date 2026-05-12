import { Component } from '@angular/core';
import { CreditPaymentsService } from '../../../../../shared/Services/credit-payments.service';
import { ModalComponent } from '../../../../../shared/Data/components/modal/modal.component';

interface PaymentRecord {
  id: number;
  creditSaleId: number;
  amount: number;
  paymentMethod: 'CASH' | 'MPESA' | 'BANK_TRANSFER';
  transactionCode?: string;
  paymentDate: string;
  createdAt: string;
}

@Component({
  selector: 'app-payment-history',
  templateUrl: './payment-history.component.html',
  styleUrls: ['./payment-history.component.scss'],
})
export class PaymentHistoryComponent extends ModalComponent {
  payments: PaymentRecord[] = [];
  isLoading = false;
  creditSale: any;
  totalPaid = 0;
  remainingBalance = 0;

  constructor(private creditPaymentsService: CreditPaymentsService) {
    super();
    setTimeout(() => {
      this.loadPaymentHistory();
    });
  }

  loadPaymentHistory(): void {
    this.creditSale = this.dialogRemoteControl.payload;
    this.isLoading = true;

    this.creditPaymentsService
      .getPaymentsByCreditSaleId(this.creditSale.id)
      .subscribe({
        next: (payments: PaymentRecord[]) => {
          this.payments = payments;
          this.calculateTotals();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading payment history:', error);
          this.toast.error('Failed to load payment history');
          this.isLoading = false;
        },
      });
  }

  calculateTotals(): void {
    this.totalPaid = this.payments.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );
    this.remainingBalance =
      this.creditSale.credit_amount - (this.creditSale.amount_paid || 0);
  }

  getPaymentMethodBadgeClass(method: string): string {
    switch (method) {
      case 'CASH':
        return 'bg-green-600 text-white';
      case 'MPESA':
        return 'bg-blue-600 text-white';
      case 'BANK_TRANSFER':
        return 'bg-purple-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  }

  getPaymentMethodLabel(method: string): string {
    switch (method) {
      case 'CASH':
        return 'Cash';
      case 'MPESA':
        return 'M-PESA';
      case 'BANK_TRANSFER':
        return 'Bank Transfer';
      default:
        return method;
    }
  }
}
