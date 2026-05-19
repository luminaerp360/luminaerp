// Modern Invoice Interface
export enum InvoiceType {
  CREDIT_SALE = 'CREDIT_SALE',
  STANDARD_INVOICE = 'STANDARD_INVOICE',
  PROFORMA_INVOICE = 'PROFORMA_INVOICE',
  RECURRING_INVOICE = 'RECURRING_INVOICE',
  QUOTE = 'QUOTE',
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  SENT = 'SENT',
  VIEWED = 'VIEWED',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export interface InvoiceItem {
  id?: number;
  invoiceId?: number;
  productId?: number;
  productName: string;
  description?: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountPercentage?: number;
  discountAmount: number;
  totalAmount: number;
  sortOrder?: number;
}

export interface InvoicePayment {
  id?: number;
  invoiceId?: number;
  amount: number;
  paymentMethod: 'CASH' | 'MPESA' | 'BANK_TRANSFER' | 'CREDIT';
  transactionCode?: string;
  paymentDate: string | Date;
  notes?: string;
  recordedBy: string;
  createdAt?: string | Date;
}

export interface Invoice {
  id?: number;
  organizationId?: number;

  // Invoice identification
  invoiceNumber: string;
  invoiceType: InvoiceType;
  referenceNumber?: string;

  // Customer information
  customerId: number;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerTaxId?: string;

  // Dates
  issueDate: string | Date;
  dueDate: string | Date;
  orderDate?: string | Date;

  // Financial details
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;

  // Payment information
  paymentTerms: string;
  paymentTermsDays: number;
  lateFeePercentage: number;
  lateFeeAmount: number;

  // Status and tracking
  status: InvoiceStatus;
  fullyPaid: boolean;
  sentAt?: string | Date;
  viewedAt?: string | Date;
  paidAt?: string | Date;

  // Tax compliance
  taxRate: number;
  taxType?: string;
  organizationTaxId?: string;

  // Content
  items?: InvoiceItem[];
  payments?: InvoicePayment[];
  notes?: string;
  termsAndConditions?: string;
  footerText?: string;

  // Metadata
  createdBy: string;
  shiftId?: number;
  orderId?: number;

  // Digital features
  publicToken?: string;
  qrCodeData?: string;
  emailSent?: boolean;
  emailSentAt?: string | Date;

  // Timestamps
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CreateInvoiceDto {
  invoiceType?: InvoiceType;
  referenceNumber?: string;
  customerId: number;
  customerAddress?: string;
  customerTaxId?: string;
  items: Partial<InvoiceItem>[];
  issueDate?: string;
  orderDate?: string;
  paymentTerms?: string;
  paymentTermsDays?: number;
  lateFeePercentage?: number;
  taxRate?: number;
  taxType?: string;
  organizationTaxId?: string;
  notes?: string;
  termsAndConditions?: string;
  footerText?: string;
  createdBy: string;
  shiftId?: number;
  orderId?: number;
  discountAmount?: number;
  sendEmail?: boolean;
  salesPersonId?: number;
  commissionOverrides?: Array<{
    productId: number;
    enabled: boolean;
    commissionType?: string;
    commissionRate?: number;
    commissionAmount?: number;
  }>;
  status?: InvoiceStatus;
}

export interface RecordPaymentDto {
  amount: number;
  paymentMethod: 'CASH' | 'MPESA' | 'BANK_TRANSFER' | 'CREDIT';
  transactionCode?: string;
  paymentDate?: string;
  notes?: string;
  recordedBy: string;
  paymentMethodId?: number;
  paymentMethodCode?: string;
  paymentMethodName?: string;
}

export interface InvoiceFilters {
  customerId?: number;
  status?: InvoiceStatus;
  startDate?: string;
  endDate?: string;
  search?: string; // Search by invoice number or customer name
  invoiceNumber?: string; // Filter by specific invoice number
  customerName?: string; // Filter by customer name
  page?: number;
  limit?: number;
}

export interface InvoiceStats {
  totalInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  pendingInvoices: number;
  totalAmount: number;
  totalPaid: number;
  totalOverdue: number;
  totalOutstanding: number;
}

export interface InvoiceListResponse {
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
