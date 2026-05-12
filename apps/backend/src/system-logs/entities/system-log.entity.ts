export enum LogAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  VIEW = 'VIEW',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
  PAYMENT = 'PAYMENT',
  TRANSFER = 'TRANSFER',
  PRINT = 'PRINT',
}

export enum LogModule {
  AUTH = 'AUTH',
  USERS = 'USERS',
  PRODUCTS = 'PRODUCTS',
  CATEGORIES = 'CATEGORIES',
  INVENTORY = 'INVENTORY',
  CUSTOMERS = 'CUSTOMERS',
  SUPPLIERS = 'SUPPLIERS',
  ORDERS = 'ORDERS',
  SALES = 'SALES',
  QUOTATIONS = 'QUOTATIONS',
  LPO = 'LPO',
  CREDIT_SALES = 'CREDIT_SALES',
  EXPENSES = 'EXPENSES',
  REPORTS = 'REPORTS',
  ACCOUNTS_PAYABLE = 'ACCOUNTS_PAYABLE',
  ACCOUNTS_RECEIVABLE = 'ACCOUNTS_RECEIVABLE',
  CHART_OF_ACCOUNTS = 'CHART_OF_ACCOUNTS',
  INVOICES = 'INVOICES',
  STOCK_TRANSFER = 'STOCK_TRANSFER',
  SETTINGS = 'SETTINGS',
  ORGANIZATION = 'ORGANIZATION',
}

export class SystemLog {
  id: number;
  organizationId: number;
  userId: number;
  action: LogAction;
  module: LogModule;
  description: string;
  entityType?: string;
  entityId?: number;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}
