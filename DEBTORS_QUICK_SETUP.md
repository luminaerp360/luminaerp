# Debtors Module - Quick Setup Guide

## Created Files

### Backend (NestJS)

```
apps/backend/src/debtors/
├── debtors.dto.ts           # DTOs for filters and bulk payment
├── debtors.service.ts       # Service with aging analysis & payment logic
├── debtors.controller.ts    # REST API endpoints
└── debtors.module.ts        # Module configuration
```

### Frontend (Angular)

```
apps/frontend/src/app/
├── types/debtors.types.ts                                    # TypeScript interfaces
├── shared/Services/debtors.service.ts                        # HTTP service
└── modules/debtors/
    ├── debtors-routing.module.ts                             # Routes
    ├── aging-analysis/
    │   ├── aging-analysis.component.ts                       # Main dashboard
    │   ├── aging-analysis.component.html                     # Template
    │   └── aging-analysis.component.scss                     # Styles
    └── outstanding-invoices/
        ├── outstanding-invoices.component.ts                 # Customer invoices
        ├── outstanding-invoices.component.html               # Template
        └── outstanding-invoices.component.scss               # Styles
```

### Documentation

```
DEBTORS_MODULE_GUIDE.md      # Comprehensive guide
DEBTORS_QUICK_SETUP.md       # This file
```

## Installation Steps

### 1. Backend Setup

The `DebtorsModule` has been added to `apps/backend/src/app.module.ts`.

**No database migration needed** - uses existing `Invoice`, `InvoicePayment`, and `Customer` models.

### 2. Frontend Routing

Add to your main routing file (e.g., `app-routing.module.ts`):

```typescript
const routes: Routes = [
  // ... existing routes
  {
    path: "debtors",
    loadChildren: () =>
      import("./modules/debtors/debtors-routing.module").then(
        (m) => m.DebtorsRoutingModule,
      ),
    canActivate: [AuthGuard],
  },
];
```

### 3. Navigation Menu

Add menu item to your sidebar/navbar:

```html
<a routerLink="/debtors" routerLinkActive="active">
  <svg><!-- icon --></svg>
  <span>Debtors</span>
</a>
```

## API Endpoints

| Method | Endpoint                            | Description                                 |
| ------ | ----------------------------------- | ------------------------------------------- |
| GET    | `/debtors`                          | Get all outstanding invoices (with filters) |
| GET    | `/debtors/aging-analysis`           | Get aged receivables report                 |
| GET    | `/debtors/customer/:id/statement`   | Get customer statement                      |
| GET    | `/debtors/customer/:id/payments`    | Get payment history                         |
| GET    | `/debtors/customer/:id/outstanding` | Get outstanding invoices                    |
| POST   | `/debtors/bulk-payment`             | Record bulk payment                         |

## Usage Examples

### Get Aging Analysis

```bash
curl -H "Authorization: Bearer {token}" http://localhost:3000/debtors/aging-analysis
```

### Record Bulk Payment

```bash
curl -X POST http://localhost:3000/debtors/bulk-payment \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": 1,
    "payments": [
      {"invoiceId": 1, "amount": 30000},
      {"invoiceId": 2, "amount": 20000}
    ],
    "paymentMethodId": 1,
    "paymentMethodCode": "MPESA",
    "paymentMethodName": "M-Pesa",
    "transactionCode": "QA12B3C4D5",
    "recordedBy": "John Admin"
  }'
```

### Search Debtors

```bash
curl -H "Authorization: Bearer {token}" \
  "http://localhost:3000/debtors?search=john&agingPeriod=DAYS_31_60&page=1&limit=50"
```

## Features Implemented

### ✅ Aged Receivables Analysis

- 5 aging buckets: 0-30, 31-60, 61-90, 91-120, 120+ days
- Customer-wise breakdown
- Summary cards with percentages
- CSV export
- Print functionality
- Search by customer name/phone/email

### ✅ Outstanding Invoices Management

- List all unpaid invoices for customer
- Checkbox selection for bulk payment
- Editable payment amounts per invoice
- Payment method selection
- Transaction code tracking

### ✅ Bulk Payment Processing

- Pay multiple invoices in one transaction
- Automatic invoice status updates
- Customer balance updates
- Transaction validation

### ✅ Customer Statement (Ready for implementation)

- Period-based filtering
- Complete invoice and payment history
- Running balance calculations
- Status breakdown

## Testing

### Backend

```bash
cd apps/backend

# Test aging analysis
curl http://localhost:3000/debtors/aging-analysis \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test customer outstanding
curl http://localhost:3000/debtors/customer/1/outstanding \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Frontend

```bash
cd apps/frontend

# Run dev server
pnpm dev:frontend

# Navigate to:
http://localhost:4200/debtors
```

## Configuration

### Payment Methods

Ensure you have payment methods configured:

```sql
-- Check payment methods
SELECT * FROM "PaymentMethodConfig";
```

### Permissions (Optional)

Add role-based guards to restrict access:

```typescript
// In debtors.controller.ts
@UseGuards(JwtGuard, RolesGuard)
@Roles("ADMIN", "ACCOUNTANT")
export class DebtorsController {
  // ...
}
```

## Accounting Standards Compliance

✅ **Aging Buckets**: Standard 30-day intervals  
✅ **Accrual Basis**: Revenue recognized on invoice date  
✅ **Audit Trail**: All payments tracked with recordedBy  
✅ **Transaction Codes**: External reference tracking  
✅ **Reconciliation**: Statement generation for period matching

## Performance Tips

1. **Database Indexes**: Ensure indexes exist on:
   - `Invoice.organizationId`
   - `Invoice.customerId`
   - `Invoice.dueDate`
   - `Invoice.balanceDue`

2. **Caching**: Consider caching aging analysis (expensive calculation)

3. **Pagination**: Use page/limit parameters for large datasets

## Troubleshooting

### Module not found

Ensure `DebtorsModule` is imported in `app.module.ts`:

```typescript
import { DebtorsModule } from "./debtors/debtors.module";
```

### API 401 Unauthorized

Check JWT token is valid and not expired.

### Aging calculation incorrect

Verify server timezone matches your business timezone.

### Payment not reflecting

Check transaction completed successfully - view browser console and backend logs.

## Next Steps

1. **Test the aging analysis**: Navigate to `/debtors`
2. **Create test data**: Create some overdue invoices to test aging buckets
3. **Test bulk payment**: Select multiple invoices and record payment
4. **Customize UI**: Update colors/styling to match your brand
5. **Add email reminders**: Build dunning email automation (future enhancement)

## Support

For detailed documentation, see [DEBTORS_MODULE_GUIDE.md](./DEBTORS_MODULE_GUIDE.md)

For issues:

- Backend: Check `apps/backend/src/debtors/`
- Frontend: Check `apps/frontend/src/app/modules/debtors/`
- Logs: Backend terminal and browser console
