import { Component, OnInit } from '@angular/core';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexDataLabels,
  ApexTitleSubtitle,
  ApexStroke,
  ApexGrid,
  ApexYAxis,
  ApexLegend,
  ApexPlotOptions,
} from 'ng-apexcharts';
import {
  DashboardService,
  DashboardMetric,
  RecentActivity,
} from '../../../../shared/Services/dashboard.service';

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis?: ApexYAxis;
  dataLabels: ApexDataLabels;
  grid: ApexGrid;
  stroke: ApexStroke;
  title: ApexTitleSubtitle;
  legend?: ApexLegend;
  plotOptions?: ApexPlotOptions;
  colors?: string[];
};

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent implements OnInit {
  metrics: DashboardMetric[] = [];
  recentActivities: RecentActivity[] = [];
  loading = true;

  public salesChartOptions!: Partial<ChartOptions>;
  public pieChartData: any = {
    series: [],
    labels: [],
  };

  constructor(private dashboardService: DashboardService) {}

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.loading = true;

    // Load metrics
    this.dashboardService.getAdminMetrics().subscribe((metrics) => {
      this.metrics = metrics;
    });

    // Load sales chart
    this.dashboardService.getAdminSalesChart().subscribe((chartData) => {
      this.salesChartOptions = {
        series: chartData.series,
        chart: {
          height: 350,
          type: 'line',
          zoom: {
            enabled: false,
          },
          toolbar: {
            show: true,
          },
        },
        dataLabels: {
          enabled: false,
        },
        stroke: {
          curve: 'smooth',
          width: 3,
        },
        title: {
          text: 'Revenue vs Expenses - Monthly Trend',
          align: 'left',
          style: {
            fontSize: '16px',
            fontWeight: 600,
          },
        },
        grid: {
          borderColor: '#e7e7e7',
          row: {
            colors: ['#f3f3f3', 'transparent'],
            opacity: 0.5,
          },
        },
        xaxis: {
          categories: chartData.categories,
        },
        yaxis: {
          labels: {
            formatter: function (value) {
              return 'KSH ' + (value / 1000).toFixed(0) + 'K';
            },
          },
        },
        legend: {
          position: 'top',
          horizontalAlign: 'right',
        },
        colors: ['#10B981', '#EF4444'],
      };
      this.loading = false;
    });

    // Load payment method distribution
    this.dashboardService.getPaymentMethodDistribution().subscribe((data) => {
      this.pieChartData = {
        series: data.series,
        labels: data.labels,
      };
    });

    // Load recent activities
    this.dashboardService
      .getRecentActivities('admin')
      .subscribe((activities) => {
        this.recentActivities = activities;
      });
  }

  getMetricIcon(icon: string): string {
    const icons: Record<string, string> = {
      'trending-up': '📈',
      'shopping-cart': '🛒',
      users: '👥',
      'file-text': '📄',
      'alert-triangle': '⚠️',
      'user-check': '✅',
    };
    return icons[icon] || '📊';
  }

  getMetricColorClass(color: string): string {
    const colors: Record<string, string> = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
      red: 'bg-red-500',
      indigo: 'bg-indigo-500',
    };
    return colors[color] || 'bg-gray-500';
  }

  getActivityIcon(type: string): string {
    const icons: Record<string, string> = {
      order: '🛍️',
      user: '👤',
      inventory: '📦',
      payment: '💰',
    };
    return icons[type] || '📋';
  }

  getActivityStatusClass(status: string): string {
    const classes: Record<string, string> = {
      completed: 'bg-green-100 text-green-800',
      active: 'bg-blue-100 text-blue-800',
      warning: 'bg-yellow-100 text-yellow-800',
      success: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  formatCompact(value: number): string {
    if (value == null || isNaN(value)) return '0';
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
    return value.toLocaleString();
  }

  getTimeAgo(date: Date): string {
    const seconds = Math.floor(
      (new Date().getTime() - new Date(date).getTime()) / 1000,
    );

    if (seconds < 60) return seconds + ' seconds ago';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60)
      return minutes + ' minute' + (minutes > 1 ? 's' : '') + ' ago';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + ' hour' + (hours > 1 ? 's' : '') + ' ago';
    const days = Math.floor(hours / 24);
    return days + ' day' + (days > 1 ? 's' : '') + ' ago';
  }
}
