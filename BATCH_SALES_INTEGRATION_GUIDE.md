# Batch Tracking Sales Integration Guide

## Current System Analysis

### ✅ What You Have

**Backend - Batch Tracking Service:**

- ✅ `deductInventoryFIFO()` - Automatically allocates stock using FIFO method
- ✅ `getBatchesByProductFIFO()` - Gets batches ordered by oldest first
- ✅ `getBatchesByProductFEFO()` - Gets batches ordered by earliest expiry
- ✅ Automatic movement tracking (InventoryMovement records)
- ✅ Batch status updates (DEPLETED when quantity = 0)
- ✅ Cost tracking per batch

**Backend - Orders Service:**

- ✅ `createOrder()` - Creates sales orders
- ✅ `bulkUpdateProductQuantities()` - Deducts product quantities
- ⚠️ **NOT using batch tracking** - directly decrements product.quantity

**Database:**

- ✅ `InventoryBatch` table with batches
- ✅ `InventoryMovement` table for tracking
- ✅ `Order.items` field (JSON) stores sold items
- ⚠️ No `Order.batchAllocations` field to track which batches were used

---

## 🎯 Integration Strategy

### Option 1: Automatic Batch Allocation (Recommended)

**Best for:** Businesses that want FIFO/FEFO without manual intervention

#### Backend Changes Needed:

1. **Update Orders Service** - Replace `bulkUpdateProductQuantities()` with batch allocation:

```typescript
// File: apps/backend/src/orders/orders.service.ts

constructor(
  private readonly prisma: PrismaService,
  private readonly productService: ProductService,
  private readonly printingJobsService: PrintingJobsService,
  private readonly batchTrackingService: BatchTrackingService, // ADD THIS
) {}

private async deductInventoryWithBatchTracking(
  tx: any,
  organizationId: number,
  items: any[],
  orderId: number,
  userId: number,
  userName: string,
) {
  if (!items || items.length === 0) return [];

  const batchAllocations = [];

  for (const item of items) {
    const productId = item.id || item.productId;
    const quantity = item.selectedItems || item.quantity || item.qty || 0;

    if (!productId || quantity <= 0) continue;

    // Check if product tracks batches (skip services)
    const product = await tx.product.findFirst({
      where: {
        id: productId,
        organizationId,
        OR: [{ isService: false }, { isService: null }],
      },
    });

    if (!product) continue;

    try {
      // Use FIFO batch allocation
      const result = await this.batchTrackingService.deductInventoryFIFO(
        organizationId,
        productId,
        quantity,
        userId,
        userName,
        'ORDER', // referenceType
        orderId, // referenceId
      );

      batchAllocations.push({
        productId,
        productName: item.name,
        quantity,
        batches: result.deductions,
        totalCost: result.totalCost,
      });
    } catch (error) {
      console.error(`Error allocating batches for product ${productId}:`, error);
      // Fallback to direct quantity update if batch allocation fails
      await tx.product.update({
        where: { id: productId },
        data: { quantity: { decrement: quantity } },
      });
    }
  }

  return batchAllocations;
}

// Update createOrder method:
async createOrder(organizationId: number, dto: OrderDto, userId: number) {
  // ... existing validation ...

  const order = await this.prisma.$transaction(async (tx) => {
    const createdOrder = await tx.order.create({
      data: {
        // ... existing fields ...
      },
    });

    // Get user info
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    // REPLACE bulkUpdateProductQuantities with batch tracking
    const batchAllocations = await this.deductInventoryWithBatchTracking(
      tx,
      organizationId,
      dto.items,
      createdOrder.id,
      userId,
      user?.username || 'Unknown',
    );

    // Store batch allocations in order metadata (optional)
    await tx.order.update({
      where: { id: createdOrder.id },
      data: {
        // You can add this to schema if needed
        // batchAllocations: batchAllocations,
      },
    });

    // Create payments...
    // ... rest of code ...

    return createdOrder;
  });

  return order;
}
```

2. **Add Batch Allocation to Order Schema** (Optional - for tracking):

```prisma
// File: apps/backend/prisma/schema.prisma

model Order {
  id                  Int             @id @default(autoincrement())
  organizationId      Int
  locationId          Int?
  items               Json
  batchAllocations    Json?           // NEW: Track which batches were used
  total               Float
  // ... rest of fields ...
}
```

#### Frontend Changes:

**No changes needed!** The sales process remains the same:

- User selects products
- System automatically allocates from oldest/expiring batches
- Order is created with batch tracking in background

---

### Option 2: Manual Batch Selection

**Best for:** Businesses that want to manually choose which batch to sell from

#### Backend Changes:

1. **Add Batch Selection to Order DTO:**

```typescript
// File: apps/backend/src/orders/orders.dto.ts

export class OrderItemWithBatch {
  id: number;
  name: string;
  price: number;
  selectedItems: number;
  batchId?: number; // Optional: specify which batch to use
}

export class OrderDto {
  items: OrderItemWithBatch[];
  // ... rest of fields ...
}
```

2. **Update Order Service to Use Specified Batches:**

```typescript
private async deductSpecificBatches(
  tx: any,
  organizationId: number,
  items: OrderItemWithBatch[],
  orderId: number,
  userId: number,
  userName: string,
) {
  for (const item of items) {
    if (item.batchId) {
      // Use specified batch
      const batch = await tx.inventoryBatch.findFirst({
        where: { id: item.batchId, organizationId },
      });

      if (!batch || batch.availableQuantity < item.selectedItems) {
        throw new BadRequestException(
          `Batch ${item.batchId} has insufficient quantity`
        );
      }

      // Deduct from specific batch
      await this.batchTrackingService.deductFromBatch(
        organizationId,
        item.batchId,
        item.selectedItems,
        userId,
        userName,
        'ORDER',
        orderId,
      );
    } else {
      // No batch specified - use FIFO
      await this.batchTrackingService.deductInventoryFIFO(
        organizationId,
        item.id,
        item.selectedItems,
        userId,
        userName,
        'ORDER',
        orderId,
      );
    }
  }
}
```

#### Frontend Changes:

1. **Add Batch Selection to Sales Page:**

```typescript
// File: apps/frontend/src/app/modules/sales/sales.component.ts

interface SaleItem {
  id: number;
  name: string;
  selectedItems: number;
  availableBatches?: InventoryBatch[]; // NEW
  selectedBatchId?: number; // NEW
}

async loadBatchesForProduct(productId: number) {
  this.batchService.getBatchesByProduct(productId).subscribe({
    next: (batches) => {
      const item = this.selectedProducts.find(p => p.id === productId);
      if (item) {
        item.availableBatches = batches;
      }
    }
  });
}
```

2. **Update Sales Template:**

```html
<!-- Show batch selection dropdown for each product -->
<tr *ngFor="let item of selectedProducts">
  <td>{{ item.name }}</td>
  <td>
    <input type="number" [(ngModel)]="item.selectedItems" />
  </td>
  <td>
    <!-- NEW: Batch selection -->
    <select
      [(ngModel)]="item.selectedBatchId"
      (focus)="loadBatchesForProduct(item.id)"
    >
      <option value="">Auto (FIFO)</option>
      <option *ngFor="let batch of item.availableBatches" [value]="batch.id">
        {{ batch.batch_number }} - Available: {{ batch.quantity_available }}
      </option>
    </select>
  </td>
</tr>
```

---

## 🚀 Recommended Implementation Steps

### Phase 1: Automatic Integration (1-2 hours)

1. ✅ Inject `BatchTrackingService` into `OrdersService`
2. ✅ Create `deductInventoryWithBatchTracking()` method
3. ✅ Replace `bulkUpdateProductQuantities()` call in `createOrder()`
4. ✅ Test with existing sales - should work without frontend changes

### Phase 2: Reporting & Visibility (2-3 hours)

1. ✅ Add batch allocation data to order response
2. ✅ Create endpoint to view batch history for an order
3. ✅ Update sales receipts to show batch numbers (optional)
4. ✅ Add batch analytics to reports

### Phase 3: Manual Selection (Optional - 3-4 hours)

1. ✅ Update Order DTO to accept batchId
2. ✅ Update frontend sales page with batch dropdown
3. ✅ Add validation for batch availability
4. ✅ Update UI to show batch details

---

## 📊 Benefits After Integration

### Automatic Benefits:

- ✅ **FIFO/FEFO compliance** - Oldest/expiring stock sold first
- ✅ **Full audit trail** - Know exactly which batch each sale came from
- ✅ **Automatic expiry management** - System prioritizes expiring batches
- ✅ **Cost tracking** - Accurate COGS per sale based on batch costs
- ✅ **Zero UI changes** - Existing sales flow continues to work

### Reporting Benefits:

- ✅ Track which batches contributed to each sale
- ✅ Calculate actual profit margins using batch costs
- ✅ Identify slow-moving batches
- ✅ Recall specific batches if needed (quality issues)

---

## 🔧 Quick Start Implementation

**Minimal code changes to enable batch tracking:**

```typescript
// apps/backend/src/orders/orders.service.ts

// 1. Import BatchTrackingService
import { BatchTrackingService } from '../inventory/services/batch-tracking.service';

// 2. Inject in constructor
constructor(
  private readonly batchTrackingService: BatchTrackingService,
  // ... existing services
) {}

// 3. Replace this line in createOrder():
// await this.bulkUpdateProductQuantities(tx, organizationId, dto.items);

// With this:
for (const item of dto.items) {
  const productId = item.id || item.productId;
  const quantity = item.selectedItems || item.quantity || 0;

  try {
    await this.batchTrackingService.deductInventoryFIFO(
      organizationId,
      productId,
      quantity,
      userId,
      dto.created_by,
      'ORDER',
      createdOrder.id,
    );
  } catch (error) {
    // Fallback to simple deduction if no batches
    await tx.product.update({
      where: { id: productId },
      data: { quantity: { decrement: quantity } }
    });
  }
}
```

That's it! Your sales will now use batch tracking automatically.

---

## 🎛️ Configuration Options

You can make batch tracking configurable per organization:

```typescript
// Check org settings before using batch tracking
const orgSettings = await this.prisma.organization.findUnique({
  where: { id: organizationId },
  select: { useBatchTracking: true }
});

if (orgSettings?.useBatchTracking) {
  // Use batch allocation
  await this.batchTrackingService.deductInventoryFIFO(...);
} else {
  // Use simple quantity deduction
  await this.bulkUpdateProductQuantities(...);
}
```

---

## 📝 Testing Checklist

- [ ] Create batches for a product
- [ ] Make a sale of that product
- [ ] Verify batch quantity decreased
- [ ] Check InventoryMovement table has sale record
- [ ] Verify product.quantity also decreased
- [ ] Test with insufficient batch quantity
- [ ] Test with products that have no batches (should fallback)
- [ ] Test FIFO order (oldest batch used first)
- [ ] View order details - should show which batches were used

---

## 🐛 Common Issues & Solutions

**Issue:** "Insufficient inventory" error even though product.quantity shows stock
**Solution:** Product has quantity but no batches. Either create batches or add fallback logic.

**Issue:** Sales are slow after adding batch tracking
**Solution:** Add database indexes on `InventoryBatch.productId` and `InventoryBatch.organizationId`

**Issue:** Want to sell from newest batches instead of oldest (LIFO)
**Solution:** Copy `getBatchesByProductFIFO()` and change `orderBy: { receivedDate: 'desc' }`

---

## 📞 Next Steps

1. **Decide on approach:** Automatic (recommended) or Manual selection
2. **Implement backend changes** (30 minutes)
3. **Test with sample sales** (15 minutes)
4. **Monitor InventoryMovement table** to verify tracking
5. **Add reporting/UI enhancements** (optional)

The batch tracking system is already built and ready - you just need to connect it to your sales flow!
