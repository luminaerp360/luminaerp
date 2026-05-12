import { Component, OnInit } from '@angular/core';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexDataLabels,
  ApexTitleSubtitle,
  ApexStroke,
  ApexGrid,
} from 'ng-apexcharts';
import { SalesService } from '../../../../shared/Services/sales.service';
import { ProductService } from '../../../../shared/Services/product.service';
import { ExpensesService } from '../../../../shared/Services/expenses.service';
import { AuthService } from '../../../../shared/Services/auth.service';
import { LocalStorageService } from '../../../../shared/Services/local-storage.service';

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  dataLabels: ApexDataLabels;
  grid: ApexGrid;
  stroke: ApexStroke;
  title: ApexTitleSubtitle;
};

@Component({
  selector: 'app-dashboard-main',
  templateUrl: './dashboard-main.component.html',
  styleUrl: './dashboard-main.component.scss',
})
export class DashboardMainComponent implements OnInit {
  currentUserRole: string = '';
  showRoleDashboard: boolean = false;
  totalCashIncome: number = 0;
  totalMpesaIncome: number = 0;
  totalBankIncome: number = 0;
  dataLoading: boolean = false;
  public salesChartOptions: ChartOptions;
  public inventoryChartOptions: ChartOptions;
  pieChartData: any = {
    series: [],
    labels: ['Cash', 'Mpesa', 'Bank'],
  };

  public todaySales: number | null = null;
  public thisWeekSales: number | null = null;
  public thisMonthSales: number | null = null;
  public lowStockItems: number | null = null;
  public outOfStockItems: number | null = null;
  // Expenses & Net Income
  public todayExpenses: number | null = null;
  public thisWeekExpenses: number | null = null;
  public thisMonthExpenses: number | null = null;
  public lastMonthExpenses: number | null = null;

  public netIncomeToday: number | null = null;
  public netIncomeThisWeek: number | null = null;
  public netIncomeThisMonth: number | null = null;

  constructor(
    private salesService: SalesService,
    private productService: ProductService,
    private expensesService: ExpensesService,
    private authService: AuthService,
    private localStorageService: LocalStorageService,
  ) {
    this.salesChartOptions = {
      series: [
        {
          name: 'Sales',
          data: [],
        },
      ],
      chart: {
        height: 350,
        type: 'line',
        zoom: {
          enabled: false,
        },
        foreColor: '#ffffff',
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        curve: 'straight',
      },
      title: {
        text: 'Daily Sales Trend',
        align: 'left',
      },
      grid: {
        row: {
          colors: ['#f3f3f3', 'transparent'],
          opacity: 0.5,
        },
      },
      xaxis: {
        categories: [],
      },
    } as ChartOptions;

    this.inventoryChartOptions = {
      series: [
        {
          name: 'Stock',
          data: [44, 55, 57, 56, 61, 58, 63, 60, 66],
        },
      ],
      chart: {
        type: 'bar',
        height: 350,
        foreColor: '#ffffff',
      },
      title: {
        text: 'Inventory Levels',
        align: 'left',
      },
      xaxis: {
        categories: [
          'Product A',
          'Product B',
          'Product C',
          'Product D',
          'Product E',
          'Product F',
          'Product G',
          'Product H',
          'Product I',
        ],
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        curve: 'smooth',
      },
      grid: {
        row: {
          colors: ['#f3f3f3', 'transparent'],
          opacity: 0.5,
        },
      },
    } as ChartOptions;
  }

  ngOnInit() {
    // Check user role and show appropriate dashboard
    this.checkUserRole();

    if (!this.showRoleDashboard) {
      this.fetchSalesSummary();
      this.fetchInventorySummary();
      // Refresh expense/net income when expenses change
      this.expensesService.expensesChanged.subscribe(() => {
        this.fetchExpensesAndNetIncome();
      });
      // initial fetch
      this.fetchExpensesAndNetIncome();
    }
  }

  checkUserRole() {
    const user = this.localStorageService.getItem('user', true);
    if (user && user.role) {
      const role = user.role.toLowerCase();

      // Map role names to dashboard types
      if (role === 'admin' || role === 'super_admin') {
        this.currentUserRole = 'admin';
        this.showRoleDashboard = true;
      } else if (role === 'sales' || role === 'sales_person') {
        this.currentUserRole = 'sales';
        this.showRoleDashboard = true;
      } else if (role === 'accountant') {
        this.currentUserRole = 'accountant';
        this.showRoleDashboard = true;
      }
    }
  }

  private async fetchExpensesAndNetIncome() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // helper to get total expenses for a date range
    const getExpensesTotal = (start: string, end: string) =>
      new Promise<number>((resolve) => {
        this.expensesService
          .getAllExpenses({ startDate: start, endDate: end })
          .subscribe(
            (res: any) => {
              // res might be an array or object with expenses property
              const list = Array.isArray(res) ? res : res.expenses || [];
              const total = list.reduce(
                (sum: number, e: any) => sum + (e.amount || 0),
                0,
              );
              resolve(total);
            },
            () => resolve(0),
          );
      });

    // Today
    this.todayExpenses = await getExpensesTotal(todayStr, todayStr);

    // This week (Mon-Sun) - align with sales logic: start = today - today.getDay()
    const wkStart = new Date(today);
    wkStart.setDate(today.getDate() - today.getDay());
    const wkStartStr = wkStart.toISOString().split('T')[0];
    this.thisWeekExpenses = await getExpensesTotal(wkStartStr, todayStr);

    // This month
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthStartStr = monthStart.toISOString().split('T')[0];
    this.thisMonthExpenses = await getExpensesTotal(monthStartStr, todayStr);

    // Last month
    const lastMonthStart = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      1,
    );
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    const lastMonthStartStr = lastMonthStart.toISOString().split('T')[0];
    const lastMonthEndStr = lastMonthEnd.toISOString().split('T')[0];
    this.lastMonthExpenses = await getExpensesTotal(
      lastMonthStartStr,
      lastMonthEndStr,
    );

    // Compute net incomes using sales already fetched for today/thisWeek/thisMonth
    // Ensure we have sales totals for the same ranges so net incomes can be computed
    const getSalesTotal = (start: string, end: string) =>
      new Promise<number>((resolve) => {
        this.salesService.getSalesByDateRange(start, end).subscribe(
          (res: any) => resolve(res?.totalEarnings || 0),
          () => resolve(0),
        );
      });

    // Today's sales (fetch if not already set)
    if (this.todaySales === null) {
      this.todaySales = await getSalesTotal(todayStr, todayStr);
    }
    this.netIncomeToday = (this.todaySales || 0) - (this.todayExpenses || 0);

    // This week: use the start computed above (wkStartStr) and today's date as end
    const wkEndStr = todayStr;

    if (this.thisWeekSales === null) {
      this.thisWeekSales = await getSalesTotal(wkStartStr, wkEndStr);
    }
    this.netIncomeThisWeek =
      (this.thisWeekSales || 0) - (this.thisWeekExpenses || 0);

    // This month: fetch if missing
    if (this.thisMonthSales === null) {
      this.thisMonthSales = await getSalesTotal(monthStartStr, todayStr);
    }
    this.netIncomeThisMonth =
      (this.thisMonthSales || 0) - (this.thisMonthExpenses || 0);
  }

  fetchSalesSummary() {
    const today = new Date();
    const dates: string[] = [];
    const salesData: number[] = [];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    const fetchSalesForDate = (date: string) => {
      return new Promise<number>((resolve) => {
        this.salesService.getSalesByDateRange(date, date).subscribe((data) => {
          resolve(data.totalEarnings || 0);
        });
      });
    };

    const fetchExpensesForDate = (date: string) => {
      return new Promise<number>((resolve) => {
        this.expensesService
          .getAllExpenses({ startDate: date, endDate: date })
          .subscribe(
            (res: any) => {
              const list = Array.isArray(res) ? res : res.expenses || [];
              const total = list.reduce(
                (s: number, e: any) => s + (e.amount || 0),
                0,
              );
              resolve(total);
            },
            () => resolve(0),
          );
      });
    };

    const fetchAllSalesData = async () => {
      for (const date of dates) {
        const sales = await fetchSalesForDate(date);
        salesData.push(sales);
      }

      // Also fetch expenses per date to show comparison
      const expensesData: number[] = [];
      for (const date of dates) {
        const exp = await fetchExpensesForDate(date);
        expensesData.push(exp);
      }

      this.salesChartOptions.series = [
        { name: 'Sales', data: salesData },
        { name: 'Expenses', data: expensesData },
      ];
      this.salesChartOptions.xaxis.categories = dates;
      this.thisWeekSales = salesData.reduce((a, b) => a + b, 0);
      this.thisWeekExpenses = expensesData.reduce((a, b) => a + b, 0);
      this.dataLoading = true;
    };

    fetchAllSalesData();

    this.salesService
      .getSalesByDateRange(
        today.toISOString().split('T')[0],
        today.toISOString().split('T')[0],
      )
      .subscribe((data) => {
        this.todaySales = data.totalEarnings;
        this.totalCashIncome = data.totalCashPaid;
        this.totalMpesaIncome = data.totalMpesaPaid;
        this.totalBankIncome = data.totalBankPaid;
        this.pieChartData.series = [
          this.totalCashIncome,
          this.totalMpesaIncome,
          this.totalBankIncome,
        ];
        this.pieChartData.labels = ['Cash', 'Mpesa', 'Bank'];
      });

    // Compute this month's sales for net income calculations
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    this.salesService
      .getSalesByDateRange(monthStart, todayStr)
      .subscribe((m) => {
        this.thisMonthSales = m.totalEarnings || 0;
      });
  }

  fetchInventorySummary() {
    this.productService.getAllProducts().subscribe((products) => {
      this.lowStockItems = products.filter(
        (product) => product.quantity! < 10,
      ).length;
      this.outOfStockItems = products.filter(
        (product) => product.quantity === 0,
      ).length;
    });
  }
}
