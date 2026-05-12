import { IsNotEmpty, IsNumber, IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreateReceivablePaymentDto {
  @IsNotEmpty()
  @IsNumber()
  receivableId: number;

  @IsNotEmpty()
  @IsDateString()
  paymentDate: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  transactionCode?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsNotEmpty()
  @IsNumber()
  createdBy: number;
}