# Sales Person Tracking Feature

## Overview

This feature allows tracking of both who created an order (for audit purposes) and who the sale belongs to (for sales reports and commissions). This is particularly useful in scenarios like salons where one person records sales but the sale belongs to another staff member.

## Key Concepts

### Two Types of User Tracking:

1. **Created By (`userId`)**: Who physically created the order in the system (for audit trail)
2. **Sales Person (`salesPersonId`)**: Who the sale belongs to (for commission calculations and sales reports)

### Default Behavior:
- If no sales person is selected, the sale automatically belongs to the person who created it
- Current logged-in user is pre-selected as the default sales person in the UI

---

## Backend Changes

### 1. Database Schema (Prisma)

**File**: `apps/backend/prisma/schema.prisma`

Added two new fields to the `Order` model:

```prisma
model Order {
  // ... existing fields ...

  userId             Int                // Who created the order (for audit trail)
  user               User               @relation(fields: [userId], references: [id])

  salesPersonId      Int?               // Who the sale belongs to (for commissions & sales reports)
  salesPerson        User?              @relation("SalesPersonOrders", fields: [salesPersonId], references: [id])

  // ... other fields ...
}
```

**User Model Update**:
```prisma
model User {
  // ... existing relations ...

  // Sales person orders (for commissions & sales reports)
  salesPersonOrders Order[] @relation("SalesPersonOrders")

  // ... other relations ...
}
```

**Migration**: `20260131080602_add_sales_person_to_orders`

### 2. Backend DTO

**File**: `apps/backend/src/orders/orders.dto.ts`

Added optional field:

```typescript
export class OrderDto {
  // ... existing fields ...

  // Sales person tracking (who the sale belongs to)
  @IsNumber()
  @IsOptional()
  salesPersonId?: number;

  // ... other fields ...
}
```

### 3. Orders Service

**File**: `apps/backend/src/orders/orders.service.ts`

#### Order Creation (Line 151-173):
```typescript
const createdOrder = await tx.order.create({
  data: {
    organizationId,
    receiptNumber,
    // ... other fields ...
    userId, // Who created the order (for audit trail)
    created_by: dto.created_by,
    salesPersonId: dto.salesPersonId || userId, // Who the sale belongs to (defaults to creator)
    // ... other fields ...
  },
});
```

#### Commission Creation (Line 240-243):
```typescript
// Create commission records (async, don't block order creation)
// Use salesPersonId if provided, otherwise use userId (creator)
const commissionUserId = dto.salesPersonId || userId;
this.createCommissionRecords(organizationId, order.id, commissionUserId, dto.items);
```

#### Get All Orders (Line 388-431):
Now includes sales person information:

```typescript
select: {
  // ... other fields ...
  salesPersonId: true,
  salesPerson: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
  user: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
  // ... other fields ...
}
```

### 4. User Service Endpoint

**Existing Endpoint**: `GET /auth/users/organization/:id`

**File**: `apps/backend/src/user/user.controller.ts` (Line 45-48)

This endpoint was already available and returns all users in an organization (excluding passwords).

---

## Frontend Changes

### 1. Auth Service

**File**: `apps/frontend/src/app/shared/Services/auth.service.ts`

Added method to fetch organization users:

```typescript
getUsersByOrganization(organizationId: number): Observable<UserInterface[]> {
  const url = `${this.apiUrll}/users/organization/${organizationId}`;
  return this.httpClient.get<UserInterface[]>(url);
}
```

### 2. Sales Interface

**File**: `apps/frontend/src/app/shared/interfaces/sales.interface.ts`

Added `salesPersonId` to the Sales interface:

```typescript
export interface Sales {
  // ... existing fields ...
  salesPersonId?: number; // Who the sale belongs to (for commissions & sales reports)
  // ... other fields ...
}
```

### 3. Cash Sales Component

**File**: `apps/frontend/src/app/modules/sales/components/cash-sales/cash-sales.component.ts`

#### New Properties:
```typescript
// Sales person tracking
organizationUsers: any[] = [];
selectedSalesPersonId: number | null = null;
isLoadingUsers: boolean = false;
```

#### Constructor:
Added `AuthService` injection:

```typescript
constructor(
  // ... other services ...
  private authService: AuthService,
  // ... other services ...
) {
  this.initializeComponent();
}
```

#### ngOnInit:
```typescript
ngOnInit() {
  this.getAllProducts();
  this.getAllCustomers();
  this.loadOrgDetails();
  this.loadPaymentMethods();
  this.currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  this.loadHeldSales();
  this.loadOrganizationUsers(); // NEW
}
```

#### New Method - loadOrganizationUsers() (Line 228-248):
```typescript
loadOrganizationUsers() {
  const currentOrgId = localStorage.getItem('licencedOrg');
  if (!currentOrgId) return;

  this.isLoadingUsers = true;
  this.authService.getUsersByOrganization(+currentOrgId).subscribe({
    next: (users: any[]) => {
      this.organizationUsers = users;
      // Set current user as default sales person
      if (this.currentUser && this.currentUser.id) {
        this.selectedSalesPersonId = this.currentUser.id;
      }
      this.isLoadingUsers = false;
    },
    error: (error) => {
      console.error('Error loading organization users:', error);
      this.toast.error('Failed to load users');
      this.isLoadingUsers = false;
    },
  });
}
```

#### submitOrder() Method (Line 587-614):
Added `salesPersonId` to the sales object:

```typescript
const sales: Sales = {
  items: this.selectedProducts.map((product) => {
    // ... product mapping ...
  }),
  // ... other fields ...
  created_by: this.currentUser.username,
  salesPersonId: this.selectedSalesPersonId || undefined, // NEW
  printerIp: '192.168.1.6',
  isVoided: false,
  payments: payments,
};
```

### 4. Cash Sales Template

**File**: `apps/frontend/src/app/modules/sales/components/cash-sales/cash-sales.component.html`

Added sales person selector in the checkout section (Line 163-182):

```html
<!-- Sales Person Selection -->
<div class="mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
  <label for="salesPerson" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
    Sales Person <span class="text-gray-500 text-xs">(Who does this sale belong to?)</span>
  </label>
  <select
    id="salesPerson"
    [(ngModel)]="selectedSalesPersonId"
    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
    [disabled]="isLoadingUsers"
  >
    <option [value]="null" disabled>Select Sales Person</option>
    <option *ngFor="let user of organizationUsers" [value]="user.id">
      {{ user.fullName }} <span class="text-gray-500" *ngIf="user.id === currentUser?.id">(You)</span>
    </option>
  </select>
  <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
    This determines who gets commission for this sale. Defaults to you.
  </p>
</div>
```

---

## How It Works

### User Flow:

1. **User logs in** and navigates to cash sales
2. **Component loads** and fetches all users in the organization
3. **Current user is pre-selected** as the default sales person
4. **User can change** the sales person from dropdown (e.g., receptionist recording sale for a stylist)
5. **Order is created** with both:
   - `userId`: The logged-in user (audit trail)
   - `salesPersonId`: The selected sales person (for commissions)
6. **Commission is calculated** based on `salesPersonId`, not `userId`

### Commission Calculation:

The commission service now uses `salesPersonId` instead of `userId` when creating commission records:

```typescript
// In orders.service.ts (Line 240-243)
const commissionUserId = dto.salesPersonId || userId;
this.createCommissionRecords(organizationId, order.id, commissionUserId, dto.items);
```

This ensures that:
- The person who made the sale gets the commission
- Even if someone else recorded the order in the system

---

## Use Cases

### 1. Salon/Spa
- Receptionist records sales for different stylists/therapists
- Each stylist gets commission for their own sales
- Audit trail shows who recorded each transaction

### 2. Retail Store
- Store manager records sales on behalf of sales staff
- Sales staff get credit and commission for their sales
- Management can track who's recording transactions

### 3. Restaurant/Bar
- Cashier records orders for different waiters
- Waiters get commission/tips tracked properly
- System knows who served the customer

---

## API Changes

### Create Order Endpoint: `POST /orders`

**New Optional Field**:
```json
{
  "items": [...],
  "total": 1000,
  "salesPersonId": 5,  // NEW - Optional, defaults to userId if not provided
  // ... other fields ...
}
```

### Get Orders Endpoint: `GET /orders`

**Response now includes**:
```json
{
  "orders": [
    {
      "id": 1,
      "total": 1000,
      "salesPersonId": 5,
      "salesPerson": {
        "id": 5,
        "fullName": "John Doe",
        "email": "john@example.com"
      },
      "user": {
        "id": 3,
        "fullName": "Jane Smith",
        "email": "jane@example.com"
      },
      // ... other fields ...
    }
  ]
}
```

---

## Testing Checklist

- [ ] Create order without selecting sales person (should default to current user)
- [ ] Create order with different sales person selected
- [ ] Verify commission is created for the sales person, not the creator
- [ ] Check order list shows both creator and sales person
- [ ] Verify sales reports are attributed to the correct sales person
- [ ] Test with multiple users from the same organization
- [ ] Test loading users list in the dropdown
- [ ] Verify dark mode styling works correctly

---

## Database Migration

Run the migration:
```bash
cd apps/backend
npx prisma migrate deploy
```

Or in development:
```bash
npx prisma migrate dev
```

The migration adds the `salesPersonId` column to the `orders` table as a nullable foreign key to the `users` table.

---

## Notes

1. **Backward Compatibility**: Existing orders won't have a `salesPersonId`, which is fine since it's nullable
2. **Default Behavior**: If no sales person is selected, it defaults to the user who created the order
3. **Commission Impact**: All new commissions will be based on `salesPersonId` instead of `userId`
4. **Audit Trail**: The `userId` and `created_by` fields still track who created the order

---

## Future Enhancements

1. Add sales person filter to reports
2. Create sales person performance dashboard
3. Add ability to reassign sales to different users
4. Track sales person commission totals by date range
5. Add sales person leaderboard
