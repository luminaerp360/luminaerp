import {
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  IsDateString,
  MaxLength,
  MinLength,
  IsInt,
  IsEnum,
  Min,
} from 'class-validator';
import { BillStatus } from '@prisma/client';

export class UpdateBillDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  billNumber?: string;

  @IsOptional()
  @IsDateString()
  billDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  totalAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsEnum(BillStatus)
  status?: BillStatus;
}