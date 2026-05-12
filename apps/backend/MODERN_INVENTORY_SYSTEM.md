# Modern Inventory Tracking System

## 📋 Overview

A comprehensive inventory management system with advanced features including batch tracking, FIFO/FEFO inventory rotation, warehouse location management, automated reorder rules, and complete inventory movement auditing.

## 🚀 Features Implemented

### 1. **Batch & Lot Tracking** 📦

Track inventory by individual batches with complete lifecycle management.

**Key Features:**

- Unique batch numbers with lot number support
- Manufacturing and expiry date tracking
- FIFO (First In, First Out) inventory rotation
- FEFO (First Expired, First Out) for perishables
- Batch status management (ACTIVE, QUARANTINE, EXPIRED, DEPLETED, RECALLED)
- Warehouse location per batch
- Automatic expiry alerts (30/60/90 days)
- Cost tracking per batch for accurate COGS

**API Endpoints:**

```
POST   /organizations/:organizationId/inventory/batches
GET    /organizations/:organizationId/inventory/batches
GET    /organizations/:organizationId/inventory/batches/:batchId
PUT    /organizations/:organizationId/inventory/batches/:batchId
POST   /organizations/:organizationId/inventory/batches/adjust
POST   /organizations/:organizationId/inventory/batches/transfer
GET    /organizations/:organizationId/inventory/batches/expiring/soon?days=30
GET    /organizations/:organizationId/inventory/batches/expired/all
POST   /organizations/:organizationId/inventory/batches/:batchId/mark-expired
GET    /organizations/:organizationId/inventory/batches/product/:productId/fifo?quantity=100
GET    /organizations/:organizationId/inventory/batches/product/:productId/fefo?quantity=100
POST   /organizations/:organizationId/inventory/batches/product/:productId/deduct-fifo
GET    /organizations/:organizationId/inventory/batches/analytics
```

**Example: Create Batch**

```json
{
  "productId": 123,
  "batchNumber": "BATCH-2026-001",
  "lotNumber": "LOT-XYZ-456",
  "receivedDate": "2026-01-11T00:00:00Z",
  "expiryDate": "2026-12-31T00:00:00Z",
  "manufacturingDate": "2025-12-01T00:00:00Z",
  "quantity": 1000,
  "unitCost": 15.5,
  "supplierId": 5,
  "warehouseLocation": "WH1-A1-R5-S3",
  "notes": "First batch of new product"
}
```

---

### 2. **Inventory Movement Tracking** 🔄

Complete audit trail of all inventory changes with automatic movement logging.

**Movement Types:**

- PURCHASE - New inventory received
- SALE - Inventory sold to customers
- ADJUSTMENT_INCREASE - Manual quantity increase
- ADJUSTMENT_DECREASE - Manual quantity decrease
- TRANSFER_IN / TRANSFER_OUT - Location transfers
- RETURN_FROM_CUSTOMER - Customer returns
- RETURN_TO_SUPPLIER - Returns to supplier
- DAMAGE - Damaged inventory write-off
- THEFT - Theft/loss reporting
- EXPIRED - Expired product removal
- PRODUCTION_IN / PRODUCTION_OUT - Manufacturing
- SAMPLE - Sample distribution

**API Endpoints:**

```
POST   /organizations/:organizationId/inventory/movements
GET    /organizations/:organizationId/inventory/movements
GET    /organizations/:organizationId/inventory/movements/:movementId
GET    /organizations/:organizationId/inventory/movements/product/:productId?limit=50
GET    /organizations/:organizationId/inventory/movements/batch/:batchId
GET    /organizations/:organizationId/inventory/movements/analytics/overview
GET    /organizations/:organizationId/inventory/movements/analytics/daily?date=2026-01-11
GET    /organizations/:organizationId/inventory/movements/analytics/trends?days=30
```

**Example: Create Movement**

```json
{
  "productId": 123,
  "batchId": 456,
  "movementType": "ADJUSTMENT_INCREASE",
  "quantityChange": 50,
  "fromLocation": "WH1-A1-R5-S3",
  "toLocation": "STORE-SHELF-1",
  "referenceType": "StockAdjustment",
  "referenceId": 789,
  "unitCost": 15.5,
  "reason": "Physical count adjustment",
  "notes": "Found additional units during inventory count"
}
```

---

### 3. **Warehouse Location Management** 🏭

Organize inventory by specific warehouse locations with capacity tracking.

**Features:**

- Hierarchical location structure (Zone > Aisle > Rack > Shelf > Bin)
- Unique location codes (e.g., "WH1-A1-R5-S3-B2")
- Capacity management
- Occupancy tracking
- Location utilization analytics
- Active/Inactive status

**API Endpoints:**

```
POST   /organizations/:organizationId/inventory/warehouse-locations
GET    /organizations/:organizationId/inventory/warehouse-locations?zone=STORAGE
GET    /organizations/:organizationId/inventory/warehouse-locations/:locationId
PUT    /organizations/:organizationId/inventory/warehouse-locations/:locationId
DELETE /organizations/:organizationId/inventory/warehouse-locations/:locationId
GET    /organizations/:organizationId/inventory/warehouse-locations/analytics/utilization
```

**Example: Create Warehouse Location**

```json
{
  "code": "WH1-A1-R5-S3",
  "name": "Warehouse 1 - Aisle A1 - Rack 5 - Shelf 3",
  "locationId": 1,
  "zone": "STORAGE",
  "aisle": "A1",
  "rack": "R5",
  "shelf": "S3",
  "capacity": 500,
  "notes": "Temperature controlled zone"
}
```

---

### 4. **Automated Reorder Rules** 🔔

Smart inventory replenishment with automatic low-stock alerts.

**Features:**

- Min/Max stock levels
- Automatic reorder point detection
- Safety stock buffers
- Lead time consideration
- Preferred supplier assignment
- Enable/Disable rules
- Reorder quantity suggestions
- Priority levels (CRITICAL, HIGH, MEDIUM)

**API Endpoints:**

```
POST   /organizations/:organizationId/inventory/reorder-rules
GET    /organizations/:organizationId/inventory/reorder-rules?enabled=true
GET    /organizations/:organizationId/inventory/reorder-rules/:ruleId
PUT    /organizations/:organizationId/inventory/reorder-rules/:ruleId
DELETE /organizations/:organizationId/inventory/reorder-rules/:ruleId
GET    /organizations/:organizationId/inventory/reorder-rules/products/needing-reorder
GET    /organizations/:organizationId/inventory/reorder-rules/products/:productId/check
POST   /organizations/:organizationId/inventory/reorder-rules/trigger-notifications
```

**Example: Create Reorder Rule**

```json
{
  "productId": 123,
  "minStock": 50,
  "maxStock": 500,
  "reorderQuantity": 300,
  "leadTimeDays": 7,
  "safetyStock": 25,
  "supplierId": 5,
  "enabled": true
}
```

**Reorder Logic:**

- When `currentStock <= minStock`, trigger reorder
- Suggested order quantity: `max(reorderQuantity, maxStock - currentStock)`
- Priority levels:
  - **CRITICAL**: Stock is 0
  - **HIGH**: Stock below safety level
  - **MEDIUM**: Stock at reorder point

---

## 📊 Analytics & Reporting

### Batch Analytics

```json
{
  "totalBatches": 150,
  "activeBatches": 120,
  "expiredBatches": 10,
  "depletedBatches": 15,
  "quarantinedBatches": 5,
  "expiringIn30Days": 25,
  "totalInventoryValue": 125000.5,
  "totalQuantity": 15000
}
```

### Movement Analytics

```json
{
  "totalMovements": 500,
  "byType": {
    "PURCHASE": 100,
    "SALE": 250,
    "ADJUSTMENT_INCREASE": 20,
    "ADJUSTMENT_DECREASE": 15,
    ...
  },
  "totalValueIn": 50000,
  "totalValueOut": 75000,
  "totalQuantityIn": 5000,
  "totalQuantityOut": 7500,
  "topProducts": [...],
  "byLocation": {...}
}
```

---

## 🗄️ Database Schema

### InventoryBatch

```prisma
model InventoryBatch {
  id                  Int
  organizationId      Int
  productId           Int
  inventoryId         Int?
  batchNumber         String    // Unique
  lotNumber           String?
  receivedDate        DateTime
  expiryDate          DateTime?
  manufacturingDate   DateTime?
  quantity            Int       // Current quantity
  initialQuantity     Int       // Original quantity
  reservedQuantity    Int
  availableQuantity   Int       // quantity - reservedQuantity
  status              BatchStatus
  unitCost            Float
  supplierId          Int
  warehouseLocation   String?
  notes               String?
}

enum BatchStatus {
  ACTIVE
  QUARANTINE
  EXPIRED
  DEPLETED
  RECALLED
}
```

### InventoryMovement

```prisma
model InventoryMovement {
  id                Int
  organizationId    Int
  productId         Int
  batchId           Int?
  movementType      MovementType
  quantityBefore    Int
  quantityChange    Int       // Positive for additions, negative for deductions
  quantityAfter     Int
  fromLocation      String?
  toLocation        String?
  referenceType     String?
  referenceId       Int?
  unitCost          Float?
  totalValue        Float?
  performedBy       Int
  performedByName   String
  reason            String?
  notes             String?
  timestamp         DateTime
}
```

### WarehouseLocation

```prisma
model WarehouseLocation {
  id                Int
  organizationId    Int
  locationId        Int?
  code              String    // Unique
  name              String
  zone              String?   // Receiving, Storage, Picking, Shipping
  aisle             String?
  rack              String?
  shelf             String?
  bin               String?
  capacity          Int?
  currentOccupancy  Int
  isActive          Boolean
  notes             String?
}
```

### ReorderRule

```prisma
model ReorderRule {
  id                Int
  organizationId    Int
  productId         Int       // Unique per organization
  minStock          Int       // Reorder point
  maxStock          Int       // Maximum stock level
  reorderQuantity   Int       // Standard order qty
  leadTimeDays      Int
  safetyStock       Int
  enabled           Boolean
  supplierId        Int?
  lastTriggered     DateTime?
}
```

---

## 🔥 Usage Examples

### 1. Receiving New Inventory with Batch Tracking

```typescript
// Step 1: Create inventory batch
const batch = await fetch('/organizations/1/inventory/batches', {
  method: 'POST',
  body: JSON.stringify({
    productId: 123,
    batchNumber: 'BATCH-2026-001',
    quantity: 1000,
    unitCost: 15.5,
    supplierId: 5,
    expiryDate: '2026-12-31',
    warehouseLocation: 'WH1-A1-R5-S3',
  }),
});

// Movement record is automatically created
// Product quantity is automatically updated
```

### 2. Selling Products Using FIFO

```typescript
// Automatically deduct from oldest batches first
const result = await fetch('/organizations/1/inventory/batches/product/123/deduct-fifo', {
  method: 'POST',
  body: JSON.stringify({
    quantity: 150,
    referenceType: 'Order',
    referenceId: 789
  })
});

// Returns:
{
  "deductions": [
    {
      "batchId": 456,
      "batchNumber": "BATCH-2026-001",
      "quantityDeducted": 100,
      "unitCost": 15.50,
      "totalCost": 1550
    },
    {
      "batchId": 457,
      "batchNumber": "BATCH-2026-002",
      "quantityDeducted": 50,
      "unitCost": 16.00,
      "totalCost": 800
    }
  ],
  "totalQuantityDeducted": 150,
  "totalCost": 2350
}
```

### 3. Check Products Needing Reorder

```typescript
const needsReorder = await fetch(
  '/organizations/1/inventory/reorder-rules/products/needing-reorder',
);

// Returns:
[
  {
    productId: 123,
    productName: 'Widget A',
    currentStock: 20,
    minStock: 50,
    maxStock: 500,
    stockShortfall: 30,
    suggestedOrderQuantity: 480,
    priority: 'HIGH',
    supplier: {
      id: 5,
      name: 'ABC Supplier',
      phone: '+254...',
    },
  },
];
```

### 4. Track Expiring Products

```typescript
// Get batches expiring in next 30 days
const expiring = await fetch(
  '/organizations/1/inventory/batches/expiring/soon?days=30',
);

// Get already expired batches
const expired = await fetch('/organizations/1/inventory/batches/expired/all');

// Mark batch as expired
await fetch('/organizations/1/inventory/batches/456/mark-expired', {
  method: 'POST',
});
```

### 5. View Complete Audit Trail

```typescript
// Get all movements for a product
const movements = await fetch(
  '/organizations/1/inventory/movements/product/123?limit=100',
);

// Get movements for specific batch
const batchMovements = await fetch(
  '/organizations/1/inventory/movements/batch/456',
);

// Get daily movement summary
const daily = await fetch(
  '/organizations/1/inventory/movements/analytics/daily?date=2026-01-11',
);

// Get movement trends
const trends = await fetch(
  '/organizations/1/inventory/movements/analytics/trends?days=30',
);
```

---

## 🔧 Migration Guide

Run the Prisma migration to add all new tables:

```bash
npx prisma migrate dev --name add_modern_inventory_tracking
```

This will create:

- inventory_batches
- serial_numbers
- inventory_movements
- warehouse_locations
- reorder_rules
- stock_adjustments
- quality_inspections
- stock_reservations
- inventory_valuations

---

## 📝 Next Steps (Phase 2)

Additional features ready for implementation:

1. **Serial Number Tracking** - For high-value items
2. **Stock Adjustments & Cycle Counts** - Physical inventory verification
3. **Quality Inspections** - Incoming/outgoing QC
4. **Stock Reservations** - Reserve stock for pending orders
5. **Inventory Valuation** - FIFO/LIFO/Weighted Average costing
6. **Multi-UOM Support** - Buy in bulk, sell in pieces
7. **Barcode Generation** - Print batch/product labels
8. **Advanced Analytics** - ABC analysis, turnover ratios, aging reports

---

## 🎯 Benefits

✅ **Complete Traceability** - Know exactly where every unit came from and went  
✅ **Accurate COGS** - Batch-level costing for precise profitability  
✅ **Expiry Management** - Never sell expired products  
✅ **Automated Reordering** - Never run out of stock  
✅ **Audit Compliance** - Full movement history  
✅ **Loss Prevention** - Track damages, theft, and waste  
✅ **Optimized Storage** - Warehouse location management  
✅ **Better Forecasting** - Historical movement data

---

## 📞 Support

For questions or issues, contact the development team.
