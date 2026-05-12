import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsDateString,
  IsOptional,
  MaxLength,
  MinLength,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateBillItemDto } from './create-bill-item.dto';

export class CreateBillDto {
  @IsInt()
  @IsPositive()
  supplierId: number;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  billNumber: string;

  @IsDateString()
  billDate: string;

  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBillItemDto)
  @ArrayMinSize(1, { message: 'Bill must have at least one item' })
  items: CreateBillItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  termsAndConditions?: string;

  @IsInt()
  @IsPositive()
  createdBy: number;
}
