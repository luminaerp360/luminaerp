import {
  IsArray,
  IsBoolean,
  IsDate,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreditSaleDto {
  @IsNumber()
  customer_id: number;

  @IsNotEmpty()
  @IsArray()
  items: any;

  @IsNumber()
  @IsOptional()
  order_id: number;

  @IsNumber()
  credit_amount: number;

  @IsDateString()
  order_date: string;

  @IsDateString()
  payment_date: string;

  @IsNumber()
  @IsOptional()
  amount_paid: number;

  @IsNumber()
  @IsOptional()
  fully_paid: number;

  @IsString()
  customer_name: string;
  @IsString()
  @IsOptional()
  payment_terms: string;

  @IsString()
  created_by: string;

  @IsNumber()
  @IsOptional()
  shift_id: number;

  @IsString()
  @IsOptional()
  phone_number: string;

  @IsOptional()
  @IsString()
  order_remarks?: string;

  @IsOptional()
  @IsString()
  national_id?: string;

  @IsOptional()
  @IsBoolean()
  confirm_delete?: boolean;

  @IsOptional()
  @IsNumber()
  cash_paid?: number;

  @IsOptional()
  @IsNumber()
  mpesa_paid?: number;

  @IsOptional()
  @IsNumber()
  bank_paid?: number;

  @IsOptional()
  @IsString()
  mpesa_confirmation_code?: string;

  @IsOptional()
  @IsString()
  bank_confirmation_code?: string;

  @IsOptional()
  @IsNumber()
  balance?: number;

  @IsOptional()
  @IsString()
  complementary_of?: string;

  @IsOptional()
  @IsNumber()
  complimentary_amount?: number;

  @IsOptional()
  @IsString()
  voucher_code?: string;

  @IsOptional()
  @IsNumber()
  voucher_amount?: number;

  // New fields for VAT and discount
  @IsOptional()
  @IsNumber()
  vat_amount?: number;

  @IsOptional()
  @IsNumber()
  discount_amount?: number;
}
