import {
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  IsEnum,
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
import {
  ExpenseType,
  ExpenseStatus,
  RecurrenceRuleDto,
  ExpenseAttachmentDto,
} from './create-expense.dto';

export class UpdateExpenseDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  paidBy?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

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
  paidAmount?: number;

  @IsOptional()
  @IsString()
  transactionCode?: string;

  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  expenseDate?: string;

  // Advanced expense management fields
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
