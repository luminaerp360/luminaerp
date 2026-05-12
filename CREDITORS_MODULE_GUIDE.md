# Creditors (Accounts Payable) Module - Complete Guide

## Overview

The Creditors module has been fully updated to match the Debtors module functionality, providing comprehensive accounts payable management with bulk bill payments, supplier tracking, payment history, and aging analysis.

## Backend Implementation

### DTOs Created

Location: `apps/backend/src/accounts-payable/dto/`

1. **BulkBillPaymentDto** - For processing multiple bill payments at once
2. **BillPaymentHistoryFilterDto** - For filtering payment history
3. **SupplierFilterDto** - For filtering supplier list
4. **SupplierStatementFilterDto** - For supplier statement date filters

### Service Methods Added

Location: `apps/backend/src/accounts-payable/accounts-payable.service.ts`

1. **recordBulkBillPayment()**
   - Process multiple bill payments in a single transaction
   - Validates payment amounts against bill balances
   - Updates bill status (PAID/PARTIALLY_PAID)
   - Returns success/failure summary

2. **getAllSuppliers()**
   - Get all suppliers with or without outstanding debt
   - Search by name, phone, email
   - Calculate totals: bills, amounts, payments, balances
   - Option to filter suppliers with debt only

3. **getAllBillPaymentHistory()**
   - Comprehensive payment history with filters
   - Search by supplier, bill number, reference
   - Filter by date range, payment method, supplier
   - Pagination support (default 50 per page)
   - Summary totals

4. **getAgingAnalysis()**
   - Categorize bills into aging buckets:
     - CURRENT (not yet due)
     - DAYS_1_30
     - DAYS_31_60
     - DAYS_61_90
     - OVER_90
   - Summary: total outstanding, total bills, total suppliers

### Controller Endpoints Added

Location: `apps/backend/src/accounts-payable/accounts-payable.controller.ts`

```
POST   /organizations/:organizationId/accounts-payable/bulk-payment
GET    /organizations/:organizationId/accounts-payable/suppliers
GET    /organizations/:organizationId/accounts-payable/payment-history
GET    /organizations/:organizationId/accounts-payable/aging-analysis
```

## Frontend Implementation

### Services

Location: `apps/frontend/src/app/shared/Services/creditors.service.ts`

**CreditorsService** provides methods for:

- `getAgingAnalysis()` - Get aging bucket analysis
- `getAllSuppliers()` - Get supplier list with filters
- `getSupplierStatement()` - Get statement for specific supplier
- `getOutstandingBills()` - Get unpaid bills for supplier
- `recordBulkPayment()` - Submit bulk bill payment
- `getPaymentHistory()` - Get filtered payment history
- `getPaymentMethods()` - Get available payment methods

### Types

Location: `apps/frontend/src/app/types/creditors.types.ts`

Defines TypeScript interfaces for:

- Supplier
- BillSummary
- AgingAnalysis
- BillPayment
- BulkBillPaymentDto
- PaymentHistoryFilter
- PaymentMethodConfig
- Enums: BillStatus, PaymentMethod

### Components

#### 1. Creditors Dashboard

**Location:** `apps/frontend/src/app/modules/creditors/creditors-dashboard/`
**Route:** `/creditors`

**Features:**

- Aging analysis visualization (5 buckets)
- Summary cards: total outstanding, suppliers with bills, total bills
- Quick navigation to suppliers and payment history
- Color-coded aging buckets (green → red)

#### 2. Supplier List

**Location:** `apps/frontend/src/app/modules/creditors/supplier-list/`
**Route:** `/creditors/suppliers`

**Features:**

- View all suppliers (with or without debt)
- Search by name, phone, email
- Toggle to show only suppliers with outstanding debt
- Summary: total suppliers, suppliers with debt, total outstanding
- Export to CSV
- Actions: View Statement, Pay Bills
- Status badges (Clear/Has Debt)

#### 3. Outstanding Bills

**Location:** `apps/frontend/src/app/modules/creditors/outstanding-bills/`
**Route:** `/creditors/outstanding-bills/:supplierId`

**Features:**

- Multi-select bills for bulk payment
- Adjustable payment amounts (cannot exceed balance)
- Select All / Deselect All functionality
- Payment modal with:
  - Payment date
  - Payment method selection
  - Reference number
  - Transaction code
  - Notes
- Real-time summary: selected bills, total amount
- Days overdue calculation
- Status badges

#### 4. Bill Payment History

**Location:** `apps/frontend/src/app/modules/creditors/bill-payment-history/`
**Route:** `/creditors/payment-history`

**Features:**

- Advanced filters:
  - Search (bill number, supplier, reference)
  - Date range (defaults to current month)
  - Payment method
  - Specific supplier
- Pagination (50 per page, customizable)
- Summary: total payments, total amount
- Payment method badges (color-coded)
- Export to CSV
- Navigate to supplier statement

#### 5. Supplier Statement

**Location:** `apps/frontend/src/app/modules/creditors/supplier-statement/`
**Route:** `/creditors/supplier-statement/:supplierId`

**Features:**

- Dedicated page (converted from modal)
- Date range filters
- Supplier information display
- Summary totals
- Aging analysis breakdown
- Unpaid bills table
- Paid bills table
- Print functionality
- Back navigation

### Routing

Location: `apps/frontend/src/app/modules/creditors/creditors-routing.module.ts`

All components are lazy-loaded using standalone components:

- Dashboard (default route)
- Suppliers list
- Outstanding bills (dynamic supplier ID)
- Payment history
- Supplier statement (dynamic supplier ID)

## Key Differences from Debtors Module

### Terminology

- **Debtors:** Customers, Invoices, Invoice Payments
- **Creditors:** Suppliers, Bills, Bill Payments

### Status Enums

**BillStatus:**

- DRAFT
- PENDING
- APPROVED
- PARTIALLY_PAID
- PAID
- OVERDUE
- CANCELLED

**InvoiceStatus** (similar but used for debtors)

### Database Schema

Both use similar patterns:

- Bill/Invoice records with `paidAmount`, `balanceAmount`
- BillPayment/InvoicePayment records
- Supplier/Customer relationships
- Multi-tenant with `organizationId`

## Usage Guide

### 1. View Aging Analysis

Navigate to `/creditors` to see:

- Color-coded aging buckets
- Click buckets to filter suppliers
- Quick actions to suppliers or payment history

### 2. Manage Suppliers

Navigate to `/creditors/suppliers` to:

- View all suppliers or only those with debt
- Search suppliers
- Export data
- View statements or pay bills

### 3. Pay Bills (Bulk)

From supplier list, click "Pay Bills" to:

1. See all outstanding bills
2. Select multiple bills
3. Adjust payment amounts
4. Choose payment method
5. Add reference/transaction codes
6. Submit bulk payment

### 4. Track Payment History

Navigate to `/creditors/payment-history` to:

- Search all payments
- Filter by date, method, supplier
- Export payment records
- View supplier statements

### 5. View Supplier Statement

From supplier list or payment history, click "Statement" to:

- See all bills (paid and unpaid)
- View aging breakdown
- Print statement
- Filter by date range

## API Integration

### Authorization

All endpoints require JWT authentication via `JwtGuard`.

### Organization Context

All operations are scoped to the user's organization via `organizationId` from JWT token.

### Error Handling

- Service methods validate organization access
- Bulk payment returns both successes and failures
- Frontend displays appropriate error messages

## Payment Methods

Payment methods are configured via `PaymentMethodConfig` table:

- **CASH** - Cash payments
- **MPESA** - Mobile money
- **BANK_TRANSFER** - Bank transfers
- **CREDIT** - Credit terms

Each method can require:

- Reference number
- Transaction code
- Both fields

## Best Practices

### Bulk Payments

1. Always validate payment amounts ≤ balance
2. Use reference numbers for audit trail
3. Add notes for context
4. Review success/failure summary

### Filtering

1. Use date ranges to limit result sets
2. Export data for external analysis
3. Search by multiple criteria (name, phone, email)

### Statement Review

1. Regular statement review prevents disputes
2. Use aging analysis to prioritize payments
3. Print statements for record-keeping

## Testing Checklist

### Backend

- [ ] Bulk payment with valid bills
- [ ] Bulk payment with invalid amounts
- [ ] Payment exceeding balance (should fail)
- [ ] Filter suppliers by search query
- [ ] Filter suppliers by debt status
- [ ] Payment history pagination
- [ ] Aging analysis calculation

### Frontend

- [ ] Navigate all routes
- [ ] Bulk select/deselect bills
- [ ] Submit bulk payment
- [ ] Filter payment history
- [ ] Export CSV files
- [ ] Print supplier statement
- [ ] Search suppliers
- [ ] Toggle debt filter

## Integration with Existing Modules

### LPO (Local Purchase Orders)

Bills can be created from approved LPOs using:

```
POST /organizations/:organizationId/accounts-payable/bills/from-lpo/:lpoId
```

### Chart of Accounts

Accounts payable integrates with accounting for:

- Liability tracking
- Expense allocation
- Journal entries

### Reports

Payment history supports:

- Vendor payment reports
- Cash flow analysis
- Expense tracking

## Security Considerations

1. **Authorization:** All endpoints protected by JWT
2. **Organization Isolation:** Multi-tenant filtering
3. **Payment Validation:** Amount limits checked
4. **Audit Trail:** All payments logged with creator
5. **Role-Based Access:** PermissionGuard on routes

## Performance Optimizations

1. **Pagination:** Large datasets paginated (50 per page)
2. **Lazy Loading:** Components loaded on demand
3. **Efficient Queries:** Database queries optimized with indexes
4. **Caching:** Consider Redis caching for frequently accessed data

## Deployment Notes

1. **Database Migrations:** Run `pnpm prisma:deploy` after updating schema
2. **Frontend Build:** `pnpm build:frontend` includes all new components
3. **Backend Restart:** PM2 auto-restarts on code changes
4. **Browser Cache:** Clear cache after deployment for routing changes

## Troubleshooting

### Common Issues

**"Bill not found" error:**

- Verify bill belongs to correct organization
- Check bill ID is valid

**Bulk payment partial failures:**

- Review individual error messages in response
- Common: payment exceeds balance, bill already paid

**Routing not working:**

- Clear browser cache
- Verify lazy loading module imports
- Check route permissions in auth guard

**Payment methods not loading:**

- Verify PaymentMethodConfig table has active methods
- Check organization has payment methods configured

## Future Enhancements

1. **Recurring Bills:** Schedule automatic bill creation
2. **Payment Reminders:** Email/SMS reminders before due dates
3. **Bill Approval Workflow:** Multi-level approval process
4. **Vendor Portal:** Allow vendors to submit invoices
5. **Payment Scheduling:** Schedule future payments
6. **Batch Printing:** Print multiple statements
7. **Analytics Dashboard:** Advanced payment analytics

## Support

For issues or questions:

1. Check backend logs: `pm2 logs backend`
2. Check frontend console for errors
3. Verify database connectivity
4. Review API responses in network tab

## Related Documentation

- [DEBTORS_MODULE_GUIDE.md](DEBTORS_MODULE_GUIDE.md) - Similar structure for receivables
- [MODERN_INVENTORY_SYSTEM.md](apps/backend/MODERN_INVENTORY_SYSTEM.md) - Inventory integration
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Production deployment
- [SETTINGS_MODULE_GUIDE.md](SETTINGS_MODULE_GUIDE.md) - Payment method configuration
