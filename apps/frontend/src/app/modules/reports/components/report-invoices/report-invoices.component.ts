import { Component, OnInit } from '@angular/core';
import { ModernReportsService } from '../../service/modern-reports.service';

@Component({
  selector: 'app-report-invoices',
  templateUrl: './report-invoices.component.html',
  styleUrls: ['./report-invoices.component.scss'],
})
export class ReportInvoicesComponent implements OnInit {
  loading = false;
  errorMessage = '';
  data: any = null;
  startDate = '';
  endDate = '';
  currentDateRange = 'month';

  statusChartOptions: any = {};
  agingChartOptions: any = {};

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
      .getInvoiceReport(this.startDate, this.endDate)
      .subscribe({
        next: (res) => {
          this.data = res;
          this.loading = false;
          this.buildCharts();
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message || 'Failed to load invoice report';
          this.loading = false;
        },
      });
  }

  buildCharts(): void {
    if (!this.data) return;

    // Status breakdown chart
    const statuses = this.data.statusBreakdown || {};
    const statusLabels = Object.keys(statuses);
    const statusValues = statusLabels.map((s) => statuses[s].count);
    this.statusChartOptions = {
      series: statusValues,
      chart: { type: 'donut', height: 300 },
      labels: statusLabels.map((s) => s.replace(/_/g, ' ')),
      colors: [
        '#10b981',
        '#3b82f6',
        '#f59e0b',
        '#ef4444',
        '#8b5cf6',
        '#ec4899',
        '#6b7280',
        '#14b8a6',
        '#f97316',
      ],
      legend: { position: 'bottom' },
      dataLabels: { enabled: true },
    };

    // Aging chart
    const aging = this.data.agingAnalysis || {};
    this.agingChartOptions = {
      series: [
        {
          name: 'Amount',
          data: [
            aging.current || 0,
            aging.days1to30 || 0,
            aging.days31to60 || 0,
            aging.days61to90 || 0,
            aging.over90 || 0,
          ],
        },
      ],
      chart: { type: 'bar', height: 280, toolbar: { show: false } },
      xaxis: {
        categories: [
          'Current',
          '1-30 Days',
          '31-60 Days',
          '61-90 Days',
          '90+ Days',
        ],
      },
      colors: ['#ef4444'],
      plotOptions: { bar: { borderRadius: 4, distributed: true } },
      dataLabels: { enabled: false },
      tooltip: { y: { formatter: (v: number) => 'KSH ' + v.toLocaleString() } },
    };
  }

  getStatusEntries(): any[] {
    if (!this.data?.statusBreakdown) return [];
    return Object.entries(this.data.statusBreakdown).map(
      ([status, data]: [string, any]) => ({ status, ...data }),
    );
  }

  getTypeEntries(): any[] {
    if (!this.data?.typeBreakdown) return [];
    return Object.entries(this.data.typeBreakdown).map(
      ([type, data]: [string, any]) => ({ type, ...data }),
    );
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

  formatLabel(value: string): string {
    return value ? value.split('_').join(' ') : '';
  }

  getStatusColor(status: string): string {
    const c: Record<string, string> = {
      PAID: 'text-green-600',
      PARTIALLY_PAID: 'text-blue-600',
      PENDING: 'text-amber-600',
      OVERDUE: 'text-red-600',
      CANCELLED: 'text-gray-500',
      DRAFT: 'text-gray-400',
    };
    return c[status] || 'text-gray-600';
  }
}
