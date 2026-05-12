// ===== Modern Product System TypeScript Interfaces =====
// Location: apps/frontend/src/app/types/modern-product.types.ts

export enum ProductStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  DISCONTINUED = 'DISCONTINUED',
  ARCHIVED = 'ARCHIVED',
}

export interface ProductVariant {
  id: number;
  productId: number;
  sku: string;
  variantName: string;
  attributeValues: Record<string, string>; // { size: "Small", color: "Red" }
  price?: number;
  cost?: number;
  quantity: number;
  barcode?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductAttribute {
  id: number;
  organizationId: number;
  name: string;
  displayName?: string;
  values: string[];
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductImage {
  id: number;
  productId: number;
  url: string;
  publicId?: string;
  isPrimary: boolean;
  sortOrder: number;
  caption?: string;
  altText?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductTag {
  id: number;
  organizationId: number;
  name: string;
  color?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UnitOfMeasure {
  id: number;
  organizationId: number;
  name: string;
  abbreviation: string;
  type: 'QUANTITY' | 'WEIGHT' | 'VOLUME' | 'LENGTH';
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductUOM {
  id: number;
  productId: number;
  uomId: number;
  uom?: UnitOfMeasure;
  conversionRate: number;
  price?: number;
  cost?: number;
  barcode?: string;
  isBaseUnit: boolean;
  isPurchaseUnit: boolean;
  isSalesUnit: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PriceTier {
  id: number;
  organizationId: number;
  name: string;
  description?: string;
  isDefault: boolean;
  sortOrder: number;
  discountPercent?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductPricing {
  id: number;
  productId: number;
  tierId: number;
  tier?: PriceTier;
  price: number;
  minQuantity: number;
  maxQuantity?: number;
  startDate?: Date;
  endDate?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaxRate {
  id: number;
  organizationId: number;
  name: string;
  rate: number;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductSupplier {
  id: number;
  productId: number;
  supplierId: number;
  supplier?: {
    id: number;
    name: string;
    contact?: string;
  };
  supplierSKU?: string;
  cost?: number;
  minOrderQuantity?: number;
  leadTimeDays?: number;
  isPrimarySupplier: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductBundle {
  id: number;
  productId: number;
  name: string;
  description?: string;
  price?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  components?: BundleComponent[];
}

export interface BundleComponent {
  id: number;
  bundleId: number;
  productId: number;
  product?: {
    id: number;
    name: string;
    price?: number;
  };
  quantity: number;
  sortOrder: number;
  createdAt: Date;
}

export interface ProductStatusHistory {
  id: number;
  productId: number;
  oldStatus: ProductStatus;
  newStatus: ProductStatus;
  reason?: string;
  changedBy: number;
  changedByUser?: {
    id: number;
    firstName: string;
    lastName: string;
  };
  changedAt: Date;
}

// Extended Product interface with new fields
export interface ModernProduct {
  id: number;
  organizationId: number;
  locationId?: number;
  name: string;
  description?: string;
  pictureUrl?: string;
  productIdNumber: string;
  reorderLevel?: number;
  availability: boolean;
  quantity?: number;
  storeQuantity?: number;
  countable: boolean;
  isService: boolean;
  price?: number;
  expiryDate?: Date;
  categoryId: number;
  category?: {
    id: number;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
  buyingPrice?: number;
  wholesalePrice?: number;
  defaultCommissionType?: string;
  defaultCommissionValue?: number;
  isCommissionable: boolean;
  // New fields
  status: ProductStatus;
  statusReason?: string;
  discontinuedAt?: Date;
  archivedAt?: Date;
  taxRateId?: number;
  taxRate?: TaxRate;
  isTaxable: boolean;
  taxInclusive: boolean;
  minOrderQuantity?: number;
  maxOrderQuantity?: number;
  tags: string[];
  sku?: string;
  weight?: number;
  weightUnit?: string;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: string;
  };
  hasVariants: boolean;
  // Relations
  variants?: ProductVariant[];
  images?: ProductImage[];
  tagObjects?: ProductTag[];
  pricing?: ProductPricing[];
  uoms?: ProductUOM[];
  suppliers?: ProductSupplier[];
  bundles?: ProductBundle[];
  statusHistory?: ProductStatusHistory[];
}

// Filter interfaces for advanced search
export interface ProductFilters {
  search?: string;
  categoryIds?: number[];
  tagIds?: number[];
  status?: ProductStatus[];
  stockStatus?: ('IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK')[];
  priceMin?: number;
  priceMax?: number;
  isService?: boolean;
  hasVariants?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  supplierIds?: number[];
  sortBy?: 'name' | 'price' | 'quantity' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Bulk operation interfaces
export interface BulkProductUpdate {
  productIds: number[];
  updates: {
    status?: ProductStatus;
    categoryId?: number;
    tagIds?: number[];
    price?: number;
    buyingPrice?: number;
    taxRateId?: number;
    isTaxable?: boolean;
  };
}

// Product view preferences
export interface ProductViewPreferences {
  viewType: 'grid' | 'list' | 'compact';
  showImages: boolean;
  showStock: boolean;
  showPricing: boolean;
  columnsVisible: string[];
}

// Analytics interfaces
export interface ProductPerformance {
  productId: number;
  productName: string;
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  profitMargin: number;
  unitsSold: number;
  averageOrderValue: number;
  stockTurnoverRatio: number;
  daysInInventory: number;
}

export interface ABCAnalysis {
  categoryA: ProductPerformance[]; // Top 20% by revenue
  categoryB: ProductPerformance[]; // Middle 30% by revenue
  categoryC: ProductPerformance[]; // Bottom 50% by revenue
  summary: {
    totalProducts: number;
    categoryACount: number;
    categoryBCount: number;
    categoryCCount: number;
    categoryARevenue: number;
    categoryBRevenue: number;
    categoryCRevenue: number;
  };
}

export interface DeadStockProduct {
  id: number;
  name: string;
  category: string;
  quantity: number;
  value: number;
  lastSaleDate: Date | null;
  daysSinceLastSale: number;
  ageInDays: number;
}

// DTO interfaces for creating/updating
export interface CreateProductDto {
  name: string;
  description?: string;
  productIdNumber?: string;
  categoryId?: number;
  categoryName?: string;
  price: number;
  buyingPrice?: number;
  wholesalePrice?: number;
  quantity?: number;
  storeQuantity?: number;
  reorderLevel?: number;
  isService?: boolean;
  countable?: boolean;
  expiryDate?: Date;
  status?: ProductStatus;
  taxRateId?: number;
  isTaxable?: boolean;
  taxInclusive?: boolean;
  minOrderQuantity?: number;
  maxOrderQuantity?: number;
  tags?: string[];
  sku?: string;
  weight?: number;
  weightUnit?: string;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: string;
  };
  hasVariants?: boolean;
  isCommissionable?: boolean;
  defaultCommissionType?: string;
  defaultCommissionValue?: number;
}

export interface CreateVariantDto {
  productId: number;
  variantName: string;
  attributeValues: Record<string, string>;
  price?: number;
  cost?: number;
  quantity?: number;
  barcode?: string;
  imageUrl?: string;
}

export interface CreateProductImageDto {
  productId: number;
  file: File;
  isPrimary?: boolean;
  caption?: string;
  altText?: string;
}

export interface CreatePricingDto {
  productId: number;
  tierId: number;
  price: number;
  minQuantity?: number;
  maxQuantity?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface CreateBundleDto {
  productId: number;
  name: string;
  description?: string;
  price?: number;
  components: {
    productId: number;
    quantity: number;
  }[];
}
