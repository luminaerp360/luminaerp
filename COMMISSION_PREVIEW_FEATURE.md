# Commission Preview & Editing at Point of Sale

## Overview

This feature allows sales staff to preview and adjust commission rates for each item **before** completing a sale. This is useful when:

- Products have commission but you want to disable it for specific sales
- Different users have different commission rates for the same product
- You need to temporarily adjust commission rates at the point of sale
- You want to see the total commission before finalizing the sale

## Features

### 1. **Commission Preview**
- View commission breakdown for each item in the cart
- See total commission for the entire sale
- Automatically updates when sales person changes
- Real-time calculation based on product prices and quantities

### 2. **Per-Item Commission Control**
- ✅ **Enable/Disable** - Toggle commission for individual items
- ✅ **Edit Rate** - Change commission percentage or fixed amount
- ✅ **Switch Type** - Change between PERCENTAGE and FIXED commission
- ✅ **Visual Indicators** - See which items have been edited

### 3. **Smart Defaults**
- Uses user-specific commission rates if configured
- Falls back to product default commission
- Shows when item has no commission configured

## How It Works

### Backend API

#### Endpoint: `POST /commission/calculate-preview`

**Request:**
```json
{
  "userId": 5,
  "items": [
    {
      "productId": 10,
      "quantity": 2,
      "unitPrice": 1000
    },
    {
      "productId": 15,
      "quantity": 1,
      "unitPrice": 500
    }
  ]
}
```

**Response:**
```json
{
  "items": [
    {
      "productId": 10,
      "productName": "Product A",
      "quantity": 2,
      "saleAmount": 2000,
      "commissionType": "PERCENTAGE",
      "commissionRate": 10,
      "commissionAmount": 200,
      "hasCommission": true,
      "canEdit": true
    },
    {
      "productId": 15,
      "productName": "Product B",
      "quantity": 1,
      "saleAmount": 500,
      "commissionType": "NONE",
      "commissionRate": 0,
      "commissionAmount": 0,
      "hasCommission": false,
      "canEdit": true
    }
  ],
  "totalCommission": 200
}
```

### Commission Calculation Logic

1. **Check for user-specific rate** first (from `UserProductCommission` table)
2. **Fall back to product default** if no user-specific rate exists
3. **Return null** if product is not commissionable

**Commission Types:**
- `PERCENTAGE`: `commissionAmount = (saleAmount × rate) / 100`
- `FIXED`: `commissionAmount = rate × quantity`

### Frontend UI

#### Location
The commission preview appears in the checkout section, right below the sales person selector.

#### User Flow

1. **Select Sales Person** - Choose who the sale belongs to
2. **Click "Show Commission"** button (appears when cart has items)
3. **View Commission Breakdown** - See each item's commission
4. **Edit if Needed**:
   - Uncheck "Enable" to remove commission from an item
   - Change commission type (% or Fixed)
   - Adjust the rate value
   - Changes update total in real-time

5. **Complete Sale** - Commission preview is for information/adjustment only

## UI Components

### Commission Preview Panel

```
┌─────────────────────────────────────────────┐
│ Commission Details          KSh 450         │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ Product A                    ☑ Enable   │ │
│ │ Sale: KSh 2,000                         │ │
│ │ ─────────────────────────────────────── │ │
│ │ [%] [10] = KSh 200                      │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Product B                    ☐ Enable   │ │
│ │ Sale: KSh 500                           │ │
│ │ No commission                           │ │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ Total:                          KSh 200     │
└─────────────────────────────────────────────┘
```

### Visual Indicators

- **Blue Border** - Default commission (not edited)
- **Yellow Border** - Edited commission (✏️ icon)
- **Green Text** - Commission amounts
- **Gray Italic** - No commission

## Code Implementation

### Backend Service Method

**File**: `apps/backend/src/commission/commission.service.ts`

```typescript
async calculateCommissionPreview(
  organizationId: number,
  userId: number,
  items: Array<{ productId: number; quantity: number; unitPrice: number }>,
) {
  const commissions = await Promise.all(
    items.map(async (item) => {
      const commission = await this.calculateCommission(
        organizationId,
        userId,
        item.productId,
        item.quantity,
        item.unitPrice,
      );

      return commission
        ? {
            ...commission,
            hasCommission: true,
            canEdit: true,
          }
        : {
            productId: item.productId,
            productName: '',
            quantity: item.quantity,
            saleAmount: item.quantity * item.unitPrice,
            commissionType: 'NONE',
            commissionRate: 0,
            commissionAmount: 0,
            hasCommission: false,
            canEdit: true,
          };
    }),
  );

  const totalCommission = commissions.reduce(
    (sum, c) => sum + c.commissionAmount,
    0,
  );

  return {
    items: commissions,
    totalCommission: parseFloat(totalCommission.toFixed(2)),
  };
}
```

### Frontend Component Methods

**File**: `apps/frontend/src/app/modules/sales/components/cash-sales/cash-sales.component.ts`

#### Calculate Preview
```typescript
calculateCommissionPreview() {
  if (!this.selectedSalesPersonId || this.selectedProducts.length === 0) {
    this.commissionPreview = null;
    return;
  }

  const currentOrgId = localStorage.getItem('licencedOrg');
  if (!currentOrgId) return;

  this.loadingCommission = true;

  const items = this.selectedProducts.map((p) => ({
    productId: p.id,
    quantity: p.selectedItems || 1,
    unitPrice: p.price || 0,
  }));

  this.commissionService
    .calculatePreview(+currentOrgId, this.selectedSalesPersonId, items)
    .subscribe({
      next: (preview) => {
        this.commissionPreview = preview;
        this.commissionItems = preview.items.map((item: any, index: number) => ({
          ...item,
          productName: this.selectedProducts[index]?.name || item.productName,
          originalAmount: item.commissionAmount,
          isEdited: false,
        }));
        this.loadingCommission = false;
      },
      error: (error) => {
        console.error('Error calculating commission:', error);
        this.loadingCommission = false;
      },
    });
}
```

#### Update Item Commission
```typescript
updateItemCommission(index: number, enabled: boolean, rate?: number, type?: string) {
  if (!this.commissionItems[index]) return;

  const item = this.commissionItems[index];

  if (!enabled) {
    // Disable commission for this item
    item.hasCommission = false;
    item.commissionAmount = 0;
    item.isEdited = true;
  } else if (rate !== undefined && type) {
    // Update commission rate/type
    item.commissionRate = rate;
    item.commissionType = type;
    item.isEdited = true;

    // Recalculate amount
    if (type === 'PERCENTAGE') {
      item.commissionAmount = (item.saleAmount * rate) / 100;
    } else if (type === 'FIXED') {
      item.commissionAmount = rate * item.quantity;
    }
    item.hasCommission = true;
  }

  // Recalculate total
  this.commissionPreview.totalCommission = this.commissionItems.reduce(
    (sum, c) => sum + (c.commissionAmount || 0),
    0
  );
}
```

## Use Cases

### Scenario 1: Stylist with Different Commission Rates

**Situation**: A salon stylist gets 15% commission on haircuts but only 5% on product sales.

**How it works**:
1. Select the stylist as the sales person
2. Click "Show Commission"
3. System shows:
   - Haircut: 15% = KSh 150
   - Shampoo: 5% = KSh 25
4. Total: KSh 175

### Scenario 2: Promotional Sale (No Commission)

**Situation**: Running a promotion where staff don't earn commission on discounted items.

**How it works**:
1. Add promotional items to cart
2. Open commission preview
3. Uncheck "Enable" for promotional items
4. Only non-promotional items have commission
5. Complete sale

### Scenario 3: Custom Commission for VIP Sale

**Situation**: Manager wants to give extra commission for closing a big VIP sale.

**How it works**:
1. Add items to cart
2. Open commission preview
3. Change commission type to "Fixed"
4. Enter bonus amount (e.g., KSh 5000)
5. System shows updated total
6. Complete sale

### Scenario 4: Staff Member with No Product Commission

**Situation**: Receptionist records sale for another staff member who doesn't have commission configured for certain products.

**How it works**:
1. Select the staff member
2. Open commission preview
3. See which items have "No commission"
4. Optionally enable and set commission manually
5. Complete sale

## Benefits

### For Sales Staff
- ✅ **Transparency** - See exactly what they'll earn before completing sale
- ✅ **Motivation** - Visual feedback on commission amounts
- ✅ **Flexibility** - Can adjust rates when needed (with proper permissions)

### For Management
- ✅ **Control** - Review and adjust commissions at point of sale
- ✅ **Accuracy** - Catch commission calculation errors before sale completes
- ✅ **Flexibility** - Handle special cases and exceptions easily

### For Business
- ✅ **Accuracy** - Reduce commission disputes
- ✅ **Flexibility** - Handle complex commission scenarios
- ✅ **Audit Trail** - All commission calculations are logged (when sale completes)

## Important Notes

### 1. Preview Only (Currently)
- The commission preview currently shows calculated commissions
- **Future Enhancement**: Save edited commission rates when sale is created
- Currently, actual commission is calculated on backend during order creation

### 2. Permissions
- Any user can view commission preview
- **Future Enhancement**: Add permission check for editing commission rates

### 3. Commission Calculation Priority
1. User-specific product commission (if exists)
2. Product default commission (if product is commissionable)
3. No commission (if product not commissionable)

### 4. Real-Time Updates
- Preview updates when:
  - Sales person changes
  - User clicks "Show Commission"
  - **Future**: Cart items change (add/remove/quantity update)

## Future Enhancements

1. **Save Edited Commissions** - Store manual adjustments with the order
2. **Permissions Control** - Restrict who can edit commissions
3. **Auto-Refresh** - Update preview when cart changes
4. **Commission Templates** - Save common commission configurations
5. **Approval Workflow** - Require manager approval for commission changes above certain threshold
6. **History Tracking** - Show commission edit history per sale

## Testing

### Test Scenarios

1. ✅ **Product with commission** - Should show correct calculation
2. ✅ **Product without commission** - Should show "No commission"
3. ✅ **User-specific rate** - Should use custom rate instead of default
4. ✅ **Disable commission** - Should set amount to 0
5. ✅ **Change commission type** - Should recalculate correctly
6. ✅ **Change commission rate** - Should update amount and total
7. ✅ **Sales person change** - Should refresh preview
8. ✅ **Multiple items** - Should calculate total correctly
9. ✅ **Empty cart** - Should not show preview button

## API Reference

### Calculate Commission Preview

**Endpoint**: `POST /commission/calculate-preview`

**Query Parameters**:
- `organizationId` (required): Organization ID

**Request Body**:
```typescript
{
  userId: number;
  items: Array<{
    productId: number;
    quantity: number;
    unitPrice: number;
  }>;
}
```

**Response**:
```typescript
{
  items: Array<{
    productId: number;
    productName: string;
    quantity: number;
    saleAmount: number;
    commissionType: string; // 'PERCENTAGE' | 'FIXED' | 'NONE'
    commissionRate: number;
    commissionAmount: number;
    hasCommission: boolean;
    canEdit: boolean;
  }>;
  totalCommission: number;
}
```

**Example**:
```bash
POST http://localhost:3000/commission/calculate-preview?organizationId=1
Content-Type: application/json

{
  "userId": 5,
  "items": [
    { "productId": 10, "quantity": 2, "unitPrice": 1000 },
    { "productId": 15, "quantity": 1, "unitPrice": 500 }
  ]
}
```

---

**Last Updated**: January 2026
**Version**: 1.0.0
