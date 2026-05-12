import {
  IsString,
  IsNumber,
  IsPositive,
  IsOptional,
  IsBoolean,
  IsInt,
} from 'class-validator';

export class CreateStoreProductDto {
  @IsString()
  productName: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsPositive()
  storeCategoryId: number;

  @IsNumber()
  @IsPositive()
  departmentId: number;

  @IsString()
  unitOfMeasurement: string;

  @IsNumber()
  @IsPositive()
  buyingPrice: number;

  @IsInt()
  @IsOptional()
  quantity?: number;

  @IsInt()
  @IsOptional()
  reorderLevel?: number;

  @IsInt()
  @IsOptional()
  maxStock?: number;

  @IsString()
  @IsOptional()
  location?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
