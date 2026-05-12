import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HotToastService } from '@ngneat/hot-toast';
import { DebtorsService } from '../../../shared/Services/debtors.service';
import { AuthService } from '../../../shared/Services/auth.service';
import {
  CustomerWalletResponse,
  WalletTransaction,
  WalletTransactionType,
  WalletTransactionFilters,
  RecordCustomerDepositDto,
  ApplyWalletToInvoicesDto,
  WalletPaymentItem,
  CustomerOutstandingResponse,
  Invoice,
} from '../../../types/debtors.types';

@Component({
  selector: 'app-customer-wallet',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customer-wallet.component.html',
  styleUrls: ['./customer-wallet.component.scss'],
})
export class CustomerWalletComponent implements OnInit {
  loading = false;
  customerId!: number;
  walletData: CustomerWalletResponse | null = null;
  transactions: WalletTransaction[] = [];
  currentPage = 1;
  totalPages = 1;
  total = 0;
  filterType = '';

  // Deposit modal
  showDepositModal = false;
  depositAmount = 0;
  depositNotes = '';
  depositTransactionCode = '';
  paymentMethods: any[] = [];
  selectedPaymentMethod: any = null;
  depositDate = '';

  // Apply to invoices modal
  showApplyModal = false;
  outstandingData: CustomerOutstandingResponse | null = null;
  selectedInvoicesForWallet: Map<number, number> = new Map();
  loadingOutstanding = false;

  currentUser: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private debtorsService: DebtorsService,
    private authService: AuthService,
    private toast: HotToastService,
  ) {}

  ngOnInit(): void {
    this.customerId = Number(this.route.snapshot.paramMap.get('customerId'));
    this.authService.userIsLoggedIn().subscribe((user: any) => {
      this.currentUser = user;
    });
    this.loadWalletData();
    this.loadTransactions();
    this.loadPaymentMethods();
  }

  loadWalletData(): void {
    this.loading = true;
    this.debtorsService.getCustomerWallet(this.customerId).subscribe({
      next: (data) => {
        this.walletData = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading wallet data:', error);
        this.toast.error('Failed to load wallet data');
        this.loading = false;
      },
    });
  }

  loadTransactions(page: number = 1): void {
    const filters: WalletTransactionFilters = {
      page,
      limit: 20,
    };
    if (this.filterType) {
      filters.type = this.filterType as WalletTransactionType;
    }

    this.debtorsService
      .getCustomerWalletTransactions(this.customerId, filters)
      .subscribe({
        next: (data) => {
          this.transactions = data.transactions;
          this.currentPage = page;
          this.totalPages = data.pagination.totalPages;
          this.total = data.pagination.total;
        },
        error: (error) => {
          console.error('Error loading transactions:', error);
        },
      });
  }

  loadPaymentMethods(): void {
    this.debtorsService.getPaymentMethods().subscribe({
      next: (methods) => {
        this.paymentMethods = methods;
      },
      error: () => {
        this.paymentMethods = [
          { id: null, code: 'CASH', name: 'Cash', displayName: 'Cash' },
          { id: null, code: 'MPESA', name: 'M-Pesa', displayName: 'M-Pesa' },
          {
            id: null,
            code: 'BANK_TRANSFER',
            name: 'Bank Transfer',
            displayName: 'Bank Transfer',
          },
        ];
      },
    });
  }

  onFilterChange(): void {
    this.loadTransactions(1);
  }

  // ============================
  // DEPOSIT MODAL
  // ============================

  openDepositModal(): void {
    this.showDepositModal = true;
    this.depositAmount = 0;
    this.depositNotes = '';
    this.depositTransactionCode = '';
    this.selectedPaymentMethod = null;
    this.depositDate = '';
  }

  closeDepositModal(): void {
    this.showDepositModal = false;
  }

  submitDeposit(): void {
    if (!this.selectedPaymentMethod) {
      this.toast.error('Please select a payment method');
      return;
    }
    if (this.depositAmount <= 0) {
      this.toast.error('Please enter a valid amount');
      return;
    }

    const recordedBy = this.currentUser
      ? `${this.currentUser.firstName} ${this.currentUser.lastName}`
      : 'Unknown User';

    const dto: RecordCustomerDepositDto = {
      customerId: this.customerId,
      amount: this.depositAmount,
      paymentMethodId: this.selectedPaymentMethod.id,
      paymentMethodCode: this.selectedPaymentMethod.code,
      paymentMethodName:
        this.selectedPaymentMethod.displayName ||
        this.selectedPaymentMethod.name,
      transactionCode: this.depositTransactionCode || undefined,
      paymentDate: this.depositDate
        ? new Date(this.depositDate).toISOString()
        : new Date().toISOString(),
      notes: this.depositNotes || undefined,
      recordedBy,
    };

    this.debtorsService
      .recordCustomerDeposit(dto)
      .pipe(
        this.toast.observe({
          loading: 'Recording deposit...',
          success: 'Deposit recorded successfully!',
          error: 'Failed to record deposit',
        }),
      )
      .subscribe({
        next: () => {
          this.closeDepositModal();
          this.loadWalletData();
          this.loadTransactions();
        },
        error: (error) => {
          console.error('Error recording deposit:', error);
        },
      });
  }

  // ============================
  // APPLY TO INVOICES MODAL
  // ============================

  openApplyModal(): void {
    if (!this.walletData || this.walletData.walletBalance <= 0) {
      this.toast.error('No wallet balance available');
      return;
    }
    this.showApplyModal = true;
    this.selectedInvoicesForWallet.clear();
    this.loadOutstandingInvoices();
  }

  closeApplyModal(): void {
    this.showApplyModal = false;
    this.selectedInvoicesForWallet.clear();
  }

  loadOutstandingInvoices(): void {
    this.loadingOutstanding = true;
    this.debtorsService
      .getCustomerOutstandingInvoices(this.customerId)
      .subscribe({
        next: (data) => {
          this.outstandingData = data;
          this.loadingOutstanding = false;
        },
        error: (error) => {
          console.error('Error loading outstanding invoices:', error);
          this.toast.error('Failed to load outstanding invoices');
          this.loadingOutstanding = false;
        },
      });
  }

  toggleInvoiceForWallet(invoice: Invoice): void {
    if (this.selectedInvoicesForWallet.has(invoice.id)) {
      this.selectedInvoicesForWallet.delete(invoice.id);
    } else {
      // Auto-fill with min of balance due or remaining wallet
      const remaining = this.getRemainingWalletForAllocation();
      const amount = Math.min(invoice.balanceDue, remaining);
      if (amount > 0) {
        this.selectedInvoicesForWallet.set(invoice.id, amount);
      }
    }
  }

  updateWalletPaymentAmount(invoiceId: number, amount: string): void {
    const numAmount = parseFloat(amount);
    if (!isNaN(numAmount) && numAmount > 0) {
      this.selectedInvoicesForWallet.set(invoiceId, numAmount);
    }
  }

  getTotalWalletAllocation(): number {
    let total = 0;
    this.selectedInvoicesForWallet.forEach((amount) => {
      total += amount;
    });
    return total;
  }

  getRemainingWalletForAllocation(): number {
    return (this.walletData?.walletBalance || 0) - this.getTotalWalletAllocation();
  }

  submitApplyWallet(): void {
    if (this.selectedInvoicesForWallet.size === 0) {
      this.toast.error('Please select at least one invoice');
      return;
    }

    const totalAllocation = this.getTotalWalletAllocation();
    if (totalAllocation > (this.walletData?.walletBalance || 0)) {
      this.toast.error('Total allocation exceeds wallet balance');
      return;
    }

    const recordedBy = this.currentUser
      ? `${this.currentUser.firstName} ${this.currentUser.lastName}`
      : 'Unknown User';

    const payments: WalletPaymentItem[] = [];
    this.selectedInvoicesForWallet.forEach((amount, invoiceId) => {
      payments.push({ invoiceId, amount });
    });

    const dto: ApplyWalletToInvoicesDto = {
      customerId: this.customerId,
      payments,
      recordedBy,
      notes: 'Applied from customer wallet balance',
    };

    this.debtorsService
      .applyWalletToInvoices(dto)
      .pipe(
        this.toast.observe({
          loading: 'Applying wallet balance...',
          success: 'Wallet balance applied to invoices!',
          error: 'Failed to apply wallet balance',
        }),
      )
      .subscribe({
        next: () => {
          this.closeApplyModal();
          this.loadWalletData();
          this.loadTransactions();
        },
        error: (error) => {
          console.error('Error applying wallet:', error);
        },
      });
  }

  // ============================
  // UTILITIES
  // ============================

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  }

  getTransactionTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      DEPOSIT: 'Deposit',
      OVERPAYMENT: 'Overpayment',
      PAYMENT_APPLIED: 'Applied to Invoice',
      REFUND: 'Refund',
      ADJUSTMENT: 'Adjustment',
    };
    return labels[type] || type;
  }

  getTransactionTypeColor(type: string): string {
    const colors: Record<string, string> = {
      DEPOSIT: 'bg-green-100 text-green-800',
      OVERPAYMENT: 'bg-blue-100 text-blue-800',
      PAYMENT_APPLIED: 'bg-orange-100 text-orange-800',
      REFUND: 'bg-purple-100 text-purple-800',
      ADJUSTMENT: 'bg-gray-100 text-gray-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  }

  isCredit(type: string): boolean {
    return type === 'DEPOSIT' || type === 'OVERPAYMENT' || type === 'REFUND';
  }

  goBack(): void {
    this.router.navigate(['/debtors']);
  }

  viewStatement(): void {
    this.router.navigate(['/debtors/customer-statement', this.customerId]);
  }

  viewOutstanding(): void {
    this.router.navigate(['/debtors/outstanding-invoices', this.customerId]);
  }
}
