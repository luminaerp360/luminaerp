export interface Department {
  id: number;
  name: string;
  description?: string;
  organizationId: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface StoreCategory {
  id: number;
  name: string;
  description?: string;
  organizationId: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface StoreProduct {
  id: number;
  productName: string;
  sku?: string;
  description?: string;
  storeCategoryId: number;
  departmentId: number;
  unitOfMeasurement: string;
  buyingPrice: number;
  quantity: number;
  reorderLevel: number;
  maxStock: number;
  location?: string;
  isActive: boolean;
  organizationId: number;
  storeCategory?: StoreCategory;
  department?: Department;
  _count?: {
    purchaseItems: number;
    requisitionItems: number;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

// === Store Purchase (Multi-Item) ===

export interface StorePurchaseItem {
  id: number;
  storePurchaseId: number;
  storeProductId: number;
  quantity: number;
  receivedQuantity: number;
  unitPrice: number;
  totalPrice: number;
  storeProduct?: StoreProduct;
  createdAt?: Date;
}

export type PurchaseStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELLED';

export interface StorePurchaseReceiveItem {
  id: number;
  storePurchaseReceiveId: number;
  storePurchaseItemId: number;
  receivedQuantity: number;
  storePurchaseItem?: StorePurchaseItem;
  createdAt?: Date;
}

export interface StorePurchaseReceive {
  id: number;
  storePurchaseId: number;
  grnNumber: string;
  receivedById?: number;
  notes?: string;
  receivedAt?: Date;
  createdAt?: Date;
  receivedBy?: { id: number; fullName: string; email: string };
  items: StorePurchaseReceiveItem[];
}

export interface StorePurchase {
  id: number;
  purchaseNumber: string;
  organizationId: number;
  supplierId?: number;
  totalAmount: number;
  receivedBy?: string;
  status: PurchaseStatus;
  notes?: string;
  deliveryDate?: Date;
  createdBy: number;
  approvedBy?: number;
  approvedAt?: Date;
  rejectedBy?: number;
  rejectedAt?: Date;
  rejectionReason?: string;
  receivedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  items: StorePurchaseItem[];
  receives?: StorePurchaseReceive[];
  supplier?: any;
  creator?: { id: number; fullName: string; email: string };
  approver?: { id: number; fullName: string; email: string };
  rejector?: { id: number; fullName: string; email: string };
}

// === Requisition (Multi-Item) ===

export type RequisitionPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type RequisitionStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'ISSUED'
  | 'PARTIALLY_ISSUED'
  | 'CANCELLED';

export interface RequisitionItem {
  id: number;
  requisitionId: number;
  storeProductId: number;
  quantityRequested: number;
  quantityApproved?: number;
  quantityIssued?: number;
  notes?: string;
  storeProduct?: StoreProduct;
  createdAt?: Date;
}

export interface Requisition {
  id: number;
  requisitionNumber: string;
  organizationId: number;
  departmentId?: number;
  priority: RequisitionPriority;
  purpose?: string;
  requestedBy: number;
  approvedBy?: number;
  rejectedBy?: number;
  issuedBy?: number;
  status: RequisitionStatus;
  approvedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  issuedAt?: Date;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
  items: RequisitionItem[];
  department?: Department;
  requester?: { id: number; fullName: string; email: string };
  approver?: { id: number; fullName: string; email: string };
  rejector?: { id: number; fullName: string; email: string };
  issuer?: { id: number; fullName: string; email: string };
}

// === Stock Summary ===

export interface StockSummary {
  totalProducts: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  products: StoreProduct[];
}
