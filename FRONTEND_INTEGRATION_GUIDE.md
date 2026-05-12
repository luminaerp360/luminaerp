# Frontend Integration Guide - Modern Invoice System

## 🎯 Overview

Your frontend now has a modern invoice service and interfaces ready to use! This guide shows you how to integrate the new invoice system into your Angular app.

## ✅ What's Been Created

### 1. **Invoice Interface**
📁 `apps/frontend/src/app/shared/interfaces/invoice.interface.ts`

Contains:
- `Invoice` - Main invoice model
- `InvoiceItem` - Invoice line items
- `InvoicePayment` - Payment records
- `CreateInvoiceDto` - For creating invoices
- `RecordPaymentDto` - For recording payments
- `InvoiceStatus` - Status enum (9 statuses)
- `InvoiceType` - Type enum (5 types)
- `InvoiceStats` - Analytics model

### 2. **Invoice Service**
📁 `apps/frontend/src/app/shared/Services/invoice.service.ts`

Features:
- ✅ Create, Read, Update, Delete invoices
- ✅ Record payments
- ✅ Get statistics
- ✅ Download PDFs
- ✅ Public invoice sharing
- ✅ Status management
- ✅ Helper methods (formatCurrency, getStatusColor, etc.)

## 🚀 Quick Start - Use Invoice Service

### 1. Import the Service

```typescript
import { InvoiceService } from '@app/shared/Services/invoice.service';
import { Invoice, InvoiceStatus } from '@app/shared/interfaces/invoice.interface';

constructor(private invoiceService: InvoiceService) {}
```

### 2. Create an Invoice

```typescript
createInvoice() {
  const invoiceData = {
    customerId: this.selectedCustomer.id,
    items: this.cartItems.map(item => ({
      productId: item.id,
      productName: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
      taxRate: 16, // 16% VAT
    })),
    paymentTerms: 'Net 30',
    paymentTermsDays: 30,
    taxRate: 16,
    taxType: 'VAT',
    notes: 'Thank you for your business',
    createdBy: this.currentUser.fullName,
    sendEmail: true, // Auto-send email
  };

  this.invoiceService.createInvoice(invoiceData).subscribe({
    next: (invoice) => {
      console.log('Invoice created:', invoice.invoiceNumber);
      this.toast.success(`Invoice ${invoice.invoiceNumber} created!`);
    },
    error: (error) => {
      this.toast.error('Failed to create invoice');
    }
  });
}
```

### 3. List Invoices

```typescript
loadInvoices() {
  const filters = {
    status: InvoiceStatus.PENDING,
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    page: 1,
    limit: 50,
  };

  this.invoiceService.getAllInvoices(filters).subscribe({
    next: (response) => {
      this.invoices = response.invoices;
      this.pagination = response.pagination;
    }
  });
}
```

### 4. Record Payment

```typescript
recordPayment(invoice: Invoice) {
  const payment = {
    amount: 5000,
    paymentMethod: 'MPESA' as const,
    transactionCode: 'ABC123XYZ',
    recordedBy: this.currentUser.fullName,
  };

  this.invoiceService.recordPayment(invoice.id!, payment).subscribe({
    next: (result) => {
      this.toast.success('Payment recorded successfully');
      // Status auto-updates to PARTIALLY_PAID or PAID
      this.loadInvoices();
    }
  });
}
```

### 5. Get Statistics

```typescript
loadStats() {
  this.invoiceService.getInvoiceStats({
    startDate: '2026-01-01',
    endDate: '2026-01-31'
  }).subscribe({
    next: (stats) => {
      console.log('Total Invoices:', stats.totalInvoices);
      console.log('Total Amount:', stats.totalAmount);
      console.log('Total Paid:', stats.totalPaid);
      console.log('Total Outstanding:', stats.totalOutstanding);
      console.log('Overdue:', stats.overdueInvoices);
    }
  });
}
```

### 6. Download PDF

```typescript
downloadPDF(invoice: Invoice) {
  this.invoiceService.downloadInvoicePDF(invoice.id!, 'modern').subscribe({
    next: (blob) => {
      this.invoiceService.downloadBlob(blob, `invoice-${invoice.invoiceNumber}.pdf`);
      this.toast.success('PDF downloaded');
    }
  });
}
```

### 7. Share Public Link

```typescript
async shareInvoice(invoice: Invoice) {
  if (!invoice.publicToken) return;

  const copied = await this.invoiceService.copyPublicLink(invoice.publicToken);
  if (copied) {
    this.toast.success('Public link copied to clipboard!');
  }

  // Or get the URL
  const url = this.invoiceService.getPublicInvoiceUrl(invoice.publicToken);
  console.log('Share this:', url);
}
```

## 🎨 UI Helper Methods

### Status Badge

```html
<span [class]="invoiceService.getStatusColor(invoice.status)"
      class="px-2 py-1 rounded-full text-xs font-medium">
  <i [class]="invoiceService.getStatusIcon(invoice.status)"></i>
  {{ invoice.status.replace('_', ' ') }}
</span>
```

### Payment Progress Bar

```typescript
getProgress(invoice: Invoice): number {
  return this.invoiceService.getPaymentProgress(invoice);
}
```

```html
<div class="w-full bg-gray-200 rounded-full h-2">
  <div class="bg-green-600 h-2 rounded-full transition-all"
       [style.width.%]="getProgress(invoice)">
  </div>
</div>
<span class="text-sm">{{ getProgress(invoice) }}% paid</span>
```

### Currency Formatting

```typescript
formatAmount(amount: number): string {
  return this.invoiceService.formatCurrency(amount);
}
```

```html
<span>{{ formatAmount(invoice.totalAmount) }}</span>
<!-- Output: KES 5,000.00 -->
```

### Overdue Indicator

```html
<span *ngIf="invoiceService.isOverdue(invoice)"
      class="text-red-600 font-bold">
  <i class="bi-exclamation-triangle"></i>
  Overdue by {{ -invoiceService.getDaysUntilDue(invoice.dueDate) }} days
</span>
```

## 📋 Example: Modern Invoice List Component

```typescript
import { Component, OnInit } from '@angular/core';
import { InvoiceService } from '@app/shared/Services/invoice.service';
import { Invoice, InvoiceStatus } from '@app/shared/interfaces/invoice.interface';

@Component({
  selector: 'app-invoice-list',
  templateUrl: './invoice-list.component.html',
})
export class InvoiceListComponent implements OnInit {
  invoices: Invoice[] = [];
  isLoading = false;
  selectedStatus: InvoiceStatus | null = null;

  // For template access
  InvoiceStatus = InvoiceStatus;

  constructor(public invoiceService: InvoiceService) {}

  ngOnInit() {
    this.loadInvoices();
  }

  loadInvoices() {
    this.isLoading = true;
    const filters = this.selectedStatus ? { status: this.selectedStatus } : {};

    this.invoiceService.getAllInvoices(filters).subscribe({
      next: (response) => {
        this.invoices = response.invoices;
        this.isLoading = false;
      },
      error: (error) => {
        console.error(error);
        this.isLoading = false;
      }
    });
  }

  filterByStatus(status: InvoiceStatus | null) {
    this.selectedStatus = status;
    this.loadInvoices();
  }

  recordPayment(invoice: Invoice, amount: number) {
    const payment = {
      amount,
      paymentMethod: 'CASH' as const,
      recordedBy: 'Current User',
    };

    this.invoiceService.recordPayment(invoice.id!, payment).subscribe({
      next: () => {
        this.loadInvoices(); // Refresh list
      }
    });
  }

  downloadPDF(invoice: Invoice) {
    this.invoiceService.downloadInvoicePDF(invoice.id!).subscribe({
      next: (blob) => {
        this.invoiceService.downloadBlob(blob, `invoice-${invoice.invoiceNumber}.pdf`);
      }
    });
  }
}
```

### Template

```html
<!-- Status Filter Buttons -->
<div class="flex gap-2 mb-4">
  <button (click)="filterByStatus(null)"
          [class.bg-blue-600]="selectedStatus === null"
          class="px-4 py-2 rounded">
    All
  </button>
  <button (click)="filterByStatus(InvoiceStatus.PENDING)"
          [class.bg-blue-600]="selectedStatus === InvoiceStatus.PENDING"
          class="px-4 py-2 rounded">
    Pending
  </button>
  <button (click)="filterByStatus(InvoiceStatus.OVERDUE)"
          [class.bg-red-600]="selectedStatus === InvoiceStatus.OVERDUE"
          class="px-4 py-2 rounded">
    Overdue
  </button>
  <button (click)="filterByStatus(InvoiceStatus.PAID)"
          [class.bg-green-600]="selectedStatus === InvoiceStatus.PAID"
          class="px-4 py-2 rounded">
    Paid
  </button>
</div>

<!-- Invoice List -->
<div *ngIf="!isLoading; else loading">
  <div *ngFor="let invoice of invoices" class="border rounded p-4 mb-2">
    <!-- Invoice Header -->
    <div class="flex justify-between items-center">
      <div>
        <h3 class="font-bold">{{ invoice.invoiceNumber }}</h3>
        <p class="text-sm">{{ invoice.customerName }}</p>
      </div>

      <!-- Status Badge -->
      <span [class]="invoiceService.getStatusColor(invoice.status)"
            class="px-3 py-1 rounded-full">
        {{ invoice.status.replace('_', ' ') }}
      </span>
    </div>

    <!-- Amount Info -->
    <div class="mt-3">
      <div class="flex justify-between text-sm">
        <span>Total:</span>
        <span class="font-bold">{{ invoiceService.formatCurrency(invoice.totalAmount) }}</span>
      </div>
      <div class="flex justify-between text-sm text-gray-600">
        <span>Paid:</span>
        <span>{{ invoiceService.formatCurrency(invoice.amountPaid) }}</span>
      </div>
      <div class="flex justify-between text-sm"
           [class.text-red-600]="invoice.balanceDue > 0">
        <span>Balance:</span>
        <span class="font-bold">{{ invoiceService.formatCurrency(invoice.balanceDue) }}</span>
      </div>
    </div>

    <!-- Progress Bar -->
    <div class="mt-2">
      <div class="w-full bg-gray-200 rounded-full h-2">
        <div class="bg-green-600 h-2 rounded-full"
             [style.width.%]="invoiceService.getPaymentProgress(invoice)">
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="mt-3 flex gap-2">
      <button (click)="downloadPDF(invoice)" class="btn btn-sm btn-primary">
        <i class="bi-download"></i> PDF
      </button>
      <button (click)="recordPayment(invoice, invoice.balanceDue)"
              *ngIf="invoice.balanceDue > 0"
              class="btn btn-sm btn-success">
        <i class="bi-cash"></i> Record Payment
      </button>
    </div>
  </div>
</div>

<ng-template #loading>
  <div class="text-center py-8">Loading invoices...</div>
</ng-template>
```

## 🔄 Migrating from Credit Sales

### Option 1: Gradual Migration (Recommended)

Keep both systems running:

```typescript
// Use credit sales for old records
this.creditSaleService.getCreditSales();

// Use invoices for new records
this.invoiceService.getAllInvoices();
```

### Option 2: Full Migration

1. Run backend migration script (one-time):
```typescript
// Call backend migration endpoint
this.http.post('/invoices/migrate', { organizationId }).subscribe();
```

2. Update all components to use InvoiceService
3. Keep CreditSaleService for viewing old data

## 📊 Dashboard Integration

```typescript
// Get invoice statistics for dashboard
loadDashboardStats() {
  this.invoiceService.getInvoiceStats().subscribe({
    next: (stats) => {
      this.dashboardData = {
        totalInvoices: stats.totalInvoices,
        totalRevenue: stats.totalAmount,
        collected: stats.totalPaid,
        outstanding: stats.totalOutstanding,
        overdueCount: stats.overdueInvoices,
      };
    }
  });
}
```

## 🎯 Best Practices

1. **Always handle errors**
   ```typescript
   this.invoiceService.createInvoice(data).subscribe({
     next: (invoice) => { /* success */ },
     error: (error) => {
       console.error(error);
       this.toast.error('Operation failed');
     }
   });
   ```

2. **Show loading states**
   ```typescript
   this.isLoading = true;
   this.invoiceService.getAllInvoices().subscribe({
     next: (data) => { /* ... */ },
     complete: () => { this.isLoading = false; }
   });
   ```

3. **Use status helpers**
   ```typescript
   // Good
   const color = this.invoiceService.getStatusColor(invoice.status);

   // Instead of manually mapping
   ```

4. **Format currency consistently**
   ```typescript
   // Good
   this.invoiceService.formatCurrency(amount);

   // Instead of custom formatting
   ```

## 📚 Complete API Reference

See `invoice.service.ts` for all available methods:

- `createInvoice()` - Create new invoice
- `getAllInvoices()` - List with filters
- `getInvoiceById()` - Get single invoice
- `updateInvoice()` - Update invoice
- `deleteInvoice()` - Delete invoice
- `cancelInvoice()` - Cancel invoice
- `recordPayment()` - Add payment
- `sendInvoice()` - Email/SMS
- `getInvoiceStats()` - Analytics
- `downloadInvoicePDF()` - Get PDF
- Plus 10+ helper methods

## 🎉 You're Ready!

The modern invoice service is fully integrated into your Angular app. Start using it to create professional invoices with just a few lines of code!

For backend setup, see [READY_TO_USE.md](READY_TO_USE.md).

---

**Questions?** Check the service code for inline documentation.
