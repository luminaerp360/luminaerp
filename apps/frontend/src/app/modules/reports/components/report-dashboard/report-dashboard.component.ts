import { Component, OnInit } from '@angular/core';
import { ModernReportsService } from '../../service/modern-reports.service';

@Component({
  selector: 'app-report-dashboard',
  templateUrl: './report-dashboard.component.html',
  styleUrls: ['./report-dashboard.component.scss'],
})
export class ReportDashboardComponent implements OnInit {
  loading = false;
  errorMessage = '';
  data: any = null;

  startDate = '';
  endDate = '';
  currentDateRange = 'month';

  constructor(private reportsService: ModernReportsService) {}

  ngOnInit(): void {
    this.setDateRange('month');
  }

  setDateRange(range: string): void {
    this.currentDateRange = range;
    const now = new Date();
    const end = new Date(now);
    let start = new Date(now);

    switch (range) {
      case 'today':
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(start.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
    }

    this.startDate = start.toISOString().split('T')[0];
    this.endDate = end.toISOString().split('T')[0];
    this.fetchReport();
  }

  fetchReport(): void {
    if (!this.startDate || !this.endDate) return;
    this.loading = true;
    this.errorMessage = '';

    this.reportsService
      .getDashboardOverview(this.startDate, this.endDate)
      .subscribe({
        next: (res) => {
          this.data = res;
          this.loading = false;
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message || 'Failed to load dashboard report';
          this.loading = false;
        },
      });
  }

  formatCurrency(value: number): string {
    return (
      'KSH ' +
      (value || 0).toLocaleString('en-KE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  formatPercent(value: number): string {
    return (value || 0).toFixed(1) + '%';
  }
}
