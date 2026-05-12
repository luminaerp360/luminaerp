# Commission System - Complete Implementation Guide

## Overview

The commission system is now fully implemented and ready to use. It automatically tracks commissions on sales and invoices, supports multiple commission types (percentage and fixed), and allows user-specific commission rate overrides.

## System Architecture

### Backend Components

#### 1. Database Schema (`apps/backend/prisma/schema.prisma`)

- **Product Model**: Extended with commission fields
  - `isCommissionable`: Enable/disable commission for a product
  - `defaultCommissionType`: PERCENTAGE or FIXED
  - `defaultCommissionValue`: Rate (e.g., 10 for 10% or Ksh 50/unit)

- **UserProductCommission Model**: User-specific commission overrides
  - Links users to products with custom commission rates
  - Overrides the product's default commission

- **CommissionRecord Model**: Transaction records
  - Automatically created when sales/invoices are made
  - Tracks: source (ORDER/INVOICE), quantity, amounts, rates, status

- **CommissionPayment Model**: Payment tracking
  - Records when commissions are paid
  - Includes payment method, reference, notes

#### 2. Commission Service (`apps/backend/src/commission/commission.service.ts`)

Key methods:

- `calculateCommission()`: Calculate commission based on rate type
- `createOrderCommissions()`: Auto-create records from orders
- `createInvoiceCommissions()`: Auto-create records from invoices
- `markCommissionsAsPaid()`: Batch payment processing
- `getUserCommissionSummary()`: Dashboard stats
- `getOrganizationStats()`: Organization-wide analytics

#### 3. API Endpoints (`apps/backend/src/commission/commission.controller.ts`)

- `GET /commission/:organizationId/summary?userId=X` - User summary stats
- `GET /commission/:organizationId/records?userId=X&status=Y` - Commission records
- `GET /commission/:organizationId/stats` - Organization statistics
- `GET /commission/:organizationId/user-rates/:userId` - User's custom rates
- `POST /commission/:organizationId/user-rates` - Create custom rate
- `DELETE /commission/:organizationId/user-rates/:userId/:productId` - Delete custom rate
- `POST /commission/:organizationId/mark-paid` - Mark commissions as paid
- `GET /commission/:organizationId/payments` - Payment history

### Frontend Components

#### 1. Commission Dashboard (`apps/frontend/src/app/modules/commission/components/commission-dashboard`)

**Purpose**: Overview of commission statistics and recent records

**Features**:

- Organization-wide stats (Total, Pending, Paid, Month)
- Recent pending commission records (last 10)
- Quick navigation to other commission pages
- Auto-refresh capability

**Access**: Navigate to `/commission/dashboard`

#### 2. User Commission Rates (`apps/frontend/src/app/modules/commission/components/user-commission-rates`)

**Purpose**: Manage user-specific commission rate overrides

**Features**:

- Select user from dropdown
- View all products with default vs custom rates
- Add custom commission rates for specific users/products
- Delete custom rates (reverts to default)
- Shows available products (those not already customized)

**Access**: Navigate to `/commission/user-rates`

**Use Case**: When a specific salesperson needs a different commission rate than the default

#### 3. Commission Records (`apps/frontend/src/app/modules/commission/components/commission-records`)

**Purpose**: View and manage all commission transaction records

**Features**:

- Filter by user, status, date range
- Bulk selection for batch payment
- Mark multiple commissions as paid at once
- Payment tracking (method, reference, notes)
- Summary statistics (total records, total amount, pending count)

**Access**: Navigate to `/commission/records`

## How to Use

### 1. Enable Commission on Products

1. Navigate to Products page
2. Create or edit a product
3. Find the "Commission Settings" section
4. Toggle "Enable Commission" ON
5. Select commission type:
   - **Percentage**: Enter value like 10 (for 10%)
   - **Fixed**: Enter amount in Ksh (e.g., 50 for Ksh 50 per unit)
6. Save the product

### 2. Set User-Specific Rates (Optional)

1. Navigate to `/commission/user-rates`
2. Select a user from the dropdown
3. Click "Add Custom Rate"
4. Select a product
5. Choose commission type and enter value
6. Save

**Example**:

- Product: Widget A (default 10% commission)
- User: John Doe needs 15% commission on Widget A
- Result: John gets 15%, everyone else gets 10%

### 3. Automatic Commission Tracking

Commissions are automatically created when:

- A sale (order) is completed
- An invoice is created

**How it works**:

1. User makes a sale containing commissionable products
2. System checks for user-specific rates, otherwise uses default
3. Commission record is created with:
   - User ID (the salesperson)
   - Product details
   - Quantity sold
   - Sale amount
   - Commission amount
   - Status: PENDING

### 4. View Commission Dashboard

Navigate to `/commission/dashboard` to see:

- **Total Commissions**: All-time total
- **Pending**: Unpaid commissions
- **Paid**: Completed payments
- **This Month**: Current month's commissions
- **Recent Records**: Latest pending commissions

### 5. Process Payments

**Option A: Single User Payment**

1. Navigate to `/commission/records`
2. Select a specific user from filter
3. Select status "Pending"
4. Check the commissions to pay
5. Click "Mark as Paid"
6. Enter payment method (Cash/Bank Transfer/M-Pesa/Cheque)
7. Add payment reference (optional, e.g., transaction ID)
8. Add notes (optional)
9. Confirm payment

**Option B: Bulk Payment**

1. Navigate to `/commission/records`
2. Filter by desired criteria (user, dates, etc.)
3. Use the "Select All" checkbox or select individual records
4. Total amount is displayed
5. Click "Mark as Paid"
6. Complete payment details
7. All selected commissions are marked as paid at once

## Commission Calculation Examples

### Example 1: Percentage Commission

- **Product**: Laptop (15% commission)
- **Sale Price**: Ksh 50,000
- **Quantity**: 2 units
- **Total Sale**: Ksh 100,000
- **Commission**: 100,000 × 0.15 = **Ksh 15,000**

### Example 2: Fixed Commission

- **Product**: Mouse (Ksh 50 commission per unit)
- **Sale Price**: Ksh 500 each
- **Quantity**: 10 units
- **Total Sale**: Ksh 5,000
- **Commission**: 10 × 50 = **Ksh 500**

### Example 3: User Override

- **Product**: Keyboard (default 10% commission)
- **User Override**: Sarah gets 12%
- **Sale Price**: Ksh 3,000 each
- **Quantity**: 5 units
- **Total Sale**: Ksh 15,000
- **Sarah's Commission**: 15,000 × 0.12 = **Ksh 1,800**
- **Other users' Commission**: 15,000 × 0.10 = **Ksh 1,500**

## Database Migration

The commission system uses migration: `20260117090556_add_commission_system`

**Already Applied**: The migration has been successfully applied to your database.

**If you need to apply it manually** (on a new environment):

```bash
cd apps/backend
npx prisma migrate deploy
```

## API Usage Examples

### Get User Commission Summary

```typescript
GET /commission/1/summary?userId=5

Response:
{
  "totalCommission": 125000,
  "pendingCommission": 45000,
  "paidCommission": 80000,
  "recordCount": 42
}
```

### Get Commission Records

```typescript
GET /commission/1/records?userId=5&status=PENDING

Response: [
  {
    "id": 123,
    "userId": 5,
    "productId": 10,
    "productName": "Laptop",
    "quantitySold": 2,
    "totalSaleAmount": 100000,
    "commissionType": "PERCENTAGE",
    "commissionRate": 15,
    "commissionAmount": 15000,
    "status": "PENDING",
    "sourceType": "ORDER",
    "sourceId": 456,
    "createdAt": "2025-01-17T10:00:00Z"
  }
]
```

### Mark as Paid

```typescript
POST /commission/1/mark-paid

Body:
{
  "commissionIds": [123, 124, 125],
  "paymentMethod": "BANK_TRANSFER",
  "paymentReference": "TXN123456",
  "notes": "Monthly commission payment - January 2025"
}
```

## Commission Statuses

- **PENDING**: Commission earned but not yet paid
- **PAID**: Commission has been paid to the user
- **CANCELLED**: Commission was voided (e.g., sale refunded)

## Permissions

The commission module requires the `sales` permission:

- Users without `sales` permission cannot access commission pages
- Configured in the route: `data: { requiredPermission: 'sales' }`

**To grant access**: Update user permissions in the settings module.

## Testing the Complete Flow

### End-to-End Test:

1. **Setup**:
   - Create a product: "Test Widget"
   - Enable commission: 10% (PERCENTAGE)
   - Save

2. **Sale**:
   - Go to Sales page
   - Make a sale with "Test Widget"
   - Quantity: 5, Price: Ksh 1,000 each
   - Total: Ksh 5,000
   - Complete the sale

3. **Verify Commission Created**:
   - Navigate to `/commission/records`
   - Filter by your user
   - You should see: 1 record, Ksh 500 commission (10% of 5,000)

4. **View Dashboard**:
   - Navigate to `/commission/dashboard`
   - "Pending" should show Ksh 500
   - "Recent Records" should show your commission

5. **Process Payment**:
   - Go to `/commission/records`
   - Select your commission record
   - Click "Mark as Paid"
   - Enter: Method = Cash, Reference = "Test Payment"
   - Confirm

6. **Verify Payment**:
   - Dashboard "Paid" should now show Ksh 500
   - Record should show status "PAID" with payment date

## Troubleshooting

### Commission not created on sale

**Check**:

1. Product has `isCommissionable` = true
2. Product has commission type and value set
3. Check console for errors
4. Verify OrdersService and InvoiceService are calling CommissionService

### User not seeing their commissions

**Check**:

1. User has `sales` permission
2. Correct organization selected
3. Filter settings in commission records page

### Commission amount is wrong

**Check**:

1. Product commission settings (type and value)
2. User-specific overrides in user-rates page
3. Sale quantity and price

## Future Enhancements (Optional)

1. **Commission Reports**: Monthly/yearly commission reports
2. **Export**: Export commission data to Excel/PDF
3. **Approval Workflow**: Require manager approval before payment
4. **Tiered Commissions**: Different rates for different sales tiers
5. **Target-Based Commissions**: Bonus commissions for hitting targets
6. **Email Notifications**: Notify users when commissions are paid

## Files Modified/Created

### Backend

- `apps/backend/prisma/schema.prisma`
- `apps/backend/src/commission/commission.dto.ts`
- `apps/backend/src/commission/commission.service.ts`
- `apps/backend/src/commission/commission.controller.ts`
- `apps/backend/src/commission/commission.module.ts`
- `apps/backend/src/app.module.ts`
- `apps/backend/src/products/product.dto.ts`
- `apps/backend/src/products/products.service.ts`
- `apps/backend/src/orders/orders.service.ts`
- `apps/backend/src/orders/orders.module.ts`
- `apps/backend/src/invoices/invoice.service.ts`
- `apps/backend/src/invoices/invoice.module.ts`

### Frontend

- `apps/frontend/src/app/shared/interfaces/commission.interface.ts`
- `apps/frontend/src/app/shared/Services/commission/commission.service.ts`
- `apps/frontend/src/app/shared/interfaces/products.ts`
- `apps/frontend/src/app/modules/commission/commission.module.ts`
- `apps/frontend/src/app/modules/commission/commission-routing.module.ts`
- `apps/frontend/src/app/modules/commission/components/commission-dashboard/*`
- `apps/frontend/src/app/modules/commission/components/user-commission-rates/*`
- `apps/frontend/src/app/modules/commission/components/commission-records/*`
- `apps/frontend/src/app/modules/categories-products/components/products/add-products/*`
- `apps/frontend/src/app/app-routing.module.ts`

## Support

For issues or questions about the commission system, check:

1. Browser console for errors
2. Backend logs
3. Database commission tables: `Product`, `UserProductCommission`, `CommissionRecord`, `CommissionPayment`
