import { Component, OnInit } from '@angular/core';
import { ModalComponent } from '../../../../shared/Data/components/modal/modal.component';
import { AccountsPayableService } from '../../../../shared/Services/accounts-payable.service';
import { format } from 'date-fns';
import { finalize } from 'rxjs/operators';
import { HotToastService } from '@ngneat/hot-toast';

interface SelectedBill {
  id: number;
  balance: number;
}

@Component({
  selector: 'app-supplier-statement',
  templateUrl: './supplier-statement.component.html',
  styleUrls: ['./supplier-statement.component.scss'],
})
export class SupplierStatementComponent extends ModalComponent implements OnInit {
  supplierId: number = 0;
  supplierName: string = '';
  startDate: string = '';
  endDate: string = '';

  supplierStatement: any = null;
  isLoading: boolean = true;
  error: string | null = null;

  // Selected bills for payment
  selectedBills: SelectedBill[] = [];
  allSelected: boolean = false;

  // Payment form data
  paymentMethod: 'CASH' | 'MPESA' | 'BANK_TRANSFER' = 'CASH';
  transactionCode: string = '';
  paymentAmount: number = 0;
  referenceNumber: string = '';
  notes: string = '';
  isProcessing: boolean = false;

  // UI state management
  expandedBills: Set<number> = new Set();
  activeTab: 'unpaid' | 'paid' | 'aging' = 'unpaid';

  // Current user
  currentUserId: number = 0;

  constructor(
    private accountsPayableService: AccountsPayableService,
    public override toast: HotToastService
  ) {
    super();
  }

  ngOnInit(): void {
    // Get the payload from modal
    const payload = this.dialogRemoteControl.payload;
    this.supplierId = payload.supplierId;
    this.supplierName = payload.supplierName || '';
    this.startDate = payload.startDate || '';
    this.endDate = payload.endDate || '';

    // Get current user
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.currentUserId = user.id;
      } catch (e) {
        console.error('Error parsing user:', e);
      }
    }

    // Load supplier statement
    this.loadSupplierStatement();
  }

  loadSupplierStatement(): void {
    this.isLoading = true;
    this.error = null;

    this.accountsPayableService
      .getSupplierStatement(this.supplierId, this.startDate, this.endDate)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (response) => {
          this.supplierStatement = response;

          // Pre-calculate payment amount based on total outstanding balance
          if (this.supplierStatement?.totals?.outstandingBalance) {
            this.paymentAmount = this.supplierStatement.totals.outstandingBalance;
          }
        },
        error: (err) => {
          console.error('Error loading supplier statement:', err);
          this.error = 'Failed to load supplier data. Please try again.';
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
      case 'CHECK':
        return 'Check';
      default:
        return method;
    }
  }

  // Format currency
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  }

  // Toggle bill expanded state
  toggleBillExpanded(billId: number): void {
    if (this.expandedBills.has(billId)) {
      this.expandedBills.delete(billId);
    } else {
      this.expandedBills.add(billId);
    }
  }

  // Check if bill is expanded
  isBillExpanded(billId: number): boolean {
    return this.expandedBills.has(billId);
  }

  // Toggle selection of a bill
  toggleSelection(bill: any): void {
    const index = this.selectedBills.findIndex((item) => item.id === bill.id);

    if (index === -1) {
      // Add to selection
      this.selectedBills.push({
        id: bill.id,
        balance: bill.balanceAmount,
      });
    } else {
      // Remove from selection
      this.selectedBills.splice(index, 1);
    }

    // Update allSelected state
    this.updateAllSelectedState();
  }

  // Toggle all selections
  toggleSelectAll(): void {
    if (this.allSelected) {
      // Deselect all
      this.selectedBills = [];
    } else {
      // Select all unpaid bills
      this.selectedBills = this.supplierStatement.unpaidBills.map((bill: any) => ({
        id: bill.id,
        balance: bill.balanceAmount,
      }));
    }

    this.allSelected = !this.allSelected;
  }

  // Check if a bill is selected
  isSelected(billId: number): boolean {
    return this.selectedBills.some((item) => item.id === billId);
  }

  // Update allSelected state based on current selections
  updateAllSelectedState(): void {
    this.allSelected =
      this.selectedBills.length === this.supplierStatement?.unpaidBills?.length &&
      this.supplierStatement?.unpaidBills?.length > 0;
  }

  // Calculate total of selected bills
  calculateSelectedTotal(): number {
    return this.selectedBills.reduce((total, bill) => total + bill.balance, 0);
  }

  // Check if payment can be processed
  canProcessPayment(): boolean {
    const hasSelection = this.selectedBills.length > 0;
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
      billIds: this.selectedBills.map((bill) => bill.id),
      totalAmount: this.paymentAmount,
      paymentMethod: this.paymentMethod,
      transactionCode: this.transactionCode || undefined,
      referenceNumber: this.referenceNumber || undefined,
      notes: this.notes || `Bulk payment for ${this.selectedBills.length} bill(s)`,
      createdBy: this.currentUserId,
    };

    // Call the service to make payment
    this.accountsPayableService
      .createMultipleBillPayments(paymentData)
      .pipe(finalize(() => (this.isProcessing = false)))
      .subscribe({
        next: (response) => {
          console.log('Payment processed successfully:', response);

          // Show success notification
          this.toast.success(
            response.message || 'Payment processed successfully'
          );

          // Close the modal with payment data for parent component
          this.close(response);
        },
        error: (err) => {
          console.error('Error processing payment:', err);

          // Show error notification
          this.toast.error(
            err.error?.message || 'Failed to process payment'
          );
        },
      });
  }

  // Get bill status badge class
  getBillStatusBadgeClass(status: string): string {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
      case 'APPROVED':
        return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-400';
      case 'PAID':
        return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-400';
      case 'PARTIALLY_PAID':
        return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-400';
      case 'OVERDUE':
        return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-400';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  }

  // Check if bill is overdue
  isOverdue(dueDate: string): boolean {
    return new Date(dueDate) < new Date();
  }

  // Get days overdue
  getDaysOverdue(dueDate: string): number {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = now.getTime() - due.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  }

  // Switch tabs
  setActiveTab(tab: 'unpaid' | 'paid' | 'aging'): void {
    this.activeTab = tab;
  }
}
