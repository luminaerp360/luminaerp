import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  IsEnum,
  IsJSON,
  IsObject,
} from 'class-validator';

export enum ViewMode {
  LIST = 'LIST',
  GRID = 'GRID',
  CARDS = 'CARDS',
}

export interface PaymentMethodsConfig {
  cash: boolean;
  mpesa: boolean;
  bank: boolean;
  credit: boolean;
}

export class CreateSettingsDto {
  @IsInt()
  organizationId: number;

  @IsOptional()
  @IsObject()
  paymentMethods?: PaymentMethodsConfig;

  // Tax Settings
  @IsOptional()
  @IsBoolean()
  enableTax?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  defaultTaxRate?: number;

  @IsOptional()
  @IsString()
  taxName?: string;

  @IsOptional()
  @IsString()
  taxNumber?: string;

  @IsOptional()
  @IsBoolean()
  includeTaxInPrice?: boolean;

  // General Settings
  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  currencySymbol?: string;

  @IsOptional()
  @IsString()
  timeZone?: string;

  @IsOptional()
  @IsString()
  dateFormat?: string;

  @IsOptional()
  @IsString()
  timeFormat?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(4)
  decimalPlaces?: number;

  // Numbering Prefixes
  @IsOptional()
  @IsString()
  invoicePrefix?: string;

  @IsOptional()
  @IsString()
  salePrefix?: string;

  @IsOptional()
  @IsString()
  quotationPrefix?: string;

  @IsOptional()
  @IsString()
  lpoPrefix?: string;

  @IsOptional()
  @IsString()
  paymentPrefix?: string;

  @IsOptional()
  @IsString()
  expensePrefix?: string;

  @IsOptional()
  @IsString()
  creditSalePrefix?: string;

  // Display Settings
  @IsOptional()
  @IsEnum(ViewMode)
  defaultViewMode?: ViewMode;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(100)
  itemsPerPage?: number;

  @IsOptional()
  @IsBoolean()
  showProductImages?: boolean;

  @IsOptional()
  @IsBoolean()
  compactMode?: boolean;

  // Reporting Period Settings
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  fiscalYearStart?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  fiscalYearEnd?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  reportingPeriodStart?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  reportingPeriodEnd?: number;

  // Recurring Invoice Settings
  @IsOptional()
  @IsString()
  recurringInvoiceTime?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  recurringInvoiceDaysBefore?: number;

  // Inventory Settings
  @IsOptional()
  @IsBoolean()
  lowStockAlertEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  autoDeductInventory?: boolean;

  @IsOptional()
  @IsBoolean()
  allowNegativeStock?: boolean;

  // Notification Settings
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  lowStockNotifications?: boolean;

  // Receipt/Invoice Settings
  @IsOptional()
  @IsBoolean()
  showCompanyLogo?: boolean;

  @IsOptional()
  @IsBoolean()
  showBankDetails?: boolean;

  @IsOptional()
  @IsBoolean()
  showMpesaDetails?: boolean;

  @IsOptional()
  @IsString()
  receiptFooterText?: string;

  @IsOptional()
  @IsString()
  invoiceFooterText?: string;

  @IsOptional()
  @IsString()
  quotationFooterText?: string;

  @IsOptional()
  @IsString()
  invoiceTerms?: string;

  @IsOptional()
  @IsString()
  invoiceNotes?: string;

  @IsOptional()
  @IsString()
  quotationTerms?: string;

  @IsOptional()
  @IsString()
  quotationNotes?: string;

  // Document Print Settings (JSON)
  @IsOptional()
  @IsObject()
  invoiceDocSettings?: Record<string, any>;

  @IsOptional()
  @IsObject()
  saleDocSettings?: Record<string, any>;

  @IsOptional()
  @IsObject()
  quotationDocSettings?: Record<string, any>;

  // Business Rules
  @IsOptional()
  @IsBoolean()
  requireCustomerForCredit?: boolean;

  @IsOptional()
  @IsBoolean()
  allowDiscounts?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  maxDiscountPercentage?: number;

  // Authentication Settings
  @IsOptional()
  @IsString()
  jwtAccessTokenExpiry?: string;

  @IsOptional()
  @IsString()
  jwtRefreshTokenExpiry?: string;

  @IsOptional()
  @IsInt()
  @Min(60)
  sessionTimeout?: number;

  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(10)
  maxLoginAttempts?: number;

  @IsOptional()
  @IsInt()
  @Min(300)
  lockoutDuration?: number;
}

export class UpdateSettingsDto {
  @IsOptional()
  @IsObject()
  paymentMethods?: PaymentMethodsConfig;

  // Tax Settings
  @IsOptional()
  @IsBoolean()
  enableTax?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  defaultTaxRate?: number;

  @IsOptional()
  @IsString()
  taxName?: string;

  @IsOptional()
  @IsString()
  taxNumber?: string;

  @IsOptional()
  @IsBoolean()
  includeTaxInPrice?: boolean;

  // General Settings
  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  currencySymbol?: string;

  @IsOptional()
  @IsString()
  timeZone?: string;

  @IsOptional()
  @IsString()
  dateFormat?: string;

  @IsOptional()
  @IsString()
  timeFormat?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(4)
  decimalPlaces?: number;

  // Numbering Prefixes
  @IsOptional()
  @IsString()
  invoicePrefix?: string;

  @IsOptional()
  @IsString()
  salePrefix?: string;

  @IsOptional()
  @IsString()
  quotationPrefix?: string;

  @IsOptional()
  @IsString()
  lpoPrefix?: string;

  @IsOptional()
  @IsString()
  paymentPrefix?: string;

  @IsOptional()
  @IsString()
  expensePrefix?: string;

  @IsOptional()
  @IsString()
  creditSalePrefix?: string;

  // Display Settings
  @IsOptional()
  @IsEnum(ViewMode)
  defaultViewMode?: ViewMode;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(100)
  itemsPerPage?: number;

  @IsOptional()
  @IsBoolean()
  showProductImages?: boolean;

  @IsOptional()
  @IsBoolean()
  compactMode?: boolean;

  // Reporting Period Settings
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  fiscalYearStart?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  fiscalYearEnd?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  reportingPeriodStart?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  reportingPeriodEnd?: number;

  // Recurring Invoice Settings
  @IsOptional()
  @IsString()
  recurringInvoiceTime?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  recurringInvoiceDaysBefore?: number;

  // Inventory Settings
  @IsOptional()
  @IsBoolean()
  lowStockAlertEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  autoDeductInventory?: boolean;

  @IsOptional()
  @IsBoolean()
  allowNegativeStock?: boolean;

  // Notification Settings
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  lowStockNotifications?: boolean;

  // Receipt/Invoice Settings
  @IsOptional()
  @IsBoolean()
  showCompanyLogo?: boolean;

  @IsOptional()
  @IsBoolean()
  showBankDetails?: boolean;

  @IsOptional()
  @IsBoolean()
  showMpesaDetails?: boolean;

  @IsOptional()
  @IsString()
  receiptFooterText?: string;

  @IsOptional()
  @IsString()
  invoiceFooterText?: string;

  @IsOptional()
  @IsString()
  quotationFooterText?: string;

  @IsOptional()
  @IsString()
  invoiceTerms?: string;

  @IsOptional()
  @IsString()
  invoiceNotes?: string;

  @IsOptional()
  @IsString()
  quotationTerms?: string;

  @IsOptional()
  @IsString()
  quotationNotes?: string;

  // Document Print Settings (JSON)
  @IsOptional()
  @IsObject()
  invoiceDocSettings?: Record<string, any>;

  @IsOptional()
  @IsObject()
  saleDocSettings?: Record<string, any>;

  @IsOptional()
  @IsObject()
  quotationDocSettings?: Record<string, any>;

  // Business Rules
  @IsOptional()
  @IsBoolean()
  requireCustomerForCredit?: boolean;

  @IsOptional()
  @IsBoolean()
  allowDiscounts?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  maxDiscountPercentage?: number;

  // Authentication Settings
  @IsOptional()
  @IsString()
  jwtAccessTokenExpiry?: string;

  @IsOptional()
  @IsString()
  jwtRefreshTokenExpiry?: string;

  @IsOptional()
  @IsInt()
  @Min(60)
  sessionTimeout?: number;

  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(10)
  maxLoginAttempts?: number;

  @IsOptional()
  @IsInt()
  @Min(300)
  lockoutDuration?: number;
}
