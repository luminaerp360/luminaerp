import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StockTransferStatus } from '@prisma/client';

export class StockTransferItemDto {
  @IsString()
  productIdNumber: string;

  @IsString()
  productName: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  unitPrice: number;

  @IsNumber()
  totalPrice: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateStockTransferDto {
  @IsNumber()
  fromOrganizationId: number;

  @IsNumber()
  toOrganizationId: number;

  @IsOptional()
  @IsNumber()
  fromLocationId?: number;

  @IsOptional()
  @IsNumber()
  toLocationId?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockTransferItemDto)
  items: StockTransferItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateStockTransferStatusDto {
  @IsEnum(StockTransferStatus)
  status: StockTransferStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class StockTransferQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number = 20;

  @IsOptional()
  @IsDateString()
  startDate?: string; // ISO date string

  @IsOptional()
  @IsDateString()
  endDate?: string; // ISO date string

  @IsOptional()
  @IsString()
  search?: string; // matches transferNumber, transferredByName, approvedByName, notes

  @IsOptional()
  @IsString()
  status?: string; // optional filter by status (comma separated or single)

  @IsOptional()
  @IsString()
  organizationId?: string; // will be parsed to number in controller if needed
}
