import { Component, OnInit } from '@angular/core';
import { ModernReportsService } from '../../service/modern-reports.service';

@Component({
  selector: 'app-report-inventory',
  templateUrl: './report-inventory.component.html',
  styleUrls: ['./report-inventory.component.scss'],
})
export class ReportInventoryComponent implements OnInit {
  loading = false;
  errorMessage = '';
  data: any = null;

  categoryChartOptions: any = {};
  stockStatusChartOptions: any = {};

  constructor(private reportsService: ModernReportsService) {}

  ngOnInit(): void {
    this.fetchReport();
  }

  fetchReport(): void {
    this.loading = true;
    this.errorMessage = '';
    this.reportsService.getInventoryReport().subscribe({
      next: (res) => {
        this.data = res;
        this.loading = false;
        this.buildCharts();
      },
      error: (err) => {
        this.errorMessage =
          err?.error?.message || 'Failed to load inventory report';
        this.loading = false;
      },
    });
  }

  buildCharts(): void {
    if (!this.data) return;

    const s = this.data.summary;
    this.stockStatusChartOptions = {
      series: [s.wellStocked, s.lowStock, s.outOfStock],
      chart: { type: 'donut', height: 280 },
      labels: ['Well Stocked', 'Low Stock', 'Out of Stock'],
      colors: ['#10b981', '#f59e0b', '#ef4444'],
      legend: { position: 'bottom' },
    };

    const cats = this.data.categoryBreakdown || [];
    if (cats.length) {
      this.categoryChartOptions = {
        series: [
          { name: 'Stock Value', data: cats.map((c: any) => c.stockValue) },
        ],
        chart: { type: 'bar', height: 300, toolbar: { show: false } },
        xaxis: { categories: cats.map((c: any) => c.category) },
        colors: ['#8b5cf6'],
        plotOptions: { bar: { borderRadius: 4, horizontal: true } },
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

  formatLabel(value: string): string {
    return value ? value.split('_').join(' ') : '';
  }

  getStockStatusColor(status: string): string {
    const c: Record<string, string> = {
      IN_STOCK:
        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      LOW_STOCK:
        'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      OUT_OF_STOCK:
        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    return c[status] || 'bg-gray-100 text-gray-800';
  }
}
