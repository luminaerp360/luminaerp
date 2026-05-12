import { IsString, IsInt, IsEnum, IsOptional, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { SubscriptionPlan } from '@prisma/client';

export class CreateOfflineSubscriptionDto {
  @IsString()
  organizationName: string;

  @IsOptional()
  @IsString()
  organizationAddress?: string;

  @IsOptional()
  @IsString()
  organizationContact?: string;

  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;

  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  durationDays: number;

  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value) : undefined))
  @IsInt()
  maxDevices?: number;

  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value) : undefined))
  @IsInt()
  maxUsers?: number;

  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value) : undefined))
  @IsInt()
  maxLocations?: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}
