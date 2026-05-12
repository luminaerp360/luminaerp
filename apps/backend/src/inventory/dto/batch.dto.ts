import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { BatchStatus } from '@prisma/client';

export class CreateBatchDto {
  @IsNumber()
  @IsNotEmpty()
  product_id: number;

  @IsString()
  @IsNotEmpty()
  batch_number: string;

  @IsString()
  @IsOptional()
  lot_number?: string;

  @IsDateString()
  @IsOptional()
  received_date?: string;

  @IsDateString()
  @IsOptional()
  expiry_date?: string;

  @IsDateString()
  @IsOptional()
  manufacturing_date?: string;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  quantity_received: number;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  buying_price: number;

  @IsNumber()
  @IsOptional()
  supplier_id?: number;

  @IsNumber()
  @IsOptional()
  warehouse_location_id?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateBatchDto {
  @IsInt()
  @Min(0)
  @IsOptional()
  quantity?: number;

  @IsEnum(BatchStatus)
  @IsOptional()
  status?: BatchStatus;

  @IsString()
  @IsOptional()
  warehouseLocation?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsDateString()
  @IsOptional()
  expiryDate?: string;
}

export class BatchAdjustmentDto {
  @IsNumber()
  @IsNotEmpty()
  batchId: number;

  @IsInt()
  @IsNotEmpty()
  quantityChange: number; // Positive for additions, negative for deductions

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class BatchTransferDto {
  @IsNumber()
  @IsNotEmpty()
  batchId: number;

  @IsString()
  @IsNotEmpty()
  fromLocation: string;

  @IsString()
  @IsNotEmpty()
  toLocation: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class BatchQueryDto {
  @IsNumber()
  @IsOptional()
  productId?: number;

  @IsEnum(BatchStatus)
  @IsOptional()
  status?: BatchStatus;

  @IsString()
  @IsOptional()
  location?: string;

  @IsDateString()
  @IsOptional()
  expiringBefore?: string;

  @IsNumber()
  @IsOptional()
  supplierId?: number;
}
