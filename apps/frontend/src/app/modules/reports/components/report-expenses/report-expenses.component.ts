import { Component, OnInit } from '@angular/core';
import { ModernReportsService } from '../../service/modern-reports.service';

@Component({
  selector: 'app-report-expenses',
  templateUrl: './report-expenses.component.html',
  styleUrls: ['./report-expenses.component.scss'],
})
export class ReportExpensesComponent implements OnInit {
  loading = false;
  errorMessage = '';
  data: any = null;
  startDate = '';
  endDate = '';
  currentDateRange = 'month';

  categoryChartOptions: any = {};
  dailyChartOptions: any = {};

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
      .getExpenseReport(this.startDate, this.endDate)
      .subscribe({
        next: (res) => {
          this.data = res;
          this.loading = false;
          this.buildCharts();
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message || 'Failed to load expense report';
          this.loading = false;
        },
      });
  }

  buildCharts(): void {
    if (!this.data) return;

    // Category breakdown donut
    const cats = this.data.categoryBreakdown || [];
    if (cats.length) {
      this.categoryChartOptions = {
        series: cats.map((c: any) => c.total),
        chart: { type: 'donut', height: 300 },
        labels: cats.map((c: any) => c.category),
        colors: [
          '#ef4444',
          '#f59e0b',
          '#8b5cf6',
          '#3b82f6',
          '#10b981',
          '#ec4899',
          '#6b7280',
          '#14b8a6',
        ],
        legend: { position: 'bottom' },
        dataLabels: {
          enabled: true,
          formatter: (val: number) => val.toFixed(1) + '%',
        },
      };
    }

    // Daily trend
    const daily = this.data.dailyTrend || [];
    if (daily.length) {
      this.dailyChartOptions = {
        series: [{ name: 'Expenses', data: daily.map((d: any) => d.total) }],
        chart: { type: 'area', height: 280, toolbar: { show: false } },
        xaxis: { categories: daily.map((d: any) => d.date) },
        colors: ['#ef4444'],
        stroke: { curve: 'smooth', width: 2 },
        fill: {
          type: 'gradient',
          gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1 },
        },
        dataLabels: { enabled: false },
        tooltip: {
          y: { formatter: (v: number) => 'KSH ' + v.toLocaleString() },
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
