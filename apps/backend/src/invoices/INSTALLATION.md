# Invoice System Installation Guide

## 🚀 Quick Start (No QR Codes)

The invoice system is ready to use immediately without QR code functionality.

### Step 1: Run Database Migration

```bash
cd apps/backend

# Create migration
npx prisma migrate dev --name add_invoice_system

# Generate Prisma client
npx prisma generate
```

### Step 2: Register the Module

Add to your `app.module.ts`:

```typescript
import { InvoiceModule } from './invoices/invoice.module';

@Module({
  imports: [
    // ... your other modules
    InvoiceModule,
  ],
})
export class AppModule {}
```

### Step 3: Set Environment Variables

Add to your `.env`:

```env
FRONTEND_URL=http://localhost:4200
# or your production URL
```

### Step 4: Test the API

Start your dev server:

```bash
npm run dev
```

Test creating an invoice:

```bash
curl -X POST http://localhost:3000/invoices/1 \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": 1,
    "items": [{
      "productName": "Test Product",
      "quantity": 2,
      "unitPrice": 100
    }],
    "createdBy": "Admin"
  }'
```

## ✅ What's Working

- ✅ Sequential invoice numbering (INV-2026-00001)
- ✅ 9 invoice statuses with tracking
- ✅ Public invoice sharing with secure tokens
- ✅ 4 professional PDF themes
- ✅ Logo & watermark support
- ✅ Per-item tax rates & TIN compliance
- ✅ Multiple payments per invoice
- ✅ Auto late fee calculation
- ✅ Complete analytics & reporting
- ✅ Migration from old credit sales

## 🔜 Optional: Enable QR Codes

To enable QR code generation later:

```bash
# Install QR code package
npm install qrcode @types/qrcode

# Uncomment QR code imports in:
# - invoice.service.ts
# - invoice-pdf.service.ts
# - invoice.module.ts
```

## 📚 API Endpoints

All endpoints are ready to use:

```
POST   /invoices/:orgId              - Create invoice
GET    /invoices/:orgId              - List invoices
GET    /invoices/:orgId/stats        - Statistics
GET    /invoices/:orgId/:id          - Get invoice
PUT    /invoices/:orgId/:id          - Update invoice
DELETE /invoices/:orgId/:id          - Delete invoice
POST   /invoices/:orgId/:id/payments - Record payment
GET    /invoices/public/:token       - Public view
```

## 🔄 Migrate Old Data

```typescript
// In your migration script or controller
import { InvoiceMigrationService } from './invoices/migration.service';

// Inject the service and run migration
const result = await migrationService.migrateAllCreditSales(organizationId);

console.log(`Migrated ${result.successful} invoices`);
```

## 📖 Full Documentation

See [README.md](./README.md) for complete documentation.

## 🐛 Troubleshooting

**TypeScript errors about qrcode?**
- QR codes are optional and disabled by default
- System works perfectly without them
- Install qrcode package when you need QR functionality

**Migration errors?**
- Ensure Prisma migration ran successfully
- Check customer IDs exist in old credit sales
- Run verification: `migrationService.verifyMigration(orgId)`

**Can't create invoices?**
- Check customer exists in database
- Verify organizationId is correct
- Ensure Prisma client is generated

## 🎉 You're Ready!

The modern invoice system is fully functional. Start creating professional invoices right away!
