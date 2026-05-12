import { Component, OnInit } from '@angular/core';
import { CommissionService } from '../../../../shared/Services/commission/commission.service';
import { AuthService } from '../../../../shared/Services/auth.service';
import {
  CommissionRecord,
  CommissionStatus,
  MarkCommissionPaidDto,
} from '../../../../shared/interfaces/commission.interface';
import { UserInterface } from '../../../../shared/interfaces/auth.interface';

@Component({
  selector: 'app-commission-records',
  templateUrl: './commission-records.component.html',
  styleUrls: ['./commission-records.component.scss'],
})
export class CommissionRecordsComponent implements OnInit {
  organizationId!: number;
  users: UserInterface[] = [];
  records: CommissionRecord[] = [];
  filteredRecords: CommissionRecord[] = [];
  selectedRecords: number[] = [];

  selectedUserId: number | null = null;
  selectedStatus: string = '';
  startDate: string = '';
  endDate: string = '';

  loading = false;
  markingAsPaid = false;
  showPaymentDialog = false;

  paymentMethod = 'CASH';
  paymentReference = '';
  paymentNotes = '';

  CommissionStatus = CommissionStatus;

  constructor(
    private commissionService: CommissionService,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    this.organizationId = Number(localStorage.getItem('licencedOrg') || 1);
    this.loadUsers();

    // Load current user's records by default
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const currentUserId = user?.id;
    if (currentUserId) {
      this.selectedUserId = currentUserId;
      this.loadRecords();
    }
  }

  loadUsers() {
    this.authService.getAllUsers().subscribe({
      next: (users: UserInterface[]) => {
        this.users = users;
      },
      error: (error: any) => {
        console.error('Error loading users:', error);
      },
    });
  }

  loadRecords() {
    if (!this.selectedUserId) return;

    this.loading = true;
    this.commissionService
      .getUserRecords(
        this.selectedUserId,
        this.organizationId,
        this.selectedStatus,
      )
      .subscribe({
        next: (records) => {
          this.records = records;
          this.applyFilters();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading records:', error);
          this.loading = false;
        },
      });
  }

  applyFilters() {
    let filtered = [...this.records];

    // Apply date filters
    if (this.startDate) {
      const start = new Date(this.startDate);
      filtered = filtered.filter((r) => new Date(r.createdAt) >= start);
    }

    if (this.endDate) {
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((r) => new Date(r.createdAt) <= end);
    }

    this.filteredRecords = filtered;
  }

  toggleRecordSelection(recordId: number) {
    const index = this.selectedRecords.indexOf(recordId);
    if (index > -1) {
      this.selectedRecords.splice(index, 1);
    } else {
      this.selectedRecords.push(recordId);
    }
  }

  toggleSelectAll() {
    if (this.selectedRecords.length === this.getPendingRecords().length) {
      this.selectedRecords = [];
    } else {
      this.selectedRecords = this.getPendingRecords().map((r) => r.id);
    }
  }

  getPendingRecords(): CommissionRecord[] {
    return this.filteredRecords.filter(
      (r) => r.status === CommissionStatus.PENDING,
    );
  }

  getSelectedTotal(): number {
    return this.filteredRecords
      .filter((r) => this.selectedRecords.includes(r.id))
      .reduce((sum, r) => sum + r.commissionAmount, 0);
  }

  openPaymentDialog() {
    if (this.selectedRecords.length === 0) {
      alert('Please select at least one commission to mark as paid');
      return;
    }
    this.showPaymentDialog = true;
    this.paymentMethod = 'CASH';
    this.paymentReference = '';
    this.paymentNotes = '';
  }

  closePaymentDialog() {
    this.showPaymentDialog = false;
  }

  markAsPaid() {
    if (this.selectedRecords.length === 0) return;

    this.markingAsPaid = true;
    const dto: MarkCommissionPaidDto = {
      commissionIds: this.selectedRecords,
      paymentMethod: this.paymentMethod,
      paymentReference: this.paymentReference || undefined,
      notes: this.paymentNotes || undefined,
    };

    this.commissionService
      .markCommissionsAsPaid(dto, this.organizationId)
      .subscribe({
        next: () => {
          this.markingAsPaid = false;
          this.showPaymentDialog = false;
          this.selectedRecords = [];
          this.loadRecords();
          alert('Commissions marked as paid successfully!');
        },
        error: (error) => {
          console.error('Error marking commissions as paid:', error);
          this.markingAsPaid = false;
          alert('Failed to mark commissions as paid');
        },
      });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  }

  formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case CommissionStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case CommissionStatus.PAID:
        return 'bg-green-100 text-green-800';
      case CommissionStatus.CANCELLED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getTotalCommissions(): number {
    return this.filteredRecords.reduce((sum, r) => sum + r.commissionAmount, 0);
  }
}
