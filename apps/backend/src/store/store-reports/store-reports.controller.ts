import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { StoreReportsService } from './store-reports.service';
import { JwtGuard } from 'src/auth/guard';
import { PurchaseStatus, RequisitionStatus } from '@prisma/client';

@UseGuards(JwtGuard)
@Controller('organizations/:organizationId/store-reports')
export class StoreReportsController {
  constructor(private readonly storeReportsService: StoreReportsService) {}

  @Get('dashboard')
  getDashboard(@Param('organizationId', ParseIntPipe) organizationId: number) {
    return this.storeReportsService.getDashboardSummary(organizationId);
  }

  @Get('stock-valuation')
  getStockValuation(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.storeReportsService.getStockValuation(organizationId);
  }

  @Get('low-stock')
  getLowStock(@Param('organizationId', ParseIntPipe) organizationId: number) {
    return this.storeReportsService.getLowStockReport(organizationId);
  }

  @Get('purchases')
  getPurchaseReport(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: PurchaseStatus,
  ) {
    return this.storeReportsService.getPurchaseReport(
      organizationId,
      startDate,
      endDate,
      status,
    );
  }

  @Get('requisitions')
  getRequisitionReport(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: RequisitionStatus,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.storeReportsService.getRequisitionReport(
      organizationId,
      startDate,
      endDate,
      status,
      departmentId ? +departmentId : undefined,
    );
  }

  @Get('department-usage')
  getDepartmentUsage(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.storeReportsService.getDepartmentUsageReport(
      organizationId,
      startDate,
      endDate,
    );
  }

  @Get('category-summary')
  getCategorySummary(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.storeReportsService.getCategorySummary(organizationId);
  }

  @Get('product-movement/:productId')
  getProductMovement(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('productId', ParseIntPipe) productId: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.storeReportsService.getProductMovementReport(
      organizationId,
      productId,
      startDate,
      endDate,
    );
  }
}
