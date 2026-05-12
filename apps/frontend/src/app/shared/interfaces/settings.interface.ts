export type DocumentTemplate =
  | 'classic'
  | 'modern-bold'
  | 'minimal'
  | 'branded'
  | 'compact';
export type DocumentType = 'sale' | 'invoice' | 'quotation';

export interface DocumentTypeSettings {
  template: DocumentTemplate;
  accentColor: string;
  // Branding
  showLogo: boolean;
  showOrgName: boolean;
  showOrgAddress: boolean;
  showOrgPhone: boolean;
  showOrgEmail: boolean;
  // Customer info
  showCustomerType: boolean;
  showKraPin: boolean;
  // Items table
  showItemDescription: boolean;
  showItemSku: boolean;
  showItemTax: boolean;
  showItemDiscount: boolean;
  // Totals
  showSubtotal: boolean;
  showTaxBreakdown: boolean;
  showDiscount: boolean;
  showPaymentMethod: boolean;
  showAmountPaid: boolean;
  showBalanceDue: boolean;
  // Footer
  showNotes: boolean;
  showTermsAndConditions: boolean;
  showThankYouMessage: boolean;
  customFooterText: string;
  showSignatureLine: boolean;
  // Output
  paperSize: 'A4' | 'Letter' | 'A5';
}

export const DEFAULT_SALE_SETTINGS: DocumentTypeSettings = {
  template: 'classic',
  accentColor: '#EA580C',
  showLogo: true,
  showOrgName: true,
  showOrgAddress: true,
  showOrgPhone: true,
  showOrgEmail: false,
  showCustomerType: false,
  showKraPin: false,
  showItemDescription: true,
  showItemSku: false,
  showItemTax: false,
  showItemDiscount: true,
  showSubtotal: true,
  showTaxBreakdown: true,
  showDiscount: true,
  showPaymentMethod: true,
  showAmountPaid: true,
  showBalanceDue: false,
  showNotes: false,
  showTermsAndConditions: false,
  showThankYouMessage: true,
  customFooterText: '',
  showSignatureLine: false,
  paperSize: 'A4',
};

export const DEFAULT_INVOICE_SETTINGS: DocumentTypeSettings = {
  template: 'modern-bold',
  accentColor: '#2563EB',
  showLogo: true,
  showOrgName: true,
  showOrgAddress: true,
  showOrgPhone: true,
  showOrgEmail: true,
  showCustomerType: true,
  showKraPin: true,
  showItemDescription: true,
  showItemSku: true,
  showItemTax: true,
  showItemDiscount: true,
  showSubtotal: true,
  showTaxBreakdown: true,
  showDiscount: true,
  showPaymentMethod: true,
  showAmountPaid: true,
  showBalanceDue: true,
  showNotes: true,
  showTermsAndConditions: true,
  showThankYouMessage: false,
  customFooterText: '',
  showSignatureLine: true,
  paperSize: 'A4',
};

export const DEFAULT_QUOTATION_SETTINGS: DocumentTypeSettings = {
  template: 'classic',
  accentColor: '#16A34A',
  showLogo: true,
  showOrgName: true,
  showOrgAddress: true,
  showOrgPhone: true,
  showOrgEmail: true,
  showCustomerType: true,
  showKraPin: true,
  showItemDescription: true,
  showItemSku: false,
  showItemTax: true,
  showItemDiscount: true,
  showSubtotal: true,
  showTaxBreakdown: true,
  showDiscount: true,
  showPaymentMethod: false,
  showAmountPaid: false,
  showBalanceDue: false,
  showNotes: true,
  showTermsAndConditions: true,
  showThankYouMessage: false,
  customFooterText: '',
  showSignatureLine: true,
  paperSize: 'A4',
};

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

export interface OrganizationSettings {
  id?: number;
  organizationId: number;

  // Payment Methods Configuration
  paymentMethods: PaymentMethodsConfig;

  // Tax Settings
  enableTax: boolean;
  defaultTaxRate: number;
  taxName: string;
  taxNumber?: string;
  includeTaxInPrice: boolean;

  // General Settings
  currency: string;
  currencySymbol: string;
  timeZone: string;
  dateFormat: string;
  timeFormat: string;
  decimalPlaces: number;

  // Numbering Prefixes
  invoicePrefix: string;
  salePrefix: string;
  quotationPrefix: string;
  lpoPrefix: string;
  paymentPrefix: string;
  expensePrefix: string;
  creditSalePrefix: string;

  // Display Settings
  defaultViewMode: ViewMode;
  itemsPerPage: number;
  showProductImages: boolean;
  compactMode: boolean;

  // Reporting Period Settings
  fiscalYearStart: number;
  fiscalYearEnd: number;
  reportingPeriodStart: number;
  reportingPeriodEnd: number;

  // Recurring Invoice Settings
  recurringInvoiceTime: string;
  recurringInvoiceDaysBefore: number;

  // Inventory Settings
  lowStockAlertEnabled: boolean;
  autoDeductInventory: boolean;
  allowNegativeStock: boolean;

  // Notification Settings
  emailNotifications: boolean;
  smsNotifications: boolean;
  lowStockNotifications: boolean;

  // Receipt/Invoice Settings
  showCompanyLogo: boolean;
  showBankDetails: boolean;
  showMpesaDetails: boolean;
  receiptFooterText?: string;
  invoiceFooterText?: string;
  quotationFooterText?: string;
  invoiceTerms?: string;
  invoiceNotes?: string;
  quotationTerms?: string;
  quotationNotes?: string;

  // Document Print Settings
  invoiceDocSettings?: DocumentTypeSettings;
  saleDocSettings?: DocumentTypeSettings;
  quotationDocSettings?: DocumentTypeSettings;

  // Business Rules
  requireCustomerForCredit: boolean;
  allowDiscounts: boolean;
  maxDiscountPercentage: number;

  // Authentication Settings
  jwtAccessTokenExpiry?: string;
  jwtRefreshTokenExpiry?: string;
  sessionTimeout?: number;
  maxLoginAttempts?: number;
  lockoutDuration?: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateSettingsDto {
  organizationId: number;
  paymentMethods?: PaymentMethodsConfig;
  enableTax?: boolean;
  defaultTaxRate?: number;
  taxName?: string;
  taxNumber?: string;
  includeTaxInPrice?: boolean;
  currency?: string;
  currencySymbol?: string;
  timeZone?: string;
  dateFormat?: string;
  timeFormat?: string;
  decimalPlaces?: number;
  invoicePrefix?: string;
  salePrefix?: string;
  quotationPrefix?: string;
  lpoPrefix?: string;
  paymentPrefix?: string;
  expensePrefix?: string;
  creditSalePrefix?: string;
  defaultViewMode?: ViewMode;
  itemsPerPage?: number;
  showProductImages?: boolean;
  compactMode?: boolean;
  fiscalYearStart?: number;
  fiscalYearEnd?: number;
  reportingPeriodStart?: number;
  reportingPeriodEnd?: number;
  recurringInvoiceTime?: string;
  recurringInvoiceDaysBefore?: number;
  lowStockAlertEnabled?: boolean;
  autoDeductInventory?: boolean;
  allowNegativeStock?: boolean;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  lowStockNotifications?: boolean;
  showCompanyLogo?: boolean;
  showBankDetails?: boolean;
  showMpesaDetails?: boolean;
  receiptFooterText?: string;
  invoiceFooterText?: string;
  quotationFooterText?: string;
  invoiceTerms?: string;
  invoiceNotes?: string;
  quotationTerms?: string;
  quotationNotes?: string;
  requireCustomerForCredit?: boolean;
  allowDiscounts?: boolean;
  maxDiscountPercentage?: number;
  jwtAccessTokenExpiry?: string;
  jwtRefreshTokenExpiry?: string;
  sessionTimeout?: number;
  maxLoginAttempts?: number;
  lockoutDuration?: number;
  invoiceDocSettings?: DocumentTypeSettings;
  saleDocSettings?: DocumentTypeSettings;
  quotationDocSettings?: DocumentTypeSettings;
}

export interface UpdateSettingsDto extends Partial<CreateSettingsDto> {}

export type SettingsSection =
  | 'payment'
  | 'tax'
  | 'general'
  | 'prefixes'
  | 'display'
  | 'reporting'
  | 'recurring'
  | 'inventory'
  | 'notifications'
  | 'receipt'
  | 'business'
  | 'authentication'
  | 'documents';

export interface TaxSettings {
  enableTax: boolean;
  defaultTaxRate: number;
  taxName: string;
  taxNumber?: string;
  includeTaxInPrice: boolean;
}

export interface CurrencySettings {
  currency: string;
  currencySymbol: string;
  decimalPlaces: number;
}

export interface DateTimeSettings {
  dateFormat: string;
  timeFormat: string;
  timeZone: string;
}

export interface FiscalYearSettings {
  fiscalYearStart: number;
  fiscalYearEnd: number;
}

export interface ReportingPeriodSettings {
  reportingPeriodStart: number;
  reportingPeriodEnd: number;
}
