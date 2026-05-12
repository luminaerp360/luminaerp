// printing-job.dto.ts
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export enum PrintingJobType {
  ORDER = 'ORDER',
  CREDIT_SALE = 'CREDIT_SALE',
}

export enum PrintingJobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export class PrintingJobDto {
  @IsEnum(PrintingJobType)
  type: PrintingJobType;

  @IsNumber()
  @IsNotEmpty()
  referenceId: number;

  @IsString()
  @IsOptional()
  printerIp?: string;

  @IsEnum(PrintingJobStatus)
  @IsOptional()
  status?: PrintingJobStatus;

  @IsString()
  @IsOptional()
  failureReason?: string;
}