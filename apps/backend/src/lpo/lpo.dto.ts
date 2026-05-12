import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsJSON,
  IsOptional,
  IsArray,
  ValidateNested,
  IsDate,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LpoDto {
  @IsString()
  @IsOptional()
  referenceNumber: string;

  @IsNumber()
  @IsNotEmpty()
  supplierId: number;

  @IsArray()
  @IsNotEmpty()
  items: any;

  @IsNumber()
  @IsNotEmpty()
  totalAmount: number;

  @IsNumber()
  @IsOptional()
  subtotal?: number;

  @IsNumber()
  @IsOptional()
  taxAmount?: number;

  @IsNumber()
  @IsOptional()
  discountAmount?: number;

  @IsNumber()
  @IsOptional()
  shippingCost?: number;

  @IsOptional()
  @Type(() => Date)
  deliveryDate?: Date;

  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @IsString()
  @IsOptional()
  shippingAddress?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  priority?: string;

  @IsString()
  @IsOptional()
  status: string;

  @IsString()
  @IsOptional()
  created_by: string;
}

export class ConvertToPurchaseItemDto {
  @IsNumber()
  @IsNotEmpty()
  productId: number;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  expiryDate?: Date;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  manufactureDate?: Date;

  @IsString()
  @IsOptional()
  warehouseLocation?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class ConvertToPurchaseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConvertToPurchaseItemDto)
  @IsNotEmpty()
  items: ConvertToPurchaseItemDto[];

  @IsString()
  @IsOptional()
  notes?: string;
}

export class RejectLpoDto {
  @IsString()
  @IsNotEmpty()
  rejectionReason: string;
}
