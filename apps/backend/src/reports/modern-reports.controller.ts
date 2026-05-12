import {
  Controller,
  Get,
  Query,
  UseGuards,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtGuard } from 'src/auth/guard';
import { ModernReportsService } from './modern-reports.service';

@UseGuards(JwtGuard)
@Controller('organizations/:organizationId/reports/v2')
export class ModernReportsController {
  constructor(private readonly reportsService: ModernReportsService) {}

  // ─── 1. DASHBOARD OVERVIEW ───────────────────────────────────
  /**
   * GET /organizations/:orgId/reports/v2/dashboard?startDate=...&endDate=...
   * High-level KPIs across all business modules
   */
  @Get('dashboard')
  async getDashboardOverview(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getDashboardOverview(
      organizationId,
      startDate,
      endDate,
    );
  }

  // ─── 2. UNIFIED PAYMENTS REPORT ─────────────────────────────
  /**
   * GET /organizations/:orgId/reports/v2/payments?startDate=...&endDate=...
   * All payments from orders, invoices, credit sales — by method & source
   */
  @Get('payments')
  async getPaymentsReport(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getPaymentsReport(
      organizationId,
      startDate,
      endDate,
    );
  }

  // ─── 3. SALES REPORT ────────────────────────────────────────
  /**
   * GET /organizations/:orgId/reports/v2/sales?startDate=...&endDate=...
   * Orders + Credit Sales: revenue, payment methods, items sold, per-user, hourly/daily
   */
  @Get('sales')
  async getSalesReport(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getSalesReport(
      organizationId,
      startDate,
      endDate,
    );
  }

  // ─── 4. INVOICE REPORT ──────────────────────────────────────
  /**
   * GET /organizations/:orgId/reports/v2/invoices?startDate=...&endDate=...
   * Invoice analytics: status, aging, type breakdown, top customers
   */
  @Get('invoices')
  async getInvoiceReport(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getInvoiceReport(
      organizationId,
      startDate,
      endDate,
    );
  }

  // ─── 5. EXPENSE REPORT ──────────────────────────────────────
  /**
   * GET /organizations/:orgId/reports/v2/expenses?startDate=...&endDate=...
   * Expense breakdown: category, vendor, payment method, chart of accounts
   */
  @Get('expenses')
  async getExpenseReport(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getExpenseReport(
      organizationId,
      startDate,
      endDate,
    );
  }

  // ─── 6. INVENTORY REPORT ────────────────────────────────────
  /**
   * GET /organizations/:orgId/reports/v2/inventory
   * Stock levels, valuation, alerts, category breakdown (no date range needed)
   */
  @Get('inventory')
  async getInventoryReport(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.reportsService.getInventoryReport(organizationId);
  }

  // ─── 7. CUSTOMER REPORT ─────────────────────────────────────
  /**
   * GET /organizations/:orgId/reports/v2/customers?startDate=...&endDate=...
   * Customer analytics: top spenders, debtors, activity
   */
  @Get('customers')
  async getCustomerReport(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getCustomerReport(
      organizationId,
      startDate,
      endDate,
    );
  }

  // ─── 8. PROFIT & LOSS REPORT ────────────────────────────────
  /**
   * GET /organizations/:orgId/reports/v2/profit-loss?startDate=...&endDate=...
   * P&L statement: revenue, expenses, gross/net profit, tax
   */
  @Get('profit-loss')
  async getProfitAndLossReport(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getProfitAndLossReport(
      organizationId,
      startDate,
      endDate,
    );
  }

  // ─── 9. USER PERFORMANCE REPORT ─────────────────────────────
  /**
   * GET /organizations/:orgId/reports/v2/user-performance?startDate=...&endDate=...
   * Per-user sales, collections, commissions
   */
  @Get('user-performance')
  async getUserPerformanceReport(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getUserPerformanceReport(
      organizationId,
      startDate,
      endDate,
    );
  }

  // ─── 10. DAILY TREND REPORT ─────────────────────────────────
  /**
   * GET /organizations/:orgId/reports/v2/daily-trends?startDate=...&endDate=...
   * Day-by-day revenue, expenses, profit with best/worst day
   */
  @Get('daily-trends')
  async getDailyTrendReport(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getDailyTrendReport(
      organizationId,
      startDate,
      endDate,
    );
  }
}
