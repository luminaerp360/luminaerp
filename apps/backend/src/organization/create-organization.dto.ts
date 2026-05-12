// create-organization.dto.ts (make sure this includes the subscription fields too)

import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  IsBoolean,
} from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  contact?: string;

  @IsOptional()
  @IsString()
  complementaryMessage?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  stations?: any; // JSON field

  @IsOptional()
  bankDetails?: any; // JSON field

  @IsOptional()
  mpesaDetails?: any; // JSON field

  // Subscription fields
  @IsOptional()
  @IsEnum(SubscriptionPlan)
  subscriptionPlan?: SubscriptionPlan;

  @IsOptional()
  @IsEnum(SubscriptionStatus)
  subscriptionStatus?: SubscriptionStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  maxDevices?: number;

  @IsOptional()
  @IsNumber()
  maxUsers?: number;

  @IsOptional()
  @IsNumber()
  maxLocations?: number;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}
