import {
  IsArray,
  IsInt,
  IsPositive,
  IsNumber,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

class BillPaymentItemDto {
  @IsInt()
  @IsPositive()
  billId: number;

  @IsNumber()
  @IsPositive()
  amount: number;
}

export class BulkBillPaymentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BillPaymentItemDto)
  billPayments: BillPaymentItemDto[];

  @IsDateString()
  paymentDate: string;

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
