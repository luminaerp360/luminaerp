import {
  IsNotEmpty,
  IsNumber,
  IsJSON,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class updateQuotationDto {
  @IsNumber()
  @IsOptional()
  customerId: number;

  @IsJSON()
  @IsOptional()
  items: any;

  @IsNumber()
  @IsOptional()
  totalAmount: number;
  @IsBoolean()
  @IsOptional()
  sendEmail?: boolean; // Fixed: should be boolean, not number, and optional
}
