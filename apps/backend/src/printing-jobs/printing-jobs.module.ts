import { Module } from '@nestjs/common';
import { PrintingJobsService } from './printing-jobs.service';
import { PrintingJobsController } from './printing-jobs.controller';

@Module({
  controllers: [PrintingJobsController],
  providers: [PrintingJobsService],
  exports: [PrintingJobsService],
})
export class PrintingJobsModule {}
