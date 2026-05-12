export interface SaleItem {
  id: number;
  name: string;
  category_id: number;
  price: number;
  selectedItems: number;
  discount?: number;
  includesVat?: boolean;
}

export interface Customer {
  name: string;
  email: string;
}

export interface CommissionOverride {
  productId: number;
  enabled: boolean;
  commissionType?: string; // 'PERCENTAGE' | 'FIXED'
  commissionRate?: number;
  commissionAmount?: number;
}

export interface Sales {
  id?: number;
  items: any[];
  total: number;
  madeBy?: number;
  cashPaid: number;
  mpesaPaid: number;
  bankPaid: number;
  totalAmountPaid: number;
  taxAmount?: number;
  totalTax?: number;
  discountAmount?: number;
  totalDiscount?: number;
  customerId?: number;
  customerDetails?: Customer;
  customerEmail?: string;
  customer_name?: string;
  printerIp?: string;
  isVoided?: boolean;
  voidedBy?: any;
  createdAt?: Date;
  created_by?: string;
  salesPersonId?: number; // Who the sale belongs to (for commissions & sales reports)
  commissionOverrides?: CommissionOverride[]; // Custom commission settings for this sale
  mpesaTransactionId?: string;
  payments?: Array<{
    id: number;
    paymentMethodId?: number;
    paymentMethodCode: string;
    paymentMethodName: string;
    amount: number;
    transactionCode: string;
    paymentDate: string;
    recordedBy?: string;
  }>;
}

export interface RefundItem {
  id: number;
  quantity: number;
}

export interface RefundDto {
  orderId: number;
  refundItems: RefundItem[];
  totalRefund: number;
  refundPaymentMethod: string;
  refundedBy: string;
}
