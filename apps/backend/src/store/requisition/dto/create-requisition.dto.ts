import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum RequisitionPriorityDto {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export class RequisitionItemDto {
  @IsInt()
  @IsPositive()
  storeProductId: number;

  @IsInt()
  @IsPositive()
  quantityRequested: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateRequisitionDto {
  @IsInt()
  @IsOptional()
  departmentId?: number;

  @IsEnum(RequisitionPriorityDto)
  @IsOptional()
  priority?: RequisitionPriorityDto;

  @IsString()
  @IsOptional()
  purpose?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => RequisitionItemDto)
  items: RequisitionItemDto[];
}
