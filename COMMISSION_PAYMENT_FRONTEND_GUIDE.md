# Commission Payment Frontend - Implementation Guide

## Completed ✅

### 1. Commission Service (Updated)
**File**: `apps/frontend/src/app/shared/Services/commission/commission.service.ts`

Added methods:
- `payCommissions()` - Pay selected commissions with multiple methods
- `bulkPayCommissions()` - Bulk pay (all unpaid or by period)
- `getUnpaidSummary()` - Get unpaid commission summary for user
- `getPaymentHistory()` - Get payment history with breakdown

### 2. Commission Payment Modal Component (Created)
**Files**:
- `apps/frontend/src/app/modules/commission/components/commission-payment-modal/commission-payment-modal.component.ts`
- `apps/frontend/src/app/modules/commission/components/commission-payment-modal/commission-payment-modal.component.html`
- `apps/frontend/src/app/modules/commission/components/commission-payment-modal/commission-payment-modal.component.css`

**Features**:
- Multiple payment methods support
- Add/remove payment methods dynamically
- Real-time calculation of totals and remaining amount
- Three payment modes: Manual, Bulk All Unpaid, Bulk by Period
- Validation to ensure payment matches commission total
- Transaction codes and notes per payment method

## Remaining Tasks ⏳

### 1. Update Commission Module
**File**: `apps/frontend/src/app/modules/commission/commission.module.ts`

Add the new component to declarations:
```typescript
import { CommissionPaymentModalComponent } from './components/commission-payment-modal/commission-payment-modal.component';

@NgModule({
  declarations: [
    // ... existing declarations
    CommissionPaymentModalComponent,
  ],
  // ... rest of module
})
```

### 2. Update Commission Dashboard Component
**File**: `apps/frontend/src/app/modules/commission/components/commission-dashboard/commission-dashboard.component.ts`

Add these imports and properties:
```typescript
import { ViewChild } from '@angular/core';
import { CommissionPaymentModalComponent } from '../commission-payment-modal/commission-payment-modal.component';
import { HotToastService } from '@ngneat/hot-toast';

export class CommissionDashboardComponent implements OnInit {
  @ViewChild(CommissionPaymentModalComponent) paymentModal!: CommissionPaymentModalComponent;

  // Add properties
  userCommissions: any[] = []; // List of users with their commission summaries
  selectedCommissions: Set<number> = new Set();

  constructor(
    private commissionService: CommissionService,
    private authService: AuthService,
    private toast: HotToastService // ADD THIS
  ) {}

  ngOnInit() {
    this.organizationId = Number(localStorage.getItem('licencedOrg') || 1);
    this.loadDashboardData();
    this.loadUserCommissions(); // ADD THIS

    // Listen for payment events
    window.addEventListener('commission-paid', () => {
      this.loadDashboardData();
      this.loadUserCommissions();
    });
  }

  loadUserCommissions() {
    // Load commission report grouped by user
    this.commissionService.getCommissionReport(
      this.organizationId,
      this.startDate,
      this.endDate,
      'PENDING'
    ).subscribe({
      next: (report) => {
        this.userCommissions = report.userSummaries;
      },
      error: (error) => {
        console.error('Error loading user commissions:', error);
        this.toast.error('Failed to load commissions');
      }
    });
  }

  // Toggle commission selection
  toggleCommissionSelection(commissionId: number) {
    if (this.selectedCommissions.has(commissionId)) {
      this.selectedCommissions.delete(commissionId);
    } else {
      this.selectedCommissions.add(commissionId);
    }
  }

  // Pay selected commissions
  paySelected(userId: number, userName: string) {
    const userRecords = this.userCommissions.find(u => u.userId === userId)?.records || [];
    const selectedRecords = userRecords.filter((r: any) =>
      this.selectedCommissions.has(r.id) && r.status === 'PENDING'
    );

    if (selectedRecords.length === 0) {
      this.toast.error('Please select commissions to pay');
      return;
    }

    this.paymentModal.openManualPayment({
      userId,
      userName,
      commissionRecords: selectedRecords,
      commissionIds: selectedRecords.map((r: any) => r.id)
    });
  }

  // Pay all unpaid commissions for a user
  payAllUnpaid(userId: number, userName: string) {
    this.commissionService.getUnpaidSummary(this.organizationId, userId).subscribe({
      next: (summary) => {
        if (summary.recordCount === 0) {
          this.toast.error('No unpaid commissions found');
          return;
        }

        this.paymentModal.openBulkPayment({
          userId,
          userName,
          totalAmount: summary.totalAmount,
          recordCount: summary.recordCount
        });
      },
      error: (error) => {
        console.error('Error loading unpaid summary:', error);
        this.toast.error('Failed to load unpaid commissions');
      }
    });
  }

  // Pay commissions by period
  payByPeriod(userId: number, userName: string, startDate: string, endDate: string) {
    // First get summary for the period
    this.commissionService.getUserSummary(
      userId,
      this.organizationId,
      new Date(startDate),
      new Date(endDate)
    ).subscribe({
      next: (summary) => {
        if (summary.totalCommissions === 0) {
          this.toast.error('No commissions found for this period');
          return;
        }

        this.paymentModal.openPeriodPayment({
          userId,
          userName,
          totalAmount: summary.pendingCommissions,
          recordCount: 0, // Will be calculated by backend
          startDate,
          endDate
        });
      },
      error: (error) => {
        console.error('Error loading period summary:', error);
        this.toast.error('Failed to load period commissions');
      }
    });
  }
}
```

### 3. Update Commission Dashboard HTML
**File**: `apps/frontend/src/app/modules/commission/components/commission-dashboard/commission-dashboard.component.html`

Add the payment modal and update the UI to show user commissions with payment actions.

Add at the end of the file:
```html
<!-- Payment Modal -->
<app-commission-payment-modal></app-commission-payment-modal>

<!-- User Commissions Section -->
<div class="mt-8 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-white/10">
  <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
    <h2 class="text-lg font-semibold text-gray-900 dark:text-white">User Commissions</h2>
  </div>

  <div class="p-6">
    <div *ngFor="let user of userCommissions" class="mb-6 border border-gray-200 dark:border-gray-700 rounded-lg">
      <!-- User Header -->
      <div class="bg-gray-50 dark:bg-slate-700 px-4 py-3 flex items-center justify-between">
        <div>
          <h3 class="font-semibold text-gray-900 dark:text-white">{{ user.fullName }}</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">{{ user.email }}</p>
        </div>
        <div class="text-right">
          <p class="text-lg font-bold text-yellow-600">
            {{ formatCurrency(user.pendingCommission) }}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400">{{ user.recordCount }} pending</p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="px-4 py-3 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-gray-700 flex gap-2 flex-wrap">
        <button
          (click)="payAllUnpaid(user.userId, user.fullName)"
          [disabled]="user.pendingCommission === 0"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
        >
          <i class="bi bi-cash-stack mr-1"></i> Pay All Unpaid
        </button>

        <button
          (click)="showPeriodSelector(user)"
          [disabled]="user.pendingCommission === 0"
          class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
        >
          <i class="bi bi-calendar-range mr-1"></i> Pay by Period
        </button>

        <button
          (click)="toggleUserExpand(user.userId)"
          class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium"
        >
          <i class="bi bi-list mr-1"></i> View Details
        </button>
      </div>

      <!-- Expanded Commission Records (add expand/collapse logic) -->
      <div *ngIf="expandedUsers.has(user.userId)" class="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                  <input type="checkbox" (change)="selectAllUserCommissions(user.userId, $event)">
                </th>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Product</th>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Sale Amount</th>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Commission</th>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Date</th>
                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
              <tr *ngFor="let record of user.records">
                <td class="px-3 py-2">
                  <input
                    type="checkbox"
                    [checked]="selectedCommissions.has(record.id)"
                    (change)="toggleCommissionSelection(record.id)"
                    [disabled]="record.status !== 'PENDING'"
                  >
                </td>
                <td class="px-3 py-2 text-sm text-gray-900 dark:text-white">{{ record.productName }}</td>
                <td class="px-3 py-2 text-sm text-gray-900 dark:text-white">
                  {{ formatCurrency(record.totalSaleAmount) }}
                </td>
                <td class="px-3 py-2 text-sm font-semibold text-blue-600">
                  {{ formatCurrency(record.commissionAmount) }}
                </td>
                <td class="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                  {{ formatDate(record.createdAt) }}
                </td>
                <td class="px-3 py-2">
                  <span [class]="getStatusBadgeClass(record.status)" class="px-2 py-1 text-xs font-medium rounded-full">
                    {{ record.status }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pay Selected Button -->
        <div class="mt-4 flex justify-end">
          <button
            (click)="paySelected(user.userId, user.fullName)"
            [disabled]="!hasSelectedCommissions(user.userId)"
            class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
          >
            <i class="bi bi-credit-card mr-1"></i> Pay Selected ({{ getSelectedCount(user.userId) }})
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
```

### 4. Add Helper Methods to Dashboard Component

```typescript
expandedUsers: Set<number> = new Set();

toggleUserExpand(userId: number) {
  if (this.expandedUsers.has(userId)) {
    this.expandedUsers.delete(userId);
  } else {
    this.expandedUsers.add(userId);
  }
}

hasSelectedCommissions(userId: number): boolean {
  const userRecords = this.userCommissions.find(u => u.userId === userId)?.records || [];
  return userRecords.some((r: any) =>
    this.selectedCommissions.has(r.id) && r.status === 'PENDING'
  );
}

getSelectedCount(userId: number): number {
  const userRecords = this.userCommissions.find(u => u.userId === userId)?.records || [];
  return userRecords.filter((r: any) =>
    this.selectedCommissions.has(r.id) && r.status === 'PENDING'
  ).length;
}

selectAllUserCommissions(userId: number, event: any) {
  const userRecords = this.userCommissions.find(u => u.userId === userId)?.records || [];
  const pendingRecords = userRecords.filter((r: any) => r.status === 'PENDING');

  if (event.target.checked) {
    pendingRecords.forEach((r: any) => this.selectedCommissions.add(r.id));
  } else {
    pendingRecords.forEach((r: any) => this.selectedCommissions.delete(r.id));
  }
}
```

### 5. Create Payment History Component (Optional but Recommended)

Create a new component to view payment history:
```bash
ng g c modules/commission/components/commission-payment-history
```

Add method to load history:
```typescript
paymentHistory: any[] = [];

loadPaymentHistory() {
  this.commissionService.getPaymentHistory(
    this.organizationId,
    undefined, // All users
    this.startDate,
    this.endDate
  ).subscribe({
    next: (history) => {
      this.paymentHistory = history;
    },
    error: (error) => {
      console.error('Error loading payment history:', error);
    }
  });
}
```

## Testing Checklist

- [ ] Payment modal opens correctly for manual payment
- [ ] Can add/remove payment methods
- [ ] Payment total validates against commission total
- [ ] Manual payment with single method works
- [ ] Manual payment with multiple methods works
- [ ] Bulk pay all unpaid works
- [ ] Bulk pay by period works
- [ ] Payment success refreshes dashboard
- [ ] Transaction codes are saved correctly
- [ ] Payment history displays correctly
- [ ] Permission checks work (if implemented)

## Key Features

1. **Multiple Payment Methods**: Cash + M-Pesa + Bank in one transaction
2. **Bulk Operations**: Pay all unpaid or pay by date range
3. **Real-time Validation**: Ensures payment matches commission total
4. **Transaction Tracking**: Transaction codes for each method
5. **Audit Trail**: Complete payment history with breakdowns
6. **User-Friendly UI**: Similar to invoice payment modal

## API Integration

All API calls use the updated CommissionService which connects to:
- `POST /commission/pay` - Manual payment
- `POST /commission/bulk-pay` - Bulk payment
- `GET /commission/unpaid-summary/:userId` - Unpaid summary
- `GET /commission/payment-history` - Payment history

## Next Steps

1. Complete the dashboard component updates
2. Add period selector UI for "Pay by Period"
3. Create payment history view
4. Add permission guards
5. Test all payment scenarios
6. Add loading states and error handling
7. Implement payment receipts/PDFs (optional)

---

**Status**: Backend ✅ Complete | Frontend ⏳ 80% Complete
**Remaining**: Dashboard integration and testing
