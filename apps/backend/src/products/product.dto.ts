import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsArray,
} from 'class-validator';

export enum TrackingModeDto {
  NONE = 'NONE',
  SERIAL = 'SERIAL',
  IMEI = 'IMEI',
  REGISTRATION = 'REGISTRATION',
}

export enum ProductAssetTypeDto {
  IMAGE = 'IMAGE',
  DOCUMENT = 'DOCUMENT',
  LOGBOOK = 'LOGBOOK',
  INSURANCE = 'INSURANCE',
  WARRANTY = 'WARRANTY',
  OTHER = 'OTHER',
}

export class ProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  productIdNumber?: string;

  @IsNumber()
  @IsNotEmpty()
  reorderLevel: number;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsNumber()
  buyingPrice?: number;

  @IsOptional()
  @IsNumber()
  wholesalePrice?: number;

  @IsString()
  @IsNotEmpty()
  categoryName: string;

  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  pictureUrl?: string; // Assuming this is a URL to the product picture

  @IsOptional()
  @IsBoolean()
  availability?: boolean;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsNumber()
  storeQuantity?: number;

  @IsOptional()
  @IsBoolean()
  countable?: boolean;

  @IsOptional()
  @IsBoolean()
  isService?: boolean;

  @IsOptional()
  // @IsDateString()
  expiryDate?: Date;

  // Commission fields
  @IsOptional()
  @IsString()
  defaultCommissionType?: string; // PERCENTAGE or FIXED

  @IsOptional()
  @IsNumber()
  defaultCommissionValue?: number;

  @IsOptional()
  @IsBoolean()
  isCommissionable?: boolean;

  @IsOptional()
  @IsEnum(TrackingModeDto)
  trackingMode?: TrackingModeDto;

  @IsOptional()
  @IsBoolean()
  batchTracking?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresUniqueIdentifiers?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(ProductAssetTypeDto, { each: true })
  requiredAssetTypes?: ProductAssetTypeDto[];
}
