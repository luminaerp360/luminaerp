import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CreditorsService } from '../../../shared/Services/creditors.service';
import {
  BillPayment,
  PaymentMethod,
  PaymentHistoryResponse,
  Supplier,
} from '../../../types/creditors.types';
import { HotToastService } from '@ngneat/hot-toast';

@Component({
  selector: 'app-bill-payment-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bill-payment-history.component.html',
  styleUrls: ['./bill-payment-history.component.scss'],
})
export class BillPaymentHistoryComponent implements OnInit {
  payments: BillPayment[] = [];
  loading = false;

  // Filters
  searchQuery = '';
  startDate = '';
  endDate = '';
  selectedPaymentMethod: PaymentMethod | '' = '';
  selectedSupplierId: number | null = null;

  // Pagination
  currentPage = 1;
  pageSize = 50;
  totalPages = 0;
  totalPayments = 0;

  // Summary
  totalAmount = 0;

  // Suppliers for filter
  suppliers: Supplier[] = [];

  // Payment methods
  PaymentMethodEnum = PaymentMethod;
  paymentMethods = [
    { value: '', label: 'All Payment Methods' },
    { value: PaymentMethod.CASH, label: 'Cash' },
    { value: PaymentMethod.MPESA, label: 'M-Pesa' },
    { value: PaymentMethod.BANK_TRANSFER, label: 'Bank Transfer' },
    { value: PaymentMethod.CREDIT, label: 'Credit' },
  ];

  constructor(
    private creditorsService: CreditorsService,
    private router: Router,
    private toast: HotToastService,
  ) {}

  ngOnInit() {
    this.setDefaultDates();
    this.loadSuppliers();
    this.loadPaymentHistory();
  }

  setDefaultDates() {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    this.startDate = firstDayOfMonth.toISOString().split('T')[0];
    this.endDate = today.toISOString().split('T')[0];
  }

  loadSuppliers() {
    this.creditorsService.getAllSuppliers().subscribe({
      next: (suppliers) => {
        this.suppliers = suppliers;
      },
      error: (error) => {
        console.error('Error loading suppliers:', error);
      },
    });
  }

  loadPaymentHistory() {
    this.loading = true;

    const filter = {
      searchQuery: this.searchQuery || undefined,
      startDate: this.startDate || undefined,
      endDate: this.endDate || undefined,
      paymentMethod: this.selectedPaymentMethod || undefined,
      supplierId: this.selectedSupplierId || undefined,
      page: this.currentPage,
      limit: this.pageSize,
    };

    this.creditorsService.getPaymentHistory(filter).subscribe({
      next: (response: PaymentHistoryResponse) => {
        this.payments = response.payments;
        this.currentPage = response.pagination.page;
        this.totalPages = response.pagination.totalPages;
        this.totalPayments = response.pagination.total;
        this.totalAmount = response.summary.totalAmount;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading payment history:', error);
        this.toast.error('Failed to load payment history');
        this.loading = false;
      },
    });
  }

  applyFilters() {
    this.currentPage = 1;
    this.loadPaymentHistory();
  }

  clearFilters() {
    this.searchQuery = '';
    this.selectedPaymentMethod = '';
    this.selectedSupplierId = null;
    this.setDefaultDates();
    this.currentPage = 1;
    this.loadPaymentHistory();
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadPaymentHistory();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadPaymentHistory();
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadPaymentHistory();
    }
  }

  getVisiblePages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  exportToCSV() {
    const csvData = this.payments.map((p) => ({
      'Payment Date': new Date(p.paymentDate).toLocaleDateString(),
      'Bill Number': p.billNumber,
      Supplier: p.supplier.name,
      Amount: p.amount,
      'Payment Method': p.paymentMethod,
      'Reference Number': p.referenceNumber || '',
      'Transaction Code': p.transactionCode || '',
      Notes: p.notes || '',
      'Created By': p.createdBy || '',
    }));

    const csv = this.convertToCSV(csvData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bill-payment-history_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            return typeof value === 'string' && value.includes(',')
              ? `"${value}"`
              : value;
          })
          .join(','),
      ),
    ];

    return csvRows.join('\n');
  }

  getPaymentMethodBadgeClass(method: PaymentMethod): string {
    const classes: Record<PaymentMethod, string> = {
      [PaymentMethod.CASH]: 'bg-green-100 text-green-800',
      [PaymentMethod.MPESA]: 'bg-blue-100 text-blue-800',
      [PaymentMethod.BANK_TRANSFER]: 'bg-purple-100 text-purple-800',
      [PaymentMethod.CREDIT]: 'bg-orange-100 text-orange-800',
    };
    return classes[method] || 'bg-gray-100 text-gray-800';
  }

  viewBillDetails(payment: BillPayment) {
    // Navigate to bill details if needed
    console.log('View bill details:', payment.billId);
  }

  viewSupplierStatement(supplierId: number) {
    this.router.navigate(['/creditors/supplier-statement', supplierId]);
  }
}
