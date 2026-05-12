import { Component, OnInit } from '@angular/core';
import { ModernReportsService } from '../../service/modern-reports.service';

@Component({
  selector: 'app-report-user-performance',
  templateUrl: './report-user-performance.component.html',
  styleUrls: ['./report-user-performance.component.scss'],
})
export class ReportUserPerformanceComponent implements OnInit {
  data: any = null;
  loading = false;
  errorMessage = '';
  startDate = '';
  endDate = '';
  currentDateRange = 'month';

  revenueChartOptions: any = {};

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
        start = new Date(now);
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        break;
    }

    this.startDate = start.toISOString().split('T')[0];
    this.endDate = end.toISOString().split('T')[0];
    this.fetchReport();
  }

  fetchReport(): void {
    this.loading = true;
    this.errorMessage = '';
    this.reportsService
      .getUserPerformanceReport(this.startDate, this.endDate)
      .subscribe({
        next: (res: any) => {
          this.data = res;
          this.buildChart();
          this.loading = false;
        },
        error: (err: any) => {
          this.errorMessage =
            err?.error?.message || 'Failed to load user performance report';
          this.loading = false;
        },
      });
  }

  buildChart(): void {
    if (!this.data?.users?.length) return;
    const topUsers = this.data.users.slice(0, 10);
    this.revenueChartOptions = {
      series: [
        {
          name: 'Revenue',
          data: topUsers.map((u: any) => u.totalRevenue || 0),
        },
      ],
      chart: {
        type: 'bar',
        height: 320,
        toolbar: { show: false },
        background: 'transparent',
      },
      plotOptions: { bar: { borderRadius: 6, horizontal: true } },
      xaxis: {
        categories: topUsers.map((u: any) => u.fullName || 'N/A'),
        labels: {
          style: { colors: '#94a3b8' },
          formatter: (v: number) => this.formatCurrencyShort(v),
        },
      },
      yaxis: { labels: { style: { colors: '#94a3b8' } } },
      colors: ['#8b5cf6'],
      dataLabels: { enabled: false },
      tooltip: { y: { formatter: (v: number) => this.formatCurrency(v) } },
      theme: { mode: 'dark' },
      grid: { borderColor: '#334155' },
    };
  }

  formatCurrency(value: number): string {
    if (value == null) return 'KSH 0';
    return (
      'KSH ' +
      value.toLocaleString('en-KE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  formatCurrencyShort(value: number): string {
    if (value == null) return 'KSH 0';
    if (value >= 1000000) return 'KSH ' + (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return 'KSH ' + (value / 1000).toFixed(1) + 'K';
    return 'KSH ' + value.toFixed(0);
  }

  getRankClass(index: number): string {
    switch (index) {
      case 0:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 1:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 2:
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      default:
        return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400';
    }
  }
}
