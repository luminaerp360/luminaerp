import {
  IsInt,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsPositive,
  Min,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReceiveItemDto {
  @IsInt()
  @IsPositive()
  itemId: number;

  @IsInt()
  @Min(0)
  receivedQuantity: number;
}

export class ReceiveStorePurchaseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => ReceiveItemDto)
  items: ReceiveItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
