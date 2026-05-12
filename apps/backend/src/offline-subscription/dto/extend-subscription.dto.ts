import { IsString, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class ExtendSubscriptionDto {
  @IsString()
  licenseKey: string;

  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  additionalDays: number;
}
