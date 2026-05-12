import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsEnum,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class StockTakeItemDto {
  @IsNumber()
  productId: number;

  @IsString()
  productName: string;

  @IsNumber()
  systemQuantity: number;

  @IsNumber()
  @Min(0)
  countedQuantity: number;

  @IsNumber()
  @IsOptional()
  unitCost?: number;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateStockTakeDto {
  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockTakeItemDto)
  items: StockTakeItemDto[];
}

export class CompleteStockTakeDto {
  @IsOptional()
  adjustInventory?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class StockTakeQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
