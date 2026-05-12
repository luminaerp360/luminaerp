import { IsNotEmpty, IsString, IsNumber, IsBoolean } from 'class-validator';

export class SupplierDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsNumber()
  @IsNotEmpty()
  totalUnpaidSuppliers: number;

  @IsBoolean()
  @IsNotEmpty()
  deleted: boolean;
}
