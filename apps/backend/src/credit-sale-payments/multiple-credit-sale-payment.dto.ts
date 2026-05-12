import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreateMultipleCreditSalePaymentDto {
  @IsNotEmpty()
  @IsArray()
  creditSaleIds: number[];

  @IsNotEmpty()
  @IsNumber()
  totalAmount: number;

  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  transactionCode?: string;
}
