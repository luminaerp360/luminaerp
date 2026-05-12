export interface Product {
  isOneTime?: boolean;
  buyingPrice: any;
  category: any;
  discountValue?: number;
  reorderLevel?: any;
  productIdNumber?: any;
  selectedItems?: number;
  pax: any;
  discount: number;
  id: number;
  name: string;
  price: number;
  wholesalePrice?: number;
  categoryId: number;
  description?: string;
  picture?: string;
  availability: boolean;
  quantity?: number;
  storeQuantity?: number;
  selectedProducts?: number;
  buying_price?: number;
  quantityToAdd?: number;
  countable?: boolean;
  isService?: boolean;
  oneTimeService?: boolean; // Flag for one-time service sales
  taxType?: 'exempt' | 'inclusive' | 'exclusive'; // Tax configuration for the product

  // Commission fields
  defaultCommissionType?: 'PERCENTAGE' | 'FIXED';
  defaultCommissionValue?: number;
  isCommissionable?: boolean;

  // Modern product fields
  status?: 'DRAFT' | 'ACTIVE' | 'DISCONTINUED' | 'OUT_OF_STOCK' | 'ARCHIVED';
  sku?: string;
  tags?: string[];
  weight?: number;
  weightUnit?: 'kg' | 'g' | 'lb' | 'oz';
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: 'cm' | 'inch' | 'm';
  };
  hasVariants?: boolean;
  isTaxable?: boolean;
  taxInclusive?: boolean;
  minOrderQuantity?: number;
  maxOrderQuantity?: number;

  // Tracked products (phones/cars/serialized items)
  trackingMode?: 'NONE' | 'SERIAL' | 'IMEI' | 'REGISTRATION';
  batchTracking?: boolean;
  requiresUniqueIdentifiers?: boolean;
  requiredAssetTypes?: Array<
    'IMAGE' | 'DOCUMENT' | 'LOGBOOK' | 'INSURANCE' | 'WARRANTY' | 'OTHER'
  >;
  selectedUnitIds?: number[];
}
