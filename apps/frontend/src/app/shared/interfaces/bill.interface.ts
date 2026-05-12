// bill.interface.ts
export interface Bill {
  id: number;
  organizationId: number;
  supplierId: number;
  supplier: {
    id: number;
    name: string;
    phone: string;
  };
  billNumber: string;
  billDate: string;
  dueDate: string;
  description?: string;
  totalAmount: number;
  taxAmount: number;
  discountAmount: number;
  netAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: BillStatus;
  referenceNumber?: string;
  notes?: string;
  createdBy: number;
  approvedBy?: number;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  payments?: BillPayment[];
}

export enum BillStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export interface BillPayment {
  id: number;
  organizationId: number;
  billId: number;
  bill?: Bill;
  paymentDate: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  transactionCode?: string;
  notes?: string;
  status: BillPaymentStatus;
  createdBy: number;
  processedBy?: number;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export enum BillPaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  MPESA = 'MPESA',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CREDIT = 'CREDIT',
}

export interface BillCreateUpdate extends Omit<Bill, 'id' | 'createdAt' | 'updatedAt' | 'paidAmount' | 'balanceAmount' | 'payments' | 'approvedBy' | 'approvedAt' | 'supplier'> {}

export interface BillPaymentCreate extends Omit<BillPayment, 'id' | 'createdAt' | 'updatedAt' | 'processedBy' | 'processedAt' | 'status'> {}

export interface BillsSummary {
  totalBills: number;
  totalAmount: number;
  totalPaid: number;
  totalBalance: number;
  draftCount: number;
  approvedCount: number;
  paidCount: number;
  partiallyPaidCount: number;
  overdueCount: number;
}

export interface BillsResponse {
  bills: Bill[];
  summary: BillsSummary;
}

export interface AgingReport {
  current: Bill[]; // 0-30 days
  thirtyDays: Bill[]; // 31-60 days
  sixtyDays: Bill[]; // 61-90 days
  ninetyDays: Bill[]; // 91+ days
}