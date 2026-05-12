import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DebtorsService } from '../../../shared/Services/debtors.service';
import { AuthService } from '../../../shared/Services/auth.service';
import {
  AllCustomersResponse,
  CustomerSummary,
  RecordCustomerDepositDto,
} from '../../../types/debtors.types';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HotToastService } from '@ngneat/hot-toast';

@Component({
  selector: 'app-wallet-overview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './wallet-overview.component.html',
  styleUrls: ['./wallet-overview.component.scss'],
})
export class WalletOverviewComponent implements OnInit {
  loading = false;
  data: AllCustomersResponse | null = null;
  customers: CustomerSummary[] = [];
  searchQuery = '';
  page = 1;
  limit = 20;
  showOnlyWithBalance = false;
  currentUser: any;
  Math = Math;

  // Summary stats
  totalWalletBalance = 0;
  customersWithBalance = 0;
  totalCustomers = 0;

  // Deposit modal
  showDepositModal = false;
  selectedCustomer: CustomerSummary | null = null;
  depositAmount: number = 0;
  depositNotes = '';
  depositTransactionCode = '';
  depositDate = '';
  paymentMethods: any[] = [];
  selectedPaymentMethod: any = null;
  depositing = false;

  constructor(
    private router: Router,
    private debtorsService: DebtorsService,
    private authService: AuthService,
    private toast: HotToastService,
  ) {}

  ngOnInit(): void {
    this.authService.userIsLoggedIn().subscribe((user: any) => {
      this.currentUser = user;
    });
    this.loadCustomers();
    this.loadPaymentMethods();
  }

  loadCustomers(): void {
    this.loading = true;
    this.debtorsService
      .getAllCustomers(this.searchQuery, this.page, this.limit)
      .subscribe({
        next: (data) => {
          this.data = data;
          this.applyFilters();
          this.calculateStats();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading customers:', error);
          this.toast.error('Failed to load customers');
          this.loading = false;
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

  applyFilters(): void {
    if (!this.data) return;
    this.customers = this.data.customers.filter((c) => {
      if (this.showOnlyWithBalance && c.walletBalance <= 0) return false;
      return true;
    });
  }

  calculateStats(): void {
    if (!this.data) return;
    this.totalCustomers = this.data.pagination.total;
    // Calculate from current page data
    const allCustomers = this.data.customers;
    this.totalWalletBalance = allCustomers.reduce(
      (sum, c) => sum + (c.walletBalance || 0),
      0,
    );
    this.customersWithBalance = allCustomers.filter(
      (c) => c.walletBalance > 0,
    ).length;
  }

  onSearch(): void {
    this.page = 1;
    this.loadCustomers();
  }

  toggleFilter(): void {
    this.showOnlyWithBalance = !this.showOnlyWithBalance;
    this.applyFilters();
  }

  goToPage(p: number): void {
    this.page = p;
    this.loadCustomers();
  }

  // ==============================
  // DEPOSIT MODAL
  // ==============================

  openDepositModal(customer: CustomerSummary): void {
    this.selectedCustomer = customer;
    this.depositAmount = 0;
    this.depositNotes = '';
    this.depositTransactionCode = '';
    this.depositDate = '';
    this.selectedPaymentMethod = null;
    this.showDepositModal = true;
  }

  closeDepositModal(): void {
    this.showDepositModal = false;
    this.selectedCustomer = null;
    this.depositAmount = 0;
    this.depositNotes = '';
    this.depositTransactionCode = '';
    this.depositDate = '';
    this.selectedPaymentMethod = null;
  }

  recordDeposit(): void {
    if (!this.selectedCustomer) return;

    if (!this.depositAmount || this.depositAmount <= 0) {
      this.toast.error('Please enter a valid deposit amount');
      return;
    }

    if (!this.selectedPaymentMethod) {
      this.toast.error('Please select a payment method');
      return;
    }

    const recordedBy = this.currentUser
      ? `${this.currentUser.firstName} ${this.currentUser.lastName}`
      : 'Unknown User';

    const dto: RecordCustomerDepositDto = {
      customerId: this.selectedCustomer.id,
      amount: this.depositAmount,
      paymentMethodId: this.selectedPaymentMethod.id || undefined,
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

    this.depositing = true;
    this.debtorsService
      .recordCustomerDeposit(dto)
      .pipe(
        this.toast.observe({
          loading: 'Recording deposit...',
          success: `${this.formatCurrency(this.depositAmount)} deposited to ${this.selectedCustomer.fullName}'s wallet`,
          error: 'Failed to record deposit',
        }),
      )
      .subscribe({
        next: () => {
          this.depositing = false;
          this.closeDepositModal();
          this.loadCustomers();
        },
        error: (error) => {
          console.error('Error recording deposit:', error);
          this.depositing = false;
        },
      });
  }

  // ==============================
  // NAVIGATION
  // ==============================

  viewCustomerWallet(customerId: number): void {
    this.router.navigate(['/debtors/customer-wallet', customerId]);
  }

  viewOutstandingInvoices(customerId: number): void {
    this.router.navigate(['/debtors/outstanding-invoices', customerId]);
  }

  // ==============================
  // HELPERS
  // ==============================

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  }

  getWalletBadgeClass(balance: number): string {
    if (balance > 0) return 'bg-emerald-100 text-emerald-800';
    return 'bg-gray-100 text-gray-500';
  }
}
