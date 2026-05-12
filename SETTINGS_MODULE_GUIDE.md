# Settings Module - Complete Guide

## Overview

The Settings Module provides comprehensive configuration management for the Lumina ERP system. It allows organizations to customize payment methods, tax settings, display preferences, document numbering, reporting periods, and much more.

---

## 🎯 Features

### 1. **Payment Methods Configuration**
- Enable/disable payment methods (Cash, M-PESA, Bank Transfer, Credit)
- Control which payment options are available throughout the system

### 2. **Tax Settings**
- Enable/disable tax calculation
- Set default tax rate (0-100%)
- Configure tax name (VAT, GST, etc.)
- Organization tax number (TIN/VAT)
- Choose whether to include tax in prices

### 3. **General Settings**
- **Currency**: KES, USD, EUR, GBP
- **Currency Symbol**: Automatically set based on currency
- **Time Zone**: Configure organization timezone
- **Date Format**: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, DD MMM YYYY
- **Time Format**: 24-hour or 12-hour
- **Decimal Places**: 0-4 decimal places for amounts

### 4. **Document Prefixes**
Customize prefixes for all document types:
- Invoice: `INV-2026-00001`
- Sale: `SALE-2026-00001`
- Quotation: `QUO-2026-00001`
- LPO: `LPO-2026-00001`
- Payment: `PAY-2026-00001`
- Expense: `EXP-2026-00001`
- Credit Sale: `CS-2026-00001`

### 5. **Display Settings**
- **View Mode**: List, Grid, or Cards
- **Items Per Page**: 10-100 items
- **Show Product Images**: Toggle product images
- **Compact Mode**: Reduce spacing for more content

### 6. **Reporting Period Settings**
- **Fiscal Year Start/End**: Choose months (1-12)
- **Reporting Period Start/End**: Set day of month (1-31)

### 7. **Recurring Invoice Settings**
- **Generation Time**: What time to auto-generate invoices
- **Days Before Due Date**: Generate invoices X days before due date (0-30)

### 8. **Inventory Settings**
- **Low Stock Alerts**: Alert when products reach reorder level
- **Auto Deduct Inventory**: Automatically reduce stock on sales
- **Allow Negative Stock**: Permit sales when stock is zero/negative

### 9. **Notification Settings**
- Email Notifications
- SMS Notifications
- Low Stock Notifications

### 10. **Receipt/Invoice Settings**
- Show Company Logo
- Show Bank Details
- Show M-PESA Details
- Custom Receipt Footer Text
- Default Invoice Terms & Conditions
- Default Invoice Notes

### 11. **Business Rules**
- Require Customer for Credit Sales
- Allow Discounts
- Maximum Discount Percentage (0-100%)

---

## 📦 Database Schema

### OrganizationSettings Model

```prisma
model OrganizationSettings {
  id                    Int          @id @default(autoincrement())
  organizationId        Int          @unique

  // Payment Methods
  paymentMethods        Json         @default("{\"cash\": true, \"mpesa\": true, \"bank\": true, \"credit\": true}")

  // Tax Settings
  enableTax             Boolean      @default(true)
  defaultTaxRate        Float        @default(16)
  taxName               String       @default("VAT")
  taxNumber             String?
  includeTaxInPrice     Boolean      @default(false)

  // General Settings
  currency              String       @default("KES")
  currencySymbol        String       @default("KSh")
  timeZone              String       @default("Africa/Nairobi")
  dateFormat            String       @default("DD/MM/YYYY")
  timeFormat            String       @default("HH:mm")
  decimalPlaces         Int          @default(2)

  // Prefixes
  invoicePrefix         String       @default("INV")
  salePrefix            String       @default("SALE")
  quotationPrefix       String       @default("QUO")
  lpoPrefix             String       @default("LPO")
  paymentPrefix         String       @default("PAY")
  expensePrefix         String       @default("EXP")
  creditSalePrefix      String       @default("CS")

  // Display Settings
  defaultViewMode       ViewMode     @default(LIST)
  itemsPerPage          Int          @default(50)
  showProductImages     Boolean      @default(true)
  compactMode           Boolean      @default(false)

  // Reporting
  fiscalYearStart       Int          @default(1)
  fiscalYearEnd         Int          @default(12)
  reportingPeriodStart  Int          @default(1)
  reportingPeriodEnd    Int          @default(31)

  // Recurring Invoices
  recurringInvoiceTime  String       @default("09:00")
  recurringInvoiceDaysBefore Int     @default(0)

  // Inventory
  lowStockAlertEnabled  Boolean      @default(true)
  autoDeductInventory   Boolean      @default(true)
  allowNegativeStock    Boolean      @default(false)

  // Notifications
  emailNotifications    Boolean      @default(true)
  smsNotifications      Boolean      @default(false)
  lowStockNotifications Boolean      @default(true)

  // Receipt/Invoice
  showCompanyLogo       Boolean      @default(true)
  showBankDetails       Boolean      @default(true)
  showMpesaDetails      Boolean      @default(true)
  receiptFooterText     String?
  invoiceTerms          String?
  invoiceNotes          String?

  // Business Rules
  requireCustomerForCredit Boolean   @default(true)
  allowDiscounts        Boolean      @default(true)
  maxDiscountPercentage Float        @default(100)

  createdAt             DateTime     @default(now())
  updatedAt             DateTime     @updatedAt

  @@map("organization_settings")
}
```

---

## 🚀 Setup Instructions

### Backend Setup

1. **Run Database Migration**
   ```bash
   cd apps/backend
   npx prisma migrate dev --name add_organization_settings
   npx prisma generate
   ```

2. **Verify Module Import**
   The `SettingsModule` should already be imported in `app.module.ts`:
   ```typescript
   import { SettingsModule } from './settings/settings.module';

   @Module({
     imports: [
       // ... other modules
       SettingsModule,
     ],
   })
   export class AppModule {}
   ```

3. **Start Backend**
   ```bash
   pnpm dev:backend
   ```

### Frontend Setup

1. **Verify Routes**
   The route should be added in `app-routing.module.ts`:
   ```typescript
   {
     path: 'app-settings',
     component: AppSettingsComponent,
     canActivate: [PermissionGuard],
     data: { requiredPermission: 'setting' },
   }
   ```

2. **Start Frontend**
   ```bash
   pnpm dev:frontend
   ```

3. **Access Settings**
   Navigate to: `http://localhost:4200/app-settings`

---

## 📝 API Endpoints

### Backend REST API

```
GET    /settings/organization/:organizationId              # Get settings
POST   /settings                                           # Create settings
PUT    /settings/organization/:organizationId              # Update all settings
PATCH  /settings/organization/:organizationId/section/:section  # Update section
POST   /settings/organization/:organizationId/reset        # Reset to defaults

# Specific Endpoints
GET    /settings/organization/:organizationId/payment-methods
PATCH  /settings/organization/:organizationId/payment-methods
GET    /settings/organization/:organizationId/tax
GET    /settings/organization/:organizationId/prefix/:type
GET    /settings/organization/:organizationId/currency
GET    /settings/organization/:organizationId/datetime
GET    /settings/organization/:organizationId/fiscal-year
GET    /settings/organization/:organizationId/reporting-period
```

### Sections
- `payment` - Payment methods
- `tax` - Tax settings
- `general` - General settings
- `prefixes` - Document prefixes
- `display` - Display settings
- `reporting` - Reporting periods
- `recurring` - Recurring invoice settings
- `inventory` - Inventory settings
- `notifications` - Notification settings
- `receipt` - Receipt/invoice settings
- `business` - Business rules

---

## 💻 Usage Examples

### Frontend Service Usage

```typescript
import { SettingsService } from '@app/shared/Services/settings.service';

export class MyComponent {
  constructor(private settingsService: SettingsService) {}

  // Get all settings
  loadSettings() {
    this.settingsService.getSettings().subscribe(settings => {
      console.log('Settings:', settings);
    });
  }

  // Update payment methods
  updatePaymentMethods() {
    this.settingsService.updatePaymentMethods({
      cash: true,
      mpesa: true,
      bank: false,
      credit: true
    }).subscribe();
  }

  // Update specific section
  updateTaxSettings() {
    this.settingsService.updateSection('tax', {
      enableTax: true,
      defaultTaxRate: 16,
      taxName: 'VAT'
    }).subscribe();
  }

  // Format currency using settings
  formatAmount(amount: number) {
    return this.settingsService.formatCurrency(amount);
  }

  // Format date using settings
  formatDate(date: Date) {
    return this.settingsService.formatDate(date);
  }

  // Get document prefix
  getInvoicePrefix() {
    this.settingsService.getPrefix('invoice').subscribe(prefix => {
      console.log('Invoice prefix:', prefix);
    });
  }
}
```

### Backend Service Usage

```typescript
import { SettingsService } from './settings/settings.service';

export class InvoiceService {
  constructor(private settingsService: SettingsService) {}

  async createInvoice(orgId: number) {
    // Get invoice prefix
    const prefix = await this.settingsService.getPrefix(orgId, 'invoice');

    // Get tax settings
    const taxSettings = await this.settingsService.getTaxSettings(orgId);

    // Get currency settings
    const currencySettings = await this.settingsService.getCurrencySettings(orgId);

    // Use settings to create invoice
    // ...
  }
}
```

---

## 🎨 UI Components

### Main Settings Component

**Location**: `apps/frontend/src/app/modules/setting/components/app-settings/`

**Features**:
- Tabbed interface for different setting categories
- Real-time form validation
- Auto-save per section
- Reset section functionality
- Reset all settings functionality
- Responsive design (mobile-friendly)
- Dark mode support

### Navigation Tabs
1. Payment Methods
2. Tax Settings
3. General
4. Document Prefixes
5. Display
6. Reporting Period
7. Recurring Invoices
8. Inventory
9. Notifications
10. Receipt/Invoice
11. Business Rules

---

## 🔒 Permissions

The settings module is protected by the `PermissionGuard`.

**Required Permission**: `setting`

Users must have the `setting` module permission to access the settings page.

---

## ⚙️ Default Values

When settings are created for the first time, the following defaults are applied:

- **Payment Methods**: All enabled (Cash, M-PESA, Bank, Credit)
- **Tax**: Enabled, 16% VAT
- **Currency**: KES (Kenyan Shilling)
- **Date Format**: DD/MM/YYYY
- **Time Format**: 24-hour (HH:mm)
- **Decimal Places**: 2
- **View Mode**: LIST
- **Items Per Page**: 50
- **Fiscal Year**: January to December
- **Reporting Period**: 1st to 31st of month
- **Recurring Invoice Time**: 09:00
- **Auto Deduct Inventory**: Enabled
- **Notifications**: Email enabled, SMS disabled

---

## 🧪 Testing

### Manual Testing Checklist

1. **Access Settings**
   - [ ] Navigate to `/app-settings`
   - [ ] Verify page loads without errors
   - [ ] All 11 tabs are visible

2. **Payment Methods**
   - [ ] Toggle each payment method
   - [ ] Save and verify changes persist
   - [ ] Check payment methods reflect in sales/invoices

3. **Tax Settings**
   - [ ] Enable/disable tax
   - [ ] Change tax rate
   - [ ] Update tax name and number
   - [ ] Toggle "include tax in price"

4. **General Settings**
   - [ ] Change currency and verify symbol updates
   - [ ] Change date/time formats
   - [ ] Adjust decimal places

5. **Prefixes**
   - [ ] Update each document prefix
   - [ ] Verify new documents use updated prefixes

6. **Display Settings**
   - [ ] Switch between List/Grid/Cards views
   - [ ] Change items per page
   - [ ] Toggle product images and compact mode

7. **Reporting Period**
   - [ ] Set fiscal year months
   - [ ] Set reporting period days

8. **Recurring Invoices**
   - [ ] Set generation time
   - [ ] Set days before due date

9. **Inventory**
   - [ ] Toggle low stock alerts
   - [ ] Toggle auto deduct inventory
   - [ ] Toggle allow negative stock

10. **Notifications**
    - [ ] Enable/disable each notification type

11. **Receipt/Invoice**
    - [ ] Toggle logo/bank/M-PESA display
    - [ ] Add custom footer text
    - [ ] Add default terms and notes

12. **Business Rules**
    - [ ] Toggle customer requirement for credit
    - [ ] Toggle discounts
    - [ ] Set max discount percentage

13. **Reset Functions**
    - [ ] Reset individual section
    - [ ] Reset all settings to defaults

---

## 🐛 Troubleshooting

### Settings Not Saving
- Check browser console for errors
- Verify backend is running
- Check network tab for API responses
- Ensure user has `setting` permission

### Settings Not Loading
- Clear browser cache
- Check localStorage for `orgSettings`
- Verify organization ID in localStorage (`licencedOrg`)
- Check backend logs for errors

### Invalid Form Values
- Check validation constraints in component
- Verify min/max values for number inputs
- Ensure required fields are filled

---

## 🔄 Migration from Legacy Settings

If you have existing organization settings in the `Organization` model:

1. Settings are now separate in `OrganizationSettings` table
2. Old settings like `logoUrl`, `bankDetails`, `mpesaDetails` remain in `Organization`
3. New settings are in `OrganizationSettings`
4. Settings are auto-created with defaults on first access

---

## 📚 Best Practices

1. **Always validate user input** - The forms have built-in validation
2. **Use settings service helpers** - Use `formatCurrency()`, `formatDate()` etc.
3. **Cache settings** - Settings are cached in localStorage for offline access
4. **Test thoroughly** - Settings affect the entire application
5. **Document changes** - Keep track of setting changes in production

---

## 🎯 Future Enhancements

Potential additions to the settings module:

- [ ] Theme customization (colors, fonts)
- [ ] Email templates configuration
- [ ] SMS templates configuration
- [ ] Advanced tax rules (multiple tax rates)
- [ ] Multi-currency support
- [ ] Language/localization settings
- [ ] Custom fields management
- [ ] Workflow automation rules
- [ ] Integration settings (APIs, webhooks)
- [ ] Security settings (2FA, session timeout)

---

## 📞 Support

For issues or questions:
1. Check this documentation
2. Review code comments in the settings module
3. Check API endpoint responses
4. Review browser console for errors

---

**Status**: ✅ **FULLY IMPLEMENTED AND READY TO USE**

**Version**: 1.0.0

**Last Updated**: January 2026
