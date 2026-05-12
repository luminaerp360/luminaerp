import { Component, OnInit } from '@angular/core';
import { ModernReportsService } from '../../service/modern-reports.service';

@Component({
  selector: 'app-report-sales',
  templateUrl: './report-sales.component.html',
  styleUrls: ['./report-sales.component.scss'],
})
export class ReportSalesComponent implements OnInit {
  loading = false;
  errorMessage = '';
  data: any = null;
  startDate = '';
  endDate = '';
  currentDateRange = 'month';
  activeTab = 'summary';

  hourlyChartOptions: any = {};
  dailyChartOptions: any = {};
  paymentChartOptions: any = {};

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
    this.reportsService.getSalesReport(this.startDate, this.endDate).subscribe({
      next: (res) => {
        this.data = res;
        this.loading = false;
        this.buildCharts();
      },
      error: (err) => {
        this.errorMessage =
          err?.error?.message || 'Failed to load sales report';
        this.loading = false;
      },
    });
  }

  buildCharts(): void {
    if (!this.data) return;

    // Payment collection donut
    const pc = this.data.paymentCollection;
    this.paymentChartOptions = {
      series: [pc.cash || 0, pc.mpesa || 0, pc.bank || 0],
      chart: { type: 'donut', height: 300 },
      labels: ['Cash', 'M-Pesa', 'Bank'],
      colors: ['#10b981', '#3b82f6', '#8b5cf6'],
      legend: { position: 'bottom' },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => val.toFixed(1) + '%',
      },
    };

    // Hourly chart
    if (this.data.hourlyBreakdown?.length) {
      this.hourlyChartOptions = {
        series: [
          {
            name: 'Revenue',
            data: this.data.hourlyBreakdown.map((h: any) => h.revenue),
          },
        ],
        chart: { type: 'area', height: 280, toolbar: { show: false } },
        xaxis: {
          categories: this.data.hourlyBreakdown.map((h: any) => h.label),
        },
        colors: ['#8b5cf6'],
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

    // Daily chart
    if (this.data.dailyBreakdown?.length) {
      this.dailyChartOptions = {
        series: [
          {
            name: 'Orders',
            data: this.data.dailyBreakdown.map((d: any) => d.orderRevenue),
          },
          {
            name: 'Credit Sales',
            data: this.data.dailyBreakdown.map((d: any) => d.creditSaleRevenue),
          },
        ],
        chart: {
          type: 'bar',
          height: 300,
          stacked: true,
          toolbar: { show: false },
        },
        xaxis: { categories: this.data.dailyBreakdown.map((d: any) => d.date) },
        colors: ['#6366f1', '#ec4899'],
        plotOptions: { bar: { borderRadius: 4 } },
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
