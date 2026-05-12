import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ModernReportsService } from '../../modules/reports/service/modern-reports.service';
import {
  ProductService,
  LowStockResponse,
  ProductValueResponse,
  CategoryValueResponse,
} from './product.service';
import { CustomerService } from './customer.service';
import { InvoiceService } from './invoice.service';
import { SalesService } from './sales.service';
import { ExpensesService } from './expenses.service';
import { AuthService } from './auth.service';

export interface DashboardMetric {
  label: string;
  value: number | string;
  change?: number;
  changeType?: 'increase' | 'decrease';
  icon?: string;
  color?: string;
}

export interface ChartData {
  categories: string[];
  series: { name: string; data: number[] }[];
}

export interface TopProduct {
  name: string;
  sales: number;
  revenue: number;
  quantity: number;
}

export interface RecentActivity {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
  amount?: number;
  status?: string;
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  constructor(
    private reportsService: ModernReportsService,
    private productService: ProductService,
    private customerService: CustomerService,
    private invoiceService: InvoiceService,
    private salesService: SalesService,
    private expensesService: ExpensesService,
    private authService: AuthService,
  ) {}

  // ─── Date Helpers ──────────────────────────────────────
  private todayStr(): string {
    return new Date().toISOString().split('T')[0];
  }

  private daysAgoStr(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  }

  private monthStartStr(): string {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1)
      .toISOString()
      .split('T')[0];
  }

  private lastMonthRange(): { start: string; end: string } {
    const d = new Date();
    const start = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    const end = new Date(d.getFullYear(), d.getMonth(), 0);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  }

  private formatKsh(value: number): string {
    if (value == null || isNaN(value)) return 'KSH 0';
    return (
      'KSH ' +
      value.toLocaleString('en-KE', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
    );
  }

  private calcChange(
    current: number,
    previous: number,
  ): { change: number; changeType: 'increase' | 'decrease' } {
    if (!previous || previous === 0)
      return { change: 0, changeType: 'increase' };
    const pct = ((current - previous) / Math.abs(previous)) * 100;
    return {
      change: Math.abs(Math.round(pct * 10) / 10),
      changeType: pct >= 0 ? 'increase' : 'decrease',
    };
  }

  // ─── ADMIN DASHBOARD ──────────────────────────────────
  getAdminMetrics(): Observable<DashboardMetric[]> {
    const today = this.todayStr();
    const monthStart = this.monthStartStr();
    const lastMonth = this.lastMonthRange();

    return forkJoin({
      current: this.reportsService
        .getDashboardOverview(monthStart, today)
        .pipe(catchError(() => of(null))),
      previous: this.reportsService
        .getDashboardOverview(lastMonth.start, lastMonth.end)
        .pipe(catchError(() => of(null))),
      lowStock: this.productService
        .getLowStockProducts()
        .pipe(catchError(() => of(null))),
    }).pipe(
      map(({ current, previous, lowStock }) => {
        const c = current?.kpis || {};
        const p = previous?.kpis || {};
        const ls = (lowStock as LowStockResponse)?.summary || {};

        const revenueChange = this.calcChange(
          c.totalRevenue || 0,
          p.totalRevenue || 0,
        );
        const orderChange = this.calcChange(
          c.orderCount || 0,
          p.orderCount || 0,
        );
        const customerChange = this.calcChange(
          c.customerCount || 0,
          p.customerCount || 0,
        );
        const expenseChange = this.calcChange(
          c.totalExpenses || 0,
          p.totalExpenses || 0,
        );

        return [
          {
            label: 'Monthly Revenue',
            value: this.formatKsh(c.totalRevenue || 0),
            ...revenueChange,
            icon: 'trending-up',
            color: 'blue',
          },
          {
            label: 'Orders This Month',
            value: (c.orderCount || 0) + (c.creditSaleCount || 0),
            ...orderChange,
            icon: 'shopping-cart',
            color: 'green',
          },
          {
            label: 'Total Customers',
            value: c.customerCount || 0,
            ...customerChange,
            icon: 'users',
            color: 'purple',
          },
          {
            label: 'Pending Invoices',
            value: c.invoiceCount || 0,
            icon: 'file-text',
            color: 'orange',
          },
          {
            label: 'Low Stock Items',
            value: (ls.lowStockCount || 0) + (ls.outOfStockCount || 0),
            icon: 'alert-triangle',
            color: 'red',
          },
          {
            label: 'Monthly Expenses',
            value: this.formatKsh(c.totalExpenses || 0),
            ...expenseChange,
            icon: 'user-check',
            color: 'indigo',
          },
        ] as DashboardMetric[];
      }),
    );
  }

  getAdminSalesChart(): Observable<ChartData> {
    const today = this.todayStr();
    const start = this.daysAgoStr(30);

    return this.reportsService.getDailyTrendsReport(start, today).pipe(
      map((res: any) => {
        const daily = res?.dailyData || [];
        return {
          categories: daily.map((d: any) => d.date),
          series: [
            {
              name: 'Revenue',
              data: daily.map((d: any) => d.totalRevenue || 0),
            },
            { name: 'Expenses', data: daily.map((d: any) => d.expenses || 0) },
          ],
        };
      }),
      catchError(() =>
        of({
          categories: [],
          series: [
            { name: 'Revenue', data: [] },
            { name: 'Expenses', data: [] },
          ],
        }),
      ),
    );
  }

  // ─── SALES DASHBOARD ──────────────────────────────────
  getSalesMetrics(): Observable<DashboardMetric[]> {
    const today = this.todayStr();
    const weekStart = this.daysAgoStr(7);
    const monthStart = this.monthStartStr();

    return forkJoin({
      todayData: this.reportsService
        .getDashboardOverview(today, today)
        .pipe(catchError(() => of(null))),
      weekData: this.reportsService
        .getDashboardOverview(weekStart, today)
        .pipe(catchError(() => of(null))),
      monthSales: this.reportsService
        .getSalesReport(monthStart, today)
        .pipe(catchError(() => of(null))),
      userPerf: this.reportsService
        .getUserPerformanceReport(monthStart, today)
        .pipe(catchError(() => of(null))),
    }).pipe(
      map(({ todayData, weekData, monthSales, userPerf }) => {
        const todayKpis = todayData?.kpis || {};
        const weekKpis = weekData?.kpis || {};
        const salesSummary = monthSales?.summary || {};

        // Find current user commission
        const user = this.authService.user$?.value;
        const currentUserId = user?.id;
        const myPerf = userPerf?.users?.find(
          (u: any) => u.userId === currentUserId,
        );
        const myCommission = myPerf?.totalCommission || 0;

        return [
          {
            label: "Today's Sales",
            value: this.formatKsh(todayKpis.totalRevenue || 0),
            icon: 'dollar-sign',
            color: 'green',
          },
          {
            label: 'Orders Today',
            value:
              (todayKpis.orderCount || 0) + (todayKpis.creditSaleCount || 0),
            icon: 'shopping-bag',
            color: 'blue',
          },
          {
            label: 'This Week',
            value: this.formatKsh(weekKpis.totalRevenue || 0),
            icon: 'trending-up',
            color: 'purple',
          },
          {
            label: 'Month Revenue',
            value: this.formatKsh(salesSummary.totalRevenue || 0),
            icon: 'target',
            color: 'indigo',
          },
          {
            label: 'Credit Sales Due',
            value: this.formatKsh(
              salesSummary.paymentCollection?.totalOutstanding ||
                monthSales?.paymentCollection?.totalOutstanding ||
                0,
            ),
            icon: 'file',
            color: 'orange',
          },
          {
            label: 'My Commission',
            value: this.formatKsh(myCommission),
            icon: 'award',
            color: 'yellow',
          },
        ] as DashboardMetric[];
      }),
    );
  }

  getSalesChart(): Observable<ChartData> {
    const today = this.todayStr();
    const weekStart = this.daysAgoStr(7);

    return this.reportsService.getDailyTrendsReport(weekStart, today).pipe(
      map((res: any) => {
        const daily = res?.dailyData || [];
        return {
          categories: daily.map((d: any) => {
            const dt = new Date(d.date);
            return dt.toLocaleDateString('en-KE', { weekday: 'short' });
          }),
          series: [
            { name: 'Sales', data: daily.map((d: any) => d.totalRevenue || 0) },
            { name: 'Expenses', data: daily.map((d: any) => d.expenses || 0) },
          ],
        };
      }),
      catchError(() =>
        of({
          categories: [],
          series: [
            { name: 'Sales', data: [] },
            { name: 'Expenses', data: [] },
          ],
        }),
      ),
    );
  }

  getTopProducts(): Observable<TopProduct[]> {
    const today = this.todayStr();
    const monthStart = this.monthStartStr();

    return this.reportsService.getSalesReport(monthStart, today).pipe(
      map((res: any) => {
        const items = res?.itemsSold || [];
        return items
          .sort((a: any, b: any) => (b.revenue || 0) - (a.revenue || 0))
          .slice(0, 5)
          .map((item: any) => ({
            name: item.name || 'Unknown',
            sales: item.quantity || 0,
            revenue: item.revenue || 0,
            quantity: item.quantity || 0,
          }));
      }),
      catchError(() => of([])),
    );
  }

  // ─── ACCOUNTANT DASHBOARD ──────────────────────────────
  getAccountantMetrics(): Observable<DashboardMetric[]> {
    const today = this.todayStr();
    const monthStart = this.monthStartStr();
    const lastMonth = this.lastMonthRange();

    return forkJoin({
      current: this.reportsService
        .getProfitLossReport(monthStart, today)
        .pipe(catchError(() => of(null))),
      previous: this.reportsService
        .getProfitLossReport(lastMonth.start, lastMonth.end)
        .pipe(catchError(() => of(null))),
      overview: this.reportsService
        .getDashboardOverview(monthStart, today)
        .pipe(catchError(() => of(null))),
    }).pipe(
      map(({ current, previous, overview }) => {
        const rev = current?.revenue || {};
        const prevRev = previous?.revenue || {};
        const prof = current?.profitability || {};
        const prevProf = previous?.profitability || {};
        const expenses = current?.expenses || {};
        const prevExpenses = previous?.expenses || {};
        const outstanding = overview?.outstanding || {};

        const revenueChange = this.calcChange(
          rev.netRevenue || 0,
          prevRev.netRevenue || 0,
        );
        const expenseChange = this.calcChange(
          expenses.totalExpenses || 0,
          prevExpenses.totalExpenses || 0,
        );
        const profitChange = this.calcChange(
          prof.netProfit || 0,
          prevProf.netProfit || 0,
        );

        return [
          {
            label: 'Total Revenue',
            value: this.formatKsh(rev.netRevenue || 0),
            ...revenueChange,
            icon: 'dollar-sign',
            color: 'green',
          },
          {
            label: 'Total Expenses',
            value: this.formatKsh(expenses.totalExpenses || 0),
            ...expenseChange,
            icon: 'credit-card',
            color: 'red',
          },
          {
            label: 'Net Profit',
            value: this.formatKsh(prof.netProfit || 0),
            ...profitChange,
            icon: 'trending-up',
            color: 'blue',
          },
          {
            label: 'Accounts Receivable',
            value: this.formatKsh(outstanding.totalOutstanding || 0),
            icon: 'arrow-down-circle',
            color: 'orange',
          },
          {
            label: 'Profit Margin',
            value: (prof.netMargin || 0).toFixed(1) + '%',
            icon: 'arrow-up-circle',
            color: 'purple',
          },
          {
            label: 'Tax Liability',
            value: this.formatKsh(current?.tax?.netTaxLiability || 0),
            icon: 'clock',
            color: 'yellow',
          },
        ] as DashboardMetric[];
      }),
    );
  }

  getAccountantRevenueExpenseChart(): Observable<ChartData> {
    const today = this.todayStr();
    const start = this.daysAgoStr(90);

    return this.reportsService.getDailyTrendsReport(start, today).pipe(
      map((res: any) => {
        const daily = res?.dailyData || [];
        // Aggregate by week
        const weeks: Record<
          string,
          { revenue: number; expenses: number; profit: number }
        > = {};
        daily.forEach((d: any) => {
          const dt = new Date(d.date);
          const weekKey = this.getWeekLabel(dt);
          if (!weeks[weekKey])
            weeks[weekKey] = { revenue: 0, expenses: 0, profit: 0 };
          weeks[weekKey].revenue += d.totalRevenue || 0;
          weeks[weekKey].expenses += d.expenses || 0;
          weeks[weekKey].profit += d.profit || 0;
        });

        const keys = Object.keys(weeks).slice(-12);
        return {
          categories: keys,
          series: [
            { name: 'Revenue', data: keys.map((k) => weeks[k].revenue) },
            { name: 'Expenses', data: keys.map((k) => weeks[k].expenses) },
            { name: 'Net Profit', data: keys.map((k) => weeks[k].profit) },
          ],
        };
      }),
      catchError(() =>
        of({
          categories: [],
          series: [
            { name: 'Revenue', data: [] },
            { name: 'Expenses', data: [] },
            { name: 'Net Profit', data: [] },
          ],
        }),
      ),
    );
  }

  getCashFlowChart(): Observable<ChartData> {
    const today = this.todayStr();
    const monthStart = this.monthStartStr();

    return this.reportsService.getDailyTrendsReport(monthStart, today).pipe(
      map((res: any) => {
        const daily = res?.dailyData || [];
        // Aggregate by week of month
        const weeks: Record<string, { inflow: number; outflow: number }> = {};
        daily.forEach((d: any, i: number) => {
          const weekNum = Math.floor(i / 7) + 1;
          const key = `Week ${weekNum}`;
          if (!weeks[key]) weeks[key] = { inflow: 0, outflow: 0 };
          weeks[key].inflow += d.totalRevenue || 0;
          weeks[key].outflow += d.expenses || 0;
        });

        const keys = Object.keys(weeks);
        return {
          categories: keys,
          series: [
            { name: 'Cash Inflow', data: keys.map((k) => weeks[k].inflow) },
            { name: 'Cash Outflow', data: keys.map((k) => weeks[k].outflow) },
          ],
        };
      }),
      catchError(() =>
        of({
          categories: [],
          series: [
            { name: 'Cash Inflow', data: [] },
            { name: 'Cash Outflow', data: [] },
          ],
        }),
      ),
    );
  }

  getPaymentMethodDistribution(): Observable<{
    labels: string[];
    series: number[];
  }> {
    const today = this.todayStr();
    const monthStart = this.monthStartStr();

    return this.reportsService.getPaymentsReport(monthStart, today).pipe(
      map((res: any) => {
        const byMethod = res?.byPaymentMethod || {};
        const labels: string[] = [];
        const series: number[] = [];

        Object.entries(byMethod).forEach(([method, data]: [string, any]) => {
          if (data?.total > 0) {
            labels.push(method.split('_').join(' '));
            series.push(data.total);
          }
        });

        if (labels.length === 0) {
          return { labels: ['No Data'], series: [1] };
        }
        return { labels, series };
      }),
      catchError(() => of({ labels: ['No Data'], series: [1] })),
    );
  }

  getExpensesByCategory(): Observable<{ labels: string[]; series: number[] }> {
    const today = this.todayStr();
    const monthStart = this.monthStartStr();

    return this.reportsService.getExpenseReport(monthStart, today).pipe(
      map((res: any) => {
        const categories = res?.categoryBreakdown || [];
        const labels = categories.map((c: any) => c.category || 'Unknown');
        const series = categories.map((c: any) => c.total || 0);

        if (labels.length === 0) {
          return { labels: ['No Expenses'], series: [1] };
        }
        return { labels, series };
      }),
      catchError(() => of({ labels: ['No Data'], series: [1] })),
    );
  }

  getRecentActivities(role: string): Observable<RecentActivity[]> {
    const today = this.todayStr();
    const weekStart = this.daysAgoStr(7);

    if (role === 'sales') {
      return this.reportsService.getSalesReport(weekStart, today).pipe(
        map((res: any) => {
          const activities: RecentActivity[] = [];
          const orders = res?.recentOrders || [];
          const credits = res?.recentCreditSales || [];

          orders.slice(0, 3).forEach((o: any, i: number) => {
            activities.push({
              id: String(o.id || i),
              type: 'order',
              description: `Order ${o.receiptNumber || '#' + o.id} - ${o.customerName || 'Walk-in'}`,
              timestamp: new Date(o.createdAt),
              amount: o.total || 0,
              status: 'completed',
            });
          });

          credits.slice(0, 2).forEach((c: any, i: number) => {
            activities.push({
              id: 'cs-' + (c.id || i),
              type: 'order',
              description: `Credit Sale to ${c.customerName || 'Customer'} - Balance: KSH ${(c.balance || 0).toLocaleString()}`,
              timestamp: new Date(c.createdAt),
              amount: c.creditAmount || 0,
              status: c.balance > 0 ? 'pending' : 'completed',
            });
          });

          return activities
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, 5);
        }),
        catchError(() => of([])),
      );
    }

    if (role === 'accountant') {
      return forkJoin({
        expenses: this.reportsService
          .getExpenseReport(weekStart, today)
          .pipe(catchError(() => of(null))),
        payments: this.reportsService
          .getPaymentsReport(weekStart, today)
          .pipe(catchError(() => of(null))),
      }).pipe(
        map(({ expenses, payments }) => {
          const activities: RecentActivity[] = [];
          const recentExp = expenses?.recentExpenses || [];
          recentExp.slice(0, 3).forEach((e: any, i: number) => {
            activities.push({
              id: 'exp-' + (e.id || i),
              type: 'expense',
              description: `${e.title || 'Expense'} - ${e.category || ''}`,
              timestamp: new Date(e.expenseDate),
              amount: e.amount || 0,
              status: e.status === 'PAID' ? 'completed' : 'pending',
            });
          });

          const recentPay = payments?.payments || [];
          recentPay.slice(0, 2).forEach((p: any, i: number) => {
            activities.push({
              id: 'pay-' + i,
              type: 'payment',
              description: `Payment via ${(p.paymentMethod || 'N/A').split('_').join(' ')} - ${p.source || ''}`,
              timestamp: new Date(p.createdAt || p.date),
              amount: p.amount || 0,
              status: 'success',
            });
          });

          return activities
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, 5);
        }),
      );
    }

    // Admin - mixed activities
    return forkJoin({
      sales: this.reportsService
        .getSalesReport(weekStart, today)
        .pipe(catchError(() => of(null))),
      expenses: this.reportsService
        .getExpenseReport(weekStart, today)
        .pipe(catchError(() => of(null))),
      lowStock: this.productService
        .getLowStockProducts()
        .pipe(catchError(() => of(null))),
    }).pipe(
      map(({ sales, expenses, lowStock }) => {
        const activities: RecentActivity[] = [];

        const orders = sales?.recentOrders || [];
        orders.slice(0, 2).forEach((o: any, i: number) => {
          activities.push({
            id: String(o.id || i),
            type: 'order',
            description: `Order ${o.receiptNumber || '#' + o.id} by ${o.salesPerson || 'Staff'}`,
            timestamp: new Date(o.createdAt),
            amount: o.total || 0,
            status: 'completed',
          });
        });

        const recentExp = expenses?.recentExpenses || [];
        recentExp.slice(0, 2).forEach((e: any, i: number) => {
          activities.push({
            id: 'exp-' + (e.id || i),
            type: 'payment',
            description: `Expense: ${e.title || 'Unknown'}`,
            timestamp: new Date(e.expenseDate),
            amount: e.amount || 0,
            status: 'completed',
          });
        });

        const ls = lowStock as LowStockResponse;
        if (ls?.summary?.lowStockCount > 0) {
          const lowItems = ls.lowStockProducts || [];
          lowItems.slice(0, 1).forEach((p: any) => {
            activities.push({
              id: 'ls-' + p.id,
              type: 'inventory',
              description: `Low stock: ${p.name} (${p.quantity} remaining)`,
              timestamp: new Date(),
              status: 'warning',
            });
          });
        }

        return activities
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, 5);
      }),
    );
  }

  // ─── PROFIT & LOSS DATA for Accountant ──────────────────
  getProfitLossData(): Observable<any> {
    const today = this.todayStr();
    const monthStart = this.monthStartStr();
    return this.reportsService
      .getProfitLossReport(monthStart, today)
      .pipe(catchError(() => of(null)));
  }

  // ─── Helpers ──────────────────────────────────────────
  private getWeekLabel(date: Date): string {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay());
    return `${start.getDate()}/${start.getMonth() + 1}`;
  }
}
