# Comprehensive Permission System for Lumina ERP

## Overview
This document defines a granular, role-based permission system for Lumina ERP with detailed access control across all modules.

## Permission Structure

Permissions are organized in a hierarchical structure with module-level and action-level granularity.

### Permission Format
```typescript
{
  "module_name": {
    "view": boolean,      // Can view the module
    "create": boolean,    // Can create new records
    "edit": boolean,      // Can edit existing records
    "delete": boolean,    // Can delete records
    "export": boolean,    // Can export data
    "import": boolean,    // Can import data
    "approve": boolean    // Can approve records (where applicable)
  }
}
```

---

## Module Permissions

### 1. **Dashboard Module**
```typescript
dashboard: {
  view: boolean,           // Access to dashboard
  viewAll: boolean,        // View all organization data
  viewOwn: boolean,        // View only own data
  viewAnalytics: boolean   // Access to analytics/reports
}
```

**Roles:**
- Admin: All permissions
- Sales: view, viewOwn
- Accountant: view, viewAll, viewAnalytics
- Viewer: view, viewOwn

---

### 2. **Products Module**
```typescript
products: {
  view: boolean,           // View products
  create: boolean,         // Create new products
  edit: boolean,           // Edit product details
  delete: boolean,         // Delete products
  manageCategories: boolean, // Manage product categories
  managePricing: boolean,   // Update product prices
  viewCost: boolean,       // View cost prices (sensitive)
  export: boolean,         // Export product list
  import: boolean          // Import products via CSV/Excel
}
```

**Roles:**
- Admin: All permissions
- Inventory Manager: All except delete
- Sales: view, viewCost
- Accountant: view, viewCost, export

---

### 3. **Inventory Module**
```typescript
inventory: {
  view: boolean,           // View inventory
  addStock: boolean,       // Add new stock
  adjustStock: boolean,    // Make stock adjustments
  transferStock: boolean,  // Transfer between locations
  viewMovements: boolean,  // View stock movements
  manageBatches: boolean,  // Manage batch tracking
  manageSerialNumbers: boolean, // Manage serial numbers
  setReorderLevels: boolean, // Set reorder rules
  viewCostPrice: boolean,  // View cost prices
  export: boolean,         // Export inventory data
  import: boolean,         // Import inventory
  approveTransfers: boolean // Approve stock transfers
}
```

**Roles:**
- Admin: All permissions
- Inventory Manager: All except approveTransfers
- Sales: view, viewMovements
- Warehouse Staff: addStock, transferStock, manageBatches

---

### 4. **Sales Module**
```typescript
sales: {
  view: boolean,           // View sales
  create: boolean,         // Create new sales
  edit: boolean,           // Edit sales (before finalization)
  void: boolean,           // Void sales
  viewAll: boolean,        // View all sales
  viewOwn: boolean,        // View only own sales
  applyDiscount: boolean,  // Apply discounts
  maxDiscountPercent: number, // Maximum discount percentage
  viewCost: boolean,       // View cost/profit margins
  export: boolean,         // Export sales data
  viewReports: boolean     // Access sales reports
}
```

**Roles:**
- Admin: All permissions, maxDiscountPercent: 100
- Sales Manager: All except void, maxDiscountPercent: 30
- Sales Person: create, edit, viewOwn, applyDiscount (maxDiscountPercent: 10)
- Accountant: view, viewAll, viewCost, export, viewReports

---

### 5. **Invoices Module**
```typescript
invoices: {
  view: boolean,           // View invoices
  create: boolean,         // Create invoices
  edit: boolean,           // Edit invoices
  delete: boolean,         // Delete invoices
  send: boolean,           // Send invoices to customers
  viewAll: boolean,        // View all invoices
  viewOwn: boolean,        // View only own invoices
  markPaid: boolean,       // Mark as paid
  void: boolean,           // Void invoices
  export: boolean,         // Export invoices
  generateReceipt: boolean, // Generate receipts
  manageRecurring: boolean // Manage recurring invoices
}
```

**Roles:**
- Admin: All permissions
- Sales: create, edit, send, viewOwn, generateReceipt
- Accountant: view, viewAll, markPaid, export, manageRecurring

---

### 6. **Quotations Module**
```typescript
quotations: {
  view: boolean,           // View quotations
  create: boolean,         // Create quotations
  edit: boolean,           // Edit quotations
  delete: boolean,         // Delete quotations
  viewAll: boolean,        // View all quotations
  viewOwn: boolean,        // View only own quotations
  approve: boolean,        // Approve quotations
  convertToOrder: boolean, // Convert to sales order
  send: boolean,           // Send to customers
  export: boolean          // Export quotations
}
```

**Roles:**
- Admin: All permissions
- Sales Manager: All permissions
- Sales Person: create, edit, viewOwn, send
- Accountant: view, viewAll, export

---

### 7. **LPO (Local Purchase Orders) Module**
```typescript
lpo: {
  view: boolean,           // View LPOs
  create: boolean,         // Create LPOs
  edit: boolean,           // Edit LPOs
  delete: boolean,         // Delete LPOs
  approve: boolean,        // Approve LPOs
  convertToInvoice: boolean, // Convert to invoice
  viewAll: boolean,        // View all LPOs
  viewOwn: boolean,        // View only own LPOs
  export: boolean          // Export LPOs
}
```

**Roles:**
- Admin: All permissions
- Procurement: create, edit, viewAll
- Sales: create, edit, viewOwn
- Accountant: view, viewAll, approve, export

---

### 8. **Customers Module**
```typescript
customers: {
  view: boolean,           // View customers
  create: boolean,         // Create customers
  edit: boolean,           // Edit customer details
  delete: boolean,         // Delete customers
  viewAll: boolean,        // View all customers
  viewOwn: boolean,        // View only own customers
  manageCreditLimit: boolean, // Set credit limits
  viewTransactions: boolean, // View customer transactions
  viewPaymentHistory: boolean, // View payment history
  export: boolean,         // Export customer data
  import: boolean,         // Import customers
  sendStatements: boolean  // Send account statements
}
```

**Roles:**
- Admin: All permissions
- Sales: view, create, edit, viewOwn, viewTransactions
- Accountant: All except delete, import

---

### 9. **Suppliers Module**
```typescript
suppliers: {
  view: boolean,           // View suppliers
  create: boolean,         // Create suppliers
  edit: boolean,           // Edit supplier details
  delete: boolean,         // Delete suppliers
  viewPaymentTerms: boolean, // View payment terms
  managePaymentTerms: boolean, // Edit payment terms
  viewTransactions: boolean, // View supplier transactions
  export: boolean,         // Export supplier data
  import: boolean          // Import suppliers
}
```

**Roles:**
- Admin: All permissions
- Procurement: All except delete
- Accountant: view, viewPaymentTerms, viewTransactions, export

---

### 10. **Accounts Payable Module**
```typescript
accountsPayable: {
  view: boolean,           // View payables
  create: boolean,         // Create bills
  edit: boolean,           // Edit bills
  delete: boolean,         // Delete bills
  makePayment: boolean,    // Record payments
  viewAll: boolean,        // View all payables
  approve: boolean,        // Approve payments
  reconcile: boolean,      // Reconcile accounts
  export: boolean,         // Export payables
  viewReports: boolean     // Access payables reports
}
```

**Roles:**
- Admin: All permissions
- Accountant: All permissions
- Accounts Clerk: view, create, edit, makePayment

---

### 11. **Accounts Receivable Module**
```typescript
accountsReceivable: {
  view: boolean,           // View receivables
  create: boolean,         // Create receivables
  recordPayment: boolean,  // Record payments
  sendReminder: boolean,   // Send payment reminders
  viewAging: boolean,      // View aging reports
  writeOff: boolean,       // Write off bad debts
  reconcile: boolean,      // Reconcile accounts
  export: boolean,         // Export receivables
  viewReports: boolean     // Access receivables reports
}
```

**Roles:**
- Admin: All permissions
- Accountant: All permissions
- Accounts Clerk: view, recordPayment, sendReminder

---

### 12. **Chart of Accounts Module**
```typescript
chartOfAccounts: {
  view: boolean,           // View COA
  create: boolean,         // Create accounts
  edit: boolean,           // Edit accounts
  delete: boolean,         // Delete accounts (with restrictions)
  viewBalances: boolean,   // View account balances
  export: boolean,         // Export COA
  import: boolean          // Import COA
}
```

**Roles:**
- Admin: All permissions
- Accountant: All permissions
- Accounts Clerk: view, viewBalances

---

### 13. **Expenses Module**
```typescript
expenses: {
  view: boolean,           // View expenses
  create: boolean,         // Create expenses
  edit: boolean,           // Edit expenses
  delete: boolean,         // Delete expenses
  viewAll: boolean,        // View all expenses
  viewOwn: boolean,        // View only own expenses
  approve: boolean,        // Approve expenses
  reimburse: boolean,      // Process reimbursements
  export: boolean,         // Export expenses
  viewReports: boolean     // Access expense reports
}
```

**Roles:**
- Admin: All permissions
- Manager: All except delete
- Employee: create, edit, viewOwn
- Accountant: view, viewAll, approve, reimburse, export, viewReports

---

### 14. **Commission Module**
```typescript
commission: {
  view: boolean,           // View commissions
  viewAll: boolean,        // View all commissions
  viewOwn: boolean,        // View only own commission
  calculate: boolean,      // Calculate commissions
  approve: boolean,        // Approve commission payments
  pay: boolean,            // Process commission payments
  setRates: boolean,       // Set commission rates
  viewReports: boolean,    // Access commission reports
  export: boolean          // Export commission data
}
```

**Roles:**
- Admin: All permissions
- Accountant: All except setRates
- Sales Manager: view, viewAll, viewReports
- Sales Person: viewOwn

---

### 15. **Stock Transfer Module**
```typescript
stockTransfer: {
  view: boolean,           // View transfers
  create: boolean,         // Create transfers
  approve: boolean,        // Approve transfers
  receive: boolean,        // Receive transfers
  cancel: boolean,         // Cancel transfers
  viewAll: boolean,        // View all transfers
  viewOwn: boolean,        // View only own transfers
  export: boolean          // Export transfer data
}
```

**Roles:**
- Admin: All permissions
- Inventory Manager: All permissions
- Warehouse Staff: create, receive, viewOwn

---

### 16. **Reports Module**
```typescript
reports: {
  viewSales: boolean,      // Sales reports
  viewInventory: boolean,  // Inventory reports
  viewFinancial: boolean,  // Financial reports
  viewProfit: boolean,     // Profit/loss reports
  viewCashFlow: boolean,   // Cash flow reports
  viewAging: boolean,      // Aging reports
  viewCommission: boolean, // Commission reports
  viewCustom: boolean,     // Custom reports
  export: boolean,         // Export reports
  schedule: boolean        // Schedule automated reports
}
```

**Roles:**
- Admin: All permissions
- Accountant: All permissions
- Sales Manager: viewSales, viewCommission, export
- Inventory Manager: viewInventory, export

---

### 17. **Settings Module**
```typescript
settings: {
  view: boolean,           // View settings
  editOrganization: boolean, // Edit org details
  editPaymentMethods: boolean, // Manage payment methods
  editTax: boolean,        // Tax settings
  editCurrency: boolean,   // Currency settings
  editNumbering: boolean,  // Invoice/order numbering
  manageFiscalYear: boolean, // Fiscal year settings
  manageLocations: boolean, // Manage locations
  manageDevices: boolean,  // Manage devices
  viewSubscription: boolean, // View subscription details
  manageBackup: boolean    // Backup/restore settings
}
```

**Roles:**
- Admin: All permissions
- Accountant: view, editTax, viewSubscription

---

### 18. **Users Module**
```typescript
users: {
  view: boolean,           // View users
  create: boolean,         // Create users
  edit: boolean,           // Edit users
  delete: boolean,         // Delete users (deactivate)
  managePermissions: boolean, // Manage user permissions
  manageRoles: boolean,    // Manage roles
  resetPassword: boolean,  // Reset passwords
  viewActivity: boolean,   // View user activity logs
  export: boolean          // Export user data
}
```

**Roles:**
- Admin: All permissions
- HR/Manager: view, create, edit, resetPassword

---

### 19. **System Logs Module**
```typescript
systemLogs: {
  view: boolean,           // View system logs
  viewAll: boolean,        // View all logs
  viewOwn: boolean,        // View only own activity
  export: boolean,         // Export logs
  delete: boolean          // Delete logs (admin only)
}
```

**Roles:**
- Admin: All permissions
- Auditor: view, viewAll, export

---

### 20. **Tickets Module**
```typescript
tickets: {
  view: boolean,           // View tickets
  create: boolean,         // Create tickets
  edit: boolean,           // Edit tickets
  assign: boolean,         // Assign tickets
  close: boolean,          // Close tickets
  viewAll: boolean,        // View all tickets
  viewOwn: boolean,        // View only own tickets
  viewAssigned: boolean,   // View assigned tickets
  export: boolean          // Export tickets
}
```

**Roles:**
- Admin: All permissions
- Support: view, viewAll, edit, assign, close
- Employee: create, viewOwn

---

### 21. **Notifications Module**
```typescript
notifications: {
  view: boolean,           // View notifications
  send: boolean,           // Send notifications
  viewAll: boolean,        // View all notifications
  configure: boolean       // Configure notification settings
}
```

**Roles:**
- Admin: All permissions
- Manager: view, send, viewAll

---

## Predefined Roles with Default Permissions

### 1. **Super Admin**
Full access to everything - all permissions set to `true`

### 2. **Admin**
Almost full access, with some restrictions on critical operations

### 3. **Accountant**
```typescript
{
  dashboard: { view: true, viewAll: true, viewAnalytics: true },
  products: { view: true, viewCost: true, export: true },
  inventory: { view: true, viewMovements: true, viewCostPrice: true, export: true },
  sales: { view: true, viewAll: true, viewCost: true, export: true, viewReports: true },
  invoices: { view: true, viewAll: true, markPaid: true, export: true, manageRecurring: true },
  quotations: { view: true, viewAll: true, export: true },
  lpo: { view: true, viewAll: true, approve: true, export: true },
  customers: { view: true, viewAll: true, manageCreditLimit: true, viewTransactions: true, viewPaymentHistory: true, export: true, sendStatements: true },
  suppliers: { view: true, viewPaymentTerms: true, viewTransactions: true, export: true },
  accountsPayable: { view: true, create: true, edit: true, makePayment: true, viewAll: true, approve: true, reconcile: true, export: true, viewReports: true },
  accountsReceivable: { view: true, create: true, recordPayment: true, sendReminder: true, viewAging: true, reconcile: true, export: true, viewReports: true },
  chartOfAccounts: { view: true, create: true, edit: true, viewBalances: true, export: true },
  expenses: { view: true, viewAll: true, approve: true, reimburse: true, export: true, viewReports: true },
  commission: { view: true, viewAll: true, calculate: true, approve: true, pay: true, viewReports: true, export: true },
  reports: { viewSales: true, viewInventory: true, viewFinancial: true, viewProfit: true, viewCashFlow: true, viewAging: true, viewCommission: true, export: true },
  settings: { view: true, editTax: true, viewSubscription: true },
  systemLogs: { view: true, viewAll: true, export: true }
}
```

### 4. **Sales Manager**
```typescript
{
  dashboard: { view: true, viewAll: true },
  products: { view: true },
  inventory: { view: true, viewMovements: true },
  sales: { view: true, create: true, edit: true, viewAll: true, applyDiscount: true, maxDiscountPercent: 30, export: true, viewReports: true },
  invoices: { view: true, create: true, edit: true, send: true, viewAll: true, export: true, generateReceipt: true },
  quotations: { view: true, create: true, edit: true, delete: true, viewAll: true, approve: true, convertToOrder: true, send: true, export: true },
  lpo: { view: true, viewAll: true, export: true },
  customers: { view: true, create: true, edit: true, viewAll: true, viewTransactions: true, export: true },
  commission: { view: true, viewAll: true, viewReports: true },
  reports: { viewSales: true, viewCommission: true, export: true }
}
```

### 5. **Sales Person**
```typescript
{
  dashboard: { view: true, viewOwn: true },
  products: { view: true },
  inventory: { view: true },
  sales: { view: true, create: true, edit: true, viewOwn: true, applyDiscount: true, maxDiscountPercent: 10 },
  invoices: { view: true, create: true, edit: true, send: true, viewOwn: true, generateReceipt: true },
  quotations: { view: true, create: true, edit: true, viewOwn: true, send: true },
  lpo: { view: true, create: true, edit: true, viewOwn: true },
  customers: { view: true, create: true, edit: true, viewOwn: true, viewTransactions: true },
  commission: { viewOwn: true }
}
```

### 6. **Inventory Manager**
```typescript
{
  dashboard: { view: true },
  products: { view: true, create: true, edit: true, manageCategories: true, managePricing: true, viewCost: true, export: true, import: true },
  inventory: { view: true, addStock: true, adjustStock: true, transferStock: true, viewMovements: true, manageBatches: true, manageSerialNumbers: true, setReorderLevels: true, viewCostPrice: true, export: true, import: true },
  stockTransfer: { view: true, create: true, approve: true, receive: true, viewAll: true, export: true },
  suppliers: { view: true, create: true, edit: true, viewTransactions: true, export: true },
  reports: { viewInventory: true, export: true }
}
```

### 7. **Warehouse Staff**
```typescript
{
  products: { view: true },
  inventory: { view: true, addStock: true, transferStock: true, manageBatches: true },
  stockTransfer: { view: true, create: true, receive: true, viewOwn: true }
}
```

### 8. **Customer Support**
```typescript
{
  dashboard: { view: true },
  customers: { view: true, viewAll: true, viewTransactions: true },
  sales: { view: true, viewAll: true },
  invoices: { view: true, viewAll: true, send: true },
  tickets: { view: true, create: true, edit: true, assign: true, close: true, viewAll: true, export: true }
}
```

---

## Implementation Notes

1. **Database Schema**: Permissions stored as JSON in `User` and `UserOrganizationAccess` tables
2. **Frontend Guard**: Enhanced `PermissionGuard` checks specific permissions
3. **Backend Decorators**: Create custom decorators for granular permission checks
4. **UI Component**: Permission management interface for admins
5. **Audit Trail**: Log all permission changes in `SystemLog`

---

## Migration Strategy

1. Create migration script to convert existing simple permissions to new structure
2. Assign default role-based permissions to existing users
3. Add UI for custom permission management
4. Update all route guards and API endpoints
5. Test thoroughly before production deployment

---

**Last Updated**: February 2026
**Version**: 2.0.0
