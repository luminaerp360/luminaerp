// receivable.interface.ts
import { PaymentMethod } from './bill.interface';
export { PaymentMethod };
export interface Receivable {
  id: number;
  organizationId: number;
  customerId: number;
  customer: {
    id: number;
    name: string;
    phone: string;
  };
  receivableNumber: string;
  receivableDate: string;
  dueDate: string;
  description?: string;
  totalAmount: number;
  taxAmount: number;
  discountAmount: number;
  netAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: ReceivableStatus;
  referenceNumber?: string;
  notes?: string;
  createdBy: number;
  approvedBy?: number;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  payments?: ReceivablePayment[];
}

export enum ReceivableStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export interface ReceivablePayment {
  id: number;
  organizationId: number;
  receivableId: number;
  receivable?: Receivable;
  paymentDate: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  transactionCode?: string;
  notes?: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReceivableCreateUpdate {
  customerId: number;
  receivableNumber: string;
  receivableDate: string;
  dueDate: string;
  description?: string;
  totalAmount: number;
  taxAmount?: number;
  discountAmount?: number;
  referenceNumber?: string;
  notes?: string;
  createdBy: number;
}

export interface ReceivablePaymentCreate {
  receivableId: number;
  paymentDate: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  transactionCode?: string;
  notes?: string;
  createdBy: number;
}

export interface ReceivablesResponse {
  receivables: Receivable[];
  summary: ReceivablesSummary;
}

export interface ReceivablesSummary {
  totalReceivables: number;
  totalAmount: number;
  totalReceived: number;
  totalBalance: number;
  draftCount: number;
  approvedCount: number;
  paidCount: number;
  partiallyPaidCount: number;
  overdueCount: number;
}

export interface ReceivablePaymentsResponse {
  payments: ReceivablePayment[];
  total: number;
  page: number;
  limit: number;
}

export interface AgingReport {
  current: number;
  days1_30: number;
  days31_60: number;
  days61_90: number;
  days91_plus: number;
  total: number;
}