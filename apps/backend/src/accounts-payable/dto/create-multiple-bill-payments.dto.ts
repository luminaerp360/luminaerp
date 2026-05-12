import { IsArray, IsEnum, IsNumber, IsOptional, IsString, Min, ArrayMinSize } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreateMultipleBillPaymentsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one bill ID must be provided' })
  billIds: number[];

  @IsNumber()
  @Min(0.01, { message: 'Total amount must be greater than 0' })
  totalAmount: number;

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

  @IsNumber()
  createdBy: number;
}
