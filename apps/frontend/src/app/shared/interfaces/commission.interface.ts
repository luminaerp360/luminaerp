export enum CommissionType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

export enum CommissionStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export interface UserProductCommission {
  id: number;
  organizationId: number;
  userId: number;
  productId: number;
  commissionType: CommissionType;
  commissionValue: number;
  createdBy: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  product?: {
    id: number;
    name: string;
    price: number;
    defaultCommissionType?: string;
    defaultCommissionValue?: number;
  };
}

export interface CommissionRecord {
  id: number;
  organizationId: number;
  userId: number;
  sourceType: 'ORDER' | 'INVOICE';
  sourceId: number;
  orderId?: number;
  invoiceId?: number;
  productId: number;
  productName: string;
  quantitySold: number;
  unitPrice: number;
  totalSaleAmount: number;
  commissionType: string;
  commissionRate: number;
  commissionAmount: number;
  status: CommissionStatus;
  paidAt?: Date | string;
  paidBy?: string;
  paymentReference?: string;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  product?: {
    id: number;
    name: string;
    price: number;
  };
  order?: {
    id: number;
    receiptNumber: string;
    createdAt: Date | string;
  };
  invoice?: {
    id: number;
    invoiceNumber: string;
    createdAt: Date | string;
  };
}

export interface CommissionSummary {
  totalCommissions: number;
  pendingCommissions: number;
  paidCommissions: number;
}

export interface CommissionPayment {
  id: number;
  organizationId: number;
  batchNumber: string;
  userId: number;
  totalAmount: number;
  paymentMethod: string;
  paymentDate: Date | string;
  commissionIds: number[];
  paidBy: string;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  user?: {
    id: number;
    fullName: string;
    email: string;
  };
}

export interface CreateUserProductCommissionDto {
  userId: number;
  productId: number;
  commissionType: CommissionType;
  commissionValue: number;
}

export interface MarkCommissionPaidDto {
  commissionIds: number[];
  paymentMethod: string;
  paymentReference?: string;
  notes?: string;
}

export interface CommissionStats {
  totalCommissionsEarned: number;
  pendingCommissions: number;
  paidCommissions: number;
  totalRecords: number;
}

export interface CommissionUserSummary {
  userId: number;
  fullName: string;
  email: string;
  totalCommission: number;
  pendingCommission: number;
  paidCommission: number;
  cancelledCommission: number;
  totalSaleAmount: number;
  recordCount: number;
  records: CommissionRecord[];
}

export interface CommissionReportResponse {
  userSummaries: CommissionUserSummary[];
  totals: {
    grandTotalCommission: number;
    grandPendingCommission: number;
    grandPaidCommission: number;
    grandTotalSaleAmount: number;
    totalRecords: number;
    totalUsers: number;
  };
}
