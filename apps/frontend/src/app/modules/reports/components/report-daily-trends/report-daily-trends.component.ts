import { Component, OnInit } from '@angular/core';
import { ModernReportsService } from '../../service/modern-reports.service';

@Component({
  selector: 'app-report-daily-trends',
  templateUrl: './report-daily-trends.component.html',
  styleUrls: ['./report-daily-trends.component.scss'],
})
export class ReportDailyTrendsComponent implements OnInit {
  data: any = null;
  loading = false;
  errorMessage = '';
  startDate = '';
  endDate = '';
  currentDateRange = 'month';

  revenueExpenseChartOptions: any = {};
  profitChartOptions: any = {};

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
      .getDailyTrendsReport(this.startDate, this.endDate)
      .subscribe({
        next: (res: any) => {
          this.data = res;
          this.buildCharts();
          this.loading = false;
        },
        error: (err: any) => {
          this.errorMessage =
            err?.error?.message || 'Failed to load daily trends report';
          this.loading = false;
        },
      });
  }

  buildCharts(): void {
    if (!this.data?.dailyData?.length) return;
    const dates = this.data.dailyData.map((d: any) => d.date);
    const revenue = this.data.dailyData.map((d: any) => d.totalRevenue || 0);
    const expenses = this.data.dailyData.map((d: any) => d.expenses || 0);
    const profit = this.data.dailyData.map((d: any) => d.profit || 0);

    this.revenueExpenseChartOptions = {
      series: [
        { name: 'Revenue', data: revenue },
        { name: 'Expenses', data: expenses },
      ],
      chart: {
        type: 'area',
        height: 360,
        toolbar: { show: false },
        background: 'transparent',
      },
      stroke: { curve: 'smooth', width: 2 },
      fill: {
        type: 'gradient',
        gradient: { opacityFrom: 0.4, opacityTo: 0.05 },
      },
      xaxis: {
        categories: dates,
        labels: { style: { colors: '#94a3b8' }, rotate: -45 },
      },
      yaxis: {
        labels: {
          style: { colors: '#94a3b8' },
          formatter: (v: number) => this.formatCurrencyShort(v),
        },
      },
      colors: ['#22c55e', '#ef4444'],
      tooltip: { y: { formatter: (v: number) => this.formatCurrency(v) } },
      theme: { mode: 'dark' },
      grid: { borderColor: '#334155' },
      legend: { labels: { colors: '#94a3b8' } },
    };

    this.profitChartOptions = {
      series: [{ name: 'Profit', data: profit }],
      chart: {
        type: 'bar',
        height: 300,
        toolbar: { show: false },
        background: 'transparent',
      },
      plotOptions: {
        bar: {
          borderRadius: 4,
          colors: {
            ranges: [
              { from: -999999999, to: 0, color: '#ef4444' },
              { from: 0, to: 999999999, color: '#22c55e' },
            ],
          },
        },
      },
      xaxis: {
        categories: dates,
        labels: { style: { colors: '#94a3b8' }, rotate: -45 },
      },
      yaxis: {
        labels: {
          style: { colors: '#94a3b8' },
          formatter: (v: number) => this.formatCurrencyShort(v),
        },
      },
      tooltip: { y: { formatter: (v: number) => this.formatCurrency(v) } },
      theme: { mode: 'dark' },
      grid: { borderColor: '#334155' },
      dataLabels: { enabled: false },
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
    if (Math.abs(value) >= 1000000)
      return 'KSH ' + (value / 1000000).toFixed(1) + 'M';
    if (Math.abs(value) >= 1000)
      return 'KSH ' + (value / 1000).toFixed(1) + 'K';
    return 'KSH ' + value.toFixed(0);
  }

  formatPercent(value: number): string {
    if (value == null) return '0%';
    return value.toFixed(1) + '%';
  }
}
