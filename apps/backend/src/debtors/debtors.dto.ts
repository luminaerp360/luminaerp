import {
  IsOptional,
  IsInt,
  IsString,
  IsDateString,
  IsEnum,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

// Aging periods for receivables
export enum AgingPeriod {
  CURRENT = 'CURRENT', // 0-30 days
  DAYS_31_60 = 'DAYS_31_60',
  DAYS_61_90 = 'DAYS_61_90',
  DAYS_91_120 = 'DAYS_91_120',
  OVER_120 = 'OVER_120',
}

export class DebtorFilterDto {
  @IsOptional()
  @IsInt()
  customerId?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  search?: string; // Search by customer name or invoice number

  @IsOptional()
  @IsEnum(AgingPeriod)
  agingPeriod?: AgingPeriod;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}

export class BulkPaymentItemDto {
  @IsInt()
  invoiceId: number;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RecordBulkPaymentDto {
  @IsInt()
  customerId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkPaymentItemDto)
  payments: BulkPaymentItemDto[];

  @IsOptional()
  @IsInt()
  paymentMethodId?: number;

  @IsString()
  paymentMethodCode: string;

  @IsString()
  paymentMethodName: string;

  @IsOptional()
  @IsString()
  transactionCode?: string;

  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  recordedBy: string;
}

export class CustomerStatementFilterDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  format?: 'summary' | 'detailed';
}

export class PaymentHistoryFilterDto {
  @IsOptional()
  @IsInt()
  customerId?: number;

  @IsOptional()
  @IsInt()
  invoiceId?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  paymentMethodCode?: string;

  @IsOptional()
  @IsString()
  search?: string; // Search by customer name, invoice number, or transaction code

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}

// ========================
// Customer Wallet DTOs
// ========================

export class RecordCustomerDepositDto {
  @IsInt()
  customerId: number;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsInt()
  paymentMethodId?: number;

  @IsString()
  paymentMethodCode: string;

  @IsString()
  paymentMethodName: string;

  @IsOptional()
  @IsString()
  transactionCode?: string;

  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  recordedBy: string;
}

export class ApplyWalletToInvoicesDto {
  @IsInt()
  customerId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WalletPaymentItemDto)
  payments: WalletPaymentItemDto[];

  @IsString()
  recordedBy: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class WalletPaymentItemDto {
  @IsInt()
  invoiceId: number;

  @IsNumber()
  @Min(0.01)
  amount: number;
}

export class WalletTransactionFilterDto {
  @IsOptional()
  @IsString()
  type?: string; // DEPOSIT, OVERPAYMENT, PAYMENT_APPLIED, REFUND, ADJUSTMENT

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}

export class RecordBulkPaymentWithWalletDto {
  @IsInt()
  customerId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkPaymentItemDto)
  payments: BulkPaymentItemDto[];

  @IsNumber()
  @Min(0)
  totalAmount: number; // Total amount being paid (can exceed total invoices = excess goes to wallet)

  @IsOptional()
  @IsInt()
  paymentMethodId?: number;

  @IsString()
  paymentMethodCode: string;

  @IsString()
  paymentMethodName: string;

  @IsOptional()
  @IsString()
  transactionCode?: string;

  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  recordedBy: string;

  @IsOptional()
  useWalletBalance?: boolean; // Whether to also apply wallet balance
}
