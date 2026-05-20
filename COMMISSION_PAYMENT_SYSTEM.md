# Commission Payment System

## Overview

Enhanced commission payment system supporting multiple payment methods, bulk payments, and period-based payment processing - similar to the invoice payment recording system.

## Key Features

### 1. **Multiple Payment Methods Support**
- Pay commissions using one or more payment methods in a single transaction
- Supports all payment methods configured in the organization (Cash, M-Pesa, Bank Transfer, etc.)
- Tracks payment breakdown by method with transaction codes

### 2. **Bulk Payment Options**
- **Pay All Unpaid**: Pay all pending commissions for a user regardless of date
- **Pay by Period**: Pay all pending commissions within a specific date range
- Automatic calculation and validation of commission totals

### 3. **Payment Tracking**
- Generate unique batch numbers for each payment (format: `COMM-YYYY-#####`)
- Track payment date, payer, notes, and payment reference
- Complete audit trail of all commission payments
- Payment breakdown showing exact amounts per payment method

## Database Schema

### New/Updated Models

#### CommissionPayment (Enhanced)
```prisma
model CommissionPayment {
  id                Int                           @id @default(autoincrement())
  organizationId    Int
  batchNumber       String                        // COMM-2026-00001
  userId            Int
  totalAmount       Float
  paymentMethod     String                        @default("MULTIPLE")
  paymentDate       DateTime
  commissionIds     Json                          // Array of commission record IDs
  paidBy            String
  notes             String?
  startDate         DateTime?                     // For period-based payments
  endDate           DateTime?                     // For period-based payments
  paymentType       String                        @default("MANUAL")
  createdAt         DateTime                      @default(now())
  updatedAt         DateTime                      @updatedAt
  organization      Organization                  @relation(...)
  user              User                          @relation(...)
  paymentBreakdown  CommissionPaymentBreakdown[]  // NEW RELATION
}
```

#### CommissionPaymentBreakdown (New)
```prisma
model CommissionPaymentBreakdown {
  id                  Int               @id @default(autoincrement())
  commissionPaymentId Int
  paymentMethodId     Int?
  paymentMethodCode   String            // CASH, MPESA, BANK, etc.
  paymentMethodName   String            // Display name
  amount              Float
  transactionCode     String?           // M-Pesa code, check number, etc.
  notes               String?
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt
  commissionPayment   CommissionPayment @relation(...)
}
```

## Backend API

### Endpoints

#### 1. Pay Commissions (Multiple Payment Methods)
```
POST /commission/pay?organizationId={id}
```

**Request Body:**
```json
{
  "commissionIds": [1, 2, 3, 4],
  "paymentMethods": [
    {
      "paymentMethodId": 1,
      "paymentMethodCode": "CASH",
      "paymentMethodName": "Cash",
      "amount": 5000,
      "transactionCode": null,
      "notes": null
    },
    {
      "paymentMethodId": 2,
      "paymentMethodCode": "MPESA",
      "paymentMethodName": "M-Pesa",
      "amount": 3000,
      "transactionCode": "QRS123XYZ",
      "notes": "M-Pesa payment"
    }
  ],
  "notes": "Commission payment for sales team"
}
```

**Response:**
```json
{
  "success": true,
  "payment": {
    "id": 45,
    "batchNumber": "COMM-2026-00045",
    "userId": 5,
    "totalAmount": 8000,
    "paymentMethod": "MULTIPLE",
    "paymentDate": "2026-05-20T10:30:00Z",
    "user": {
      "id": 5,
      "fullName": "John Doe",
      "email": "john@example.com"
    },
    "paymentBreakdown": [
      {
        "id": 89,
        "paymentMethodCode": "CASH",
        "paymentMethodName": "Cash",
        "amount": 5000
      },
      {
        "id": 90,
        "paymentMethodCode": "MPESA",
        "paymentMethodName": "M-Pesa",
        "amount": 3000,
        "transactionCode": "QRS123XYZ"
      }
    ]
  },
  "recordsUpdated": 4,
  "totalAmount": 8000
}
```

#### 2. Bulk Pay Commissions
```
POST /commission/bulk-pay?organizationId={id}
```

**Request Body (Pay All Unpaid):**
```json
{
  "userId": 5,
  "paymentType": "ALL_UNPAID",
  "paymentMethods": [
    {
      "paymentMethodCode": "BANK",
      "paymentMethodName": "Bank Transfer",
      "amount": 25000,
      "transactionCode": "TRX456789"
    }
  ],
  "notes": "Monthly commission payout"
}
```

**Request Body (Pay by Period):**
```json
{
  "userId": 5,
  "paymentType": "PERIOD",
  "startDate": "2026-05-01",
  "endDate": "2026-05-31",
  "paymentMethods": [
    {
      "paymentMethodCode": "CASH",
      "paymentMethodName": "Cash",
      "amount": 15000
    }
  ],
  "notes": "May 2026 commissions"
}
```

#### 3. Get Unpaid Commission Summary
```
GET /commission/unpaid-summary/:userId?organizationId={id}
```

**Response:**
```json
{
  "userId": 5,
  "recordCount": 12,
  "totalAmount": 15450.50,
  "oldestCommissionDate": "2026-04-15T08:00:00Z",
  "newestCommissionDate": "2026-05-19T16:30:00Z",
  "records": [...]
}
```

#### 4. Get Payment History
```
GET /commission/payment-history?organizationId={id}&userId={id}&startDate={date}&endDate={date}
```

**Response:**
```json
[
  {
    "id": 45,
    "batchNumber": "COMM-2026-00045",
    "userId": 5,
    "totalAmount": 8000,
    "paymentMethod": "MULTIPLE",
    "paymentDate": "2026-05-20T10:30:00Z",
    "paymentType": "MANUAL",
    "paidBy": "Admin User",
    "notes": "Commission payment for sales team",
    "user": {
      "id": 5,
      "fullName": "John Doe",
      "email": "john@example.com"
    },
    "paymentBreakdown": [
      {
        "id": 89,
        "paymentMethodCode": "CASH",
        "paymentMethodName": "Cash",
        "amount": 5000
      },
      {
        "id": 90,
        "paymentMethodCode": "MPESA",
        "paymentMethodName": "M-Pesa",
        "amount": 3000,
        "transactionCode": "QRS123XYZ"
      }
    ]
  }
]
```

## Payment Types

1. **MANUAL** - Individual commission records selected manually
2. **BULK_PERIOD** - All unpaid commissions within a date range
3. **BULK_ALL_UNPAID** - All unpaid commissions regardless of date

## Validation Rules

1. **Payment Amount Match**: Total of payment methods must equal total commission amount
2. **Pending Only**: Can only pay commissions with status "PENDING"
3. **Organization Match**: All records must belong to the same organization
4. **User Match**: All records in a single payment must belong to the same user
5. **Date Range Required**: Period-based payments require both startDate and endDate

## Frontend Implementation Guide

### Commission Dashboard UI Components

#### 1. User Commission List
- Show user name, total pending, total paid
- Click to expand and see commission records
- "Pay All" button for bulk payment
- "Pay Selected" button for manual selection

#### 2. Payment Modal (Similar to Invoice Payment)
```typescript
interface PaymentModalData {
  userId: number;
  userName: string;
  commissionRecords: CommissionRecord[];
  totalAmount: number;
  paymentType: 'MANUAL' | 'BULK_PERIOD' | 'BULK_ALL_UNPAID';
  dateRange?: { start: Date; end: Date };
}
```

Features:
- Display total amount to pay
- Add multiple payment methods
- Each method has: type dropdown, amount input, transaction code input
- Running total validation
- "Add Payment Method" button
- Notes textarea
- Submit button (disabled until total matches)

#### 3. Payment Method Row Component
```html
<div class="payment-method-row">
  <select [(ngModel)]="method.paymentMethodCode">
    <option *ngFor="let pm of availablePaymentMethods" [value]="pm.code">
      {{pm.displayName}}
    </option>
  </select>

  <input type="number" [(ngModel)]="method.amount" placeholder="Amount" />

  <input type="text" [(ngModel)]="method.transactionCode"
         placeholder="Transaction Code (optional)" />

  <button (click)="removePaymentMethod(i)">Remove</button>
</div>
```

#### 4. Period Selection (for bulk by period)
```html
<div class="period-selector">
  <input type="date" [(ngModel)]="startDate" />
  <span>to</span>
  <input type="date" [(ngModel)]="endDate" />
  <button (click)="loadPeriodCommissions()">Load</button>
</div>
```

### Service Methods (Frontend)

```typescript
// apps/frontend/src/app/shared/Services/commission.service.ts

export class CommissionService {
  private apiUrl = environment.apiMainRootUrl;

  // Pay selected commissions with multiple methods
  payCommissions(
    organizationId: number,
    data: PayCommissionsDto
  ): Observable<any> {
    return this.http.post(
      `${this.apiUrl}commission/pay?organizationId=${organizationId}`,
      data
    );
  }

  // Bulk pay all unpaid or by period
  bulkPayCommissions(
    organizationId: number,
    data: BulkPayCommissionsDto
  ): Observable<any> {
    return this.http.post(
      `${this.apiUrl}commission/bulk-pay?organizationId=${organizationId}`,
      data
    );
  }

  // Get unpaid summary
  getUnpaidSummary(
    organizationId: number,
    userId: number
  ): Observable<any> {
    return this.http.get(
      `${this.apiUrl}commission/unpaid-summary/${userId}?organizationId=${organizationId}`
    );
  }

  // Get payment history
  getPaymentHistory(
    organizationId: number,
    userId?: number,
    startDate?: string,
    endDate?: string
  ): Observable<any> {
    let params = new HttpParams();
    if (userId) params = params.set('userId', userId.toString());
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http.get(
      `${this.apiUrl}commission/payment-history?organizationId=${organizationId}`,
      { params }
    );
  }
}
```

## Usage Scenarios

### Scenario 1: Pay Selected Commissions with Multiple Methods
1. User selects 4 commission records from the list (totaling 8000)
2. Opens payment modal
3. Adds Cash payment: 5000
4. Adds M-Pesa payment: 3000 with transaction code
5. Submits payment
6. System creates payment batch with breakdown
7. Commission records marked as PAID

### Scenario 2: Pay All Unpaid for a User
1. User clicks "Pay All Unpaid" on John's row
2. System loads all pending commissions (15 records, 25000 total)
3. Modal shows summary
4. User selects Bank Transfer, enters amount 25000 and transaction code
5. Submits bulk payment
6. All 15 records marked as PAID with single batch number

### Scenario 3: Pay by Period
1. User selects date range: May 1-31, 2026
2. Clicks "Load Period"
3. System shows 8 records totaling 15000
4. User adds payment methods
5. Submits period-based payment
6. Records marked as PAID with period dates stored

## Benefits

1. **Flexible Payment**: Support for partial payments using multiple methods
2. **Audit Trail**: Complete tracking of who paid, when, how much, and which method
3. **Bulk Processing**: Efficient payment of multiple commissions at once
4. **Reconciliation**: Easy matching with bank statements using transaction codes
5. **Reporting**: Detailed payment history with method breakdown
6. **User-Friendly**: Similar UX to invoice payments (familiar to users)

## Testing Checklist

### Backend
- [ ] Pay single commission with one method
- [ ] Pay multiple commissions with multiple methods
- [ ] Bulk pay all unpaid commissions
- [ ] Bulk pay commissions by period
- [ ] Validate payment amount matches commission total
- [ ] Prevent paying already paid commissions
- [ ] Get unpaid summary returns correct totals
- [ ] Payment history includes breakdown

### Frontend
- [ ] Display unpaid commissions for each user
- [ ] Open payment modal with correct data
- [ ] Add/remove payment methods dynamically
- [ ] Validate total matches before enabling submit
- [ ] Show success/error messages
- [ ] Refresh commission list after payment
- [ ] Display payment history with breakdown
- [ ] Period selection loads correct records

## Next Steps

1. **Frontend Implementation**: Create commission payment UI components
2. **Permission Guards**: Add role-based access control for payments
3. **Email Notifications**: Send payment confirmation to users
4. **PDF Reports**: Generate commission payment receipts
5. **Dashboard Widgets**: Show pending commission totals
6. **Mobile Support**: Optimize UI for mobile devices

## Related Files

- **Backend Service**: `apps/backend/src/commission/commission.service.ts`
- **Backend Controller**: `apps/backend/src/commission/commission.controller.ts`
- **DTOs**: `apps/backend/src/commission/commission.dto.ts`
- **Prisma Schema**: `apps/backend/prisma/schema.prisma`
- **Migration**: `apps/backend/prisma/migrations/20260520000000_add_commission_payment_methods/`
- **Frontend Service** (to create): `apps/frontend/src/app/shared/Services/commission.service.ts`
- **Frontend Component** (to create): `apps/frontend/src/app/modules/commission/components/commission-payment-modal/`

---

**Created**: 2026-05-20
**Last Updated**: 2026-05-20
**Status**: Backend Complete ✅ | Frontend Pending ⏳
