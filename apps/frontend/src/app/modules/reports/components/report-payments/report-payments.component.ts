import { Component, OnInit, ViewChild } from '@angular/core';
import { ModernReportsService } from '../../service/modern-reports.service';
import {
  ApexChart,
  ApexNonAxisChartSeries,
  ApexResponsive,
  ChartComponent,
  ApexDataLabels,
  ApexLegend,
} from 'ng-apexcharts';

@Component({
  selector: 'app-report-payments',
  templateUrl: './report-payments.component.html',
  styleUrls: ['./report-payments.component.scss'],
})
export class ReportPaymentsComponent implements OnInit {
  @ViewChild('methodChart') methodChart!: ChartComponent;

  loading = false;
  errorMessage = '';
  data: any = null;
  startDate = '';
  endDate = '';
  currentDateRange = 'month';
  activeTab = 'summary';

  methodChartOptions: any = {};

  sourceChartOptions: any = {};

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
      .getPaymentsReport(this.startDate, this.endDate)
      .subscribe({
        next: (res) => {
          this.data = res;
          this.loading = false;
          this.buildCharts();
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message || 'Failed to load payments report';
          this.loading = false;
        },
      });
  }

  buildCharts(): void {
    if (!this.data) return;

    const methods = this.data.byPaymentMethod;
    this.methodChartOptions = {
      series: [
        methods.cash || 0,
        methods.mpesa || 0,
        methods.bankTransfer || 0,
        methods.credit || 0,
      ],
      chart: { type: 'donut', height: 300 },
      labels: ['Cash', 'M-Pesa', 'Bank Transfer', 'Credit'],
      colors: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'],
      legend: { position: 'bottom' },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => val.toFixed(1) + '%',
      },
      responsive: [{ breakpoint: 480, options: { chart: { width: 280 } } }],
    };

    const sources = this.data.bySource;
    this.sourceChartOptions = {
      series: [
        sources.orders?.total || 0,
        sources.invoices?.total || 0,
        sources.creditSales?.total || 0,
      ],
      chart: { type: 'pie', height: 300 },
      labels: ['Orders', 'Invoices', 'Credit Sales'],
      colors: ['#6366f1', '#ec4899', '#14b8a6'],
      legend: { position: 'bottom' },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => val.toFixed(1) + '%',
      },
      responsive: [{ breakpoint: 480, options: { chart: { width: 280 } } }],
    };
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

  getSourceLabel(source: string): string {
    const labels: Record<string, string> = {
      ORDER: 'Order',
      INVOICE: 'Invoice',
      CREDIT_SALE: 'Credit Sale',
    };
    return labels[source] || source;
  }

  getSourceColor(source: string): string {
    const colors: Record<string, string> = {
      ORDER:
        'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
      INVOICE:
        'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
      CREDIT_SALE:
        'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
    };
    return colors[source] || 'bg-gray-100 text-gray-800';
  }

  getMethodColor(method: string): string {
    const colors: Record<string, string> = {
      CASH: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      MPESA: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      BANK_TRANSFER:
        'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      CREDIT:
        'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    };
    return colors[method] || 'bg-gray-100 text-gray-800';
  }
}
