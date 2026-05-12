export interface BillItem {
  id?: number;
  billId?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  expenseAccountId?: number;
  expenseAccount?: {
    id: number;
    accountCode: string;
    accountName: string;
    accountType: string;
  };
  productId?: number;
  productName?: string;
  sku?: string;
  sortOrder: number;
  notes?: string;
}

export interface CreateBillItemDto {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discountAmount?: number;
  expenseAccountId?: number;
  productId?: number;
  productName?: string;
  sku?: string;
  sortOrder?: number;
  notes?: string;
}

export interface Bill {
  id: number;
  organizationId: number;
  supplierId: number;
  supplier: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
  };
  billNumber: string;
  billDate: string;
  dueDate: string;
  description?: string;
  subtotal: number;
  totalAmount: number;
  taxAmount: number;
  discountAmount: number;
  netAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: BillStatus;
  referenceNumber?: string;
  notes?: string;
  termsAndConditions?: string;
  items: BillItem[];
  payments?: any[];
  createdBy: number;
  approvedBy?: number;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBillDto {
  supplierId: number;
  billNumber: string;
  billDate: string;
  dueDate: string;
  description?: string;
  items: CreateBillItemDto[];
  taxAmount?: number;
  discountAmount?: number;
  referenceNumber?: string;
  notes?: string;
  termsAndConditions?: string;
  createdBy: number;
}

export enum BillStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export interface ExpenseAccount {
  id: number;
  accountCode: string;
  accountName: string;
  accountType: string;
  accountCategory: string;
  description?: string;
  isActive: boolean;
}
