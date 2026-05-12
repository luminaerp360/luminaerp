# Complete Refactoring Guide: Migrating to Global CRUD Permissions

## Quick Start

### Step 1: Import PermissionService

In every component that needs permission checks:

```typescript
import { PermissionService } from '../../../../shared/Services/permission.service';

export class YourComponent {
  constructor(private permissionService: PermissionService) {}
}
```

### Step 2: Define Permission Flags

```typescript
export class YourComponent {
  canCreate: boolean = false;
  canUpdate: boolean = false;
  canDelete: boolean = false;
  canView: boolean = false;
}
```

### Step 3: Load Permissions in ngOnInit

```typescript
ngOnInit(): void {
  this.loadPermissions();

  if (!this.canView) {
    this.toast.error("You don't have permission to view this page");
    return;
  }

  this.loadData();
}

private loadPermissions(): void {
  // Replace 'moduleName' with: products, customers, sales, users, etc.
  this.canView = this.permissionService.canPerformAction('moduleName', 'view');
  this.canCreate = this.permissionService.canPerformAction('moduleName', 'create');
  this.canUpdate = this.permissionService.canPerformAction('moduleName', 'update');
  this.canDelete = this.permissionService.canPerformAction('moduleName', 'delete');
}
```

### Step 4: Update Templates

```html
<!-- CREATE button -->
<button *ngIf="canCreate" (click)="create()">Add New</button>

<!-- UPDATE button -->
<button *ngIf="canUpdate" (click)="edit(item)">Edit</button>

<!-- DELETE button -->
<button *ngIf="canDelete" (click)="delete(item)">Delete</button>
```

## Module-Specific Examples

### Products Module

**Component:**
```typescript
private loadPermissions(): void {
  this.canView = this.permissionService.canPerformAction('products', 'view');
  this.canCreate = this.permissionService.canPerformAction('products', 'create');
  this.canUpdate = this.permissionService.canPerformAction('products', 'update');
  this.canDelete = this.permissionService.canPerformAction('products', 'delete');
}
```

**Template:**
```html
<button *ngIf="canCreate" (click)="addProduct()">Add Product</button>
<button *ngIf="canUpdate" (click)="editProduct(product)">Edit</button>
<button *ngIf="canDelete" (click)="deleteProduct(product.id)">Delete</button>
```

### Customers Module

**Component:**
```typescript
private loadPermissions(): void {
  this.canView = this.permissionService.canPerformAction('customers', 'view');
  this.canCreate = this.permissionService.canPerformAction('customers', 'create');
  this.canUpdate = this.permissionService.canPerformAction('customers', 'update');
  this.canDelete = this.permissionService.canPerformAction('customers', 'delete');
}
```

### Sales Module

**Component:**
```typescript
private loadPermissions(): void {
  this.canView = this.permissionService.canPerformAction('sales', 'view');
  this.canCreate = this.permissionService.canPerformAction('sales', 'create');
  this.canUpdate = this.permissionService.canPerformAction('sales', 'update');
  this.canDelete = this.permissionService.canPerformAction('sales', 'delete');
}
```

### Users Module

**Component:**
```typescript
private loadPermissions(): void {
  this.canView = this.permissionService.canPerformAction('users', 'view');
  this.canCreate = this.permissionService.canPerformAction('users', 'create');
  this.canUpdate = this.permissionService.canPerformAction('users', 'update');
  this.canDelete = this.permissionService.canPerformAction('users', 'delete');
}
```

### Stock/Inventory Module

**Component:**
```typescript
private loadPermissions(): void {
  this.canView = this.permissionService.canPerformAction('stock', 'view');
  this.canCreate = this.permissionService.canPerformAction('stock', 'create');
  this.canUpdate = this.permissionService.canPerformAction('stock', 'update');
  this.canDelete = this.permissionService.canPerformAction('stock', 'delete');
}
```

### LPO Module

**Component:**
```typescript
private loadPermissions(): void {
  this.canView = this.permissionService.canPerformAction('lpo', 'view');
  this.canCreate = this.permissionService.canPerformAction('lpo', 'create');
  this.canUpdate = this.permissionService.canPerformAction('lpo', 'update');
  this.canDelete = this.permissionService.canPerformAction('lpo', 'delete');
}
```

### Quotations Module

**Component:**
```typescript
private loadPermissions(): void {
  this.canView = this.permissionService.canPerformAction('quotations', 'view');
  this.canCreate = this.permissionService.canPerformAction('quotations', 'create');
  this.canUpdate = this.permissionService.canPerformAction('quotations', 'update');
  this.canDelete = this.permissionService.canPerformAction('quotations', 'delete');
}
```

### Suppliers Module

**Component:**
```typescript
private loadPermissions(): void {
  this.canView = this.permissionService.canPerformAction('suppliers', 'view');
  this.canCreate = this.permissionService.canPerformAction('suppliers', 'create');
  this.canUpdate = this.permissionService.canPerformAction('suppliers', 'update');
  this.canDelete = this.permissionService.canPerformAction('suppliers', 'delete');
}
```

### Categories Module

**Component:**
```typescript
private loadPermissions(): void {
  this.canView = this.permissionService.canPerformAction('categories', 'view');
  this.canCreate = this.permissionService.canPerformAction('categories', 'create');
  this.canUpdate = this.permissionService.canPerformAction('categories', 'update');
  this.canDelete = this.permissionService.canPerformAction('categories', 'delete');
}
```

### Credit Sales Module

**Component:**
```typescript
private loadPermissions(): void {
  this.canView = this.permissionService.canPerformAction('credit_sales', 'view');
  this.canCreate = this.permissionService.canPerformAction('credit_sales', 'create');
  this.canUpdate = this.permissionService.canPerformAction('credit_sales', 'update');
  this.canDelete = this.permissionService.canPerformAction('credit_sales', 'delete');
}
```

### Reports Module

**Component:**
```typescript
private loadPermissions(): void {
  this.canView = this.permissionService.canPerformAction('reports', 'view');
  // Reports typically only need view permission
  // But you can add others if needed
}
```

### Settings Module

**Component:**
```typescript
private loadPermissions(): void {
  this.canView = this.permissionService.canPerformAction('setting', 'view');
  this.canUpdate = this.permissionService.canPerformAction('setting', 'update');
  // Settings typically don't have create/delete
}
```

## Common Patterns

### Pattern 1: Table with Action Buttons

```html
<table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Description</th>
      <th *ngIf="canUpdate || canDelete">Actions</th>
    </tr>
  </thead>
  <tbody>
    <tr *ngFor="let item of items">
      <td>{{ item.name }}</td>
      <td>{{ item.description }}</td>
      <td *ngIf="canUpdate || canDelete">
        <button *ngIf="canUpdate" (click)="edit(item)">Edit</button>
        <button *ngIf="canDelete" (click)="delete(item.id)">Delete</button>
      </td>
    </tr>
  </tbody>
</table>
```

### Pattern 2: Form with Disabled Fields

```html
<form [formGroup]="myForm">
  <input formControlName="name" [disabled]="!canUpdate">
  <input formControlName="email" [disabled]="!canUpdate">

  <button type="submit" [disabled]="!canUpdate">
    Save Changes
  </button>
</form>
```

### Pattern 3: Method with Permission Check

```typescript
deleteItem(id: number): void {
  // Always check permission first
  if (!this.canDelete) {
    this.toast.error("You don't have permission to delete");
    return;
  }

  // Confirm action
  if (!confirm('Are you sure?')) {
    return;
  }

  // Perform action
  this.apiService.delete(id).subscribe(
    () => this.toast.success('Deleted successfully'),
    () => this.toast.error('Failed to delete')
  );
}
```

### Pattern 4: Page-Level Access Check

```typescript
ngOnInit(): void {
  // Check module access first
  if (!this.permissionService.hasModuleAccess('moduleName')) {
    this.toast.error("You don't have access to this module");
    this.router.navigate(['/dashboard']);
    return;
  }

  // Load permissions
  this.loadPermissions();

  // Check view permission
  if (!this.canView) {
    this.toast.error("You don't have permission to view this page");
    return;
  }

  // Load data
  this.loadData();
}
```

## Action Type Mapping

| User Action | Permission Type | Example |
|-------------|----------------|---------|
| View list, View details, Print, Export | `canView` | View products, Print invoice |
| Add new, Create, Import | `canCreate` | Add product, Import CSV |
| Edit, Update, Modify | `canUpdate` | Edit product, Update stock |
| Delete, Remove, Void, Cancel | `canDelete` | Delete product, Void sale |

## Checklist for Each Component

- [ ] Import `PermissionService`
- [ ] Add permission flag properties
- [ ] Create `loadPermissions()` method
- [ ] Call `loadPermissions()` in `ngOnInit()`
- [ ] Add module access check
- [ ] Add view permission check before loading data
- [ ] Update CREATE button with `*ngIf="canCreate"`
- [ ] Update UPDATE/EDIT buttons with `*ngIf="canUpdate"`
- [ ] Update DELETE buttons with `*ngIf="canDelete"`
- [ ] Add permission checks in all action methods
- [ ] Show appropriate error messages
- [ ] Test with different user roles

## Complete Module List

Update permissions in these modules:

1. ✅ Dashboard (`dashboard`)
2. ✅ Products (`products`)
3. ✅ Categories (`categories`)
4. ✅ Inventory (`inventory`)
5. ✅ Suppliers (`suppliers`)
6. ✅ Sales (`sales`)
7. ✅ Credit Sales (`credit_sales`)
8. ✅ Reports (`reports`)
9. ✅ Customers (`customers`)
10. ✅ Stock (`stock`)
11. ✅ Users (`users`)
12. ✅ Quotations (`quotations`)
13. ✅ LPO (`lpo`)
14. ✅ Settings (`setting`)

## Testing Different Roles

### Admin User (Full Access)
```json
{
  "canView": true,
  "canCreate": true,
  "canUpdate": true,
  "canDelete": true,
  "products": true,
  "customers": true,
  // ... all modules: true
}
```
**Expected:** See all buttons and can perform all actions

### Sales User (Limited)
```json
{
  "canView": true,
  "canCreate": true,
  "canUpdate": true,
  "canDelete": false,
  "sales": true,
  "customers": true,
  "products": true,
  "quotations": true
}
```
**Expected:** Can view, create, edit but NOT delete. No access to users, settings, inventory

### View-Only User
```json
{
  "canView": true,
  "canCreate": false,
  "canUpdate": false,
  "canDelete": false,
  "reports": true,
  "dashboard": true
}
```
**Expected:** Can only view reports and dashboard. No action buttons visible

## Common Mistakes to Avoid

❌ **DON'T** check only module access:
```typescript
// WRONG
if (this.permissionService.hasModuleAccess('products')) {
  this.deleteProduct(id);
}
```

✅ **DO** check both module access AND action permission:
```typescript
// CORRECT
if (this.permissionService.canPerformAction('products', 'delete')) {
  this.deleteProduct(id);
}

// OR
if (this.canDelete) {
  this.deleteProduct(id);
}
```

❌ **DON'T** forget to check permissions in methods:
```typescript
// WRONG - No permission check
deleteProduct(id: number) {
  this.api.delete(id).subscribe(...);
}
```

✅ **DO** always check permissions in methods:
```typescript
// CORRECT
deleteProduct(id: number) {
  if (!this.canDelete) {
    this.toast.error("No permission");
    return;
  }
  this.api.delete(id).subscribe(...);
}
```

## Summary

The refactoring follows this simple formula:

**OLD:**
```typescript
if (permissions.moduleName) {
  // perform action
}
```

**NEW:**
```typescript
if (permissionService.canPerformAction('moduleName', 'action')) {
  // perform action
}
```

Where `action` is one of: `'view'`, `'create'`, `'update'`, `'delete'`
