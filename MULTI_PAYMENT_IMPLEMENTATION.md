# Multi-Payment Method Implementation

## Overview

Updated both Orders and Invoices to support multiple payment methods from organization-configured payment methods instead of hardcoded payment types.

## Database Changes

### New Models

#### OrderPayment

Tracks individual payments made for an order:

- `paymentMethodId` - Reference to PaymentMethodConfig (optional)
- `paymentMethodCode` - Payment method code (CASH, MPESA, BANK, etc.)
- `paymentMethodName` - Display name
- `amount` - Payment amount
- `transactionCode` - Reference number (e.g., M-PESA code)
- `paymentDate` - When payment was made
- `notes` - Optional notes
- `recordedBy` - Who recorded the payment

#### InvoicePayment (Updated)

Added new fields to link to PaymentMethodConfig:

- `paymentMethodId` - Reference to PaymentMethodConfig (optional)
- `paymentMethodCode` - Payment method code
- `paymentMethodName` - Display name
- Kept legacy `paymentMethod` enum for backward compatibility

### Relations

- `Order` → `OrderPayment[]` (one-to-many)
- `Invoice` → `InvoicePayment[]` (already existed, enhanced)
- `PaymentMethodConfig` → `OrderPayment[]` (one-to-many)
- `PaymentMethodConfig` → `InvoicePayment[]` (one-to-many)

## Backend Changes

### DTOs

**CreateOrderPaymentDto** (`orders/dto/order-payment.dto.ts`)

```typescript
{
  paymentMethodId?: number;
  paymentMethodCode: string;
  paymentMethodName: string;
  amount: number;
  transactionCode?: string;
  notes?: string;
  recordedBy: string;
  paymentDate?: Date;
}
```

**OrderDto** (updated)

- Added `payments?: CreateOrderPaymentDto[]` array
- Kept legacy fields for backward compatibility

**RecordPaymentDto** (updated for invoices)

- Added `paymentMethodId`, `paymentMethodCode`, `paymentMethodName`
- Kept legacy `paymentMethod` enum for backward compatibility

### Services

**OrdersService**

- `createOrder()` - Now creates OrderPayment records when `payments` array is provided
- `getAllOrders()` - Includes `payments` relation with payment details

**InvoiceService**

- `recordPayment()` - Enhanced to support PaymentMethodConfig
- Automatically falls back to legacy payment method if new fields not provided

**PaymentMethodService**

- `findEnabledByOrganization(organizationId)` - Get enabled payment methods

## API Endpoints

### Get Payment Methods

```
GET /payment-methods/organization/:organizationId/enabled
```

Returns enabled payment methods for an organization

### Create Order with Multiple Payments

```
POST /orders/:organizationId
{
  "items": [...],
  "total": 1000,
  "totalAmountPaid": 1000,
  "payments": [
    {
      "paymentMethodId": 1,
      "paymentMethodCode": "CASH",
      "paymentMethodName": "Cash Payment",
      "amount": 600,
      "recordedBy": "John Doe"
    },
    {
      "paymentMethodId": 2,
      "paymentMethodCode": "MPESA",
      "paymentMethodName": "M-PESA",
      "amount": 400,
      "transactionCode": "QXR123456",
      "recordedBy": "John Doe"
    }
  ]
}
```

### Record Invoice Payment

```
POST /invoices/:organizationId/:invoiceId/payments
{
  "amount": 500,
  "paymentMethodId": 2,
  "paymentMethodCode": "MPESA",
  "paymentMethodName": "M-PESA",
  "transactionCode": "QXR789012",
  "recordedBy": "Jane Smith"
}
```

## Migration

Migration `20260111100425_add_multi_payment_support` has been created and applied.

## Backward Compatibility

- Legacy `cashPaid`, `mpesaPaid`, `bankPaid` fields maintained in Order model
- Legacy `paymentMethod` enum maintained in InvoicePayment
- Services handle both old and new payment formats
- Frontend can gradually migrate to use new payment array

## Next Steps for Frontend

1. Fetch payment methods: `GET /payment-methods/organization/:id/enabled`
2. Display payment method selector in order/invoice forms
3. Allow adding multiple payments with amounts
4. Update order list to show payment breakdown
5. Update invoice payment recording UI

## Benefits

- ✅ Flexible payment methods per organization
- ✅ Support for custom payment providers
- ✅ Multiple payments per transaction
- ✅ Better payment tracking and reconciliation
- ✅ Audit trail for each payment
- ✅ Transaction reference support
- ✅ Backward compatible with existing code
