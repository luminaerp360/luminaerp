import {
  IsInt,
  IsPositive,
  IsNumber,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreateBillPaymentDto {
  @IsInt()
  @IsPositive()
  billId: number;

  @IsDateString()
  paymentDate: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  transactionCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsInt()
  @IsPositive()
  createdBy: number;
}