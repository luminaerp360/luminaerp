// sales-reports.component.ts
import {
  Component,
  OnInit,
  ViewChild,
  AfterViewInit,
  ChangeDetectorRef,
  OnDestroy,
  HostListener,
} from '@angular/core';
import { SalesService } from '../../../../shared/Services/sales.service';
import { ProductService } from '../../../../shared/Services/product.service';
import { Sales } from '../../../../shared/interfaces/sales.interface';
import { Product } from '../../../../shared/interfaces/products';
import jsPDF from 'jspdf';

import {
  ApexChart,
  ApexNonAxisChartSeries,
  ApexResponsive,
  ChartComponent,
  ApexDataLabels,
  ApexLegend,
  ApexStroke,
  ApexTooltip,
  ApexFill,
  ApexPlotOptions,
} from 'ng-apexcharts';
import { DatePipe } from '@angular/common';
import { FormGroup, FormBuilder } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ReportsService } from '../../service/reports.service';

export type ChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  responsive: ApexResponsive[];
  labels: any;
  colors: string[];
  dataLabels: ApexDataLabels;
  legend: ApexLegend;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
  fill: ApexFill;
  plotOptions: ApexPlotOptions;
};

export type LineChartOptions = {
  series: any;
  chart: ApexChart;
  xaxis: any;
  yaxis: any;
  dataLabels: ApexDataLabels;
  grid: any;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
  colors: string[];
  fill: ApexFill;
};

@Component({
  selector: 'app-sales-reports',
  templateUrl: './sales-reports.component.html',
  styleUrls: ['./sales-reports.component.scss'],
  providers: [DatePipe],
})
export class SalesReportsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('paymentChart') paymentChart!: ChartComponent;
  @ViewChild('categoryChart') categoryChart!: ChartComponent;
  @ViewChild('hourlyChart') hourlyChart!: ChartComponent;
  @ViewChild('dailyTrendChart') dailyTrendChart!: ChartComponent;
  @ViewChild('vatDiscountChart') vatDiscountChart!: ChartComponent;
  @ViewChild('oneTimeProductsChart') oneTimeProductsChart!: ChartComponent;

  public paymentChartOptions!: Partial<ChartOptions>;
  public categoryChartOptions!: Partial<ChartOptions>;
  public hourlyChartOptions!: Partial<LineChartOptions>;
  public dailyTrendChartOptions!: Partial<LineChartOptions>;
  public vatDiscountChartOptions!: Partial<ChartOptions>;
  public oneTimeProductsChartOptions!: Partial<ChartOptions>;

  reportForm: FormGroup;
  loading = false;
  organizationId: number = 1;
  reportData: any = null;
  activeTab: string = 'overview';

  // Additional properties for chart loading and error handling
  chartsLoading = true;
  chartsReady = false;
  errorMessage: string | null = null;
  retryCount = 0;
  readonly MAX_RETRIES = 3;

  // Theme colors
  chartColors = {
    primary: ['#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6'],
    secondary: [
      '#f97316',
      '#f59e0b',
      '#eab308',
      '#84cc16',
      '#22c55e',
      '#10b981',
    ],
    tertiary: [
      '#ec4899',
      '#d946ef',
      '#a855f7',
      '#6366f1',
      '#3b82f6',
      '#0ea5e9',
    ],
    backgrounds: {
      card: '#1e293b',
      main: '#0f172a',
    },
  };

  // Add resize listener
  @HostListener('window:resize')
  onResize() {
    if (this.chartsReady) {
      this.refreshChartsOnCurrentTab();
    }
  }

  constructor(
    private route: ActivatedRoute,
    private reportsService: ReportsService,
    private datePipe: DatePipe,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef // Add ChangeDetectorRef
  ) {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    this.reportForm = this.fb.group({
      reportType: ['today'],
      startDate: [this.formatDate(today)],
      endDate: [this.formatDate(today)],
      includeOneTimeProducts: [true],
    });

    this.initCharts();
  }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.organizationId = +params['orgId'];
      this.fetchReportData();
    });
  }

  ngAfterViewInit(): void {
    // Add timeout to ensure DOM is ready
    setTimeout(() => {
      if (this.reportData) {
        this.updateCharts();
        this.chartsReady = true;
        this.cdr.detectChanges(); // Handle possible ExpressionChangedAfterItHasBeenCheckedError
      }
    }, 300);
  }

  ngOnDestroy(): void {
    // Clean up any subscriptions or timers if necessary
  }

  initCharts(): void {
    // Payment Distribution Chart
    this.paymentChartOptions = {
      series: [0, 0, 0, 0],
      chart: {
        type: 'donut',
        height: 320,
        background: 'transparent',
        foreColor: '#e2e8f0',
        animations: {
          enabled: true,
          speed: 800,
          animateGradually: {
            enabled: true,
            delay: 150,
          },
          dynamicAnimation: {
            enabled: true,
            speed: 350,
          },
        },
        events: {
          mounted: (chart) => {
            console.log('Payment chart mounted');
            // Ensures the chart is properly rendered
            chart.windowResizeHandler();
          },
        },
      },
      labels: ['Cash', 'M-Pesa', 'Bank', 'Credit'],
      colors: ['#22c55e', '#8b5cf6', '#0ea5e9', '#f97316'],
      dataLabels: {
        enabled: true,
        formatter: (val: number) => {
          return val.toFixed(1) + '%';
        },
      },
      legend: {
        position: 'bottom',
        fontFamily: 'Inter, sans-serif',
        fontSize: '14px',
      },
      stroke: {
        width: 0,
      },
      tooltip: {
        theme: 'dark',
        y: {
          formatter: (val: number) => {
            return `KSH ${val.toLocaleString()}`;
          },
        },
      },
      plotOptions: {
        pie: {
          donut: {
            size: '65%',
            labels: {
              show: true,
              name: {
                fontSize: '16px',
                color: '#e2e8f0',
              },
              value: {
                fontSize: '22px',
                color: '#e2e8f0',
                formatter: (val: string) => {
                  return `KSH ${parseFloat(val).toLocaleString()}`;
                },
              },
              total: {
                show: true,
                fontSize: '16px',
                color: '#e2e8f0',
                formatter: (w: any) => {
                  const total = w.globals.seriesTotals.reduce(
                    (a: number, b: number) => a + b,
                    0
                  );
                  return `KSH ${total.toLocaleString()}`;
                },
              },
            },
          },
        },
      },
    };

    // Category Sales Chart
    this.categoryChartOptions = {
      series: [0],
      chart: {
        type: 'pie',
        height: 320,
        background: 'transparent',
        foreColor: '#e2e8f0',
        animations: {
          enabled: true,
          speed: 800,
        },
        events: {
          mounted: (chart) => {
            console.log('Category chart mounted');
            chart.windowResizeHandler();
          },
        },
      },
      labels: [],
      colors: this.chartColors.primary,
      dataLabels: {
        enabled: true,
        formatter: (val: number) => {
          return val.toFixed(1) + '%';
        },
      },
      legend: {
        position: 'bottom',
        fontFamily: 'Inter, sans-serif',
        fontSize: '14px',
      },
      stroke: {
        width: 2,
        colors: ['#1e293b'],
      },
      tooltip: {
        theme: 'dark',
        y: {
          formatter: (val: number) => {
            return `KSH ${val.toLocaleString()}`;
          },
        },
      },
    };

    // Hourly Sales Chart (Area Chart)
    this.hourlyChartOptions = {
      series: [
        {
          name: 'Total Sales',
          data: Array(24).fill(0),
        },
      ],
      chart: {
        height: 350,
        type: 'area',
        background: 'transparent',
        foreColor: '#e2e8f0',
        toolbar: {
          show: false,
        },
        fontFamily: 'Inter, sans-serif',
        animations: {
          enabled: true,
          speed: 800,
        },
        events: {
          mounted: (chart) => {
            console.log('Hourly chart mounted');
            chart.windowResizeHandler();
          },
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        curve: 'smooth',
        width: 3,
        colors: ['#8b5cf6'],
      },
      xaxis: {
        categories: Array.from({ length: 24 }, (_, i) => `${i}:00`),
        labels: {
          style: {
            colors: '#e2e8f0',
            fontSize: '12px',
          },
        },
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
      },
      yaxis: {
        labels: {
          style: {
            colors: '#e2e8f0',
            fontSize: '12px',
          },
          formatter: (value: number) => `KSH ${value.toLocaleString()}`,
        },
      },
      grid: {
        borderColor: '#334155',
        xaxis: {
          lines: {
            show: true,
          },
        },
        yaxis: {
          lines: {
            show: true,
          },
        },
      },
      tooltip: {
        theme: 'dark',
        x: {
          formatter: (val: number) => `Hour ${val}:00`,
        },
        y: {
          formatter: (value: number) => `KSH ${value.toLocaleString()}`,
        },
      },
      colors: ['#8b5cf6'],
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'dark',
          type: 'vertical',
          shadeIntensity: 0.4,
          opacityFrom: 0.8,
          opacityTo: 0.2,
          stops: [0, 90, 100],
        },
      },
    };

    // Daily Trend Chart
    this.dailyTrendChartOptions = {
      series: [
        {
          name: 'Total Sales',
          data: [],
        },
        {
          name: 'Cash Sales',
          data: [],
        },
        {
          name: 'Credit Sales',
          data: [],
        },
      ],
      chart: {
        height: 350,
        type: 'line',
        background: 'transparent',
        foreColor: '#e2e8f0',
        toolbar: {
          show: false,
        },
        fontFamily: 'Inter, sans-serif',
        zoom: {
          enabled: false,
        },
        animations: {
          enabled: true,
          speed: 800,
        },
        events: {
          mounted: (chart) => {
            console.log('Daily trend chart mounted');
            chart.windowResizeHandler();
          },
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        curve: 'smooth',
        width: [3, 2, 2],
        dashArray: [0, 0, 0],
      },
      xaxis: {
        categories: [],
        labels: {
          style: {
            colors: '#e2e8f0',
            fontSize: '12px',
          },
        },
      },
      yaxis: {
        labels: {
          style: {
            colors: '#e2e8f0',
            fontSize: '12px',
          },
          formatter: (value: number) => `KSH ${value.toLocaleString()}`,
        },
      },
      grid: {
        borderColor: '#334155',
        row: {
          colors: ['transparent', 'transparent'],
        },
      },
      tooltip: {
        theme: 'dark',
        y: {
          formatter: (value: number) => `KSH ${value.toLocaleString()}`,
        },
      },
      colors: ['#3b82f6', '#22c55e', '#f97316'],
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'dark',
          gradientToColors: undefined,
          shadeIntensity: 1,
          type: 'horizontal',
          opacityFrom: 1,
          opacityTo: 1,
          stops: [0, 50, 100],
        },
      },
    };

    // VAT and Discount Chart
    this.vatDiscountChartOptions = {
      series: [0, 0],
      chart: {
        type: 'donut',
        height: 300,
        background: 'transparent',
        foreColor: '#e2e8f0',
        animations: {
          enabled: true,
          speed: 800,
        },
        events: {
          mounted: (chart) => {
            console.log('VAT Discount chart mounted');
            chart.windowResizeHandler();
          },
        },
      },
      labels: ['VAT', 'Discount'],
      colors: ['#8b5cf6', '#f97316'],
      dataLabels: {
        enabled: true,
      },
      legend: {
        position: 'bottom',
        fontFamily: 'Inter, sans-serif',
      },
      stroke: {
        width: 0,
      },
      tooltip: {
        theme: 'dark',
        y: {
          formatter: (val: number) => {
            return `KSH ${val.toLocaleString()}`;
          },
        },
      },
      plotOptions: {
        pie: {
          donut: {
            size: '65%',
            labels: {
              show: true,
              total: {
                show: true,
                formatter: (w: any) => {
                  const total = w.globals.seriesTotals.reduce(
                    (a: number, b: number) => a + b,
                    0
                  );
                  return `KSH ${total.toLocaleString()}`;
                },
              },
            },
          },
        },
      },
    };

    // One-Time Products Chart
    this.oneTimeProductsChartOptions = {
      series: [0, 0],
      chart: {
        type: 'pie',
        height: 320,
        background: 'transparent',
        foreColor: '#e2e8f0',
        animations: {
          enabled: true,
          speed: 800,
        },
        events: {
          mounted: (chart) => {
            console.log('One-Time Products chart mounted');
            chart.windowResizeHandler();
          },
        },
      },
      labels: ['One-Time Products', 'Regular Products'],
      colors: ['#06b6d4', '#22c55e'],
      dataLabels: {
        enabled: true,
        formatter: (val: number) => {
          return val.toFixed(1) + '%';
        },
      },
      legend: {
        position: 'bottom',
        fontFamily: 'Inter, sans-serif',
      },
      stroke: {
        width: 0,
      },
      tooltip: {
        theme: 'dark',
        y: {
          formatter: (val: number) => {
            return `KSH ${val.toLocaleString()}`;
          },
        },
      },
    };
  }

  // Enhanced fetchReportData method for better error handling
  fetchReportData(): void {
    this.loading = true;
    this.chartsLoading = true;
    this.chartsReady = false;
    this.errorMessage = null;

    const formValues = this.reportForm.value;
    const startDate: string = formValues.startDate;
    const endDate: string = formValues.endDate;

    this.reportsService
      .getComprehensiveReport(
        this.organizationId,
        startDate,
        endDate,
        formValues.includeOneTimeProducts
      )
      .subscribe({
        next: (data: any) => {
          this.reportData = data;
          this.loading = false;
          this.retryCount = 0;

          // Delay chart updates slightly to ensure DOM is ready
          setTimeout(() => {
            try {
              this.updateCharts();
              this.chartsLoading = false;
              this.chartsReady = true;
            } catch (err) {
              console.error('Error updating charts:', err);
              this.handleChartError();
            }
          }, 300);
        },
        error: (error: any) => {
          console.error('Error fetching report data:', error);
          this.loading = false;
          this.chartsLoading = false;

          if (error.status === 0) {
            this.errorMessage =
              'Network error. Please check your connection and try again.';
          } else if (error.status === 404) {
            this.errorMessage = 'No data found for the selected date range.';
          } else {
            this.errorMessage = `Error loading report: ${
              error.message || 'Unknown error'
            }`;
          }

          // Auto-retry for network issues
          if (error.status === 0 && this.retryCount < this.MAX_RETRIES) {
            this.retryCount++;
            setTimeout(() => {
              this.fetchReportData();
            }, 3000); // Wait 3 seconds before retry
          }
        },
      });
  }

  // Handle chart rendering errors
  handleChartError(): void {
    this.chartsLoading = false;

    // Try re-initializing the charts
    this.initCharts();

    // Then try updating them again after a short delay
    setTimeout(() => {
      try {
        if (this.reportData) {
          this.updateCharts();
          this.chartsReady = true;
        }
      } catch (err) {
        console.error('Failed to recover from chart error:', err);
        this.errorMessage =
          'Unable to display charts. Please try refreshing the page.';
      }
    }, 500);
  }

  // Helper method to refresh charts on the current tab
  refreshChartsOnCurrentTab(): void {
    setTimeout(() => {
      switch (this.activeTab) {
        case 'overview':
          if (this.paymentChart)
            this.paymentChart.render();
          if (this.categoryChart)
            this.categoryChart.render();
          if (this.hourlyChart)
            this.hourlyChart.render();
          if (this.vatDiscountChart)
            this.vatDiscountChart.render();
          break;
        case 'daily':
          if (this.dailyTrendChart)
            this.dailyTrendChart.render();
          break;
        case 'products':
          if (this.oneTimeProductsChart)
            this.oneTimeProductsChart.render();
          break;
      }
    }, 100);
  }

  // Enhanced updateCharts method with better error handling
  updateCharts(): void {
    if (!this.reportData) return;

    try {
      // Update Payment Distribution Chart
      if (this.paymentChart) {
        const paymentData = [
          this.reportData.paymentBreakdown.cash,
          this.reportData.paymentBreakdown.mpesa,
          this.reportData.paymentBreakdown.bank,
          this.reportData.paymentBreakdown.credit,
        ];
        this.paymentChartOptions.series = paymentData;
        this.paymentChart.updateOptions(this.paymentChartOptions);
      } else {
        console.warn('Payment chart not available for update');
      }

      // Update Category Sales Chart
      if (
        this.categoryChart &&
        this.reportData.categoryBreakdown?.length > 0
      ) {
        this.categoryChartOptions.series = this.reportData.categoryBreakdown
          .slice(0, 6)
          .map((cat: any) => cat.totalSales);
        this.categoryChartOptions.labels = this.reportData.categoryBreakdown
          .slice(0, 6)
          .map((cat: any) => cat.name);
        this.categoryChart.updateOptions(this.categoryChartOptions);
      } else {
        console.warn('Category chart not available for update or no data');
      }

      // Update Hourly Chart
      if (
        this.hourlyChart &&
        this.reportData.hourlyBreakdown?.length > 0
      ) {
        this.hourlyChartOptions.series = [
          {
            name: 'Total Sales',
            data: this.reportData.hourlyBreakdown.map(
              (hour: any) => hour.totalSales
            ),
          },
        ];
        this.hourlyChartOptions.xaxis.categories =
          this.reportData.hourlyBreakdown.map(
            (_: any, index: number) => `${index}:00`
          );
        this.hourlyChart.updateOptions(this.hourlyChartOptions);
      } else {
        console.warn('Hourly chart not available for update or no data');
      }

      // Update Daily Trend Chart
      if (
        this.dailyTrendChart &&
        this.reportData.dailyTrends?.length > 0
      ) {
        const dates = this.reportData.dailyTrends.map((day: any) =>
          this.datePipe.transform(new Date(day.date), 'MMM d')
        );

        this.dailyTrendChartOptions.series = [
          {
            name: 'Total Sales',
            data: this.reportData.dailyTrends.map((day: any) => day.totalSales),
          },
          {
            name: 'Cash Sales',
            data: this.reportData.dailyTrends.map((day: any) => day.cashSales),
          },
          {
            name: 'Credit Sales',
            data: this.reportData.dailyTrends.map(
              (day: any) => day.creditSales
            ),
          },
        ];

        this.dailyTrendChartOptions.xaxis.categories = dates;
        this.dailyTrendChart.updateOptions(this.dailyTrendChartOptions);
      } else {
        console.warn('Daily trend chart not available for update or no data');
      }

      // Update VAT and Discount Chart
      if (this.vatDiscountChart) {
        this.vatDiscountChartOptions.series = [
          this.reportData.vatAndDiscountBreakdown.totalVat,
          this.reportData.vatAndDiscountBreakdown.totalDiscount,
        ];
        this.vatDiscountChart.updateOptions(this.vatDiscountChartOptions);
      } else {
        console.warn('VAT discount chart not available for update');
      }

      // Update One-Time Products Chart
      if (this.oneTimeProductsChart) {
        const oneTimeAmount =
          this.reportData.oneTimeProductsAnalysis.totalSales;
        const regularAmount =
          this.reportData.summary.totalSales - oneTimeAmount;

        this.oneTimeProductsChartOptions.series = [
          oneTimeAmount,
          regularAmount,
        ];
        this.oneTimeProductsChart.updateOptions(
          this.oneTimeProductsChartOptions
        );
      } else {
        console.warn('One-time products chart not available for update');
      }
    } catch (error) {
      console.error('Error during chart update:', error);
      throw error; // Rethrow to be caught by the caller
    }
  }

  // Enhanced setActiveTab method
  setActiveTab(tab: string): void {
    this.activeTab = tab;

    if (this.reportData && this.chartsReady) {
      // Add a small loading state when switching tabs
      this.chartsLoading = true;
      setTimeout(() => {
        this.refreshChartsOnCurrentTab();
        this.chartsLoading = false;
      }, 100);
    }
  }

  // Method to force repaint all charts if needed
  forceRepaintCharts(): void {
    if (!this.chartsReady || !this.reportData) return;

    this.chartsLoading = true;
    setTimeout(() => {
      // Force browser reflow by accessing offsetHeight
      const chartContainers = document.querySelectorAll('.apexcharts-canvas');
      chartContainers.forEach((container) => {
        // TypeScript fix - cast to HTMLElement
        const htmlElement = container as HTMLElement;
        const _ = htmlElement.offsetHeight; // This forces a reflow
      });

      this.refreshChartsOnCurrentTab();
      this.chartsLoading = false;
    }, 100);
  }

  // Retry button click handler
  retryLoadCharts(): void {
    this.errorMessage = null;
    this.chartsLoading = true;

    // First reinitialize the charts
    this.initCharts();

    // Then try to update them with data
    setTimeout(() => {
      if (this.reportData) {
        try {
          this.updateCharts();
          this.chartsReady = true;
          this.chartsLoading = false;
        } catch (err) {
          console.error('Error reloading charts:', err);
          this.chartsLoading = false;
          this.errorMessage =
            'Still having issues loading charts. Please refresh the page.';
        }
      } else {
        this.chartsLoading = false;
        this.fetchReportData(); // If no data, refetch it
      }
    }, 300);
  }

  // Add these properties to the SalesReportsComponent class
  currentDateRange: string = 'month'; // Default filter

  // Add this method to set date range based on selection
  setDateRange(range: string): void {
    this.currentDateRange = range;
    const today = new Date();
    let startDate: Date;
    let endDate: Date = today;

    switch (range) {
      case 'today':
        startDate = today;
        endDate = today;
        break;
      case 'yesterday':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 1);
        endDate = new Date(startDate);
        break;
      case 'thisWeek':
        startDate = new Date(today);
        const dayOfWeek = startDate.getDay();
        const diff = startDate.getDate() - dayOfWeek;
        startDate = new Date(startDate.setDate(diff)); // Start of week (Sunday)
        break;
      case 'thisMonth':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'lastMonth':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'custom':
        // Don't change dates, let user select
        return;
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }

    // Update form with new date values
    this.reportForm.patchValue({
      startDate: this.formatDate(startDate),
      endDate: this.formatDate(endDate),
    });

    // Auto-fetch for preset ranges
    if (range !== 'custom') {
      this.fetchReportData();
    }
  }

  // Add this method to your SalesReportsComponent class
  getCurrentYear(): number {
    return new Date().getFullYear();
  }

  formatDate(date: Date): string {
    return this.datePipe.transform(date, 'yyyy-MM-dd') || '';
  }

  formatCurrency(amount: number): string {
    return `KSH ${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  calculatePercentage(value: number, total: number): string {
    if (!total) return '0%';
    return `${((value / total) * 100).toFixed(1)}%`;
  }

  formatDateDisplay(dateStr: string): string {
    if (!dateStr) return '';
    return this.datePipe.transform(dateStr, 'MMM d, yyyy') || '';
  }

  downloadReport(): void {
    // Implementation for report download
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    let yPos = margin;

    // Helper function for adding text
    const addText = (
      text: string,
      fontSize: number = 12,
      align: 'left' | 'center' | 'right' = 'left'
    ) => {
      doc.setFontSize(fontSize);
      doc.text(text, align === 'center' ? pageWidth / 2 : margin, yPos, {
        align,
      });
      yPos += fontSize / 2 + 5;
    };

    // Add report header
    addText('Comprehensive Sales Report', 20, 'center');
    addText(`${this.reportData.organization.name}`, 14, 'center');
    addText(
      `Report Period: ${this.datePipe.transform(
        this.reportData.dateRange.start,
        'MMM d, yyyy'
      )} - ${this.datePipe.transform(
        this.reportData.dateRange.end,
        'MMM d, yyyy'
      )}`,
      12,
      'center'
    );

    yPos += 10;

    // Add summary section
    addText('Summary', 16);
    addText(
      `Total Sales: ${this.formatCurrency(this.reportData.summary.totalSales)}`,
      12
    );
    addText(
      `Total Transactions: ${
        this.reportData.summary.orderCount +
        this.reportData.summary.creditSaleCount
      }`,
      12
    );
    addText(
      `Cash Sales: ${this.formatCurrency(
        this.reportData.paymentBreakdown.cash +
          this.reportData.paymentBreakdown.mpesa +
          this.reportData.paymentBreakdown.bank
      )}`,
      12
    );
    addText(
      `Credit Sales: ${this.formatCurrency(
        this.reportData.paymentBreakdown.credit
      )}`,
      12
    );
    addText(
      `Total VAT: ${this.formatCurrency(this.reportData.summary.totalVat)}`,
      12
    );
    addText(
      `Total Discount: ${this.formatCurrency(
        this.reportData.summary.totalDiscount
      )}`,
      12
    );

    // Save the PDF
    doc.save(`sales-report-${this.formatDate(new Date())}.pdf`);
  }
}
