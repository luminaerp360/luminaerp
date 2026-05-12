export enum LpoStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CONVERTED_TO_PURCHASE = 'CONVERTED_TO_PURCHASE',
  CANCELLED = 'CANCELLED',
}

export interface LpoInterface {
  id: number;
  organizationId?: number;
  referenceNumber: string;
  supplierId: number;
  items: any;
  totalAmount: number;
  subtotal?: number;
  taxAmount?: number;
  discountAmount?: number;
  shippingCost?: number;
  deliveryDate?: Date | string;
  paymentTerms?: string;
  shippingAddress?: string;
  notes?: string;
  priority?: string;
  created_by?: string;
  status: LpoStatus | string;

  // Approval tracking
  isApproved?: boolean;
  approvedBy?: number;
  approvedAt?: Date | string;
  approvalNotes?: string;

  // Purchase conversion tracking
  isPurchaseConverted?: boolean;
  purchaseConvertedBy?: number;
  purchaseConvertedAt?: Date | string;
  purchaseReference?: string;

  // Rejection tracking
  isRejected?: boolean;
  rejectedBy?: number;
  rejectedAt?: Date | string;
  rejectionReason?: string;

  createdAt?: Date | string;
  updatedAt?: Date | string;
  supplier?: any;
}

export interface ConvertToPurchaseItemDto {
  productId: number;
  expiryDate?: Date | string;
  manufactureDate?: Date | string;
  warehouseLocation?: string;
  notes?: string;
}

export interface ConvertToPurchaseDto {
  items: ConvertToPurchaseItemDto[];
  notes?: string;
}

export interface RejectLpoDto {
  rejectionReason: string;
}
