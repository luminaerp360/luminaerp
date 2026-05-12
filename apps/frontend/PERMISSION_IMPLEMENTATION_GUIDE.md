# Permission Implementation Guide

This guide shows how to implement the global CRUD permission system across your Angular application.

## Overview

The system uses 4 global permissions:
- `canView` - Permission to view records
- `canCreate` - Permission to create new records
- `canUpdate` - Permission to edit/update existing records
- `canDelete` - Permission to delete records

## Setup

### 1. Import the Permission Service

In any component where you need to check permissions:

```typescript
import { PermissionService } from '../../../../shared/Services/permission.service';

export class YourComponent {
  constructor(public permissionService: PermissionService) {}
}
```

### 2. Use Permissions in Component

#### Method 1: Direct property access (simplest)

```typescript
export class ProductListComponent {
  canDelete: boolean = false;
  canUpdate: boolean = false;
  canCreate: boolean = false;
  canView: boolean = false;

  constructor(private permissionService: PermissionService) {
    this.canDelete = this.permissionService.canDelete();
    this.canUpdate = this.permissionService.canUpdate();
    this.canCreate = this.permissionService.canCreate();
    this.canView = this.permissionService.canView();
  }
}
```

#### Method 2: Using service directly in template

```typescript
export class ProductListComponent {
  constructor(public permissionService: PermissionService) {}
}
```

Then in template:
```html
<button *ngIf="permissionService.canCreate()">Add New</button>
```

#### Method 3: Using Observables (reactive)

```typescript
export class ProductListComponent {
  canDelete$ = this.permissionService.canDelete$();
  canUpdate$ = this.permissionService.canUpdate$();
  canCreate$ = this.permissionService.canCreate$();
  canView$ = this.permissionService.canView$();

  constructor(private permissionService: PermissionService) {}
}
```

Then in template:
```html
<button *ngIf="canDelete$ | async">Delete</button>
```

## Template Examples

### 1. Hide/Show Create Button

```html
<!-- Using direct property -->
<button
  *ngIf="canCreate"
  (click)="openCreateModal()"
  class="btn btn-primary">
  <i class="icon-plus"></i> Add New Product
</button>

<!-- Using service directly -->
<button
  *ngIf="permissionService.canCreate()"
  (click)="openCreateModal()"
  class="btn btn-primary">
  <i class="icon-plus"></i> Add New Product
</button>
```

### 2. Hide/Show Edit and Delete Buttons in Table

```html
<table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Price</th>
      <th *ngIf="canUpdate || canDelete">Actions</th>
    </tr>
  </thead>
  <tbody>
    <tr *ngFor="let product of products">
      <td>{{ product.name }}</td>
      <td>{{ product.price }}</td>
      <td *ngIf="canUpdate || canDelete">
        <button
          *ngIf="canUpdate"
          (click)="editProduct(product)"
          class="btn btn-sm btn-warning">
          Edit
        </button>
        <button
          *ngIf="canDelete"
          (click)="deleteProduct(product.id)"
          class="btn btn-sm btn-danger">
          Delete
        </button>
      </td>
    </tr>
  </tbody>
</table>
```

### 3. Disable Form Fields Based on Permissions

```html
<form [formGroup]="productForm">
  <input
    formControlName="name"
    [disabled]="!canUpdate"
    placeholder="Product Name">

  <input
    formControlName="price"
    [disabled]="!canUpdate"
    placeholder="Price">

  <button
    type="submit"
    [disabled]="!canUpdate"
    class="btn btn-success">
    Save Changes
  </button>
</form>
```

### 4. Show Tooltip for Disabled Actions

```html
<button
  [disabled]="!canDelete"
  [title]="!canDelete ? 'You don\'t have permission to delete' : 'Delete'"
  (click)="deleteItem(item.id)"
  class="btn btn-danger">
  Delete
</button>
```

## Component Examples

### Example 1: Product List Component

```typescript
import { Component, OnInit } from '@angular/core';
import { PermissionService } from '../../../../shared/Services/permission.service';
import { HotToastService } from '@ngneat/hot-toast';

@Component({
  selector: 'app-product-list',
  templateUrl: './product-list.component.html'
})
export class ProductListComponent implements OnInit {
  products: any[] = [];
  canDelete: boolean = false;
  canUpdate: boolean = false;
  canCreate: boolean = false;
  canView: boolean = false;

  constructor(
    private permissionService: PermissionService,
    private toast: HotToastService
  ) {}

  ngOnInit() {
    // Load permissions
    this.canDelete = this.permissionService.canDelete();
    this.canUpdate = this.permissionService.canUpdate();
    this.canCreate = this.permissionService.canCreate();
    this.canView = this.permissionService.canView();

    // Load data only if user can view
    if (this.canView) {
      this.loadProducts();
    } else {
      this.toast.error('You don\'t have permission to view products');
    }
  }

  loadProducts() {
    // Load products from API
  }

  openCreateModal() {
    if (!this.canCreate) {
      this.toast.error('You don\'t have permission to create products');
      return;
    }
    // Open create modal
  }

  editProduct(product: any) {
    if (!this.canUpdate) {
      this.toast.error('You don\'t have permission to edit products');
      return;
    }
    // Open edit modal
  }

  deleteProduct(id: number) {
    if (!this.canDelete) {
      this.toast.error('You don\'t have permission to delete products');
      return;
    }

    // Confirm and delete
    if (confirm('Are you sure you want to delete this product?')) {
      // Call API to delete
    }
  }
}
```

### Example 2: Customer List Component

```typescript
import { Component, OnInit } from '@angular/core';
import { PermissionService } from '../../../../shared/Services/permission.service';

@Component({
  selector: 'app-customer-list',
  templateUrl: './customer-list.component.html'
})
export class CustomerListComponent implements OnInit {
  customers: any[] = [];

  constructor(public permissionService: PermissionService) {}

  ngOnInit() {
    if (this.permissionService.canView()) {
      this.loadCustomers();
    }
  }

  loadCustomers() {
    // Load customers from API
  }

  // Methods will check permissions before executing
  createCustomer() {
    if (!this.permissionService.canCreate()) {
      return;
    }
    // Open create modal
  }

  updateCustomer(customer: any) {
    if (!this.permissionService.canUpdate()) {
      return;
    }
    // Open edit modal
  }

  deleteCustomer(id: number) {
    if (!this.permissionService.canDelete()) {
      return;
    }
    // Delete customer
  }
}
```

## API Request Protection

Always check permissions before making API calls:

```typescript
async deleteItem(id: number) {
  // Client-side permission check
  if (!this.permissionService.canDelete()) {
    this.toast.error('You don\'t have permission to delete');
    return;
  }

  try {
    await this.apiService.delete(`/products/${id}`);
    this.toast.success('Product deleted successfully');
    this.loadProducts();
  } catch (error) {
    this.toast.error('Failed to delete product');
  }
}
```

## Module Access Check

To check if user has access to a specific module:

```typescript
ngOnInit() {
  // Check if user has access to products module
  if (!this.permissionService.hasModuleAccess('products')) {
    this.router.navigate(['/unauthorized']);
    return;
  }

  // Load component data
  this.loadData();
}
```

## Best Practices

1. **Always check permissions before actions**: Don't rely only on hiding buttons
2. **Show user-friendly messages**: Tell users why they can't perform an action
3. **Fallback to false**: All permission checks default to false if not set
4. **Consistent UX**: Use the same pattern across all components
5. **Backend validation**: Always validate permissions on the backend too

## Quick Checklist for Each Component

- [ ] Import PermissionService
- [ ] Load permissions in ngOnInit or constructor
- [ ] Hide/show Create button based on `canCreate`
- [ ] Hide/show Edit buttons based on `canUpdate`
- [ ] Hide/show Delete buttons based on `canDelete`
- [ ] Check `canView` before loading data
- [ ] Add permission checks in action methods
- [ ] Show appropriate error messages when permission denied
