import { Module } from '@nestjs/common';
import { StoreReportsService } from './store-reports.service';
import { StoreReportsController } from './store-reports.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StoreReportsController],
  providers: [StoreReportsService],
  exports: [StoreReportsService],
})
export class StoreReportsModule {}
