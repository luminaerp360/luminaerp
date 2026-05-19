// Modern Invoice Component - Updated for new invoice system
import { Component, HostListener, OnInit } from '@angular/core';
import { InvoiceService } from '../../../../../shared/Services/invoice.service';
import { PaymentMethodService } from '../../../../../shared/Services/payment-method.service';
import { DebtorsService } from '../../../../../shared/Services/debtors.service';
import {
  Invoice,
  InvoiceStatus,
  InvoiceFilters,
} from '../../../../../shared/interfaces/invoice.interface';
import { PaymentMethodConfig } from '../../../../../shared/interfaces/payment-method.interface';
import { BaseComponent } from '../../../../../shared/components/base/base.component';
import { OrgDetailsService } from '../../../../../shared/Services/org-details.service';
import { PermissionService } from '../../../../../shared/Services/permission.service';
import {
  DialogRemoteControl,
  AppearanceAnimation,
  DisappearanceAnimation,
} from '@ng-vibe/dialog';
import { DocumentPrintService } from '../../../../../shared/Services/document-print.service';
import { DocumentData } from '../../../../../shared/Services/document-template.service';

interface SelectedPayment {
  methodId: number;
  code: string;
  name: string;
  amount: number;
  transactionCode: string;
}

@Component({
  selector: 'app-show-invoices',
  templateUrl: './show-invoices.component.html',
  styleUrls: ['./show-invoices.component.scss'],
})
export class ShowInvoicesComponent extends BaseComponent implements OnInit {
  invoices: Invoice[] = [];
  filteredInvoices: Invoice[] = [];
  endDate: string = '';
  startDate: string = '';
  selectedDate: string = '';
  isLoading: boolean = false;
  orgDetails: any;

  // Stats
  totalInvoices: number = 0;
  totalAmount: number = 0;
  totalPaid: number = 0;
  totalOutstanding: number = 0;
  overdueCount: number = 0;

  // Filter properties
  filterType: 'quick' | 'single' | 'range' = 'quick';
  selectedQuickFilter: string = 'today';
  selectedStatus: InvoiceStatus | 'all' = 'all';
  searchQuery: string = ''; // Search query for invoice number or customer name

  // Status enum for template
  InvoiceStatus = InvoiceStatus;

  quickFilters = [
    { value: 'today', label: 'Today', icon: 'bi-calendar-day' },
    { value: 'yesterday', label: 'Yesterday', icon: 'bi-calendar-minus' },
    { value: 'thisWeek', label: 'This Week', icon: 'bi-calendar-week' },
    { value: 'lastWeek', label: 'Last Week', icon: 'bi-calendar2-week' },
    { value: 'thisMonth', label: 'This Month', icon: 'bi-calendar-month' },
    { value: 'lastMonth', label: 'Last Month', icon: 'bi-calendar2-month' },
    { value: 'thisYear', label: 'This Year', icon: 'bi-calendar-range' },
  ];

  statusFilters: Array<{
    value: InvoiceStatus | 'all';
    label: string;
    color: string;
  }> = [
    { value: 'all', label: 'All', color: 'bg-gray-100' },
    { value: InvoiceStatus.DRAFT, label: 'Draft', color: 'bg-slate-100' },
    { value: InvoiceStatus.PENDING, label: 'Pending', color: 'bg-yellow-100' },
    { value: InvoiceStatus.SENT, label: 'Sent', color: 'bg-blue-100' },
    {
      value: InvoiceStatus.PARTIALLY_PAID,
      label: 'Partial',
      color: 'bg-orange-100',
    },
    { value: InvoiceStatus.PAID, label: 'Paid', color: 'bg-green-100' },
    { value: InvoiceStatus.OVERDUE, label: 'Overdue', color: 'bg-red-100' },
  ];

  // Permissions
  canUpdateInvoice: boolean = false;
  canDeleteInvoice: boolean = false;
  hasModuleAccess: boolean = false;

  // UI state
  selectedInvoices: Set<number> = new Set();
  openDropdowns: Set<number> = new Set();

  // Payment modal
  showPaymentModal = false;
  selectedInvoiceForPayment: Invoice | null = null;
  paymentAmount: number = 0;
  paymentMethod: 'CASH' | 'MPESA' | 'BANK_TRANSFER' | 'CREDIT' = 'CASH';
  transactionCode = '';
  paymentNotes = '';
  recordingPayment = false;

  // Multi-payment support
  selectedPayments: SelectedPayment[] = [];

  // Payment methods
  availablePaymentMethods: PaymentMethodConfig[] = [];
  selectedPaymentMethodId: number | null = null;
  selectedPaymentMethodCode = '';
  selectedPaymentMethodName = '';
  loadingPaymentMethods = false;

  // Wallet support
  customerWalletBalance: number = 0;
  loadingWallet = false;
  walletLoaded = false;

  // Document print settings modal
  docPrintModalOpen = false;
  docPrintData: DocumentData | null = null;

  constructor(
    public invoiceService: InvoiceService,
    private orgDetailsService: OrgDetailsService,
    private permissionService: PermissionService,
    private paymentMethodService: PaymentMethodService,
    private debtorsService: DebtorsService,
    private documentPrintService: DocumentPrintService,
  ) {
    super();
  }

  ngOnInit(): void {
    this.loadPermissions();

    if (!this.hasModuleAccess) {
      this.toast.error("You don't have access to the invoices module");
      return;
    }

    this.loadOrgDetails();
    this.loadPaymentMethods();
    this.selectQuickFilter('today');
    this.loadStats();
  }

  private loadPermissions(): void {
    this.hasModuleAccess = this.permissionService.hasModuleAccess('sales');
    this.canUpdateInvoice = this.permissionService.canPerformAction(
      'sales',
      'update',
    );
    this.canDeleteInvoice = this.permissionService.canPerformAction(
      'sales',
      'delete',
    );
  }

  loadPaymentMethods(): void {
    const currentOrgId = localStorage.getItem('licencedOrg');
    if (!currentOrgId) return;

    this.loadingPaymentMethods = true;
    this.paymentMethodService
      .getEnabledByOrganization(+currentOrgId)
      .subscribe({
        next: (methods: PaymentMethodConfig[]) => {
          this.availablePaymentMethods = methods;
          // Set default to first method
          if (methods.length > 0) {
            this.onPaymentMethodChange(methods[0].id);
          }
          this.loadingPaymentMethods = false;
        },
        error: (error: any) => {
          console.error('Error loading payment methods:', error);
          this.loadingPaymentMethods = false;
        },
      });
  }

  onPaymentMethodChange(methodId: number): void {
    const method = this.availablePaymentMethods.find((m) => m.id === methodId);
    if (method) {
      this.selectedPaymentMethodId = method.id;
      this.selectedPaymentMethodCode = method.code;
      this.selectedPaymentMethodName = method.displayName;
    }
  }

  loadOrgDetails() {
    const currentOrgId = localStorage.getItem('licencedOrg');
    this.orgDetailsService.getById(+currentOrgId!).subscribe(
      (details: any) => {
        if (details) {
          this.orgDetails = details;
        }
      },
      (error) => {
        this.toast.error('Failed to load organization details');
      },
    );
  }

  /**
   * Load invoices based on current filters
   */
  loadInvoices(): void {
    this.isLoading = true;

    const filters: InvoiceFilters = {
      limit: 100,
    };

    // Only add date filters if NOT searching
    // When searching, ignore date range to search all invoices
    if (!this.searchQuery || !this.searchQuery.trim()) {
      filters.startDate = this.startDate;
      filters.endDate = this.endDate;
    }

    if (this.selectedStatus !== 'all') {
      filters.status = this.selectedStatus as InvoiceStatus;
    }

    // Add search query if present
    if (this.searchQuery && this.searchQuery.trim()) {
      filters.search = this.searchQuery.trim();
    }

    this.invoiceService.getAllInvoices(filters).subscribe({
      next: (response) => {
        this.invoices = response.invoices.sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        this.filteredInvoices = this.invoices;
        this.calculateTotals();
      },
      error: (error) => {
        console.error('Error fetching invoices:', error);
        this.toast.error('Failed to load invoices');
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  /**
   * Load invoice statistics
   */
  loadStats(): void {
    this.invoiceService
      .getInvoiceStats({
        startDate: this.startDate,
        endDate: this.endDate,
      })
      .subscribe({
        next: (stats) => {
          this.totalInvoices = stats.totalInvoices;
          this.totalAmount = stats.totalAmount;
          this.totalPaid = stats.totalPaid;
          this.totalOutstanding = stats.totalOutstanding;
          this.overdueCount = stats.overdueInvoices;
        },
        error: (error) => {
          console.error('Error loading stats:', error);
        },
      });
  }

  /**
   * Calculate totals from current invoice list
   */
  calculateTotals(): void {
    this.totalInvoices = this.filteredInvoices.length;
    this.totalAmount = this.filteredInvoices.reduce(
      (sum, inv) => sum + inv.totalAmount,
      0,
    );
    this.totalPaid = this.filteredInvoices.reduce(
      (sum, inv) => sum + inv.amountPaid,
      0,
    );
    this.totalOutstanding = this.filteredInvoices.reduce(
      (sum, inv) => sum + inv.balanceDue,
      0,
    );
    this.overdueCount = this.filteredInvoices.filter((inv) =>
      this.invoiceService.isOverdue(inv),
    ).length;
  }

  /**
   * Filter by status
   */
  filterByStatus(status: InvoiceStatus | 'all'): void {
    this.selectedStatus = status;
    this.loadInvoices();
  }

  /**
   * Search invoices by invoice number or customer name
   */
  onSearch(): void {
    this.loadInvoices();
  }

  /**
   * Clear search
   */
  clearSearch(): void {
    this.searchQuery = '';
    this.loadInvoices();
  }

  /**
   * Quick filter selection
   */
  selectQuickFilter(filterValue: string): void {
    this.selectedQuickFilter = filterValue;
    this.filterType = 'quick';
    this.applyQuickFilter(filterValue);
  }

  selectFilterType(type: 'quick' | 'single' | 'range'): void {
    this.filterType = type;
    if (type === 'quick') {
      this.applyQuickFilter(this.selectedQuickFilter);
    } else if (type === 'single' && this.selectedDate) {
      this.startDate = this.selectedDate;
      this.endDate = this.selectedDate;
      this.loadInvoices();
    } else if (type === 'range' && this.startDate && this.endDate) {
      this.loadInvoices();
    }
  }

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
      case 'lastWeek':
        start = new Date(today);
        start.setDate(today.getDate() - today.getDay() - 7);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
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
    this.loadInvoices();
    this.loadStats();
  }

  /**
   * Record payment for invoice
   */
  recordPayment(invoice: Invoice): void {
    this.selectedInvoiceForPayment = invoice;
    this.paymentAmount = invoice.balanceDue;
    this.showPaymentModal = true;
    this.loadCustomerWallet();
  }

  openPaymentModal(invoice: Invoice): void {
    this.selectedInvoiceForPayment = invoice;
    this.paymentAmount = invoice.balanceDue;
    this.showPaymentModal = true;
    this.loadCustomerWallet();
  }

  closePaymentModal(): void {
    this.showPaymentModal = false;
    this.selectedInvoiceForPayment = null;
    this.paymentAmount = 0;
    this.transactionCode = '';
    this.paymentNotes = '';
    this.paymentMethod = 'CASH';
    this.selectedPayments = [];
    this.customerWalletBalance = 0;
    this.walletLoaded = false;
  }

  selectPaymentMethodForAdd(methodId: number): void {
    const method = this.availablePaymentMethods.find((m) => m.id === methodId);
    if (!method) return;

    const remainingBalance = this.getRemainingBalance();
    this.selectedPayments.push({
      methodId: method.id,
      code: method.code,
      name: method.displayName,
      amount: remainingBalance,
      transactionCode: '',
    });
  }

  removePaymentMethodByIndex(index: number): void {
    this.selectedPayments.splice(index, 1);
  }

  updatePaymentAmount(index: number, amount: number): void {
    if (this.selectedPayments[index]) {
      this.selectedPayments[index].amount = amount;
    }
  }

  updateTransactionCode(index: number, code: string): void {
    if (this.selectedPayments[index]) {
      this.selectedPayments[index].transactionCode = code;
    }
  }

  getTotalFromPayments(): number {
    return this.selectedPayments.reduce(
      (sum, payment) => sum + (payment.amount || 0),
      0,
    );
  }

  getRemainingBalance(): number {
    const total = this.selectedInvoiceForPayment?.balanceDue || 0;
    const paid = this.getTotalFromPayments();
    return total - paid;
  }

  getExcessAmount(): number {
    const remaining = this.getRemainingBalance();
    return remaining < 0 ? Math.abs(remaining) : 0;
  }

  requiresTransactionCode(methodId: number): boolean {
    const method = this.availablePaymentMethods.find((m) => m.id === methodId);
    return method?.requiresReference || false;
  }

  /** Load wallet balance for the selected invoice's customer */
  loadCustomerWallet(): void {
    if (!this.selectedInvoiceForPayment?.customerId) return;
    this.loadingWallet = true;
    this.debtorsService
      .getCustomerWallet(this.selectedInvoiceForPayment.customerId)
      .subscribe({
        next: (wallet) => {
          this.customerWalletBalance = wallet.walletBalance || 0;
          this.walletLoaded = true;
          this.loadingWallet = false;
        },
        error: () => {
          this.customerWalletBalance = 0;
          this.walletLoaded = true;
          this.loadingWallet = false;
        },
      });
  }

  /** Add wallet as a payment source */
  addWalletPayment(): void {
    // Check if wallet payment already added
    if (this.selectedPayments.some((p) => p.code === 'WALLET')) {
      this.toast.error('Wallet payment already added');
      return;
    }

    if (this.customerWalletBalance <= 0) {
      this.toast.error('No wallet balance available');
      return;
    }

    const balanceDue = this.selectedInvoiceForPayment?.balanceDue || 0;
    const walletAmount = Math.min(this.customerWalletBalance, balanceDue);

    if (walletAmount <= 0) {
      this.toast.error('No remaining balance to pay from wallet');
      return;
    }

    // Remove other payments if wallet covers the full balance
    if (walletAmount >= balanceDue) {
      this.selectedPayments = [];
    }

    this.selectedPayments.push({
      methodId: -1, // special ID for wallet
      code: 'WALLET',
      name: 'Customer Wallet',
      amount: walletAmount,
      transactionCode: '',
    });
  }

  isWalletPayment(payment: SelectedPayment): boolean {
    return payment.code === 'WALLET';
  }

  submitPayment(): void {
    if (!this.selectedInvoiceForPayment) {
      this.toast.error('Invoice not found');
      return;
    }

    if (this.selectedPayments.length === 0) {
      this.toast.error('Please select at least one payment method');
      return;
    }

    const totalPayment = this.getTotalFromPayments();
    if (totalPayment <= 0) {
      this.toast.error('Please enter valid payment amounts');
      return;
    }

    // Overpayments are allowed - excess goes to customer wallet

    // Validate required transaction codes
    for (const payment of this.selectedPayments) {
      const method = this.availablePaymentMethods.find(
        (m) => m.id === payment.methodId,
      );
      if (method?.requiresReference && !payment.transactionCode) {
        this.toast.error(`Transaction code required for ${payment.name}`);
        return;
      }
    }

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const username = currentUser.username || 'System User';

    this.recordingPayment = true;

    // Separate wallet payments from regular payments
    const walletPayments = this.selectedPayments.filter(
      (p) => p.code === 'WALLET',
    );
    const regularPayments = this.selectedPayments.filter(
      (p) => p.code !== 'WALLET',
    );

    const walletTotal = walletPayments.reduce(
      (sum, p) => sum + (p.amount || 0),
      0,
    );

    // Step 1: Process wallet payment first (if any)
    const processRegularPayments = () => {
      if (regularPayments.length === 0) {
        this.toast.success('Payment recorded successfully');
        this.closePaymentModal();
        this.loadInvoices();
        this.loadStats();
        this.recordingPayment = false;
        return;
      }

      const paymentRequests = regularPayments.map((payment) => {
        const paymentDto = {
          amount: payment.amount,
          paymentMethod: payment.code as any,
          paymentMethodId: payment.methodId,
          paymentMethodCode: payment.code,
          paymentMethodName: payment.name,
          transactionCode: payment.transactionCode || undefined,
          paymentDate: new Date().toISOString(),
          notes: this.paymentNotes,
          recordedBy: username,
        };
        return this.invoiceService.recordPayment(
          this.selectedInvoiceForPayment!.id!,
          paymentDto,
        );
      });

      let completedCount = 0;
      const totalPayments = paymentRequests.length;

      paymentRequests.forEach((request, index) => {
        request.subscribe({
          next: (response: any) => {
            completedCount++;
            if (completedCount === totalPayments) {
              const messages: string[] = [];
              if (walletTotal > 0) {
                messages.push(
                  `${this.invoiceService.formatCurrency(walletTotal)} paid from wallet`,
                );
              }
              messages.push(`${totalPayments} payment(s) recorded`);
              if (response?.walletInfo) {
                messages.push(
                  `${this.invoiceService.formatCurrency(response.walletInfo.excessAmount)} excess added to wallet`,
                );
              }
              this.toast.success(messages.join('. '));
              this.closePaymentModal();
              this.loadInvoices();
              this.loadStats();
              this.recordingPayment = false;
            }
          },
          error: (error) => {
            console.error('Error recording payment:', error);
            this.toast.error(
              `Failed to record payment ${index + 1} of ${totalPayments}`,
            );
            this.recordingPayment = false;
          },
        });
      });
    };

    if (walletTotal > 0 && this.selectedInvoiceForPayment?.customerId) {
      // Apply wallet payment via debtors service
      const walletDto = {
        customerId: this.selectedInvoiceForPayment.customerId,
        payments: [
          {
            invoiceId: this.selectedInvoiceForPayment.id!,
            amount: walletTotal,
          },
        ],
        recordedBy: username,
        notes: this.paymentNotes || 'Wallet payment applied from invoice',
      };

      this.debtorsService.applyWalletToInvoices(walletDto).subscribe({
        next: () => {
          if (regularPayments.length > 0) {
            // Reload invoice to get updated balance before processing regular payments
            this.invoiceService
              .getInvoiceById(this.selectedInvoiceForPayment!.id!)
              .subscribe({
                next: (updatedInvoice: any) => {
                  this.selectedInvoiceForPayment = updatedInvoice;
                  processRegularPayments();
                },
                error: () => {
                  processRegularPayments();
                },
              });
          } else {
            this.toast.success(
              `${this.invoiceService.formatCurrency(walletTotal)} paid from customer wallet`,
            );
            this.closePaymentModal();
            this.loadInvoices();
            this.loadStats();
            this.recordingPayment = false;
          }
        },
        error: (error) => {
          console.error('Error applying wallet payment:', error);
          this.toast.error(
            error?.error?.message || 'Failed to apply wallet payment',
          );
          this.recordingPayment = false;
        },
      });
    } else {
      processRegularPayments();
    }
  }

  /**
   * Download invoice PDF
   */
  downloadPDF(invoice: Invoice, theme: string = 'default'): void {
    this.invoiceService.downloadInvoicePDF(invoice.id!, theme).subscribe({
      next: (blob) => {
        this.invoiceService.downloadBlob(
          blob,
          `invoice-${invoice.invoiceNumber}.pdf`,
        );
        this.toast.success('PDF downloaded successfully');
      },
      error: (error) => {
        this.toast.error('Failed to download PDF');
        console.error(error);
      },
    });
  }

  /** Open document print/PDF settings modal for an invoice */
  openDocPrintModal(invoice: Invoice): void {
    // Fetch full invoice details (list endpoint omits items array)
    this.invoiceService.getInvoiceById(invoice.id!).subscribe({
      next: (fullInvoice: any) => {
        this.docPrintData = this.documentPrintService.normalizeInvoiceData(
          fullInvoice,
          this.orgDetails,
        );
        this.docPrintModalOpen = true;
      },
      error: () => {
        // Fall back to list-level data (items will be empty but totals are there)
        this.docPrintData = this.documentPrintService.normalizeInvoiceData(
          invoice,
          this.orgDetails,
        );
        this.docPrintModalOpen = true;
      },
    });
  }

  closeDocPrintModal(): void {
    this.docPrintModalOpen = false;
    this.docPrintData = null;
  }

  /**
   * Copy public link to clipboard
   */
  async copyPublicLink(invoice: Invoice): Promise<void> {
    if (!invoice.publicToken) {
      this.toast.error('Public link not available');
      return;
    }

    const copied = await this.invoiceService.copyPublicLink(
      invoice.publicToken,
    );
    if (copied) {
      this.toast.success('Public link copied to clipboard!');
    } else {
      this.toast.error('Failed to copy link');
    }
  }

  /**
   * Send invoice via email
   */
  sendInvoice(invoice: Invoice): void {
    this.invoiceService.sendInvoice(invoice.id!).subscribe({
      next: () => {
        this.toast.success('Invoice sent successfully');
        this.loadInvoices();
      },
      error: (error) => {
        this.toast.error('Failed to send invoice');
        console.error(error);
      },
    });
  }

  /**
   * Cancel invoice
   */
  cancelInvoice(invoice: Invoice): void {
    if (!this.canDeleteInvoice) {
      this.toast.error("You don't have permission to cancel invoices");
      return;
    }

    const confirmation = confirm(
      `Are you sure you want to cancel invoice ${invoice.invoiceNumber}?\n\n` +
        `Customer: ${invoice.customerName}\n` +
        `Amount: ${this.invoiceService.formatCurrency(invoice.totalAmount)}\n\n` +
        `This action cannot be undone.`,
    );

    if (confirmation) {
      this.invoiceService.cancelInvoice(invoice.id!).subscribe({
        next: () => {
          this.toast.success('Invoice cancelled successfully');
          this.loadInvoices();
          this.loadStats();
        },
        error: (error) => {
          this.toast.error('Failed to cancel invoice');
          console.error(error);
        },
      });
    }
  }

  /**
   * Delete invoice
   */
  deleteInvoice(invoice: Invoice): void {
    if (!this.canDeleteInvoice) {
      this.toast.error("You don't have permission to delete invoices");
      return;
    }

    if (invoice.amountPaid > 0) {
      this.toast.error(
        'Cannot delete an invoice with payments. Cancel it instead.',
      );
      return;
    }

    const confirmation = confirm(
      `Are you sure you want to delete invoice ${invoice.invoiceNumber}?\n\n` +
        `This action cannot be undone.`,
    );

    if (confirmation) {
      this.invoiceService.deleteInvoice(invoice.id!).subscribe({
        next: () => {
          this.toast.success('Invoice deleted successfully');
          this.loadInvoices();
          this.loadStats();
        },
        error: (error) => {
          this.toast.error('Failed to delete invoice');
          console.error(error);
        },
      });
    }
  }

  /**
   * Navigate to edit invoice
   */
  editInvoice(invoice: Invoice): void {
    if (!this.canUpdateInvoice) {
      this.toast.error("You don't have permission to update invoices");
      return;
    }

    const url = `/invoices/edit/${invoice.id}`;
    this.openLink(url);
  }

  /**
   * View invoice details
   */
  viewInvoice(invoice: Invoice): void {
    this.router.navigate(['/invoices', invoice.id]);
    this.openDropdowns.clear();
  }

  // Helper methods
  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  formatDateDisplay(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getFilterLabel(): string {
    if (this.filterType === 'quick') {
      const filter = this.quickFilters.find(
        (f) => f.value === this.selectedQuickFilter,
      );
      return filter ? filter.label : 'Today';
    } else if (this.filterType === 'single') {
      return this.selectedDate
        ? this.formatDateDisplay(new Date(this.selectedDate))
        : 'Select Date';
    } else {
      if (this.startDate && this.endDate) {
        return `${this.formatDateDisplay(new Date(this.startDate))} - ${this.formatDateDisplay(new Date(this.endDate))}`;
      }
      return 'Select Range';
    }
  }

  // Dropdown management
  toggleDropdown(invoiceId: number): void {
    if (this.openDropdowns.has(invoiceId)) {
      this.openDropdowns.delete(invoiceId);
    } else {
      this.openDropdowns.clear();
      this.openDropdowns.add(invoiceId);
    }
  }

  isDropdownOpen(invoiceId: number): boolean {
    return this.openDropdowns.has(invoiceId);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-container')) {
      this.openDropdowns.clear();
    }
  }

  /**
   * Finalize draft invoice (DRAFT → PENDING)
   */
  finalizeInvoice(invoice: Invoice): void {
    const confirmation = confirm(
      `Finalize invoice ${invoice.invoiceNumber}? This will mark it as ready for sending and payment.`
    );

    if (!confirmation) return;

    this.invoiceService
      .finalizeInvoice(this.orgDetails.id, invoice.id!)
      .subscribe({
        next: (updatedInvoice) => {
          this.toast.success('Invoice finalized successfully');
          this.loadInvoices();
          this.openDropdowns.delete(invoice.id!);
        },
        error: (error) => {
          console.error('Error finalizing invoice:', error);
          this.toast.error(error.error?.message || 'Failed to finalize invoice');
        },
      });
  }

  /**
   * Mark invoice as sent (PENDING → SENT)
   */
  markInvoiceAsSent(invoice: Invoice): void {
    const confirmation = confirm(
      `Mark invoice ${invoice.invoiceNumber} as sent?`
    );

    if (!confirmation) return;

    this.invoiceService
      .markAsSent(this.orgDetails.id, invoice.id!)
      .subscribe({
        next: (updatedInvoice) => {
          this.toast.success('Invoice marked as sent');
          this.loadInvoices();
          this.openDropdowns.delete(invoice.id!);
        },
        error: (error) => {
          console.error('Error marking invoice as sent:', error);
          this.toast.error(error.error?.message || 'Failed to mark invoice as sent');
        },
      });
  }

  /**
   * Duplicate invoice (creates new DRAFT)
   */
  duplicateInvoice(invoice: Invoice): void {
    const confirmation = confirm(
      `Create a copy of invoice ${invoice.invoiceNumber}? A new draft invoice will be created.`
    );

    if (!confirmation) return;

    this.invoiceService
      .duplicateInvoice(this.orgDetails.id, invoice.id!)
      .subscribe({
        next: (newInvoice) => {
          this.toast.success(`Invoice duplicated as ${newInvoice.invoiceNumber}`);
          this.loadInvoices();
          this.openDropdowns.delete(invoice.id!);
        },
        error: (error) => {
          console.error('Error duplicating invoice:', error);
          this.toast.error(error.error?.message || 'Failed to duplicate invoice');
        },
      });
  }

  /**
   * Send payment reminder
   */
  sendPaymentReminder(invoice: Invoice): void {
    const reminderType: 'FRIENDLY' | 'FIRM' | 'URGENT' =
      invoice.status === InvoiceStatus.OVERDUE ? 'URGENT' : 'FRIENDLY';

    const confirmation = confirm(
      `Send ${reminderType.toLowerCase()} payment reminder for invoice ${invoice.invoiceNumber} to ${invoice.customerName}?`
    );

    if (!confirmation) return;

    this.invoiceService
      .sendReminder(this.orgDetails.id, invoice.id!, reminderType)
      .subscribe({
        next: (result) => {
          this.toast.success(result.message);
          this.loadInvoices();
          this.openDropdowns.delete(invoice.id!);
        },
        error: (error) => {
          console.error('Error sending reminder:', error);
          this.toast.error(error.error?.message || 'Failed to send reminder');
        },
      });
  }

  /**
   * Check if action can be performed on invoice
   */
  canPerformAction(action: string, invoice: Invoice): boolean {
    return this.invoiceService.canPerformAction(action, invoice);
  }
}
