import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AccountsReceivableService } from '../../../../shared/Services/accounts-receivable.service';
import { CustomerService } from '../../../../shared/Services/customer.service';
// Import receivable form components
import { ReceivableFormComponent } from '../receivable-form';
import { ReceivablePaymentFormComponent } from '../receivable-payment-form';
import {
  AppearanceAnimation,
  DialogRemoteControl,
  DisappearanceAnimation,
} from '@ng-vibe/dialog';
import { Receivable, ReceivablesResponse, ReceivableStatus } from '../../../../shared/interfaces/receivable.interface';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-receivables-list',
  templateUrl: './receivables-list.component.html',
  styleUrls: ['./receivables-list.component.scss'],
})
export class ReceivablesListComponent implements OnInit {
  private dialog: DialogRemoteControl = new DialogRemoteControl(ReceivableFormComponent);
  private updateDialog: DialogRemoteControl = new DialogRemoteControl(ReceivableFormComponent);
  private paymentDialog: DialogRemoteControl = new DialogRemoteControl(ReceivablePaymentFormComponent);

  receivables: Receivable[] = [];
  filteredReceivables: Receivable[] = [];
  loading = false;
  error: string | null = null;
  filterForm: FormGroup = new FormGroup({});
  hasInitialized: boolean = false;

  // Summary metrics
  summary = {
    totalReceivables: 0,
    totalAmount: 0,
    totalPaid: 0,
    totalBalance: 0,
    draftCount: 0,
    approvedCount: 0,
    paidCount: 0,
    partiallyPaidCount: 0,
    overdueCount: 0,
  };

  // Filter properties
  selectedStatus: ReceivableStatus | '' = '';
  selectedCustomerId: number | null = null;
  searchQuery: string = '';

  receivableStatuses: string[] = Object.values(ReceivableStatus);
  customers: { id: number; name: string }[] = [];
  customersLoading = false;

  // Confirmation dialog properties
  showDeleteConfirm = false;
  receivableToDelete: Receivable | null = null;
  showApproveConfirm = false;
  receivableToApprove: Receivable | null = null;
  isDeleting = false;
  isApproving = false;

  constructor(
    private accountsReceivableService: AccountsReceivableService,
    private customerService: CustomerService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.initializeFilterForm();
  }

  private initializeFilterForm() {
    this.filterForm = this.fb.group({
      startDate: [''],
      endDate: [''],
      dueStartDate: [''],
      dueEndDate: [''],
      customerId: [''],
      status: [''],
    });

    this.filterForm.valueChanges.subscribe(() => {
      if (this.filterForm.dirty) {
        this.applyFilters();
      }
    });
  }

  ngOnInit(): void {
    this.loadReceivables();
    this.loadCustomers();
  }

  loadReceivables() {
    this.loading = true;
    this.error = null;

    this.accountsReceivableService.getAllReceivables().pipe(
      finalize(() => (this.loading = false))
    ).subscribe({
      next: (response: ReceivablesResponse) => {
        this.receivables = response.receivables;
        this.summary = {
          totalReceivables: response.summary.totalReceivables,
          totalAmount: response.summary.totalAmount,
          totalPaid: response.summary.totalReceived,
          totalBalance: response.summary.totalBalance,
          draftCount: response.summary.draftCount,
          approvedCount: response.summary.approvedCount,
          paidCount: response.summary.paidCount,
          partiallyPaidCount: response.summary.partiallyPaidCount,
          overdueCount: response.summary.overdueCount,
        };
        this.applyFilters();
        this.hasInitialized = true;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        this.error = 'Failed to load receivables. Please try again later.';
        console.error('Error loading receivables:', error);
        this.cdr.detectChanges();
      },
    });
  }

  private loadCustomers() {
    this.customersLoading = true;
    this.customerService.getAllCustomers().subscribe({
      next: (customers: any[]) => {
        this.customers = customers.map(customer => ({
          id: customer.id,
          name: customer.fullName || customer.name || 'Unknown Customer'
        })).filter(customer => customer.name).sort((a, b) => a.name.localeCompare(b.name));
        this.customersLoading = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error loading customers:', error);
        // Fallback: extract from receivables if customer service fails
        if (this.receivables.length > 0) {
          this.customers = [...new Set(this.receivables.map(receivable => receivable.customer))]
            .map(customer => ({ id: customer.id, name: customer.name || 'Unknown Customer' }))
            .filter(customer => customer.name)
            .sort((a, b) => a.name.localeCompare(b.name));
        }
        this.customersLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private calculateSummary() {
    this.summary = {
      totalReceivables: this.receivables.length,
      totalAmount: this.receivables.reduce((sum, r) => sum + r.netAmount, 0),
      totalPaid: this.receivables.reduce((sum, r) => sum + r.paidAmount, 0),
      totalBalance: this.receivables.reduce((sum, r) => sum + r.balanceAmount, 0),
      draftCount: this.receivables.filter(r => r.status === ReceivableStatus.DRAFT).length,
      approvedCount: this.receivables.filter(r => r.status === ReceivableStatus.APPROVED).length,
      paidCount: this.receivables.filter(r => r.status === ReceivableStatus.PAID).length,
      partiallyPaidCount: this.receivables.filter(r => r.status === ReceivableStatus.PARTIALLY_PAID).length,
      overdueCount: this.receivables.filter(r => this.isOverdue(r)).length,
    };
  }

  applyFilters() {
    let filtered = [...this.receivables];

    // Status filter
    if (this.selectedStatus) {
      filtered = filtered.filter(receivable => receivable.status === this.selectedStatus);
    }

    // Customer filter
    if (this.selectedCustomerId) {
      filtered = filtered.filter(receivable => receivable.customerId === this.selectedCustomerId);
    }

    // Search query filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(receivable =>
        receivable.receivableNumber.toLowerCase().includes(query) ||
        receivable.customer.name.toLowerCase().includes(query) ||
        (receivable.description && receivable.description.toLowerCase().includes(query))
      );
    }

    // Date filters
    const formValue = this.filterForm.value;
    if (formValue.startDate) {
      const startDate = new Date(formValue.startDate);
      filtered = filtered.filter(receivable => new Date(receivable.receivableDate) >= startDate);
    }
    if (formValue.endDate) {
      const endDate = new Date(formValue.endDate);
      filtered = filtered.filter(receivable => new Date(receivable.receivableDate) <= endDate);
    }
    if (formValue.dueStartDate) {
      const dueStartDate = new Date(formValue.dueStartDate);
      filtered = filtered.filter(receivable => new Date(receivable.dueDate) >= dueStartDate);
    }
    if (formValue.dueEndDate) {
      const dueEndDate = new Date(formValue.dueEndDate);
      filtered = filtered.filter(receivable => new Date(receivable.dueDate) <= dueEndDate);
    }

    this.filteredReceivables = filtered;
  }

  openReceivableForm(receivable?: Receivable) {
    if (receivable) {
      this.updateDialog.openDialog(receivable).subscribe((result: any) => {
        if (result) {
          this.loadReceivables();
        }
      });
    } else {
      this.dialog.openDialog().subscribe((result: any) => {
        if (result) {
          this.loadReceivables();
        }
      });
    }
  }

  openPaymentForm(receivable: Receivable) {
    this.paymentDialog.openDialog(receivable).subscribe((result: any) => {
      if (result) {
        this.loadReceivables();
      }
    });
  }

  confirmApproveReceivable(receivable: Receivable) {
    this.receivableToApprove = receivable;
    this.showApproveConfirm = true;
  }

  approveReceivable() {
    if (!this.receivableToApprove) return;

    this.isApproving = true;
    this.accountsReceivableService.approveReceivable(this.receivableToApprove.id, 1).pipe(
      finalize(() => {
        this.isApproving = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: () => {
        this.loadReceivables();
        this.showApproveConfirm = false;
        this.receivableToApprove = null;
        // TODO: Show success toast
      },
      error: (error: any) => {
        console.error('Error approving receivable:', error);
        // TODO: Show error toast
      },
    });
  }

  cancelApprove() {
    this.showApproveConfirm = false;
    this.receivableToApprove = null;
  }

  confirmDeleteReceivable(receivable: Receivable) {
    this.receivableToDelete = receivable;
    this.showDeleteConfirm = true;
  }

  deleteReceivable() {
    if (!this.receivableToDelete) return;

    this.isDeleting = true;
    this.accountsReceivableService.deleteReceivable(this.receivableToDelete.id).pipe(
      finalize(() => {
        this.isDeleting = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: () => {
        this.loadReceivables();
        this.showDeleteConfirm = false;
        this.receivableToDelete = null;
        // TODO: Show success toast
      },
      error: (error: any) => {
        console.error('Error deleting receivable:', error);
        // TODO: Show error toast
      },
    });
  }

  cancelDelete() {
    this.showDeleteConfirm = false;
    this.receivableToDelete = null;
  }

  getStatusBadgeClass(status: ReceivableStatus): string {
    switch (status) {
      case ReceivableStatus.DRAFT:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
      case ReceivableStatus.APPROVED:
        return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-400';
      case ReceivableStatus.PAID:
        return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-400';
      case ReceivableStatus.PARTIALLY_PAID:
        return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-400';
      case ReceivableStatus.OVERDUE:
        return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-400';
      case ReceivableStatus.CANCELLED:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  }

  isOverdue(receivable: Receivable): boolean {
    return new Date(receivable.dueDate) < new Date() && receivable.balanceAmount > 0;
  }

  getDaysOverdue(receivable: Receivable): number {
    const today = new Date();
    const dueDate = new Date(receivable.dueDate);
    const diffTime = today.getTime() - dueDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  }

  onSearchChange(value: string) {
    this.searchQuery = value;
    this.applyFilters();
  }

  onStatusFilterChange(value: string) {
    this.selectedStatus = value as ReceivableStatus | '';
    this.applyFilters();
  }

  onCustomerFilterChange(value: string) {
    this.selectedCustomerId = value ? parseInt(value, 10) : null;
    this.applyFilters();
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-KE');
  }

  getRowClasses(receivable: Receivable): string {
    let classes = 'hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150';
    if (this.isOverdue(receivable)) {
      classes += ' bg-red-50 dark:bg-red-900/20';
    }
    return classes;
  }
}