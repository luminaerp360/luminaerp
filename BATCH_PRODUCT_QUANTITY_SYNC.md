# Batch-Product Quantity Synchronization Guide

## Overview

This document explains how inventory batches automatically update product quantities in the Lumina ERP system. When a batch is created, the system ensures that product stock levels are immediately synchronized.

## Architecture

### Backend Flow (NestJS)

**Location**: `apps/backend/src/inventory/services/batch-tracking.service.ts`

When a batch is created via `createBatch()` method:

1. **Validates Product Exists**

   ```typescript
   const product = await this.prisma.product.findFirst({
     where: { id: dto.product_id, organizationId },
   });
   ```

2. **Creates Inventory Batch**

   ```typescript
   const batch = await this.prisma.inventoryBatch.create({
     data: {
       productId: dto.product_id,
       batchNumber: dto.batch_number,
       quantity: dto.quantity_received,
       initialQuantity: dto.quantity_received,
       availableQuantity: dto.quantity_received,
       unitCost: dto.buying_price,
       // ... other fields
     },
   });
   ```

3. **Creates Movement Record** (for audit trail)

   ```typescript
   await this.prisma.inventoryMovement.create({
     data: {
       productId: dto.product_id,
       batchId: batch.id,
       movementType: MovementType.PURCHASE,
       quantityChange: dto.quantity_received,
       // ... other fields
     },
   });
   ```

4. **Updates Product Quantity** ✅
   ```typescript
   await this.prisma.product.update({
     where: { id: dto.product_id },
     data: {
       quantity: { increment: dto.quantity_received },
       buyingPrice: dto.buying_price, // Updates latest purchase price
     },
   });
   ```

### Frontend Flow (Angular)

**Location**: `apps/frontend/src/app/modules/inventory/components/batch-management/`

**Before Enhancement:**

- Created batch successfully
- Reloaded batch list
- ❌ Product quantity not visibly updated in UI

**After Enhancement:**

- Creates batch successfully
- ✅ Shows toast notification with quantity change
- ✅ Emits event for parent components
- ✅ Reloads all data including products
- ✅ Refreshes product stock when viewing batch details

## Key Features

### 1. Automatic Quantity Increment

When you create a batch with `quantity_received: 100`:

- Product stock increases by +100 automatically
- No manual product update needed

### 2. Buying Price Sync

If the batch buying price differs from the current product buying price:

- Product buying price is updated to the latest purchase price
- Ensures pricing data stays current

### 3. Audit Trail

Every batch creation generates:

- **InventoryBatch** record
- **InventoryMovement** record (tracks the quantity change)
- **Product** quantity update

### 4. Frontend Notifications

Enhanced user feedback:

```typescript
this.toast.success(
  `Batch created successfully. Product quantity updated by +${quantityAdded}`,
);
```

### 5. Event Emission

Parent components can listen for batch creation:

```html
<app-batch-management
  (batchCreated)="onBatchCreated($event)"
></app-batch-management>
```

Event payload:

```typescript
{
  batchId: number;
  productId: number;
  quantityAdded: number;
}
```

## API Endpoints

### Create Batch

```http
POST /organizations/{organizationId}/inventory-management/batches
```

**Request Body:**

```json
{
  "product_id": 123,
  "batch_number": "BATCH-20260202-001",
  "quantity_received": 100,
  "buying_price": 25.5,
  "supplier_id": 45,
  "expiry_date": "2027-12-31",
  "warehouse_location_id": "A1-B2-C3",
  "notes": "Monthly stock replenishment"
}
```

**Response:**

```json
{
  "id": 456,
  "product_id": 123,
  "batch_number": "BATCH-20260202-001",
  "quantity_received": 100,
  "quantity_available": 100,
  "buying_price": 25.5,
  "status": "ACTIVE",
  "updated_product_quantity": 550
  // ... other fields
}
```

## Database Schema

### InventoryBatch Table

```prisma
model InventoryBatch {
  id                Int       @id @default(autoincrement())
  organizationId    Int
  productId         Int
  batchNumber       String    @unique
  quantity          Int       // Current total quantity
  initialQuantity   Int       // Original quantity received
  availableQuantity Int       // Available for allocation
  unitCost          Float     // Buying price for this batch
  status            BatchStatus
  // ... other fields

  product           Product   @relation(fields: [productId])
}
```

### Product Table

```prisma
model Product {
  id          Int     @id @default(autoincrement())
  name        String
  quantity    Int     // ← Automatically updated when batch created
  buyingPrice Float?  // ← Optionally updated to latest purchase price
  // ... other fields

  batches     InventoryBatch[]
}
```

### InventoryMovement Table

```prisma
model InventoryMovement {
  id             Int          @id @default(autoincrement())
  productId      Int
  batchId        Int?
  movementType   MovementType // PURCHASE, SALE, ADJUSTMENT, etc.
  quantityChange Int          // Amount added/removed
  quantityBefore Int
  quantityAfter  Int
  // ... other fields
}
```

## Usage Examples

### Example 1: Create Batch from Frontend

```typescript
// In your component
const batchData: CreateBatchDto = {
  product_id: 123,
  batch_number: "BATCH-20260202-001",
  quantity_received: 100,
  buying_price: 25.5,
  supplier_id: 45,
  expiry_date: "2027-12-31",
};

this.batchService.createBatch(batchData).subscribe({
  next: (batch) => {
    console.log("Batch created:", batch);
    console.log("Product quantity now:", batch.updated_product_quantity);
    // Product quantity automatically increased by 100
  },
  error: (error) => {
    console.error("Failed to create batch:", error);
  },
});
```

### Example 2: Listen for Batch Creation Events

**Parent Component Template:**

```html
<app-batch-management (batchCreated)="handleBatchCreated($event)">
</app-batch-management>
```

**Parent Component TypeScript:**

```typescript
handleBatchCreated(event: { batchId: number; productId: number; quantityAdded: number }) {
  console.log(`Batch ${event.batchId} created`);
  console.log(`Product ${event.productId} increased by ${event.quantityAdded}`);

  // Refresh product list or update specific product
  this.refreshProductData(event.productId);
}
```

### Example 3: View Updated Product Stock in Batch Details

The batch details modal now shows the current product stock:

```typescript
// When viewing batch details
viewBatchDetails(batch: InventoryBatch): void {
  const productStock = this.getCurrentProductStock(batch.product_id);
  console.log(`Current product stock: ${productStock}`);
  // Display this in the UI
}
```

## Best Practices

### ✅ DO:

1. Always create batches through the batch management system
2. Let the system handle product quantity updates automatically
3. Use the batch system for all inventory receipts
4. Monitor the InventoryMovement table for audit trails

### ❌ DON'T:

1. Manually update product quantities when receiving stock
2. Create products with initial stock - use batches instead
3. Bypass the batch system for stock updates
4. Delete batches without proper stock adjustment

## Sync and Reconciliation

### Manual Sync (if needed)

If product quantities get out of sync, use these endpoints:

```http
# Sync all products in organization
POST /organizations/{organizationId}/inventory-management/batches/sync-quantities

# Sync specific product
POST /organizations/{organizationId}/inventory-management/batches/sync-product/{productId}
```

These will recalculate product quantities based on all active batches.

## Troubleshooting

### Issue: Product quantity not updating

**Check:**

1. Verify batch was created successfully (check response)
2. Check browser console for errors
3. Refresh the product list manually
4. Verify product exists and belongs to same organization

**Solution:**

```typescript
// Force refresh products after batch creation
this.loadData(); // In batch-management.component.ts
```

### Issue: Quantity showing wrong value

**Check:**

1. Multiple batches for same product
2. Recent sales/adjustments
3. Manual quantity edits

**Solution:**
Run sync endpoint to recalculate from batches:

```bash
curl -X POST \
  'http://localhost:3000/organizations/1/inventory-management/batches/sync-product/123' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

## Related Documentation

- [MODERN_INVENTORY_SYSTEM.md](apps/backend/MODERN_INVENTORY_SYSTEM.md) - Complete inventory system guide
- [BATCH_SALES_INTEGRATION_GUIDE.md](BATCH_SALES_INTEGRATION_GUIDE.md) - How batches integrate with sales
- [FRONTEND_INTEGRATION_GUIDE.md](FRONTEND_INTEGRATION_GUIDE.md) - Frontend API patterns

## Code Changes Summary

### Backend Changes

✅ **Already implemented** - Batch creation updates product quantity

**Enhancement added:**

- Now also updates product `buyingPrice` to latest purchase price
- Returns `updated_product_quantity` in response

### Frontend Changes

✅ **New features:**

- Event emitter for batch creation (`@Output() batchCreated`)
- Enhanced toast notification showing quantity change
- Product stock refresh when viewing batch details
- Helper methods: `getCurrentProductStock()`, `getProductDetails()`
- Automatic data reload after batch creation

## Testing

### Test Scenario 1: Basic Batch Creation

1. Create product with quantity 0
2. Create batch with quantity_received = 100
3. Verify product quantity is now 100

### Test Scenario 2: Multiple Batches

1. Create product with quantity 0
2. Create batch #1 with quantity = 50
3. Create batch #2 with quantity = 75
4. Verify product quantity is now 125

### Test Scenario 3: Price Update

1. Create product with buyingPrice = 20.00
2. Create batch with buying_price = 25.50
3. Verify product buyingPrice is now 25.50

## Conclusion

The batch-product quantity synchronization is fully automated in both backend and frontend. When you create a batch:

1. ✅ Product quantity increments automatically
2. ✅ Product buying price updates (if different)
3. ✅ Movement record created for audit
4. ✅ Frontend shows update notification
5. ✅ UI refreshes to reflect changes

No manual intervention needed - the system handles everything automatically! 🎉
