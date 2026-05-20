import { Component, OnInit, ViewChild } from '@angular/core';
import { CommissionService } from '../../../../shared/Services/commission/commission.service';
import {
  CommissionReportResponse,
  CommissionUserSummary,
  CommissionRecord,
  CommissionStatus,
} from '../../../../shared/interfaces/commission.interface';
import { HotToastService } from '@ngneat/hot-toast';

@Component({
  selector: 'app-commission-reports',
  templateUrl: './commission-reports.component.html',
  styleUrls: ['./commission-reports.component.scss'],
})
export class CommissionReportsComponent implements OnInit {
  organizationId!: number;
  loading = false;

  // Filters
  startDate: string = '';
  endDate: string = '';
  selectedStatus: string = '';

  // Report data
  report: CommissionReportResponse | null = null;

  // Expanded user detail
  expandedUserId: number | null = null;

  // Detail records for the expanded user
  CommissionStatus = CommissionStatus;

  // Selection tracking
  selectedCommissions: Map<number, Set<number>> = new Map(); // userId -> Set of commissionIds

  // Payment modal reference (will be added in template)
  @ViewChild('paymentModal') paymentModal: any;

  // Preset date ranges
  presets = [
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'Last Month', value: 'lastMonth' },
    { label: 'This Year', value: 'year' },
    { label: 'All Time', value: 'all' },
  ];

  constructor(
    private commissionService: CommissionService,
    private toast: HotToastService
  ) {}

  ngOnInit() {
    this.organizationId = Number(localStorage.getItem('licencedOrg') || 1);
    // Default to current month
    this.applyPreset('month');

    // Listen for payment events
    window.addEventListener('commission-paid', () => {
      this.loadReport();
      this.clearSelections();
    });
  }

  applyPreset(preset: string) {
    const now = new Date();
    switch (preset) {
      case 'today':
        this.startDate = this.formatDateInput(now);
        this.endDate = this.formatDateInput(now);
        break;
      case 'week': {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        this.startDate = this.formatDateInput(weekStart);
        this.endDate = this.formatDateInput(now);
        break;
      }
      case 'month': {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        this.startDate = this.formatDateInput(monthStart);
        this.endDate = this.formatDateInput(now);
        break;
      }
      case 'lastMonth': {
        const lastMonthStart = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          1,
        );
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        this.startDate = this.formatDateInput(lastMonthStart);
        this.endDate = this.formatDateInput(lastMonthEnd);
        break;
      }
      case 'year': {
        const yearStart = new Date(now.getFullYear(), 0, 1);
        this.startDate = this.formatDateInput(yearStart);
        this.endDate = this.formatDateInput(now);
        break;
      }
      case 'all':
        this.startDate = '';
        this.endDate = '';
        break;
    }
    this.loadReport();
  }

  loadReport() {
    this.loading = true;
    this.expandedUserId = null;

    this.commissionService
      .getCommissionReport(
        this.organizationId,
        this.startDate || undefined,
        this.endDate || undefined,
        this.selectedStatus || undefined,
      )
      .subscribe({
        next: (report) => {
          this.report = report;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading commission report:', error);
          this.loading = false;
        },
      });
  }

  toggleUserDetails(userId: number) {
    this.expandedUserId = this.expandedUserId === userId ? null : userId;
  }

  getUserRecords(user: CommissionUserSummary): CommissionRecord[] {
    return user.records || [];
  }

  getCommissionPercentOfSale(
    totalCommission: number,
    totalSaleAmount: number,
  ): string {
    if (totalSaleAmount === 0) return '0.0';
    return ((totalCommission / totalSaleAmount) * 100).toFixed(1);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount || 0);
  }

  formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatDateTime(date: string | Date): string {
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

  getDateRangeLabel(): string {
    if (!this.startDate && !this.endDate) return 'All Time';
    if (this.startDate && this.endDate) {
      return `${this.formatDate(this.startDate)} – ${this.formatDate(this.endDate)}`;
    }
    if (this.startDate) return `From ${this.formatDate(this.startDate)}`;
    return `Until ${this.formatDate(this.endDate)}`;
  }

  private formatDateInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // ============ PAYMENT FUNCTIONALITY ============

  /**
   * Toggle commission selection
   */
  toggleCommissionSelection(userId: number, commissionId: number, event: any) {
    if (!this.selectedCommissions.has(userId)) {
      this.selectedCommissions.set(userId, new Set());
    }

    const userSelections = this.selectedCommissions.get(userId)!;
    if (event.target.checked) {
      userSelections.add(commissionId);
    } else {
      userSelections.delete(commissionId);
    }
  }

  /**
   * Check if commission is selected
   */
  isCommissionSelected(userId: number, commissionId: number): boolean {
    return this.selectedCommissions.get(userId)?.has(commissionId) || false;
  }

  /**
   * Select all commissions for a user
   */
  selectAllUserCommissions(user: CommissionUserSummary, event: any) {
    if (!this.selectedCommissions.has(user.userId)) {
      this.selectedCommissions.set(user.userId, new Set());
    }

    const userSelections = this.selectedCommissions.get(user.userId)!;
    const pendingRecords = this.getUserRecords(user).filter(
      (r) => r.status === CommissionStatus.PENDING
    );

    if (event.target.checked) {
      pendingRecords.forEach((r) => userSelections.add(r.id));
    } else {
      userSelections.clear();
    }
  }

  /**
   * Check if all user commissions are selected
   */
  areAllUserCommissionsSelected(user: CommissionUserSummary): boolean {
    const pendingRecords = this.getUserRecords(user).filter(
      (r) => r.status === CommissionStatus.PENDING
    );
    if (pendingRecords.length === 0) return false;

    const userSelections = this.selectedCommissions.get(user.userId);
    if (!userSelections) return false;

    return pendingRecords.every((r) => userSelections.has(r.id));
  }

  /**
   * Get count of selected commissions for a user
   */
  getSelectedCount(userId: number): number {
    return this.selectedCommissions.get(userId)?.size || 0;
  }

  /**
   * Check if user has any selected commissions
   */
  hasSelectedCommissions(userId: number): boolean {
    return this.getSelectedCount(userId) > 0;
  }

  /**
   * Clear all selections
   */
  clearSelections() {
    this.selectedCommissions.clear();
  }

  /**
   * Pay selected commissions for a user
   */
  paySelected(user: CommissionUserSummary) {
    const selectedIds = Array.from(this.selectedCommissions.get(user.userId) || []);
    if (selectedIds.length === 0) {
      this.toast.error('Please select commissions to pay');
      return;
    }

    const selectedRecords = this.getUserRecords(user).filter((r) =>
      selectedIds.includes(r.id)
    );

    if (this.paymentModal) {
      this.paymentModal.openManualPayment({
        userId: user.userId,
        userName: user.fullName,
        commissionRecords: selectedRecords,
        commissionIds: selectedIds,
      });
    }
  }

  /**
   * Pay all unpaid commissions for a user
   */
  payAllUnpaid(user: CommissionUserSummary) {
    if (user.pendingCommission === 0) {
      this.toast.error('No unpaid commissions found');
      return;
    }

    this.commissionService
      .getUnpaidSummary(this.organizationId, user.userId)
      .subscribe({
        next: (summary) => {
          if (summary.recordCount === 0) {
            this.toast.error('No unpaid commissions found');
            return;
          }

          if (this.paymentModal) {
            this.paymentModal.openBulkPayment({
              userId: user.userId,
              userName: user.fullName,
              totalAmount: summary.totalAmount,
              recordCount: summary.recordCount,
            });
          }
        },
        error: (error) => {
          console.error('Error loading unpaid summary:', error);
          this.toast.error('Failed to load unpaid commissions');
        },
      });
  }

  /**
   * Pay commissions by current period
   */
  payByPeriod(user: CommissionUserSummary) {
    if (!this.startDate || !this.endDate) {
      this.toast.error('Please select a date range first');
      return;
    }

    if (user.pendingCommission === 0) {
      this.toast.error('No unpaid commissions found for this period');
      return;
    }

    if (this.paymentModal) {
      this.paymentModal.openPeriodPayment({
        userId: user.userId,
        userName: user.fullName,
        totalAmount: user.pendingCommission,
        recordCount: this.getUserRecords(user).filter(
          (r) => r.status === CommissionStatus.PENDING
        ).length,
        startDate: this.startDate,
        endDate: this.endDate,
      });
    }
  }
}
