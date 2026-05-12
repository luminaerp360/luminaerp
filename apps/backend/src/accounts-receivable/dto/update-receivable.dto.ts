import { PartialType } from '@nestjs/mapped-types';
import { CreateReceivableDto } from './create-receivable.dto';
import { IsOptional, IsNumber, IsString, IsDateString } from 'class-validator';

export class UpdateReceivableDto extends PartialType(CreateReceivableDto) {
  @IsOptional()
  @IsNumber()
  customerId?: number;

  @IsOptional()
  @IsString()
  receivableNumber?: string;

  @IsOptional()
  @IsDateString()
  receivableDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  totalAmount?: number;

  @IsOptional()
  @IsNumber()
  taxAmount?: number;

  @IsOptional()
  @IsNumber()
  discountAmount?: number;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}