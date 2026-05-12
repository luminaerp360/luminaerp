import { IsString, IsOptional } from 'class-validator';

export class ValidateSubscriptionDto {
  @IsString()
  licenseKey: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  lastCheckpointHash?: string;
}
