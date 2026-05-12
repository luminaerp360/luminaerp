import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';

export class CreateWarehouseLocationDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsOptional()
  locationId?: number;

  @IsString()
  @IsOptional()
  zone?: string;

  @IsString()
  @IsOptional()
  aisle?: string;

  @IsString()
  @IsOptional()
  rack?: string;

  @IsString()
  @IsOptional()
  shelf?: string;

  @IsString()
  @IsOptional()
  bin?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  capacity?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateWarehouseLocationDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  zone?: string;

  @IsString()
  @IsOptional()
  aisle?: string;

  @IsString()
  @IsOptional()
  rack?: string;

  @IsString()
  @IsOptional()
  shelf?: string;

  @IsString()
  @IsOptional()
  bin?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  capacity?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  currentOccupancy?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateReorderRuleDto {
  @IsNumber()
  @IsNotEmpty()
  productId: number;

  @IsInt()
  @Min(0)
  @IsNotEmpty()
  minStock: number;

  @IsInt()
  @Min(0)
  @IsNotEmpty()
  maxStock: number;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  reorderQuantity: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  leadTimeDays?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  safetyStock?: number;

  @IsNumber()
  @IsOptional()
  supplierId?: number;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}

export class UpdateReorderRuleDto {
  @IsInt()
  @Min(0)
  @IsOptional()
  minStock?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  maxStock?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  reorderQuantity?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  leadTimeDays?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  safetyStock?: number;

  @IsNumber()
  @IsOptional()
  supplierId?: number;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
