import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../shared/Services/auth.service';
import { HotToastService } from '@ngneat/hot-toast';
import { PermissionService } from '../../../../shared/Services/permission.service';
import { UserInterface } from '../../../../shared/interfaces/auth.interface';

interface ModulePermission {
  id: string;
  name: string;
  icon: string;
  description: string;
  expanded?: boolean;
  actions?: {
    id: string;
    name: string;
    description: string;
  }[];
}

interface RoleTemplate {
  name: string;
  description: string;
  permissions: any;
}

@Component({
  selector: 'app-user-permission-setting',
  templateUrl: './user-permision-setting.component.html',
  styleUrls: ['./user-permision-setting.component.scss'],
})
export class UserPermissionSettingComponent implements OnInit {
  // User Management
  users: UserInterface[] = [];
  selectedUser: UserInterface | null = null;
  isLoadingUsers = false;
  isLoadingPermissions = false;
  isSaving = false;
  hideUserList = false; // Hide user list when coming from user-list page

  // Permission Form
  permissionForm: FormGroup;
  searchTerm = '';

  // Module definitions with granular permissions
  modules: ModulePermission[] = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: 'bi-speedometer2',
      description: 'Access to dashboard and analytics',
      expanded: false,
      actions: [
        {
          id: 'view',
          name: 'View Dashboard',
          description: 'Can view dashboard',
        },
        {
          id: 'viewAll',
          name: 'View All Data',
          description: 'Can view all organization data',
        },
        {
          id: 'viewOwn',
          name: 'View Own Data',
          description: 'Can view only own data',
        },
        {
          id: 'viewAnalytics',
          name: 'View Analytics',
          description: 'Access to analytics and reports',
        },
      ],
    },
    {
      id: 'products',
      name: 'Products',
      icon: 'bi-box-seam',
      description: 'Product catalog management',
      expanded: false,
      actions: [
        { id: 'view', name: 'View Products', description: 'Can view products' },
        {
          id: 'create',
          name: 'Create Products',
          description: 'Can create new products',
        },
        {
          id: 'edit',
          name: 'Edit Products',
          description: 'Can edit product details',
        },
        {
          id: 'delete',
          name: 'Delete Products',
          description: 'Can delete products',
        },
        {
          id: 'manageCategories',
          name: 'Manage Categories',
          description: 'Can manage product categories',
        },
        {
          id: 'managePricing',
          name: 'Manage Pricing',
          description: 'Can update product prices',
        },
        {
          id: 'viewCost',
          name: 'View Cost',
          description: 'Can view cost prices',
        },
        {
          id: 'export',
          name: 'Export',
          description: 'Can export product list',
        },
        { id: 'import', name: 'Import', description: 'Can import products' },
      ],
    },
    {
      id: 'inventory',
      name: 'Inventory',
      icon: 'bi-clipboard-data',
      description: 'Stock and inventory management',
      expanded: false,
      actions: [
        {
          id: 'view',
          name: 'View Inventory',
          description: 'Can view inventory',
        },
        { id: 'addStock', name: 'Add Stock', description: 'Can add new stock' },
        {
          id: 'adjustStock',
          name: 'Adjust Stock',
          description: 'Can make stock adjustments',
        },
        {
          id: 'transferStock',
          name: 'Transfer Stock',
          description: 'Can transfer between locations',
        },
        {
          id: 'viewMovements',
          name: 'View Movements',
          description: 'Can view stock movements',
        },
        {
          id: 'manageBatches',
          name: 'Manage Batches',
          description: 'Can manage batch tracking',
        },
        {
          id: 'approveTransfers',
          name: 'Approve Transfers',
          description: 'Can approve stock transfers',
        },
        {
          id: 'export',
          name: 'Export',
          description: 'Can export inventory data',
        },
      ],
    },
    {
      id: 'sales',
      name: 'Sales',
      icon: 'bi-cart-check',
      description: 'Sales and orders management',
      expanded: false,
      actions: [
        { id: 'view', name: 'View Sales', description: 'Can view sales' },
        {
          id: 'create',
          name: 'Create Sales',
          description: 'Can create new sales',
        },
        { id: 'edit', name: 'Edit Sales', description: 'Can edit sales' },
        { id: 'void', name: 'Void Sales', description: 'Can void sales' },
        {
          id: 'viewAll',
          name: 'View All Sales',
          description: 'Can view all sales',
        },
        {
          id: 'viewOwn',
          name: 'View Own Sales',
          description: 'Can view only own sales',
        },
        {
          id: 'applyDiscount',
          name: 'Apply Discount',
          description: 'Can apply discounts',
        },
        {
          id: 'viewCost',
          name: 'View Cost',
          description: 'Can view cost/profit margins',
        },
        { id: 'export', name: 'Export', description: 'Can export sales data' },
      ],
    },
    {
      id: 'customers',
      name: 'Customers',
      icon: 'bi-people',
      description: 'Customer relationship management',
      expanded: false,
      actions: [
        {
          id: 'view',
          name: 'View Customers',
          description: 'Can view customers',
        },
        {
          id: 'create',
          name: 'Create Customers',
          description: 'Can create customers',
        },
        {
          id: 'edit',
          name: 'Edit Customers',
          description: 'Can edit customer details',
        },
        {
          id: 'delete',
          name: 'Delete Customers',
          description: 'Can delete customers',
        },
        {
          id: 'viewTransactions',
          name: 'View Transactions',
          description: 'Can view customer transactions',
        },
        {
          id: 'manageCreditLimit',
          name: 'Manage Credit',
          description: 'Can set credit limits',
        },
        {
          id: 'export',
          name: 'Export',
          description: 'Can export customer data',
        },
      ],
    },
    {
      id: 'suppliers',
      name: 'Suppliers',
      icon: 'bi-truck',
      description: 'Supplier management',
      expanded: false,
    },
    {
      id: 'quotations',
      name: 'Quotations',
      icon: 'bi-file-earmark-text',
      description: 'Quotation management',
      expanded: false,
    },
    {
      id: 'lpo',
      name: 'LPO',
      icon: 'bi-file-earmark-check',
      description: 'Local Purchase Orders',
      expanded: false,
    },
    {
      id: 'reports',
      name: 'Reports',
      icon: 'bi-graph-up',
      description: 'Reports and analytics',
      expanded: false,
      actions: [
        {
          id: 'viewSales',
          name: 'Sales Reports',
          description: 'Can view sales reports',
        },
        {
          id: 'viewInventory',
          name: 'Inventory Reports',
          description: 'Can view inventory reports',
        },
        {
          id: 'viewFinancial',
          name: 'Financial Reports',
          description: 'Can view financial reports',
        },
        {
          id: 'export',
          name: 'Export Reports',
          description: 'Can export reports',
        },
      ],
    },
    {
      id: 'users',
      name: 'Users',
      icon: 'bi-person-badge',
      description: 'User management',
      expanded: false,
      actions: [
        { id: 'view', name: 'View Users', description: 'Can view users' },
        { id: 'create', name: 'Create Users', description: 'Can create users' },
        { id: 'edit', name: 'Edit Users', description: 'Can edit users' },
        { id: 'delete', name: 'Delete Users', description: 'Can delete users' },
        {
          id: 'managePermissions',
          name: 'Manage Permissions',
          description: 'Can manage user permissions',
        },
      ],
    },
    {
      id: 'setting',
      name: 'Settings',
      icon: 'bi-gear',
      description: 'System settings',
      expanded: false,
      actions: [
        { id: 'view', name: 'View Settings', description: 'Can view settings' },
        {
          id: 'editOrganization',
          name: 'Edit Organization',
          description: 'Can edit org details',
        },
        {
          id: 'editPaymentMethods',
          name: 'Payment Methods',
          description: 'Can manage payment methods',
        },
        {
          id: 'editTax',
          name: 'Tax Settings',
          description: 'Can configure tax',
        },
      ],
    },
  ];

  // Role templates for quick assignment
  roleTemplates: RoleTemplate[] = [
    {
      name: 'Admin',
      description: 'Full access to all modules',
      permissions: this.getAdminPermissions(),
    },
    {
      name: 'Sales Person',
      description: 'Sales and customer management',
      permissions: this.getSalesPersonPermissions(),
    },
    {
      name: 'Inventory Manager',
      description: 'Inventory and stock management',
      permissions: this.getInventoryManagerPermissions(),
    },
    {
      name: 'Accountant',
      description: 'Financial and reporting access',
      permissions: this.getAccountantPermissions(),
    },
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private toast: HotToastService,
    private permissionService: PermissionService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    this.permissionForm = this.fb.group({
      // Global CRUD permissions
      canView: [false],
      canCreate: [false],
      canUpdate: [false],
      canDelete: [false],
    });
  }

  ngOnInit(): void {
    this.loadUsers();
    this.initializeForm();
  }

  loadUsers(): void {
    this.isLoadingUsers = true;
    const currentOrgId = localStorage.getItem('licencedOrg');

    if (!currentOrgId) {
      this.toast.error('Organization not found');
      this.isLoadingUsers = false;
      return;
    }

    this.authService.getUsersByOrganization(+currentOrgId).subscribe(
      (users) => {
        this.users = users;
        console.log('Users loaded:', users.length);

        // Check if we have a userId from route parameter
        const userIdFromRoute = this.route.snapshot.paramMap.get('userId');
        console.log('User ID from route:', userIdFromRoute);

        if (userIdFromRoute) {
          this.hideUserList = true; // Hide user list for focused editing
          // Convert string ID to number for comparison
          const userToSelect = this.users.find(
            (u) => u.id.toString() === userIdFromRoute,
          );
          console.log('User to select:', userToSelect);

          if (userToSelect) {
            this.selectUser(userToSelect);
          } else {
            console.error('User not found with ID:', userIdFromRoute);
            this.toast.error('User not found');
            this.router.navigate(['/users']);
          }
        }

        this.isLoadingUsers = false;
      },
      (error) => {
        this.toast.error('Failed to load users');
        this.isLoadingUsers = false;
        console.error('Error loading users:', error);
      },
    );
  }

  selectUser(user: UserInterface): void {
    console.log('selectUser called with:', user);
    this.selectedUser = user;
    this.loadUserPermissions(user);
  }

  loadUserPermissions(user: UserInterface): void {
    const permissions = user.permissions || {};

    // Set global CRUD permissions
    this.permissionForm.patchValue({
      canView: permissions['canView'] || false,
      canCreate: permissions['canCreate'] || false,
      canUpdate: permissions['canUpdate'] || false,
      canDelete: permissions['canDelete'] || false,
    });

    // Set module permissions
    this.modules.forEach((module) => {
      // Module access checkbox
      const moduleControl = this.permissionForm.get(module.id);
      if (moduleControl) {
        moduleControl.setValue((permissions as any)[module.id] || false);
      }

      // Module action checkboxes
      if (module.actions) {
        module.actions.forEach((action) => {
          const actionKey = `${module.id}_${action.id}`;
          const actionControl = this.permissionForm.get(actionKey);
          if (actionControl) {
            const modulePerms = (permissions as any)[module.id];
            if (typeof modulePerms === 'object') {
              actionControl.setValue(modulePerms[action.id] || false);
            } else {
              actionControl.setValue(false);
            }
          }
        });
      }
    });
  }

  initializeForm(): void {
    // Add controls for each module
    this.modules.forEach((module) => {
      // Module access checkbox
      this.permissionForm.addControl(module.id, new FormControl(false));

      // Module action checkboxes
      if (module.actions) {
        module.actions.forEach((action) => {
          const controlName = `${module.id}_${action.id}`;
          this.permissionForm.addControl(controlName, new FormControl(false));
        });
      }
    });
  }

  toggleModule(module: ModulePermission): void {
    module.expanded = !module.expanded;
  }

  toggleAllModuleActions(module: ModulePermission, checked: boolean): void {
    if (!module.actions) return;

    module.actions.forEach((action) => {
      const controlName = `${module.id}_${action.id}`;
      this.permissionForm.get(controlName)?.setValue(checked);
    });
  }

  applyRoleTemplate(template: RoleTemplate): void {
    if (!this.selectedUser) {
      this.toast.error('Please select a user first');
      return;
    }

    const permissions = template.permissions;

    // Set global CRUD
    this.permissionForm.patchValue({
      canView: permissions.canView || false,
      canCreate: permissions.canCreate || false,
      canUpdate: permissions.canUpdate || false,
      canDelete: permissions.canDelete || false,
    });

    // Set module permissions
    Object.keys(permissions).forEach((key) => {
      const control = this.permissionForm.get(key);
      if (control) {
        control.setValue(permissions[key]);
      }
    });

    this.toast.success(`${template.name} template applied`);
  }

  savePermissions(): void {
    if (!this.selectedUser) {
      this.toast.error('Please select a user first');
      return;
    }

    this.isSaving = true;
    const formValues = this.permissionForm.value;

    // Build permissions object
    const permissions: any = {
      canView: formValues.canView,
      canCreate: formValues.canCreate,
      canUpdate: formValues.canUpdate,
      canDelete: formValues.canDelete,
    };

    // Add module permissions
    this.modules.forEach((module) => {
      const hasModuleAccess = formValues[module.id];

      if (module.actions && module.actions.length > 0) {
        // For modules with granular actions, create an object
        const modulePerms: any = {};
        let hasAnyAction = false;

        module.actions.forEach((action) => {
          const actionKey = `${module.id}_${action.id}`;
          const hasAction = formValues[actionKey] || false;
          modulePerms[action.id] = hasAction;
          if (hasAction) hasAnyAction = true;
        });

        // Store as object if has actions, otherwise as boolean
        permissions[module.id] =
          hasModuleAccess || hasAnyAction ? modulePerms : false;
      } else {
        // Simple boolean permission
        permissions[module.id] = hasModuleAccess;
      }
    });

    // Update user
    const updatedUser = {
      ...this.selectedUser,
      permissions,
    };

    this.authService.updateUser(this.selectedUser.id, updatedUser).subscribe(
      (response) => {
        this.toast.success('Permissions updated successfully');
        this.isSaving = false;

        // Update local user list
        const index = this.users.findIndex(
          (u) => u.id === this.selectedUser!.id,
        );
        if (index !== -1) {
          this.users[index] = { ...this.users[index], permissions };
        }
      },
      (error) => {
        this.toast.error('Failed to update permissions');
        this.isSaving = false;
        console.error('Error updating permissions:', error);
      },
    );
  }

  backToUserList(): void {
    this.hideUserList = false;
    this.selectedUser = null;
  }

  goBackToUsers(): void {
    this.router.navigate(['/users']);
  }

  get filteredUsers(): UserInterface[] {
    if (!this.searchTerm) return this.users;

    const term = this.searchTerm.toLowerCase();
    return this.users.filter(
      (user) =>
        user.fullName?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.role?.toLowerCase().includes(term),
    );
  }

  getUserRoleBadgeClass(role: string): string {
    const roleMap: { [key: string]: string } = {
      SUPER_ADMIN: 'bg-purple-100 text-purple-800',
      ADMIN: 'bg-blue-100 text-blue-800',
      SALES: 'bg-green-100 text-green-800',
      ACCOUNTANT: 'bg-yellow-100 text-yellow-800',
      INVENTORY_MANAGER: 'bg-orange-100 text-orange-800',
    };
    return roleMap[role?.toUpperCase()] || 'bg-gray-100 text-gray-800';
  }

  // Role template permission builders
  private getAdminPermissions(): any {
    return {
      canView: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
      dashboard: true,
      products: true,
      categories: true,
      inventory: true,
      suppliers: true,
      sales: true,
      credit_sales: true,
      customers: true,
      quotations: true,
      lpo: true,
      reports: true,
      users: true,
      setting: true,
    };
  }

  private getSalesPersonPermissions(): any {
    return {
      canView: true,
      canCreate: true,
      canUpdate: true,
      canDelete: false,
      dashboard: true,
      products: true,
      sales: true,
      credit_sales: true,
      customers: true,
      quotations: true,
      lpo: true,
    };
  }

  private getInventoryManagerPermissions(): any {
    return {
      canView: true,
      canCreate: true,
      canUpdate: true,
      canDelete: false,
      dashboard: true,
      products: true,
      categories: true,
      inventory: true,
      suppliers: true,
      reports: true,
    };
  }

  private getAccountantPermissions(): any {
    return {
      canView: true,
      canCreate: true,
      canUpdate: true,
      canDelete: false,
      dashboard: true,
      sales: true,
      credit_sales: true,
      customers: true,
      reports: true,
    };
  }
}
