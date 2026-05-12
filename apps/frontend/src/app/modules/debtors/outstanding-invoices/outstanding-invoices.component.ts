import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DebtorsService } from '../../../shared/Services/debtors.service';
import { AuthService } from '../../../shared/Services/auth.service';
import {
  CustomerOutstandingResponse,
  RecordBulkPaymentDto,
  BulkPaymentItem,
  Invoice,
} from '../../../types/debtors.types';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HotToastService } from '@ngneat/hot-toast';

@Component({
  selector: 'app-outstanding-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './outstanding-invoices.component.html',
  styleUrls: ['./outstanding-invoices.component.scss'],
})
export class OutstandingInvoicesComponent implements OnInit {
  loading = false;
  customerId!: number;
  data: CustomerOutstandingResponse | null = null;
  selectedInvoices: Map<number, number> = new Map();
  showBulkPaymentModal = false;
  paymentMethods: any[] = [];
  selectedPaymentMethod: any = null;
  transactionCode = '';
  paymentDate = '';
  paymentNotes = '';
  totalAmountReceived: number = 0;
  currentUser: any;

  // Wallet support
  customerWalletBalance: number = 0;
  loadingWallet = false;
  walletLoaded = false;
  useWalletBalance = false;

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
    this.loadOutstandingInvoices();
    this.loadPaymentMethods();
    this.loadCustomerWallet();
  }

  loadOutstandingInvoices(): void {
    this.loading = true;
    this.debtorsService
      .getCustomerOutstandingInvoices(this.customerId)
      .subscribe({
        next: (data) => {
          this.data = data;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading outstanding invoices:', error);
          this.toast.error('Failed to load outstanding invoices');
          this.loading = false;
        },
      });
  }

  loadPaymentMethods(): void {
    this.debtorsService.getPaymentMethods().subscribe({
      next: (methods) => {
        this.paymentMethods = methods;
      },
      error: (error) => {
        console.error('Error loading payment methods:', error);
        // Fallback to default payment methods
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

  toggleInvoiceSelection(invoice: Invoice): void {
    if (this.selectedInvoices.has(invoice.id)) {
      this.selectedInvoices.delete(invoice.id);
    } else {
      this.selectedInvoices.set(invoice.id, invoice.balanceDue);
    }
  }

  updatePaymentAmount(invoiceId: number, amount: string): void {
    const numAmount = parseFloat(amount);
    if (!isNaN(numAmount) && numAmount > 0) {
      this.selectedInvoices.set(invoiceId, numAmount);
    }
  }

  getTotalSelectedAmount(): number {
    let total = 0;
    this.selectedInvoices.forEach((amount) => {
      total += amount;
    });
    return total;
  }

  getSelectedCount(): number {
    return this.selectedInvoices.size;
  }

  openBulkPaymentModal(): void {
    if (this.selectedInvoices.size === 0) {
      this.toast.error('Please select at least one invoice');
      return;
    }
    this.totalAmountReceived = this.getTotalSelectedAmount();
    this.showBulkPaymentModal = true;
  }

  closeBulkPaymentModal(): void {
    this.showBulkPaymentModal = false;
    this.selectedPaymentMethod = null;
    this.transactionCode = '';
    this.paymentDate = '';
    this.paymentNotes = '';
    this.totalAmountReceived = 0;
    this.useWalletBalance = false;
  }

  loadCustomerWallet(): void {
    this.loadingWallet = true;
    this.debtorsService.getCustomerWallet(this.customerId).subscribe({
      next: (wallet) => {
        this.customerWalletBalance = wallet.walletBalance || 0;
        this.walletLoaded = true;
        this.loadingWallet = false;
      },
      error: (error) => {
        console.error('Error loading customer wallet:', error);
        this.customerWalletBalance = 0;
        this.walletLoaded = true;
        this.loadingWallet = false;
      },
    });
  }

  toggleWalletUsage(): void {
    this.useWalletBalance = !this.useWalletBalance;
    if (this.useWalletBalance) {
      // When using wallet, pre-fill the total amount with wallet balance (up to total selected)
      const totalSelected = this.getTotalSelectedAmount();
      const walletApplicable = Math.min(
        this.customerWalletBalance,
        totalSelected,
      );
      if (!this.totalAmountReceived || this.totalAmountReceived === 0) {
        this.totalAmountReceived = totalSelected - walletApplicable;
      }
    }
  }

  getWalletApplicableAmount(): number {
    if (!this.useWalletBalance || this.customerWalletBalance <= 0) return 0;
    const totalSelected = this.getTotalSelectedAmount();
    return Math.min(this.customerWalletBalance, totalSelected);
  }

  applyWalletToSelectedInvoices(): void {
    if (!this.useWalletBalance || this.customerWalletBalance <= 0) {
      this.toast.error('No wallet balance to apply');
      return;
    }

    const walletPayments: { invoiceId: number; amount: number }[] = [];
    let walletRemaining = this.getWalletApplicableAmount();
    this.selectedInvoices.forEach((amount, invoiceId) => {
      if (walletRemaining <= 0) return;
      const allocation = Math.min(amount, walletRemaining);
      walletPayments.push({ invoiceId, amount: allocation });
      walletRemaining -= allocation;
    });

    const recordedBy = this.currentUser
      ? `${this.currentUser.firstName} ${this.currentUser.lastName}`
      : 'Unknown User';

    const walletDto: any = {
      customerId: this.customerId,
      payments: walletPayments,
      notes: this.paymentNotes || 'Wallet payment applied from debtors',
      recordedBy,
    };

    this.debtorsService
      .applyWalletToInvoices(walletDto)
      .pipe(
        this.toast.observe({
          loading: 'Applying wallet balance...',
          success: `Wallet balance applied! ${this.formatCurrency(this.getWalletApplicableAmount())} deducted from wallet.`,
          error: 'Failed to apply wallet balance',
        }),
      )
      .subscribe({
        next: () => {
          this.closeBulkPaymentModal();
          this.selectedInvoices.clear();
          this.loadOutstandingInvoices();
          this.loadCustomerWallet();
        },
        error: (error) => {
          console.error('Error applying wallet:', error);
        },
      });
  }

  recordBulkPayment(): void {
    // If using wallet only (no additional cash payment needed)
    if (
      this.useWalletBalance &&
      (!this.totalAmountReceived || this.totalAmountReceived <= 0)
    ) {
      this.applyWalletToSelectedInvoices();
      return;
    }

    if (!this.useWalletBalance && !this.selectedPaymentMethod) {
      this.toast.error('Please select a payment method');
      return;
    }

    if (
      !this.useWalletBalance &&
      (!this.totalAmountReceived || this.totalAmountReceived <= 0)
    ) {
      this.toast.error('Please enter the total amount received');
      return;
    }

    if (this.selectedPaymentMethod === null && this.totalAmountReceived > 0) {
      this.toast.error('Please select a payment method for the cash portion');
      return;
    }

    const payments: BulkPaymentItem[] = [];
    this.selectedInvoices.forEach((amount, invoiceId) => {
      payments.push({
        invoiceId,
        amount,
      });
    });

    const recordedBy = this.currentUser
      ? `${this.currentUser.firstName} ${this.currentUser.lastName}`
      : 'Unknown User';

    // If wallet + cash combo, apply wallet first then record cash payment
    if (
      this.useWalletBalance &&
      this.customerWalletBalance > 0 &&
      this.totalAmountReceived > 0
    ) {
      const walletApplicable = this.getWalletApplicableAmount();
      const comboWalletPayments: { invoiceId: number; amount: number }[] = [];
      let comboRemaining = walletApplicable;
      payments.forEach((p) => {
        if (comboRemaining <= 0) return;
        const allocation = Math.min(p.amount, comboRemaining);
        comboWalletPayments.push({
          invoiceId: p.invoiceId,
          amount: allocation,
        });
        comboRemaining -= allocation;
      });

      const walletDto: any = {
        customerId: this.customerId,
        payments: comboWalletPayments,
        notes: 'Wallet portion of combined payment',
        recordedBy,
      };

      // Apply wallet first, then record cash payment
      this.debtorsService.applyWalletToInvoices(walletDto).subscribe({
        next: () => {
          this.toast.success(
            `${this.formatCurrency(walletApplicable)} applied from wallet`,
          );
          // Now proceed with cash payment for remaining
          this.processTraditionalPayment(payments, recordedBy);
        },
        error: (error) => {
          console.error('Error applying wallet:', error);
          this.toast.error('Failed to apply wallet balance');
        },
      });
      return;
    }

    this.processTraditionalPayment(payments, recordedBy);
  }

  private processTraditionalPayment(
    payments: BulkPaymentItem[],
    recordedBy: string,
  ): void {
    if (
      !this.selectedPaymentMethod ||
      !this.totalAmountReceived ||
      this.totalAmountReceived <= 0
    ) {
      // No additional cash payment needed, just close
      this.closeBulkPaymentModal();
      this.selectedInvoices.clear();
      this.loadOutstandingInvoices();
      this.loadCustomerWallet();
      return;
    }

    const excessAmount =
      this.totalAmountReceived - this.getTotalSelectedAmount();
    const hasExcess = excessAmount > 0;

    if (hasExcess) {
      // Use wallet-aware endpoint for overpayments
      const walletDto: any = {
        customerId: this.customerId,
        totalAmount: this.totalAmountReceived,
        payments,
        paymentMethodId: this.selectedPaymentMethod.id,
        paymentMethodCode: this.selectedPaymentMethod.code,
        paymentMethodName:
          this.selectedPaymentMethod.displayName ||
          this.selectedPaymentMethod.name,
        transactionCode: this.transactionCode || undefined,
        paymentDate: this.paymentDate
          ? new Date(this.paymentDate).toISOString()
          : new Date().toISOString(),
        notes: this.paymentNotes || undefined,
        recordedBy,
      };

      this.debtorsService
        .recordBulkPaymentWithWallet(walletDto)
        .pipe(
          this.toast.observe({
            loading: 'Recording payments...',
            success: `Payments recorded! ${this.formatCurrency(excessAmount)} excess saved to wallet.`,
            error: 'Failed to record payments',
          }),
        )
        .subscribe({
          next: () => {
            this.closeBulkPaymentModal();
            this.selectedInvoices.clear();
            this.loadOutstandingInvoices();
            this.loadCustomerWallet();
          },
          error: (error) => {
            console.error('Error recording bulk payment:', error);
          },
        });
    } else {
      const dto: RecordBulkPaymentDto = {
        customerId: this.customerId,
        payments,
        paymentMethodId: this.selectedPaymentMethod.id,
        paymentMethodCode: this.selectedPaymentMethod.code,
        paymentMethodName:
          this.selectedPaymentMethod.displayName ||
          this.selectedPaymentMethod.name,
        transactionCode: this.transactionCode || undefined,
        paymentDate: this.paymentDate
          ? new Date(this.paymentDate).toISOString()
          : new Date().toISOString(),
        notes: this.paymentNotes || undefined,
        recordedBy,
      };

      this.debtorsService
        .recordBulkPayment(dto)
        .pipe(
          this.toast.observe({
            loading: 'Recording payments...',
            success: 'Payments recorded successfully',
            error: 'Failed to record payments',
          }),
        )
        .subscribe({
          next: () => {
            this.closeBulkPaymentModal();
            this.selectedInvoices.clear();
            this.loadOutstandingInvoices();
            this.loadCustomerWallet();
          },
          error: (error) => {
            console.error('Error recording bulk payment:', error);
          },
        });
    }
  }

  viewInvoice(invoiceId: number): void {
    this.router.navigate(['/invoices', invoiceId]);
  }

  viewStatement(): void {
    this.router.navigate(['/debtors/customer-statement', this.customerId]);
  }

  viewWallet(): void {
    this.router.navigate(['/debtors/customer-wallet', this.customerId]);
  }

  distributePaymentAmount(): void {
    if (!this.totalAmountReceived || this.totalAmountReceived <= 0) return;

    let remaining = this.totalAmountReceived;
    const invoiceIds = Array.from(this.selectedInvoices.keys());

    // Find matching invoices from data to get balanceDue
    for (const invoiceId of invoiceIds) {
      const invoice = this.data?.invoices.find((inv) => inv.id === invoiceId);
      if (!invoice) continue;

      const allocation = Math.min(remaining, invoice.balanceDue);
      this.selectedInvoices.set(invoiceId, allocation);
      remaining -= allocation;

      if (remaining <= 0) break;
    }

    // If remaining > 0, all invoices are covered; excess will go to wallet
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('en-GB');
  }

  getDaysOverdueClass(daysOverdue: number): string {
    if (daysOverdue === 0) return 'text-green-600';
    if (daysOverdue <= 30) return 'text-yellow-600';
    if (daysOverdue <= 60) return 'text-orange-600';
    return 'text-red-600';
  }

  getAgingBadgeClass(agingCategory: string): string {
    switch (agingCategory) {
      case 'CURRENT':
        return 'bg-green-100 text-green-800';
      case 'DAYS_31_60':
        return 'bg-yellow-100 text-yellow-800';
      case 'DAYS_61_90':
        return 'bg-orange-100 text-orange-800';
      case 'DAYS_91_120':
        return 'bg-red-100 text-red-800';
      case 'OVER_120':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getAgingLabel(agingCategory: string): string {
    switch (agingCategory) {
      case 'CURRENT':
        return '0-30 Days';
      case 'DAYS_31_60':
        return '31-60 Days';
      case 'DAYS_61_90':
        return '61-90 Days';
      case 'DAYS_91_120':
        return '91-120 Days';
      case 'OVER_120':
        return 'Over 120 Days';
      default:
        return agingCategory;
    }
  }
}
