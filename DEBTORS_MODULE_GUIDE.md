# Debtors Module - Complete Documentation

## Overview

The Debtors Module provides comprehensive Accounts Receivable (AR) management following modern accounting standards. It tracks customer invoices, manages payments, generates aging analysis, and produces customer statements.

## Features

### 1. **Aged Receivables Analysis**

- Real-time aging buckets: 0-30, 31-60, 61-90, 91-120, 120+ days
- Customer-wise breakdown with detailed invoice listing
- Visual summary cards showing aging distribution
- Percentage calculations for each aging bucket
- Export to CSV functionality
- Print-ready reports

### 2. **Customer Outstanding Invoices**

- List all unpaid/partially paid invoices for a customer
- Bulk payment recording across multiple invoices
- Payment allocation interface
- Days overdue calculation
- Aging category badges

### 3. **Customer Statements**

- Period-based statement generation
- Complete invoice and payment history
- Running balance calculations
- Status breakdown (paid, partially paid, unpaid, overdue)
- Export and print capabilities

### 4. **Payment History Tracking**

- Complete payment timeline per customer
- Payment method tracking
- Transaction code recording
- Invoice reference linking

### 5. **Bulk Payment Processing**

- Pay multiple invoices in one transaction
- Flexible payment allocation
- Multiple payment methods support
- Transaction code tracking
- Automatic customer balance updates

## Backend Architecture

### Database Models Used

**Invoice Model**:

```prisma
model Invoice {
  id              Int
  invoiceNumber   String  @unique
  customerId      Int
  totalAmount     Decimal
  amountPaid      Decimal
  balanceDue      Decimal
  issueDate       DateTime
  dueDate         DateTime
  status          InvoiceStatus
  fullyPaid       Boolean
  customer        Customer
  payments        InvoicePayment[]
  // ... other fields
}
```

**InvoicePayment Model**:

```prisma
model InvoicePayment {
  id                Int
  invoiceId         Int
  amount            Decimal
  paymentMethod     PaymentMethod
  paymentDate       DateTime
  transactionCode   String?
  recordedBy        String
  invoice           Invoice
  // ... other fields
}
```

**Customer Model**:

```prisma
model Customer {
  id              Int
  fullName        String
  phoneNumber     String
  email           String?
  dueCredit       Decimal  // Total outstanding balance
  invoices        Invoice[]
  // ... other fields
}
```

### API Endpoints

#### 1. Get All Debtors

```http
GET /debtors?customerId={id}&startDate={date}&endDate={date}&search={term}&agingPeriod={period}&page={num}&limit={num}
```

**Query Parameters**:

- `customerId` (optional): Filter by specific customer
- `startDate` (optional): Filter invoices from date
- `endDate` (optional): Filter invoices to date
- `search` (optional): Search by customer name or invoice number
- `agingPeriod` (optional): Filter by aging bucket (CURRENT, DAYS_31_60, DAYS_61_90, DAYS_91_120, OVER_120)
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Items per page (default: 50)

**Response**:

```json
{
  "invoices": [
    {
      "id": 1,
      "invoiceNumber": "INV-001",
      "customerName": "John Doe",
      "totalAmount": 50000,
      "balanceDue": 30000,
      "dueDate": "2024-01-15",
      "daysOverdue": 45,
      "agingCategory": "DAYS_31_60",
      "customer": { "id": 1, "fullName": "John Doe" },
      "payments": [...]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

#### 2. Get Aging Analysis

```http
GET /debtors/aging-analysis
```

**Response**:

```json
{
  "customers": [
    {
      "customerId": 1,
      "customerName": "John Doe",
      "customerPhone": "0700000000",
      "current": 10000,
      "days31_60": 20000,
      "days61_90": 15000,
      "days91_120": 5000,
      "over120": 0,
      "totalOutstanding": 50000,
      "invoices": [...]
    }
  ],
  "totals": {
    "current": 100000,
    "days31_60": 200000,
    "days61_90": 150000,
    "days91_120": 50000,
    "over120": 25000,
    "totalOutstanding": 525000
  },
  "summary": {
    "totalCustomers": 25,
    "totalInvoices": 150,
    ...
  }
}
```

#### 3. Get Customer Statement

```http
GET /debtors/customer/:customerId/statement?startDate={date}&endDate={date}&format={summary|detailed}
```

**Query Parameters**:

- `startDate` (optional): Statement start date
- `endDate` (optional): Statement end date
- `format` (optional): 'summary' or 'detailed' (default: detailed)

**Response**:

```json
{
  "customer": {
    "id": 1,
    "fullName": "John Doe",
    "phoneNumber": "0700000000",
    "email": "john@example.com"
  },
  "period": {
    "startDate": "2024-01-01",
    "endDate": "2024-03-31"
  },
  "invoices": [...],
  "totals": {
    "totalInvoiced": 500000,
    "totalPaid": 350000,
    "totalOutstanding": 150000,
    "invoiceCount": 15
  },
  "statusBreakdown": {
    "paid": 8,
    "partiallyPaid": 4,
    "unpaid": 3,
    "overdue": 5
  }
}
```

#### 4. Get Customer Payment History

```http
GET /debtors/customer/:customerId/payments?startDate={date}&endDate={date}
```

**Response**:

```json
{
  "customer": {...},
  "payments": [
    {
      "id": 1,
      "amount": 50000,
      "paymentDate": "2024-03-01",
      "paymentMethodName": "MPESA",
      "transactionCode": "QA12B3C4D5",
      "invoice": {
        "invoiceNumber": "INV-001",
        "totalAmount": 100000
      }
    }
  ],
  "summary": {
    "totalPayments": 10,
    "totalPaid": 350000
  }
}
```

#### 5. Get Customer Outstanding Invoices

```http
GET /debtors/customer/:customerId/outstanding
```

**Response**:

```json
{
  "customer": {...},
  "invoices": [
    {
      "id": 1,
      "invoiceNumber": "INV-001",
      "balanceDue": 30000,
      "daysOverdue": 45,
      "agingCategory": "DAYS_31_60",
      "payments": [...]
    }
  ],
  "summary": {
    "totalInvoices": 5,
    "totalOutstanding": 150000
  }
}
```

#### 6. Record Bulk Payment

```http
POST /debtors/bulk-payment
```

**Request Body**:

```json
{
  "customerId": 1,
  "payments": [
    {
      "invoiceId": 1,
      "amount": 30000,
      "notes": "Payment for invoice INV-001"
    },
    {
      "invoiceId": 2,
      "amount": 20000
    }
  ],
  "paymentMethodId": 1,
  "paymentMethodCode": "MPESA",
  "paymentMethodName": "M-Pesa",
  "transactionCode": "QA12B3C4D5",
  "paymentDate": "2024-03-01T10:00:00Z",
  "notes": "Bulk payment",
  "recordedBy": "John Admin"
}
```

**Response**:

```json
{
  "success": true,
  "payments": [
    {
      "id": 1,
      "amount": 30000,
      "invoice": {
        "invoiceNumber": "INV-001",
        "newBalanceDue": 0,
        "fullyPaid": true
      }
    },
    {
      "id": 2,
      "amount": 20000,
      "invoice": {
        "invoiceNumber": "INV-002",
        "newBalanceDue": 10000,
        "fullyPaid": false
      }
    }
  ],
  "summary": {
    "totalAmount": 50000,
    "invoiceCount": 2,
    "customer": {
      "id": 1,
      "fullName": "John Doe"
    }
  }
}
```

### Service Methods

**DebtorsService** (`debtors.service.ts`):

1. **getAllDebtors(organizationId, filters)**: Get all outstanding invoices with filtering
2. **getAgingAnalysis(organizationId)**: Generate aged receivables report
3. **getCustomerStatement(organizationId, filters)**: Generate customer statement
4. **getCustomerPaymentHistory(organizationId, customerId, dates)**: Get payment timeline
5. **getCustomerOutstandingInvoices(organizationId, customerId)**: Get unpaid invoices
6. **recordBulkPayment(organizationId, dto)**: Process bulk payment transaction

**Helper Methods**:

- `calculateDaysOverdue(dueDate, today)`: Calculate days past due
- `calculateAgingCategory(dueDate, today)`: Determine aging bucket
- `getAgingFilter(agingPeriod, today)`: Build date filter for aging period

### Business Logic

#### Aging Calculation

```typescript
private calculateAgingCategory(dueDate: Date, today: Date): AgingPeriod {
  const daysOverdue = this.calculateDaysOverdue(dueDate, today);

  if (daysOverdue <= 30) return AgingPeriod.CURRENT;
  if (daysOverdue <= 60) return AgingPeriod.DAYS_31_60;
  if (daysOverdue <= 90) return AgingPeriod.DAYS_61_90;
  if (daysOverdue <= 120) return AgingPeriod.DAYS_91_120;
  return AgingPeriod.OVER_120;
}
```

#### Bulk Payment Processing

```typescript
// Transaction ensures atomicity
await this.prisma.$transaction(async (tx) => {
  // 1. Create payment records
  // 2. Update invoice amounts and status
  // 3. Update customer dueCredit balance
  // 4. Return payment details
});
```

## Frontend Architecture

### Components

#### 1. AgingAnalysisComponent

**Path**: `app/modules/debtors/aging-analysis/`

**Features**:

- Summary cards for each aging bucket
- Total outstanding receivables banner
- Customer search functionality
- Sortable data table
- CSV export
- Print functionality

**Key Methods**:

- `loadAgingAnalysis()`: Fetch aging data
- `onSearch()`: Filter customers by search term
- `exportToCSV()`: Generate CSV export
- `viewCustomerStatement(customerId)`: Navigate to statement
- `formatCurrency(amount)`: Format numbers as currency
- `getAgingPercentage(amount)`: Calculate percentage distribution

#### 2. OutstandingInvoicesComponent

**Path**: `app/modules/debtors/outstanding-invoices/`

**Features**:

- List unpaid invoices for customer
- Checkbox selection for bulk payment
- Payment amount input per invoice
- Bulk payment modal
- Payment method selection
- Transaction code entry

**Key Methods**:

- `loadOutstandingInvoices()`: Fetch customer invoices
- `toggleInvoiceSelection(invoice)`: Select/deselect invoice
- `updatePaymentAmount(invoiceId, amount)`: Update payment allocation
- `getTotalSelectedAmount()`: Calculate total payment
- `recordBulkPayment()`: Submit bulk payment transaction

#### 3. CustomerStatementComponent

**Path**: `app/modules/debtors/customer-statement/`

**Features**:

- Period selector (date range)
- Invoice list with status
- Payment history timeline
- Running balance calculation
- Summary cards
- PDF export
- Print functionality

### Services

**DebtorsService** (`shared/Services/debtors.service.ts`):

```typescript
@Injectable({ providedIn: "root" })
export class DebtorsService {
  getAllDebtors(filters: DebtorFilters): Observable<DebtorsResponse>;
  getAgingAnalysis(): Observable<AgingAnalysisResponse>;
  getCustomerStatement(filters): Observable<CustomerStatementResponse>;
  getCustomerPaymentHistory(
    customerId,
    dates,
  ): Observable<PaymentHistoryResponse>;
  getCustomerOutstandingInvoices(
    customerId,
  ): Observable<CustomerOutstandingResponse>;
  recordBulkPayment(dto: RecordBulkPaymentDto): Observable<BulkPaymentResponse>;
}
```

### Types

**File**: `types/debtors.types.ts`

Key interfaces:

- `Customer`: Customer basic info
- `Invoice`: Invoice with aging calculations
- `InvoicePayment`: Payment record
- `AgingPeriod`: Enum for aging buckets
- `DebtorFilters`: API filter parameters
- `RecordBulkPaymentDto`: Bulk payment request
- `AgingAnalysisResponse`: Aging report structure

### Routing

**Module**: `debtors-routing.module.ts`

```typescript
const routes: Routes = [
  {
    path: "",
    component: AgingAnalysisComponent,
    canActivate: [AuthGuard],
  },
  {
    path: "outstanding-invoices/:customerId",
    component: OutstandingInvoicesComponent,
    canActivate: [AuthGuard],
  },
  {
    path: "customer-statement/:customerId",
    component: CustomerStatementComponent,
    canActivate: [AuthGuard],
  },
];
```

## Accounting Standards Compliance

### 1. **Aging Classification**

Follows standard accounting aging buckets:

- **Current**: 0-30 days (not yet critical)
- **31-60 days**: Early warning (follow-up recommended)
- **61-90 days**: Past due (escalation needed)
- **91-120 days**: Seriously overdue (collection efforts)
- **120+ days**: High risk (possible bad debt)

### 2. **Accrual Basis**

- Invoices recorded on issue date (not payment date)
- Revenue recognized when invoice issued
- Receivables tracked until fully paid

### 3. **Revenue Recognition**

- Invoice status workflow: DRAFT → SENT → VIEWED → PARTIALLY_PAID → PAID
- `amountPaid` and `balanceDue` track partial payments
- `fullyPaid` boolean for quick filtering

### 4. **Internal Controls**

- `recordedBy` field tracks who recorded payment
- Transaction codes for payment verification
- Audit trail via InvoicePayment records
- Multi-step validation before payment recording

### 5. **Reconciliation Support**

- Customer statement shows all transactions
- Running balance calculations
- Payment allocation tracking
- Date-based filtering for period reconciliation

## Usage Examples

### Get Aged Receivables Report

```typescript
this.debtorsService.getAgingAnalysis().subscribe((data) => {
  console.log("Total Outstanding:", data.totals.totalOutstanding);
  console.log("Customers:", data.customers.length);
  console.log("Over 90 days:", data.totals.days91_120 + data.totals.over120);
});
```

### Record Bulk Payment

```typescript
const payment: RecordBulkPaymentDto = {
  customerId: 1,
  payments: [
    { invoiceId: 1, amount: 30000 },
    { invoiceId: 2, amount: 20000 },
  ],
  paymentMethodId: 1,
  paymentMethodCode: "MPESA",
  paymentMethodName: "M-Pesa",
  transactionCode: "QA12B3C4D5",
  recordedBy: currentUser.username,
};

this.debtorsService.recordBulkPayment(payment).subscribe((result) => {
  console.log("Paid", result.summary.invoiceCount, "invoices");
  console.log("Total amount:", result.summary.totalAmount);
});
```

### Generate Customer Statement

```typescript
this.debtorsService
  .getCustomerStatement({
    customerId: 1,
    startDate: "2024-01-01",
    endDate: "2024-03-31",
    format: "detailed",
  })
  .subscribe((statement) => {
    console.log("Total Outstanding:", statement.totals.totalOutstanding);
    console.log("Invoices:", statement.invoices.length);
    console.log("Overdue:", statement.statusBreakdown.overdue);
  });
```

## Security & Permissions

- All endpoints protected by `@UseGuards(JwtGuard)`
- Organization scoping on all queries
- User authentication required
- Role-based access recommended (add role guards as needed)

## Best Practices

1. **Regular Aging Reviews**: Run aging analysis weekly/monthly
2. **Follow-up Process**: Establish process based on aging buckets
3. **Payment Recording**: Record payments promptly with transaction codes
4. **Customer Communication**: Use statements for customer communication
5. **Reconciliation**: Regular reconciliation between AR module and general ledger
6. **Bad Debt Provisioning**: Use 120+ days aging for provisioning estimates

## Testing

### Backend Tests

```bash
cd apps/backend
npm run test -- debtors.service.spec.ts
```

### Frontend Tests

```bash
cd apps/frontend
ng test --include='**/debtors/**/*.spec.ts'
```

## Performance Considerations

1. **Pagination**: Large datasets paginated (default 50 items)
2. **Indexing**: Database indexes on `organizationId`, `customerId`, `dueDate`, `balanceDue`
3. **Caching**: Consider Redis caching for aging analysis (expensive calculation)
4. **Lazy Loading**: Frontend components lazy loaded
5. **Query Optimization**: Relations included only when needed

## Future Enhancements

1. **Email Reminders**: Automated dunning emails based on aging
2. **Payment Plans**: Setup payment plan tracking
3. **Credit Limits**: Enforce credit limits based on outstanding
4. **Predictive Analytics**: Machine learning for payment prediction
5. **Mobile App**: Dedicated AR management mobile app
6. **Integration**: QuickBooks/Xero integration for GL sync

## Support & Documentation

For issues or questions:

- Backend: See `apps/backend/src/debtors/`
- Frontend: See `apps/frontend/src/app/modules/debtors/`
- API: Swagger docs at `http://localhost:3000/api`
