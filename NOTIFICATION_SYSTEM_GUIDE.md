# Notification System - Complete Guide

## Overview

The notification system provides comprehensive notification capabilities across the Lumina ERP application with support for 11 different notification types, real-time updates, and filtering.

## Features

- ✅ 11 notification types (SYSTEM, SALE, INVOICE, PAYMENT, INVENTORY, USER, TICKET, ALERT, INFO, WARNING, ERROR)
- ✅ User-specific and organization-wide notifications
- ✅ Read/unread status tracking
- ✅ Real-time polling (updates every 30 seconds)
- ✅ Notification bell icon with unread badge
- ✅ Dropdown with recent notifications
- ✅ Full notification list page with filters
- ✅ Search functionality
- ✅ Pagination support
- ✅ Mark as read (single and bulk)
- ✅ Delete notifications
- ✅ Auto-cleanup of old notifications
- ✅ Tailwind CSS styling with dark mode support
- ✅ Helper methods for easy notification creation

## Backend Implementation

### Database Schema

```prisma
enum NotificationType {
  SYSTEM
  SALE
  INVOICE
  PAYMENT
  INVENTORY
  USER
  TICKET
  ALERT
  INFO
  WARNING
  ERROR
}

model Notification {
  id             String            @id @default(uuid())
  organizationId String
  organization   Organization      @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  userId         String?           // Null = organization-wide
  user           User?             @relation(fields: [userId], references: [id], onDelete: Cascade)
  type           NotificationType
  title          String
  message        String
  link           String?
  icon           String?
  isRead         Boolean           @default(false)
  readAt         DateTime?
  data           Json?
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt

  @@index([organizationId])
  @@index([userId])
  @@index([isRead])
  @@index([createdAt])
}
```

### API Endpoints

#### GET /organizations/:orgId/notifications

Get all notifications with optional filters

- **Query Parameters:**
  - `type`: Filter by notification type
  - `isRead`: Filter by read status (true/false)
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 20)
- **Response:**
  ```json
  {
    "notifications": [...],
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
  ```

#### GET /organizations/:orgId/notifications/unread-count

Get count of unread notifications

- **Response:**
  ```json
  {
    "count": 5
  }
  ```

#### GET /organizations/:orgId/notifications/:id

Get a single notification by ID

#### PATCH /organizations/:orgId/notifications/:id/read

Mark a notification as read

#### POST /organizations/:orgId/notifications/mark-all-read

Mark all notifications as read

- **Response:**
  ```json
  {
    "count": 10
  }
  ```

#### DELETE /organizations/:orgId/notifications/:id

Delete a notification

#### DELETE /organizations/:orgId/notifications/cleanup/old

Delete old notifications

- **Query Parameters:**
  - `daysOld`: Delete notifications older than this many days (default: 30)

## Frontend Implementation

### Components

#### 1. Notification Bell Component

- **Location:** Integrated in main layout header
- **Features:**
  - Bell icon with unread badge
  - Dropdown showing 5 most recent unread notifications
  - Real-time polling every 30 seconds
  - Click notification to mark as read
  - "Mark all read" button
  - "View all notifications" button

#### 2. Notification List Page

- **Route:** `/notifications`
- **Features:**
  - Search notifications by title/message
  - Filter by notification type
  - Filter by read/unread status
  - Pagination
  - Delete individual notifications
  - Mark as read on click
  - Tailwind styling with dark mode

### Services

#### NotificationsService

Main service for notification operations:

```typescript
import { NotificationsService } from './shared/Services/notifications.service';

constructor(private notificationsService: NotificationsService) {}

// Get notifications
this.notificationsService.getNotifications(orgId, {
  type: NotificationType.SALE,
  isRead: false,
  page: 1,
  limit: 10
}).subscribe(response => {
  console.log(response.notifications);
});

// Get unread count
this.notificationsService.getUnreadCount(orgId).subscribe(response => {
  console.log(response.count);
});

// Mark as read
this.notificationsService.markAsRead(orgId, notificationId).subscribe();

// Mark all as read
this.notificationsService.markAllAsRead(orgId).subscribe();

// Delete notification
this.notificationsService.deleteNotification(orgId, notificationId).subscribe();
```

#### NotificationHelperService

Helper service for creating notifications from other modules:

```typescript
import { NotificationHelperService } from './shared/Services/notification-helper.service';

constructor(private notificationHelper: NotificationHelperService) {}

// Sale notification
this.notificationHelper.createSaleNotification(
  organizationId,
  saleId,
  amount,
  userId // optional
).subscribe();

// Invoice notification
this.notificationHelper.createInvoiceNotification(
  organizationId,
  invoiceId,
  invoiceNumber,
  customerName,
  userId // optional
).subscribe();

// Payment notification
this.notificationHelper.createPaymentNotification(
  organizationId,
  amount,
  paymentMethod,
  userId // optional
).subscribe();

// Inventory alert
this.notificationHelper.createInventoryAlert(
  organizationId,
  productName,
  currentStock,
  reorderLevel,
  userId // optional
).subscribe();

// Ticket notification
this.notificationHelper.createTicketNotification(
  organizationId,
  ticketId,
  ticketSubject,
  userId // optional
).subscribe();

// Generic notifications
this.notificationHelper.createAlert(orgId, 'Alert Title', 'Message').subscribe();
this.notificationHelper.createInfo(orgId, 'Info Title', 'Message').subscribe();
this.notificationHelper.createWarning(orgId, 'Warning Title', 'Message').subscribe();
this.notificationHelper.createError(orgId, 'Error Title', 'Message').subscribe();
```

## Usage Examples

### Example 1: Send notification when sale is completed

```typescript
// In sales component after sale is saved
saveSale() {
  this.salesService.createSale(saleData).subscribe(sale => {
    // Send notification
    this.notificationHelper.createSaleNotification(
      this.organizationId,
      sale.id,
      sale.totalAmount
    ).subscribe();

    this.router.navigate(['/sales']);
  });
}
```

### Example 2: Send notification when invoice is created

```typescript
// In invoice component
createInvoice() {
  this.invoiceService.create(invoiceData).subscribe(invoice => {
    // Send notification
    this.notificationHelper.createInvoiceNotification(
      this.organizationId,
      invoice.id,
      invoice.invoiceNumber,
      invoice.customer.name
    ).subscribe();

    this.router.navigate(['/invoices']);
  });
}
```

### Example 3: Send low stock alerts

```typescript
// In inventory service or component
checkStockLevels() {
  this.products.forEach(product => {
    if (product.stock <= product.reorderLevel) {
      this.notificationHelper.createInventoryAlert(
        this.organizationId,
        product.name,
        product.stock,
        product.reorderLevel
      ).subscribe();
    }
  });
}
```

### Example 4: Send user-specific notification

```typescript
// Send notification to specific user
this.notificationHelper
  .createUserNotification(
    organizationId,
    userId,
    "Welcome!",
    "Your account has been activated",
    "/profile",
  )
  .subscribe();
```

### Example 5: Send system-wide notification

```typescript
// Send to all users in organization (userId = null)
this.notificationHelper
  .createSystemNotification(
    organizationId,
    "System Maintenance",
    "Scheduled maintenance on Saturday at 2 AM",
    "/system-logs",
  )
  .subscribe();
```

## Notification Types and Use Cases

| Type      | Icon                        | Color  | Use Case                    |
| --------- | --------------------------- | ------ | --------------------------- |
| SYSTEM    | ri-settings-3-line          | Gray   | System updates, maintenance |
| SALE      | ri-shopping-cart-line       | Green  | New sales completed         |
| INVOICE   | ri-file-text-line           | Blue   | Invoices created/updated    |
| PAYMENT   | ri-money-dollar-circle-line | Green  | Payments received           |
| INVENTORY | ri-stack-line               | Purple | Stock alerts, transfers     |
| USER      | ri-user-line                | Indigo | User actions, permissions   |
| TICKET    | ri-ticket-line              | Orange | Support tickets             |
| ALERT     | ri-error-warning-line       | Red    | Critical alerts             |
| INFO      | ri-information-line         | Blue   | Informational messages      |
| WARNING   | ri-alert-line               | Yellow | Warnings                    |
| ERROR     | ri-close-circle-line        | Red    | Errors                      |

## Styling

All components use Tailwind CSS with dark mode support:

- Gradient headers (purple-to-indigo)
- Status badges with appropriate colors
- Hover effects and transitions
- Responsive design
- Dark mode compatible

## Real-time Updates

The notification bell component polls for new notifications every 30 seconds:

```typescript
// Automatic polling in notification-bell component
startPolling(): void {
  this.pollSubscription = interval(30000)
    .pipe(switchMap(() => this.notificationsService.getUnreadCount(this.organizationId)))
    .subscribe(response => {
      this.unreadCount = response.count;
      if (this.unreadCount > 0) {
        this.loadRecentNotifications();
      }
    });
}
```

## Cleanup

Automatic cleanup of old notifications:

```typescript
// Backend service method
async deleteOldNotifications(organizationId: string, daysOld: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await this.prisma.notification.deleteMany({
    where: {
      organizationId,
      createdAt: { lt: cutoffDate },
      isRead: true
    }
  });

  return { count: result.count };
}
```

## Testing Checklist

- [ ] Create notifications via helper service
- [ ] View notifications in bell dropdown
- [ ] Mark single notification as read
- [ ] Mark all as read
- [ ] Filter notifications by type
- [ ] Filter by read/unread status
- [ ] Search notifications
- [ ] Navigate through pages
- [ ] Delete notification
- [ ] Check dark mode styling
- [ ] Verify real-time polling
- [ ] Test on mobile (responsive design)
- [ ] Verify notification links work

## Next Steps

1. Integrate notification helpers in existing modules:
   - Sales module: Create notifications on sale completion
   - Invoice module: Notify on invoice creation/payment
   - Inventory module: Low stock alerts
   - Tickets module: New ticket notifications
   - User module: User role changes, permissions

2. Optional enhancements:
   - WebSocket integration for instant notifications
   - Email notifications
   - Push notifications (mobile apps)
   - Notification preferences/settings
   - Notification groups/categories
   - Export notification history

## Files Created

### Backend

- `apps/backend/src/notifications/notifications.module.ts`
- `apps/backend/src/notifications/notifications.controller.ts`
- `apps/backend/src/notifications/notifications.service.ts`
- `apps/backend/src/notifications/dto/create-notification.dto.ts`
- `apps/backend/src/notifications/dto/update-notification.dto.ts`
- `apps/backend/src/notifications/dto/filter-notifications.dto.ts`
- `apps/backend/prisma/schema.prisma` (updated)

### Frontend

- `apps/frontend/src/app/shared/Services/notifications.service.ts`
- `apps/frontend/src/app/shared/Services/notification-helper.service.ts`
- `apps/frontend/src/app/shared/components/notification-bell/*`
- `apps/frontend/src/app/modules/notifications/*`
- `apps/frontend/src/app/shared/shared.module.ts` (updated)
- `apps/frontend/src/app/app-routing.module.ts` (updated)
- `apps/frontend/src/app/modules/layout/components/main-layout/main-layout.component.html` (updated)

The notification system is now fully functional and ready to use! 🎉
