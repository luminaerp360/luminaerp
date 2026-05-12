import { Component, OnInit } from '@angular/core';
import { ModalComponent } from '../../../../../shared/Data/components/modal/modal.component';
import { CreditSaleService } from '../../../../../shared/Services/credit-sale.service';
import {
  CreditPaymentsService,
  CreditSalePayment,
} from '../../../../../shared/Services/credit-payments.service';
import { format } from 'date-fns';
import { finalize } from 'rxjs/operators';

interface SelectedSale {
  id: number;
  balance: number;
}

@Component({
  selector: 'app-multicredit-sale-payments',
  templateUrl: './multicredit-sale-payments.component.html',
  styleUrls: ['./multicredit-sale-payments.component.scss'],
})
export class MulticreditSalePaymentsComponent
  extends ModalComponent
  implements OnInit
{
  customerId: number = 0;
  customerStatement: any = null;
  isLoading: boolean = true;
  error: string | null = null;

  // Selected sales for payment
  selectedSales: SelectedSale[] = [];
  allSelected: boolean = false;

  // Payment form data
  paymentMethod: 'CASH' | 'MPESA' | 'BANK_TRANSFER' = 'CASH';
  transactionCode: string = '';
  paymentAmount: number = 0;
  isProcessing: boolean = false;

  // UI state management
  expandedItems: Set<number> = new Set();

  constructor(
    private creditSaleService: CreditSaleService,
    private creditPaymentsService: CreditPaymentsService
  ) {
    super();
    this.customerId = this.dialogRemoteControl.payload;
    console.log('Customer ID:', this.customerId);
  }

  ngOnInit(): void {
    // Get the customerId from modal payload
    this.customerId = this.dialogRemoteControl.payload;

    // Load customer statement
    this.loadCustomerStatement();
  }

  loadCustomerStatement(): void {
    this.isLoading = true;
    this.error = null;

    // Get current date in YYYY-MM-DD format
    const today = new Date();
    const endDate = format(today, 'yyyy-MM-dd');

    // Get date from 3 months ago
    const startDate = format(
      new Date(today.setMonth(today.getMonth() - 3)),
      'yyyy-MM-dd'
    );

    this.creditSaleService
      .getCustomerCreditStatement(this.customerId, startDate, endDate)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: (response) => {
          this.customerStatement = response;

          // Pre-calculate payment amount based on total outstanding balance
          if (this.customerStatement?.totals?.outstandingBalance) {
            this.paymentAmount =
              this.customerStatement.totals.outstandingBalance;
          }
        },
        error: (err) => {
          console.error('Error loading customer statement:', err);
          this.error = 'Failed to load customer data. Please try again.';
        },
      });
  }

  // Format date for display
  formatDate(dateString: string | Date): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return format(date, 'dd MMM yyyy');
  }

  // Format payment method for display
  formatPaymentMethod(method: string): string {
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

  // Get count of items in a sale
  getItemCount(items: any): number {
    if (!items) return 0;
    try {
      const itemsArray = Array.isArray(items) ? items : JSON.parse(items);
      return itemsArray.length;
    } catch (error) {
      return 0;
    }
  }

  // Convert items string to array
  getItemsArray(items: any): any[] {
    if (!items) return [];
    try {
      return Array.isArray(items) ? items : JSON.parse(items);
    } catch (error) {
      return [];
    }
  }

  // Toggle items expanded state
  toggleItemsExpanded(saleId: number): void {
    if (this.expandedItems.has(saleId)) {
      this.expandedItems.delete(saleId);
    } else {
      this.expandedItems.add(saleId);
    }
  }

  // Check if items are expanded
  isItemsExpanded(saleId: number): boolean {
    return this.expandedItems.has(saleId);
  }

  // Toggle selection of a sale
  toggleSelection(sale: any): void {
    const index = this.selectedSales.findIndex((item) => item.id === sale.id);

    if (index === -1) {
      // Add to selection
      this.selectedSales.push({
        id: sale.id,
        balance: sale.balance,
      });
    } else {
      // Remove from selection
      this.selectedSales.splice(index, 1);
    }

    // Update allSelected state
    this.updateAllSelectedState();
  }

  // Toggle all selections
  toggleSelectAll(): void {
    if (this.allSelected) {
      // Deselect all
      this.selectedSales = [];
    } else {
      // Select all unpaid sales
      this.selectedSales = this.customerStatement.unpaidCreditSales.map(
        (sale: any) => ({
          id: sale.id,
          balance: sale.balance,
        })
      );
    }

    this.allSelected = !this.allSelected;
  }

  // Check if a sale is selected
  isSelected(saleId: number): boolean {
    return this.selectedSales.some((item) => item.id === saleId);
  }

  // Update allSelected state based on current selections
  updateAllSelectedState(): void {
    this.allSelected =
      this.selectedSales.length ===
      this.customerStatement?.unpaidCreditSales?.length;
  }

  // Calculate total of selected sales
  calculateSelectedTotal(): number {
    return this.selectedSales.reduce((total, sale) => total + sale.balance, 0);
  }

  // Check if payment can be processed
  canProcessPayment(): boolean {
    const hasSelection = this.selectedSales.length > 0;
    const hasAmount = this.paymentAmount > 0;
    const hasTransactionCode =
      this.paymentMethod !== 'CASH' ? !!this.transactionCode : true;

    return hasSelection && hasAmount && hasTransactionCode;
  }

  // Process the payment
  processPayment(): void {
    if (!this.canProcessPayment() || this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    // Prepare payment data
    const paymentData = {
      creditSaleIds: this.selectedSales.map((sale) => sale.id),
      totalAmount: this.paymentAmount,
      paymentMethod: this.paymentMethod,
      transactionCode: this.transactionCode || undefined,
    };

    // Call the service to make payment
    this.creditPaymentsService
      .createMultiplePayments(paymentData)
      .pipe(
        finalize(() => {
          this.isProcessing = false;
        })
      )
      .subscribe({
        next: (response) => {
          console.log('Payment processed successfully:', response);

          // Show success notification
          this.showNotification('success', 'Payment processed successfully');

          // Close the modal with payment data for parent component
          this.close(response);
        },
        error: (err) => {
          console.error('Error processing payment:', err);

          // Show error notification
          this.showNotification(
            'error',
            err.error?.message || 'Failed to process payment'
          );
        },
      });
  }

  // Show notification
  showNotification(type: 'success' | 'error', message: string): void {
    // Implementation depends on your notification system
    // This is a placeholder - replace with your actual notification service
    console.log(`[${type}] ${message}`);
  }
}
