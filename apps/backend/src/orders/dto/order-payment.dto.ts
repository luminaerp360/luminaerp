import { IsNumber, IsString, IsOptional, IsDate, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderPaymentDto {
  @IsOptional()
  @IsNumber()
  paymentMethodId?: number;

  @IsString()
  paymentMethodCode: string; // CASH, MPESA, BANK, etc.

  @IsString()
  paymentMethodName: string; // Display name

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  transactionCode?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  recordedBy: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  paymentDate?: Date;
}

export class OrderPaymentResponseDto {
  id: number;
  orderId: number;
  organizationId: number;
  paymentMethodId?: number;
  paymentMethodCode: string;
  paymentMethodName: string;
  amount: number;
  transactionCode?: string;
  paymentDate: Date;
  notes?: string;
  recordedBy: string;
  createdAt: Date;
  updatedAt: Date;
}
