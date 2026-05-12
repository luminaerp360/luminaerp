// Comprehensive Permission System Interfaces

// Base permission structure for modules
export interface ModulePermissions {
  view?: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
  export?: boolean;
  import?: boolean;
  approve?: boolean;
}

// Dashboard permissions
export interface DashboardPermissions {
  view: boolean;
  viewAll?: boolean;
  viewOwn?: boolean;
  viewAnalytics?: boolean;
}

// Products permissions
export interface ProductsPermissions extends ModulePermissions {
  manageCategories?: boolean;
  managePricing?: boolean;
  viewCost?: boolean;
}

// Inventory permissions
export interface InventoryPermissions extends ModulePermissions {
  addStock?: boolean;
  adjustStock?: boolean;
  transferStock?: boolean;
  viewMovements?: boolean;
  manageBatches?: boolean;
  manageSerialNumbers?: boolean;
  setReorderLevels?: boolean;
  viewCostPrice?: boolean;
  approveTransfers?: boolean;
}

// Sales permissions
export interface SalesPermissions extends ModulePermissions {
  viewAll?: boolean;
  viewOwn?: boolean;
  void?: boolean;
  applyDiscount?: boolean;
  maxDiscountPercent?: number;
  viewCost?: boolean;
  viewReports?: boolean;
}

// Invoices permissions
export interface InvoicesPermissions extends ModulePermissions {
  send?: boolean;
  viewAll?: boolean;
  viewOwn?: boolean;
  markPaid?: boolean;
  void?: boolean;
  generateReceipt?: boolean;
  manageRecurring?: boolean;
}

// Quotations permissions
export interface QuotationsPermissions extends ModulePermissions {
  viewAll?: boolean;
  viewOwn?: boolean;
  convertToOrder?: boolean;
  send?: boolean;
}

// LPO permissions
export interface LpoPermissions extends ModulePermissions {
  viewAll?: boolean;
  viewOwn?: boolean;
  convertToInvoice?: boolean;
}

// Customers permissions
export interface CustomersPermissions extends ModulePermissions {
  viewAll?: boolean;
  viewOwn?: boolean;
  manageCreditLimit?: boolean;
  viewTransactions?: boolean;
  viewPaymentHistory?: boolean;
  sendStatements?: boolean;
}

// Suppliers permissions
export interface SuppliersPermissions extends ModulePermissions {
  viewPaymentTerms?: boolean;
  managePaymentTerms?: boolean;
  viewTransactions?: boolean;
}

// Accounts Payable permissions
export interface AccountsPayablePermissions extends ModulePermissions {
  makePayment?: boolean;
  viewAll?: boolean;
  reconcile?: boolean;
  viewReports?: boolean;
}

// Accounts Receivable permissions
export interface AccountsReceivablePermissions extends ModulePermissions {
  recordPayment?: boolean;
  sendReminder?: boolean;
  viewAging?: boolean;
  writeOff?: boolean;
  reconcile?: boolean;
  viewReports?: boolean;
}

// Chart of Accounts permissions
export interface ChartOfAccountsPermissions extends ModulePermissions {
  viewBalances?: boolean;
}

// Expenses permissions
export interface ExpensesPermissions extends ModulePermissions {
  viewAll?: boolean;
  viewOwn?: boolean;
  reimburse?: boolean;
  viewReports?: boolean;
}

// Commission permissions
export interface CommissionPermissions {
  view: boolean;
  viewAll?: boolean;
  viewOwn?: boolean;
  calculate?: boolean;
  approve?: boolean;
  pay?: boolean;
  setRates?: boolean;
  viewReports?: boolean;
  export?: boolean;
}

// Stock Transfer permissions
export interface StockTransferPermissions extends ModulePermissions {
  receive?: boolean;
  cancel?: boolean;
  viewAll?: boolean;
  viewOwn?: boolean;
}

// Reports permissions
export interface ReportsPermissions {
  viewSales?: boolean;
  viewInventory?: boolean;
  viewFinancial?: boolean;
  viewProfit?: boolean;
  viewCashFlow?: boolean;
  viewAging?: boolean;
  viewCommission?: boolean;
  viewCustom?: boolean;
  export?: boolean;
  schedule?: boolean;
}

// Settings permissions
export interface SettingsPermissions {
  view: boolean;
  editOrganization?: boolean;
  editPaymentMethods?: boolean;
  editTax?: boolean;
  editCurrency?: boolean;
  editNumbering?: boolean;
  manageFiscalYear?: boolean;
  manageLocations?: boolean;
  manageDevices?: boolean;
  viewSubscription?: boolean;
  manageBackup?: boolean;
}

// Users permissions
export interface UsersPermissions extends ModulePermissions {
  managePermissions?: boolean;
  manageRoles?: boolean;
  resetPassword?: boolean;
  viewActivity?: boolean;
}

// System Logs permissions
export interface SystemLogsPermissions {
  view: boolean;
  viewAll?: boolean;
  viewOwn?: boolean;
  export?: boolean;
  delete?: boolean;
}

// Tickets permissions
export interface TicketsPermissions extends ModulePermissions {
  assign?: boolean;
  close?: boolean;
  viewAll?: boolean;
  viewOwn?: boolean;
  viewAssigned?: boolean;
}

// Notifications permissions
export interface NotificationsPermissions {
  view: boolean;
  send?: boolean;
  viewAll?: boolean;
  configure?: boolean;
}

// Complete User Permissions Interface
export interface UserPermissions {
  dashboard?: DashboardPermissions;
  products?: ProductsPermissions;
  inventory?: InventoryPermissions;
  sales?: SalesPermissions;
  invoices?: InvoicesPermissions;
  quotations?: QuotationsPermissions;
  lpo?: LpoPermissions;
  customers?: CustomersPermissions;
  suppliers?: SuppliersPermissions;
  accountsPayable?: AccountsPayablePermissions;
  accountsReceivable?: AccountsReceivablePermissions;
  chartOfAccounts?: ChartOfAccountsPermissions;
  expenses?: ExpensesPermissions;
  commission?: CommissionPermissions;
  stockTransfer?: StockTransferPermissions;
  reports?: ReportsPermissions;
  settings?: SettingsPermissions;
  users?: UsersPermissions;
  systemLogs?: SystemLogsPermissions;
  tickets?: TicketsPermissions;
  notifications?: NotificationsPermissions;
}

// Role definitions
export enum UserRole {
  SUPER_ADMIN = 'Super Admin',
  ADMIN = 'Admin',
  ACCOUNTANT = 'Accountant',
  SALES_MANAGER = 'Sales Manager',
  SALES_PERSON = 'Sales',
  INVENTORY_MANAGER = 'Inventory Manager',
  WAREHOUSE_STAFF = 'Warehouse Staff',
  CUSTOMER_SUPPORT = 'Customer Support',
  VIEWER = 'Viewer'
}

// Default permissions for each role
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  [UserRole.SUPER_ADMIN]: {
    // All permissions set to true - full access
    dashboard: { view: true, viewAll: true, viewOwn: true, viewAnalytics: true },
    products: { view: true, create: true, edit: true, delete: true, manageCategories: true, managePricing: true, viewCost: true, export: true, import: true },
    inventory: { view: true, create: true, edit: true, delete: true, addStock: true, adjustStock: true, transferStock: true, viewMovements: true, manageBatches: true, manageSerialNumbers: true, setReorderLevels: true, viewCostPrice: true, export: true, import: true, approveTransfers: true },
    sales: { view: true, create: true, edit: true, delete: true, viewAll: true, viewOwn: true, void: true, applyDiscount: true, maxDiscountPercent: 100, viewCost: true, export: true, viewReports: true },
    invoices: { view: true, create: true, edit: true, delete: true, send: true, viewAll: true, viewOwn: true, markPaid: true, void: true, export: true, generateReceipt: true, manageRecurring: true },
    quotations: { view: true, create: true, edit: true, delete: true, viewAll: true, viewOwn: true, approve: true, convertToOrder: true, send: true, export: true },
    lpo: { view: true, create: true, edit: true, delete: true, approve: true, convertToInvoice: true, viewAll: true, viewOwn: true, export: true },
    customers: { view: true, create: true, edit: true, delete: true, viewAll: true, viewOwn: true, manageCreditLimit: true, viewTransactions: true, viewPaymentHistory: true, export: true, import: true, sendStatements: true },
    suppliers: { view: true, create: true, edit: true, delete: true, viewPaymentTerms: true, managePaymentTerms: true, viewTransactions: true, export: true, import: true },
    accountsPayable: { view: true, create: true, edit: true, delete: true, makePayment: true, viewAll: true, approve: true, reconcile: true, export: true, viewReports: true },
    accountsReceivable: { view: true, create: true, recordPayment: true, sendReminder: true, viewAging: true, writeOff: true, reconcile: true, export: true, viewReports: true },
    chartOfAccounts: { view: true, create: true, edit: true, delete: true, viewBalances: true, export: true, import: true },
    expenses: { view: true, create: true, edit: true, delete: true, viewAll: true, viewOwn: true, approve: true, reimburse: true, export: true, viewReports: true },
    commission: { view: true, viewAll: true, viewOwn: true, calculate: true, approve: true, pay: true, setRates: true, viewReports: true, export: true },
    stockTransfer: { view: true, create: true, approve: true, receive: true, cancel: true, delete: true, viewAll: true, viewOwn: true, export: true },
    reports: { viewSales: true, viewInventory: true, viewFinancial: true, viewProfit: true, viewCashFlow: true, viewAging: true, viewCommission: true, viewCustom: true, export: true, schedule: true },
    settings: { view: true, editOrganization: true, editPaymentMethods: true, editTax: true, editCurrency: true, editNumbering: true, manageFiscalYear: true, manageLocations: true, manageDevices: true, viewSubscription: true, manageBackup: true },
    users: { view: true, create: true, edit: true, delete: true, managePermissions: true, manageRoles: true, resetPassword: true, viewActivity: true, export: true },
    systemLogs: { view: true, viewAll: true, viewOwn: true, export: true, delete: true },
    tickets: { view: true, create: true, edit: true, delete: true, assign: true, close: true, viewAll: true, viewOwn: true, viewAssigned: true, export: true },
    notifications: { view: true, send: true, viewAll: true, configure: true }
  },

  [UserRole.ADMIN]: {
    // Similar to Super Admin but with some restrictions
    dashboard: { view: true, viewAll: true, viewOwn: true, viewAnalytics: true },
    products: { view: true, create: true, edit: true, delete: true, manageCategories: true, managePricing: true, viewCost: true, export: true, import: true },
    inventory: { view: true, create: true, edit: true, delete: true, addStock: true, adjustStock: true, transferStock: true, viewMovements: true, manageBatches: true, manageSerialNumbers: true, setReorderLevels: true, viewCostPrice: true, export: true, import: true, approveTransfers: true },
    sales: { view: true, create: true, edit: true, void: true, viewAll: true, viewOwn: true, applyDiscount: true, maxDiscountPercent: 100, viewCost: true, export: true, viewReports: true },
    invoices: { view: true, create: true, edit: true, delete: true, send: true, viewAll: true, viewOwn: true, markPaid: true, void: true, export: true, generateReceipt: true, manageRecurring: true },
    quotations: { view: true, create: true, edit: true, delete: true, viewAll: true, approve: true, convertToOrder: true, send: true, export: true },
    lpo: { view: true, create: true, edit: true, delete: true, approve: true, convertToInvoice: true, viewAll: true, export: true },
    customers: { view: true, create: true, edit: true, delete: true, viewAll: true, manageCreditLimit: true, viewTransactions: true, viewPaymentHistory: true, export: true, import: true, sendStatements: true },
    suppliers: { view: true, create: true, edit: true, delete: true, viewPaymentTerms: true, managePaymentTerms: true, viewTransactions: true, export: true, import: true },
    accountsPayable: { view: true, create: true, edit: true, delete: true, makePayment: true, viewAll: true, approve: true, reconcile: true, export: true, viewReports: true },
    accountsReceivable: { view: true, create: true, recordPayment: true, sendReminder: true, viewAging: true, writeOff: true, reconcile: true, export: true, viewReports: true },
    chartOfAccounts: { view: true, create: true, edit: true, viewBalances: true, export: true },
    expenses: { view: true, create: true, edit: true, delete: true, viewAll: true, approve: true, reimburse: true, export: true, viewReports: true },
    commission: { view: true, viewAll: true, calculate: true, approve: true, pay: true, setRates: true, viewReports: true, export: true },
    stockTransfer: { view: true, create: true, approve: true, receive: true, cancel: true, viewAll: true, export: true },
    reports: { viewSales: true, viewInventory: true, viewFinancial: true, viewProfit: true, viewCashFlow: true, viewAging: true, viewCommission: true, viewCustom: true, export: true, schedule: true },
    settings: { view: true, editOrganization: true, editPaymentMethods: true, editTax: true, editCurrency: true, editNumbering: true, manageFiscalYear: true, manageLocations: true, manageDevices: true, viewSubscription: true },
    users: { view: true, create: true, edit: true, delete: true, managePermissions: true, manageRoles: true, resetPassword: true, viewActivity: true, export: true },
    systemLogs: { view: true, viewAll: true, export: true },
    tickets: { view: true, create: true, edit: true, assign: true, close: true, viewAll: true, export: true },
    notifications: { view: true, send: true, viewAll: true, configure: true }
  },

  [UserRole.ACCOUNTANT]: {
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
  },

  [UserRole.SALES_MANAGER]: {
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
  },

  [UserRole.SALES_PERSON]: {
    dashboard: { view: true, viewOwn: true },
    products: { view: true },
    inventory: { view: true },
    sales: { view: true, create: true, edit: true, viewOwn: true, applyDiscount: true, maxDiscountPercent: 10 },
    invoices: { view: true, create: true, edit: true, send: true, viewOwn: true, generateReceipt: true },
    quotations: { view: true, create: true, edit: true, viewOwn: true, send: true },
    lpo: { view: true, create: true, edit: true, viewOwn: true },
    customers: { view: true, create: true, edit: true, viewOwn: true, viewTransactions: true },
    commission: { viewOwn: true }
  },

  [UserRole.INVENTORY_MANAGER]: {
    dashboard: { view: true },
    products: { view: true, create: true, edit: true, manageCategories: true, managePricing: true, viewCost: true, export: true, import: true },
    inventory: { view: true, addStock: true, adjustStock: true, transferStock: true, viewMovements: true, manageBatches: true, manageSerialNumbers: true, setReorderLevels: true, viewCostPrice: true, export: true, import: true },
    stockTransfer: { view: true, create: true, approve: true, receive: true, viewAll: true, export: true },
    suppliers: { view: true, create: true, edit: true, viewTransactions: true, export: true },
    reports: { viewInventory: true, export: true }
  },

  [UserRole.WAREHOUSE_STAFF]: {
    products: { view: true },
    inventory: { view: true, addStock: true, transferStock: true, manageBatches: true },
    stockTransfer: { view: true, create: true, receive: true, viewOwn: true }
  },

  [UserRole.CUSTOMER_SUPPORT]: {
    dashboard: { view: true },
    customers: { view: true, viewAll: true, viewTransactions: true },
    sales: { view: true, viewAll: true },
    invoices: { view: true, viewAll: true, send: true },
    tickets: { view: true, create: true, edit: true, assign: true, close: true, viewAll: true, export: true }
  },

  [UserRole.VIEWER]: {
    dashboard: { view: true, viewOwn: true },
    products: { view: true },
    inventory: { view: true },
    sales: { view: true, viewOwn: true },
    customers: { view: true, viewOwn: true }
  }
};
