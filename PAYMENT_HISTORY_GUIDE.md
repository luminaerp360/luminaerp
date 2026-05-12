# Payment History Feature - Quick Reference

## Overview

The Payment History feature provides a comprehensive view of all invoice payments with advanced filtering capabilities. This allows users to track, analyze, and export payment data across the organization.

## Access

**URL**: `/debtors/payment-history`

**From Aging Analysis**: Click the "Payment History" button in the header

## Features

### 1. Advanced Filters

**Available Filters**:

- **Search**: Search by customer name, invoice number, or transaction code
- **Date Range**: Filter by payment date (start and end date)
- **Payment Method**: Filter by specific payment method (Cash, M-Pesa, Bank Transfer, etc.)
- **Pagination**: Navigate through large datasets with configurable page size

**Filter Actions**:

- `Apply Filters` - Apply selected filters and refresh data
- `Clear Filters` - Reset all filters to default

### 2. Summary Cards

**Displayed Metrics**:

- **Total Paid**: Sum of all payment amounts in the filtered results
- **Total Payments**: Count of payment transactions
- **Average Payment**: Average payment amount
- **Payment Methods**: List of payment methods used with color-coded badges

### 3. Payment Table

**Columns**:

- Date & Time - When the payment was recorded
- Invoice # - Linked to invoice details
- Customer - Linked to customer outstanding invoices
- Amount - Payment amount in KES
- Payment Method - Color-coded badge
- Transaction Code - Reference number (e.g., M-Pesa code)
- Recorded By - User who recorded the payment
- Actions - Quick links to view invoice

**Interactive Elements**:

- Click invoice number to view invoice details
- Click customer name to view their outstanding invoices
- Hover effects for better UX

### 4. Export & Print

**Export to CSV**:

- Downloads all filtered payment data
- Includes: Date, Invoice #, Customer, Amount, Payment Method, Transaction Code, Recorded By, Notes
- Filename format: `payment-history-YYYY-MM-DD.csv`

**Print**:

- Print-optimized layout
- Removes filters and action buttons
- Clean, professional format

### 5. Pagination

**Features**:

- Page size: 20 payments per page (configurable)
- Navigation: Previous/Next buttons
- Page numbers: Click to jump to specific page
- Status: Shows current range (e.g., "Showing 1 to 20 of 150 payments")

## API Endpoints

### Get Payment History

```
GET /debtors/payment-history
```

**Query Parameters**:

- `customerId` (optional) - Filter by customer ID
- `invoiceId` (optional) - Filter by invoice ID
- `startDate` (optional) - ISO date string
- `endDate` (optional) - ISO date string
- `paymentMethodCode` (optional) - e.g., "CASH", "MPESA"
- `search` (optional) - Search term
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 50)

**Response**:

```json
{
  "payments": [
    {
      "id": 501,
      "amount": 5000,
      "paymentDate": "2026-02-01T10:00:00Z",
      "paymentMethodCode": "CASH",
      "paymentMethodName": "Cash Payment",
      "transactionCode": "TXN-12345",
      "recordedBy": "Jane Smith",
      "notes": "Partial payment",
      "invoice": {
        "id": 101,
        "invoiceNumber": "INV-2024-001",
        "totalAmount": 10000,
        "balanceDue": 5000,
        "customer": {
          "id": 1,
          "fullName": "John Doe",
          "phoneNumber": "+254700000000",
          "email": "john@example.com"
        }
      },
      "paymentMethodConfig": {
        "id": 1,
        "name": "Cash",
        "code": "CASH",
        "displayName": "Cash Payment"
      }
    }
  ],
  "summary": {
    "totalPayments": 150,
    "totalPaid": 750000,
    "averagePayment": 5000,
    "paymentMethods": [
      { "code": "CASH", "name": "Cash" },
      { "code": "MPESA", "name": "M-Pesa" }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

## Use Cases

### 1. Daily Payment Reconciliation

- Filter by today's date
- Export to CSV
- Compare with bank deposits

### 2. Customer Payment Analysis

- Filter by specific customer
- View payment patterns
- Identify payment methods used

### 3. Payment Method Performance

- Filter by payment method
- Analyze transaction volumes
- Track transaction codes

### 4. Period-Based Reporting

- Set date range (e.g., monthly)
- View summary metrics
- Export for accounting records

### 5. Transaction Verification

- Search by transaction code
- Verify payment details
- Link to original invoice

## Technical Details

### Backend Implementation

**Service**: `DebtorsService.getAllPaymentHistory()`
**Location**: `apps/backend/src/debtors/debtors.service.ts`

**Features**:

- Complex filtering with Prisma
- Pagination support
- Search across multiple fields (customer name, invoice number, transaction code)
- Summary calculations
- Distinct payment methods aggregation

**Performance Optimizations**:

- Indexed queries on `paymentDate`, `invoiceId`
- Pagination to limit data transfer
- Efficient aggregations

### Frontend Implementation

**Component**: `PaymentHistoryComponent`
**Location**: `apps/frontend/src/app/modules/debtors/payment-history/`

**Features**:

- Reactive filters with immediate feedback
- Toast notifications for errors
- Responsive design (mobile-friendly)
- Print-optimized layout
- CSV export functionality

**State Management**:

- Local component state
- Filter persistence across page navigation
- Loading states

## Best Practices

### For Users

1. **Use Date Filters**: Always set a date range for large datasets to improve performance
2. **Combine Filters**: Use multiple filters for precise results (e.g., date + payment method)
3. **Export Regularly**: Export data for archival and external analysis
4. **Verify Transactions**: Always check transaction codes match your records

### For Developers

1. **Performance**: Add indexes on frequently filtered fields
2. **Pagination**: Always use pagination for large datasets
3. **Caching**: Consider caching summary calculations for better performance
4. **Error Handling**: Always handle API errors gracefully with user feedback
5. **Validation**: Validate date ranges on both frontend and backend

## Troubleshooting

### Issue: No data showing

**Solutions**:

- Check if date filters are too restrictive
- Clear all filters and try again
- Verify backend API is responding
- Check browser console for errors

### Issue: Export not working

**Solutions**:

- Ensure there is data to export
- Check browser allows downloads
- Verify CSV generation logic

### Issue: Pagination not working

**Solutions**:

- Check total records count
- Verify page number is valid
- Check backend pagination logic

## Future Enhancements

- [ ] Payment refund/reversal tracking
- [ ] Payment analytics dashboard
- [ ] Automated reconciliation reports
- [ ] Real-time payment notifications
- [ ] Advanced search with filters (amount range, etc.)
- [ ] Batch payment operations
- [ ] Integration with accounting software
- [ ] Payment method analytics

## Related Features

- **Aging Analysis**: View customer aging reports
- **Outstanding Invoices**: View unpaid invoices by customer
- **Bulk Payment**: Record payments for multiple invoices
- **Invoice Details**: View individual invoice and payment details

## Support

For issues or questions:

1. Check error messages in browser console
2. Verify API responses in Network tab
3. Check backend logs for server errors
4. Contact development team with specific error details
