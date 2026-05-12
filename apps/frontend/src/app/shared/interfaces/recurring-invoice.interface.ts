export enum RecurrenceFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  SEMI_ANNUALLY = 'SEMI_ANNUALLY',
  YEARLY = 'YEARLY',
}

export enum RecurringStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface RecurringInvoiceItem {
  id?: number;
  templateId?: number;
  productId?: number;
  productName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discountAmount: number;
  sortOrder?: number;
}

export interface RecurringInvoiceTemplate {
  id?: number;
  organizationId?: number;

  // Template identification
  templateName: string;
  templateCode: string;

  // Customer information
  customerId: number;
  customer?: any;

  // Recurrence settings
  frequency: RecurrenceFrequency;
  intervalCount: number;
  startDate: string | Date;
  endDate?: string | Date;
  nextInvoiceDate: string | Date;

  // Optional: Day control
  dayOfMonth?: number;
  dayOfWeek?: number;

  // Invoice settings
  items?: RecurringInvoiceItem[];
  paymentTermsDays: number;
  taxRate: number;
  discountAmount: number;
  notes?: string;
  termsAndConditions?: string;
  footerText?: string;

  // Status and tracking
  status: RecurringStatus;
  totalGenerated: number;
  lastGeneratedDate?: string | Date;
  lastGeneratedInvoiceId?: number;

  // Email settings
  autoSendEmail: boolean;
  emailRecipients?: string[];

  // Sales person & commission
  salesPersonId?: number;
  salesPerson?: any;

  // Metadata
  createdBy: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CreateRecurringTemplateDto {
  templateName: string;
  customerId: number;
  frequency: RecurrenceFrequency;
  intervalCount: number;
  startDate: string;
  endDate?: string;
  dayOfMonth?: number;
  dayOfWeek?: number;
  items: Partial<RecurringInvoiceItem>[];
  paymentTermsDays?: number;
  taxRate?: number;
  discountAmount?: number;
  notes?: string;
  termsAndConditions?: string;
  footerText?: string;
  autoSendEmail?: boolean;
  emailRecipients?: string[];
  salesPersonId?: number;
  createdBy: string;
}

export interface UpdateRecurringTemplateDto {
  templateName?: string;
  frequency?: RecurrenceFrequency;
  intervalCount?: number;
  endDate?: string;
  dayOfMonth?: number;
  dayOfWeek?: number;
  items?: Partial<RecurringInvoiceItem>[];
  paymentTermsDays?: number;
  taxRate?: number;
  discountAmount?: number;
  notes?: string;
  termsAndConditions?: string;
  footerText?: string;
  autoSendEmail?: boolean;
  emailRecipients?: string[];
  salesPersonId?: number;
}

export interface RecurringTemplateFilters {
  status?: RecurringStatus;
  customerId?: number;
  frequency?: RecurrenceFrequency;
  page?: number;
  limit?: number;
}

export interface RecurringTemplateListResponse {
  templates: RecurringInvoiceTemplate[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Helper constants for UI display
export const FrequencyLabels: Record<RecurrenceFrequency, string> = {
  [RecurrenceFrequency.DAILY]: 'Daily',
  [RecurrenceFrequency.WEEKLY]: 'Weekly',
  [RecurrenceFrequency.BIWEEKLY]: 'Bi-weekly',
  [RecurrenceFrequency.MONTHLY]: 'Monthly',
  [RecurrenceFrequency.QUARTERLY]: 'Quarterly',
  [RecurrenceFrequency.SEMI_ANNUALLY]: 'Semi-annually',
  [RecurrenceFrequency.YEARLY]: 'Yearly',
};

export const StatusLabels: Record<RecurringStatus, string> = {
  [RecurringStatus.ACTIVE]: 'Active',
  [RecurringStatus.PAUSED]: 'Paused',
  [RecurringStatus.COMPLETED]: 'Completed',
  [RecurringStatus.CANCELLED]: 'Cancelled',
};

export const DayOfWeekLabels = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
