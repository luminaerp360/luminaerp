import { Component, OnInit } from '@angular/core';
import { ModernReportsService } from '../../service/modern-reports.service';

@Component({
  selector: 'app-report-profit-loss',
  templateUrl: './report-profit-loss.component.html',
  styleUrls: ['./report-profit-loss.component.scss'],
})
export class ReportProfitLossComponent implements OnInit {
  loading = false;
  errorMessage = '';
  data: any = null;
  startDate = '';
  endDate = '';
  currentDateRange = 'month';

  expenseChartOptions: any = {};

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
      .getProfitLossReport(this.startDate, this.endDate)
      .subscribe({
        next: (res) => {
          this.data = res;
          this.loading = false;
          this.buildCharts();
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message || 'Failed to load P&L report';
          this.loading = false;
        },
      });
  }

  buildCharts(): void {
    if (!this.data) return;
    const cats = this.data.expenses?.byCategory || [];
    if (cats.length) {
      this.expenseChartOptions = {
        series: cats.map((c: any) => c.amount),
        chart: { type: 'donut', height: 300 },
        labels: cats.map((c: any) => c.category),
        colors: [
          '#ef4444',
          '#f59e0b',
          '#8b5cf6',
          '#3b82f6',
          '#10b981',
          '#ec4899',
          '#14b8a6',
          '#6b7280',
        ],
        legend: { position: 'bottom' },
        dataLabels: {
          enabled: true,
          formatter: (val: number) => val.toFixed(1) + '%',
        },
      };
    }
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
