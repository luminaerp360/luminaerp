# Commission System Logging Guide

## Overview

Comprehensive logging has been added to track commission calculations and creation throughout the system. This helps debug commission issues and understand how commissions are calculated.

---

## Log Levels and Emojis

- 📊 **COMMISSION PREVIEW** - Commission preview API calls
- 💰 **COMMISSION CALC** - Individual product commission calculations
- 🎯 **CREATE ORDER COMMISSIONS** - Batch commission creation for orders
- 📋 **ORDER SERVICE** - Order service commission triggers
- 🚀 **Async Operations** - Background commission creation
- ✅ **Success** - Successful operations
- ⚠️ **Warning** - Items without commission
- ❌ **Error** - Failed operations
- 💾 **Database** - Database save operations
- 💵 **Calculation** - Commission amount calculations
- 🔍 **Processing** - Item processing details
- 🎉 **Summary** - Final summary/totals

---

## Commission Preview Flow

### 1. API Request (Controller)
```
📊 [COMMISSION PREVIEW] Request received: {
  organizationId: 1,
  userId: 5,
  itemsCount: 3,
  items: [
    { productId: 10, quantity: 2, unitPrice: 1000 },
    { productId: 15, quantity: 1, unitPrice: 500 },
    { productId: 20, quantity: 3, unitPrice: 200 }
  ]
}
```

### 2. Individual Item Calculations
For each item, you'll see:

```
💰 [COMMISSION CALC] Starting for: {
  organizationId: 1,
  userId: 5,
  productId: 10,
  quantity: 2,
  unitPrice: 1000
}
```

**Then one of:**

#### A. User-Specific Rate Found
```
✅ [COMMISSION CALC] User-specific rate found: {
  userId: 5,
  productId: 10,
  type: 'PERCENTAGE',
  value: 15
}
💵 [COMMISSION CALC] Calculated: {
  productId: 10,
  productName: 'Haircut',
  quantity: 2,
  saleAmount: 2000,
  commissionType: 'PERCENTAGE',
  commissionRate: 15,
  commissionAmount: 300
}
```

#### B. Product Default Rate
```
✅ [COMMISSION CALC] Using product default: {
  productId: 15,
  name: 'Shampoo',
  type: 'PERCENTAGE',
  value: 10
}
💵 [COMMISSION CALC] Calculated: {
  productId: 15,
  productName: 'Shampoo',
  quantity: 1,
  saleAmount: 500,
  commissionType: 'PERCENTAGE',
  commissionRate: 10,
  commissionAmount: 50
}
```

#### C. No Commission
```
❌ [COMMISSION CALC] Product 20 not found
```
or
```
⚠️ [COMMISSION CALC] Product 20 (Service Product) is not commissionable
```

### 3. API Response (Controller)
```
📊 [COMMISSION PREVIEW] Response: {
  totalCommission: 350,
  itemsWithCommission: 2,
  itemsWithoutCommission: 1
}
```

---

## Order Creation Flow

### 1. Order Service Receives Data
```
📋 [ORDER SERVICE] Commission setup: {
  orderId: 123,
  createdBy: 3,
  salesPersonId: 5,
  commissionUserId: 5,
  itemsCount: 3
}
```

**Key Fields:**
- `createdBy` - Who created the order (for audit)
- `salesPersonId` - Who the sale belongs to (from frontend)
- `commissionUserId` - Who gets commission (defaults to createdBy if salesPersonId not provided)

### 2. Commission Service Called
```
🚀 [ORDER SERVICE] Calling createOrderCommissions: {
  organizationId: 1,
  orderId: 123,
  userId: 5,
  itemsCount: 3
}
```

### 3. Commission Creation Starts
```
🎯 [CREATE ORDER COMMISSIONS] Starting: {
  organizationId: 1,
  orderId: 123,
  userId: 5,
  itemsCount: 3
}
```

### 4. Processing Each Item
```
🔍 [CREATE ORDER COMMISSIONS] Processing item: {
  productId: 10,
  quantity: 2,
  unitPrice: 1000,
  itemData: { id: 10, name: 'Haircut', ... }
}
```

**Then calculation logs (same as preview flow above)**

### 5. Creating Commission Record
```
✅ [CREATE ORDER COMMISSIONS] Creating commission record: {
  productId: 10,
  productName: 'Haircut',
  amount: 300
}
```

### 6. Database Save
```
💾 [CREATE ORDER COMMISSIONS] Record saved: {
  id: 456,
  commissionAmount: 300
}
```

### 7. Item Without Commission
```
⚠️ [CREATE ORDER COMMISSIONS] No commission for product 20
```

### 8. Final Summary
```
🎉 [CREATE ORDER COMMISSIONS] Summary: {
  orderId: 123,
  userId: 5,
  totalItems: 3,
  commissionsCreated: 2,
  totalCommissionAmount: 350,
  records: [
    { id: 456, product: 'Haircut', amount: 300 },
    { id: 457, product: 'Shampoo', amount: 50 }
  ]
}
```

### 9. Back to Order Service
```
✅ [ORDER SERVICE] Commission records created for order 123: {
  recordsCreated: 2,
  totalAmount: 350
}
```

---

## Error Scenarios

### Product Not Found
```
❌ [COMMISSION CALC] Product 999 not found
⚠️ [CREATE ORDER COMMISSIONS] No commission for product 999
```

### Product Not Commissionable
```
⚠️ [COMMISSION CALC] Product 20 (Consultation) is not commissionable
⚠️ [CREATE ORDER COMMISSIONS] No commission for product 20
```

### Invalid Item Data
```
⚠️ [CREATE ORDER COMMISSIONS] Skipping item - invalid productId or quantity
```

### Commission Creation Failure
```
❌ [ORDER SERVICE] Failed to create commission records for order 123: Error: ...
```

---

## How to Use These Logs

### 1. **Check If Commission Preview Works**

Look for:
```
📊 [COMMISSION PREVIEW] Request received
```

Then verify each item has:
```
💰 [COMMISSION CALC] Starting for: { productId: X, ... }
✅ [COMMISSION CALC] User-specific rate found  OR  Using product default
💵 [COMMISSION CALC] Calculated: { commissionAmount: X }
```

### 2. **Verify Commission Creation on Sale**

When order is created, look for sequence:
```
📋 [ORDER SERVICE] Commission setup
🚀 [ORDER SERVICE] Calling createOrderCommissions
🎯 [CREATE ORDER COMMISSIONS] Starting
🔍 [CREATE ORDER COMMISSIONS] Processing item  (for each item)
💾 [CREATE ORDER COMMISSIONS] Record saved  (for commissionable items)
🎉 [CREATE ORDER COMMISSIONS] Summary
✅ [ORDER SERVICE] Commission records created
```

### 3. **Debug Missing Commissions**

If commission not created, check logs for:
- ❌ Product not found
- ⚠️ Product not commissionable
- ⚠️ No commission (no rate configured)
- ⚠️ Invalid productId or quantity

### 4. **Verify Correct Commission Amounts**

Check calculation logs:
```
💵 [COMMISSION CALC] Calculated: {
  commissionType: 'PERCENTAGE',
  commissionRate: 10,
  saleAmount: 1000,
  commissionAmount: 100  ← Verify this is correct
}
```

### 5. **Confirm Sales Person Assignment**

Check:
```
📋 [ORDER SERVICE] Commission setup: {
  createdBy: 3,        ← Who recorded the sale
  salesPersonId: 5,    ← Who the sale belongs to
  commissionUserId: 5  ← Who gets commission (should match salesPersonId)
}
```

---

## Common Issues and Solutions

### Issue: No commission created

**Check logs for:**
1. Product exists? Look for `❌ Product X not found`
2. Product commissionable? Look for `⚠️ Product X is not commissionable`
3. Commission rate set? Look for `commissionRate: 0` or `commissionAmount: 0`

**Solution:**
- Make product commissionable in database
- Set default commission rate on product
- Or set user-specific commission rate

### Issue: Wrong commission amount

**Check logs for:**
```
💵 [COMMISSION CALC] Calculated: {
  commissionType: 'PERCENTAGE',
  commissionRate: 10,
  saleAmount: 1000,
  commissionAmount: 100
}
```

**Verify:**
- Commission type is correct (PERCENTAGE vs FIXED)
- Commission rate is correct
- Sale amount is correct (quantity × unitPrice)

### Issue: Commission goes to wrong user

**Check logs for:**
```
📋 [ORDER SERVICE] Commission setup: {
  createdBy: 3,
  salesPersonId: 5,
  commissionUserId: 5  ← Should match salesPersonId
}
```

**Verify:**
- Frontend sends `salesPersonId` in order DTO
- `commissionUserId` matches expected sales person

### Issue: Commission preview differs from actual

**Compare:**

Preview logs:
```
📊 [COMMISSION PREVIEW] Response: {
  totalCommission: 350
}
```

Creation logs:
```
🎉 [CREATE ORDER COMMISSIONS] Summary: {
  totalCommissionAmount: 350  ← Should match preview
}
```

**If different:**
- Check if cart items changed between preview and sale
- Check if sales person changed
- Check if product commission rates changed

---

## Log File Locations

Logs appear in your backend console when running:
```bash
pnpm dev:backend
```

Or in production logs if using PM2/Docker:
```bash
pm2 logs backend
```

---

## Example Complete Flow

```
# 1. User opens commission preview
📊 [COMMISSION PREVIEW] Request received: { userId: 5, itemsCount: 2 }

# 2. Calculate commission for item 1
💰 [COMMISSION CALC] Starting for: { productId: 10, quantity: 2, unitPrice: 1000 }
✅ [COMMISSION CALC] User-specific rate found: { type: 'PERCENTAGE', value: 15 }
💵 [COMMISSION CALC] Calculated: { commissionAmount: 300 }

# 3. Calculate commission for item 2
💰 [COMMISSION CALC] Starting for: { productId: 15, quantity: 1, unitPrice: 500 }
✅ [COMMISSION CALC] Using product default: { type: 'PERCENTAGE', value: 10 }
💵 [COMMISSION CALC] Calculated: { commissionAmount: 50 }

# 4. Return preview
📊 [COMMISSION PREVIEW] Response: { totalCommission: 350, itemsWithCommission: 2 }

# ---- User completes sale ----

# 5. Order created
📋 [ORDER SERVICE] Commission setup: { orderId: 123, commissionUserId: 5 }
🚀 [ORDER SERVICE] Calling createOrderCommissions

# 6. Create commissions
🎯 [CREATE ORDER COMMISSIONS] Starting: { orderId: 123, userId: 5, itemsCount: 2 }

# 7. Process item 1
🔍 [CREATE ORDER COMMISSIONS] Processing item: { productId: 10 }
💰 [COMMISSION CALC] Starting for: { productId: 10 }
✅ [COMMISSION CALC] User-specific rate found
💵 [COMMISSION CALC] Calculated: { commissionAmount: 300 }
✅ [CREATE ORDER COMMISSIONS] Creating commission record: { amount: 300 }
💾 [CREATE ORDER COMMISSIONS] Record saved: { id: 456 }

# 8. Process item 2
🔍 [CREATE ORDER COMMISSIONS] Processing item: { productId: 15 }
💰 [COMMISSION CALC] Starting for: { productId: 15 }
✅ [COMMISSION CALC] Using product default
💵 [COMMISSION CALC] Calculated: { commissionAmount: 50 }
✅ [CREATE ORDER COMMISSIONS] Creating commission record: { amount: 50 }
💾 [CREATE ORDER COMMISSIONS] Record saved: { id: 457 }

# 9. Summary
🎉 [CREATE ORDER COMMISSIONS] Summary: {
  orderId: 123,
  commissionsCreated: 2,
  totalCommissionAmount: 350,
  records: [
    { id: 456, product: 'Haircut', amount: 300 },
    { id: 457, product: 'Shampoo', amount: 50 }
  ]
}

# 10. Done
✅ [ORDER SERVICE] Commission records created for order 123: { recordsCreated: 2, totalAmount: 350 }
```

---

## Testing Commission Logging

### Test 1: Product with Commission
1. Create product with `isCommissionable = true` and commission rate
2. Add to cart and preview commission
3. Check logs show calculation
4. Complete sale
5. Verify commission record created

### Test 2: Product without Commission
1. Create product with `isCommissionable = false`
2. Add to cart and preview
3. Check logs show "not commissionable"
4. Complete sale
5. Verify no commission created

### Test 3: User-Specific Rate
1. Set user-specific commission rate for product
2. Preview commission
3. Check logs show "User-specific rate found"
4. Complete sale
5. Verify correct rate used

### Test 4: Different Sales Person
1. Select different sales person
2. Preview commission
3. Check `commissionUserId` in logs
4. Complete sale
5. Verify commission goes to correct user

---

**Last Updated**: January 2026
**Version**: 1.0.0
