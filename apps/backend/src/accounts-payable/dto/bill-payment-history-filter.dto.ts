import {
  IsOptional,
  IsString,
  IsDateString,
  IsInt,
  IsPositive,
  IsEnum,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class BillPaymentHistoryFilterDto {
  @IsOptional()
  @IsString()
  searchQuery?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsInt()
  @IsPositive()
  supplierId?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  page?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  limit?: number;
}
