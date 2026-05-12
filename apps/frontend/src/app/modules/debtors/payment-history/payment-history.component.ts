import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DebtorsService } from '../../../shared/Services/debtors.service';
import {
  AllPaymentHistoryResponse,
  PaymentHistoryFilters,
  InvoicePayment,
} from '../../../types/debtors.types';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HotToastService } from '@ngneat/hot-toast';

@Component({
  selector: 'app-payment-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment-history.component.html',
  styleUrls: ['./payment-history.component.scss'],
})
export class PaymentHistoryComponent implements OnInit {
  loading = false;
  data: AllPaymentHistoryResponse | null = null;
  paymentMethods: any[] = [];

  // Filters
  filters: PaymentHistoryFilters = {
    page: 1,
    limit: 20,
  };
  startDate = '';
  endDate = '';
  selectedPaymentMethod = '';
  searchQuery = '';

  // UI State
  showFilters = true;
  Math = Math; // For use in template

  constructor(
    private router: Router,
    private debtorsService: DebtorsService,
    private toast: HotToastService,
  ) {}

  ngOnInit(): void {
    this.loadPaymentMethods();
    this.loadPaymentHistory();
  }

  loadPaymentMethods(): void {
    this.debtorsService.getPaymentMethods().subscribe({
      next: (methods) => {
        this.paymentMethods = methods;
      },
      error: (error) => {
        console.error('Error loading payment methods:', error);
      },
    });
  }

  loadPaymentHistory(): void {
    this.loading = true;

    // Build filters
    const filters: PaymentHistoryFilters = {
      ...this.filters,
      startDate: this.startDate || undefined,
      endDate: this.endDate || undefined,
      paymentMethodCode: this.selectedPaymentMethod || undefined,
      search: this.searchQuery || undefined,
    };

    this.debtorsService.getAllPaymentHistory(filters).subscribe({
      next: (data) => {
        this.data = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading payment history:', error);
        this.toast.error('Failed to load payment history');
        this.loading = false;
      },
    });
  }

  applyFilters(): void {
    this.filters.page = 1; // Reset to first page
    this.loadPaymentHistory();
  }

  clearFilters(): void {
    this.startDate = '';
    this.endDate = '';
    this.selectedPaymentMethod = '';
    this.searchQuery = '';
    this.filters = {
      page: 1,
      limit: 20,
    };
    this.loadPaymentHistory();
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  goToPage(page: number): void {
    this.filters.page = page;
    this.loadPaymentHistory();
  }

  nextPage(): void {
    if (this.data?.pagination.hasNextPage) {
      this.filters.page = (this.filters.page || 1) + 1;
      this.loadPaymentHistory();
    }
  }

  prevPage(): void {
    if (this.data?.pagination.hasPrevPage) {
      this.filters.page = Math.max((this.filters.page || 1) - 1, 1);
      this.loadPaymentHistory();
    }
  }

  viewInvoice(invoiceId: number): void {
    this.router.navigate(['/invoices', invoiceId]);
  }

  viewCustomer(customerId: number): void {
    this.router.navigate(['/debtors/outstanding-invoices', customerId]);
  }

  exportToCSV(): void {
    if (!this.data || this.data.payments.length === 0) {
      this.toast.error('No data to export');
      return;
    }

    const headers = [
      'Date',
      'Invoice #',
      'Customer',
      'Amount',
      'Payment Method',
      'Transaction Code',
      'Recorded By',
      'Notes',
    ];

    const rows = this.data.payments.map((payment) => [
      this.formatDate(payment.paymentDate),
      payment.invoice?.invoiceNumber || '',
      payment.invoice?.customer?.fullName || '',
      payment.amount.toString(),
      payment.paymentMethodName || '',
      payment.transactionCode || '',
      payment.recordedBy || '',
      payment.notes || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    this.toast.success('Payment history exported to CSV');
  }

  print(): void {
    window.print();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatDateTime(date: Date | string): string {
    return new Date(date).toLocaleString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getPaymentMethodBadgeClass(code: string): string {
    const classes: { [key: string]: string } = {
      CASH: 'bg-green-100 text-green-800',
      MPESA: 'bg-blue-100 text-blue-800',
      BANK_TRANSFER: 'bg-purple-100 text-purple-800',
      CREDIT: 'bg-orange-100 text-orange-800',
    };
    return classes[code] || 'bg-gray-100 text-gray-800';
  }
}
