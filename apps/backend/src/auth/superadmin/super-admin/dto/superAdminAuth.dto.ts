import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsNumber,
  IsArray,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SuperAdminAuthDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

export class CreateSuperAdminDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class AssignUserOrganizationDto {
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @IsNumber()
  @IsNotEmpty()
  organizationId: number;

  @IsString()
  @IsNotEmpty()
  @IsIn(['Admin', 'User', 'Sales', 'Manager'])
  role: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkAssignUserOrganizationDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssignUserOrganizationDto)
  assignments: AssignUserOrganizationDto[];
}

export class RevokeUserOrganizationDto {
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @IsNumber()
  @IsNotEmpty()
  organizationId: number;
}
