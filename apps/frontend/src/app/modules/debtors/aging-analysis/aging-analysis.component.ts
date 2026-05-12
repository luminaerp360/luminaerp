import { Component, OnInit } from '@angular/core';
import { DebtorsService } from '../../../shared/Services/debtors.service';
import {
  AgingAnalysisResponse,
  AgingCustomer,
} from '../../../types/debtors.types';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HotToastService } from '@ngneat/hot-toast';

@Component({
  selector: 'app-aging-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './aging-analysis.component.html',
  styleUrls: ['./aging-analysis.component.scss'],
})
export class AgingAnalysisComponent implements OnInit {
  loading = false;
  agingData: AgingAnalysisResponse | null = null;
  searchTerm = '';
  filteredCustomers: AgingCustomer[] = [];

  constructor(
    private debtorsService: DebtorsService,
    public router: Router,
    private toast: HotToastService,
  ) {}

  ngOnInit(): void {
    this.loadAgingAnalysis();
  }

  loadAgingAnalysis(): void {
    this.loading = true;
    this.debtorsService
      .getAgingAnalysis()
      .pipe(
        this.toast.observe({
          loading: 'Loading aging analysis...',
          success: 'Aging analysis loaded successfully',
          error: 'Failed to load aging analysis',
        }),
      )
      .subscribe({
        next: (data) => {
          this.agingData = data;
          this.filteredCustomers = data.customers;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading aging analysis:', error);
          this.loading = false;
        },
      });
  }

  onSearch(): void {
    if (!this.agingData) return;

    const search = this.searchTerm.toLowerCase().trim();
    if (!search) {
      this.filteredCustomers = this.agingData.customers;
      return;
    }

    this.filteredCustomers = this.agingData.customers.filter(
      (customer) =>
        customer.customerName.toLowerCase().includes(search) ||
        customer.customerPhone?.toLowerCase().includes(search) ||
        customer.customerEmail?.toLowerCase().includes(search),
    );
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.onSearch();
  }

  viewCustomerStatement(customerId: number): void {
    this.router.navigate(['/debtors/customer-statement', customerId]);
  }

  viewOutstandingInvoices(customerId: number): void {
    this.router.navigate(['/debtors/outstanding-invoices', customerId]);
  }

  viewCustomerWallet(customerId: number): void {
    this.router.navigate(['/debtors/customer-wallet', customerId]);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  }

  getAgingPercentage(amount: number): number {
    if (!this.agingData) return 0;
    return this.agingData.totals.totalOutstanding > 0
      ? (amount / this.agingData.totals.totalOutstanding) * 100
      : 0;
  }

  exportToCSV(): void {
    if (!this.agingData) return;

    const headers = [
      'Customer Name',
      'Phone',
      'Email',
      'Current (0-30)',
      '31-60 Days',
      '61-90 Days',
      '91-120 Days',
      'Over 120 Days',
      'Total Outstanding',
    ];

    const rows = this.filteredCustomers.map((customer) => [
      customer.customerName,
      customer.customerPhone || '',
      customer.customerEmail || '',
      customer.current.toFixed(2),
      customer.days31_60.toFixed(2),
      customer.days61_90.toFixed(2),
      customer.days91_120.toFixed(2),
      customer.over120.toFixed(2),
      customer.totalOutstanding.toFixed(2),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `aging-analysis-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);

    this.toast.success('Aging analysis exported successfully');
  }

  printReport(): void {
    window.print();
  }
}
