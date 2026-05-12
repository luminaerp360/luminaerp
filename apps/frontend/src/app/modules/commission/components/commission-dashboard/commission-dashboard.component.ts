import { Component, OnInit } from '@angular/core';
import { CommissionService } from '../../../../shared/Services/commission/commission.service';
import { AuthService } from '../../../../shared/Services/auth.service';
import {
  CommissionRecord,
  CommissionSummary,
  CommissionStats,
  CommissionStatus,
} from '../../../../shared/interfaces/commission.interface';

@Component({
  selector: 'app-commission-dashboard',
  templateUrl: './commission-dashboard.component.html',
  styleUrls: ['./commission-dashboard.component.scss'],
})
export class CommissionDashboardComponent implements OnInit {
  organizationId!: number;
  stats: CommissionStats = {
    totalCommissionsEarned: 0,
    pendingCommissions: 0,
    paidCommissions: 0,
    totalRecords: 0,
  };
  recentRecords: CommissionRecord[] = [];
  loading = true;
  error = '';

  // Date filters
  startDate: Date | null = null;
  endDate: Date | null = null;

  constructor(
    private commissionService: CommissionService,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    this.organizationId = Number(localStorage.getItem('licencedOrg') || 1);
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.loading = true;
    this.error = '';

    // Load organization statistics
    this.commissionService.getOrganizationStats(this.organizationId).subscribe({
      next: (stats) => {
        this.stats = stats;
      },
      error: (error) => {
        console.error('Error loading commission stats:', error);
        this.error = 'Failed to load commission statistics';
      },
    });

    // Load recent commission records (last 10)
    // We'll use the current user's ID for now
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user?.id;
    if (userId) {
      this.commissionService
        .getUserRecords(userId, this.organizationId, CommissionStatus.PENDING)
        .subscribe({
          next: (records) => {
            this.recentRecords = records.slice(0, 10);
            this.loading = false;
          },
          error: (error) => {
            console.error('Error loading recent records:', error);
            this.loading = false;
          },
        });
    } else {
      this.loading = false;
    }
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
}
