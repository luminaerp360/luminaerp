# Batch Approval Workflow Guide

## Overview

The batch approval workflow allows you to create batches that require approval before updating product stock quantities. This provides better control and oversight of inventory receipts.

## How It Works

### 1. Create Batch (PENDING Status)

When you create a new batch:

- ✅ Batch is created with `PENDING` status
- ✅ Inventory movement record is created (marked as pending)
- ❌ Product quantity is **NOT updated yet**
- ℹ️ Batch awaits approval

```typescript
// Frontend: Create batch
const batchData = {
  product_id: 123,
  batch_number: "BATCH-20260202-001",
  quantity_received: 100,
  buying_price: 25.5,
  // ... other fields
};

this.batchService.createBatch(batchData).subscribe((result) => {
  // result.status === 'PENDING'
  // result.is_approved === false
  // result.requires_approval === true
});
```

### 2. Review Pending Batches

View all batches awaiting approval:

- Frontend: Switch to "Pending" tab in batch management
- Backend: Query batches with `status: PENDING`

```typescript
// Frontend: Get pending batches
this.pendingBatches = this.batches.filter(
  (b) => b.status === BatchStatus.PENDING,
);
```

### 3. Approve Batch

**Before Approval:**

- Batch status: `PENDING`
- Product quantity: Unchanged
- Can edit or delete batch

**After Approval:**

- ✅ Batch status changes to `ACTIVE`
- ✅ Product quantity increases by batch quantity
- ✅ Product buying price updated (if different)
- ✅ Approval audit trail recorded
- ❌ Cannot delete batch anymore

```typescript
// Frontend: Approve batch
this.batchService.approveBatch(batchId).subscribe((result) => {
  // result.status === 'ACTIVE'
  // result.is_approved === true
  // result.approved_at === current timestamp
  // result.updated_product_quantity === new product total
});
```

### 4. Reject Batch (Optional)

If batch is rejected:

- Batch status changes to `QUARANTINE`
- Product quantity remains unchanged
- Rejection reason is recorded
- Can still delete the batch

```typescript
// Frontend: Reject batch
this.batchService
  .rejectBatch(batchId, "Damaged goods received")
  .subscribe((result) => {
    // result.status === 'QUARANTINE'
    // result.rejected_at === current timestamp
    // result.rejection_reason === 'Damaged goods received'
  });
```

### 5. Edit Pending Batch

You can edit batches **only if they are pending**:

```typescript
// Frontend: Edit pending batch
const updates = {
  quantity_available: 90,
  notes: "Updated quantity after inspection",
};

this.batchService.updateBatch(batchId, updates).subscribe((result) => {
  // Batch updated successfully
});
```

### 6. Delete Pending Batch

You can delete batches **only if they are NOT approved**:

```typescript
// Frontend: Delete pending batch
this.batchService.deleteBatch(batchId).subscribe((result) => {
  // Batch deleted successfully
});
```

## Database Schema Changes

### BatchStatus Enum

```prisma
enum BatchStatus {
  PENDING      // ← NEW: Awaiting approval
  ACTIVE       // Approved and in use
  QUARANTINE   // Rejected or on hold
  EXPIRED      // Past expiry date
  DEPLETED     // Quantity exhausted
  RECALLED     // Product recall
}
```

### InventoryBatch Model

```prisma
model InventoryBatch {
  // ... existing fields

  status            BatchStatus  @default(PENDING)  // ← Changed default

  // NEW: Approval tracking fields
  isApproved        Boolean      @default(false)
  approvedBy        Int?
  approvedByName    String?
  approvedAt        DateTime?
  rejectedBy        Int?
  rejectedByName    String?
  rejectedAt        DateTime?
  rejectionReason   String?
}
```

## API Endpoints

### Create Batch (PENDING)

```http
POST /organizations/{organizationId}/inventory-management/batches
Content-Type: application/json

{
  "product_id": 123,
  "batch_number": "BATCH-20260202-001",
  "quantity_received": 100,
  "buying_price": 25.50,
  "supplier_id": 45
}
```

**Response:**

```json
{
  "id": 456,
  "status": "PENDING",
  "is_approved": false,
  "requires_approval": true,
  "quantity_received": 100
}
```

### Approve Batch

```http
POST /organizations/{organizationId}/inventory-management/batches/{batchId}/approve
```

**Response:**

```json
{
  "id": 456,
  "status": "ACTIVE",
  "is_approved": true,
  "approved_at": "2026-02-02T18:30:00Z",
  "approved_by_name": "Admin User",
  "updated_product_quantity": 550
}
```

### Reject Batch

```http
POST /organizations/{organizationId}/inventory-management/batches/{batchId}/reject
Content-Type: application/json

{
  "reason": "Damaged goods received"
}
```

**Response:**

```json
{
  "id": 456,
  "status": "QUARANTINE",
  "rejected_at": "2026-02-02T18:35:00Z",
  "rejected_by_name": "Admin User",
  "rejection_reason": "Damaged goods received"
}
```

### Update Batch (Pending Only)

```http
PUT /organizations/{organizationId}/inventory-management/batches/{batchId}
Content-Type: application/json

{
  "quantity_available": 90,
  "notes": "Quantity adjusted after inspection"
}
```

### Delete Batch (Pending/Rejected Only)

```http
DELETE /organizations/{organizationId}/inventory-management/batches/{batchId}
```

## Backend Service Methods

### createBatch

```typescript
async createBatch(organizationId, dto, createdBy, createdByName) {
  // Creates batch with PENDING status
  // Does NOT update product quantity
  // Creates pending movement record
  return {
    status: 'PENDING',
    is_approved: false,
    requires_approval: true
  };
}
```

### approveBatch

```typescript
async approveBatch(organizationId, batchId, approvedBy, approvedByName) {
  // Changes status to ACTIVE
  // Updates product quantity (increment)
  // Updates product buying price
  // Records approval details
  return {
    status: 'ACTIVE',
    is_approved: true,
    updated_product_quantity: newTotal
  };
}
```

### rejectBatch

```typescript
async rejectBatch(organizationId, batchId, rejectedBy, rejectedByName, reason) {
  // Changes status to QUARANTINE
  // Does NOT update product quantity
  // Records rejection details
}
```

### updateBatch

```typescript
async updateBatch(organizationId, batchId, dto, updatedBy, updatedByName) {
  // Prevents editing if batch is approved
  // Allows editing pending batches
  // Only updates product quantity for approved batches
}
```

### deleteBatch

```typescript
async deleteBatch(organizationId, batchId) {
  // Only deletes if NOT approved
  // Removes all related records (movements, serial numbers)
  // Throws error if batch is approved
}
```

## Frontend Component Updates

### Batch Management Component

**New Features:**

1. **Pending Batches Tab**
   - Shows all batches awaiting approval
   - Displays approve/reject/edit/delete actions

2. **Approval Actions**
   - Approve button (green) - Updates product stock
   - Reject button (red) - Marks batch as quarantine
   - Edit button - For pending batches only
   - Delete button - For pending/rejected batches

3. **Status Indicators**
   - PENDING: Yellow badge
   - ACTIVE: Green badge
   - QUARANTINE: Orange badge

**New Methods:**

```typescript
approveBatch(batch: InventoryBatch): void
rejectBatch(batch: InventoryBatch): void
deletePendingBatch(batch: InventoryBatch): void
```

## Workflow Diagram

```
┌─────────────────┐
│  Create Batch   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Status: PENDING │
│ Approved: false │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────┐   ┌─────┐
│Edit │   │Delete│
└─────┘   └─────┘
    │         │
    └────┬────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│Approve │ │Reject  │
└───┬────┘ └───┬────┘
    │          │
    ▼          ▼
┌────────┐ ┌──────────┐
│ACTIVE  │ │QUARANTINE│
│+Stock  │ │No Stock  │
└────────┘ └──────────┘
```

## Use Cases

### Use Case 1: Normal Approval

1. Warehouse receives 100 units
2. Create batch with qty: 100, status: PENDING
3. Manager reviews batch
4. Manager approves batch
5. Product stock increases by 100
6. Batch status: ACTIVE

### Use Case 2: Reject Damaged Goods

1. Warehouse receives 50 units
2. Create batch with qty: 50, status: PENDING
3. Quality inspector finds damage
4. Inspector rejects batch with reason
5. Product stock unchanged
6. Batch status: QUARANTINE
7. Option to delete batch or adjust quantity

### Use Case 3: Edit Before Approval

1. Create batch with qty: 200, status: PENDING
2. Discover actual count is 190
3. Edit batch quantity to 190
4. Approve batch
5. Product stock increases by 190
6. Batch status: ACTIVE

### Use Case 4: Delete Incorrect Entry

1. Create batch by mistake
2. Delete pending batch
3. No product stock change
4. Batch removed from system

## Business Rules

### ✅ ALLOWED Operations

**Pending Batches:**

- ✅ Edit (quantity, notes, location)
- ✅ Delete
- ✅ Approve
- ✅ Reject

**Approved Batches:**

- ✅ View
- ✅ Update status (EXPIRED, RECALLED, etc.)
- ✅ Create adjustments (separate flow)

**Rejected Batches:**

- ✅ View
- ✅ Delete
- ✅ Edit (if re-evaluating)

### ❌ PROHIBITED Operations

**Approved Batches:**

- ❌ Delete
- ❌ Edit quantity directly
- ❌ Reject

**All Batches:**

- ❌ Approve twice
- ❌ Bypass approval workflow

## Migration Steps

### 1. Run Database Migration

```bash
cd apps/backend
npx prisma migrate dev --name add-batch-approval-fields
npx prisma generate
```

### 2. Update Existing Batches (Optional)

```sql
-- Mark all existing batches as approved
UPDATE "inventory_batches"
SET
  "isApproved" = true,
  "status" = 'ACTIVE',
  "approvedAt" = "createdAt",
  "approvedByName" = 'System Migration'
WHERE "status" = 'ACTIVE';
```

### 3. Test the Workflow

1. Create a new batch
2. Verify it's PENDING
3. Check product quantity unchanged
4. Approve the batch
5. Verify product quantity increased
6. Test rejection flow
7. Test delete pending batch

## Security Considerations

### Permissions

- **Create Batch**: Warehouse staff, Admins
- **Approve Batch**: Managers, Admins only
- **Reject Batch**: Managers, Admins only
- **Delete Batch**: Managers, Admins only

### Audit Trail

All approval actions are tracked:

- Who approved/rejected
- When approved/rejected
- Rejection reason (if applicable)
- Stored in `InventoryBatch` table

## Best Practices

### ✅ DO:

1. Always review batch details before approving
2. Provide detailed rejection reasons
3. Use quality inspection before approval
4. Keep audit trail intact
5. Train staff on approval workflow

### ❌ DON'T:

1. Approve batches without verification
2. Delete approved batches (use adjustments)
3. Edit quantities after approval
4. Bypass approval for convenience
5. Approve your own created batches (if possible)

## Troubleshooting

### Issue: Cannot approve batch

**Error:** "Only pending batches can be approved"
**Solution:** Check batch status - must be PENDING

### Issue: Cannot delete batch

**Error:** "Cannot delete approved batch"
**Solution:** Approved batches cannot be deleted. Use adjustment instead.

### Issue: Cannot edit batch

**Error:** "Cannot edit approved batch"
**Solution:** Create a new adjustment record instead of editing

### Issue: Product quantity not updating

**Cause:** Batch is still PENDING
**Solution:** Approve the batch to update product quantity

## Related Documentation

- [BATCH_PRODUCT_QUANTITY_SYNC.md](BATCH_PRODUCT_QUANTITY_SYNC.md) - Quantity synchronization
- [MODERN_INVENTORY_SYSTEM.md](apps/backend/MODERN_INVENTORY_SYSTEM.md) - Full inventory guide
- [BATCH_SALES_INTEGRATION_GUIDE.md](BATCH_SALES_INTEGRATION_GUIDE.md) - Batch-sales integration

## Summary

The batch approval workflow provides:

- ✅ Control over inventory receipts
- ✅ Two-step verification process
- ✅ Complete audit trail
- ✅ Ability to review before stock update
- ✅ Option to reject/edit/delete before approval
- ✅ Product quantities only update on approval

This ensures better accuracy and oversight of inventory management! 🎯
