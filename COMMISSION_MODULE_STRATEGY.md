# Commission Module Implementation Strategy

## Overview

This document outlines the complete strategy for implementing a comprehensive commission tracking and calculation system in the Lumina ERP application.

## Requirements Summary

1. **Commission Types**: Support both percentage-based and fixed-amount commissions
2. **Product-Level Configuration**: Each product should have a default commission rate
3. **User-Specific Overrides**: Individual users can have different commission rates per product
4. **Sales Integration**: Commissions calculated automatically when creating orders/invoices
5. **Editability**: Commission rates should be editable at any time
6. **Tracking**: Track all commission earnings per user per sale

---

## Current System Analysis

### Database Models (Existing)

- **Order**: Cash sales with items stored as JSON
  - Fields: items (Json), total, userId, cashPaid, mpesaPaid, bankPaid
  - Created by: Cash sales component
- **Invoice**: Credit sales with InvoiceItem relation
  - Fields: invoiceNumber, customerId, totalAmount, items (InvoiceItem[])
  - Created by: Credit sales/invoice component
- **InvoiceItem**: Line items for invoices
  - Fields: productId, productName, quantity, unitPrice, taxAmount, discountAmount, totalAmount
- **Product**: Product catalog
  - Fields: name, price, buyingPrice, wholesalePrice, isService
  - Missing: Commission fields
- **User**: Sales representatives
  - Fields: id, fullName, organizationId, locationId, role

### Current Sales Flow

1. **Cash Sales** (Order creation):
   - User selects products → Calculate totals → Create Order → Deduct inventory
   - Items stored as JSON array in Order.items

2. **Credit Sales** (Invoice creation):
   - User selects customer and products → Create Invoice with InvoiceItems → Track payments
   - Items stored as InvoiceItem records with product references

---

## Proposed Database Schema

### 1. Product Commission Configuration

```prisma
model Product {
  // ... existing fields ...

  // Default commission settings
  defaultCommissionType   String?  @default("PERCENTAGE") // PERCENTAGE or FIXED
  defaultCommissionValue  Float?   @default(0)            // 10 (for 10%) or 50 (for $50)
  isCommissionable        Boolean  @default(true)         // Can this product earn commission?

  // Relations
  userCommissionRates     UserProductCommission[]
  commissionRecords       CommissionRecord[]
}
```

### 2. User-Specific Commission Overrides

```prisma
model UserProductCommission {
  id             Int      @id @default(autoincrement())
  organizationId Int
  organization   Organization @relation(fields: [organizationId], references: [id])

  userId         Int
  user           User     @relation(fields: [userId], references: [id])

  productId      Int
  product        Product  @relation(fields: [productId], references: [id])

  // Override settings
  commissionType  String   // PERCENTAGE or FIXED
  commissionValue Float    // The rate/amount

  // Audit fields
  createdBy      String   @default("")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([userId, productId])
  @@index([organizationId, userId])
  @@index([organizationId, productId])
  @@map("user_product_commissions")
}
```

### 3. Commission Transaction Records

```prisma
model CommissionRecord {
  id             Int      @id @default(autoincrement())
  organizationId Int
  organization   Organization @relation(fields: [organizationId], references: [id])

  // Who earned the commission
  userId         Int
  user           User     @relation(fields: [userId], references: [id])

  // Source of commission
  sourceType     String   // ORDER or INVOICE
  sourceId       Int      // Order ID or Invoice ID
  orderId        Int?
  order          Order?   @relation(fields: [orderId], references: [id])
  invoiceId      Int?
  invoice        Invoice? @relation(fields: [invoiceId], references: [id])

  // Product details
  productId      Int
  product        Product  @relation(fields: [productId], references: [id])
  productName    String

  // Sale details
  quantitySold   Float
  unitPrice      Float
  totalSaleAmount Float   // quantity * unitPrice

  // Commission calculation
  commissionType  String  // PERCENTAGE or FIXED
  commissionRate  Float   // The rate used (10 for 10% or 50 for $50)
  commissionAmount Float  // Calculated commission earned

  // Payment tracking
  status         String   @default("PENDING") // PENDING, PAID, CANCELLED
  paidAt         DateTime?
  paidBy         String?
  paymentReference String?

  // Audit
  notes          String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([organizationId, userId])
  @@index([organizationId, status])
  @@index([sourceType, sourceId])
  @@map("commission_records")
}
```

### 4. Commission Payment Batches (Optional - for bulk payments)

```prisma
model CommissionPayment {
  id             Int      @id @default(autoincrement())
  organizationId Int
  organization   Organization @relation(fields: [organizationId], references: [id])

  batchNumber    String   // COMM-2026-00001
  userId         Int
  user           User     @relation(fields: [userId], references: [id])

  totalAmount    Float
  paymentMethod  String   // CASH, BANK_TRANSFER, etc.
  paymentDate    DateTime

  // References
  commissionIds  Json     // Array of CommissionRecord IDs included in this payment

  // Audit
  paidBy         String
  notes          String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([organizationId, userId])
  @@map("commission_payments")
}
```

---

## Implementation Phases

## Phase 1: Database Schema Updates

### Migration Steps

1. Add commission fields to Product model
2. Create UserProductCommission model
3. Create CommissionRecord model
4. Create CommissionPayment model (optional)
5. Add relations to Order and Invoice models

### Migration File

```prisma
// Migration: Add commission support
// 1. Alter Product table
ALTER TABLE products ADD COLUMN default_commission_type VARCHAR(20) DEFAULT 'PERCENTAGE';
ALTER TABLE products ADD COLUMN default_commission_value DECIMAL(10,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN is_commissionable BOOLEAN DEFAULT true;

// 2. Create user_product_commissions table
// 3. Create commission_records table
// 4. Create commission_payments table
```

---

## Phase 2: Backend Implementation

### A. DTOs and Interfaces

#### 1. Product Commission DTOs

```typescript
// apps/backend/src/products/dto/commission.dto.ts

export class ProductCommissionDto {
  defaultCommissionType?: "PERCENTAGE" | "FIXED";
  defaultCommissionValue?: number;
  isCommissionable?: boolean;
}

export class UserProductCommissionDto {
  userId: number;
  productId: number;
  commissionType: "PERCENTAGE" | "FIXED";
  commissionValue: number;
}

export class CommissionCalculationResult {
  productId: number;
  productName: string;
  quantity: number;
  saleAmount: number;
  commissionType: string;
  commissionRate: number;
  commissionAmount: number;
}
```

#### 2. Update Product DTOs

```typescript
// apps/backend/src/products/products.dto.ts
export class CreateProductDto {
  // ... existing fields ...

  // Commission fields
  defaultCommissionType?: "PERCENTAGE" | "FIXED";
  defaultCommissionValue?: number;
  isCommissionable?: boolean;
}
```

### B. Commission Service

```typescript
// apps/backend/src/commission/commission.service.ts

@Injectable()
export class CommissionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate commission for a single product sale
   */
  async calculateCommission(
    organizationId: number,
    userId: number,
    productId: number,
    quantity: number,
    unitPrice: number
  ): Promise<CommissionCalculationResult> {
    // 1. Check for user-specific commission rate
    const userCommission = await this.prisma.userProductCommission.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
    });

    if (userCommission) {
      // Use user-specific rate
      return this.computeCommission(
        productId,
        quantity,
        unitPrice,
        userCommission.commissionType,
        userCommission.commissionValue
      );
    }

    // 2. Fall back to product default commission
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        defaultCommissionType: true,
        defaultCommissionValue: true,
        isCommissionable: true,
      },
    });

    if (!product || !product.isCommissionable) {
      return null; // No commission for this product
    }

    return this.computeCommission(
      productId,
      quantity,
      unitPrice,
      product.defaultCommissionType || "PERCENTAGE",
      product.defaultCommissionValue || 0
    );
  }

  /**
   * Compute commission amount
   */
  private computeCommission(
    productId: number,
    quantity: number,
    unitPrice: number,
    commissionType: string,
    commissionValue: number
  ): CommissionCalculationResult {
    const saleAmount = quantity * unitPrice;
    let commissionAmount = 0;

    if (commissionType === "PERCENTAGE") {
      commissionAmount = (saleAmount * commissionValue) / 100;
    } else if (commissionType === "FIXED") {
      commissionAmount = commissionValue * quantity;
    }

    return {
      productId,
      productName: "", // Will be filled by caller
      quantity,
      saleAmount,
      commissionType,
      commissionRate: commissionValue,
      commissionAmount: parseFloat(commissionAmount.toFixed(2)),
    };
  }

  /**
   * Create commission records for an order (cash sale)
   */
  async createOrderCommissions(
    organizationId: number,
    orderId: number,
    userId: number,
    items: any[] // Order items from JSON
  ) {
    const commissions = [];

    for (const item of items) {
      const productId = item.id || item.productId;
      const quantity = item.selectedItems || item.quantity || 0;
      const unitPrice = item.price || item.unitPrice || 0;

      const commission = await this.calculateCommission(
        organizationId,
        userId,
        productId,
        quantity,
        unitPrice
      );

      if (commission && commission.commissionAmount > 0) {
        const record = await this.prisma.commissionRecord.create({
          data: {
            organizationId,
            userId,
            sourceType: "ORDER",
            sourceId: orderId,
            orderId,
            productId,
            productName: item.name || item.productName || "",
            quantitySold: quantity,
            unitPrice,
            totalSaleAmount: commission.saleAmount,
            commissionType: commission.commissionType,
            commissionRate: commission.commissionRate,
            commissionAmount: commission.commissionAmount,
            status: "PENDING",
          },
        });

        commissions.push(record);
      }
    }

    return commissions;
  }

  /**
   * Create commission records for an invoice (credit sale)
   */
  async createInvoiceCommissions(
    organizationId: number,
    invoiceId: number,
    userId: number,
    items: any[] // InvoiceItem[]
  ) {
    const commissions = [];

    for (const item of items) {
      const commission = await this.calculateCommission(
        organizationId,
        userId,
        item.productId,
        item.quantity,
        item.unitPrice
      );

      if (commission && commission.commissionAmount > 0) {
        const record = await this.prisma.commissionRecord.create({
          data: {
            organizationId,
            userId,
            sourceType: "INVOICE",
            sourceId: invoiceId,
            invoiceId,
            productId: item.productId,
            productName: item.productName,
            quantitySold: item.quantity,
            unitPrice: item.unitPrice,
            totalSaleAmount: commission.saleAmount,
            commissionType: commission.commissionType,
            commissionRate: commission.commissionRate,
            commissionAmount: commission.commissionAmount,
            status: "PENDING",
          },
        });

        commissions.push(record);
      }
    }

    return commissions;
  }

  /**
   * Get user commission summary
   */
  async getUserCommissionSummary(
    organizationId: number,
    userId: number,
    startDate?: Date,
    endDate?: Date
  ) {
    const where: any = {
      organizationId,
      userId,
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [pending, paid, total] = await Promise.all([
      this.prisma.commissionRecord.aggregate({
        where: { ...where, status: "PENDING" },
        _sum: { commissionAmount: true },
      }),
      this.prisma.commissionRecord.aggregate({
        where: { ...where, status: "PAID" },
        _sum: { commissionAmount: true },
      }),
      this.prisma.commissionRecord.aggregate({
        where,
        _sum: { commissionAmount: true },
      }),
    ]);

    return {
      totalCommissions: total._sum.commissionAmount || 0,
      pendingCommissions: pending._sum.commissionAmount || 0,
      paidCommissions: paid._sum.commissionAmount || 0,
    };
  }

  /**
   * Set user-specific commission rate
   */
  async setUserProductCommission(
    organizationId: number,
    dto: UserProductCommissionDto,
    createdBy: string
  ) {
    return this.prisma.userProductCommission.upsert({
      where: {
        userId_productId: {
          userId: dto.userId,
          productId: dto.productId,
        },
      },
      create: {
        organizationId,
        userId: dto.userId,
        productId: dto.productId,
        commissionType: dto.commissionType,
        commissionValue: dto.commissionValue,
        createdBy,
      },
      update: {
        commissionType: dto.commissionType,
        commissionValue: dto.commissionValue,
      },
    });
  }

  /**
   * Get all user-specific commission rates
   */
  async getUserProductCommissions(organizationId: number, userId: number) {
    return this.prisma.userProductCommission.findMany({
      where: { organizationId, userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
      },
    });
  }
}
```

### C. Update Order Service

```typescript
// apps/backend/src/orders/orders.service.ts

// In createOrder method, after creating the order:

async createOrder(organizationId: number, dto: OrderDto, userId: number) {
  // ... existing order creation logic ...

  const order = await this.prisma.order.create({
    data: {
      // ... existing data ...
    },
  });

  // Create commission records
  try {
    await this.commissionService.createOrderCommissions(
      organizationId,
      order.id,
      userId,
      dto.items,
    );
  } catch (error) {
    console.error('Failed to create commission records:', error);
    // Don't fail the order if commission creation fails
  }

  return order;
}
```

### D. Update Invoice Service

```typescript
// apps/backend/src/invoices/invoice.service.ts

async createInvoice(organizationId: number, dto: CreateInvoiceDto) {
  // ... existing invoice creation logic ...

  const invoice = await this.prisma.$transaction(async (tx) => {
    const createdInvoice = await tx.invoice.create({
      data: {
        // ... existing data ...
        items: {
          create: itemsWithCalculations,
        },
      },
      include: {
        items: true,
      },
    });

    // Create commission records
    if (createdInvoice.createdBy) {
      try {
        await this.commissionService.createInvoiceCommissions(
          organizationId,
          createdInvoice.id,
          parseInt(createdInvoice.createdBy), // Assuming createdBy is user ID
          createdInvoice.items,
        );
      } catch (error) {
        console.error('Failed to create commission records:', error);
      }
    }

    return createdInvoice;
  });

  return invoice;
}
```

### E. Commission Controller

```typescript
// apps/backend/src/commission/commission.controller.ts

@Controller("commission")
@UseGuards(AuthGuard)
export class CommissionController {
  constructor(private readonly commissionService: CommissionService) {}

  @Get("summary/:userId")
  async getUserSummary(
    @Param("userId") userId: string,
    @Query("organizationId") organizationId: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string
  ) {
    return this.commissionService.getUserCommissionSummary(
      parseInt(organizationId),
      parseInt(userId),
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
  }

  @Get("records/:userId")
  async getUserRecords(
    @Param("userId") userId: string,
    @Query("organizationId") organizationId: string
  ) {
    return this.prisma.commissionRecord.findMany({
      where: {
        organizationId: parseInt(organizationId),
        userId: parseInt(userId),
      },
      include: {
        product: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  @Post("user-rate")
  async setUserRate(
    @Body() dto: UserProductCommissionDto,
    @Query("organizationId") organizationId: string,
    @Req() req: any
  ) {
    return this.commissionService.setUserProductCommission(
      parseInt(organizationId),
      dto,
      req.user.fullName
    );
  }

  @Get("user-rates/:userId")
  async getUserRates(
    @Param("userId") userId: string,
    @Query("organizationId") organizationId: string
  ) {
    return this.commissionService.getUserProductCommissions(
      parseInt(organizationId),
      parseInt(userId)
    );
  }
}
```

---

## Phase 3: Frontend Implementation

### A. Update Product Interface

```typescript
// apps/frontend/src/app/shared/interfaces/product.interface.ts

export interface Product {
  // ... existing fields ...

  // Commission fields
  defaultCommissionType?: "PERCENTAGE" | "FIXED";
  defaultCommissionValue?: number;
  isCommissionable?: boolean;
}
```

### B. Update Product Form Component

```typescript
// apps/frontend/src/app/modules/products/components/product-form/product-form.component.ts

// Add to the form group:
this.productForm = this.fb.group({
  // ... existing controls ...

  isCommissionable: [true],
  defaultCommissionType: ["PERCENTAGE"],
  defaultCommissionValue: [0, [Validators.min(0)]],
});
```

### C. Product Form HTML

```html
<!-- Add to product form template -->
<div class="commission-section">
  <h3>Commission Settings</h3>

  <mat-slide-toggle formControlName="isCommissionable">
    Enable Commission
  </mat-slide-toggle>

  <div *ngIf="productForm.get('isCommissionable')?.value">
    <mat-form-field>
      <mat-label>Commission Type</mat-label>
      <mat-select formControlName="defaultCommissionType">
        <mat-option value="PERCENTAGE">Percentage (%)</mat-option>
        <mat-option value="FIXED">Fixed Amount</mat-option>
      </mat-select>
    </mat-form-field>

    <mat-form-field>
      <mat-label>Commission Value</mat-label>
      <input
        matInput
        type="number"
        formControlName="defaultCommissionValue"
        [placeholder]="productForm.get('defaultCommissionType')?.value === 'PERCENTAGE' ? 'e.g., 10 for 10%' : 'e.g., 50 for $50'"
      />
    </mat-form-field>
  </div>
</div>
```

### D. Commission Management Component

```typescript
// apps/frontend/src/app/modules/commission/components/user-commission-rates/user-commission-rates.component.ts

export class UserCommissionRatesComponent implements OnInit {
  users: User[] = [];
  products: Product[] = [];
  commissionRates: UserProductCommission[] = [];

  selectedUser: User | null = null;

  displayedColumns: string[] = [
    "product",
    "defaultRate",
    "userRate",
    "type",
    "actions",
  ];

  constructor(
    private commissionService: CommissionService,
    private userService: UserService,
    private productService: ProductService
  ) {}

  ngOnInit() {
    this.loadUsers();
    this.loadProducts();
  }

  onUserSelected(user: User) {
    this.selectedUser = user;
    this.loadUserCommissionRates(user.id);
  }

  loadUserCommissionRates(userId: number) {
    this.commissionService.getUserProductCommissions(userId).subscribe({
      next: (rates) => {
        this.commissionRates = rates;
      },
    });
  }

  setUserRate(productId: number) {
    const dialogRef = this.dialog.open(CommissionRateDialogComponent, {
      data: {
        userId: this.selectedUser?.id,
        productId,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadUserCommissionRates(this.selectedUser!.id);
      }
    });
  }
}
```

### E. Commission Dashboard Component

```typescript
// apps/frontend/src/app/modules/commission/components/commission-dashboard/commission-dashboard.component.ts

export class CommissionDashboardComponent implements OnInit {
  users: User[] = [];
  selectedUser: User | null = null;

  summary = {
    totalCommissions: 0,
    pendingCommissions: 0,
    paidCommissions: 0,
  };

  commissionRecords: CommissionRecord[] = [];

  displayedColumns: string[] = [
    "date",
    "product",
    "quantity",
    "saleAmount",
    "commissionRate",
    "commissionAmount",
    "status",
  ];

  constructor(
    private commissionService: CommissionService,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  onUserSelected(user: User) {
    this.selectedUser = user;
    this.loadCommissionData(user.id);
  }

  loadCommissionData(userId: number) {
    // Load summary
    this.commissionService.getUserSummary(userId).subscribe({
      next: (summary) => {
        this.summary = summary;
      },
    });

    // Load records
    this.commissionService.getUserRecords(userId).subscribe({
      next: (records) => {
        this.commissionRecords = records;
      },
    });
  }
}
```

### F. Commission Service

```typescript
// apps/frontend/src/app/shared/services/commission.service.ts

@Injectable({
  providedIn: "root",
})
export class CommissionService {
  private apiUrl = `${environment.apiUrl}/commission`;

  constructor(private http: HttpClient) {}

  getUserSummary(
    userId: number,
    startDate?: Date,
    endDate?: Date
  ): Observable<CommissionSummary> {
    let params = new HttpParams();
    if (startDate) params = params.set("startDate", startDate.toISOString());
    if (endDate) params = params.set("endDate", endDate.toISOString());

    return this.http.get<CommissionSummary>(
      `${this.apiUrl}/summary/${userId}`,
      { params }
    );
  }

  getUserRecords(userId: number): Observable<CommissionRecord[]> {
    return this.http.get<CommissionRecord[]>(
      `${this.apiUrl}/records/${userId}`
    );
  }

  setUserProductCommission(
    dto: UserProductCommissionDto
  ): Observable<UserProductCommission> {
    return this.http.post<UserProductCommission>(
      `${this.apiUrl}/user-rate`,
      dto
    );
  }

  getUserProductCommissions(
    userId: number
  ): Observable<UserProductCommission[]> {
    return this.http.get<UserProductCommission[]>(
      `${this.apiUrl}/user-rates/${userId}`
    );
  }
}
```

---

## Phase 4: UI/UX Design

### Commission Management Pages

1. **Product Commission Settings** (in product form)
   - Toggle: Enable/Disable commission
   - Dropdown: Commission type (Percentage/Fixed)
   - Input: Commission value

2. **User Commission Rates** (new page)
   - User selector dropdown
   - Product list with default and user-specific rates
   - Edit button to override default rate
   - Clear button to remove override

3. **Commission Dashboard** (new page)
   - User selector
   - Summary cards: Total, Pending, Paid commissions
   - Data table: All commission records with filters
   - Export to Excel button

4. **Commission Records** (detail page)
   - Filters: Date range, status, product
   - Table: All commission transactions
   - Bulk actions: Mark as paid, export

---

## Calculation Logic Examples

### Example 1: Percentage Commission

- Product: Widget A
- Default commission: 10% (PERCENTAGE)
- Sale: 5 units @ $20 each = $100
- Commission: $100 × 10% = **$10**

### Example 2: Fixed Commission

- Product: Widget B
- Default commission: $5 per unit (FIXED)
- Sale: 3 units @ $30 each = $90
- Commission: 3 units × $5 = **$15**

### Example 3: User Override

- Product: Widget A (default 10%)
- User 1: 10% (uses default)
- User 2: 8% (override set)
- Sale by User 2: 5 units @ $20 = $100
- Commission: $100 × 8% = **$8**

---

## Testing Strategy

### Unit Tests

1. Commission calculation logic
2. User override priority
3. Commission record creation
4. Payment tracking

### Integration Tests

1. Order creation with commission
2. Invoice creation with commission
3. User-specific rate application
4. Commission summary calculations

### Manual Testing

1. Create products with different commission types
2. Set user-specific overrides
3. Create sales and verify commission records
4. Test edge cases (zero commission, negative values)

---

## Deployment Steps

1. **Database Migration**
   - Run Prisma migration to add new tables and fields
   - Verify migration on staging environment

2. **Backend Deployment**
   - Deploy commission service and controllers
   - Test API endpoints
   - Update order and invoice services

3. **Frontend Deployment**
   - Deploy updated product forms
   - Deploy commission management pages
   - Update navigation menu

4. **Data Seeding (Optional)**
   - Set default commissions for existing products
   - Configure initial user rates

---

## Future Enhancements

1. **Commission Tiers**: Different rates based on sales volume
2. **Team Commissions**: Split commissions among multiple users
3. **Commission Approval Workflow**: Manager approval before payment
4. **Automated Payments**: Integration with payroll systems
5. **Commission Reports**: Detailed analytics and charts
6. **Commission Adjustments**: Manual adjustments for special cases
7. **Commission Clawback**: Handle returns/refunds

---

## Security Considerations

1. **Permission-Based Access**
   - Only admins can set commission rates
   - Users can only view their own commissions
   - Managers can view team commissions

2. **Audit Trail**
   - Track all commission rate changes
   - Log who created/modified records
   - Timestamp all transactions

3. **Data Validation**
   - Validate commission values (no negative amounts)
   - Prevent unauthorized modifications
   - Ensure commission records match sales

---

## Performance Considerations

1. **Batch Processing**: Create commissions in transaction with sales
2. **Indexing**: Add indexes on frequently queried fields
3. **Caching**: Cache commission rates to reduce database queries
4. **Pagination**: Paginate large commission record lists

---

## Summary

This commission module will:

- ✅ Support percentage and fixed-amount commissions
- ✅ Allow product-level default commissions
- ✅ Enable user-specific commission overrides
- ✅ Automatically calculate commissions on sales/invoices
- ✅ Track all commission earnings
- ✅ Provide comprehensive reporting
- ✅ Support future payment processing

The implementation is modular and can be deployed incrementally, starting with basic commission tracking and expanding to advanced features over time.
