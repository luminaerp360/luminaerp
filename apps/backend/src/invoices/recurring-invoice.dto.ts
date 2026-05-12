import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { $Enums } from '@prisma/client';

// Re-export Prisma enums for use in other modules
export type RecurrenceFrequency = $Enums.RecurrenceFrequency;
export type RecurringStatus = $Enums.RecurringStatus;

// Also export the enum values
export const RecurrenceFrequency = $Enums.RecurrenceFrequency;
export const RecurringStatus = $Enums.RecurringStatus;

export class RecurringInvoiceItemDto {
  @IsOptional()
  @IsNumber()
  productId?: number;

  @IsNotEmpty()
  @IsString()
  productName: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class CreateRecurringTemplateDto {
  @IsNotEmpty()
  @IsString()
  templateName: string;

  @IsNumber()
  customerId: number;

  @IsEnum(RecurrenceFrequency)
  frequency: RecurrenceFrequency;

  @IsNumber()
  @Min(1)
  intervalCount: number;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecurringInvoiceItemDto)
  items: RecurringInvoiceItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  paymentTermsDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  termsAndConditions?: string;

  @IsOptional()
  @IsString()
  footerText?: string;

  @IsOptional()
  @IsBoolean()
  autoSendEmail?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  emailRecipients?: string[];

  @IsOptional()
  @IsNumber()
  salesPersonId?: number;

  @IsNotEmpty()
  @IsString()
  createdBy: string;
}

export class UpdateRecurringTemplateDto {
  @IsOptional()
  @IsString()
  templateName?: string;

  @IsOptional()
  @IsEnum(RecurrenceFrequency)
  frequency?: RecurrenceFrequency;

  @IsOptional()
  @IsNumber()
  @Min(1)
  intervalCount?: number;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecurringInvoiceItemDto)
  items?: RecurringInvoiceItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  paymentTermsDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  termsAndConditions?: string;

  @IsOptional()
  @IsString()
  footerText?: string;

  @IsOptional()
  @IsBoolean()
  autoSendEmail?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  emailRecipients?: string[];

  @IsOptional()
  @IsNumber()
  salesPersonId?: number;
}

export class RecurringTemplateFilterDto {
  @IsOptional()
  @IsEnum(RecurringStatus)
  status?: RecurringStatus;

  @IsOptional()
  @IsNumber()
  customerId?: number;

  @IsOptional()
  @IsEnum(RecurrenceFrequency)
  frequency?: RecurrenceFrequency;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}
