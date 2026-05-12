import { IsOptional, IsDateString, IsInt, IsPositive } from 'class-validator';

export class SupplierStatementFilterDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsInt()
  @IsPositive()
  supplierId: number;
}
