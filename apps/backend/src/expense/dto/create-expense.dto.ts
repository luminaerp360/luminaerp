import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsEnum,
  IsOptional,
  MaxLength,
  MinLength,
  IsDateString,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsUrl,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

export enum ExpenseType {
  ONE_TIME = 'ONE_TIME',
  RECURRING = 'RECURRING',
}

export enum ExpenseStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAID = 'PAID',
}

export enum RecurrenceFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

export class ExpenseAttachmentDto {
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsUrl()
  fileUrl: string;

  @IsString()
  @IsOptional()
  fileType?: string;

  @IsNumber()
  @IsOptional()
  fileSize?: number;
}

export class RecurrenceRuleDto {
  @IsEnum(RecurrenceFrequency)
  frequency: RecurrenceFrequency;

  @IsNumber()
  @Min(1)
  @Max(365)
  interval: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  occurrences?: number;
}

export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  category: string;

  @IsNumber()
  @IsPositive()
  createdBy: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  paidBy: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  @IsUrl()
  @Transform(({ value }) => (value === '' ? undefined : value))
  receiptUrl?: string;

  @IsOptional()
  @IsNumber()
  chartOfAccountId?: number;

  @IsOptional()
  @IsEnum(ExpenseType)
  expenseType?: ExpenseType;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  paymentReference?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  paidAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  transactionCode?: string;

  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  expenseDate?: string;

  // New fields for modern expense management
  @IsOptional()
  @IsEnum(ExpenseStatus)
  status?: ExpenseStatus;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  vendor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  invoiceNumber?: string;

  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  dueDate?: string;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => RecurrenceRuleDto)
  recurrenceRule?: RecurrenceRuleDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseAttachmentDto)
  attachments?: ExpenseAttachmentDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsNumber()
  projectId?: number;

  @IsOptional()
  @IsNumber()
  departmentId?: number;

  @IsOptional()
  @IsBoolean()
  isBillable?: boolean;

  @IsOptional()
  @IsBoolean()
  isReimbursable?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;
}
