import {
  Controller,
  Get,
  Query,
  UseGuards,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtGuard } from 'src/auth/guard';
import { ReportsService } from './reports.service';

@UseGuards(JwtGuard)
@Controller('organizations/:organizationId/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('comprehensive')
  async getComprehensiveReport(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('includeOneTimeProducts') includeOneTimeProducts: string,
  ) {
    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Convert string param to boolean
    const shouldIncludeOneTime = includeOneTimeProducts === 'true';

    return this.reportsService.getComprehensiveReport(
      organizationId,
      start,
      end,
    );
  }

  @Get('one-time-products')
  async getOneTimeProductsReport(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get the full report and extract only one-time product data
    const fullReport = await this.reportsService.getComprehensiveReport(
      organizationId,
      start,
      end,
    );

    return {
      organization: fullReport.organization,
      oneTimeProductsAnalysis: fullReport.oneTimeProductsAnalysis,
      dateRange: fullReport.dateRange,
      metadata: fullReport.metadata,
    };
  }

  @Get('daily')
  async getDailyReport(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get the full report and extract only daily trend data
    const fullReport = await this.reportsService.getComprehensiveReport(
      organizationId,
      start,
      end,
    );

    return {
      organization: fullReport.organization,
      dailyTrends: fullReport.dailyTrends,
      summary: {
        totalSales: fullReport.summary.totalSales,
        orderCount: fullReport.summary.orderCount,
        creditSaleCount: fullReport.summary.creditSaleCount,
        totalVat: fullReport.summary.totalVat,
        totalDiscount: fullReport.summary.totalDiscount,
      },
      dateRange: fullReport.dateRange,
      metadata: fullReport.metadata,
    };
  }

  @Get('vat-discount')
  async getVatAndDiscountReport(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get the full report and extract only VAT and discount data
    const fullReport = await this.reportsService.getComprehensiveReport(
      organizationId,
      start,
      end,
    );

    return {
      organization: fullReport.organization,
      vatAndDiscountBreakdown: fullReport.vatAndDiscountBreakdown,
      summary: {
        totalSales: fullReport.summary.totalSales,
        totalVat: fullReport.summary.totalVat,
        totalDiscount: fullReport.summary.totalDiscount,
      },
      paymentBreakdown: fullReport.paymentBreakdown,
      dateRange: fullReport.dateRange,
      metadata: fullReport.metadata,
    };
  }
}
