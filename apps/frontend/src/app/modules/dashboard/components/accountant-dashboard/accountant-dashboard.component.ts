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
  ApexNonAxisChartSeries,
  ApexResponsive,
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
  colors?: string[];
};

export type PieChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  colors?: string[];
  legend?: ApexLegend;
  responsive?: ApexResponsive[];
};

@Component({
  selector: 'app-accountant-dashboard',
  templateUrl: './accountant-dashboard.component.html',
  styleUrl: './accountant-dashboard.component.scss',
})
export class AccountantDashboardComponent implements OnInit {
  metrics: DashboardMetric[] = [];
  recentActivities: RecentActivity[] = [];
  loading = true;

  // P&L summary data
  profitMargin: number = 0;
  plGrossRevenue: number = 0;
  plTotalExpenses: number = 0;
  plNetProfit: number = 0;

  public revenueExpenseChartOptions!: Partial<ChartOptions>;
  public cashFlowChartOptions!: Partial<ChartOptions>;
  public expensesPieChartOptions!: Partial<PieChartOptions>;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.loading = true;

    // Load metrics
    this.dashboardService.getAccountantMetrics().subscribe((metrics) => {
      this.metrics = metrics;
    });

    // Load revenue/expense chart
    this.dashboardService
      .getAccountantRevenueExpenseChart()
      .subscribe((chartData) => {
        this.revenueExpenseChartOptions = {
          series: chartData.series,
          chart: {
            height: 350,
            type: 'bar',
            toolbar: {
              show: true,
            },
          },
          dataLabels: {
            enabled: false,
          },
          stroke: {
            curve: 'smooth',
            width: 2,
          },
          title: {
            text: 'Financial Overview - Last 6 Months',
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
          colors: ['#10B981', '#EF4444', '#3B82F6'],
        };
      });

    // Load cash flow chart
    this.dashboardService.getCashFlowChart().subscribe((chartData) => {
      this.cashFlowChartOptions = {
        series: chartData.series,
        chart: {
          height: 300,
          type: 'area',
          toolbar: {
            show: false,
          },
        },
        dataLabels: {
          enabled: false,
        },
        stroke: {
          curve: 'smooth',
          width: 2,
        },
        title: {
          text: 'Cash Flow - This Month',
          align: 'left',
          style: {
            fontSize: '14px',
            fontWeight: 600,
          },
        },
        grid: {
          borderColor: '#e7e7e7',
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

    // Load expenses pie chart
    this.dashboardService.getExpensesByCategory().subscribe((data) => {
      this.expensesPieChartOptions = {
        series: data.series,
        chart: {
          type: 'donut',
          height: 300,
        },
        labels: data.labels,
        colors: [
          '#3B82F6',
          '#10B981',
          '#F59E0B',
          '#EF4444',
          '#8B5CF6',
          '#6B7280',
        ],
        legend: {
          position: 'bottom',
        },
        responsive: [
          {
            breakpoint: 480,
            options: {
              chart: {
                width: 200,
              },
              legend: {
                position: 'bottom',
              },
            },
          },
        ],
      };
    });

    // Load recent activities
    this.dashboardService
      .getRecentActivities('accountant')
      .subscribe((activities) => {
        this.recentActivities = activities;
      });

    // Load P&L summary
    this.dashboardService.getProfitLossData().subscribe((data: any) => {
      if (data) {
        this.plGrossRevenue = data.revenue?.netRevenue || 0;
        this.plTotalExpenses = data.expenses?.totalExpenses || 0;
        this.plNetProfit = data.profitability?.netProfit || 0;
        this.profitMargin =
          Math.round((data.profitability?.netMargin || 0) * 10) / 10;
      }
    });
  }

  getMetricIcon(icon: string): string {
    const icons: Record<string, string> = {
      'dollar-sign': '💵',
      'credit-card': '💳',
      'trending-up': '📈',
      'arrow-down-circle': '⬇️',
      'arrow-up-circle': '⬆️',
      clock: '⏰',
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
      yellow: 'bg-yellow-500',
    };
    return colors[color] || 'bg-gray-500';
  }

  getActivityIcon(type: string): string {
    const icons: Record<string, string> = {
      payment: '💰',
      expense: '💳',
      invoice: '📄',
      reconciliation: '✅',
    };
    return icons[type] || '📋';
  }

  getActivityStatusClass(status: string): string {
    const classes: Record<string, string> = {
      completed:
        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      pending:
        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      approved:
        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      success:
        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
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

  formatCompact(value: number): string {
    if (value == null || isNaN(value)) return '0';
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
    return value.toLocaleString();
  }
}
