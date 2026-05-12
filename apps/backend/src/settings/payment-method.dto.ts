import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
  IsJSON,
  Min,
} from 'class-validator';

export class CreatePaymentMethodDto {
  @IsInt()
  organizationId: number;

  @IsInt()
  settingsId: number;

  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  code: string;

  @IsString()
  @MinLength(1)
  displayName: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  requiresReference?: boolean;

  @IsOptional()
  @IsBoolean()
  autoReconcile?: boolean;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  providerName?: string;

  @IsOptional()
  providerConfig?: any;
}

export class UpdatePaymentMethodDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  displayName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  requiresReference?: boolean;

  @IsOptional()
  @IsBoolean()
  autoReconcile?: boolean;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  providerName?: string;

  @IsOptional()
  providerConfig?: any;
}
