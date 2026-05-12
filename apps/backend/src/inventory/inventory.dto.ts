// inventory.dto.ts
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsBoolean,
  IsArray,
  IsOptional,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

class InventoryItemDto {
  @IsString()
  @IsNotEmpty()
  product_id: string;

  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @IsNumber()
  @IsNotEmpty()
  buying_price: number;

  @IsOptional()
  @IsNumber()
  markup_percentage?: number;

  @IsOptional()
  @IsNumber()
  selling_price?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  unit_identifiers?: string[];

  @IsOptional()
  @IsString()
  expiry_date?: string;

  @IsOptional()
  @IsString()
  manufacture_date?: string;

  @IsOptional()
  @IsString()
  warehouse_location?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

class PaymentDto {
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  method: PaymentMethod;
}

export class InventoryDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryItemDto)
  items: InventoryItemDto[];

  @IsNumber()
  @IsNotEmpty()
  supplierId: number;

  @IsString()
  @IsNotEmpty()
  added_by: string;

  @IsBoolean()
  @IsNotEmpty()
  deleted: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentDto)
  payments: PaymentDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApprovePurchaseDto {
  @IsString()
  @IsNotEmpty()
  approvedBy: string;
}

export class ReceivePurchaseDto {
  @IsString()
  @IsNotEmpty()
  receivedBy: string;

  @IsOptional()
  @IsArray()
  items?: {
    product_id: string;
    unit_identifiers?: string[];
  }[];
}
