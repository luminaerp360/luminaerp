import {
  IsNotEmpty,
  IsNumber,
  IsJSON,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class QuotationDto {
  @IsNumber()
  @IsNotEmpty()
  customerId: number;

  @IsJSON()
  @IsNotEmpty()
  items: any;

  @IsNumber()
  @IsNotEmpty()
  totalAmount: number;
  @IsNumber()
  @IsOptional()
  totalTax: number;
  @IsBoolean()
  @IsOptional()
  sendEmail?: boolean; // Fixed: should be boolean, not number, and optional
}
