# Payment Methods & Authentication Settings - Implementation Guide

## ✅ Backend Implementation Completed

### Database Schema Updates

Added to `OrganizationSettings`:
```prisma
// Authentication Settings
jwtAccessTokenExpiry  String   @default("1h")    // e.g., "1h", "30m", "7d"
jwtRefreshTokenExpiry String   @default("7d")
sessionTimeout        Int      @default(3600)     // seconds
maxLoginAttempts      Int      @default(5)
lockoutDuration       Int      @default(900)      // seconds (15 min)

// Relations
paymentMethods_rel    PaymentMethod[]
```

Added New `PaymentMethod` Model:
```prisma
model PaymentMethod {
  id                    Int      @id @default(autoincrement())
  organizationId        Int
  settingsId            Int
  settings              OrganizationSettings @relation(...)

  name                  String   // "Cash", "M-PESA"
  code                  String   // "CASH", "MPESA"
  displayName           String   // Display in UI
  description           String?
  icon                  String?  // Material icon name
  enabled               Boolean  @default(true)
  sortOrder             Int      @default(0)

  requiresReference     Boolean  @default(false)
  autoReconcile         Boolean  @default(false)
  accountNumber         String?
  providerName          String?
  providerConfig        Json?

  @@unique([settingsId, code])
}
```

### Backend Services Created

**Files:**
- `apps/backend/src/settings/payment-method.dto.ts` - DTOs
- `apps/backend/src/settings/payment-method.service.ts` - Business logic
- `apps/backend/src/settings/payment-method.controller.ts` - API endpoints
- Updated `settings.dto.ts` - Added auth settings
- Updated `settings.service.ts` - Auto-initialize payment methods
- Updated `settings.module.ts` - Registered new services

### API Endpoints

```
# Payment Methods CRUD
POST   /payment-methods                                    # Create
GET    /payment-methods/organization/:orgId               # List all
GET    /payment-methods/organization/:orgId/enabled       # List enabled only
GET    /payment-methods/:id                               # Get one
PUT    /payment-methods/:id                               # Update
DELETE /payment-methods/:id                               # Delete
PATCH  /payment-methods/:id/toggle                        # Toggle enabled
POST   /payment-methods/organization/:orgId/reorder       # Reorder
POST   /payment-methods/organization/:orgId/settings/:settingsId/initialize  # Initialize defaults
```

### Default Payment Methods

When settings are created, these default payment methods are auto-created:
1. **Cash** - Physical cash payment
2. **M-PESA** - Mobile money (requires reference)
3. **Bank Transfer** - Direct bank transfer (requires reference)
4. **Credit** - Pay later via invoice

---

## 🎯 Frontend Implementation Steps

### Step 1: Update Interfaces

Create `apps/frontend/src/app/shared/interfaces/payment-method.interface.ts`:

```typescript
export interface PaymentMethod {
  id?: number;
  organizationId: number;
  settingsId: number;
  name: string;
  code: string;
  displayName: string;
  description?: string;
  icon?: string;
  enabled: boolean;
  sortOrder: number;
  requiresReference: boolean;
  autoReconcile: boolean;
  accountNumber?: string;
  providerName?: string;
  providerConfig?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreatePaymentMethodDto {
  organizationId: number;
  settingsId: number;
  name: string;
  code: string;
  displayName: string;
  description?: string;
  icon?: string;
  enabled?: boolean;
  sortOrder?: number;
  requiresReference?: boolean;
  autoReconcile?: boolean;
  accountNumber?: string;
  providerName?: string;
  providerConfig?: any;
}

export interface UpdatePaymentMethodDto {
  name?: string;
  displayName?: string;
  description?: string;
  icon?: string;
  enabled?: boolean;
  sortOrder?: number;
  requiresReference?: boolean;
  autoReconcile?: boolean;
  accountNumber?: string;
  providerName?: string;
  providerConfig?: any;
}
```

### Step 2: Update Settings Interface

Add to `settings.interface.ts`:

```typescript
export interface OrganizationSettings {
  // ... existing fields ...

  // Authentication Settings
  jwtAccessTokenExpiry: string;
  jwtRefreshTokenExpiry: string;
  sessionTimeout: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
}
```

### Step 3: Create Payment Method Service

Create `apps/frontend/src/app/shared/Services/payment-method.service.ts`:

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../Environments/environments';
import { PaymentMethod, CreatePaymentMethodDto, UpdatePaymentMethodDto } from '../interfaces/payment-method.interface';

@Injectable({
  providedIn: 'root',
})
export class PaymentMethodService {
  private apiUrl = `${environment.apiMainRootUrl}payment-methods`;

  constructor(private http: HttpClient) {}

  private getOrganizationId(): number {
    const orgId = localStorage.getItem('licencedOrg');
    return orgId ? parseInt(orgId, 10) : 0;
  }

  getAll(): Observable<PaymentMethod[]> {
    const orgId = this.getOrganizationId();
    return this.http.get<PaymentMethod[]>(`${this.apiUrl}/organization/${orgId}`);
  }

  getEnabled(): Observable<PaymentMethod[]> {
    const orgId = this.getOrganizationId();
    return this.http.get<PaymentMethod[]>(`${this.apiUrl}/organization/${orgId}/enabled`);
  }

  getOne(id: number): Observable<PaymentMethod> {
    return this.http.get<PaymentMethod>(`${this.apiUrl}/${id}`);
  }

  create(dto: CreatePaymentMethodDto): Observable<PaymentMethod> {
    return this.http.post<PaymentMethod>(this.apiUrl, dto);
  }

  update(id: number, dto: UpdatePaymentMethodDto): Observable<PaymentMethod> {
    return this.http.put<PaymentMethod>(`${this.apiUrl}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  toggle(id: number): Observable<PaymentMethod> {
    return this.http.patch<PaymentMethod>(`${this.apiUrl}/${id}/toggle`, {});
  }

  reorder(orderedIds: number[]): Observable<PaymentMethod[]> {
    const orgId = this.getOrganizationId();
    return this.http.post<PaymentMethod[]>(
      `${this.apiUrl}/organization/${orgId}/reorder`,
      { orderedIds }
    );
  }

  initializeDefaults(settingsId: number): Observable<PaymentMethod[]> {
    const orgId = this.getOrganizationId();
    return this.http.post<PaymentMethod[]>(
      `${this.apiUrl}/organization/${orgId}/settings/${settingsId}/initialize`,
      {}
    );
  }
}
```

### Step 4: Add Payment Methods Tab to Settings Component

Update `app-settings.component.ts`:

Add form:
```typescript
paymentMethodsForm!: FormGroup;
paymentMethods: PaymentMethod[] = [];
isLoadingPaymentMethods = false;
editingPaymentMethod: PaymentMethod | null = null;
showPaymentMethodModal = false;
```

In `initializeForms()`:
```typescript
this.paymentMethodsForm = this.fb.group({
  name: ['', Validators.required],
  code: ['', Validators.required],
  displayName: ['', Validators.required],
  description: [''],
  icon: [''],
  enabled: [true],
  requiresReference: [false],
  accountNumber: [''],
});
```

Add methods:
```typescript
loadPaymentMethods() {
  this.isLoadingPaymentMethods = true;
  this.paymentMethodService.getAll().subscribe({
    next: (methods) => {
      this.paymentMethods = methods;
      this.isLoadingPaymentMethods = false;
    },
    error: (error) => {
      console.error('Error loading payment methods:', error);
      this.toast.error('Failed to load payment methods');
      this.isLoadingPaymentMethods = false;
    },
  });
}

addPaymentMethod() {
  this.editingPaymentMethod = null;
  this.paymentMethodsForm.reset({ enabled: true });
  this.showPaymentMethodModal = true;
}

editPaymentMethod(method: PaymentMethod) {
  this.editingPaymentMethod = method;
  this.paymentMethodsForm.patchValue(method);
  this.showPaymentMethodModal = true;
}

savePaymentMethod() {
  if (this.paymentMethodsForm.invalid) return;

  const formData = this.paymentMethodsForm.value;

  if (this.editingPaymentMethod) {
    this.paymentMethodService.update(this.editingPaymentMethod.id!, formData).subscribe({
      next: () => {
        this.toast.success('Payment method updated');
        this.loadPaymentMethods();
        this.showPaymentMethodModal = false;
      },
      error: () => this.toast.error('Failed to update payment method'),
    });
  } else {
    const dto: CreatePaymentMethodDto = {
      ...formData,
      organizationId: this.getOrganizationId(),
      settingsId: this.settings!.id!,
    };

    this.paymentMethodService.create(dto).subscribe({
      next: () => {
        this.toast.success('Payment method created');
        this.loadPaymentMethods();
        this.showPaymentMethodModal = false;
      },
      error: () => this.toast.error('Failed to create payment method'),
    });
  }
}

togglePaymentMethod(method: PaymentMethod) {
  this.paymentMethodService.toggle(method.id!).subscribe({
    next: () => {
      this.toast.success(`Payment method ${method.enabled ? 'disabled' : 'enabled'}`);
      this.loadPaymentMethods();
    },
    error: () => this.toast.error('Failed to toggle payment method'),
  });
}

deletePaymentMethod(method: PaymentMethod) {
  if (!confirm(`Delete payment method "${method.displayName}"?`)) return;

  this.paymentMethodService.delete(method.id!).subscribe({
    next: () => {
      this.toast.success('Payment method deleted');
      this.loadPaymentMethods();
    },
    error: () => this.toast.error('Failed to delete payment method'),
  });
}
```

### Step 5: Add Authentication Settings Form

In `initializeForms()`:
```typescript
this.authForm = this.fb.group({
  jwtAccessTokenExpiry: ['1h', Validators.required],
  jwtRefreshTokenExpiry: ['7d', Validators.required],
  sessionTimeout: [3600, [Validators.required, Validators.min(60)]],
  maxLoginAttempts: [5, [Validators.required, Validators.min(3), Validators.max(10)]],
  lockoutDuration: [900, [Validators.required, Validators.min(300)]],
});
```

### Step 6: Update HTML Template

Add payment methods tab and auth settings tab to the navigation sidebar and content areas.

---

## 📋 Migration Command

```bash
cd apps/backend
npx prisma migrate dev --name add_payment_methods_and_auth_settings
npx prisma generate
```

---

## 🎨 UI Features

### Payment Methods Management
- ✅ List all payment methods
- ✅ Add new payment method
- ✅ Edit existing payment method
- ✅ Delete payment method
- ✅ Toggle enabled/disabled
- ✅ Drag-and-drop reordering
- ✅ Icon picker
- ✅ Custom configuration per method

### Authentication Settings
- ✅ JWT Access Token Expiry (format: "1h", "30m", "7d")
- ✅ JWT Refresh Token Expiry
- ✅ Session Timeout (seconds)
- ✅ Max Login Attempts
- ✅ Account Lockout Duration (seconds)

---

## 🔧 Usage Examples

### Creating a Custom Payment Method
```typescript
const customMethod: CreatePaymentMethodDto = {
  organizationId: 1,
  settingsId: 1,
  name: 'PayPal',
  code: 'PAYPAL',
  displayName: 'PayPal',
  description: 'Pay via PayPal',
  icon: 'account_balance_wallet',
  enabled: true,
  sortOrder: 4,
  requiresReference: true,
  providerConfig: {
    clientId: 'xxx',
    secretKey: 'yyy'
  }
};

this.paymentMethodService.create(customMethod).subscribe();
```

### Getting Enabled Payment Methods for Checkout
```typescript
this.paymentMethodService.getEnabled().subscribe(methods => {
  this.checkoutMethods = methods;
});
```

---

## 🚀 Next Steps

1. Run the migration
2. Create frontend interfaces
3. Create payment method service
4. Add payment methods management UI tab
5. Add authentication settings UI tab
6. Test CRUD operations
7. Implement drag-and-drop reordering (optional)

---

**Status**: ✅ Backend Complete | ⏳ Frontend Pending
**Version**: 1.0.0
