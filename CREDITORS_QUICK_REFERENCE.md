# Creditors Module - Quick Reference

## Routes

| Route                                       | Component                   | Description                  |
| ------------------------------------------- | --------------------------- | ---------------------------- |
| `/creditors`                                | CreditorsDashboardComponent | Aging analysis dashboard     |
| `/creditors/suppliers`                      | SupplierListComponent       | All suppliers list           |
| `/creditors/outstanding-bills/:supplierId`  | OutstandingBillsComponent   | Bulk bill payment            |
| `/creditors/payment-history`                | BillPaymentHistoryComponent | Payment history with filters |
| `/creditors/supplier-statement/:supplierId` | SupplierStatementComponent  | Supplier statement           |

## API Endpoints

### Aging Analysis

```
GET /organizations/:organizationId/accounts-payable/aging-analysis
```

### Suppliers

```
GET /organizations/:organizationId/accounts-payable/suppliers
    ?searchQuery=string
    &showOnlyWithDebt=boolean
```

### Bulk Payment

```
POST /organizations/:organizationId/accounts-payable/bulk-payment
Body: {
  billPayments: [{ billId: number, amount: number }],
  paymentDate: string,
  paymentMethod: PaymentMethod,
  referenceNumber?: string,
  transactionCode?: string,
  notes?: string,
  createdBy: number
}
```

### Payment History

```
GET /organizations/:organizationId/accounts-payable/payment-history
    ?searchQuery=string
    &startDate=string
    &endDate=string
    &paymentMethod=PaymentMethod
    &supplierId=number
    &page=number
    &limit=number
```

### Supplier Statement

```
GET /organizations/:organizationId/accounts-payable/suppliers/:supplierId/statement
    ?startDate=string
    &endDate=string
```

## Payment Methods

- `CASH` - Cash payment
- `MPESA` - Mobile money
- `BANK_TRANSFER` - Bank transfer
- `CREDIT` - Credit terms

## Bill Statuses

- `DRAFT` - Not finalized
- `PENDING` - Awaiting approval
- `APPROVED` - Approved for payment
- `PARTIALLY_PAID` - Some payment made
- `PAID` - Fully paid
- `OVERDUE` - Past due date
- `CANCELLED` - Cancelled bill

## Aging Buckets

1. **CURRENT** - Bills not yet due (Green)
2. **DAYS_1_30** - 1-30 days overdue (Blue)
3. **DAYS_31_60** - 31-60 days overdue (Yellow)
4. **DAYS_61_90** - 61-90 days overdue (Orange)
5. **OVER_90** - Over 90 days overdue (Red)

## Common Operations

### 1. View Suppliers with Debt

Navigate to `/creditors/suppliers` and toggle "Show only suppliers with debt"

### 2. Pay Multiple Bills

1. Go to `/creditors/suppliers`
2. Click "Pay Bills" for supplier
3. Select bills to pay
4. Adjust amounts if needed
5. Click "Pay X Bill(s)"
6. Fill payment details
7. Submit

### 3. Search Payments

1. Go to `/creditors/payment-history`
2. Use filters:
   - Search by bill/supplier/reference
   - Date range
   - Payment method
   - Specific supplier
3. Click "Apply"
4. Export to CSV if needed

### 4. View Supplier Statement

1. Go to `/creditors/suppliers`
2. Click "Statement" for supplier
3. Adjust date range if needed
4. Print if needed

## File Locations

### Backend

- Service: `apps/backend/src/accounts-payable/accounts-payable.service.ts`
- Controller: `apps/backend/src/accounts-payable/accounts-payable.controller.ts`
- DTOs: `apps/backend/src/accounts-payable/dto/`

### Frontend

- Service: `apps/frontend/src/app/shared/Services/creditors.service.ts`
- Types: `apps/frontend/src/app/types/creditors.types.ts`
- Components: `apps/frontend/src/app/modules/creditors/`
- Routing: `apps/frontend/src/app/modules/creditors/creditors-routing.module.ts`

## Testing URLs (Development)

Assuming backend on port 3000 and frontend on port 4200:

```
http://localhost:4200/creditors
http://localhost:4200/creditors/suppliers
http://localhost:4200/creditors/outstanding-bills/1
http://localhost:4200/creditors/payment-history
http://localhost:4200/creditors/supplier-statement/1
```

## Common Validation Rules

1. **Payment Amount**
   - Must be > 0
   - Cannot exceed bill balance
   - Must be positive number

2. **Date Filters**
   - Optional but recommended
   - Defaults to current month
   - Use ISO format (YYYY-MM-DD)

3. **Search**
   - Case-insensitive
   - Searches: name, phone, email
   - Updates on change

## Error Messages

| Error                             | Cause                        | Solution                              |
| --------------------------------- | ---------------------------- | ------------------------------------- |
| "Bill not found"                  | Invalid bill ID or wrong org | Verify bill exists and belongs to org |
| "Payment exceeds balance"         | Amount > balance             | Reduce payment amount                 |
| "Please select at least one bill" | No bills selected            | Select one or more bills              |
| "Failed to load bills"            | Network/API error            | Check network and try again           |

## Keyboard Shortcuts

- **Ctrl+P** - Print statement (on statement page)
- **Enter** - Submit filters/forms
- **Escape** - Close payment modal

## Tips

1. **Performance**: Use date ranges to limit result sets
2. **Accuracy**: Always verify payment amounts before submitting
3. **Audit Trail**: Add reference numbers and notes to all payments
4. **Regular Reviews**: Check aging analysis weekly
5. **Exports**: Export data regularly for reconciliation

## Related Modules

- **Debtors** - Similar structure for accounts receivable
- **LPO** - Create bills from purchase orders
- **Chart of Accounts** - Accounting integration
- **Reports** - Payment and expense reports

## Next Steps After Installation

1. ✅ Verify backend endpoints respond
2. ✅ Test aging analysis loads
3. ✅ Create test suppliers if needed
4. ✅ Create test bills
5. ✅ Test bulk payment workflow
6. ✅ Verify payment history
7. ✅ Test supplier statement
8. ✅ Configure payment methods

## Support

See [CREDITORS_MODULE_GUIDE.md](CREDITORS_MODULE_GUIDE.md) for full documentation.
