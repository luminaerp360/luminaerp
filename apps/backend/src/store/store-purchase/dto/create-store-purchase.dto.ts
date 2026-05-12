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

export class StorePurchaseItemDto {
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

export class CreateStorePurchaseDto {
  @IsInt()
  @IsOptional()
  supplierId?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => StorePurchaseItemDto)
  items: StorePurchaseItemDto[];

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
