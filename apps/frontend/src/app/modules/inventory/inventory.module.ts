import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

// Existing Components
import { AddInventoryComponent } from './components/add-inventory/add-inventory.component';
import { TransferFromStoreComponent } from './components/transfer-from-store/transfer-from-store.component';
import { StockListComponent } from './components/stock-list/stock-list.component';

// New Modern Inventory Components
import { BatchManagementComponent } from './components/batch-management/batch-management.component';
import { ReorderDashboardComponent } from './components/reorder-dashboard/reorder-dashboard.component';
import { StockSheetComponent } from './components/stock-sheet/stock-sheet.component';
import { StockMovementsComponent } from './components/stock-movements/stock-movements.component';
import { PurchaseListComponent } from './components/purchase-list/purchase-list.component';
import { StockTakeComponent } from './components/stock-take/stock-take.component';

// Services
import { BatchTrackingService } from '../../shared/Services/batch-tracking.service';
import { InventoryMovementService } from '../../shared/Services/inventory-movement.service';
import { WarehouseReorderService } from '../../shared/Services/warehouse-reorder.service';
import { StockSheetService } from '../../shared/Services/stock-sheet.service';

@NgModule({
  declarations: [
    // Existing Components
    AddInventoryComponent,
    TransferFromStoreComponent,
    StockListComponent,

    // New Components
    BatchManagementComponent,
    ReorderDashboardComponent,
    StockSheetComponent,
    StockMovementsComponent,
    PurchaseListComponent,
    StockTakeComponent,
  ],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HttpClientModule],
  providers: [
    BatchTrackingService,
    InventoryMovementService,
    WarehouseReorderService,
    StockSheetService,
  ],
})
export class InventoryModule {}
