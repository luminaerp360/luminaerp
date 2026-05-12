import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber } from 'class-validator';
import { AccountType, AccountCategory, BalanceType } from '@prisma/client';

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  accountCode?: string;

  @IsOptional()
  @IsString()
  accountName?: string;

  @IsOptional()
  @IsEnum(AccountType)
  accountType?: AccountType;

  @IsOptional()
  @IsEnum(AccountCategory)
  category?: AccountCategory;

  @IsOptional()
  @IsEnum(BalanceType)
  normalBalance?: BalanceType;

  @IsOptional()
  @IsNumber()
  parentAccountId?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;
}
