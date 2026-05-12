// Stock Transfer Interfaces
export interface StockTransferItem {
  productIdNumber: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

export interface CreateStockTransferDto {
  fromOrganizationId: number;
  toOrganizationId: number;
  fromLocationId?: number;
  toLocationId?: number;
  items: StockTransferItem[];
  notes?: string;
}

export interface UpdateStockTransferStatusDto {
  status: StockTransferStatus;
  notes?: string;
  rejectionReason?: string;
}

export enum StockTransferStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface Organization {
  id: number;
  name: string;
  logoUrl?: string;
  address?: string;
}

export interface Location {
  id: number;
  name: string;
}

export interface StockTransfer {
  id: number;
  transferNumber: string;
  fromOrganizationId: number;
  toOrganizationId: number;
  fromLocationId?: number;
  toLocationId?: number;
  items: string | StockTransferItem[]; // JSON string or parsed array
  totalValue: number;
  status: StockTransferStatus;
  transferredBy: number;
  transferredByName: string;
  approvedBy?: number;
  approvedByName?: string;
  approvedAt?: string;
  completedAt?: string;
  notes?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  fromOrganization: Organization;
  toOrganization: Organization;
  fromLocation?: Location;
  toLocation?: Location;
}

export interface StockTransferResponse {
  success: boolean;
  message: string;
  transfer: StockTransfer;
}

export interface StockTransferListResponse {
  success: boolean;
  transfers: StockTransfer[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface StockTransferStats {
  organizationId: number;
  totalTransfers: number;
  pendingTransfers: number;
  approvedTransfers: number;
  rejectedTransfers: number;
  completedTransfers: number;
  totalValue: number;
  averageValue: number;
}

export interface StockTransferStatsResponse {
  success: boolean;
  stats: StockTransferStats;
}

// Pagination & filtering query interfaces for new paginated listing endpoint
export interface StockTransferQuery {
  page?: number; // default 1
  pageSize?: number; // default 20
  startDate?: string; // ISO date (inclusive)
  endDate?: string; // ISO date (inclusive)
  search?: string; // matches number, names, notes, rejection reason
  status?: string[]; // multi-status filter, serialized comma-separated
  organizationId?: number; // optional org scope filter
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PagedStockTransferResponse {
  data: StockTransfer[];
  meta: PaginationMeta;
}

// Bulk operations interfaces
export interface BulkApprovalRequest {
  transferIds: number[];
  notes?: string;
}

export interface BulkRejectionRequest {
  transferIds: number[];
  rejectionReason: string;
  notes?: string;
}

export interface BulkOperationResponse {
  success: boolean;
  message: string;
  results: {
    successful: number;
    failed: number;
    total: number;
  };
  details: Array<{
    transferId: number;
    success: boolean;
    error?: string;
  }>;
}
