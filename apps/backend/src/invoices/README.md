# Modern Invoice System

A complete, modern invoicing system for the Lumina ERP platform with advanced features including QR codes, public sharing, multiple themes, payment tracking, and more.

## 🎯 Features

### Core Features
- ✅ **Smart Invoice Numbering**: Auto-generated sequential numbers (INV-2026-00001)
- ✅ **Multiple Invoice Types**: Credit Sale, Standard, Proforma, Recurring, Quote
- ✅ **Advanced Status Tracking**: Draft, Sent, Viewed, Paid, Overdue, Cancelled
- ✅ **Proper Relational Data**: Invoice items as separate entities (not JSON)
- ✅ **Payment Tracking**: Multiple payments per invoice with full history
- ✅ **Customer Integration**: Linked to customer records with credit management

### Digital Features
- 📱 **QR Code Generation**: Auto-generate QR codes for invoices and payments
- 🔗 **Public Invoice Sharing**: Shareable links with unique tokens
- 📧 **Email/SMS Tracking**: Track when invoices are sent, viewed, and paid
- 📊 **Real-time Analytics**: Invoice stats, aging reports, payment trends

### Professional Features
- 🎨 **Multiple PDF Themes**: Default, Modern, Professional, Elegant
- 🏢 **Logo Support**: Company logo in invoices
- 🔖 **Watermarks**: Add PAID, DRAFT, OVERDUE watermarks
- 💱 **Tax Compliance**: TIN, VAT, GST support with per-item tax rates
- 📝 **Terms & Conditions**: Custom legal terms on each invoice
- ⏰ **Late Fees**: Automatic late fee calculation
- 📅 **Flexible Payment Terms**: Net 30, Due on Receipt, custom terms

### Payment Features
- 💳 **Multiple Payment Methods**: Cash, M-PESA, Bank Transfer, Credit
- 🇰🇪 **M-PESA Integration Ready**: Paybill and Till number support
- 💰 **Partial Payments**: Track multiple payments toward invoice total
- 🔄 **Auto-status Updates**: Status changes based on payment status

## 📁 File Structure

```
src/invoices/
├── README.md                    # This file
├── invoice.dto.ts              # DTOs for all invoice operations
├── invoice.service.ts          # Main invoice business logic
├── invoice.controller.ts       # REST API endpoints
├── invoice.module.ts           # NestJS module
├── invoice-number.service.ts   # Invoice numbering system
├── invoice-pdf.service.ts      # Enhanced PDF generation
├── qr-code.service.ts         # QR code generation
└── migration.service.ts        # Migrate old credit sales
```

## 🚀 Getting Started

### 1. Run Database Migration

```bash
# Generate Prisma migration
npx prisma migrate dev --name add_invoice_system

# Apply migration
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

### 2. Install Dependencies

```bash
npm install qrcode @types/qrcode
```

### 3. Register Module

In your `app.module.ts`:

```typescript
import { InvoiceModule } from './invoices/invoice.module';

@Module({
  imports: [
    // ... other modules
    InvoiceModule,
  ],
})
export class AppModule {}
```

### 4. Environment Variables

Add to your `.env`:

```env
FRONTEND_URL=https://your-frontend-url.com
```

## 📚 API Endpoints

### Invoice Management

#### Create Invoice
```http
POST /invoices/:organizationId
Content-Type: application/json

{
  "customerId": 1,
  "items": [
    {
      "productName": "Product A",
      "quantity": 2,
      "unitPrice": 100,
      "taxRate": 16
    }
  ],
  "paymentTerms": "Net 30",
  "createdBy": "John Doe",
  "sendEmail": true
}
```

#### Get All Invoices
```http
GET /invoices/:organizationId?status=PAID&page=1&limit=50
```

#### Get Invoice by ID
```http
GET /invoices/:organizationId/:id
```

#### Update Invoice
```http
PUT /invoices/:organizationId/:id
Content-Type: application/json

{
  "status": "SENT",
  "notes": "Updated notes"
}
```

#### Delete Invoice
```http
DELETE /invoices/:organizationId/:id
```

### Payment Management

#### Record Payment
```http
POST /invoices/:organizationId/:id/payments
Content-Type: application/json

{
  "amount": 500,
  "paymentMethod": "MPESA",
  "transactionCode": "ABC123",
  "recordedBy": "Jane Doe"
}
```

### Public Access

#### View Public Invoice
```http
GET /invoices/public/:token
```
No authentication required - customer can view invoice via shared link.

### Analytics

#### Get Invoice Statistics
```http
GET /invoices/:organizationId/stats?startDate=2026-01-01&endDate=2026-01-31
```

Response:
```json
{
  "totalInvoices": 150,
  "paidInvoices": 100,
  "overdueInvoices": 20,
  "pendingInvoices": 30,
  "totalAmount": 500000,
  "totalPaid": 400000,
  "totalOverdue": 50000,
  "totalOutstanding": 100000
}
```

## 💾 Database Schema

### Invoice Table
```prisma
model Invoice {
  id                 Int              @id @default(autoincrement())
  invoiceNumber      String           @unique
  invoiceType        InvoiceType
  customerId         Int
  customer           Customer         @relation(...)

  // Financial
  subtotal           Float
  taxAmount          Float
  discountAmount     Float
  totalAmount        Float
  amountPaid         Float
  balanceDue         Float

  // Status
  status             InvoiceStatus
  fullyPaid          Boolean

  // Items & Payments
  items              InvoiceItem[]
  payments           InvoicePayment[]

  // Digital Features
  publicToken        String?          @unique
  qrCodeData         String?
}
```

## 🎨 PDF Themes

### Available Themes
1. **Default** - Classic blue theme
2. **Modern** - Purple gradient theme
3. **Professional** - Corporate blue theme
4. **Elegant** - Minimalist gray theme

### Using Themes

```typescript
await invoicePDFService.generateInvoicePDF(invoiceId, {
  theme: 'modern',
  includeQRCode: true,
  watermark: 'PAID'
});
```

## 🔄 Migration from Old System

### Migrate All Credit Sales

```typescript
// In your migration controller/script
const result = await migrationService.migrateAllCreditSales(organizationId);

console.log(`Migrated ${result.successful} invoices`);
console.log(`Failed: ${result.failed}`);
```

### Verify Migration

```typescript
const verification = await migrationService.verifyMigration(organizationId);

if (verification.migrationComplete) {
  console.log('Migration completed successfully!');
}
```

### Rollback Migration

```typescript
await migrationService.rollbackMigration(organizationId);
```

## 📊 Usage Examples

### Example 1: Create Credit Sale Invoice

```typescript
const invoice = await invoiceService.createInvoice(organizationId, {
  invoiceType: 'CREDIT_SALE',
  customerId: 123,
  items: [
    {
      productId: 1,
      productName: 'Widget A',
      quantity: 5,
      unitPrice: 200,
      taxRate: 16,
    },
    {
      productName: 'Service Fee',
      quantity: 1,
      unitPrice: 100,
    }
  ],
  paymentTerms: 'Net 30',
  paymentTermsDays: 30,
  taxRate: 16,
  taxType: 'VAT',
  organizationTaxId: 'P051234567X',
  notes: 'Thank you for your business',
  termsAndConditions: 'Payment due within 30 days',
  createdBy: 'John Doe',
  sendEmail: true,
});
```

### Example 2: Record Partial Payment

```typescript
const { payment, invoice } = await invoiceService.recordPayment(
  organizationId,
  invoiceId,
  {
    amount: 500,
    paymentMethod: 'MPESA',
    transactionCode: 'QXY123ABC',
    notes: 'Partial payment via M-PESA',
    recordedBy: 'Jane Doe',
  }
);

// Invoice status automatically updated to PARTIALLY_PAID
```

### Example 3: Generate Invoice with QR Code

```typescript
// QR code is automatically generated during invoice creation
const invoice = await invoiceService.createInvoice(organizationId, dto);

// The invoice.qrCodeData contains a data URL of the QR code
// The QR code includes:
// - Invoice number
// - Amount
// - Due date
// - Public viewing URL
```

### Example 4: Check Overdue Invoices

```typescript
// Update all overdue invoices
await invoiceService.updateOverdueInvoices(organizationId);

// Apply late fees
await invoiceService.calculateLateFees(organizationId, invoiceId);
```

## 🔧 Customization

### Custom Invoice Numbering

```typescript
// In invoice-number.service.ts
const invoiceNumber = await invoiceNumberService.generateCustomInvoiceNumber(
  organizationId,
  {
    prefix: 'SALE',
    includeYear: true,
    includeMonth: true,
    sequenceLength: 6,
    separator: '-',
  }
);
// Result: SALE-2026-01-000001
```

### Custom Payment Terms

```typescript
// Predefined terms
const terms = [
  'Due on Receipt',
  'Net 7',
  'Net 15',
  'Net 30',
  'Net 60',
  'Net 90',
  'EOM', // End of Month
  '2/10 Net 30', // 2% discount if paid within 10 days
];
```

## 📈 Best Practices

1. **Always use transactions** when creating/updating invoices
2. **Track view events** when customers access invoices
3. **Send notifications** when invoice status changes
4. **Run overdue check** daily via cron job
5. **Backup data** before running migrations
6. **Validate payments** before recording
7. **Use proper invoice types** for different scenarios
8. **Include tax details** for compliance
9. **Set realistic payment terms**
10. **Archive old invoices** regularly

## 🔐 Security Considerations

- Public tokens are 32-character random strings
- Invoices can only be accessed by:
  - Organization members (authenticated)
  - Public token holders (unauthenticated, read-only)
- Payment recording requires authentication
- Soft-delete for invoices with payments
- Audit trail through createdBy/recordedBy fields

## 🐛 Troubleshooting

### Invoice Number Conflicts
```typescript
// Check if number exists
const exists = await invoiceNumberService.invoiceNumberExists(number);
```

### Migration Issues
```typescript
// Verify migration
const verification = await migrationService.verifyMigration(organizationId);

// Check for duplicates
const duplicates = await prisma.invoice.groupBy({
  by: ['oldCreditSaleId'],
  having: { oldCreditSaleId: { _count: { gt: 1 } } },
});
```

### QR Code Not Generating
- Ensure qrcode package is installed
- Check FRONTEND_URL is set in .env
- Verify public token is generated

## 📝 TODO / Future Enhancements

- [ ] Recurring invoice automation
- [ ] Email template customization
- [ ] SMS notifications via Africa's Talking
- [ ] Stripe/PayPal payment integration
- [ ] Multi-currency support
- [ ] Invoice templating engine
- [ ] Bulk invoice operations
- [ ] Advanced reporting/analytics
- [ ] Invoice approval workflows
- [ ] Credit note system

## 📞 Support

For issues or questions, please contact the development team or create an issue in the repository.

---

**Version**: 1.0.0
**Last Updated**: January 2026
**Author**: Lumina ERP Team
