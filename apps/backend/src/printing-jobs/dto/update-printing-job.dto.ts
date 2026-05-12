// dto/update-printing-job.dto.ts
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PrintingJobStatus } from './create-printing-job.dto';

export class UpdatePrintingJobDto {
  @IsEnum(PrintingJobStatus)
  status: PrintingJobStatus;

  @IsString()
  @IsOptional()
  failureReason?: string;
}