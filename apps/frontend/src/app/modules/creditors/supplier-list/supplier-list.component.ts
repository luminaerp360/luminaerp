import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CreditorsService } from '../../../shared/Services/creditors.service';
import { Supplier } from '../../../types/creditors.types';

@Component({
  selector: 'app-supplier-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './supplier-list.component.html',
  styleUrls: ['./supplier-list.component.scss'],
})
export class SupplierListComponent implements OnInit {
  suppliers: Supplier[] = [];
  filteredSuppliers: Supplier[] = [];
  loading = false;
  searchQuery = '';
  showOnlyWithDebt = false;

  // Summary stats
  totalSuppliers = 0;
  totalOutstanding = 0;
  suppliersWithDebt = 0;

  constructor(
    private creditorsService: CreditorsService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.loadSuppliers();
  }

  loadSuppliers() {
    this.loading = true;
    this.creditorsService
      .getAllSuppliers({
        searchQuery: this.searchQuery,
        showOnlyWithDebt: this.showOnlyWithDebt,
      })
      .subscribe({
        next: (suppliers) => {
          this.suppliers = suppliers;
          this.filteredSuppliers = suppliers;
          this.calculateSummary();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading suppliers:', error);
          this.loading = false;
        },
      });
  }

  onSearchChange() {
    this.loadSuppliers();
  }

  toggleDebtFilter() {
    this.showOnlyWithDebt = !this.showOnlyWithDebt;
    this.loadSuppliers();
  }

  calculateSummary() {
    this.totalSuppliers = this.suppliers.length;
    this.totalOutstanding = this.suppliers.reduce(
      (sum, s) => sum + (s.outstandingBalance || 0),
      0,
    );
    this.suppliersWithDebt = this.suppliers.filter(
      (s) => (s.outstandingBalance || 0) > 0,
    ).length;
  }

  viewStatement(supplier: Supplier) {
    this.router.navigate(['/creditors/supplier-statement', supplier.id]);
  }

  viewOutstandingBills(supplier: Supplier) {
    this.router.navigate(['/creditors/outstanding-bills', supplier.id]);
  }

  exportToCSV() {
    const csvData = this.suppliers.map((s) => ({
      'Supplier Name': s.name,
      Phone: s.phone,
      Email: s.email || '',
      'Total Bills': s.totalBills || 0,
      'Total Amount': s.totalAmount || 0,
      'Total Paid': s.totalPaid || 0,
      'Outstanding Balance': s.outstandingBalance || 0,
      'Unpaid Bills': s.unpaidBillsCount || 0,
    }));

    const csv = this.convertToCSV(csvData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `suppliers_${new Date().toISOString().split('T')[0]}.csv`;
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

  getStatusBadgeClass(supplier: Supplier): string {
    const balance = supplier.outstandingBalance || 0;
    if (balance === 0) return 'badge-success';
    if (balance > 0) return 'badge-warning';
    return 'badge-secondary';
  }

  getStatusText(supplier: Supplier): string {
    const balance = supplier.outstandingBalance || 0;
    if (balance === 0) return 'Clear';
    if (balance > 0) return 'Has Debt';
    return 'Unknown';
  }
}
