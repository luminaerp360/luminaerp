export interface Customer {
  id: number;
  fullName: string;
  phoneNumber: string;
  email: string;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  issueDate: Date | string;
  dueDate: Date | string;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  status: string;
  fullyPaid: boolean;
  customerName: string;
  daysOverdue?: number;
  agingCategory?: AgingPeriod;
}

export interface InvoicePayment {
  id: number;
  amount: number;
  paymentDate: Date | string;
  paymentMethod: string;
  paymentMethodName: string;
  paymentMethodCode?: string;
  transactionCode: string;
  notes?: string;
  recordedBy?: string;
  invoice?: {
    id: number;
    invoiceNumber: string;
    totalAmount: number;
    balanceDue: number;
    amountPaid?: number;
    customer?: Customer;
  };
  paymentMethodConfig?: {
    id: number;
    name: string;
    code: string;
    displayName: string;
  };
}

export enum AgingPeriod {
  CURRENT = 'CURRENT',
  DAYS_31_60 = 'DAYS_31_60',
  DAYS_61_90 = 'DAYS_61_90',
  DAYS_91_120 = 'DAYS_91_120',
  OVER_120 = 'OVER_120',
}

export interface DebtorFilters {
  customerId?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
  agingPeriod?: AgingPeriod;
  page?: number;
  limit?: number;
}

export interface DebtorsResponse {
  invoices: Invoice[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface AgingCustomer {
  customerId: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  invoices: Invoice[];
  current: number;
  days31_60: number;
  days61_90: number;
  days91_120: number;
  over120: number;
  totalOutstanding: number;
}

export interface AgingAnalysisResponse {
  customers: AgingCustomer[];
  totals: {
    current: number;
    days31_60: number;
    days61_90: number;
    days91_120: number;
    over120: number;
    totalOutstanding: number;
  };
  summary: {
    totalCustomers: number;
    totalInvoices: number;
    current: number;
    days31_60: number;
    days61_90: number;
    days91_120: number;
    over120: number;
    totalOutstanding: number;
  };
}

export interface CustomerStatementFilters {
  customerId: number;
  startDate?: string;
  endDate?: string;
  format?: 'summary' | 'detailed';
}

export interface CustomerStatementResponse {
  customer: Customer;
  period: {
    startDate: Date | string;
    endDate: Date | string;
  };
  invoices: Invoice[];
  totals: {
    totalInvoiced: number;
    totalPaid: number;
    totalOutstanding: number;
    invoiceCount: number;
  };
  statusBreakdown: {
    paid: number;
    partiallyPaid: number;
    unpaid: number;
    overdue: number;
  };
}

export interface BulkPaymentItem {
  invoiceId: number;
  amount: number;
  notes?: string;
}

export interface RecordBulkPaymentDto {
  customerId: number;
  payments: BulkPaymentItem[];
  paymentMethodId?: number;
  paymentMethodCode: string;
  paymentMethodName: string;
  transactionCode?: string;
  paymentDate?: string;
  notes?: string;
  recordedBy: string;
}

export interface BulkPaymentResponse {
  success: boolean;
  payments: any[];
  summary: {
    totalAmount: number;
    invoiceCount: number;
    customer: {
      id: number;
      fullName: string;
    };
  };
}

export interface CustomerOutstandingResponse {
  customer: Customer;
  invoices: Invoice[];
  summary: {
    totalInvoices: number;
    totalOutstanding: number;
  };
}

export interface PaymentHistoryResponse {
  customer: Customer;
  payments: InvoicePayment[];
  summary: {
    totalPayments: number;
    totalPaid: number;
  };
}

export interface PaymentHistoryFilters {
  customerId?: number;
  invoiceId?: number;
  startDate?: string;
  endDate?: string;
  paymentMethodCode?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AllPaymentHistoryResponse {
  payments: InvoicePayment[];
  summary: {
    totalPayments: number;
    totalPaid: number;
    averagePayment: number;
    paymentMethods: Array<{
      code: string;
      name: string;
    }>;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface CustomerSummary {
  id: number;
  fullName: string;
  phoneNumber: string;
  email: string;
  dueCredit: number;
  walletBalance: number;
  totalInvoices: number;
  totalInvoiced: number;
  totalPaid: number;
  outstandingBalance: number;
  outstandingInvoices: number;
  hasOutstandingDebt: boolean;
}

export interface AllCustomersResponse {
  customers: CustomerSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// ============================
// CUSTOMER WALLET TYPES
// ============================

export enum WalletTransactionType {
  DEPOSIT = 'DEPOSIT',
  OVERPAYMENT = 'OVERPAYMENT',
  PAYMENT_APPLIED = 'PAYMENT_APPLIED',
  REFUND = 'REFUND',
  ADJUSTMENT = 'ADJUSTMENT',
}

export interface WalletTransaction {
  id: number;
  organizationId: number;
  customerId: number;
  type: WalletTransactionType;
  amount: number;
  balanceAfter: number;
  referenceType?: string;
  referenceId?: number;
  description: string;
  recordedBy: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CustomerWalletResponse {
  customer: Customer;
  walletBalance: number;
  outstandingDebt: number;
  summary: {
    totalDeposits: number;
    totalOverpayments: number;
    totalApplied: number;
    totalRefunds: number;
  };
  recentTransactions: WalletTransaction[];
}

export interface WalletTransactionsResponse {
  transactions: WalletTransaction[];
  walletBalance: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface WalletTransactionFilters {
  type?: WalletTransactionType;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface RecordCustomerDepositDto {
  customerId: number;
  amount: number;
  paymentMethodId?: number;
  paymentMethodCode: string;
  paymentMethodName: string;
  transactionCode?: string;
  paymentDate?: string;
  notes?: string;
  recordedBy: string;
}

export interface ApplyWalletToInvoicesDto {
  customerId: number;
  payments: WalletPaymentItem[];
  recordedBy: string;
  notes?: string;
}

export interface WalletPaymentItem {
  invoiceId: number;
  amount: number;
}

export interface ApplyWalletResponse {
  success: boolean;
  payments: any[];
  walletBalance: number;
  totalApplied: number;
  summary: {
    invoiceCount: number;
    totalApplied: number;
    remainingWalletBalance: number;
    customer: {
      id: number;
      fullName: string;
    };
  };
}

export interface DepositResponse {
  success: boolean;
  walletTransaction: WalletTransaction;
  newBalance: number;
  customer: {
    id: number;
    fullName: string;
  };
}

export interface RecordBulkPaymentWithWalletDto {
  customerId: number;
  payments: BulkPaymentItem[];
  totalAmount: number;
  paymentMethodId?: number;
  paymentMethodCode: string;
  paymentMethodName: string;
  transactionCode?: string;
  paymentDate?: string;
  notes?: string;
  recordedBy: string;
  useWalletBalance?: boolean;
}

export interface BulkPaymentWithWalletResponse {
  success: boolean;
  payments: any[];
  excessAmount: number;
  walletBalance: number;
  summary: {
    totalAmount: number;
    totalAppliedToInvoices: number;
    excessToWallet: number;
    walletBalance: number;
    invoiceCount: number;
    customer: {
      id: number;
      fullName: string;
    };
  };
}
