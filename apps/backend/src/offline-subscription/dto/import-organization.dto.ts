import { IsNotEmpty, IsString, IsObject, IsOptional } from 'class-validator';

export class ImportOrganizationDto {
  @IsNotEmpty()
  @IsString()
  licenseKey: string;

  @IsNotEmpty()
  @IsObject()
  data: any; // The exported organization data

  @IsOptional()
  @IsString()
  importedBy?: string;
}
