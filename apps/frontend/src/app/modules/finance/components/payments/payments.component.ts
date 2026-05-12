// payments.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { HotToastService } from '@ngneat/hot-toast';
import { finalize } from 'rxjs';
import {
  Payment,
  PaymentReport,
  PaymentsService,
} from '../../../../shared/Services/payments.service';
import { PaymentReceiptService } from '../../services/payment-receipt.service';
import { OrgDetailsService } from '../../../../shared/Services/org-details.service';
import jsPDF from 'jspdf';
import autoTable, { CellInput } from 'jspdf-autotable';

@Component({
  selector: 'app-payments',
  templateUrl: './payments.component.html',
  styleUrls: ['./payments.component.scss'],
})
export class PaymentsComponent implements OnInit {
  filterForm: FormGroup;
  report: PaymentReport | null = null;
  loading = false;
  orgDetails: any;
  currencySymbol: string = 'KSh';

  // Search and filter properties
  searchQuery: string = '';
  filterType: 'quick' | 'range' = 'quick';
  selectedQuickFilter: string = 'today';
  startDate: string = '';
  endDate: string = '';
  paymentType: string = '';
  method: string = '';

  quickFilters = [
    { value: 'today', label: 'Today', icon: 'bi-calendar-day' },
    { value: 'yesterday', label: 'Yesterday', icon: 'bi-calendar-minus' },
    { value: 'thisWeek', label: 'This Week', icon: 'bi-calendar-week' },
    { value: 'lastWeek', label: 'Last Week', icon: 'bi-calendar2-week' },
    { value: 'thisMonth', label: 'This Month', icon: 'bi-calendar-month' },
    { value: 'lastMonth', label: 'Last Month', icon: 'bi-calendar2-month' },
    { value: 'thisYear', label: 'This Year', icon: 'bi-calendar-range' },
  ];

  constructor(
    private fb: FormBuilder,
    private paymentsService: PaymentsService,
    private toast: HotToastService,
    private paymentReceiptService: PaymentReceiptService,
    private orgDetailsService: OrgDetailsService,
  ) {
    this.filterForm = this.fb.group({
      startDate: [''],
      endDate: [''],
      paymentType: [''],
      method: [''],
    });
  }

  ngOnInit() {
    this.loadOrgDetails();
    // Initialize with today's filter
    this.selectQuickFilter('today');
  }

  loadOrgDetails() {
    const currentOrgId = localStorage.getItem('licencedOrg');
    this.orgDetailsService.getById(+currentOrgId!).subscribe({
      next: (details: any) => {
        if (details) {
          this.orgDetails = details;
          if (details.currency) {
            this.currencySymbol = details.currency;
          }
        }
      },
      error: () => {
        this.toast.error('Failed to load organization details');
      },
    });
  }

  loadReport() {
    this.loading = true;
    this.report = null;

    // When searching, extend date range to 5 years
    let searchStartDate = this.startDate;
    let searchEndDate = this.endDate;

    if (this.searchQuery && this.searchQuery.trim()) {
      const today = new Date();
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(today.getFullYear() - 5);
      searchStartDate = this.formatDate(fiveYearsAgo);
      searchEndDate = this.formatDate(today);
    }

    const filters = {
      startDate: searchStartDate,
      endDate: searchEndDate,
      paymentType: this.paymentType,
      method: this.method,
      search: this.searchQuery?.trim() || undefined,
    };

    this.paymentsService
      .getPaymentReports(filters)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (data) => {
          // Sort payments - income first, then expense, then by date
          data.payments.sort((a, b) => {
            if (a.paymentType !== b.paymentType) {
              return a.paymentType > b.paymentType ? 1 : -1;
            }
            return (
              new Date(b.createdAt!).getTime() -
              new Date(a.createdAt!).getTime()
            );
          });

          this.report = data;
        },
        error: (error) => {
          this.toast.error('Failed to load payment report');
          console.error('Error loading report:', error);
        },
      });
  }

  /**
   * Search payments
   */
  onSearch() {
    this.loadReport();
  }

  /**
   * Clear search
   */
  clearSearch() {
    this.searchQuery = '';
    this.loadReport();
  }

  /**
   * Select filter type
   */
  selectFilterType(type: 'quick' | 'range') {
    this.filterType = type;
    if (type === 'quick') {
      this.applyQuickFilter(this.selectedQuickFilter);
    }
  }

  /**
   * Select quick filter
   */
  selectQuickFilter(filterValue: string) {
    this.selectedQuickFilter = filterValue;
    this.filterType = 'quick';
    this.applyQuickFilter(filterValue);
  }

  /**
   * Apply quick filter
   */
  private applyQuickFilter(filterValue: string) {
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
    this.loadReport();
  }

  /**
   * Get filter label
   */
  getFilterLabel(): string {
    if (this.filterType === 'quick') {
      const filter = this.quickFilters.find(
        (f) => f.value === this.selectedQuickFilter,
      );
      return filter ? filter.label : 'Today';
    } else {
      if (this.startDate && this.endDate) {
        return `${this.formatDateDisplay(
          new Date(this.startDate),
        )} - ${this.formatDateDisplay(new Date(this.endDate))}`;
      }
      return 'Select Range';
    }
  }

  /**
   * Format date for API
   */
  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Format date for display
   */
  private formatDateDisplay(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  exportPDF() {
    const doc = new jsPDF();

    // Add report title
    doc.setFontSize(18);
    doc.text('Payment Report', 14, 22);

    // Add summary info
    doc.setFontSize(12);
    doc.text(`Total Income: ${this.report!.summary.totalIncome}`, 14, 32);
    doc.text(`Total Expense: ${this.report!.summary.totalExpense}`, 14, 38);
    doc.text(`Net Amount: ${this.report!.summary.netAmount}`, 14, 44);

    // Add table with payment data
    autoTable(doc, {
      head: [['Date', 'Type', 'Method', 'Amount', 'Description']],
      body: this.report!.payments.map(
        (payment) =>
          [
            payment.createdAt?.toString() ?? '',
            payment.paymentType ?? '',
            payment.method ?? '',
            payment.amount?.toString() ?? '',
            payment.description ?? '',
          ] as CellInput[],
      ),
      startY: 54,
    });

    // Save the PDF
    doc.save('payment-report.pdf');
  }

  printReceipt(payment: Payment) {
    try {
      if (!this.orgDetails) {
        this.toast.error('Organization details not loaded');
        return;
      }

      this.paymentReceiptService.printPaymentReceipt(payment, this.orgDetails);
      this.toast.success('Printing payment receipt...');
    } catch (error) {
      console.error('Print error:', error);
      this.toast.error('Failed to print payment receipt');
    }
  }
}
