import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsEmail,
  Matches,
} from 'class-validator';

export enum CustomerType {
  INDIVIDUAL = 'INDIVIDUAL',
  BUSINESS = 'BUSINESS',
}

// DTO for creating customers (all required fields)
export class CreateCustomerDto {
  @IsString()
  fullName: string;

  @IsString()
  phoneNumber: string;

  @IsEmail()
  email: string;

  @IsEnum(CustomerType)
  @IsOptional()
  customerType?: CustomerType;

  @IsString()
  @IsOptional()
  @Matches(/^[A-Z]\d{9}[A-Z]$/, {
    message:
      'KRA PIN must be in format: A123456789B (1 letter + 9 digits + 1 letter)',
  })
  kraPin?: string;

  @IsNumber()
  @IsOptional()
  dueCredit?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// DTO for updating customers (all fields optional)
export class UpdateCustomerDto {
  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsEnum(CustomerType)
  @IsOptional()
  customerType?: CustomerType;

  @IsString()
  @IsOptional()
  @Matches(/^[A-Z]\d{9}[A-Z]$/, {
    message:
      'KRA PIN must be in format: A123456789B (1 letter + 9 digits + 1 letter)',
  })
  kraPin?: string;

  @IsNumber()
  @IsOptional()
  dueCredit?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// Keep the original for backward compatibility
export class CustomerDetailsDto extends CreateCustomerDto {}
