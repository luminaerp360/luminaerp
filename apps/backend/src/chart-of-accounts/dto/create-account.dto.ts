import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsInt,
  IsBoolean,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AccountType, AccountCategory, BalanceType } from '@prisma/client';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(10)
  accountCode: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  accountName: string;

  @IsEnum(AccountType)
  @IsNotEmpty()
  accountType: AccountType;

  @IsEnum(AccountCategory)
  @IsNotEmpty()
  accountCategory: AccountCategory;

  @IsEnum(BalanceType)
  @IsNotEmpty()
  balanceType: BalanceType;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsInt()
  parentAccountId?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isSystem?: boolean; // System accounts cannot be deleted

  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  bankDetails?: string;
}
