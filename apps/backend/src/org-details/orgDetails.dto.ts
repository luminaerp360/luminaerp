import { IsString, IsOptional, IsArray, IsObject } from 'class-validator';

export class CreateOrgDetailsDto {
  @IsString()
  name: string;

  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  branch?: string;

  @IsString()
  contact: string;
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  complementaryMessage?: string;

  @IsArray()
  @IsObject({ each: true })
  stations: object[];

  @IsArray()
  @IsObject({ each: true })
  bankDetails: object[];

  @IsArray()
  @IsObject({ each: true })
  mpesaDetails: object[];
}

export class UpdateOrgDetailsDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  branch?: string;

  @IsOptional()
  @IsString()
  contact?: string;

  @IsOptional()
  @IsString()
  complementaryMessage?: string;

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  stations?: object[];

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  bankDetails?: object[];

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  mpesaDetails?: object[];
}
