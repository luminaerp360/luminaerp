export interface StockTakeItem {
  id?: number;
  stockTakeId?: number;
  productId: number;
  productName: string;
  systemQuantity: number;
  countedQuantity: number;
  varianceQty: number;
  varianceValue: number;
  unitCost: number;
  reason?: string;
  notes?: string;
  product?: {
    id: number;
    name: string;
    quantity: number;
    buyingPrice: number;
    price?: number;
  };
}

export interface StockTake {
  id: number;
  organizationId: number;
  stockTakeNumber: string;
  status: StockTakeStatus;
  type: string;
  notes?: string;
  totalItems: number;
  totalVarianceQty: number;
  totalVarianceValue: number;
  createdBy: number;
  createdByName: string;
  completedBy?: number;
  completedByName?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  items: StockTakeItem[];
}

export type StockTakeStatus =
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface StockTakeSummary {
  total: number;
  completed: number;
  inProgress: number;
  draft: number;
  latestCompleted?: {
    stockTakeNumber: string;
    completedAt: string;
    totalVarianceQty: number;
    totalVarianceValue: number;
  };
  allTimeVarianceValue: number;
  allTimeVarianceQty: number;
}

export interface StockTakeListResponse {
  stockTakes: StockTake[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
