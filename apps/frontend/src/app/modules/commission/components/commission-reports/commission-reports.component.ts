import { Component, OnInit } from '@angular/core';
import { CommissionService } from '../../../../shared/Services/commission/commission.service';
import {
  CommissionReportResponse,
  CommissionUserSummary,
  CommissionRecord,
  CommissionStatus,
} from '../../../../shared/interfaces/commission.interface';

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

  // Preset date ranges
  presets = [
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'Last Month', value: 'lastMonth' },
    { label: 'This Year', value: 'year' },
    { label: 'All Time', value: 'all' },
  ];

  constructor(private commissionService: CommissionService) {}

  ngOnInit() {
    this.organizationId = Number(localStorage.getItem('licencedOrg') || 1);
    // Default to current month
    this.applyPreset('month');
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
}
