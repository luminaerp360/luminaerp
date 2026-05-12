import { IsEnum, IsString, IsOptional, IsNumber, IsObject } from 'class-validator';
import { LogAction, LogModule } from '../entities/system-log.entity';

export class CreateSystemLogDto {
  @IsNumber()
  userId: number;

  @IsEnum(LogAction)
  action: LogAction;

  @IsEnum(LogModule)
  module: LogModule;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsNumber()
  entityId?: number;

  @IsOptional()
  @IsObject()
  metadata?: any;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}
