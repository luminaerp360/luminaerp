# Quick Reference: Global CRUD Permissions

## 🚀 Quick Copy-Paste Templates

### 1. Component Setup (TypeScript)

```typescript
import { Component, OnInit } from '@angular/core';
import { PermissionService } from '../../../../shared/Services/permission.service';
import { HotToastService } from '@ngneat/hot-toast';

@Component({
  selector: 'app-your-component',
  templateUrl: './your-component.component.html',
})
export class YourComponent implements OnInit {
  // Data
  items: any[] = [];
  isLoading: boolean = false;

  // Permissions
  canCreate: boolean = false;
  canUpdate: boolean = false;
  canDelete: boolean = false;
  canView: boolean = false;

  constructor(
    private permissionService: PermissionService,
    private toast: HotToastService
  ) {}

  ngOnInit(): void {
    this.loadPermissions();

    if (!this.canView) {
      this.toast.error("You don't have permission to view this page");
      return;
    }

    this.loadData();
  }

  private loadPermissions(): void {
    // REPLACE 'moduleName' with: products, customers, sales, users, etc.
    this.canView = this.permissionService.canPerformAction('moduleName', 'view');
    this.canCreate = this.permissionService.canPerformAction('moduleName', 'create');
    this.canUpdate = this.permissionService.canPerformAction('moduleName', 'update');
    this.canDelete = this.permissionService.canPerformAction('moduleName', 'delete');
  }

  loadData(): void {
    // Your data loading logic
  }

  create(): void {
    if (!this.canCreate) {
      this.toast.error("You don't have permission to create");
      return;
    }
    // Create logic
  }

  update(item: any): void {
    if (!this.canUpdate) {
      this.toast.error("You don't have permission to update");
      return;
    }
    // Update logic
  }

  delete(id: number): void {
    if (!this.canDelete) {
      this.toast.error("You don't have permission to delete");
      return;
    }
    // Delete logic
  }
}
```

### 2. Template (HTML)

```html
<div class="container">
  <!-- Header with Create Button -->
  <div class="flex justify-between mb-4">
    <h1>Page Title</h1>
    <button *ngIf="canCreate" (click)="create()">Add New</button>
  </div>

  <!-- Table -->
  <table *ngIf="canView">
    <thead>
      <tr>
        <th>Column 1</th>
        <th>Column 2</th>
        <th *ngIf="canUpdate || canDelete">Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr *ngFor="let item of items">
        <td>{{ item.name }}</td>
        <td>{{ item.description }}</td>
        <td *ngIf="canUpdate || canDelete">
          <button *ngIf="canUpdate" (click)="update(item)">Edit</button>
          <button *ngIf="canDelete" (click)="delete(item.id)">Delete</button>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

## 📋 Module Names Reference

| Page/Module | Permission Key | Usage |
|-------------|---------------|-------|
| Products | `'products'` | `canPerformAction('products', 'create')` |
| Customers | `'customers'` | `canPerformAction('customers', 'create')` |
| Sales | `'sales'` | `canPerformAction('sales', 'create')` |
| Users | `'users'` | `canPerformAction('users', 'create')` |
| Stock | `'stock'` | `canPerformAction('stock', 'create')` |
| Inventory | `'inventory'` | `canPerformAction('inventory', 'create')` |
| LPO | `'lpo'` | `canPerformAction('lpo', 'create')` |
| Quotations | `'quotations'` | `canPerformAction('quotations', 'create')` |
| Suppliers | `'suppliers'` | `canPerformAction('suppliers', 'create')` |
| Categories | `'categories'` | `canPerformAction('categories', 'create')` |
| Credit Sales | `'credit_sales'` | `canPerformAction('credit_sales', 'create')` |
| Reports | `'reports'` | `canPerformAction('reports', 'view')` |
| Settings | `'setting'` | `canPerformAction('setting', 'update')` |
| Dashboard | `'dashboard'` | `canPerformAction('dashboard', 'view')` |

## 🎯 Action Types

| Action | When to Use |
|--------|-------------|
| `'view'` | Viewing lists, details, printing, exporting |
| `'create'` | Adding new records, importing data |
| `'update'` | Editing, modifying, updating existing records |
| `'delete'` | Deleting, removing, voiding, cancelling |

## 💡 Common Scenarios

### Scenario 1: Hide Create Button
```html
<button *ngIf="canCreate" (click)="openCreateModal()">
  Add New
</button>
```

### Scenario 2: Hide Edit/Delete in Table
```html
<button *ngIf="canUpdate" (click)="edit(item)">Edit</button>
<button *ngIf="canDelete" (click)="delete(item.id)">Delete</button>
```

### Scenario 3: Disable Form Fields
```html
<input formControlName="name" [disabled]="!canUpdate">
```

### Scenario 4: Show No Permission Message
```html
<div *ngIf="!canView">
  <p>You don't have permission to view this page</p>
</div>
```

### Scenario 5: Check Permission in Method
```typescript
deleteItem(id: number): void {
  if (!this.canDelete) {
    this.toast.error("No permission to delete");
    return;
  }
  // Delete logic here
}
```

### Scenario 6: Multiple Permission Check
```html
<!-- Show column only if user can update OR delete -->
<th *ngIf="canUpdate || canDelete">Actions</th>
```

## 🔍 PermissionService Methods

### Basic Methods
```typescript
// Check individual CRUD permissions (global)
permissionService.canView()    // Returns: boolean
permissionService.canCreate()  // Returns: boolean
permissionService.canUpdate()  // Returns: boolean
permissionService.canDelete()  // Returns: boolean

// Check module access
permissionService.hasModuleAccess('products')  // Returns: boolean

// Combined check (RECOMMENDED)
permissionService.canPerformAction('products', 'create')  // Returns: boolean
```

### Observable Methods (for async pipes)
```typescript
permissionService.canView$()
permissionService.canCreate$()
permissionService.canUpdate$()
permissionService.canDelete$()
permissionService.canPerformAction$('products', 'view')
```

## ✅ Step-by-Step Checklist

For each component you refactor:

1. [ ] Import `PermissionService`
2. [ ] Add permission flags (`canCreate`, `canUpdate`, `canDelete`, `canView`)
3. [ ] Create `loadPermissions()` method
4. [ ] Call `loadPermissions()` in `ngOnInit()`
5. [ ] Add view permission check
6. [ ] Update CREATE button with `*ngIf="canCreate"`
7. [ ] Update UPDATE buttons with `*ngIf="canUpdate"`
8. [ ] Update DELETE buttons with `*ngIf="canDelete"`
9. [ ] Add permission checks in methods
10. [ ] Test with different user roles

## 🎨 Common Button Patterns

### Primary Action Button (Create)
```html
<button
  *ngIf="canCreate"
  (click)="create()"
  class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
  <i class="material-icons">add</i>
  Add New
</button>
```

### Edit Button
```html
<button
  *ngIf="canUpdate"
  (click)="edit(item)"
  class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded">
  <i class="material-icons">edit</i>
  Edit
</button>
```

### Delete Button
```html
<button
  *ngIf="canDelete"
  (click)="delete(item.id)"
  class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded">
  <i class="material-icons">delete</i>
  Delete
</button>
```

### Disabled Button with Tooltip
```html
<button
  [disabled]="!canCreate"
  [title]="!canCreate ? 'No permission to create' : 'Add new item'"
  (click)="create()"
  class="btn">
  Add New
</button>
```

## 🧪 Testing Commands

```typescript
// In browser console, check current user permissions:
const user = JSON.parse(localStorage.getItem('user'));
console.log('User permissions:', user?.permissions);

// Check specific permission:
console.log('Can create products:', user?.permissions?.canCreate && user?.permissions?.products);
console.log('Can delete users:', user?.permissions?.canDelete && user?.permissions?.users);
```

## 📝 Notes

- **Always check permissions in both template AND methods**
- **Use `canPerformAction()` for cleaner code**
- **Default to `false` if permission is undefined**
- **Show user-friendly error messages**
- **Backend must also validate permissions**

## 🔗 See Also

- [PERMISSION_IMPLEMENTATION_GUIDE.md](./PERMISSION_IMPLEMENTATION_GUIDE.md) - Detailed examples
- [REFACTORING_GUIDE.md](./REFACTORING_GUIDE.md) - Complete refactoring patterns
- [EXAMPLES/](./EXAMPLES/) - Working component examples
