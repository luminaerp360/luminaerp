import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ModernReportsController } from './modern-reports.controller';
import { ModernReportsService } from './modern-reports.service';

@Module({
  controllers: [ReportsController, ModernReportsController],
  providers: [ReportsService, ModernReportsService],
  exports: [ReportsService, ModernReportsService],
})
export class ReportsModule {}
