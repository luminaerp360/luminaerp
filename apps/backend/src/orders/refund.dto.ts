import { Type } from 'class-transformer';
import {
  IsArray,
  IsString,
  IsNumber,
  ValidateNested,
  ArrayMinSize,
  IsOptional,
} from 'class-validator';

class RefundItemDto {
  @IsNumber()
  id: number;

  @IsNumber()
  quantity: number;
}

export class RefundDto {
  @IsNumber()
  orderId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => RefundItemDto)
  refundItems: RefundItemDto[];

  @IsNumber()
  @IsOptional()
  totalRefund?: number; // Changed from refundTotal to totalRefund

  @IsString()
  @IsOptional()
  refundPaymentMethod?: 'Cash' | 'Mpesa' | 'Bank';
  @IsString()
  refundedBy: string;
}
