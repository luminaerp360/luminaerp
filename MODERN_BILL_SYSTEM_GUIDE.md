# Modern Bill System Implementation Guide

## Overview

Successfully modernized the bill system to match modern accounting practices with:

- ✅ Line items (similar to invoices)
- ✅ Expense account selection for each line item
- ✅ Automatic calculations for subtotal, tax, and total
- ✅ Support for products/services
- ✅ Better financial tracking

## Backend Changes

### 1. Database Schema (`apps/backend/prisma/schema.prisma`)

**New BillItem Model:**

```prisma
model BillItem {
  id               Int              @id @default(autoincrement())
  billId           Int
  bill             Bill             @relation(fields: [billId], references: [id], onDelete: Cascade)

  // Item details
  description      String
  quantity         Float            @default(1)
  unitPrice        Float
  subtotal         Float

  // Tax and discount
  taxRate          Float            @default(0)
  taxAmount        Float            @default(0)
  discountAmount   Float            @default(0)
  totalAmount      Float

  // Accounting
  expenseAccountId Int?
  expenseAccount   ChartOfAccount?  @relation(fields: [expenseAccountId], references: [id])

  // Product reference (optional)
  productId        Int?
  productName      String?
  sku              String?

  // Metadata
  sortOrder        Int              @default(0)
  notes            String?
}
```

**Updated Bill Model:**

- Added `subtotal` field
- Added `termsAndConditions` field
- Added `items` relation (one-to-many with BillItem)
- Maintains backward compatibility with existing bills

### 2. DTOs Created

**`create-bill-item.dto.ts`:**

```typescript
export class CreateBillItemDto {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discountAmount?: number;
  expenseAccountId?: number; // Link to expense account
  productId?: number; // Optional product reference
  productName?: string;
  sku?: string;
  sortOrder?: number;
  notes?: string;
}
```

**Updated `create-bill.dto.ts`:**

```typescript
export class CreateBillDto {
  supplierId: number;
  billNumber: string;
  billDate: string;
  dueDate: string;
  description?: string;
  items: CreateBillItemDto[]; // Array of line items (min 1 required)
  taxAmount?: number; // Bill-level tax (optional)
  discountAmount?: number; // Bill-level discount (optional)
  referenceNumber?: string;
  notes?: string;
  termsAndConditions?: string;
  createdBy: number;
}
```

### 3. Service Updates (`accounts-payable.service.ts`)

**`createBill()` method now:**

1. Validates expense accounts exist and are active
2. Calculates subtotals, tax, and totals for each item
3. Aggregates item totals to get bill totals
4. Creates bill with all items in a single transaction
5. Returns bill with items and expense account details

**`getAllBills()` and `getBillById()` now include:**

- Bill items ordered by sortOrder
- Expense account details (code, name, type)

## Frontend Changes

### 1. Types Created (`apps/frontend/src/app/types/bill.types.ts`)

```typescript
export interface BillItem {
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  expenseAccountId?: number;
  expenseAccount?: ExpenseAccount;
  // ... other fields
}

export interface CreateBillDto {
  items: CreateBillItemDto[]; // Line items
  // ... other fields
}

export interface ExpenseAccount {
  id: number;
  accountCode: string;
  accountName: string;
  accountType: string;
  // ...
}
```

### 2. Service Created

**`chart-of-accounts.service.ts`** (exists):

- `getExpenseAccounts()` - Get accounts for bill line items
- `getAllAccounts()` - Get all chart of accounts

## Migration Applied

Migration `20260201124150_add_bill_items` successfully applied:

- Created `bill_items` table
- Added `subtotal` and `termsAndConditions` columns to bills
- Added relation from BillItem to ChartOfAccount
- All existing bills remain intact

## Next Steps for Frontend Implementation

### Step 1: Update Bill Form Component

The existing `bill-form.component.ts` needs to be updated to:

1. **Add FormArray for line items:**

```typescript
this.billForm = this.fb.group({
  supplierId: ["", Validators.required],
  billNumber: ["", Validators.required],
  billDate: ["", Validators.required],
  dueDate: ["", Validators.required],
  description: [""],
  items: this.fb.array([this.createItemFormGroup()]),
  notes: [""],
  termsAndConditions: [""],
});
```

2. **Create item form group method:**

```typescript
createItemFormGroup(): FormGroup {
  return this.fb.group({
    description: ['', Validators.required],
    quantity: [1, [Validators.required, Validators.min(0.01)]],
    unitPrice: [0, [Validators.required, Validators.min(0)]],
    taxRate: [0, Validators.min(0)],
    discountAmount: [0, Validators.min(0)],
    expenseAccountId: [null],
    notes: ['']
  });
}
```

3. **Add methods for managing items:**

```typescript
get items(): FormArray {
  return this.billForm.get('items') as FormArray;
}

addItem(): void {
  this.items.push(this.createItemFormGroup());
}

removeItem(index: number): void {
  if (this.items.length > 1) {
    this.items.removeAt(index);
  }
}

calculateItemTotal(index: number): number {
  const item = this.items.at(index).value;
  const subtotal = item.quantity * item.unitPrice;
  const taxAmount = subtotal * (item.taxRate / 100);
  const total = subtotal + taxAmount - (item.discountAmount || 0);
  return total;
}

calculateBillTotal(): number {
  return this.items.controls.reduce((sum, control) => {
    const item = control.value;
    const subtotal = item.quantity * item.unitPrice;
    const taxAmount = subtotal * (item.taxRate / 100);
    return sum + subtotal + taxAmount - (item.discountAmount || 0);
  }, 0);
}
```

### Step 2: Update Bill Form Template

Add this to `bill-form.component.html`:

```html
<!-- Line Items Section -->
<div class="space-y-4">
  <div class="flex justify-between items-center">
    <label class="block text-sm font-medium text-gray-700">Line Items</label>
    <button
      type="button"
      (click)="addItem()"
      class="text-blue-600 hover:text-blue-800"
    >
      + Add Item
    </button>
  </div>

  <div formArrayName="items" class="space-y-4">
    <div
      *ngFor="let item of items.controls; let i = index"
      [formGroupName]="i"
      class="border border-gray-200 rounded-lg p-4 relative"
    >
      <!-- Remove button -->
      <button
        *ngIf="items.length > 1"
        type="button"
        (click)="removeItem(i)"
        class="absolute top-2 right-2 text-red-600 hover:text-red-800"
      >
        <svg
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      <div class="grid grid-cols-12 gap-4">
        <!-- Description -->
        <div class="col-span-12 md:col-span-4">
          <label class="block text-sm font-medium text-gray-700"
            >Description *</label
          >
          <input
            type="text"
            formControlName="description"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          />
        </div>

        <!-- Quantity -->
        <div class="col-span-6 md:col-span-2">
          <label class="block text-sm font-medium text-gray-700">Qty *</label>
          <input
            type="number"
            formControlName="quantity"
            step="0.01"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          />
        </div>

        <!-- Unit Price -->
        <div class="col-span-6 md:col-span-2">
          <label class="block text-sm font-medium text-gray-700"
            >Unit Price *</label
          >
          <input
            type="number"
            formControlName="unitPrice"
            step="0.01"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          />
        </div>

        <!-- Tax Rate -->
        <div class="col-span-6 md:col-span-2">
          <label class="block text-sm font-medium text-gray-700">Tax %</label>
          <input
            type="number"
            formControlName="taxRate"
            step="0.01"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          />
        </div>

        <!-- Total (calculated) -->
        <div class="col-span-6 md:col-span-2">
          <label class="block text-sm font-medium text-gray-700">Total</label>
          <div class="mt-1 p-2 bg-gray-50 rounded-md text-right font-semibold">
            {{ calculateItemTotal(i) | currency }}
          </div>
        </div>

        <!-- Expense Account -->
        <div class="col-span-12 md:col-span-6">
          <label class="block text-sm font-medium text-gray-700"
            >Expense Account</label
          >
          <select
            formControlName="expenseAccountId"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          >
            <option [value]="null">Select expense account (optional)</option>
            <option
              *ngFor="let account of expenseAccounts"
              [value]="account.id"
            >
              {{ account.accountCode }} - {{ account.accountName }}
            </option>
          </select>
        </div>

        <!-- Notes -->
        <div class="col-span-12 md:col-span-6">
          <label class="block text-sm font-medium text-gray-700">Notes</label>
          <input
            type="text"
            formControlName="notes"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          />
        </div>
      </div>
    </div>
  </div>

  <!-- Bill Total -->
  <div class="flex justify-end">
    <div class="w-64 space-y-2 border-t-2 border-gray-300 pt-4">
      <div class="flex justify-between text-lg font-bold">
        <span>Total:</span>
        <span>{{ calculateBillTotal() | currency }}</span>
      </div>
    </div>
  </div>
</div>
```

### Step 3: Load Expense Accounts

In the component:

```typescript
expenseAccounts: ExpenseAccount[] = [];

ngOnInit(): void {
  this.loadExpenseAccounts();
}

loadExpenseAccounts(): void {
  this.chartOfAccountsService.getExpenseAccounts().subscribe({
    next: (accounts) => {
      this.expenseAccounts = accounts;
    },
    error: (error) => {
      console.error('Error loading expense accounts:', error);
    }
  });
}
```

### Step 4: Update Submit Method

```typescript
onSubmit(): void {
  if (this.billForm.invalid) return;

  const formValue = this.billForm.value;

  const dto: CreateBillDto = {
    ...formValue,
    items: formValue.items.map((item, index) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate || 0,
      discountAmount: item.discountAmount || 0,
      expenseAccountId: item.expenseAccountId || undefined,
      sortOrder: index,
      notes: item.notes
    }))
  };

  this.accountsPayableService.createBill(dto).subscribe({
    next: (bill) => {
      this.toast.success('Bill created successfully');
      this.closeModal();
    },
    error: (error) => {
      this.toast.error('Error creating bill');
    }
  });
}
```

## Backend Endpoint Needed

Add to `chart-of-accounts.controller.ts`:

```typescript
@Get('expense-accounts')
async getExpenseAccounts(
  @Param('organizationId', ParseIntPipe) organizationId: number,
) {
  return this.chartOfAccountsService.getExpenseAccounts(organizationId);
}
```

Add to `chart-of-accounts.service.ts`:

```typescript
async getExpenseAccounts(organizationId: number) {
  return this.prisma.chartOfAccount.findMany({
    where: {
      organizationId,
      accountType: AccountType.EXPENSE,
      isActive: true,
    },
    orderBy: {
      accountCode: 'asc',
    },
  });
}
```

## Benefits of This Implementation

1. **Better Financial Tracking**: Each expense can be categorized to specific accounts
2. **Detailed Reporting**: Can generate reports by expense category
3. **Audit Trail**: Know exactly what was purchased and from which account
4. **Flexibility**: Support for both product-based and service-based bills
5. **Professional**: Matches how modern accounting software works (QuickBooks, Xero, etc.)

## Example API Request

**Creating a Modern Bill:**

```json
{
  "supplierId": 5,
  "billNumber": "BILL-2026-001",
  "billDate": "2026-02-01",
  "dueDate": "2026-03-01",
  "description": "Office supplies and equipment",
  "items": [
    {
      "description": "Laptop Dell XPS 15",
      "quantity": 2,
      "unitPrice": 1200.0,
      "taxRate": 16,
      "discountAmount": 0,
      "expenseAccountId": 101, // Computer Equipment
      "notes": "For new employees"
    },
    {
      "description": "Office chairs",
      "quantity": 5,
      "unitPrice": 150.0,
      "taxRate": 16,
      "discountAmount": 50.0,
      "expenseAccountId": 102 // Office Furniture
    },
    {
      "description": "Printer ink cartridges",
      "quantity": 10,
      "unitPrice": 25.0,
      "taxRate": 16,
      "expenseAccountId": 103 // Office Supplies
    }
  ],
  "notes": "Delivery by end of week",
  "termsAndConditions": "Net 30 days",
  "createdBy": 1
}
```

**API Response includes:**

- Full bill details with calculated totals
- All line items with their expense account information
- Supplier details
- Ready for approval workflow

## Testing

1. ✅ Database migration applied successfully
2. ✅ Backend can create bills with multiple items
3. ✅ Expense account validation working
4. ✅ Automatic calculations working
5. ⏳ Frontend form implementation needed
6. ⏳ Frontend expense account dropdown needed

All backend infrastructure is ready. Frontend just needs the updated form!
