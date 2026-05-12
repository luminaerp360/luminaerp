export interface Supplier {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  address: string | null;
  totalBills?: number;
  totalAmount?: number;
  totalPaid?: number;
  outstandingBalance?: number;
  unpaidBillsCount?: number;
  hasDebt?: boolean;
}

export interface BillSummary {
  id: number;
  billNumber: string;
  supplierId: number;
  supplierName: string;
  billDate: Date | string;
  dueDate: Date | string;
  netAmount: number;
  paidAmount: number;
  balanceAmount: number;
  daysOverdue?: number;
  status: BillStatus;
}

export enum BillStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export interface AgingBucket {
  amount: number;
  bills: BillSummary[];
}

export interface AgingAnalysis {
  aging: {
    CURRENT: AgingBucket;
    DAYS_1_30: AgingBucket;
    DAYS_31_60: AgingBucket;
    DAYS_61_90: AgingBucket;
    OVER_90: AgingBucket;
  };
  summary: {
    totalOutstanding: number;
    totalBills: number;
    totalSuppliers: number;
  };
}

export interface BillPayment {
  id: number;
  billId: number;
  billNumber: string;
  supplier: {
    id: number;
    name: string;
  };
  amount: number;
  paymentDate: Date | string;
  paymentMethod: PaymentMethod;
  referenceNumber: string | null;
  transactionCode: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: Date | string;
}

export interface BulkBillPaymentItem {
  billId: number;
  amount: number;
}

export interface BulkBillPaymentDto {
  billPayments: BulkBillPaymentItem[];
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  transactionCode?: string;
  notes?: string;
  createdBy: number;
}

export interface BulkPaymentResult {
  success: number;
  failed: number;
  results: Array<{
    billId: number;
    paymentId: number;
    amount: number;
    newBalance: number;
    status: BillStatus;
    supplier: string;
  }>;
  errors: Array<{
    billId: number;
    error: string;
  }>;
}

export interface PaymentHistoryFilter {
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
  paymentMethod?: PaymentMethod;
  supplierId?: number;
  page?: number;
  limit?: number;
}

export interface PaymentHistoryResponse {
  payments: BillPayment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalPayments: number;
    totalAmount: number;
  };
}

export enum PaymentMethod {
  CASH = 'CASH',
  MPESA = 'MPESA',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CREDIT = 'CREDIT',
}

export interface SupplierFilter {
  searchQuery?: string;
  showOnlyWithDebt?: boolean;
}

export interface PaymentMethodConfig {
  id: number;
  name: string;
  code: PaymentMethod;
  isActive: boolean;
  requiresReference: boolean;
  requiresTransactionCode: boolean;
}
