import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DebtorsService } from '../../../shared/Services/debtors.service';
import {
  AllCustomersResponse,
  CustomerSummary,
} from '../../../types/debtors.types';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HotToastService } from '@ngneat/hot-toast';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customer-list.component.html',
  styleUrls: ['./customer-list.component.scss'],
})
export class CustomerListComponent implements OnInit {
  loading = false;
  data: AllCustomersResponse | null = null;
  searchQuery = '';
  page = 1;
  limit = 20;
  showOnlyWithDebt = false;
  Math = Math; // For use in template

  constructor(
    private router: Router,
    private debtorsService: DebtorsService,
    private toast: HotToastService,
  ) {}

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.loading = true;
    this.debtorsService
      .getAllCustomers(this.searchQuery || undefined, this.page, this.limit)
      .subscribe({
        next: (data) => {
          this.data = data;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading customers:', error);
          this.toast.error('Failed to load customers');
          this.loading = false;
        },
      });
  }

  search(): void {
    this.page = 1;
    this.loadCustomers();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.page = 1;
    this.loadCustomers();
  }

  toggleDebtFilter(): void {
    this.showOnlyWithDebt = !this.showOnlyWithDebt;
  }

  getFilteredCustomers(): CustomerSummary[] {
    if (!this.data) return [];
    if (!this.showOnlyWithDebt) return this.data.customers;
    return this.data.customers.filter((c) => c.hasOutstandingDebt);
  }

  getCustomersWithDebt(): number {
    if (!this.data) return 0;
    return this.data.customers.filter((c) => c.hasOutstandingDebt).length;
  }

  getCustomersFullyPaid(): number {
    if (!this.data) return 0;
    return this.data.customers.filter((c) => !c.hasOutstandingDebt).length;
  }

  goToPage(newPage: number): void {
    this.page = newPage;
    this.loadCustomers();
  }

  nextPage(): void {
    if (this.data?.pagination.hasNextPage) {
      this.page++;
      this.loadCustomers();
    }
  }

  prevPage(): void {
    if (this.data?.pagination.hasPrevPage) {
      this.page = Math.max(this.page - 1, 1);
      this.loadCustomers();
    }
  }

  viewOutstandingInvoices(customerId: number): void {
    this.router.navigate(['/debtors/outstanding-invoices', customerId]);
  }

  viewCustomerStatement(customerId: number): void {
    this.router.navigate(['/debtors/customer-statement', customerId]);
  }

  viewCustomerWallet(customerId: number): void {
    this.router.navigate(['/debtors/customer-wallet', customerId]);
  }

  viewAgingAnalysis(): void {
    this.router.navigate(['/debtors']);
  }

  viewPaymentHistory(): void {
    this.router.navigate(['/debtors/payment-history']);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  }

  getDebtStatusBadge(customer: CustomerSummary): {
    class: string;
    text: string;
  } {
    if (customer.outstandingBalance === 0) {
      return {
        class: 'bg-green-100 text-green-800',
        text: 'No Debt',
      };
    } else if (customer.outstandingBalance < 10000) {
      return {
        class: 'bg-yellow-100 text-yellow-800',
        text: 'Low Debt',
      };
    } else if (customer.outstandingBalance < 50000) {
      return {
        class: 'bg-orange-100 text-orange-800',
        text: 'Medium Debt',
      };
    } else {
      return {
        class: 'bg-red-100 text-red-800',
        text: 'High Debt',
      };
    }
  }

  exportToCSV(): void {
    if (!this.data || this.data.customers.length === 0) {
      this.toast.error('No data to export');
      return;
    }

    const customers = this.getFilteredCustomers();
    const headers = [
      'Customer Name',
      'Phone',
      'Email',
      'Total Invoices',
      'Total Invoiced',
      'Total Paid',
      'Outstanding Balance',
      'Wallet Balance',
      'Outstanding Invoices',
      'Status',
    ];

    const rows = customers.map((customer) => [
      customer.fullName,
      customer.phoneNumber,
      customer.email || '',
      customer.totalInvoices.toString(),
      customer.totalInvoiced.toString(),
      customer.totalPaid.toString(),
      customer.outstandingBalance.toString(),
      (customer.walletBalance || 0).toString(),
      customer.outstandingInvoices.toString(),
      customer.hasOutstandingDebt ? 'Has Debt' : 'No Debt',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    this.toast.success('Customer list exported to CSV');
  }
}
