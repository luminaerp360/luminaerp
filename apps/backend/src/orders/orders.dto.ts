import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsPositive,
  IsBoolean,
  IsArray,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderPaymentDto } from './dto/order-payment.dto';

export class OrderItemDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsOptional()
  @IsNumber()
  productId?: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  productName?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @IsOptional()
  @IsNumber()
  selectedItems?: number;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsNumber()
  qty?: number;

  @IsOptional()
  @IsArray()
  selectedUnitIds?: number[];

  @IsOptional()
  @IsBoolean()
  isService?: boolean;

  @IsOptional()
  @IsBoolean()
  oneTimeService?: boolean;

  @IsOptional()
  @IsNumber()
  discountValue?: number;

  @IsOptional()
  @IsNumber()
  discount?: number;

  @IsOptional()
  @IsNumber()
  taxRate?: number;

  @IsOptional()
  @IsBoolean()
  includesVat?: boolean;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  productIdNumber?: string;

  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @IsOptional()
  @IsNumber()
  buyingPrice?: number;

  @IsOptional()
  @IsNumber()
  organizationId?: number;
}

export class OrderDto {
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsNumber()
  @IsPositive()
  total: number;

  @IsNumber()
  @IsOptional()
  madeBy: number;
  @IsString()
  @IsOptional()
  created_by: string;

  // Sales person tracking (who the sale belongs to)
  @IsNumber()
  @IsOptional()
  salesPersonId?: number;

  // Legacy payment fields (kept for backward compatibility)
  @IsNumber()
  @IsOptional()
  cashPaid: number;

  @IsNumber()
  @IsOptional()
  mpesaPaid: number;

  @IsNumber()
  @IsOptional()
  bankPaid: number;

  @IsNumber()
  totalAmountPaid: number;

  // New multi-payment support
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderPaymentDto)
  payments?: CreateOrderPaymentDto[];

  @IsNumber()
  @IsOptional()
  taxAmount: number;

  @IsNumber()
  @IsOptional()
  discountAmount: number;

  @IsNumber()
  @IsOptional()
  customerId: number;
  @IsString()
  @IsOptional()
  customer_name: string;

  @IsString()
  @IsOptional()
  printerIp: string;

  @IsBoolean()
  @IsOptional()
  isVoided: boolean;

  @IsNumber()
  @IsOptional()
  voidedBy: number = 0; // You can set a default value here

  @IsString()
  @IsOptional()
  mpesaTransactionId: string;

  // Commission overrides (custom commission settings for this sale)
  @IsOptional()
  @IsArray()
  commissionOverrides?: Array<{
    productId: number;
    enabled: boolean;
    commissionType?: string;
    commissionRate?: number;
    commissionAmount?: number;
  }>;
}
