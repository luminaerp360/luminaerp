import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateStorePurchaseItemDto {
  @IsInt()
  @IsOptional()
  id?: number;

  @IsInt()
  @IsPositive()
  storeProductId: number;

  @IsInt()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @IsPositive()
  unitPrice: number;
}

export class UpdateStorePurchaseDto {
  @IsInt()
  @IsOptional()
  supplierId?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => UpdateStorePurchaseItemDto)
  @IsOptional()
  items?: UpdateStorePurchaseItemDto[];

  @IsString()
  @IsOptional()
  receivedBy?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsDateString()
  @IsOptional()
  deliveryDate?: string;
}
