import { Component, OnInit } from '@angular/core';
import { CreditSaleService } from '../../../../../shared/Services/credit-sale.service';
import { CreditPaymentsService } from '../../../../../shared/Services/credit-payments.service';
import { CreditSale } from '../../../../../shared/interfaces/cretitSale.interface';
import { BaseComponent } from '../../../../../shared/components/base/base.component';
import {
  DialogRemoteControl,
  AppearanceAnimation,
  DisappearanceAnimation,
} from '@ng-vibe/dialog';
import { CreditPaymentsComponent } from '../credit-payments/credit-payments.component';
import { PaymentHistoryComponent } from '../payment-history/payment-history.component';

interface CreditSalePaymentRecord {
  id: number;
  creditSaleId: number;
  amount: number;
  paymentMethod: 'CASH' | 'MPESA' | 'BANK_TRANSFER';
  transactionCode?: string;
  paymentDate: string;
  createdAt: string;
}

interface PaymentSummary {
  totalOutstanding: number;
  totalCollectedThisMonth: number;
  overdueInvoices: number;
  unpaidInvoices: number;
}

@Component({
  selector: 'app-invoice-payments',
  templateUrl: './invoice-payments.component.html',
  styleUrls: ['./invoice-payments.component.scss'],
})
export class InvoicePaymentsComponent extends BaseComponent implements OnInit {
  creditSales: CreditSale[] = [];
  filteredSales: CreditSale[] = [];
  isLoading = false;

  // Filters
  filterType: 'quick' | 'single' | 'range' = 'quick';
  selectedQuickFilter: string = 'thisMonth';
  selectedDate: string = '';
  startDate: string = '';
  endDate: string = '';
  searchTerm: string = '';
  statusFilter: 'all' | 'unpaid' | 'partial' | 'paid' | 'overdue' = 'all';

  // Quick filters
  quickFilters = [
    { value: 'today', label: 'Today', icon: 'bi-calendar-day' },
    { value: 'yesterday', label: 'Yesterday', icon: 'bi-calendar-minus' },
    { value: 'thisWeek', label: 'This Week', icon: 'bi-calendar-week' },
    { value: 'thisMonth', label: 'This Month', icon: 'bi-calendar-month' },
    { value: 'lastMonth', label: 'Last Month', icon: 'bi-calendar2-month' },
    { value: 'thisYear', label: 'This Year', icon: 'bi-calendar-range' },
  ];

  // Summary statistics
  summary: PaymentSummary = {
    totalOutstanding: 0,
    totalCollectedThisMonth: 0,
    overdueInvoices: 0,
    unpaidInvoices: 0,
  };

  // Dialogs
  private paymentDialog: DialogRemoteControl = new DialogRemoteControl(
    CreditPaymentsComponent
  );
  private historyDialog: DialogRemoteControl = new DialogRemoteControl(
    PaymentHistoryComponent
  );

  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 20;
  totalPages: number = 1;

  // Make Math available in template
  Math = Math;

  constructor(
    private creditSaleService: CreditSaleService,
    private creditPaymentsService: CreditPaymentsService
  ) {
    super();
  }

  ngOnInit(): void {
    this.selectQuickFilter('thisMonth');
  }

  /**
   * Load credit sales based on date range
   */
  loadCreditSales(): void {
    this.isLoading = true;

    this.creditSaleService
      .getCreditSaleByDateRange(this.startDate, this.endDate)
      .subscribe({
        next: (response: any) => {
          const unpaidSales = response.unpaidCreditSales || [];
          const paidSales = response.paidCreditSales || [];

          this.creditSales = [...unpaidSales, ...paidSales].map((sale: CreditSale) => ({
            ...sale,
            balance: sale.credit_amount - (sale.amount_paid || 0),
          }));

          this.applyFilters();
          this.calculateSummary();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading credit sales:', error);
          this.toast.error('Failed to load credit sales');
          this.isLoading = false;
        },
      });
  }

  /**
   * Apply search and status filters
   */
  applyFilters(): void {
    let filtered = [...this.creditSales];

    // Search filter
    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (sale) =>
          sale.customer_name?.toLowerCase().includes(search) ||
          sale.phone_number?.toLowerCase().includes(search) ||
          sale.id?.toString().includes(search)
      );
    }

    // Status filter
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter((sale) => {
        const status = this.getPaymentStatus(sale);
        return status.toLowerCase() === this.statusFilter;
      });
    }

    this.filteredSales = filtered;
    this.totalPages = Math.ceil(this.filteredSales.length / this.itemsPerPage);
  }

  /**
   * Get payment status for a credit sale
   */
  getPaymentStatus(sale: CreditSale): string {
    const balance = sale.credit_amount - (sale.amount_paid || 0);

    if (balance <= 0) {
      return 'paid';
    } else if (sale.amount_paid && sale.amount_paid > 0) {
      // Check if overdue
      const dueDate = new Date(sale.payment_date);
      const today = new Date();
      if (dueDate < today) {
        return 'overdue';
      }
      return 'partial';
    } else {
      // Check if overdue
      const dueDate = new Date(sale.payment_date);
      const today = new Date();
      if (dueDate < today) {
        return 'overdue';
      }
      return 'unpaid';
    }
  }

  /**
   * Get status badge class
   */
  getStatusBadgeClass(sale: CreditSale): string {
    const status = this.getPaymentStatus(sale);

    switch (status) {
      case 'paid':
        return 'bg-green-600 text-white';
      case 'partial':
        return 'bg-yellow-600 text-white';
      case 'overdue':
        return 'bg-red-700 text-white';
      case 'unpaid':
        return 'bg-red-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  }

  /**
   * Get status label
   */
  getStatusLabel(sale: CreditSale): string {
    const status = this.getPaymentStatus(sale);

    switch (status) {
      case 'paid':
        return 'Fully Paid';
      case 'partial':
        return 'Partially Paid';
      case 'overdue':
        return 'Overdue';
      case 'unpaid':
        return 'Unpaid';
      default:
        return 'Unknown';
    }
  }

  /**
   * Calculate summary statistics
   */
  calculateSummary(): void {
    this.summary.totalOutstanding = this.creditSales.reduce(
      (sum, sale) => sum + (sale.credit_amount - (sale.amount_paid || 0)),
      0
    );

    // Calculate this month's collections
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

    this.summary.totalCollectedThisMonth = this.creditSales
      .filter((sale) => {
        const createdDate = new Date(sale.createdAt);
        return createdDate >= firstDay && (sale.amount_paid || 0) > 0;
      })
      .reduce((sum, sale) => sum + (sale.amount_paid || 0), 0);

    // Count overdue and unpaid
    const today = new Date();
    this.summary.overdueInvoices = this.creditSales.filter((sale) => {
      const dueDate = new Date(sale.payment_date);
      const balance = sale.credit_amount - (sale.amount_paid || 0);
      return dueDate < today && balance > 0;
    }).length;

    this.summary.unpaidInvoices = this.creditSales.filter((sale) => {
      const balance = sale.credit_amount - (sale.amount_paid || 0);
      return balance > 0 && (sale.amount_paid || 0) === 0;
    }).length;
  }

  /**
   * Open payment dialog
   */
  openPaymentDialog(sale: CreditSale): void {
    this.paymentDialog.options = {
      showOverlay: true,
      animationIn: AppearanceAnimation.ZOOM_IN,
      animationOut: DisappearanceAnimation.ZOOM_OUT,
    };

    this.paymentDialog.openDialog(sale).subscribe(() => {
      this.loadCreditSales();
    });
  }

  /**
   * View payment history
   */
  viewPaymentHistory(sale: CreditSale): void {
    this.historyDialog.options = {
      showOverlay: true,
      animationIn: AppearanceAnimation.ZOOM_IN,
      animationOut: DisappearanceAnimation.ZOOM_OUT,
    };

    this.historyDialog.openDialog(sale).subscribe();
  }

  /**
   * Quick filter selection
   */
  selectQuickFilter(filterValue: string): void {
    this.selectedQuickFilter = filterValue;
    this.filterType = 'quick';
    this.applyQuickFilter(filterValue);
  }

  /**
   * Apply quick filter logic
   */
  private applyQuickFilter(filterValue: string): void {
    const today = new Date();
    let start: Date;
    let end: Date;

    switch (filterValue) {
      case 'today':
        start = new Date(today);
        end = new Date(today);
        break;
      case 'yesterday':
        start = new Date(today);
        start.setDate(today.getDate() - 1);
        end = new Date(start);
        break;
      case 'thisWeek':
        start = new Date(today);
        start.setDate(today.getDate() - today.getDay());
        end = new Date(today);
        break;
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today);
        break;
      case 'lastMonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'thisYear':
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today);
        break;
      default:
        start = new Date(today);
        end = new Date(today);
    }

    this.startDate = this.formatDate(start);
    this.endDate = this.formatDate(end);
    this.loadCreditSales();
  }

  /**
   * Select filter type
   */
  selectFilterType(type: 'quick' | 'single' | 'range'): void {
    this.filterType = type;
  }

  /**
   * Apply single date filter
   */
  applySingleDateFilter(): void {
    if (this.selectedDate) {
      this.startDate = this.selectedDate;
      this.endDate = this.selectedDate;
      this.loadCreditSales();
    }
  }

  /**
   * Apply date range filter
   */
  applyDateRangeFilter(): void {
    if (this.startDate && this.endDate) {
      this.loadCreditSales();
    }
  }

  /**
   * Format date to YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Format date for display
   */
  formatDateDisplay(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Get current filter label
   */
  getFilterLabel(): string {
    if (this.filterType === 'quick') {
      const filter = this.quickFilters.find(
        (f) => f.value === this.selectedQuickFilter
      );
      return filter ? filter.label : 'This Month';
    } else if (this.filterType === 'single') {
      return this.selectedDate
        ? this.formatDateDisplay(new Date(this.selectedDate))
        : 'Select Date';
    } else {
      if (this.startDate && this.endDate) {
        return `${this.formatDateDisplay(
          new Date(this.startDate)
        )} - ${this.formatDateDisplay(new Date(this.endDate))}`;
      }
      return 'Select Range';
    }
  }

  /**
   * Get paginated sales
   */
  getPaginatedSales(): CreditSale[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredSales.slice(start, end);
  }

  /**
   * Navigate to page
   */
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  /**
   * Export to Excel (placeholder)
   */
  exportToExcel(): void {
    this.toast.info('Excel export feature coming soon');
  }

  /**
   * Export to PDF (placeholder)
   */
  exportToPDF(): void {
    this.toast.info('PDF export feature coming soon');
  }
}
