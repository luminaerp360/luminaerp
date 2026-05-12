import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsEnum,
  IsOptional,
  Min,
} from 'class-validator';

export enum CommissionType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

export enum CommissionStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export class ProductCommissionDto {
  @IsOptional()
  @IsEnum(CommissionType)
  defaultCommissionType?: CommissionType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultCommissionValue?: number;

  @IsOptional()
  isCommissionable?: boolean;
}

export class UserProductCommissionDto {
  @IsNotEmpty()
  @IsNumber()
  userId: number;

  @IsNotEmpty()
  @IsNumber()
  productId: number;

  @IsNotEmpty()
  @IsEnum(CommissionType)
  commissionType: CommissionType;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  commissionValue: number;
}

export class CommissionCalculationResult {
  productId: number;
  productName: string;
  quantity: number;
  saleAmount: number;
  commissionType: string;
  commissionRate: number;
  commissionAmount: number;
}

export class CommissionSummaryDto {
  totalCommissions: number;
  pendingCommissions: number;
  paidCommissions: number;
}

export class MarkCommissionPaidDto {
  @IsNotEmpty()
  commissionIds: number[];

  @IsNotEmpty()
  @IsString()
  paymentMethod: string;

  @IsOptional()
  @IsString()
  paymentReference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
