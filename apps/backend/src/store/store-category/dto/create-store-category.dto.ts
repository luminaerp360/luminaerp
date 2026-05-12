import { IsString, IsOptional } from 'class-validator';

export class CreateStoreCategoryDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}