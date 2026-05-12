import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { BatchTrackingService } from './services/batch-tracking.service';
import { InventoryMovementService } from './services/inventory-movement.service';
import {
  WarehouseLocationService,
  ReorderRuleService,
} from './services/warehouse-reorder.service';
import { StockSheetService } from './services/stock-sheet.service';
import {
  CreateBatchDto,
  UpdateBatchDto,
  BatchAdjustmentDto,
  BatchTransferDto,
  BatchQueryDto,
} from './dto/batch.dto';
import { CreateMovementDto, MovementQueryDto } from './dto/movement.dto';
import {
  CreateWarehouseLocationDto,
  UpdateWarehouseLocationDto,
  CreateReorderRuleDto,
  UpdateReorderRuleDto,
} from './dto/warehouse-reorder.dto';
import { StockSheetQueryDto } from './dto/stock-sheet.dto';

@Controller('organizations/:organizationId/inventory-management')
export class InventoryManagementController {
  constructor(
    private batchService: BatchTrackingService,
    private movementService: InventoryMovementService,
    private warehouseService: WarehouseLocationService,
    private reorderService: ReorderRuleService,
    private stockSheetService: StockSheetService,
  ) {}

  // ============================================
  // BATCH TRACKING ENDPOINTS
  // ============================================

  @Post('batches')
  async createBatch(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() dto: CreateBatchDto,
    // TODO: Get from auth guard
    // @CurrentUser() user: any,
  ) {
    return this.batchService.createBatch(
      organizationId,
      dto,
      1, // user.id
      'Admin User', // user.fullName
    );
  }

  @Get('batches')
  async getAllBatches(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query() query: BatchQueryDto,
  ) {
    return this.batchService.getAllBatches(organizationId, query);
  }

  // Specific routes MUST come before parameterized routes
  @Get('batches/expiring/:days')
  async getExpiringBatches(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('days', ParseIntPipe) days: number,
  ) {
    return this.batchService.getExpiringBatches(organizationId, days);
  }

  @Get('batches/expired')
  async getExpiredBatches(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.batchService.getExpiredBatches(organizationId);
  }

  @Get('batches/low-stock')
  async getLowStockBatches(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('threshold') threshold?: number,
  ) {
    return this.batchService.getLowStockBatches(organizationId, threshold);
  }

  @Get('batches/status/:status')
  async getBatchesByStatus(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('status') status: string,
  ) {
    return this.batchService.getBatchesByStatus(organizationId, status);
  }

  @Get('batches/analytics')
  async getBatchAnalytics(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.batchService.getBatchAnalytics(organizationId);
  }

  @Post('batches/sync-quantities')
  async syncProductQuantitiesFromBatches(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.batchService.syncProductQuantitiesFromBatches(organizationId);
  }

  @Post('batches/sync-product/:productId')
  async syncSingleProductQuantity(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.batchService.syncSingleProductQuantity(
      organizationId,
      productId,
    );
  }

  @Get('batches/product/:productId/fifo')
  async getBatchesByProductFIFO(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('productId', ParseIntPipe) productId: number,
    @Query('quantity', ParseIntPipe) quantity: number,
  ) {
    return this.batchService.getBatchesByProductFIFO(
      organizationId,
      productId,
      quantity,
    );
  }

  @Get('batches/product/:productId/fefo')
  async getBatchesByProductFEFO(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('productId', ParseIntPipe) productId: number,
    @Query('quantity', ParseIntPipe) quantity: number,
  ) {
    return this.batchService.getBatchesByProductFEFO(
      organizationId,
      productId,
      quantity,
    );
  }

  @Get('batches/:batchId')
  async getBatchById(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('batchId', ParseIntPipe) batchId: number,
  ) {
    return this.batchService.getBatchById(organizationId, batchId);
  }

  @Put('batches/:batchId')
  async updateBatch(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('batchId', ParseIntPipe) batchId: number,
    @Body() dto: UpdateBatchDto,
  ) {
    return this.batchService.updateBatch(
      organizationId,
      batchId,
      dto,
      1,
      'Admin User',
    );
  }

  @Post('batches/:batchId/approve')
  async approveBatch(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('batchId', ParseIntPipe) batchId: number,
  ) {
    return this.batchService.approveBatch(
      organizationId,
      batchId,
      1, // TODO: Get from auth guard
      'Admin User', // TODO: Get from auth guard
    );
  }

  @Post('batches/:batchId/reject')
  async rejectBatch(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('batchId', ParseIntPipe) batchId: number,
    @Body() body: { reason: string },
  ) {
    return this.batchService.rejectBatch(
      organizationId,
      batchId,
      1, // TODO: Get from auth guard
      'Admin User', // TODO: Get from auth guard
      body.reason,
    );
  }

  @Delete('batches/:batchId')
  async deleteBatch(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('batchId', ParseIntPipe) batchId: number,
  ) {
    return this.batchService.deleteBatch(organizationId, batchId);
  }

  @Post('batches/adjust')
  async adjustBatchQuantity(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() dto: BatchAdjustmentDto,
  ) {
    return this.batchService.adjustBatchQuantity(
      organizationId,
      dto,
      1,
      'Admin User',
    );
  }

  @Post('batches/transfer')
  async transferBatch(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() dto: BatchTransferDto,
  ) {
    return this.batchService.transferBatch(
      organizationId,
      dto,
      1,
      'Admin User',
    );
  }

  @Post('batches/:batchId/mark-expired')
  async markBatchAsExpired(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('batchId', ParseIntPipe) batchId: number,
  ) {
    return this.batchService.markBatchAsExpired(
      organizationId,
      batchId,
      1,
      'Admin User',
    );
  }

  @Post('batches/product/:productId/deduct-fifo')
  async deductInventoryFIFO(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('productId', ParseIntPipe) productId: number,
    @Body('quantity', ParseIntPipe) quantity: number,
    @Body('referenceType') referenceType?: string,
    @Body('referenceId') referenceId?: number,
  ) {
    return this.batchService.deductInventoryFIFO(
      organizationId,
      productId,
      quantity,
      1,
      'Admin User',
      referenceType,
      referenceId,
    );
  }

  // ============================================
  // INVENTORY MOVEMENT ENDPOINTS
  // ============================================

  @Post('movements')
  async createMovement(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() dto: CreateMovementDto,
  ) {
    return this.movementService.createMovement(
      organizationId,
      dto,
      1,
      'Admin User',
    );
  }

  @Get('movements')
  async getAllMovements(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query() query: MovementQueryDto,
  ) {
    return this.movementService.getAllMovements(organizationId, query);
  }

  @Get('movements/:movementId')
  async getMovementById(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('movementId', ParseIntPipe) movementId: number,
  ) {
    return this.movementService.getMovementById(organizationId, movementId);
  }

  @Get('movements/product/:productId')
  async getProductMovements(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('productId', ParseIntPipe) productId: number,
    @Query('limit', ParseIntPipe) limit: number = 50,
  ) {
    return this.movementService.getProductMovements(
      organizationId,
      productId,
      limit,
    );
  }

  @Get('movements/batch/:batchId')
  async getBatchMovements(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('batchId', ParseIntPipe) batchId: number,
  ) {
    return this.movementService.getBatchMovements(organizationId, batchId);
  }

  @Get('movements/analytics/overview')
  async getMovementAnalytics(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.movementService.getMovementAnalytics(
      organizationId,
      startDate,
      endDate,
    );
  }

  @Get('movements/analytics/daily')
  async getDailyMovementSummary(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('date') date: string,
  ) {
    return this.movementService.getDailyMovementSummary(
      organizationId,
      new Date(date),
    );
  }

  @Get('movements/analytics/trends')
  async getMovementTrends(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('days', ParseIntPipe) days: number = 30,
  ) {
    return this.movementService.getMovementTrends(organizationId, days);
  }

  // ============================================
  // WAREHOUSE LOCATION ENDPOINTS
  // ============================================

  @Post('warehouse-locations')
  async createWarehouseLocation(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() dto: CreateWarehouseLocationDto,
  ) {
    return this.warehouseService.createLocation(organizationId, dto);
  }

  @Get('warehouse-locations')
  async getAllWarehouseLocations(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('zone') zone?: string,
  ) {
    return this.warehouseService.getAllLocations(organizationId, zone);
  }

  @Get('warehouse-locations/:locationId')
  async getWarehouseLocationById(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('locationId', ParseIntPipe) locationId: number,
  ) {
    return this.warehouseService.getLocationById(organizationId, locationId);
  }

  @Put('warehouse-locations/:locationId')
  async updateWarehouseLocation(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('locationId', ParseIntPipe) locationId: number,
    @Body() dto: UpdateWarehouseLocationDto,
  ) {
    return this.warehouseService.updateLocation(
      organizationId,
      locationId,
      dto,
    );
  }

  @Delete('warehouse-locations/:locationId')
  async deleteWarehouseLocation(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('locationId', ParseIntPipe) locationId: number,
  ) {
    return this.warehouseService.deleteLocation(organizationId, locationId);
  }

  @Get('warehouse-locations/analytics/utilization')
  async getLocationUtilization(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.warehouseService.getLocationUtilization(organizationId);
  }

  // ============================================
  // REORDER RULE ENDPOINTS
  // ============================================

  @Post('reorder-rules')
  async createReorderRule(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() dto: CreateReorderRuleDto,
  ) {
    return this.reorderService.createRule(organizationId, dto);
  }

  @Get('reorder-rules')
  async getAllReorderRules(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('enabled') enabled?: boolean,
  ) {
    return this.reorderService.getAllRules(organizationId, enabled);
  }

  // Specific routes MUST come before parameterized routes
  @Get('reorder-rules/products/needing-reorder')
  async getProductsNeedingReorder(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.reorderService.getProductsNeedingReorder(organizationId);
  }

  @Get('reorder-rules/alerts')
  async getReorderAlerts(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.reorderService.getReorderAlerts(organizationId);
  }

  @Get('reorder-rules/check/:productId')
  async checkProductReorderAlt(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.reorderService.checkProductReorder(organizationId, productId);
  }

  @Get('reorder-rules/products/:productId/check')
  async checkProductReorder(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.reorderService.checkProductReorder(organizationId, productId);
  }

  @Post('reorder-rules/trigger-check')
  async triggerReorderCheck(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.reorderService.triggerReorderCheck(organizationId);
  }

  @Post('reorder-rules/trigger-notifications')
  async triggerReorderNotification(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.reorderService.triggerReorderNotification(organizationId);
  }

  @Get('reorder-rules/:ruleId')
  async getReorderRuleById(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('ruleId', ParseIntPipe) ruleId: number,
  ) {
    return this.reorderService.getRuleById(organizationId, ruleId);
  }

  @Put('reorder-rules/:ruleId')
  async updateReorderRule(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('ruleId', ParseIntPipe) ruleId: number,
    @Body() dto: UpdateReorderRuleDto,
  ) {
    return this.reorderService.updateRule(organizationId, ruleId, dto);
  }

  @Delete('reorder-rules/:ruleId')
  async deleteReorderRule(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('ruleId', ParseIntPipe) ruleId: number,
  ) {
    return this.reorderService.deleteRule(organizationId, ruleId);
  }

  // ============================================
  // STOCK SHEET ENDPOINTS
  // ============================================

  @Get('stock-sheet')
  async getStockSheet(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query() query: StockSheetQueryDto,
  ) {
    return this.stockSheetService.getStockSheet(organizationId, query);
  }

  @Get('stock-sheet/range')
  async getStockSheetRange(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.stockSheetService.getStockSheetRange(
      organizationId,
      startDate,
      endDate,
    );
  }

  @Get('stock-sheet/current-value')
  async getCurrentStockValue(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.stockSheetService.getCurrentStockValue(organizationId);
  }
}
