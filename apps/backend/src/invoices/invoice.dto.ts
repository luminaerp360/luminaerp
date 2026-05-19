import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

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

export class InvoiceItemDto {
  @IsOptional()
  @IsNumber()
  productId?: number;

  @IsNotEmpty()
  @IsString()
  productName: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  unitPrice: number;

  @IsOptional()
  @IsNumber()
  taxRate?: number;

  @IsOptional()
  @IsNumber()
  discountPercentage?: number;

  @IsOptional()
  @IsNumber()
  discountAmount?: number;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class CreateInvoiceDto {
  @IsEnum(InvoiceType)
  @IsOptional()
  invoiceType?: InvoiceType;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  // Customer information
  @IsNumber()
  customerId: number;

  @IsOptional()
  @IsString()
  customerAddress?: string;

  @IsOptional()
  @IsString()
  customerTaxId?: string;

  // Items
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];

  // Dates
  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  orderDate?: string;

  // Payment terms
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsOptional()
  @IsNumber()
  paymentTermsDays?: number;

  @IsOptional()
  @IsNumber()
  lateFeePercentage?: number;

  // Tax
  @IsOptional()
  @IsNumber()
  taxRate?: number;

  @IsOptional()
  @IsString()
  taxType?: string;

  @IsOptional()
  @IsString()
  organizationTaxId?: string;

  // Notes
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  termsAndConditions?: string;

  @IsOptional()
  @IsString()
  footerText?: string;

  // Metadata
  @IsString()
  createdBy: string;

  @IsOptional()
  @IsNumber()
  shiftId?: number;

  @IsOptional()
  @IsNumber()
  orderId?: number;

  // Sales person tracking
  @IsOptional()
  @IsNumber()
  salesPersonId?: number;

  // Commission overrides
  @IsOptional()
  @IsArray()
  commissionOverrides?: Array<{
    productId: number;
    enabled: boolean;
    commissionType?: string;
    commissionRate?: number;
    commissionAmount?: number;
  }>;

  // Discount
  @IsOptional()
  @IsNumber()
  discountAmount?: number;

  // Send email immediately
  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean;

  // Invoice status (defaults to DRAFT if not provided)
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;
}

export class UpdateInvoiceDto {
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items?: InvoiceItemDto[];

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsOptional()
  @IsNumber()
  paymentTermsDays?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  termsAndConditions?: string;

  @IsOptional()
  @IsString()
  footerText?: string;
}

export class RecordPaymentDto {
  @IsNumber()
  amount: number;

  // Legacy field
  @IsOptional()
  @IsString()
  paymentMethod?: 'CASH' | 'MPESA' | 'BANK_TRANSFER' | 'CREDIT';

  // New payment method fields
  @IsOptional()
  @IsNumber()
  paymentMethodId?: number;

  @IsOptional()
  @IsString()
  paymentMethodCode?: string;

  @IsOptional()
  @IsString()
  paymentMethodName?: string;

  @IsOptional()
  @IsString()
  transactionCode?: string;

  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  recordedBy: string;
}

export class SendInvoiceDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsBoolean()
  sendSms?: boolean;

  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean;

  @IsOptional()
  @IsString()
  message?: string;
}

export class InvoiceFilterDto {
  @IsOptional()
  @IsNumber()
  customerId?: number;

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  search?: string; // Search by invoice number or customer name

  @IsOptional()
  @IsString()
  invoiceNumber?: string; // Filter by specific invoice number

  @IsOptional()
  @IsString()
  customerName?: string; // Filter by customer name

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class FinalizeInvoiceDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  finalizedBy: string;
}

export class MarkAsSentDto {
  @IsOptional()
  @IsDateString()
  sentAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  sentBy: string;
}

export class SendReminderDto {
  @IsOptional()
  @IsString()
  customMessage?: string;

  @IsOptional()
  @IsString()
  reminderType?: 'FRIENDLY' | 'FIRM' | 'URGENT';

  @IsString()
  sentBy: string;
}
