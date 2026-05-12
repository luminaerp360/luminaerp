import { Payment, PaymentMethod, PaymentStatus, PaymentType, TransactionType } from '@prisma/client';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaymentFilters } from '../payments-transactions.service';




export class CreatePaymentDto {


  @IsEnum(PaymentType)
paymentType: PaymentType;


  @IsNumber()
  amount: number;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;

  @IsString()
  @IsOptional()
  transactionCode?: string;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsEnum(TransactionType)
  transactionType: TransactionType;

  @IsString()
  paidBy: string;

  @IsString()
  paidTo: string;

  @IsString()
  description: string;

  @IsString()
  @IsOptional()
  receiptUrl?: string;

  // Reference IDs for different transaction types
  @IsNumber()
  @IsOptional()
  orderId?: number;

  @IsNumber()
  @IsOptional()
  creditSaleId?: number;
}

export class UpdatePaymentDto extends CreatePaymentDto {}

export class PaymentReportQueryDto implements PaymentFilters {
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => value || undefined)
  startDate?: string;

  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => value || undefined)
  endDate?: string;

  @IsOptional()
  @IsEnum(PaymentType)
  @Transform(({ value }) => value || undefined)
  paymentType?: PaymentType;

  @IsOptional()
  @IsEnum(TransactionType)
  @Transform(({ value }) => value || undefined)
  transactionType?: TransactionType;

  @IsOptional()
  @IsEnum(PaymentMethod)
  @Transform(({ value }) => value || undefined)
  method?: PaymentMethod;
}