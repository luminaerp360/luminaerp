import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class SupplierFilterDto {
  @IsOptional()
  @IsString()
  searchQuery?: string;

  @IsOptional()
  @IsBoolean()
  showOnlyWithDebt?: boolean;
}
