// expense.interface.ts

export enum ExpenseType {
  ONE_TIME = 'ONE_TIME',
  RECURRING = 'RECURRING',
}

export enum ExpenseStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAID = 'PAID',
}

export enum RecurrenceFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

export interface ExpenseAttachment {
  fileName: string;
  fileUrl: string;
  fileType?: string;
  fileSize?: number;
}

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number;
  startDate: string;
  endDate?: string;
  occurrences?: number;
}

export interface Expense {
  id?: number;
  title: string;
  amount: number;
  description: string;
  category: string;
  paidBy: string;
  paymentMethod: 'CASH' | 'MPESA' | 'BANK_TRANSFER' | 'CREDIT';
  receiptUrl?: string;
  createdBy: number;
  status?: string;
  expenseType?: string;
  paymentReference?: string;
  expenseDate?: string | Date;
  paidAmount?: number;
  transactionCode?: string;
  chartOfAccountId?: number;
  chartOfAccount?: {
    id: number;
    accountCode: string;
    accountName: string;
    accountType: string;
    accountCategory: string;
  };

  // New modern fields
  vendor?: string;
  invoiceNumber?: string;
  dueDate?: string | Date;
  isRecurring?: boolean;
  recurrenceRule?: RecurrenceRule;
  attachments?: ExpenseAttachment[];
  tags?: string[];
  notes?: string;
  projectId?: number;
  departmentId?: number;
  isBillable?: boolean;
  isReimbursable?: boolean;
  taxRate?: number;
  taxAmount?: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export interface ExpenseCreateUpdate extends Omit<
  Expense,
  'id' | 'createdAt' | 'updatedAt' | 'chartOfAccount'
> {}

export interface ExpenseSummary {
  totalExpenses: number;
  totalAmount: number;
  totalPaid: number;
  outstanding: number;
  byCategory: Record<string, { count: number; total: number }>;
  byPaymentMethod: Record<string, { count: number; total: number }>;
  byStatus: Record<string, number>;
  dateRange?: {
    from: string;
    to: string;
  };
}

export interface ExpenseAnalytics {
  totalExpenses: number;
  totalAmount: number;
  totalPaid: number;
  averageExpense: number;
  byCategory: Record<string, { count: number; total: number }>;
  byPaymentMethod: Record<string, { count: number; total: number }>;
  byStatus: Record<string, { count: number; total: number }>;
  byMonth: Record<string, { count: number; total: number }>;
  topExpenses: Array<{
    id: number;
    title: string;
    amount: number;
    category: string;
    date: Date;
  }>;
  statusBreakdown: {
    approved: number;
    pending: number;
    rejected: number;
    draft: number;
  };
}

export interface CategoryBudget {
  category: string;
  spent: number;
  budgetLimit: number;
  percentage: number;
}
