import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DebtorsService } from '../../../shared/Services/debtors.service';
import { CustomerStatementResponse } from '../../../types/debtors.types';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HotToastService } from '@ngneat/hot-toast';

@Component({
  selector: 'app-customer-statement',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customer-statement.component.html',
  styleUrls: ['./customer-statement.component.scss'],
})
export class CustomerStatementComponent implements OnInit {
  loading = false;
  customerId!: number;
  statement: CustomerStatementResponse | null = null;
  startDate = '';
  endDate = '';
  format: 'summary' | 'detailed' = 'detailed';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private debtorsService: DebtorsService,
    private toast: HotToastService,
  ) {}

  ngOnInit(): void {
    this.customerId = Number(this.route.snapshot.paramMap.get('customerId'));

    const today = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(today.getMonth() - 3);

    this.endDate = today.toISOString().split('T')[0];
    this.startDate = threeMonthsAgo.toISOString().split('T')[0];

    this.loadStatement();
  }

  loadStatement(): void {
    this.loading = true;
    this.debtorsService
      .getCustomerStatement({
        customerId: this.customerId,
        startDate: this.startDate,
        endDate: this.endDate,
        format: this.format,
      })
      .pipe(
        this.toast.observe({
          loading: 'Loading customer statement...',
          success: 'Statement loaded successfully',
          error: 'Failed to load statement',
        }),
      )
      .subscribe({
        next: (data) => {
          this.statement = data;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading customer statement:', error);
          this.loading = false;
        },
      });
  }

  applyFilters(): void {
    this.loadStatement();
  }

  viewOutstandingInvoices(): void {
    this.router.navigate(['/debtors/outstanding-invoices', this.customerId]);
  }

  viewAgingAnalysis(): void {
    this.router.navigate(['/debtors']);
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

  getStatusBadgeClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'PARTIALLY_PAID':
        return 'bg-yellow-100 text-yellow-800';
      case 'PENDING':
      case 'SENT':
      case 'VIEWED':
        return 'bg-blue-100 text-blue-800';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusLabel(status: string): string {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  printStatement(): void {
    window.print();
  }

  exportToCSV(): void {
    if (!this.statement) return;

    const headers = [
      'Invoice Number',
      'Issue Date',
      'Due Date',
      'Total Amount',
      'Amount Paid',
      'Balance Due',
      'Status',
    ];

    const rows = this.statement.invoices.map((invoice) => [
      invoice.invoiceNumber,
      this.formatDate(invoice.issueDate),
      this.formatDate(invoice.dueDate),
      invoice.totalAmount.toFixed(2),
      invoice.amountPaid.toFixed(2),
      invoice.balanceDue.toFixed(2),
      invoice.status,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `statement-${this.statement.customer.fullName}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);

    this.toast.success('Statement exported successfully');
  }
}
