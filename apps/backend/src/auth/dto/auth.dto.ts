import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class AuthDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsOptional() // Mark as optional for sign-up
  @IsString()
  fullName?: string;

  @IsOptional() // Mark as optional for sign-up
  @IsString()
  username?: string;
  @IsOptional() // Mark as optional for sign-up
  @IsString()
  role?: string;
  @IsOptional() // Mark as optional for sign-up
  @IsString()
  phone?: string;
  @IsOptional() // Mark as optional for sign-up
  @IsString()
  photoURL?: string;
  @IsOptional() // Mark as optional for sign-up
  @IsString()
  status?: string;
  @IsOptional() // Mark as optional for sign-up
  @IsString()
  createdBy?: string;
  @IsOptional()
  @IsObject()
  permissions?: Record<string, boolean>;
}
