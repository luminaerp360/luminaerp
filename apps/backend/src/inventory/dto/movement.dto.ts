import {
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
} from 'class-validator';
import { MovementType } from '@prisma/client';

export class CreateMovementDto {
  @IsNumber()
  @IsNotEmpty()
  productId: number;

  @IsNumber()
  @IsOptional()
  batchId?: number;

  @IsEnum(MovementType)
  @IsNotEmpty()
  movementType: MovementType;

  @IsInt()
  @IsNotEmpty()
  quantityChange: number;

  @IsString()
  @IsOptional()
  fromLocation?: string;

  @IsString()
  @IsOptional()
  toLocation?: string;

  @IsString()
  @IsOptional()
  referenceType?: string;

  @IsNumber()
  @IsOptional()
  referenceId?: number;

  @IsNumber()
  @IsOptional()
  unitCost?: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class MovementQueryDto {
  @IsNumber()
  @IsOptional()
  productId?: number;

  @IsNumber()
  @IsOptional()
  batchId?: number;

  @IsEnum(MovementType)
  @IsOptional()
  movementType?: MovementType;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  referenceType?: string;

  @IsNumber()
  @IsOptional()
  referenceId?: number;
}
