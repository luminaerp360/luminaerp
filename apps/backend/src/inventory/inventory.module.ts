import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { InventoryManagementController } from './inventory-management.controller';
import { ProductService } from 'src/products/products.service';
import { BatchTrackingService } from './services/batch-tracking.service';
import { InventoryMovementService } from './services/inventory-movement.service';
import {
  WarehouseLocationService,
  ReorderRuleService,
} from './services/warehouse-reorder.service';
import { StockSheetService } from './services/stock-sheet.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [
    InventoryService,
    ProductService,
    BatchTrackingService,
    InventoryMovementService,
    WarehouseLocationService,
    ReorderRuleService,
    StockSheetService,
  ],
  controllers: [InventoryController, InventoryManagementController],
  exports: [
    InventoryService,
    BatchTrackingService,
    InventoryMovementService,
    WarehouseLocationService,
    ReorderRuleService,
    StockSheetService,
  ],
})
export class InventoryModule {}
