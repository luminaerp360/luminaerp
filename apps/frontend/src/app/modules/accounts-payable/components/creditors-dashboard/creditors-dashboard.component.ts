import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountsPayableService } from '../../../../shared/Services/accounts-payable.service';
import { format } from 'date-fns';
import { finalize } from 'rxjs/operators';
import { DialogRemoteControl } from '@ng-vibe/dialog';
import { SupplierStatementComponent } from '../supplier-statement/supplier-statement.component';

interface SupplierSummary {
  supplier: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
  };
  totalBills: number;
  totalAmount: number;
  totalPaid: number;
  outstandingBalance: number;
  unpaidBillsCount: number;
  overdueCount: number;
}

@Component({
  selector: 'app-creditors-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './creditors-dashboard.component.html',
  styleUrls: ['./creditors-dashboard.component.scss'],
})
export class CreditorsDashboardComponent implements OnInit {
  private statementDialog: DialogRemoteControl = new DialogRemoteControl(
    SupplierStatementComponent,
  );

  supplierSummaries: SupplierSummary[] = [];
  filteredSummaries: SupplierSummary[] = [];
  loading = false;
  error: string | null = null;

  // Filters
  searchQuery: string = '';
  startDate: string = '';
  endDate: string = '';
  showOnlyOverdue: boolean = false;

  // Summary totals
  totalOutstanding: number = 0;
  totalSuppliers: number = 0;
  suppliersWithOverdue: number = 0;
  totalOverdueBills: number = 0;

  constructor(
    private accountsPayableService: AccountsPayableService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.setDefaultDateRange();
    this.loadSupplierSummaries();
  }

  setDefaultDateRange(): void {
    const today = new Date();
    // Set to 3 months ago
    const startDate = new Date(today);
    startDate.setMonth(today.getMonth() - 3);

    this.startDate = format(startDate, 'yyyy-MM-dd');
    this.endDate = format(today, 'yyyy-MM-dd');
  }

  loadSupplierSummaries(): void {
    this.loading = true;
    this.error = null;

    this.accountsPayableService
      .getSupplierSummaries(this.startDate, this.endDate)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (summaries: SupplierSummary[]) => {
          this.supplierSummaries = summaries;
          this.calculateTotals();
          this.applyFilters();
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          console.error('Error loading supplier summaries:', error);
          this.error = 'Failed to load creditors data. Please try again.';
          this.cdr.detectChanges();
        },
      });
  }

  calculateTotals(): void {
    this.totalOutstanding = this.supplierSummaries.reduce(
      (sum, s) => sum + s.outstandingBalance,
      0,
    );
    this.totalSuppliers = this.supplierSummaries.length;
    this.suppliersWithOverdue = this.supplierSummaries.filter(
      (s) => s.overdueCount > 0,
    ).length;
    this.totalOverdueBills = this.supplierSummaries.reduce(
      (sum, s) => sum + s.overdueCount,
      0,
    );
  }

  applyFilters(): void {
    let filtered = [...this.supplierSummaries];

    // Search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (summary) =>
          summary.supplier.name.toLowerCase().includes(query) ||
          summary.supplier.email?.toLowerCase().includes(query) ||
          summary.supplier.phone?.toLowerCase().includes(query),
      );
    }

    // Show only overdue filter
    if (this.showOnlyOverdue) {
      filtered = filtered.filter((summary) => summary.overdueCount > 0);
    }

    this.filteredSummaries = filtered;
  }

  onSearchChange(value: string): void {
    this.searchQuery = value;
    this.applyFilters();
  }

  toggleOverdueFilter(): void {
    this.showOnlyOverdue = !this.showOnlyOverdue;
    this.applyFilters();
  }

  onDateRangeChange(): void {
    if (this.startDate && this.endDate) {
      this.loadSupplierSummaries();
    }
  }

  openSupplierStatement(supplier: SupplierSummary): void {
    this.statementDialog
      .openDialog({
        supplierId: supplier.supplier.id,
        supplierName: supplier.supplier.name,
        startDate: this.startDate,
        endDate: this.endDate,
      })
      .subscribe((result: any) => {
        if (result) {
          // Reload summaries after payment
          this.loadSupplierSummaries();
        }
      });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  }

  formatDate(date: string): string {
    return format(new Date(date), 'dd MMM yyyy');
  }

  getSupplierInitials(name: string): string {
    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  getStatusColor(summary: SupplierSummary): string {
    if (summary.overdueCount > 0) {
      return 'bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    } else if (summary.outstandingBalance > 0) {
      return 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
    }
    return 'bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800';
  }

  getStatusBadgeClass(summary: SupplierSummary): string {
    if (summary.overdueCount > 0) {
      return 'bg-red-500 text-white';
    } else if (summary.outstandingBalance > 0) {
      return 'bg-yellow-500 text-white';
    }
    return 'bg-green-500 text-white';
  }

  getStatusText(summary: SupplierSummary): string {
    if (summary.overdueCount > 0) {
      return `${summary.overdueCount} Overdue`;
    } else if (summary.outstandingBalance > 0) {
      return 'Outstanding';
    }
    return 'Paid';
  }
}
